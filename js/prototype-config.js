// Three Kingdoms Prototype - Configuration & Data Loading

export const GAME_CONFIG = {
    RESOURCES: ['military', 'influence', 'supplies', 'piety'],
    RESOURCE_ICONS: {
        military: '⚔️',
        influence: '📜',
        supplies: '📦',
        piety: '🏛️'
    },
    KINGDOMS: ['wei', 'wu', 'shu'],
    KINGDOM_BONUSES: {
        wei: 'influence',
        wu: 'supplies',
        shu: 'piety'
    },
    MAX_DEPLOYMENT: 3,
    MAX_CARDS_PER_KINGDOM: 3,
    HAND_LIMIT: 5,
    TOTAL_TURNS: 8
};

export class DataLoader {
    constructor() {
        this.heroes = null;
        this.titles = null;
        this.events = null;
        this.loaded = false;
    }

    async loadAllData() {
        try {
            const [heroesData, titlesData, eventsData] = await Promise.all([
                this.loadJSON('./data/heroes.json'),
                this.loadJSON('./data/titles.json'),
                this.loadJSON('./data/events.json')
            ]);

            this.heroes = heroesData;
            this.titles = titlesData;
            this.events = eventsData;
            this.loaded = true;

            console.log(`✅ Loaded ${this.heroes.length} heroes, ${this.titles.length} titles, ${this.events.length} events`);
            return { heroes: this.heroes, titles: this.titles, events: this.events };
        } catch (error) {
            console.error('❌ Error loading data:', error);
            throw error;
        }
    }

    async loadJSON(url) {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to load ${url}: ${response.statusText}`);
        }
        return await response.json();
    }

    // Helper: Get heroes by allegiance
    getHeroesByAllegiance(allegiance) {
        return this.heroes.filter(hero => hero.allegiance === allegiance);
    }

    // Helper: Get heroes by role
    getHeroesByRole(role) {
        return this.heroes.filter(hero => hero.roles && hero.roles.includes(role));
    }

    // Helper: Shuffle array
    shuffle(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }
}

export const dataLoader = new DataLoader();
