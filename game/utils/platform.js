// Platform-specific UI helpers.

export function isIOS() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) || 
           (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

export function handleIOSAudioSettings() {
    if (isIOS()) {
        console.log('iOS device detected - adjusting audio settings UI');
        
        // Show iOS notice
        const iosNotice = document.getElementById('iosVolumeNotice');
        if (iosNotice) {
            iosNotice.style.display = 'block';
        }
        
        // Hide volume controls and add visual indication
        const volumeControls = document.getElementById('volumeControls');
        if (volumeControls) {
            volumeControls.classList.add('ios-hidden');
        }
        
        // Add iOS-specific message to settings
        const audioSection = document.querySelector('.settings-section h3');
        if (audioSection && audioSection.textContent.includes('Audio Settings')) {
            const iosMessage = document.createElement('div');
            iosMessage.style.cssText = `
                color: #ffc107;
                font-size: 12px;
                text-align: center;
                margin-top: 10px;
                font-style: italic;
            `;
            iosMessage.textContent = 'Use device volume buttons to control audio level';
            audioSection.parentNode.appendChild(iosMessage);
        }
    }
}
