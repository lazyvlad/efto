# PHP High Scores API Setup

This document explains how to set up the PHP-based high scores API for the DMTribut game.

## Files

- `api/highscores.php` - Main PHP API endpoint
- `highscores.json` - JSON file storing the high scores data
- `systems/highScoreSystem.js` - Updated to use PHP endpoint

## Setup Instructions

### 1. Upload Files to PHP Server

Upload the following files to your PHP web server:

```
your-domain.com/
├── api/
│   └── highscores.php
├── highscores.json (will be created automatically)
├── game files...
└── index-modular.html
```

### 2. File Permissions

Make sure the web server can write to the directory where `highscores.json` will be stored:

```bash
chmod 755 /path/to/your/game/directory
chmod 666 /path/to/your/game/highscores.json  # if file exists
```

### 3. Test the API

You can test the API endpoints:

**Get High Scores:**
```
GET https://your-domain.com/api/highscores.php
```

**Add New Score:**
```
POST https://your-domain.com/api/highscores.php
Content-Type: application/json

{
    "name": "Player Name",
    "score": 1500,
    "level": 6,
    "gameTime": 300
}
```

## API Endpoints

### GET `/api/highscores.php`
Returns all high scores sorted by score (highest first).

**Response:**
```json
[
    {
        "name": "Player1",
        "score": 1500,
        "level": 6,
        "gameTime": 300,
        "timestamp": "2025-06-20T02:02:33+00:00"
    },
    ...
]
```

### POST `/api/highscores.php`
Adds a new high score.

**Request Body:**
```json
{
    "name": "Player Name",
    "score": 1500,
    "level": 6,
    "gameTime": 300
}
```

**Response:**
```json
{
    "success": true,
    "scores": [...],
    "message": "Score added successfully"
}
```

## Features

- **CORS Support**: Allows cross-origin requests
- **Data Validation**: Validates incoming score data
- **Automatic Sorting**: Scores are automatically sorted by highest first
- **Top 100 Limit**: Maintains only the top 100 scores
- **Fallback Support**: Game falls back to localStorage if API is unavailable
- **Error Handling**: Proper HTTP status codes and error messages

## File Structure

The `highscores.json` file will be automatically created with this structure:

```json
[
    {
        "name": "Player Name",
        "score": 1500,
        "level": 6,
        "gameTime": 300,
        "timestamp": "2025-06-20T02:02:33+00:00"
    }
]
```

## Troubleshooting

### Common Issues

1. **Permission Denied**: Make sure the web server can write to the directory
2. **CORS Errors**: The PHP script includes CORS headers, but some servers may need additional configuration
3. **File Not Found**: Ensure the `api/` directory exists and `highscores.php` is uploaded correctly

### Testing Locally

If you want to test locally with PHP:

```bash
# Navigate to your game directory
cd /path/to/your/game

# Start PHP built-in server
php -S localhost:8080

# Access your game at:
# http://localhost:8080/index-modular.html
```

## Migration from Flask

If you were previously using the Flask server, the game will automatically work with the PHP API without any changes needed in the game code. The JavaScript high score system has been updated to use the PHP endpoint.

The data format is compatible, so existing high scores should work seamlessly. 