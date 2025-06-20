<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Configuration
$highscores_file = '../highscores.json';
$max_scores = 100;

// Helper function to read high scores
function loadHighScores($file) {
    if (!file_exists($file)) {
        return [];
    }
    
    $content = file_get_contents($file);
    if ($content === false) {
        return [];
    }
    
    $scores = json_decode($content, true);
    return is_array($scores) ? $scores : [];
}

// Helper function to save high scores
function saveHighScores($file, $scores) {
    $json = json_encode($scores, JSON_PRETTY_PRINT);
    return file_put_contents($file, $json) !== false;
}

// Helper function to validate score data
function validateScoreData($data) {
    return isset($data['name']) && isset($data['score']) && 
           is_string($data['name']) && is_numeric($data['score']);
}

// Handle different HTTP methods
$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        // Get all high scores
        $scores = loadHighScores($highscores_file);
        
        // Sort by score (highest first)
        usort($scores, function($a, $b) {
            return $b['score'] - $a['score'];
        });
        
        // Return top scores
        $top_scores = array_slice($scores, 0, $max_scores);
        
        echo json_encode($top_scores);
        break;
        
    case 'POST':
        // Add new high score
        $input = file_get_contents('php://input');
        $data = json_decode($input, true);
        
        if (!$data || !validateScoreData($data)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Invalid score data']);
            exit();
        }
        
        // Load existing scores
        $scores = loadHighScores($highscores_file);
        
        // Create new score entry
        $new_score = [
            'name' => trim($data['name']) ?: 'Anonymous',
            'score' => (int)$data['score'],
            'level' => isset($data['level']) ? (int)$data['level'] : 1,
            'gameTime' => isset($data['gameTime']) ? (int)$data['gameTime'] : 0,
            'timestamp' => date('c') // ISO 8601 format
        ];
        
        // Add new score
        $scores[] = $new_score;
        
        // Sort by score (highest first)
        usort($scores, function($a, $b) {
            return $b['score'] - $a['score'];
        });
        
        // Keep only top scores
        if (count($scores) > $max_scores) {
            $scores = array_slice($scores, 0, $max_scores);
        }
        
        // Save scores
        if (saveHighScores($highscores_file, $scores)) {
            echo json_encode([
                'success' => true,
                'scores' => $scores,
                'message' => 'Score added successfully'
            ]);
        } else {
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'error' => 'Failed to save score'
            ]);
        }
        break;
        
    default:
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
        break;
}
?> 