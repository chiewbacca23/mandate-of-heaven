// Three Kingdoms: Mandate of Heaven - Prototype Configuration
// This file contains game constants and configuration for the interactive prototype

export const GAME_CONFIG = {
    // Resource types
    RESOURCES: ['military', 'influence', 'supplies', 'piety'],
    
    // Resource display icons
    RESOURCE_ICONS: {
        military: '⚔️',
        influence: '📜',
        supplies: '📦',
        piety: '🏛️'
    },
    
    // Kingdom configuration
    KINGDOMS: ['wei', 'wu', 'shu'],
    
    // Column bonuses by kingdom
    KINGDOM_BONUSES: {
        wei: 'influence',
        wu: 'supplies',
        shu: 'piety'
    },
    
    // Home provinces - THIS WAS MISSING AND CAUSING THE ERROR!
    HOME_PROVINCES: [
        { 
            id: 1, 
            name: 'Northern Province', 
            bonus: 'influence', 
            priority: 1,
            description: 'Grants +1 Influence priority in turn order tiebreakers'
        },
        { 
            id: 2, 
            name: 'Eastern Province', 
            bonus: 'supplies', 
            priority: 2,
            description: 'Grants +1 Supplies priority in turn order tiebreakers'
        },
        { 
            id: 3, 
            name: 'Southern Province', 
            bonus: 'supplies', 
            priority: 3,
            description: 'Grants +1 Supplies (lower priority)'
        },
        { 
            id: 4, 
            name: 'Western Province', 
            bonus: 'piety', 
            priority: 4,
            description: 'Grants +1 Piety priority in turn order tiebreakers'
        }
    ],
    
    // Game rules
    MAX_TURNS: 8,
    MAX_HAND_SIZE: 5,
    MAX_CARDS_PER_KINGDOM: 3,
    MAX_DEPLOYMENT_PER_TURN: 3,
    
    // Market sizes (base, not including turn 1 bonus)
    HERO_MARKET_SIZE_2P: 4,
    HERO_MARKET_SIZE_3P: 6,
    HERO_MARKET_SIZE_4P: 6,
    TURN_1_HERO_BONUS: 2,
    
    // Title market formula: players + 2
    getTitleMarketSize(playerCount) {
        return playerCount + 2;
    },
    
    getHeroMarketSize(playerCount, isTurn1 = false) {
        const baseSize = playerCount === 2 ? this.HERO_MARKET_SIZE_2P : this.HERO_MARKET_SIZE_3P;
        const bonus = isTurn1 ? this.TURN_1_HERO_BONUS : 0;
        return baseSize + bonus;
    },
    
    // Peasant configuration
    PEASANT_VALUE: 2,
    
    // Emergency resource penalty
    EMERGENCY_PENALTY: -1,
    
    // Phase names
    PHASES: {
        SETUP: 'setup',
        DEPLOYMENT: 'deployment',
        REVEAL: 'reveal',
        PURCHASE: 'purchase',
        CLEANUP: 'cleanup',
        GAME_OVER: 'game_over'
    }
};

// Allegiances in the game
export const ALLEGIANCES = {
    SHU: 'Shu',
    WEI: 'Wei',
    WU: 'Wu',
    HAN: 'Han',
    COALITION: 'Coalition',
    REBELS: 'Rebels',
    DONG_ZHUO: 'Dong Zhuo'
};

// Roles in the game
export const ROLES = {
    GENERAL: 'General',
    ADVISOR: 'Advisor',
    TACTICIAN: 'Tactician',
    ADMINISTRATOR: 'Administrator'
};

// UI Configuration
export const UI_CONFIG = {
    // Card display settings
    CARD_WIDTH: 140,
    CARD_HEIGHT: 200,
    
    // Colors by allegiance
    ALLEGIANCE_COLORS: {
        'Shu': '#8B4513',      // Brown
        'Wei': '#4169E1',      // Royal Blue
        'Wu': '#DC143C',       // Crimson
        'Han': '#FFD700',      // Gold
        'Coalition': '#9370DB', // Purple
        'Rebels': '#FF4500',   // Orange Red
        'Dong Zhuo': '#2F4F4F', // Dark Slate Gray
        'Peasant': '#696969'   // Dim Gray
    },
    
    // Colors by resource
    RESOURCE_COLORS: {
        military: '#DC143C',
        influence: '#4169E1',
        supplies: '#32CD32',
        piety: '#FFD700'
    },
    
    // Animation timings (ms)
    CARD_FLIP_DURATION: 300,
    CARD_MOVE_DURATION: 500,
    HIGHLIGHT_DURATION: 200
};

// Log levels
export const LOG_LEVELS = {
    DEBUG: 0,
    INFO: 1,
    GAME: 2,
    IMPORTANT: 3,
    ERROR: 4
};

// Current log level (set to INFO for normal operation, DEBUG for detailed logging)
export const CURRENT_LOG_LEVEL = LOG_LEVELS.INFO;
