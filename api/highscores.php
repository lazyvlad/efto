<?php
declare(strict_types=1);

header('Content-Type: application/json');
header('X-Content-Type-Options: nosniff');

// Configuration
const HIGHSCORES_FILE = __DIR__ . '/../highscores.json';
const MAX_SCORES = 100;
const MAX_NAME_LENGTH = 20;          // Matches maxlength on the name input
const MAX_BODY_BYTES = 2048;
const MAX_SCORE = 10000000;
const MAX_LEVEL = 999;
const MAX_GAME_TIME = 86400;         // Seconds
const MAX_DS_COMPLETIONS = 1000;
const RATE_LIMIT_WINDOW = 60;        // Seconds
const RATE_LIMIT_MAX_POSTS = 6;      // Score submissions allowed per IP per window

function respond(int $status, array $body): void
{
    http_response_code($status);
    echo json_encode($body);
    exit();
}

// Read a single setting from the server environment, falling back to the project's .env file
// (one level up in development, two levels up when served from dist/).
function envSetting(string $key): string
{
    $value = getenv($key);
    if ($value !== false && $value !== '') {
        return (string) $value;
    }

    foreach ([__DIR__ . '/../.env', __DIR__ . '/../../.env'] as $path) {
        if (!is_file($path)) {
            continue;
        }
        $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [];
        foreach ($lines as $line) {
            $line = trim($line);
            if ($line === '' || $line[0] === '#' || strpos($line, '=') === false) {
                continue;
            }
            [$name, $val] = explode('=', $line, 2);
            if (trim($name) === $key) {
                return trim(trim($val), "\"'");
            }
        }
    }

    return '';
}

// Browsers only send cross-origin requests here if the page's origin is explicitly allowed.
// Same-origin requests (the normal setup) never need these headers.
function applyCorsHeaders(): void
{
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    if ($origin === '') {
        return;
    }

    $allowed = array_filter(array_map('trim', explode(',', envSetting('EFTO_ALLOWED_ORIGINS'))));
    if (in_array($origin, $allowed, true)) {
        header('Access-Control-Allow-Origin: ' . $origin);
        header('Vary: Origin');
        header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type');
    }
}

function sortScores(array &$scores): void
{
    usort($scores, function ($a, $b) {
        return ($b['score'] ?? 0) <=> ($a['score'] ?? 0);
    });
}

function loadHighScores(): array
{
    if (!is_file(HIGHSCORES_FILE)) {
        return [];
    }

    $handle = fopen(HIGHSCORES_FILE, 'r');
    if ($handle === false) {
        return [];
    }

    flock($handle, LOCK_SH);
    $content = stream_get_contents($handle);
    flock($handle, LOCK_UN);
    fclose($handle);

    $scores = json_decode((string) $content, true);
    return is_array($scores) ? $scores : [];
}

// Add a score under an exclusive lock so concurrent submissions can't overwrite each other.
// Returns the updated list, or null if the file could not be written.
function addHighScore(array $newScore): ?array
{
    $handle = fopen(HIGHSCORES_FILE, 'c+');
    if ($handle === false) {
        return null;
    }

    if (!flock($handle, LOCK_EX)) {
        fclose($handle);
        return null;
    }

    $scores = json_decode((string) stream_get_contents($handle), true);
    if (!is_array($scores)) {
        $scores = [];
    }

    $scores[] = $newScore;
    sortScores($scores);
    $scores = array_slice($scores, 0, MAX_SCORES);

    $json = json_encode($scores, JSON_PRETTY_PRINT);
    $saved = $json !== false
        && ftruncate($handle, 0)
        && rewind($handle)
        && fwrite($handle, $json) !== false
        && fflush($handle);

    flock($handle, LOCK_UN);
    fclose($handle);

    return $saved ? $scores : null;
}

// Number rounded to a whole value within [min, max], or null if it isn't numeric or is out of range
function boundedInt($value, int $min, int $max): ?int
{
    if (is_bool($value) || !is_numeric($value)) {
        return null;
    }
    $number = (float) $value;
    if (!is_finite($number)) {
        return null;
    }
    $number = round($number);
    if ($number < $min || $number > $max) {
        return null;
    }
    return (int) $number;
}

function boundedFloat($value, float $min, float $max): ?float
{
    if (is_bool($value) || !is_numeric($value)) {
        return null;
    }
    $number = (float) $value;
    if (!is_finite($number) || $number < $min || $number > $max) {
        return null;
    }
    return round($number, 1);
}

function cleanName($value): ?string
{
    if (!is_string($value)) {
        return null;
    }
    // Drop markup and control characters, collapse whitespace
    $name = strip_tags($value);
    $name = preg_replace('/[\x00-\x1F\x7F<>]/u', '', $name);
    if ($name === null) {
        return null; // Not valid UTF-8
    }
    $name = trim(preg_replace('/\s+/u', ' ', $name) ?? '');

    $length = function_exists('mb_strlen') ? mb_strlen($name, 'UTF-8') : strlen($name);
    if ($length > MAX_NAME_LENGTH) {
        return null;
    }
    return $name === '' ? 'Anonymous' : $name;
}

// Build a clean score entry from untrusted input, or return null if anything is out of range.
function buildScoreEntry($data): ?array
{
    if (!is_array($data) || !array_key_exists('name', $data) || !array_key_exists('score', $data)) {
        return null;
    }

    $entry = [
        'name' => cleanName($data['name']),
        'score' => boundedInt($data['score'], 0, MAX_SCORE),
        'level' => boundedInt($data['level'] ?? 1, 0, MAX_LEVEL),
        'gameTime' => boundedInt($data['gameTime'] ?? 0, 0, MAX_GAME_TIME),
        'dragonstalkerCompletions' => boundedInt($data['dragonstalkerCompletions'] ?? 0, 0, MAX_DS_COMPLETIONS),
        'finalCritRating' => boundedFloat($data['finalCritRating'] ?? 0, 0, 100),
        'finalDodgeRating' => boundedFloat($data['finalDodgeRating'] ?? 0, 0, 100),
    ];

    if (in_array(null, $entry, true)) {
        return null;
    }

    $entry['timestamp'] = date('c'); // ISO 8601 format
    return $entry;
}

// Simple per-IP limit on score submissions. Fails open if the temp directory isn't writable.
function isRateLimited(): bool
{
    $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    $path = sys_get_temp_dir() . '/efto_highscores_ratelimit.json';

    $handle = @fopen($path, 'c+');
    if ($handle === false) {
        return false;
    }
    if (!flock($handle, LOCK_EX)) {
        fclose($handle);
        return false;
    }

    $now = time();
    $hits = json_decode((string) stream_get_contents($handle), true);
    if (!is_array($hits)) {
        $hits = [];
    }

    // Forget anything outside the window
    foreach ($hits as $key => $times) {
        $recent = is_array($times) ? array_values(array_filter($times, function ($t) use ($now) {
            return is_int($t) && $t > $now - RATE_LIMIT_WINDOW;
        })) : [];
        if ($recent) {
            $hits[$key] = $recent;
        } else {
            unset($hits[$key]);
        }
    }

    $key = hash('sha256', $ip);
    $limited = count($hits[$key] ?? []) >= RATE_LIMIT_MAX_POSTS;
    if (!$limited) {
        $hits[$key][] = $now;
    }

    ftruncate($handle, 0);
    rewind($handle);
    fwrite($handle, (string) json_encode($hits));
    fflush($handle);
    flock($handle, LOCK_UN);
    fclose($handle);

    return $limited;
}

applyCorsHeaders();

switch ($_SERVER['REQUEST_METHOD'] ?? 'GET') {
    case 'OPTIONS':
        // Preflight
        respond(200, []);

    case 'GET':
        $scores = loadHighScores();
        sortScores($scores);
        respond(200, array_slice($scores, 0, MAX_SCORES));

    case 'POST':
        // Requiring a JSON content type means a cross-site page can't submit scores with a plain form post
        $contentType = strtolower(trim(explode(';', $_SERVER['CONTENT_TYPE'] ?? '')[0]));
        if ($contentType !== 'application/json') {
            respond(415, ['success' => false, 'error' => 'Content-Type must be application/json']);
        }

        if ((int) ($_SERVER['CONTENT_LENGTH'] ?? 0) > MAX_BODY_BYTES) {
            respond(413, ['success' => false, 'error' => 'Request too large']);
        }
        $input = file_get_contents('php://input', false, null, 0, MAX_BODY_BYTES + 1);
        if ($input === false || strlen($input) > MAX_BODY_BYTES) {
            respond(413, ['success' => false, 'error' => 'Request too large']);
        }

        $newScore = buildScoreEntry(json_decode($input, true));
        if ($newScore === null) {
            respond(400, ['success' => false, 'error' => 'Invalid score data']);
        }

        if (isRateLimited()) {
            header('Retry-After: ' . RATE_LIMIT_WINDOW);
            respond(429, ['success' => false, 'error' => 'Too many scores submitted, try again in a minute']);
        }

        $scores = addHighScore($newScore);
        if ($scores === null) {
            respond(500, ['success' => false, 'error' => 'Failed to save score']);
        }

        respond(200, [
            'success' => true,
            'scores' => $scores,
            'message' => 'Score added successfully'
        ]);

    default:
        header('Allow: GET, POST, OPTIONS');
        respond(405, ['error' => 'Method not allowed']);
}
