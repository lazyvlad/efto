import { gameConfig } from '../config/gameConfig.js';
import { assetRegistry } from './assetRegistry.js';

// Game items database with structured data
export const gameItems = [
    // Regular items
    { id: "ring1", name: "Ring 1", image: assetRegistry.items.ring1, value: 2, collected: 0, type: "regular", baseProbability: gameConfig.itemProbabilities.regular, sound: "" },
    { id: "ring2", name: "Ring2", image: assetRegistry.items.ring2, value: 2, collected: 0, type: "regular", baseProbability: gameConfig.itemProbabilities.regular, sound: "" },
    { id: "arcane-crystal", name: "Arcane Crystal", image: assetRegistry.items.ring3, value: 4, collected: 0, type: "regular", baseProbability: gameConfig.itemProbabilities.regular, sound: assetRegistry.audio.voice },
    
    { id: "miners-cape", name: "Miners Cape", image: assetRegistry.items.minersCape, value: 1, collected: 0, type: "regular", baseProbability: gameConfig.itemProbabilities.regular, sound: "" },
    { id: "walking-stick", name: "Walking Stick", image: assetRegistry.items.walkingStick, value: 1, collected: 0, type: "regular", baseProbability: gameConfig.itemProbabilities.regular, sound: "" },
    
    { id: "gold", name: "Gold", image: assetRegistry.items.gold, value: 4, collected: 0, type: "regular", baseProbability: gameConfig.itemProbabilities.regular, sound: "" },
    { id: "wolf-master", name: "Wolfmaster Cape", image: assetRegistry.items.wolfmasterCape, value: 2, collected: 0, type: "regular", baseProbability: gameConfig.itemProbabilities.regular, sound: "" },
    
    // WebP regular items
    { id: "cape21", name: "Woven Cape", image: assetRegistry.items.cape21, value: 2, collected: 0, type: "regular", baseProbability: gameConfig.itemProbabilities.regular, sound: "" },
    { id: "cape05", name: "Traveler's Cape", image: assetRegistry.items.cape05, value: 2, collected: 0, type: "regular", baseProbability: gameConfig.itemProbabilities.regular, sound: "" },
    { id: "fork-knife", name: "Fork & Knife", image: assetRegistry.items.forkKnife, value: 1, collected: 0, type: "regular", baseProbability: gameConfig.itemProbabilities.regular, sound: "" },
    { id: "sapphire-gem", name: "Sapphire Gem", image: assetRegistry.items.sapphireGem, value: 3, collected: 0, type: "regular", baseProbability: gameConfig.itemProbabilities.regular, sound: "" },
    { id: "pearl-gem", name: "Pearl Gem", image: assetRegistry.items.pearlGem, value: 3, collected: 0, type: "regular", baseProbability: gameConfig.itemProbabilities.regular, sound: "" },
    { id: "hard-cheese", name: "Hard Cheese", image: assetRegistry.items.hardCheese, value: 2, collected: 0, type: "regular", baseProbability: gameConfig.itemProbabilities.regular, sound: "" },
    { id: "bread", name: "Bread", image: assetRegistry.items.food09, value: 1, collected: 0, type: "regular", baseProbability: gameConfig.itemProbabilities.regular, sound: "" },
    // Crafting materials
    { id: "light-feather", name: "Light Feather", image: assetRegistry.items.lightFeather, value: 1, collected: 0, type: "regular", baseProbability: gameConfig.itemProbabilities.regular, sound: "" },
    { id: "rugged-leather", name: "Rugged Leather", image: assetRegistry.items.ruggedLeather, value: 2, collected: 0, type: "regular", baseProbability: gameConfig.itemProbabilities.regular, sound: "" },
    { id: "kingsblood", name: "Kingsblood", image: assetRegistry.items.kingsblood, value: 2, collected: 0, type: "regular", baseProbability: gameConfig.itemProbabilities.regular, sound: "" },
    { id: "fadeleaf", name: "Fadeleaf", image: assetRegistry.items.fadeleaf, value: 3, collected: 0, type: "regular", baseProbability: gameConfig.itemProbabilities.regular, sound: "" },
    { id: "runecloth", name: "Runecloth", image: assetRegistry.items.runecloth, value: 3, collected: 0, type: "regular", baseProbability: gameConfig.itemProbabilities.regular, sound: "" },
    { id: "fish", name: "Fresh Fish", image: assetRegistry.items.fish31, value: 2, collected: 0, type: "regular", baseProbability: gameConfig.itemProbabilities.regular, sound: "" },
    
    
    { id: "swiss-army", name: "Swiss Army Knife", image: assetRegistry.items.swissArmy, value: 4, collected: 0, type: "green", baseProbability: gameConfig.itemProbabilities.green, sound: "" },
    { id: "gizmos", name: "Engineering Gizmos", image: assetRegistry.items.gizmos29, value: 3, collected: 0, type: "green", baseProbability: gameConfig.itemProbabilities.green, sound: "" },
    
    
    { id: "copper-coin", name: "Copper Coin", image: assetRegistry.items.coin04, value: 1, collected: 0, type: "green", baseProbability: gameConfig.itemProbabilities.green, sound: "" },
    { id: "gold-coin", name: "Gold Coin", image: assetRegistry.items.coin10, value: 3, collected: 0, type: "green", baseProbability: gameConfig.itemProbabilities.green, sound: "" },
    { id: "silver-coin", name: "Silver Coin", image: assetRegistry.items.coin02, value: 2, collected: 0, type: "green", baseProbability: gameConfig.itemProbabilities.green, sound: "" },
    { id: "bronze-coin", name: "Bronze Coin", image: assetRegistry.items.coin01, value: 1, collected: 0, type: "green", baseProbability: gameConfig.itemProbabilities.green, sound: "" },
    
    // Rarer materials and reagents
    { id: "mithril-bar", name: "Mithril Bar", image: assetRegistry.items.mithrilBar, value: 3, collected: 0, type: "green", baseProbability: gameConfig.itemProbabilities.green, sound: "" },
    { id: "thorium-bar", name: "Thorium Bar", image: assetRegistry.items.thoriumBar, value: 4, collected: 0, type: "green", baseProbability: gameConfig.itemProbabilities.green, sound: "" },
    { id: "essence-of-water", name: "Essence of Water", image: assetRegistry.items.essenceOfWater, value: 4, collected: 0, type: "green", baseProbability: gameConfig.itemProbabilities.green, sound: "" },
    { id: "dark-rune", name: "Dark Rune", image: assetRegistry.items.darkRune, value: 4, collected: 0, type: "green", baseProbability: gameConfig.itemProbabilities.green, sound: "" },
    { id: "righteous-orb", name: "Righteous Orb", image: assetRegistry.items.righteousOrb, value: 4, collected: 0, type: "green", baseProbability: gameConfig.itemProbabilities.green, sound: "" },
    // Raid reagents
    { id: "fiery-core", name: "Fiery Core", image: assetRegistry.items.fieryCore, value: 6, collected: 0, type: "epic", baseProbability: gameConfig.itemProbabilities.epic, sound: "" },
    { id: "lava-core", name: "Lava Core", image: assetRegistry.items.lavaCore, value: 6, collected: 0, type: "epic", baseProbability: gameConfig.itemProbabilities.epic, sound: "" },
    
    // The hunter's weapons (once part of the Dragonstalker goal, now epics of their own)
    { id: "ashjrethul", name: "Ashjre'thul, Crossbow of Smiting", image: assetRegistry.items.item4, value: 6, collected: 0, type: "epic", baseProbability: gameConfig.itemProbabilities.epic, sound: assetRegistry.audio.disenchant,
      crit_rating_bonus: 0.02, dodge_rating_bonus: 0, effect_type: "permanent" },
    
    { id: "black-lotuses", name: "Stack of Black Lotus", image: assetRegistry.buffs.blackLotuses, value: 10, collected: 0, type: "epic", baseProbability: gameConfig.itemProbabilities.epic, sound: assetRegistry.audio.voice,
      crit_rating_bonus: 0.05, dodge_rating_bonus: 0, effect_type: "temporary", effect_duration: 3600 }, // 60 seconds
    
    { id: "maladath", name: "Maladath", image: assetRegistry.items.maladath, value: 6, collected: 0, type: "epic", baseProbability: gameConfig.itemProbabilities.epic, sound: "",
      crit_rating_bonus: 0, dodge_rating_bonus: 0.02, effect_type: "permanent" },
    { id: "ashkandi2", name: "Ashkandi, Greatsword of the Brotherhood", image: assetRegistry.items.ashkandi, value: 6, collected: 0, type: "epic", baseProbability: gameConfig.itemProbabilities.epic, sound: "" },
    { id: "quick-strike-ring", name: "Quick Strike Ring", image: assetRegistry.items.quickStrikeRing, value: 5, collected: 0, type: "epic", baseProbability: gameConfig.itemProbabilities.epic, sound: "",
      crit_rating_bonus: 0.03, dodge_rating_bonus: 0.02, effect_type: "temporary", effect_duration: 1800 }, // 30 seconds at 60fps
    { id: "brutality_blade", name: "Brutality Blade", image: assetRegistry.items.brutalityBlade, value: 5, collected: 0, type: "epic", baseProbability: gameConfig.itemProbabilities.epic, sound: assetRegistry.audio.disenchant,
      crit_rating_bonus: 0.02, dodge_rating_bonus: 0, effect_type: "permanent" },
    { id: "dalrends", name: "Dal Rends", image: assetRegistry.items.dalrends, value: 5, collected: 0, type: "epic", baseProbability: gameConfig.itemProbabilities.epic, sound: "" },
    { id: "crulshorukh", name: "Crulshorukh", image: assetRegistry.items.item6, value: 7, collected: 0, type: "special", baseProbability: gameConfig.itemProbabilities.special, sound: "" },
    { id: "drakefangtalisman", name: "Drake Fang Talisman", image: assetRegistry.items.dft, value: 4, collected: 0, type: "special", baseProbability: gameConfig.itemProbabilities.special, sound: assetRegistry.audio.dft },
    
    { id: "onslaught", name: "Onslaught", image: assetRegistry.items.onslaught, value: 4, collected: 0, type: "special", baseProbability: gameConfig.itemProbabilities.special, sound: "",
      crit_rating_bonus: 0.05, dodge_rating_bonus: 0, effect_type: "temporary", effect_duration: 1800 }, // 30 seconds at 60fps
    { id: "circle-of-applied-force", name: "Circle of Applied", image: assetRegistry.items.circleOfAppliedForce, value: 4, collected: 0, type: "special", baseProbability: gameConfig.itemProbabilities.special, sound: "",
      crit_rating_bonus: 0.01, dodge_rating_bonus: 0.03, effect_type: "permanent" }, // Permanent dodge bonus
    
    // Giantstalker Armor (tier 1): collectable pieces of a set ("set" names it, "slot" where
    // it is worn). Sets are collected over many games and kept on the account; which levels
    // each set drops in and what wearing it gives is under "sets" in config/gameConfig.js.
    { id: "giantstalker-helmet", name: "Giantstalker's Helmet", image: assetRegistry.items.giantstalkerHelmet, value: 6, collected: 0, type: "set_piece", set: "giantstalker", slot: "head", baseProbability: gameConfig.itemProbabilities.set_piece, sound: "" },
    { id: "giantstalker-shoulders", name: "Giantstalker's Epaulets", image: assetRegistry.items.giantstalkerShoulders, value: 6, collected: 0, type: "set_piece", set: "giantstalker", slot: "shoulders", baseProbability: gameConfig.itemProbabilities.set_piece, sound: "" },
    { id: "giantstalker-chest", name: "Giantstalker's Breastplate", image: assetRegistry.items.giantstalkerChest, value: 6, collected: 0, type: "set_piece", set: "giantstalker", slot: "chest", baseProbability: gameConfig.itemProbabilities.set_piece, sound: "" },
    { id: "giantstalker-bracers", name: "Giantstalker's Bracers", image: assetRegistry.items.giantstalkerBracers, value: 6, collected: 0, type: "set_piece", set: "giantstalker", slot: "bracers", baseProbability: gameConfig.itemProbabilities.set_piece, sound: "" },
    { id: "giantstalker-gloves", name: "Giantstalker's Gloves", image: assetRegistry.items.giantstalkerGloves, value: 6, collected: 0, type: "set_piece", set: "giantstalker", slot: "hands", baseProbability: gameConfig.itemProbabilities.set_piece, sound: "" },
    { id: "giantstalker-belt", name: "Giantstalker's Belt", image: assetRegistry.items.giantstalkerBelt, value: 6, collected: 0, type: "set_piece", set: "giantstalker", slot: "belt", baseProbability: gameConfig.itemProbabilities.set_piece, sound: "" },
    { id: "giantstalker-leggings", name: "Giantstalker's Leggings", image: assetRegistry.items.giantstalkerLeggings, value: 6, collected: 0, type: "set_piece", set: "giantstalker", slot: "legs", baseProbability: gameConfig.itemProbabilities.set_piece, sound: "" },
    { id: "giantstalker-boots", name: "Giantstalker's Boots", image: assetRegistry.items.giantstalkerBoots, value: 6, collected: 0, type: "set_piece", set: "giantstalker", slot: "boots", baseProbability: gameConfig.itemProbabilities.set_piece, sound: "" },
    // Cryptstalker Armor (tier 3): collectable pieces of a set ("set" names it)
    { id: "cryptstalker-helmet", name: "Cryptstalker Headpiece", image: assetRegistry.items.cryptstalkerHelmet, value: 6, collected: 0, type: "set_piece", set: "cryptstalker", slot: "head", baseProbability: gameConfig.itemProbabilities.set_piece, sound: "" },
    { id: "cryptstalker-shoulders", name: "Cryptstalker Spaulders", image: assetRegistry.items.cryptstalkerShoulders, value: 6, collected: 0, type: "set_piece", set: "cryptstalker", slot: "shoulders", baseProbability: gameConfig.itemProbabilities.set_piece, sound: "" },
    { id: "cryptstalker-chest", name: "Cryptstalker Tunic", image: assetRegistry.items.cryptstalkerChest, value: 6, collected: 0, type: "set_piece", set: "cryptstalker", slot: "chest", baseProbability: gameConfig.itemProbabilities.set_piece, sound: "" },
    { id: "cryptstalker-bracers", name: "Cryptstalker Wristguards", image: assetRegistry.items.cryptstalkerBracers, value: 6, collected: 0, type: "set_piece", set: "cryptstalker", slot: "bracers", baseProbability: gameConfig.itemProbabilities.set_piece, sound: "" },
    { id: "cryptstalker-gloves", name: "Cryptstalker Handguards", image: assetRegistry.items.cryptstalkerGloves, value: 6, collected: 0, type: "set_piece", set: "cryptstalker", slot: "hands", baseProbability: gameConfig.itemProbabilities.set_piece, sound: "" },
    { id: "cryptstalker-belt", name: "Cryptstalker Girdle", image: assetRegistry.items.cryptstalkerBelt, value: 6, collected: 0, type: "set_piece", set: "cryptstalker", slot: "belt", baseProbability: gameConfig.itemProbabilities.set_piece, sound: "" },
    { id: "cryptstalker-leggings", name: "Cryptstalker Legguards", image: assetRegistry.items.cryptstalkerLeggings, value: 6, collected: 0, type: "set_piece", set: "cryptstalker", slot: "legs", baseProbability: gameConfig.itemProbabilities.set_piece, sound: "" },
    { id: "cryptstalker-boots", name: "Cryptstalker Boots", image: assetRegistry.items.cryptstalkerBoots, value: 6, collected: 0, type: "set_piece", set: "cryptstalker", slot: "boots", baseProbability: gameConfig.itemProbabilities.set_piece, sound: "" },
    { id: "cryptstalker-ring", name: "Ring of the Cryptstalker", image: assetRegistry.items.cryptstalkerRing, value: 6, collected: 0, type: "set_piece", set: "cryptstalker", slot: "ring", baseProbability: gameConfig.itemProbabilities.set_piece, sound: "" },
    
    // Legendary items
    { id: "ThunderFury", name: "Thunder Fury", image: assetRegistry.items.tunder, value: 5, collected: 0, type: "legendary", baseProbability: gameConfig.itemProbabilities.legendary, sound: "", 
      crit_rating_bonus: 0.03, dodge_rating_bonus: 0, effect_type: "permanent" },
    { id: "zee", name: "Zee Zgnan Tigar", image: assetRegistry.items.zee, value: 30, collected: 0, spawned: 0, type: "zee_zgnan", baseProbability: gameConfig.itemProbabilities.zee_zgnan, sound: "" },
    
    // Dragonstalker Armor (tier 2): collectable pieces of a set, like the two sets above
    { id: "ds_helm", name: "Dragonstalker's Helm", image: assetRegistry.items.dsHelm, value: 6, collected: 0, type: "set_piece", set: "dragonstalker", slot: "head", baseProbability: gameConfig.itemProbabilities.set_piece, sound: "" },
    { id: "ds_shoulders", name: "Dragonstalker's Spaulders", image: assetRegistry.items.dsShoulders, value: 6, collected: 0, type: "set_piece", set: "dragonstalker", slot: "shoulders", baseProbability: gameConfig.itemProbabilities.set_piece, sound: "" },
    { id: "ds_chest", name: "Dragonstalker's Breastplate", image: assetRegistry.items.dsChest, value: 6, collected: 0, type: "set_piece", set: "dragonstalker", slot: "chest", baseProbability: gameConfig.itemProbabilities.set_piece, sound: "" },
    { id: "ds_bracers", name: "Dragonstalker's Bracers", image: assetRegistry.items.dsBracers, value: 6, collected: 0, type: "set_piece", set: "dragonstalker", slot: "bracers", baseProbability: gameConfig.itemProbabilities.set_piece, sound: "" },
    { id: "ds_gloves", name: "Dragonstalker's Gauntlets", image: assetRegistry.items.dsHands, value: 6, collected: 0, type: "set_piece", set: "dragonstalker", slot: "hands", baseProbability: gameConfig.itemProbabilities.set_piece, sound: "" },
    { id: "ds_belt", name: "Dragonstalker's Belt", image: assetRegistry.items.dsBelt, value: 6, collected: 0, type: "set_piece", set: "dragonstalker", slot: "belt", baseProbability: gameConfig.itemProbabilities.set_piece, sound: "" },
    { id: "ds_legs", name: "Dragonstalker's Legguards", image: assetRegistry.items.dsLegs, value: 6, collected: 0, type: "set_piece", set: "dragonstalker", slot: "legs", baseProbability: gameConfig.itemProbabilities.set_piece, sound: "" },
    { id: "ds_boots", name: "Dragonstalker's Greaves", image: assetRegistry.items.dsBoots, value: 6, collected: 0, type: "set_piece", set: "dragonstalker", slot: "boots", baseProbability: gameConfig.itemProbabilities.set_piece, sound: "" }
]; 