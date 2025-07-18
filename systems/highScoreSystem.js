import { HIGH_SCORES_KEY, MAX_HIGH_SCORES, gameConfig } from '../config/gameConfig.js';

// Server API endpoints using configuration
const API_BASE = gameConfig.api.basePath ? 
    `${gameConfig.api.basePath}/${gameConfig.api.endpoints.highscores}` : 
    `/${gameConfig.api.endpoints.highscores}`;

// Load high scores from server (with localStorage fallback)
export async function loadHighScores() {
    try {
        const response = await fetch(API_BASE);
        if (response.ok) {
            const scores = await response.json();
            // Cache in localStorage as backup
            localStorage.setItem(HIGH_SCORES_KEY, JSON.stringify(scores));
            return scores;
        } else {
            throw new Error('Server unavailable');
        }
    } catch (e) {
        console.log('Error loading high scores from server, using localStorage:', e);
        // Fallback to localStorage
        try {
            const scores = localStorage.getItem(HIGH_SCORES_KEY);
            return scores ? JSON.parse(scores) : [];
        } catch (localError) {
            console.log('Error loading from localStorage:', localError);
            return [];
        }
    }
}

// Non-async version for backward compatibility
export function loadHighScoresSync() {
    try {
        const scores = localStorage.getItem(HIGH_SCORES_KEY);
        return scores ? JSON.parse(scores) : [];
    } catch (e) {
        console.log('Error loading high scores:', e);
        return [];
    }
}

// Save high scores to server (with localStorage fallback)
export async function saveHighScores(scores) {
    try {
        // Always save to localStorage as backup
        localStorage.setItem(HIGH_SCORES_KEY, JSON.stringify(scores));
    } catch (e) {
        console.log('Error saving to localStorage:', e);
    }
}

// Add a new score to the high scores list
export async function addHighScore(playerName, score, itemsCollected, level, gameTime = 0, dragonstalkerCompletions = 0, finalCritRating = 0, finalDodgeRating = 0) {
    try {
        const newScore = {
            name: playerName.trim() || 'Anonymous',
            score: score,
            level: level,
            gameTime: gameTime,
            dragonstalkerCompletions: dragonstalkerCompletions,
            finalCritRating: Math.round(finalCritRating * 1000) / 10, // Convert to percentage with 1 decimal
            finalDodgeRating: Math.round(finalDodgeRating * 1000) / 10 // Convert to percentage with 1 decimal
        };
        
        // Send to server
        const response = await fetch(API_BASE, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(newScore)
        });
        
        if (response.ok) {
            const result = await response.json();
            if (result.success) {
                // Cache updated scores locally
                localStorage.setItem(HIGH_SCORES_KEY, JSON.stringify(result.scores));
                
                // Return the rank of the new score (1-based)
                const rank = result.scores.findIndex(s => 
                    s.name === newScore.name && 
                    s.score === newScore.score && 
                    s.timestamp === result.scores.find(rs => rs.name === newScore.name && rs.score === newScore.score)?.timestamp
                ) + 1;
                return rank;
            }
        }
        
        throw new Error('Server response not ok');
        
    } catch (e) {
        console.log('Error saving to server, using localStorage fallback:', e);
        
        // Fallback to localStorage
        const scores = await loadHighScores();
        
        const newScore = {
            name: playerName.trim() || 'Anonymous',
            score: score,
            itemsCollected: itemsCollected,
            level: level,
            date: new Date().toLocaleDateString(),
            timestamp: Date.now(),
            dragonstalkerCompletions: dragonstalkerCompletions,
            finalCritRating: Math.round(finalCritRating * 1000) / 10, // Convert to percentage with 1 decimal
            finalDodgeRating: Math.round(finalDodgeRating * 1000) / 10 // Convert to percentage with 1 decimal
        };
        
        scores.push(newScore);
        
        // Sort by score (highest first)
        scores.sort((a, b) => b.score - a.score);
        
        // Keep only top 100 scores
        if (scores.length > MAX_HIGH_SCORES) {
            scores.splice(MAX_HIGH_SCORES);
        }
        
        await saveHighScores(scores);
        
        // Return the rank of the new score (1-based)
        return scores.findIndex(s => s.timestamp === newScore.timestamp) + 1;
    }
}

// Check if a score qualifies as a high score
export async function isHighScore(score) {
    const scores = await loadHighScores();
    return scores.length < MAX_HIGH_SCORES || score > (scores[scores.length - 1]?.score || 0);
}

// Display high scores in the UI
export async function displayHighScores() {
    try {
        const scores = await loadHighScores();
        renderHighScoresList(scores);
    } catch (error) {
        console.log('Error in displayHighScores, falling back to sync:', error);
        // Fallback to sync version
        const scores = loadHighScoresSync();
        renderHighScoresList(scores);
    }
}

// Sync version for compatibility
export function displayHighScoresSync() {
    const scores = loadHighScoresSync();
    renderHighScoresList(scores);
}

// Helper function to render the scores list
function renderHighScoresList(scores) {
    // Try both old and new element IDs for compatibility
    const scoresList = document.getElementById('highScoresList') || document.getElementById('scoresList');
    
    if (!scoresList) {
        console.warn('High scores list element not found. Expected #highScoresList or #scoresList');
        return;
    }
    
    if (scores.length === 0) {
        scoresList.innerHTML = '<p style="color: #999; font-style: italic;">No high scores yet. Be the first!</p>';
        return;
    }
    
    let html = `
        <div class="score-header">
            <span class="score-rank">Rank</span>
            <span class="score-name">Name</span>
            <span class="score-points">Score</span>
            <span class="score-level">Level</span>
            <span class="score-ds">🐉 DS</span>
            <span class="score-crit">⚡ Crit</span>
            <span class="score-dodge">💨 Dodge</span>
            <span class="score-date">Date</span>
        </div>
    `;
    scores.slice(0, 20).forEach((score, index) => {
        const isTop3 = index < 3;
        const rankEmoji = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '';
        
        // Handle both server format (timestamp) and localStorage format (date)
        let displayDate = 'undefined';
        if (score.date) {
            displayDate = score.date;
        } else if (score.timestamp) {
            // Convert server timestamp to readable date
            try {
                const date = new Date(score.timestamp);
                displayDate = date.toLocaleDateString();
            } catch (e) {
                displayDate = 'recent';
            }
        }
        
        // Format level display
        const levelDisplay = score.level ? `Lv.${score.level}` : 'Lv.?';
        
        // Format dragonstalker completions
        const dsCompletions = score.dragonstalkerCompletions || 0;
        const dsDisplay = dsCompletions > 0 ? `🐉${dsCompletions}` : '🐉0';
        
        // Format crit and dodge ratings
        const critDisplay = score.finalCritRating ? `⚡${score.finalCritRating}%` : '⚡0%';
        const dodgeDisplay = score.finalDodgeRating ? `💨${score.finalDodgeRating}%` : '💨0%';
        
        html += `
            <div class="score-entry ${isTop3 ? 'top3' : ''}">
                <span class="score-rank">${rankEmoji} #${index + 1}</span>
                <span class="score-name">${score.name || 'Anonymous'}</span>
                <span class="score-points">${score.score || 0} pts</span>
                <span class="score-level">${levelDisplay}</span>
                <span class="score-ds">${dsDisplay}</span>
                <span class="score-crit">${critDisplay}</span>
                <span class="score-dodge">${dodgeDisplay}</span>
                <span class="score-date">${displayDate}</span>
            </div>
        `;
    });
    
    if (scores.length > 20) {
        html += `<p style="color: #999; margin-top: 20px; font-style: italic;">...and ${scores.length - 20} more scores</p>`;
    }
    
    scoresList.innerHTML = html;
} 