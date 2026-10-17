// The spells and blows of the boss fights, painted (art-workbench/boss-animations/effects):
// seven sheets of 256px cells, four to a row, each row a four-frame effect shown a tenth of a
// second a frame. systems/bossEffects.js draws them; none of them hurts anyone or times anything.

export const BOSS_EFFECT_CELL = 256;
export const BOSS_EFFECT_MS = 100;

export const bossEffectSheets = {
    'arcane': 'assets/bosses/effects/arcane.webp',
    'fire-gravity': 'assets/bosses/effects/fire-gravity.webp',
    'frost': 'assets/bosses/effects/frost.webp',
    'physical': 'assets/bosses/effects/physical.webp',
    'status': 'assets/bosses/effects/status.webp',
    'vanish': 'assets/bosses/effects/vanish.webp',
    'venom-spirit': 'assets/bosses/effects/venom-spirit.webp',
};

// Each effect, "sheet:name", and its frames on the sheet
export const bossEffects = {
    'arcane:bolt': [0, 1, 2, 3],
    'arcane:curse': [4, 5, 6, 7],
    'arcane:hex': [8, 9, 10, 11],
    'arcane:shield-break': [12, 13, 14, 15],
    'fire-gravity:fire-bolt': [0, 1, 2, 3],
    'fire-gravity:fire-rain': [4, 5, 6, 7],
    'fire-gravity:fire-impact': [8, 9, 10, 11],
    'fire-gravity:upheaval': [12, 13, 14, 15],
    'frost:ice-flight': [0, 1, 2, 3],
    'frost:ice-impact': [4, 5, 6, 7],
    'frost:frost-vapour': [8, 9, 10, 11],
    'physical:stomp': [0, 1, 2, 3],
    'physical:claw': [4, 5, 6, 7],
    'physical:explosion': [8, 9, 10, 11],
    'physical:rock-impact': [12, 13, 14, 15],
    'status:shield': [0, 1, 2, 3],
    'status:enrage': [4, 5, 6, 7],
    'status:daze': [8, 9, 10, 11],
    'vanish:disappear': [0, 1, 2, 3],
    'vanish:reappear': [4, 5, 6, 7],
    'venom-spirit:venom-flight': [0, 1, 2, 3],
    'venom-spirit:spirit-flight': [4, 5, 6, 7],
    'venom-spirit:venom-impact': [8, 9, 10, 11],
};

// What a caster's bolts look like in flight and where they land, by boss. Thrown weapons and
// stones keep their own pictures. A curse, whoever casts it, is the violet curse.
export const bossCasts = {
    'sarkoth': { flight: 'venom-spirit:venom-flight', impact: 'venom-spirit:venom-impact' },
    'zalazane': { flight: 'venom-spirit:spirit-flight', impact: 'arcane:curse' },
    'taragaman': { flight: 'fire-gravity:fire-bolt', impact: 'fire-gravity:fire-impact' },
    'vile-priestess-hexx': { flight: 'arcane:bolt', impact: 'arcane:curse' },
};
export const CURSE_LOOK = { flight: 'arcane:curse', impact: 'arcane:curse' };

// What a storm does where it lands, by the storm's name (its falling painting is its own)
export const stormLooks = {
    'Rain of Fire': { impact: 'fire-gravity:fire-impact' },
    'Blizzard': { impact: 'frost:ice-impact', lingering: 'frost:frost-vapour' },
};

// What of its cell each effect is painted in, over its four frames: [left, top, right, bottom]
// as shares of the cell. An effect drawn to fit (systems/bossEffects.js drawEffect "fit") is
// sized and centred by this, not by its cell: the shield rings the whole boss.
export const bossEffectBounds = {
    'arcane:bolt': [0.395, 0.457, 0.625, 0.805],
    'arcane:curse': [0.297, 0.406, 0.707, 0.793],
    'arcane:hex': [0.281, 0.383, 0.719, 0.707],
    'arcane:shield-break': [0.289, 0.266, 0.719, 0.660],
    'fire-gravity:fire-bolt': [0.375, 0.383, 0.652, 0.766],
    'fire-gravity:fire-rain': [0.402, 0.293, 0.594, 0.754],
    'fire-gravity:fire-impact': [0.297, 0.320, 0.719, 0.684],
    'fire-gravity:upheaval': [0.312, 0.281, 0.703, 0.645],
    'frost:ice-flight': [0.371, 0.398, 0.660, 0.875],
    'frost:ice-impact': [0.250, 0.379, 0.754, 0.785],
    'frost:frost-vapour': [0.277, 0.273, 0.746, 0.688],
    'physical:stomp': [0.207, 0.449, 0.781, 0.824],
    'physical:claw': [0.270, 0.359, 0.750, 0.797],
    'physical:explosion': [0.258, 0.324, 0.746, 0.719],
    'physical:rock-impact': [0.277, 0.273, 0.742, 0.641],
    'status:shield': [0.332, 0.430, 0.730, 0.777],
    'status:enrage': [0.309, 0.367, 0.766, 0.688],
    'status:daze': [0.375, 0.305, 0.719, 0.633],
    'vanish:disappear': [0.352, 0.379, 0.684, 0.738],
    'vanish:reappear': [0.332, 0.316, 0.664, 0.691],
    'venom-spirit:venom-flight': [0.406, 0.426, 0.586, 0.820],
    'venom-spirit:spirit-flight': [0.395, 0.340, 0.613, 0.766],
    'venom-spirit:venom-impact': [0.281, 0.293, 0.691, 0.680],
};
