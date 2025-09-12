// config.js - Game Constants and Configuration

const RESOURCE_ICONS = {
    military: '⚔️',
    influence: '📜', 
    supplies: '📦',
    piety: '🏛️'
};

const KINGDOM_BONUSES = {
    wei: 'influence',
    wu: 'supplies', 
    shu: 'piety'
};

const GAME_CONFIG = {
    MAX_HAND_SIZE: 5,
    MAX_BATTLEFIELD_CARDS: 3,
    TOTAL_TURNS: 8,
    EMERGENCY_LIMIT: 2,
    HERO_MARKET_SIZE: {
        2: 4,  // 2 players = 4 heroes
        3: 6,  // 3 players = 6 heroes  
        4: 6   // 4 players = 6 heroes
    },
    TITLE_MARKET_BONUS: 2, // playerCount + 2
    TURN_1_HERO_BONUS: 2
};

// Add this function to handle resource icon lookup
function getResourceIcon(resource) {
    if (!resource) return '❓';
    const normalized = resource.toLowerCase();
    return RESOURCE_ICONS[normalized] || RESOURCE_ICONS[resource] || '❓';
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { RESOURCE_ICONS, KINGDOM_BONUSES, GAME_CONFIG };
}
