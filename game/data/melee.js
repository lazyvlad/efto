// The hunter's melee: the parts he is drawn from when he swings, and how they hang together.
//
// Each hunter has a plain body with his arms taken off, and his upper arms, forearms, two
// closed fists and a relaxed hand, each a picture of its own on the same 800 x 800 canvas as
// all his clothes (data/hunterArt.js), drawn where it is in that picture. Every piece of armor
// worn on the arms (chests, shoulders, bracers, gloves) has its own parts that move with them.
// The art agent's work (art-workbench/hunter-melee), as is everything in here.
//
// rigs: in picture pixels, each arm's shoulder, elbow and wrist ("bend": which way its elbow
// bends), where its fist closes round a handle ("grip"), and the relaxed hand's wrist. "left"
// and "right" are the sides of the screen: the right hand holds the weapon, the left helps
// with a two-handed one.
//
// weapons: a whole picture of each weapon he can swing ("style: 'short'" for a short blade,
// thrust rather than swung: utils/meleeMotion.js), assets/player/combat/weapons/<id>.webp,
// upright; where on it the right fist closes ("grip", as shares of its width and height), the
// left one for a two-hander ("support"), and how tall it is drawn in picture pixels.

export const meleeRigs = {
    alliance: {
        offset: [0, 0],
        left: { shoulder: [285, 254], elbow: [261, 334], wrist: [340, 398], bend: 1, grip: [371.0, 395.76], relaxed: [340, 398] },
        right: { shoulder: [490, 265], elbow: [535, 347], wrist: [629, 395], bend: -1, grip: [598.02, 392.76] },
    },
    horde: {
        offset: [-10, 10],
        left: { shoulder: [276, 298], elbow: [257, 390], wrist: [355, 445], bend: 1, grip: [390.1, 442.52], relaxed: [355, 445] },
        right: { shoulder: [554, 305], elbow: [590, 398], wrist: [690, 448], bend: -1, grip: [654.92, 445.52] },
    },
};

export const meleeWeapons = {
    'stockade-lockbreaker': { grip: [0.4979, 0.813], support: null, height: 275, twoHanded: false },
    'searing-blade-embermace': { grip: [0.4989, 0.813], support: null, height: 290, twoHanded: false },
    'redridge-blackiron-glaive': { grip: [0.7324, 0.7538], support: [0.7324, 0.8912], height: 440, twoHanded: true },
    'stromgarde-oathblade': { grip: [0.5, 0.8225], support: [0.5, 0.9008], height: 430, twoHanded: true },
    'highperch-windglaive': { grip: [0.4924, 0.7538], support: [0.4924, 0.8912], height: 440, twoHanded: true },
    'magram-crescent-cleaver': { grip: [0.6395, 0.7538], support: [0.6395, 0.8912], height: 425, twoHanded: true },
    'hoggers-trophy-axe': { grip: [0.47, 0.76], support: [0.47, 0.87], height: 420, twoHanded: true },
    'thunderfury': { grip: [0.323, 0.79], support: null, height: 440, twoHanded: false },
    'cruel-barb': { grip: [0.5791, 0.8201], support: null, height: 300, twoHanded: false, style: 'short' },
    'abominations-hook': { grip: [0.622, 0.7158], support: null, height: 290, twoHanded: false },
    'embalmers-cleaver': { grip: [0.4985, 0.7457], support: null, height: 280, twoHanded: false },
    'nekroshs-spiked-mace': { grip: [0.504, 0.7112], support: null, height: 300, twoHanded: false },
    'vilebranch-soul-dagger': { grip: [0.4977, 0.7621], support: null, height: 210, twoHanded: false, style: 'short' },
    'cursed-felblade': { grip: [0.5183, 0.8124], support: null, height: 300, twoHanded: false },
    'ripsaw': { grip: [0.4254, 0.7801], support: null, height: 315, twoHanded: false },
    'jangthraze-the-protector': { grip: [0.4203, 0.7876], support: null, height: 330, twoHanded: false },
    'brutality_blade': { grip: [0.569, 0.8296], support: null, height: 360, twoHanded: false },
    'maladath': { grip: [0.7143, 0.8232], support: null, height: 360, twoHanded: false },
    'gathilzoggs-war-axe': { grip: [0.5211, 0.6247], support: [0.5211, 0.7698], height: 410, twoHanded: true },
    'ashkandi2': { grip: [0.5969, 0.7072], support: [0.5969, 0.7974], height: 470, twoHanded: true },
    'crulshorukh': { grip: [0.4803, 0.662], support: [0.4803, 0.8092], height: 425, twoHanded: true },
    'walking-stick': { grip: [0.3935, 0.6684], support: [0.3935, 0.8001], height: 430, twoHanded: true },
    // The weapons the hunters start with
    'starter-alliance-shortsword': { grip: [0.4831, 0.8123], support: null, height: 245, twoHanded: false, style: 'short' },
    'starter-horde-handaxe': { grip: [0.7061, 0.7718], support: null, height: 235, twoHanded: false },
};

// The plain body each hunter fights in (his arms off, nothing worn), and his bare arms and
// hands: [picture, painted area [left, top, right, bottom]], under assets/player/combat/armor/
export const meleeBodies = {
    alliance: {
        'body': ["alliance/base/body-clean.webp", [62, 22, 736, 800]],
        'left-upper': ["alliance/base/left-upper.webp", [224, 220, 326, 351]],
        'left-forearm': ["alliance/base/left-forearm.webp", [244, 312, 359, 418]],
        'left-grip': ["alliance/base/left-grip.webp", [338, 367, 391, 423]],
        'right-upper': ["alliance/base/right-upper.webp", [435, 233, 580, 361]],
        'right-forearm': ["alliance/base/right-forearm.webp", [516, 326, 647, 420]],
        'right-grip': ["alliance/base/right-grip.webp", [578, 364, 632, 420]],
        'left-hand-relaxed': ["alliance/base/left-hand-relaxed.webp", [338, 350, 433, 426]],
    },
    horde: {
        'body': ["horde/base/body-clean.webp", [0, 27, 785, 789]],
        'left-upper': ["horde/base/left-upper.webp", [215, 260, 322, 408]],
        'left-forearm': ["horde/base/left-forearm.webp", [231, 369, 369, 480]],
        'left-grip': ["horde/base/left-grip.webp", [353, 410, 417, 472]],
        'right-upper': ["horde/base/right-upper.webp", [494, 270, 643, 414]],
        'right-forearm': ["horde/base/right-forearm.webp", [577, 367, 718, 462]],
        'right-grip': ["horde/base/right-grip.webp", [628, 413, 693, 475]],
        'left-hand-relaxed': ["horde/base/left-hand-relaxed.webp", [353, 388, 475, 478]],
    },
};

// What each piece of armor worn on the arms looks like as he fights, by side: "sleeves" in place
// of the bare ones (a chest's), and "parts": [picture, what it moves with, pass, order, painted
// area]. What it moves with: the torso, an upper arm or forearm, a hand (the fist, or the
// relaxed hand), or nothing ("static-shoulder", over the roots of the arms). Any other item is
// drawn as it always is, still, in its place among the rest.
export const meleeArmor = {
    'giantstalker-chest': {
        alliance: {
            sleeves: { 'left-upper': ["alliance/giantstalker-chest/left-upper-sleeve.webp", [233, 241, 311, 344]], 'left-forearm': ["alliance/giantstalker-chest/left-forearm-sleeve.webp", [244, 310, 349, 428]], 'right-upper': ["alliance/giantstalker-chest/right-upper-sleeve.webp", [464, 251, 564, 357]], 'right-forearm': ["alliance/giantstalker-chest/right-forearm-sleeve.webp", [518, 330, 654, 404]] },
            parts: [
                ["alliance/giantstalker-chest/torso_torso.webp", "torso", "torso", 30, [313, 194, 506, 371]],
                ["alliance/giantstalker-chest/right-upper_upper-overlay.webp", "right-upper", "upper-overlay", 30, [506, 242, 524, 331]],
            ],
        },
        horde: {
            sleeves: { 'left-upper': ["horde/giantstalker-chest/left-upper-sleeve.webp", [238, 296, 302, 404]], 'left-forearm': ["horde/giantstalker-chest/left-forearm-sleeve.webp", [238, 371, 376, 461]], 'right-upper': ["horde/giantstalker-chest/right-upper-sleeve.webp", [532, 289, 604, 416]], 'right-forearm': ["horde/giantstalker-chest/right-forearm-sleeve.webp", [575, 377, 707, 478]] },
            parts: [
                ["horde/giantstalker-chest/torso_torso.webp", "torso", "torso", 30, [329, 203, 546, 434]],
            ],
        },
    },
    'giantstalker-bracers': {
        alliance: {
            parts: [
                ["alliance/giantstalker-bracers/left-forearm.webp", "left-forearm", "bracer", 60, [249, 323, 362, 421]],
                ["alliance/giantstalker-bracers/right-forearm.webp", "right-forearm", "bracer", 60, [533, 322, 647, 423]],
            ],
        },
        horde: {
            parts: [
                ["horde/giantstalker-bracers/left-forearm.webp", "left-forearm", "bracer", 60, [252, 366, 379, 458]],
                ["horde/giantstalker-bracers/right-forearm.webp", "right-forearm", "bracer", 60, [581, 379, 700, 486]],
            ],
        },
    },
    'giantstalker-gloves': {
        alliance: {
            parts: [
                ["alliance/giantstalker-gloves/left-cuff.webp", "left-hand", "glove", 70, [324, 388, 361, 410]],
                ["alliance/giantstalker-gloves/right-cuff.webp", "right-hand", "glove", 70, [609, 384, 645, 406]],
            ],
        },
        horde: {
            parts: [
                ["horde/giantstalker-gloves/left-cuff.webp", "left-hand", "glove", 70, [338, 430, 376, 459]],
                ["horde/giantstalker-gloves/right-cuff.webp", "right-hand", "glove", 70, [670, 433, 707, 462]],
            ],
        },
    },
    'ds_chest': {
        alliance: {
            sleeves: { 'left-upper': ["alliance/ds_chest/left-upper-sleeve.webp", [246, 241, 307, 346]], 'left-forearm': ["alliance/ds_chest/left-forearm-sleeve.webp", [244, 312, 359, 418]], 'right-upper': ["alliance/ds_chest/right-upper-sleeve.webp", [466, 250, 553, 363]], 'right-forearm': ["alliance/ds_chest/right-forearm-sleeve.webp", [516, 326, 647, 420]] },
            parts: [
                ["alliance/ds_chest/torso_torso.webp", "torso", "torso", 30, [313, 194, 506, 371]],
                ["alliance/ds_chest/right-upper_upper-overlay.webp", "right-upper", "upper-overlay", 30, [506, 242, 524, 331]],
            ],
        },
        horde: {
            sleeves: { 'left-upper': ["horde/ds_chest/left-upper-sleeve.webp", [228, 282, 302, 402]], 'left-forearm': ["horde/ds_chest/left-forearm-sleeve.webp", [231, 369, 369, 480]], 'right-upper': ["horde/ds_chest/right-upper-sleeve.webp", [530, 285, 623, 413]], 'right-forearm': ["horde/ds_chest/right-forearm-sleeve.webp", [577, 367, 718, 462]] },
            parts: [
                ["horde/ds_chest/torso_torso.webp", "torso", "torso", 30, [329, 203, 546, 434]],
            ],
        },
    },
    'ds_bracers': {
        alliance: {
            parts: [
                ["alliance/ds_bracers/left-forearm.webp", "left-forearm", "bracer", 60, [254, 326, 350, 424]],
                ["alliance/ds_bracers/right-forearm.webp", "right-forearm", "bracer", 60, [537, 328, 647, 406]],
            ],
        },
        horde: {
            parts: [
                ["horde/ds_bracers/left-forearm.webp", "left-forearm", "bracer", 60, [254, 362, 381, 465]],
                ["horde/ds_bracers/right-forearm.webp", "right-forearm", "bracer", 60, [591, 369, 704, 484]],
            ],
        },
    },
    'ds_gloves': {
        alliance: {
            parts: [
                ["alliance/ds_gloves/left-cuff.webp", "left-hand", "glove", 70, [323, 385, 361, 412]],
                ["alliance/ds_gloves/right-cuff.webp", "right-hand", "glove", 70, [609, 380, 646, 408]],
            ],
        },
        horde: {
            parts: [
                ["horde/ds_gloves/left-cuff.webp", "left-hand", "glove", 70, [339, 433, 376, 457]],
                ["horde/ds_gloves/right-cuff.webp", "right-hand", "glove", 70, [669, 436, 706, 460]],
            ],
        },
    },
    'cryptstalker-chest': {
        alliance: {
            sleeves: { 'left-upper': ["alliance/cryptstalker-chest/left-upper-sleeve.webp", [249, 240, 302, 349]], 'left-forearm': ["alliance/cryptstalker-chest/left-forearm-sleeve.webp", [239, 323, 364, 412]], 'right-upper': ["alliance/cryptstalker-chest/right-upper-sleeve.webp", [475, 247, 546, 369]], 'right-forearm': ["alliance/cryptstalker-chest/right-forearm-sleeve.webp", [522, 324, 643, 424]] },
            parts: [
                ["alliance/cryptstalker-chest/torso_torso.webp", "torso", "torso", 30, [313, 194, 506, 371]],
                ["alliance/cryptstalker-chest/right-upper_upper-overlay.webp", "right-upper", "upper-overlay", 30, [506, 242, 524, 331]],
            ],
        },
        horde: {
            sleeves: { 'left-upper': ["horde/cryptstalker-chest/left-upper-sleeve.webp", [243, 281, 299, 407]], 'left-forearm': ["horde/cryptstalker-chest/left-forearm-sleeve.webp", [228, 373, 383, 457]], 'right-upper': ["horde/cryptstalker-chest/right-upper-sleeve.webp", [535, 283, 599, 421]], 'right-forearm': ["horde/cryptstalker-chest/right-forearm-sleeve.webp", [576, 362, 704, 485]] },
            parts: [
                ["horde/cryptstalker-chest/torso_torso.webp", "torso", "torso", 30, [329, 203, 546, 434]],
            ],
        },
    },
    'cryptstalker-bracers': {
        alliance: {
            parts: [
                ["alliance/cryptstalker-bracers/left-forearm.webp", "left-forearm", "bracer", 60, [262, 328, 355, 422]],
                ["alliance/cryptstalker-bracers/right-forearm.webp", "right-forearm", "bracer", 60, [533, 338, 647, 414]],
            ],
        },
        horde: {
            parts: [
                ["horde/cryptstalker-bracers/left-forearm.webp", "left-forearm", "bracer", 60, [254, 374, 374, 476]],
                ["horde/cryptstalker-bracers/right-forearm.webp", "right-forearm", "bracer", 60, [584, 390, 710, 472]],
            ],
        },
    },
    'cryptstalker-gloves': {
        alliance: {
            parts: [
                ["alliance/cryptstalker-gloves/left-cuff.webp", "left-hand", "glove", 70, [323, 385, 361, 411]],
                ["alliance/cryptstalker-gloves/right-cuff.webp", "right-hand", "glove", 70, [610, 382, 646, 408]],
            ],
        },
        horde: {
            parts: [
                ["horde/cryptstalker-gloves/left-cuff.webp", "left-hand", "glove", 70, [339, 435, 376, 456]],
                ["horde/cryptstalker-gloves/right-cuff.webp", "right-hand", "glove", 70, [670, 438, 706, 459]],
            ],
        },
    },
    'giantstalker-shoulders': {
        alliance: {
            parts: [
                ["alliance/giantstalker-shoulders/static-shoulder_shoulder-cap.webp", "static-shoulder", "shoulder-cap", 50, [216, 163, 564, 335]],
            ],
        },
        horde: {
            parts: [
                ["horde/giantstalker-shoulders/static-shoulder_shoulder-cap.webp", "static-shoulder", "shoulder-cap", 50, [150, 159, 647, 375]],
            ],
        },
    },
    'ds_shoulders': {
        alliance: {
            parts: [
                ["alliance/ds_shoulders/static-shoulder_shoulder-cap.webp", "static-shoulder", "shoulder-cap", 50, [215, 163, 567, 334]],
            ],
        },
        horde: {
            parts: [
                ["horde/ds_shoulders/static-shoulder_shoulder-cap.webp", "static-shoulder", "shoulder-cap", 50, [140, 159, 648, 375]],
            ],
        },
    },
    'cryptstalker-shoulders': {
        alliance: {
            parts: [
                ["alliance/cryptstalker-shoulders/static-shoulder_shoulder-cap.webp", "static-shoulder", "shoulder-cap", 50, [221, 162, 561, 334]],
            ],
        },
        horde: {
            parts: [
                ["horde/cryptstalker-shoulders/static-shoulder_shoulder-cap.webp", "static-shoulder", "shoulder-cap", 50, [167, 159, 640, 375]],
            ],
        },
    },
    'venom-etched-carapace': {
        alliance: {
            parts: [
                ["alliance/venom-etched-carapace/torso_torso.webp", "torso", "torso", 30, [313, 194, 506, 371]],
                ["alliance/venom-etched-carapace/right-upper_upper-overlay.webp", "right-upper", "upper-overlay", 30, [506, 242, 524, 331]],
            ],
        },
        horde: {
            parts: [
                ["horde/venom-etched-carapace/torso_torso.webp", "torso", "torso", 30, [329, 203, 546, 434]],
            ],
        },
    },
    'grimtotem-battle-harness': {
        alliance: {
            parts: [
                ["alliance/grimtotem-battle-harness/torso_torso.webp", "torso", "torso", 30, [313, 194, 506, 371]],
                ["alliance/grimtotem-battle-harness/right-upper_upper-overlay.webp", "right-upper", "upper-overlay", 30, [506, 242, 519, 331]],
            ],
        },
        horde: {
            parts: [
                ["horde/grimtotem-battle-harness/torso_torso.webp", "torso", "torso", 30, [329, 203, 546, 434]],
            ],
        },
    },
    'big-bad-pauldrons': {
        alliance: {
            parts: [
                ["alliance/big-bad-pauldrons/static-shoulder_shoulder-cap.webp", "static-shoulder", "shoulder-cap", 50, [197, 164, 581, 334]],
            ],
        },
        horde: {
            parts: [
                ["horde/big-bad-pauldrons/static-shoulder_shoulder-cap.webp", "static-shoulder", "shoulder-cap", 50, [139, 159, 663, 375]],
            ],
        },
    },
    'kolkar-bracers': {
        alliance: {
            parts: [
                ["alliance/kolkar-bracers/left-bracer.webp", "left-forearm", "bracer", 60, [247, 323, 361, 403]],
                ["alliance/kolkar-bracers/right-bracer.webp", "right-forearm", "bracer", 60, [530, 322, 636, 428]],
            ],
        },
        horde: {
            parts: [
                ["horde/kolkar-bracers/left-bracer.webp", "left-forearm", "bracer", 60, [253, 360, 371, 476]],
                ["horde/kolkar-bracers/right-bracer.webp", "right-forearm", "bracer", 60, [582, 363, 695, 474]],
            ],
        },
    },
    'gerenzos-mechanical-arm': {
        alliance: {
            parts: [
                ["alliance/gerenzos-mechanical-arm/left-glove.webp", "left-hand", "glove", 70, [323, 378, 362, 419]],
                ["alliance/gerenzos-mechanical-arm/right-glove.webp", "right-hand", "glove", 70, [608, 374, 646, 416]],
            ],
        },
        horde: {
            parts: [
                ["horde/gerenzos-mechanical-arm/left-glove.webp", "left-hand", "glove", 70, [339, 426, 376, 464]],
                ["horde/gerenzos-mechanical-arm/right-glove.webp", "right-hand", "glove", 70, [670, 429, 707, 467]],
            ],
        },
    },
    'starter-alliance-pajama-top': {
        alliance: {
            sleeves: { 'left-upper': ["alliance/starter-alliance-pajama-top/left-upper-sleeve.webp", [225, 218, 323, 354]], 'left-forearm': ["alliance/starter-alliance-pajama-top/left-forearm-sleeve.webp", [217, 291, 370, 438]], 'right-upper': ["alliance/starter-alliance-pajama-top/right-upper-sleeve.webp", [445, 227, 577, 371]], 'right-forearm': ["alliance/starter-alliance-pajama-top/right-forearm-sleeve.webp", [488, 306, 661, 426]] },
            parts: [
                ["alliance/starter-alliance-pajama-top/torso_torso.webp", "torso", "torso", 30, [310, 165, 506, 471]],
            ],
        },
        horde: {
            sleeves: { 'left-upper': ["horde/starter-alliance-pajama-top/left-upper-sleeve.webp", [216, 259, 319, 411]], 'left-forearm': ["horde/starter-alliance-pajama-top/left-forearm-sleeve.webp", [209, 342, 385, 493]], 'right-upper': ["horde/starter-alliance-pajama-top/right-upper-sleeve.webp", [507, 264, 637, 421]], 'right-forearm': ["horde/starter-alliance-pajama-top/right-forearm-sleeve.webp", [540, 355, 723, 481]] },
            parts: [
                ["horde/starter-alliance-pajama-top/torso_torso.webp", "torso", "torso", 30, [280, 166, 606, 479]],
            ],
        },
    },
    'starter-alliance-bracers': {
        alliance: {
            parts: [
                ["alliance/starter-alliance-bracers/left-bracer.webp", "left-forearm", "bracer", 60, [251, 325, 362, 402]],
                ["alliance/starter-alliance-bracers/right-bracer.webp", "right-forearm", "bracer", 60, [529, 326, 636, 425]],
            ],
        },
        horde: {
            parts: [
                ["horde/starter-alliance-bracers/left-bracer.webp", "left-forearm", "bracer", 60, [249, 362, 374, 481]],
                ["horde/starter-alliance-bracers/right-bracer.webp", "right-forearm", "bracer", 60, [576, 371, 712, 477]],
            ],
        },
    },
    'starter-alliance-grips': {
        alliance: {
            parts: [
                ["alliance/starter-alliance-grips/left-glove.webp", "left-hand", "glove", 70, [323, 384, 361, 412]],
                ["alliance/starter-alliance-grips/right-glove.webp", "right-hand", "glove", 70, [608, 373, 646, 417]],
            ],
        },
        horde: {
            parts: [
                ["horde/starter-alliance-grips/left-glove.webp", "left-hand", "glove", 70, [338, 425, 376, 466]],
                ["horde/starter-alliance-grips/right-glove.webp", "right-hand", "glove", 70, [670, 429, 707, 469]],
            ],
        },
    },
    'starter-horde-mantle': {
        alliance: {
            parts: [
                ["alliance/starter-horde-mantle/static-shoulder_shoulder-cap.webp", "static-shoulder", "shoulder-cap", 50, [197, 162, 566, 334]],
            ],
        },
        horde: {
            parts: [
                ["horde/starter-horde-mantle/static-shoulder_shoulder-cap.webp", "static-shoulder", "shoulder-cap", 50, [153, 159, 637, 375]],
            ],
        },
    },
    'starter-horde-leather-vest': {
        alliance: {
            parts: [
                ["alliance/starter-horde-leather-vest/torso_torso.webp", "torso", "torso", 30, [310, 167, 506, 454]],
                ["alliance/starter-horde-leather-vest/left-upper_upper-overlay.webp", "left-upper", "upper-overlay", 30, [267, 191, 310, 325]],
                ["alliance/starter-horde-leather-vest/right-upper_upper-overlay.webp", "right-upper", "upper-overlay", 30, [506, 223, 522, 357]],
                ["alliance/starter-horde-leather-vest/left-forearm_forearm-overlay.webp", "left-forearm", "forearm-overlay", 30, [293, 320, 310, 428]],
                ["alliance/starter-horde-leather-vest/right-forearm_forearm-overlay.webp", "right-forearm", "forearm-overlay", 30, [506, 407, 516, 434]],
            ],
        },
        horde: {
            parts: [
                ["horde/starter-horde-leather-vest/torso_torso.webp", "torso", "torso", 30, [319, 192, 550, 453]],
            ],
        },
    },
    'starter-horde-bracers': {
        alliance: {
            parts: [
                ["alliance/starter-horde-bracers/left-bracer.webp", "left-forearm", "bracer", 60, [249, 327, 360, 402]],
                ["alliance/starter-horde-bracers/right-bracer.webp", "right-forearm", "bracer", 60, [531, 325, 636, 425]],
            ],
        },
        horde: {
            parts: [
                ["horde/starter-horde-bracers/left-bracer.webp", "left-forearm", "bracer", 60, [250, 363, 374, 455]],
                ["horde/starter-horde-bracers/right-bracer.webp", "right-forearm", "bracer", 60, [579, 375, 698, 480]],
            ],
        },
    },
    'starter-horde-grips': {
        alliance: {
            parts: [
                ["alliance/starter-horde-grips/left-glove.webp", "left-hand", "glove", 70, [323, 379, 362, 417]],
                ["alliance/starter-horde-grips/right-glove.webp", "right-hand", "glove", 70, [609, 375, 646, 414]],
            ],
        },
        horde: {
            parts: [
                ["horde/starter-horde-grips/left-glove.webp", "left-hand", "glove", 70, [338, 429, 376, 462]],
                ["horde/starter-horde-grips/right-glove.webp", "right-hand", "glove", 70, [670, 432, 707, 465]],
            ],
        },
    },
};

export const meleeAliases = {"dragonstalker-helmet": "ds_helm", "dragonstalker-shoulders": "ds_shoulders", "dragonstalker-chest": "ds_chest", "dragonstalker-bracers": "ds_bracers", "dragonstalker-gloves": "ds_gloves", "dragonstalker-belt": "ds_belt", "dragonstalker-leggings": "ds_legs", "dragonstalker-boots": "ds_boots"};

export function meleeArtPath(file) {
    return `assets/player/combat/armor/${file}`;
}

export function meleeWeaponImage(id) {
    return `assets/player/combat/weapons/${id}.webp`;
}
