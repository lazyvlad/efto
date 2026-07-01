<?php
declare(strict_types=1);

function loadEnvFile(string $path): array
{
    if (!is_file($path)) {
        return [];
    }

    $values = [];
    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    if ($lines === false) {
        return [];
    }

    foreach ($lines as $line) {
        $line = trim($line);
        if ($line === '' || str_starts_with($line, '#') || !str_contains($line, '=')) {
            continue;
        }

        [$key, $value] = explode('=', $line, 2);
        $key = trim($key);
        $value = trim($value);
        $value = trim($value, "\"'");

        if ($key !== '') {
            $values[$key] = $value;
        }
    }

    return $values;
}

function envValue(array $env, string $key, string $default): string
{
    $serverValue = $_SERVER[$key] ?? $_ENV[$key] ?? getenv($key);
    if ($serverValue !== false && $serverValue !== null && $serverValue !== '') {
        return (string) $serverValue;
    }

    return $env[$key] ?? $default;
}

function injectBaseHref(string $html, string $baseHref): string
{
    $baseTag = '    <base href="' . htmlspecialchars($baseHref, ENT_QUOTES, 'UTF-8') . '">' . PHP_EOL;

    if (preg_match('/<base\s/i', $html) === 1) {
        return preg_replace('/<base[^>]*>/i', trim($baseTag), $html, 1) ?? $html;
    }

    return preg_replace('/<head(\s*)>/i', '<head$1>' . PHP_EOL . $baseTag, $html, 1) ?? $html;
}

$env = loadEnvFile(__DIR__ . '/.env');
$mode = strtolower(envValue($env, 'EFTO_ENV', 'development'));
$staticRoot = envValue($env, 'EFTO_STATIC_ROOT', $mode === 'production' ? 'dist' : '.');
$indexFile = rtrim($staticRoot, '/\\') . '/index.html';
$indexPath = __DIR__ . '/' . $indexFile;

if (!is_file($indexPath)) {
    http_response_code(500);
    header('Content-Type: text/plain; charset=utf-8');
    echo "EFTO front controller could not find {$indexFile}.\n";
    echo $mode === 'production'
        ? "Run `npm run build` first or set EFTO_ENV=development.\n"
        : "Check EFTO_STATIC_ROOT in .env.\n";
    exit;
}

header('Content-Type: text/html; charset=utf-8');
header('Cache-Control: no-cache, no-store, must-revalidate');
header('Pragma: no-cache');
header('Expires: 0');

$html = file_get_contents($indexPath);
if ($html === false) {
    http_response_code(500);
    echo 'Failed to read game index.';
    exit;
}

if ($mode === 'production' && $staticRoot !== '.' && $staticRoot !== '') {
    $html = injectBaseHref($html, rtrim($staticRoot, '/\\') . '/');
}

echo $html;
