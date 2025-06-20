# DMTribut Server-Side High Scores

The game now supports server-side high score storage using a Flask backend that saves scores to a JSON file.

## Features

- **Persistent High Scores**: Scores are saved on the server in `highscores.json`
- **Multi-Player Support**: Different players can compete on the same server
- **Automatic Backup**: Scores are also cached in browser localStorage as fallback
- **RESTful API**: Clean API endpoints for score management
- **Cross-Platform**: Works on Windows, Mac, and Linux

## Setup Instructions

### Option 1: Quick Start (Windows)
1. Double-click `start_server.bat`
2. The script will install dependencies and start the server
3. Open your browser to `http://localhost:5000`

### Option 2: Quick Start (Linux/Mac)
1. Make the script executable: `chmod +x start_server.sh`
2. Run the script: `./start_server.sh`
3. Open your browser to `http://localhost:5000`

### Option 3: Manual Setup
1. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

2. Start the server:
   ```bash
   python server.py
   ```

3. Open your browser to `http://localhost:5000`

## API Endpoints

The server provides the following API endpoints:

### GET /api/highscores
- Returns all high scores in JSON format
- Sorted by score (highest first)
- Limited to top 100 scores

### POST /api/highscores
- Add a new high score
- Required fields: `name`, `score`
- Optional fields: `level`, `gameTime`
- Automatically sorts and maintains top 100

### GET /api/highscores/player/{name}
- Get all scores for a specific player
- Case-insensitive player name matching

## Data Storage

High scores are stored in `highscores.json` with the following format:

```json
[
  {
    "name": "PlayerName",
    "score": 12500,
    "timestamp": "2024-01-15T10:30:00.123456",
    "level": 5,
    "gameTime": 180
  }
]
```

## Fallback System

The game includes a robust fallback system:

1. **Primary**: Server-side storage via Flask API
2. **Fallback**: Browser localStorage if server is unavailable
3. **Cache**: Scores are cached locally for faster loading

## Network Requirements

- **Port**: The server runs on port 5000 by default
- **Firewall**: Make sure port 5000 is open if you want other players to access it
- **LAN Access**: Other players on your network can access via `http://YOUR_IP:5000`

## Customization

### Change Server Port
Edit `server.py` and change the port in the last line:
```python
app.run(host='0.0.0.0', port=5000, debug=True)  # Change 5000 to your preferred port
```

### Change High Score Limit
Edit `server.py` and change the limit in the `add_high_score` function:
```python
scores = scores[:100]  # Change 100 to your preferred limit
```

## Troubleshooting

### Server Won't Start
- Make sure Python is installed
- Install dependencies: `pip install -r requirements.txt`
- Check if port 5000 is already in use

### Scores Not Saving
- Check server console for error messages
- Verify the server has write permissions for `highscores.json`
- Game will fallback to localStorage if server is unavailable

### Can't Access from Other Computers
- Check firewall settings
- Make sure you're using the correct IP address
- Try `http://YOUR_COMPUTER_IP:5000` instead of `localhost`

## Security Notes

- This is a simple development server
- For production use, consider using a proper web server (Apache, Nginx)
- The server accepts all origins (CORS enabled) for development convenience
- Consider adding authentication for production environments 