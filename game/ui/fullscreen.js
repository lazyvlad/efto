// On a phone or tablet the game takes the whole screen while it is being played, without the
// browser's bars, and gives it back when the game is paused or over.
//
// A browser only allows this in answer to a touch, which starting and continuing a game are.
// The iPhone's browser does not allow it at all (only for videos); there the game simply stays
// as it is. iPads and Android phones do.

const TOUCH_FIRST = '(hover: none) and (pointer: coarse)';

function current() {
    return document.fullscreenElement || document.webkitFullscreenElement || null;
}

export function enterFullscreen() {
    if (!window.matchMedia(TOUCH_FIRST).matches || current()) return;

    const page = document.documentElement;
    const request = page.requestFullscreen || page.webkitRequestFullscreen;
    if (!request) return;

    try {
        // Refused (no touch behind it, or not allowed here): the game goes on as it is
        Promise.resolve(request.call(page, { navigationUI: 'hide' })).catch(() => {});
    } catch (e) {
        // An older browser that throws instead of refusing
    }
}

export function leaveFullscreen() {
    if (!current()) return;

    const exit = document.exitFullscreen || document.webkitExitFullscreen;
    if (!exit) return;

    try {
        Promise.resolve(exit.call(document)).catch(() => {});
    } catch (e) {
        // Already left
    }
}
