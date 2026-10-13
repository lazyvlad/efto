// The hunter's pet: one for each side. Every hunter has one; it sits beside him and now and
// then runs to fetch an item he would have missed (classes/Pet.js, "pet" in
// config/gameConfig.js).
//
// A pet is two pictures, both facing right: sitting, and at a flat-out run. The game flips
// them when the pet faces or runs left. Later pets, bought with coins, are added here.

const pets = {
    alliance: { id: 'nightsaber', name: 'Nightsaber' },
    horde: { id: 'prairie-wolf', name: 'Prairie Wolf' }
};

// The pet of a side, with the paths of its pictures ('alliance' until a side is chosen)
export function petFor(faction) {
    const pet = pets[faction] || pets.alliance;

    return {
        ...pet,
        sit: `assets/pets/${pet.id}-sit.webp`,
        run: `assets/pets/${pet.id}-run.webp`
    };
}
