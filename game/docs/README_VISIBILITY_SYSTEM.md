# Page Visibility System - Auto-Pause Background Music

## Problem Solved
Previously, the game's background music would continue playing even when:
- Browser was minimized
- User switched to another tab
- Mobile device was locked
- User switched to another app

This was annoying for users and could drain battery life on mobile devices.

## Solution Implemented

The **Page Visibility API System** automatically pauses and resumes background music based on browser focus state. It uses multiple detection methods for maximum compatibility across devices and browsers.

## How It Works

### Detection Methods
The system uses a multi-layered approach for robust detection:

1. **Page Visibility API** (primary) - `document.visibilitychange`
   - Modern standard for detecting when page becomes hidden/visible
   - Works reliably on most modern browsers and mobile devices

2. **Window Focus Events** (backup) - `window.focus`/`window.blur`
   - Fallback for older browsers or edge cases
   - Handles window focus changes

3. **Page Lifecycle Events** (mobile) - `pagehide`/`pageshow`
   - Special handling for mobile device scenarios
   - Covers app switching and device lock situations

### Smart State Management
- **Remembers Music State**: Only resumes music if it was playing before the page became hidden
- **Respects User Settings**: Always checks if background music is enabled in settings
- **Prevents Rapid Toggling**: Uses delays to avoid audio glitches from quick focus changes
- **Multiple Event Deduplication**: Prevents the same action from triggering multiple times

### Timing Configuration
```javascript
pauseDelay: 100ms    // Delay before pausing (prevents rapid toggling)
resumeDelay: 500ms   // Delay before resuming (ensures proper state)
```

## Usage

### Automatic Initialization
The system initializes automatically during game startup:
```javascript
// Automatically called in game-modular.js during init()
initializeVisibilitySystem();
```

### Debug Information
In development mode (localhost), you can check the system status:
```javascript
// In browser console
console.log(window.getVisibilitySystemStatus());

// Returns:
{
  initialized: true,
  currentState: "visible",
  isHidden: false,
  musicWasPlaying: false,
  apiSupported: true,
  backgroundMusicEnabled: true,
  backgroundMusicPlaying: true
}
```

### Configuration
You can adjust the system behavior if needed:
```javascript
// Enable/disable logging
updateVisibilityConfig({ enableLogging: true });

// Adjust timing
updateVisibilityConfig({ 
  pauseDelay: 50,
  resumeDelay: 300 
});

// Disable user settings respect (not recommended)
updateVisibilityConfig({ respectUserSettings: false });
```

## Testing Scenarios

### Desktop Testing
1. **Tab Switching**: Switch to another browser tab → music should pause
2. **Window Minimize**: Minimize the browser → music should pause  
3. **Alt+Tab**: Switch to another application → music should pause
4. **Return to Game**: Focus back on the game → music should resume (if it was playing)

### Mobile Testing  
1. **Home Button**: Press home button to background the browser → music should pause
2. **App Switching**: Switch to another app → music should pause
3. **Screen Lock**: Lock the device → music should pause
4. **Return to Browser**: Open browser again → music should resume (if it was playing)

### Edge Cases
1. **Music Disabled**: If user has disabled background music in settings → no action taken
2. **Music Not Playing**: If music wasn't playing when hidden → won't auto-start when visible
3. **Rapid Focus Changes**: Multiple quick focus changes → handled gracefully with delays

## Console Logging (Development Only)

In development mode, the system provides detailed logging:

```
🔍 Visibility system initialized - will auto-pause music when browser loses focus
🔍 Visibility changed: HIDDEN (via visibilitychange)
🔍 Page hidden (visibilitychange) - pausing background music  
🔊 Background music paused due to page hidden
🔍 Visibility changed: VISIBLE (via visibilitychange)
🔍 Page visible (visibilitychange) - resuming background music
🔊 Background music resumed after page became visible
```

## Browser Compatibility

### Fully Supported
- Chrome 33+ (including Android Chrome)
- Firefox 18+ (including Firefox Mobile)
- Safari 7+ (including iOS Safari)
- Edge 12+
- Opera 20+

### Partial Support (fallback events work)
- Internet Explorer 10+ (uses focus/blur events)
- Older mobile browsers (uses pagehide/pageshow)

### Graceful Degradation
If Page Visibility API is not supported, the system:
- Logs a warning but doesn't break the game
- Falls back to window focus/blur events where possible
- Disables itself completely if no compatible events are available

## Integration Points

### Files Modified
- `systems/visibilitySystem.js` - New system implementation
- `game-modular.js` - Integration and initialization
- Audio controlled via existing `systems/audioSystem.js`

### Dependencies
- Imports `sounds` from `audioSystem.js`
- Imports `isBackgroundMusicEnabled` from `settingsSystem.js`
- No additional external dependencies

## Benefits

1. **Better User Experience**: Music doesn't play when user isn't actively using the game
2. **Battery Optimization**: Reduces battery drain on mobile devices
3. **Audio Context Compliance**: Helps with browser audio autoplay policies
4. **Professional Behavior**: Matches user expectations from native applications
5. **Accessibility**: Respects user's focus context and multitasking

The visibility system provides a seamless, professional experience that automatically manages background music based on user context while respecting all user settings and preferences. 