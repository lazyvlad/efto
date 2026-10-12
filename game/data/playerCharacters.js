// The characters the player can be: one for each side.
//
// Each is a single drawing with a transparent background, brought to life by
// classes/CharacterAnimator.js, which shifts parts of the picture a little: the chest for
// breathing, the arms for catching and shooting, the legs for walking, the gear on the back
// for a sway. The "rig" says where those parts are in that one drawing. All positions are
// shares of the picture, 0 to 1: u across from the left, v down from the top.
//
//   heightInPicture - how much of the picture's height the figure fills
//   foot            - the middle of the feet: the figure is placed and leans around this point
//   chest           - breathing: starts between "from" values, fades out between "to" values
//                     (down the picture), widening around "center"
//   arms            - the band the arms and hands are in, and where each arm is across the
//                     picture ("at") and how wide ("width")
//   legs            - where the legs begin (they move from there down), and each leg
//   gear            - the corner holding what is carried on the back: left of "u", above "v"
//
// Nothing above the chest is shifted on its own, so a face is never distorted.
//
// To add a character, put its picture (square, 640px, WebP) in assets/player/, copy an entry
// and move the regions to fit the new drawing.

export const playerCharacters = {
    alliance: {
        id: 'pajama-hunter',
        name: 'Pajama Hunter',
        image: 'assets/player/pajama-hunter.webp',
        heightInPicture: 0.945,
        rig: {
            foot: { u: 0.5, v: 0.97 },
            chest: { from: [0.28, 0.39], to: [0.64, 0.88], center: 0.52 },
            arms: {
                from: [0.31, 0.39],
                to: [0.55, 0.64],
                left: { at: 0.40, width: 0.105 },
                right: { at: 0.72, width: 0.12 }
            },
            legs: {
                from: [0.59, 0.74],
                left: { at: 0.35, width: 0.105 },
                right: { at: 0.64, width: 0.11 }
            },
            gear: { u: [0.32, 0.40], v: [0.27, 0.34] }
        }
    },
    horde: {
        id: 'horde-tauren',
        name: 'Tauren',
        image: 'assets/player/horde-tauren.webp',
        heightInPicture: 0.962,
        rig: {
            foot: { u: 0.5, v: 0.975 },
            chest: { from: [0.26, 0.36], to: [0.62, 0.85], center: 0.5 },
            // Broader than the hunter: his arms reach further out to either side
            arms: {
                from: [0.36, 0.44],
                to: [0.58, 0.66],
                left: { at: 0.36, width: 0.13 },
                right: { at: 0.79, width: 0.13 }
            },
            legs: {
                from: [0.64, 0.78],
                left: { at: 0.33, width: 0.12 },
                right: { at: 0.72, width: 0.12 }
            },
            // The totem on his back, kept clear of his left horn
            gear: { u: [0.28, 0.37], v: [0.24, 0.32] }
        }
    }
};

// The character for a side; the Alliance one until a side has been chosen
export function characterFor(faction) {
    return playerCharacters[faction] || playerCharacters.alliance;
}
