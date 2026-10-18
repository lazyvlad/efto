// The pet's button on the spell bar: the pet (sitting, or at a run when aggressive), its key,
// and under it how it fights, Defensive in blue or Aggressive in red. Pressed, tapped, or its
// key, it switches (game-modular.js); whenever it has switched, from here or from the
// character sheet or Settings, the button lights in its new colour and says so beside it.
// The INPUT Screens canvas, "Your pet's mode in a game".

let shown = null;       // { stance, picture } last drawn, to touch the page only on a change
let fading = null;      // The timer that puts out the light of a switch

const element = id => document.getElementById(id);

/**
 * Draw the button for the pet of a kind (data/pets.js petFor) and its stance.
 * @param {{name, sit, run}|null} kind
 * @param {'defensive'|'aggressive'} stance
 */
export function refreshPetSlot(kind, stance) {
    const slot = element('spell-pet');
    if (!slot || !kind) return;
    const aggressive = stance === 'aggressive';
    const picture = aggressive ? kind.run : kind.sit;
    if (shown && shown.stance === stance && shown.picture === picture) return;

    const image = element('spell-pet-image');
    if (image.getAttribute('src') !== picture) image.src = picture;
    image.alt = kind.name;
    const mode = element('spell-pet-mode');
    mode.textContent = aggressive ? 'Aggressive' : 'Defensive';
    slot.classList.toggle('is-aggressive', aggressive);
    slot.title = `${kind.name}: ${aggressive ? 'aggressive, it goes for the creatures first' : 'defensive, it stays by him'}. Press to switch.`;

    // A switch (not the first drawing): light up, and say it beside the button
    if (shown && shown.stance !== stance) {
        element('spell-pet-toast').textContent = `${kind.name}: ${aggressive ? 'aggressive' : 'defensive'}`;
        slot.classList.remove('is-switched');
        void slot.offsetWidth;  // start the light again if it was still on
        slot.classList.add('is-switched');
        clearTimeout(fading);
        fading = setTimeout(() => slot.classList.remove('is-switched'), 2000);
    }
    shown = { stance, picture };
}
