// Loading screen DOM helpers.

export function showLoadingScreen() {
    // Create loading screen if it doesn't exist
    let loadingScreen = document.getElementById('loadingScreen');
    if (!loadingScreen) {
        loadingScreen = document.createElement('div');
        loadingScreen.id = 'loadingScreen';
        loadingScreen.innerHTML = `
            <div class="loading-content">
                <h2>Loading DMTribut...</h2>
                <div class="loading-bar">
                    <div class="loading-progress" id="loadingProgress"></div>
                </div>
                <p id="loadingText">Loading critical assets...</p>
            </div>
        `;
        document.body.appendChild(loadingScreen);
        
        // Add CSS styles
        const style = document.createElement('style');
        style.textContent = `
            #loadingScreen {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.95);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 1000;
                color: white;
                font-family: Arial, sans-serif;
            }
            .loading-content {
                text-align: center;
                max-width: 400px;
                padding: 40px;
            }
            .loading-content h2 {
                color: #4ECDC4;
                margin-bottom: 30px;
                font-size: 28px;
            }
            .loading-bar {
                width: 100%;
                height: 8px;
                background: rgba(255, 255, 255, 0.2);
                border-radius: 4px;
                overflow: hidden;
                margin: 20px 0;
            }
            .loading-progress {
                height: 100%;
                background: linear-gradient(90deg, #4ECDC4, #26d0ce);
                width: 0%;
                transition: width 0.3s ease;
            }
            #loadingText {
                color: #ccc;
                font-size: 14px;
                margin-top: 15px;
            }
        `;
        document.head.appendChild(style);
    }
    loadingScreen.style.display = 'flex';
}

export function updateLoadingProgress(progress) {
    const progressBar = document.getElementById('loadingProgress');
    const loadingText = document.getElementById('loadingText');
    
    if (progressBar) {
        progressBar.style.width = `${progress * 100}%`;
    }
    
    if (loadingText) {
        const percentage = Math.round(progress * 100);
        
        // Show descriptive loading messages based on progress
        if (percentage < 70) {
            loadingText.textContent = `Loading critical assets... ${percentage}%`;
        } else if (percentage < 80) {
            loadingText.textContent = `Initializing player systems... ${percentage}%`;
        } else if (percentage < 90) {
            loadingText.textContent = `Setting up game systems... ${percentage}%`;
        } else if (percentage < 95) {
            loadingText.textContent = `Preparing user interface... ${percentage}%`;
        } else if (percentage < 100) {
            loadingText.textContent = `Finalizing initialization... ${percentage}%`;
        } else {
            loadingText.textContent = 'Ready to play!';
        }
    }
}

export function hideLoadingScreen() {
    const loadingScreen = document.getElementById('loadingScreen');
    if (loadingScreen) {
        loadingScreen.style.display = 'none';
    }
}
