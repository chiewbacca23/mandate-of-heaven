// js/config.js - Enhanced Game Configuration with Data Loading

export const GAME_CONFIG = {
    // Game Constants
    MAX_TURNS: 8,
    MAX_HAND_SIZE: 5,
    MAX_DEPLOYMENT_PER_TURN: 3,
    MAX_CARDS_PER_KINGDOM: 3,
    
    // Market Sizes
    HERO_MARKET_2P: 4,
    HERO_MARKET_3P_PLUS: 6,
    TURN_1_BONUS_HEROES: 2,
    TITLE_MARKET_BONUS: 2,
    
    // Resources
    RESOURCES: ['military', 'influence', 'supplies', 'piety'],
    KINGDOMS: ['wei', 'wu', 'shu'],
    
    // Penalties
    EMERGENCY_RESOURCE_PENALTY: -1,
    MAX_EMERGENCY_USES: 3,
    
    // Market Cleanup
    HEROES_DISCARDED_PER_TURN: 2,
    
    // Data file paths
    DATA_PATHS: {
        HEROES: './data/heroes.json',
        TITLES: './data/titles.json',
        EVENTS: './data/events.json'
    }
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

export const ALLEGIANCES = [
    'Shu', 'Wei', 'Wu', 'Han', 'Coalition', 'Rebels', 'Dong Zhuo'
];

export const ROLES = [
    'General', 'Advisor', 'Tactician', 'Administrator'
];

// Data loading utility class
export class DataLoader {
    constructor() {
        this.loadedData = {
            heroes: null,
            titles: null,
            events: null
        };
        this.loadingPromises = {};
    }
    
    // Load JSON data from file with error handling
    async loadJSON(filepath, dataType) {
        try {
            console.log(`Loading ${dataType} from ${filepath}...`);
            const response = await fetch(filepath);
            
            if (!response.ok) {
                throw new Error(`Failed to load ${dataType}: HTTP ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (!Array.isArray(data) && typeof data !== 'object') {
                throw new Error(`Invalid ${dataType} format: Expected array or object`);
            }
            
            console.log(`✅ ${dataType} loaded successfully: ${Array.isArray(data) ? data.length : Object.keys(data).length} items`);
            return data;
            
        } catch (error) {
            console.error(`❌ Failed to load ${dataType}:`, error);
            throw new Error(`Data loading failed for ${dataType}: ${error.message}`);
        }
    }
    
    // Load heroes data
    async loadHeroes() {
        if (this.loadedData.heroes) {
            return this.loadedData.heroes;
        }
        
        if (!this.loadingPromises.heroes) {
            this.loadingPromises.heroes = this.loadJSON(GAME_CONFIG.DATA_PATHS.HEROES, 'heroes')
                .then(data => {
                    // Validate hero data structure
                    if (Array.isArray(data)) {
                        data.forEach((hero, index) => {
                            if (!hero.name || !hero.allegiance || !hero.roles) {
                                console.warn(`Hero ${index} missing required fields:`, hero);
                            }
                        });
                        this.loadedData.heroes = data;
                        return data;
                    } else {
                        throw new Error('Heroes data should be an array');
                    }
                });
        }
        
        return this.loadingPromises.heroes;
    }
    
    // Load titles data
    async loadTitles() {
        if (this.loadedData.titles) {
            return this.loadedData.titles;
        }
        
        if (!this.loadingPromises.titles) {
            this.loadingPromises.titles = this.loadJSON(GAME_CONFIG.DATA_PATHS.TITLES, 'titles')
                .then(data => {
                    // Validate title data structure
                    if (Array.isArray(data)) {
                        data.forEach((title, index) => {
                            if (!title.name || !title.cost || !title.points) {
                                console.warn(`Title ${index} missing required fields:`, title);
                            }
                        });
                        this.loadedData.titles = data;
                        return data;
                    } else {
                        throw new Error('Titles data should be an array');
                    }
                });
        }
        
        return this.loadingPromises.titles;
    }
    
    // Load events data
    async loadEvents() {
        if (this.loadedData.events) {
            return this.loadedData.events;
        }
        
        if (!this.loadingPromises.events) {
            this.loadingPromises.events = this.loadJSON(GAME_CONFIG.DATA_PATHS.EVENTS, 'events')
                .then(data => {
                    // Validate event data structure
                    if (Array.isArray(data)) {
                        data.forEach((event, index) => {
                            if (!event.name || !event.leadingResource) {
                                console.warn(`Event ${index} missing required fields:`, event);
                            }
                        });
                        this.loadedData.events = data;
                        return data;
                    } else {
                        throw new Error('Events data should be an array');
                    }
                });
        }
        
        return this.loadingPromises.events;
    }
    
    // Load all data at once
    async loadAllData() {
        try {
            const [heroes, titles, events] = await Promise.all([
                this.loadHeroes(),
                this.loadTitles(),
                this.loadEvents()
            ]);
            
            console.log('✅ All game data loaded successfully');
            console.log(`📊 Data summary: ${heroes.length} heroes, ${titles.length} titles, ${events.length} events`);
            
            return { heroes, titles, events };
            
        } catch (error) {
            console.error('❌ Failed to load all game data:', error);
            throw error;
        }
    }
    
    // Get filtered heroes by criteria
    getHeroesByAllegiance(allegiance) {
        if (!this.loadedData.heroes) {
            throw new Error('Heroes not loaded yet');
        }
        return this.loadedData.heroes.filter(hero => hero.allegiance === allegiance);
    }
    
    getHeroesByRole(role) {
        if (!this.loadedData.heroes) {
            throw new Error('Heroes not loaded yet');
        }
        return this.loadedData.heroes.filter(hero => 
            hero.roles && hero.roles.includes(role)
        );
    }
    
    // Get titles by criteria
    getTitlesByCost(maxCost) {
        if (!this.loadedData.titles) {
            throw new Error('Titles not loaded yet');
        }
        return this.loadedData.titles.filter(title => {
            const totalCost = GAME_CONFIG.RESOURCES.reduce((sum, res) => 
                sum + (title.cost[res] || 0), 0
            );
            return totalCost <= maxCost;
        });
    }
    
    // Get events by leading resource
    getEventsByResource(resource) {
        if (!this.loadedData.events) {
            throw new Error('Events not loaded yet');
        }
        return this.loadedData.events.filter(event => 
            event.leadingResource === resource
        );
    }
    
    // Create peasant cards
    createPeasant(type) {
        const names = ['Military Peasant', 'Influence Peasant', 'Supplies Peasant', 'Piety Peasant'];
        const card = {
            name: names[type],
            allegiance: 'Peasant',
            roles: ['Peasant'],
            military: 0,
            influence: 0,
            supplies: 0,
            piety: 0,
            effects: '',
            set: 'Peasant',
            points: 0
        };
        card[GAME_CONFIG.RESOURCES[type]] = 2;
        return card;
    }
    
    // Utility: Shuffle array
    shuffle(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }
}

// Create a singleton data loader instance
export const dataLoader = new DataLoader();
