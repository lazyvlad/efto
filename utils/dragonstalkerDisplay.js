// Display helpers for Dragonstalker progress UI.

export function getDragonstalkerItemIconData(item) {
    return {
        src: item?.image || '',
        alt: item?.name || 'Dragonstalker item',
        fallbackText: getShortenedDragonstalkerName(item?.id, item?.name || 'Item')
    };
}

export function getShortenedDragonstalkerName(itemId, originalName) {
    const shortNameMap = {
        'ds_helm': 'Head',
        'ds_shoulders': 'Shoulders', 
        'ds_chest': 'Chest',
        'ds_bracers': 'Bracers',
        'ds_gloves': 'Hands',
        'ds_belt': 'Belt',
        'ds_legs': 'Legs',
        'ds_boots': 'Boots',
        'ashjrethul': 'Crossbow',
        'ashkandi2': 'Weapon'
    };
    
    return shortNameMap[itemId] || originalName;
}
