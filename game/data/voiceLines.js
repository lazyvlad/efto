// The guild's voice lines: clips cut from a raid recording, played at moments in the game.
//
// "clips" are the files in assets/audio/voice/ (each as .ogg, and .wav for browsers that
// cannot play OGG), with how long they last. "explicit" marks one with swearing in it.
//
// "moments" says what may be heard when: a list of clips to pick one from at random, and the
// chance that anything is said at all (1 = always). The labels come from automatic captions
// and nobody has checked what is really said in each clip, so this is a first assignment by
// label: listen to them (game-art/game-voice-clips/preview.html is a soundboard) and move
// clips between moments here as they fit. How often lines may come is "voice" in
// config/gameConfig.js; the moments are raised from systems/voiceSystem.js.

export const clips = {
    'heal-call': { file: '01-heal-call', seconds: 2.5 },
    'unsure-response': { file: '02-unsure-response', seconds: 5.25 },
    'give-it-to-me': { file: '03-give-it-to-me', seconds: 2.33 },
    'bravo': { file: '05-bravo', seconds: 4.5 },
    'thunderfury': { file: '06-thunderfury', seconds: 6.55 },
    'look-at-that': { file: '07-look-at-that', seconds: 3.8 },
    'healer': { file: '09-healer', seconds: 3.7 },
    'look-what-happened': { file: '10-look-what-happened', seconds: 2.58 },
    'batvane': { file: '11-batvane', seconds: 1.54 },
    'adjusting-to-play': { file: '12-adjusting-to-play', seconds: 2.48 },
    'i-want': { file: '13-i-want', seconds: 3.75 },
    'final-retort': { file: '14-final-retort', seconds: 4.95, explicit: true },
    'zlatko-zgnan': { file: '15-zlatko-zgnan', seconds: 4.23 }
};

export const moments = {
    // A boss comes in, and goes down
    bossAppears: { chance: 0.6, clips: ['adjusting-to-play', 'unsure-response'] },
    bossDefeated: { chance: 1, clips: ['bravo', 'look-at-that'] },
    // Thunder Fury is caught; any other rare item or set piece is
    thunderfury: { chance: 1, clips: ['thunderfury'] },
    rareCaught: { chance: 0.35, clips: ['give-it-to-me', 'i-want', 'look-at-that'] },
    // Health falls below a quarter; a heavy blow lands
    lowHealth: { chance: 1, clips: ['heal-call', 'healer'] },
    hurt: { chance: 0.25, clips: ['look-what-happened'] },
    // The hunter reaches a new level
    levelUp: { chance: 1, clips: ['zlatko-zgnan'] },
    // The game ends: lost, or won
    gameOver: { chance: 1, clips: ['final-retort', 'look-what-happened'] },
    victory: { chance: 1, clips: ['bravo'] },
    // Now and then, for no reason at all
    banter: { chance: 1, clips: ['batvane', 'unsure-response', 'i-want', 'adjusting-to-play'] }
};
