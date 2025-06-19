import { HIGH_SCORES_KEY, MAX_HIGH_SCORES } from '../config/gameConfig.js';

// Load high scores from localStorage
export function loadHighScores() {
    try {
        const scores = localStorage.getItem(HIGH_SCORES_KEY);
        return scores ? JSON.parse(scores) : [];
    } catch (e) {
        console.log('Error loading high scores:', e);
        return [];
    }
}

// Save high scores to localStorage
export function saveHighScores(scores) {
    try {
        localStorage.setItem(HIGH_SCORES_KEY, JSON.stringify(scores));
    } catch (e) {
        console.log('Error saving high scores:', e);
    }
}

// Add a new score to the high scores list
export function addHighScore(playerName, score, itemsCollected, level) {
    const scores = loadHighScores();
    
    const newScore = {
        name: playerName.trim() || 'Anonymous',
        score: score,
        itemsCollected: itemsCollected,
        level: level,
        date: new Date().toLocaleDateString(),
        timestamp: Date.now()
    };
    
    scores.push(newScore);
    
    // Sort by score (highest first)
    scores.sort((a, b) => b.score - a.score);
    
    // Keep only top 100 scores
    if (scores.length > MAX_HIGH_SCORES) {
        scores.splice(MAX_HIGH_SCORES);
    }
    
    saveHighScores(scores);
    
    // Return the rank of the new score (1-based)
    return scores.findIndex(s => s.timestamp === newScore.timestamp) + 1;
}

// Check if a score qualifies as a high score
export function isHighScore(score) {
    const scores = loadHighScores();
    return scores.length < MAX_HIGH_SCORES || score > (scores[scores.length - 1]?.score || 0);
}

// Display high scores in the UI
export function displayHighScores() {
    const scores = loadHighScores();
    const scoresList = document.getElementById('scoresList');
    
    if (scores.length === 0) {
        scoresList.innerHTML = '<p style="color: #999; font-style: italic;">No high scores yet. Be the first!</p>';
        return;
    }
    
    let html = '';
    scores.slice(0, 20).forEach((score, index) => {
        const isTop3 = index < 3;
        const rankEmoji = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '';
        
        html += `
            <div class="score-entry ${isTop3 ? 'top3' : ''}">
                <span class="score-rank">${rankEmoji} #${index + 1}</span>
                <span class="score-name">${score.name}</span>
                <span class="score-points">${score.score} pts</span>
                <span class="score-date">${score.date}</span>
            </div>
        `;
    });
    
    if (scores.length > 20) {
        html += `<p style="color: #999; margin-top: 20px; font-style: italic;">...and ${scores.length - 20} more scores</p>`;
    }
    
    scoresList.innerHTML = html;
} 