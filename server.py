from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import json
import os
from datetime import datetime

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# High scores file path
HIGH_SCORES_FILE = 'highscores.json'

def load_high_scores():
    """Load high scores from JSON file"""
    if os.path.exists(HIGH_SCORES_FILE):
        try:
            with open(HIGH_SCORES_FILE, 'r') as f:
                return json.load(f)
        except (json.JSONDecodeError, IOError):
            return []
    return []

def save_high_scores(scores):
    """Save high scores to JSON file"""
    try:
        with open(HIGH_SCORES_FILE, 'w') as f:
            json.dump(scores, f, indent=2)
        return True
    except IOError:
        return False

@app.route('/')
def index():
    """Serve the main game page"""
    return send_from_directory('.', 'index-modular.html')

@app.route('/<path:filename>')
def serve_static(filename):
    """Serve static files (CSS, JS, images, audio, etc.)"""
    return send_from_directory('.', filename)

@app.route('/api/highscores', methods=['GET'])
def get_high_scores():
    """Get all high scores"""
    scores = load_high_scores()
    return jsonify(scores)

@app.route('/api/highscores', methods=['POST'])
def add_high_score():
    """Add a new high score"""
    try:
        data = request.get_json()
        
        # Validate required fields
        if not data or 'name' not in data or 'score' not in data:
            return jsonify({'error': 'Name and score are required'}), 400
        
        # Load existing scores
        scores = load_high_scores()
        
        # Create new score entry
        new_score = {
            'name': data['name'][:20],  # Limit name length
            'score': int(data['score']),
            'timestamp': datetime.now().isoformat(),
            'level': data.get('level', 1),
            'gameTime': data.get('gameTime', 0)
        }
        
        # Add new score
        scores.append(new_score)
        
        # Sort by score (descending) and keep top 100
        scores.sort(key=lambda x: x['score'], reverse=True)
        scores = scores[:100]
        
        # Save to file
        if save_high_scores(scores):
            return jsonify({'success': True, 'scores': scores})
        else:
            return jsonify({'error': 'Failed to save high score'}), 500
            
    except (ValueError, TypeError) as e:
        return jsonify({'error': 'Invalid data format'}), 400
    except Exception as e:
        return jsonify({'error': 'Server error'}), 500

@app.route('/api/highscores/player/<player_name>', methods=['GET'])
def get_player_scores(player_name):
    """Get high scores for a specific player"""
    scores = load_high_scores()
    player_scores = [score for score in scores if score['name'].lower() == player_name.lower()]
    return jsonify(player_scores)

if __name__ == '__main__':
    print("Starting DMTribut game server...")
    print("Game will be available at: http://localhost:5000")
    print("High scores will be stored in: highscores.json")
    app.run(host='0.0.0.0', port=5000, debug=True) 