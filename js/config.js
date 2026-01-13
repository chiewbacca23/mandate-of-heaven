// js/config.js - Game Configuration and Data Loading

export const GAME_CONFIG = {
    MAX_TURNS: 8,
    MAX_DEPLOYMENT_PER_TURN: 3,
    MAX_CARDS_PER_KINGDOM: 3,
    MAX_EMERGENCY_USES: 3,
    HERO_MARKET_2P: 4,
    HERO_MARKET_3P_PLUS: 6,
    TURN_1_BONUS_HEROES: 2,
    TITLE_MARKET_BONUS: 2,
    HEROES_DISCARDED_PER_TURN: 2,
    
    KINGDOMS: ['wei', 'wu', 'shu'],
    RESOURCES: ['military', 'influence', 'supplies', 'piety'],
    
    PEASANT_TEMPLATES: [
        { id: 'peasant_military', name: 'Peasant (Military)', military: 2, influence: 0, supplies: 0, piety: 0 },
        { id: 'peasant_influence', name: 'Peasant (Influence)', military: 0, influence: 2, supplies: 0, piety: 0 },
        { id: 'peasant_supplies', name: 'Peasant (Supplies)', military: 0, influence: 0, supplies: 2, piety: 0 },
        { id: 'peasant_piety', name: 'Peasant (Piety)', military: 0, influence: 0, supplies: 0, piety: 2 }
    ]
};

export const RESOURCE_ICONS = {
    military: '⚔️',
    influence: '📜',
    supplies: '📦',
    piety: '🏛️'
};

export const KINGDOM_BONUSES = {
    wei: 'influence',
    wu: 'supplies',
    shu: 'piety'
};

// Data Loader Class
export class DataLoader {
    constructor() {
        this.heroesCache = null;
        this.titlesCache = null;
        this.eventsCache = null;
    }

    async loadHeroes() {
        if (this.heroesCache) return this.heroesCache;
        
        const response = await fetch('./data/heroes.json');
        if (!response.ok) throw new Error(`Failed to load heroes: ${response.statusText}`);
        
        this.heroesCache = await response.json();
        return this.heroesCache;
    }

    async loadTitles() {
        if (this.titlesCache) return this.titlesCache;
        
        const response = await fetch('./data/titles.json');
        if (!response.ok) throw new Error(`Failed to load titles: ${response.statusText}`);
        
        this.titlesCache = await response.json();
        return this.titlesCache;
    }

    async loadEvents() {
        if (this.eventsCache) return this.eventsCache;
        
        const response = await fetch('./data/events.json');
        if (!response.ok) throw new Error(`Failed to load events: ${response.statusText}`);
        
        this.eventsCache = await response.json();
        return this.eventsCache;
    }

    async loadAllData() {
        const [heroes, titles, events] = await Promise.all([
            this.loadHeroes(),
            this.loadTitles(),
            this.loadEvents()
        ]);

        return { heroes, titles, events };
    }

    createPeasant(index) {
        const template = GAME_CONFIG.PEASANT_TEMPLATES[index];
        return { ...template };
    }

    shuffle(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }
}

// Create singleton instance
export const dataLoader = new DataLoader();
