import { gameConfig } from '../config/gameConfig.js';

// Items database with structured data
export const gameItems = [
    { id: "ring1", name: "Ring 1", image: "items/ring1.png", value: 2, collected: 0, type: "regular", baseProbability: gameConfig.itemProbabilities.regular, sound: "", size_multiplier: 0.8 },
    { id: "ring2", name: "Ring2", image: "items/ring2.png", value: 2, collected: 0, type: "regular", baseProbability: gameConfig.itemProbabilities.regular, sound: "", size_multiplier: 0.8 },
    { id: "arcane-crystal", name: "Arcane Crystal", image: "items/ring3.png", value: 2, collected: 0, type: "regular", baseProbability: gameConfig.itemProbabilities.regular, sound: "", size_multiplier: 0.8 },

    { id: "miners-cape", name: "Miners Cape", image: "items/miners-cape.png", value: 1, collected: 0, type: "regular", baseProbability: gameConfig.itemProbabilities.regular, sound: "", size_multiplier: 0.8 },
    { id: "walking-stick", name: "Walking Stick", image: "items/walking-stick.png", value: 1, collected: 0, type: "regular", baseProbability: gameConfig.itemProbabilities.regular, sound: "", size_multiplier: 0.8 },
    
    { id: "gold", name: "Gold", image: "items/gold.png", value: 4, collected: 0, type: "regular", baseProbability: gameConfig.itemProbabilities.regular, sound: "", size_multiplier: 1 },
    { id: "wolf-master", name: "Wolfmaster Cape", image: "items/wolfmaster-cape.png", value: 2, collected: 0, type: "regular", baseProbability: gameConfig.itemProbabilities.regular, sound: "", size_multiplier: 1 },


    { id: "ashjrethul", name: "Ashjrethul", image: "items/4.png", value: 6, collected: 0, type: "epic", baseProbability: gameConfig.itemProbabilities.epic, sound: "assets/disenchant.mp3", size_multiplier: 2 },
    
    { id: "black-lotuses", name: "Stack of Black Lotus", image: "assets/black-lotuses.png", value: 10, collected: 0, type: "epic", baseProbability: gameConfig.itemProbabilities.epic, sound: "", size_multiplier: 1.5 },
    
    { id: "maladath", name: "Maladath", image: "items/maladath.png", value: 6, collected: 0, type: "epic", baseProbability: gameConfig.itemProbabilities.epic, sound: "", size_multiplier: 2.5 },
    { id: "ashkandi2", name: "Ashkandi, Greatsword of the Brotherhood ", image: "items/ashkandi.png", value: 6, collected: 0, type: "epic", baseProbability: gameConfig.itemProbabilities.epic, sound: "", size_multiplier: 1 },
    { id: "quick-strike-ring", name: "Quick Strike Ring", image: "items/quick-strike-ring.png", value: 5, collected: 0, type: "epic", baseProbability: gameConfig.itemProbabilities.epic, sound: "", size_multiplier: 0.8 },
    { id: "brutality_blade", name: "Brutality Blade", image: "items/3.png", value: 5, collected: 0, type: "epic", baseProbability: gameConfig.itemProbabilities.epic, sound: "assets/disenchant.mp3", size_multiplier: 1.8 },
    { id: "dalrends", name: "Dal Rends", image: "items/dalrends.png", value: 5, collected: 0, type: "epic", baseProbability: gameConfig.itemProbabilities.epic, sound: "", size_multiplier: 1.8 },  
    { id: "crulshorukh", name: "Crulshorukh", image: "items/6.png", value: 7, collected: 0, type: "special", baseProbability: gameConfig.itemProbabilities.special, sound: "", size_multiplier: 2.4 },
    { id: "drakefangtalisman", name: "Drake Fang Talisman", image: "items/dft.png", value: 4, collected: 0, type: "special", baseProbability: gameConfig.itemProbabilities.special, sound: "assets/dft.mp3", size_multiplier: 1.2 },

    { id: "onslaught", name: "Onslaught", image: "items/onslaught.png", value: 4, collected: 0, type: "special", baseProbability: gameConfig.itemProbabilities.special, sound: "", size_multiplier: 1},
    { id: "circle-of-applied-force", name: "Circle of Applied", image: "items/circle-of-applied-force.png", value: 4, collected: 0, type: "special", baseProbability: gameConfig.itemProbabilities.special, sound: "", size_multiplier: 1},


    { id: "ThunderFury", name: "Thunder Fury", image: "items/tunder.png", value: 5, collected: 0, type: "legendary", baseProbability: gameConfig.itemProbabilities.legendary, sound: "", size_multiplier: 2.8 },
    { id: "zee", name: "Zee Zgnan Tigar", image: "items/zee.png", value: 15, collected: 0, spawned: 0, type: "zee_zgnan", baseProbability: gameConfig.itemProbabilities.zee_zgnan, sound: "", size_multiplier: 2.0 },
    
    // TIER SET ITEMS - Collect all 8 to win the game! (One chance only - missing any piece makes victory impossible)
    { id: "ds_helm", name: "Dragonstalker's Helm", image: "items/dshelm.png", value: 6, collected: 0, missed: 0, type: "tier_set", baseProbability: gameConfig.itemProbabilities.tier_set, sound: "", setPosition: 1, size_multiplier: 1 },
    { id: "ds_shoulders", name: "Dragonstalker's Spaulders", image: "items/dsshoulders.png", value: 6, collected: 0, missed: 0, type: "tier_set", baseProbability: gameConfig.itemProbabilities.tier_set, sound: "", setPosition: 2, size_multiplier: 1 },
    { id: "ds_chest", name: "Dragonstalker's Breastplate", image: "items/dschest.png", value: 6, collected: 0, missed: 0, type: "tier_set", baseProbability: gameConfig.itemProbabilities.tier_set, sound: "", setPosition: 3, size_multiplier: 1 },
    { id: "ds_bracers", name: "Dragonstalker's Bracers", image: "items/dsbracers.png", value: 6, collected: 0, missed: 0, type: "tier_set", baseProbability: gameConfig.itemProbabilities.tier_set, sound: "", setPosition: 4, size_multiplier: 1 },
    { id: "ds_gloves", name: "Dragonstalker's Gauntlets", image: "items/dshands.png", value: 6, collected: 0, missed: 0, type: "tier_set", baseProbability: gameConfig.itemProbabilities.tier_set, sound: "", setPosition: 5, size_multiplier: 1 },
    { id: "ds_belt", name: "Dragonstalker's Belt", image: "items/dsbelt.png", value: 6, collected: 0, missed: 0, type: "tier_set", baseProbability: gameConfig.itemProbabilities.tier_set, sound: "", setPosition: 6, size_multiplier: 1 },
    { id: "ds_legs", name: "Dragonstalker's Legguards", image: "items/dslegs.png", value: 6, collected: 0, missed: 0, type: "tier_set", baseProbability: gameConfig.itemProbabilities.tier_set, sound: "", setPosition: 7, size_multiplier: 1 },
    { id: "ds_boots", name: "Dragonstalker's Greaves", image: "items/dsboots.png", value: 6, collected: 0, missed: 0, type: "tier_set", baseProbability: gameConfig.itemProbabilities.tier_set, sound: "", setPosition: 8, size_multiplier: 1 }
]; 