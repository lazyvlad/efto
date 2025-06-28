import { gameConfig } from '../config/gameConfig.js';
import { assetRegistry } from './assetRegistry.js';

// Game items database with structured data
export const gameItems = [
    // Regular items
    { id: "ring1", name: "Ring 1", image: assetRegistry.items.ring1, value: 2, collected: 0, type: "regular", baseProbability: gameConfig.itemProbabilities.regular, sound: "", size_multiplier: 0.8 },
    { id: "ring2", name: "Ring2", image: assetRegistry.items.ring2, value: 2, collected: 0, type: "regular", baseProbability: gameConfig.itemProbabilities.regular, sound: "", size_multiplier: 0.8 },
    { id: "arcane-crystal", name: "Arcane Crystal", image: assetRegistry.items.ring3, value: 4, collected: 0, type: "regular", baseProbability: gameConfig.itemProbabilities.regular, sound: assetRegistry.audio.voice, size_multiplier: 0.8 },
    
    { id: "miners-cape", name: "Miners Cape", image: assetRegistry.items.minersCape, value: 1, collected: 0, type: "regular", baseProbability: gameConfig.itemProbabilities.regular, sound: "", size_multiplier: 0.8 },
    { id: "walking-stick", name: "Walking Stick", image: assetRegistry.items.walkingStick, value: 1, collected: 0, type: "regular", baseProbability: gameConfig.itemProbabilities.regular, sound: "", size_multiplier: 0.8 },
    
    { id: "gold", name: "Gold", image: assetRegistry.items.gold, value: 4, collected: 0, type: "regular", baseProbability: gameConfig.itemProbabilities.regular, sound: "", size_multiplier: 0.6 },
    { id: "wolf-master", name: "Wolfmaster Cape", image: assetRegistry.items.wolfmasterCape, value: 2, collected: 0, type: "regular", baseProbability: gameConfig.itemProbabilities.regular, sound: "", size_multiplier: 0.7 },
    
    // WebP regular items
    { id: "cape21", name: "Woven Cape", image: assetRegistry.items.cape21, value: 2, collected: 0, type: "regular", baseProbability: gameConfig.itemProbabilities.regular, sound: "", size_multiplier: 0.9 },
    { id: "cape05", name: "Traveler's Cape", image: assetRegistry.items.cape05, value: 2, collected: 0, type: "regular", baseProbability: gameConfig.itemProbabilities.regular, sound: "", size_multiplier: 0.9 },
    { id: "fork-knife", name: "Fork & Knife", image: assetRegistry.items.forkKnife, value: 1, collected: 0, type: "regular", baseProbability: gameConfig.itemProbabilities.regular, sound: "", size_multiplier: 0.7 },
    { id: "sapphire-gem", name: "Sapphire Gem", image: assetRegistry.items.sapphireGem, value: 3, collected: 0, type: "regular", baseProbability: gameConfig.itemProbabilities.regular, sound: "", size_multiplier: 0.6 },
    { id: "pearl-gem", name: "Pearl Gem", image: assetRegistry.items.pearlGem, value: 3, collected: 0, type: "regular", baseProbability: gameConfig.itemProbabilities.regular, sound: "", size_multiplier: 0.6 },
    { id: "hard-cheese", name: "Hard Cheese", image: assetRegistry.items.hardCheese, value: 2, collected: 0, type: "regular", baseProbability: gameConfig.itemProbabilities.regular, sound: "", size_multiplier: 0.8 },
    { id: "bread", name: "Bread", image: assetRegistry.items.food09, value: 1, collected: 0, type: "regular", baseProbability: gameConfig.itemProbabilities.regular, sound: "", size_multiplier: 0.8 },
    { id: "fish", name: "Fresh Fish", image: assetRegistry.items.fish31, value: 2, collected: 0, type: "regular", baseProbability: gameConfig.itemProbabilities.regular, sound: "", size_multiplier: 0.9 },
    
    
    { id: "swiss-army", name: "Swiss Army Knife", image: assetRegistry.items.swissArmy, value: 4, collected: 0, type: "green", baseProbability: gameConfig.itemProbabilities.green, sound: "", size_multiplier: 1 },
    { id: "gizmos", name: "Engineering Gizmos", image: assetRegistry.items.gizmos29, value: 3, collected: 0, type: "green", baseProbability: gameConfig.itemProbabilities.green, sound: "", size_multiplier: 1 },
    
    
    { id: "copper-coin", name: "Copper Coin", image: assetRegistry.items.coin04, value: 1, collected: 0, type: "green", baseProbability: gameConfig.itemProbabilities.green, sound: "", size_multiplier: 0.8 },
    { id: "gold-coin", name: "Gold Coin", image: assetRegistry.items.coin10, value: 3, collected: 0, type: "green", baseProbability: gameConfig.itemProbabilities.green, sound: "", size_multiplier: 0.8 },
    { id: "silver-coin", name: "Silver Coin", image: assetRegistry.items.coin02, value: 2, collected: 0, type: "green", baseProbability: gameConfig.itemProbabilities.green, sound: "", size_multiplier: 0.8 },
    { id: "bronze-coin", name: "Bronze Coin", image: assetRegistry.items.coin01, value: 1, collected: 0, type: "green", baseProbability: gameConfig.itemProbabilities.green, sound: "", size_multiplier: 0.8 },
    
    // Tier set items
    { id: "ashjrethul", name: "Ashjre'thul, Crossbow of Smiting", image: assetRegistry.items.item4, value: 6, collected: 0, missed: 0, type: "tier_set", baseProbability: gameConfig.itemProbabilities.tier_set, sound: assetRegistry.audio.disenchant, setPosition: 9, size_multiplier: 2 },
    
    { id: "black-lotuses", name: "Stack of Black Lotus", image: assetRegistry.buffs.blackLotuses, value: 10, collected: 0, type: "epic", baseProbability: gameConfig.itemProbabilities.epic, sound: assetRegistry.audio.voice, size_multiplier: 1.5 },
    
    { id: "maladath", name: "Maladath", image: assetRegistry.items.maladath, value: 6, collected: 0, type: "epic", baseProbability: gameConfig.itemProbabilities.epic, sound: "", size_multiplier: 2.5 },
    { id: "ashkandi2", name: "Ashkandi, Greatsword of the Brotherhood", image: assetRegistry.items.ashkandi, value: 6, collected: 0, missed: 0, type: "tier_set", baseProbability: gameConfig.itemProbabilities.tier_set, sound: "", setPosition: 10, size_multiplier: 2 },
    { id: "quick-strike-ring", name: "Quick Strike Ring", image: assetRegistry.items.quickStrikeRing, value: 5, collected: 0, type: "epic", baseProbability: gameConfig.itemProbabilities.epic, sound: "", size_multiplier: 0.8 },
    { id: "brutality_blade", name: "Brutality Blade", image: assetRegistry.items.brutalityBlade, value: 5, collected: 0, type: "epic", baseProbability: gameConfig.itemProbabilities.epic, sound: assetRegistry.audio.disenchant, size_multiplier: 1.2 },
    { id: "dalrends", name: "Dal Rends", image: assetRegistry.items.dalrends, value: 5, collected: 0, type: "epic", baseProbability: gameConfig.itemProbabilities.epic, sound: "", size_multiplier: 1.2 },
    { id: "crulshorukh", name: "Crulshorukh", image: assetRegistry.items.item6, value: 7, collected: 0, type: "special", baseProbability: gameConfig.itemProbabilities.special, sound: "", size_multiplier: 1.6 },
    { id: "drakefangtalisman", name: "Drake Fang Talisman", image: assetRegistry.items.dft, value: 4, collected: 0, type: "special", baseProbability: gameConfig.itemProbabilities.special, sound: assetRegistry.audio.dft, size_multiplier: 1.2 },
    
    { id: "onslaught", name: "Onslaught", image: assetRegistry.items.onslaught, value: 4, collected: 0, type: "special", baseProbability: gameConfig.itemProbabilities.special, sound: "", size_multiplier: 1},
    { id: "circle-of-applied-force", name: "Circle of Applied", image: assetRegistry.items.circleOfAppliedForce, value: 4, collected: 0, type: "special", baseProbability: gameConfig.itemProbabilities.special, sound: "", size_multiplier: 1},
    
    // Legendary items
    { id: "ThunderFury", name: "Thunder Fury", image: assetRegistry.items.tunder, value: 5, collected: 0, type: "legendary", baseProbability: gameConfig.itemProbabilities.legendary, sound: "", size_multiplier: 2.8 },
    { id: "zee", name: "Zee Zgnan Tigar", image: assetRegistry.items.zee, value: 15, collected: 0, spawned: 0, type: "zee_zgnan", baseProbability: gameConfig.itemProbabilities.zee_zgnan, sound: "", size_multiplier: 1.6 },
    
    // Dragonstalker set items - these are the win condition
    { id: "ds_helm", name: "Dragonstalker's Helm", image: assetRegistry.items.dsHelm, value: 6, collected: 0, missed: 0, type: "tier_set", baseProbability: gameConfig.itemProbabilities.tier_set, sound: "", setPosition: 1, size_multiplier: 1 },
    { id: "ds_shoulders", name: "Dragonstalker's Spaulders", image: assetRegistry.items.dsShoulders, value: 6, collected: 0, missed: 0, type: "tier_set", baseProbability: gameConfig.itemProbabilities.tier_set, sound: "", setPosition: 2, size_multiplier: 1 },
    { id: "ds_chest", name: "Dragonstalker's Breastplate", image: assetRegistry.items.dsChest, value: 6, collected: 0, missed: 0, type: "tier_set", baseProbability: gameConfig.itemProbabilities.tier_set, sound: "", setPosition: 3, size_multiplier: 1 },
    { id: "ds_bracers", name: "Dragonstalker's Bracers", image: assetRegistry.items.dsBracers, value: 6, collected: 0, missed: 0, type: "tier_set", baseProbability: gameConfig.itemProbabilities.tier_set, sound: "", setPosition: 4, size_multiplier: 1 },
    { id: "ds_gloves", name: "Dragonstalker's Gauntlets", image: assetRegistry.items.dsHands, value: 6, collected: 0, missed: 0, type: "tier_set", baseProbability: gameConfig.itemProbabilities.tier_set, sound: "", setPosition: 5, size_multiplier: 1 },
    { id: "ds_belt", name: "Dragonstalker's Belt", image: assetRegistry.items.dsBelt, value: 6, collected: 0, missed: 0, type: "tier_set", baseProbability: gameConfig.itemProbabilities.tier_set, sound: "", setPosition: 6, size_multiplier: 1 },
    { id: "ds_legs", name: "Dragonstalker's Legguards", image: assetRegistry.items.dsLegs, value: 6, collected: 0, missed: 0, type: "tier_set", baseProbability: gameConfig.itemProbabilities.tier_set, sound: "", setPosition: 7, size_multiplier: 1 },
    { id: "ds_boots", name: "Dragonstalker's Greaves", image: assetRegistry.items.dsBoots, value: 6, collected: 0, missed: 0, type: "tier_set", baseProbability: gameConfig.itemProbabilities.tier_set, sound: "", setPosition: 8, size_multiplier: 1 }
]; 