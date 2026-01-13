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
    ],
    
    PROVINCES: [
        { id: 1, name: 'Province of Influence', priority: 1, bonusResource: 'influence', bonusValue: 1 },
        { id: 2, name: 'Province of Supplies (North)', priority: 2, bonusResource: 'supplies', bonusValue: 1 },
        { id: 3, name: 'Province of Supplies (South)', priority: 3, bonusResource: 'supplies', bonusValue: 1 },
        { id: 4, name: 'Province of Piety', priority: 4, bonusResource: 'piety', bonusValue: 1 }
    ],
    
    // Provincial units - 20 unique starting units with special effects
    PROVINCIAL_UNITS: [
        { id: 1, name: 'Prophecy Teller', effects: 'When played, may look at the next unrevealed event', military: 0, influence: 1, supplies: 0, piety: 1 },
        { id: 2, name: 'Central Rice Farmer', effects: '+1 to any resource when played in Shu', military: 0, influence: 0, supplies: 1, piety: 0 },
        { id: 3, name: 'Blacksmith', effects: '+1 Military when played with a General in the same kingdom', military: 1, influence: 0, supplies: 0, piety: 0 },
        { id: 4, name: 'Retired Officer', effects: 'When used to buy a Title, may Retire in place of a hero', military: 0, influence: 0, supplies: -1, piety: 0 },
        { id: 5, name: 'Confucian Scholar', effects: 'Nullifies all friendly negative resources in this kingdom', military: 0, influence: 1, supplies: 0, piety: 0 },
        { id: 6, name: 'Escaped Eunuch', effects: '+1 to the bonus resource from the kingdom they are played in', military: 0, influence: 0, supplies: 0, piety: 1 },
        { id: 7, name: 'Recruiter', effects: 'Draw an extra hero available to recruit this turn', military: 0, influence: 1, supplies: 0, piety: 0 },
        { id: 8, name: 'Mercenary', effects: 'Can be considered as any Allegiance or Role, once per turn', military: 1, influence: 0, supplies: 0, piety: 0 },
        { id: 9, name: 'Reformed Yellow Turban', effects: '+1 bonus resource when recruiting a hero from Rebels or Dong Zhuo', military: 0, influence: 0, supplies: 1, piety: 0 },
        { id: 10, name: 'Spice Merchant', effects: '+1 Supplies and +1 Piety when Recruiting Tacticians or Administrators', military: 0, influence: 0, supplies: 1, piety: 0 },
        { id: 11, name: 'Deserting Soldier', effects: '+1 Military when you have a General on the field', military: 1, influence: 0, supplies: 0, piety: -1 },
        { id: 12, name: 'Disgraced Court Official', effects: 'When purchasing a title, may choose +2 to any single resource', military: 0, influence: 1, supplies: 0, piety: 0 },
        { id: 13, name: 'Northern Horse Tamer', effects: 'Receives 1 bonus resource equal to the current key resource', military: 0, influence: 0, supplies: 0, piety: 1 },
        { id: 14, name: 'Xiongnu Recruit', effects: 'Receives 1 bonus resource based on the lowest positive resource from the card Below', military: 0, influence: 0, supplies: 0, piety: 1 },
        { id: 15, name: 'Soldier Enlister', effects: '+1 Military when recruiting Generals', military: 1, influence: 0, supplies: 0, piety: -1 },
        { id: 16, name: 'Temple Attendant', effects: '+2 Influence if you have no Military resources in this kingdom', military: 0, influence: 0, supplies: 1, piety: 1 },
        { id: 17, name: 'Mountain Bandit', effects: '+1 to any resource if you went last this turn', military: 1, influence: -1, supplies: 0, piety: 0 },
        { id: 18, name: 'Strategist', effects: '+1 Military if you have a General on the field', military: 0, influence: 0, supplies: 1, piety: 0 },
        { id: 19, name: 'Councilman', effects: '+1 Piety if you have an Advisor on the field', military: 0, influence: 1, supplies: 0, piety: 0 },
        { id: 20, name: 'Han loyalist', effects: '+2 Influence when you have an Administrator in this kingdom', military: 1, influence: 0, supplies: 0, piety: 0 }
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
