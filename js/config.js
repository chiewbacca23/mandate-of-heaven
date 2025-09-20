// js/config.js - Game Configuration Module

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
    HEROES_DISCARDED_PER_TURN: 2
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

// Hero data subset for testing
export const HEROES_DATA = [
    { id: 1, name: "Lu Bu", allegiance: "Rebels", role: "General", military: 6, influence: 0, supplies: 2, piety: -2, cost: { military: 6, influence: 0, supplies: 2, piety: 0 } },
    { id: 2, name: "Liu Bei", allegiance: "Shu", role: "General", military: 2, influence: 2, supplies: 0, piety: 3, cost: { military: 2, influence: 2, supplies: 0, piety: 3 } },
    { id: 3, name: "Cao Cao", allegiance: "Wei", role: "Administrator", military: 1, influence: 3, supplies: 2, piety: 1, cost: { military: 1, influence: 3, supplies: 2, piety: 1 } },
    { id: 4, name: "Sun Jian", allegiance: "Wu", role: "General", military: 4, influence: -1, supplies: 2, piety: 1, cost: { military: 4, influence: 0, supplies: 2, piety: 1 } },
    { id: 5, name: "Zhao Yun", allegiance: "Shu", role: "General", military: 2, influence: 0, supplies: 0, piety: 4, cost: { military: 2, influence: 0, supplies: 0, piety: 4 } },
    { id: 6, name: "Guan Yu", allegiance: "Shu", role: "General", military: 4, influence: 0, supplies: -1, piety: 3, cost: { military: 4, influence: 0, supplies: 0, piety: 3 } },
    { id: 7, name: "Zhang Fei", allegiance: "Shu", role: "General", military: 4, influence: -1, supplies: 1, piety: 2, cost: { military: 4, influence: 0, supplies: 1, piety: 2 } },
    { id: 8, name: "Zhou Yu", allegiance: "Wu", role: "General", military: 2, influence: 4, supplies: 1, piety: -1, cost: { military: 2, influence: 4, supplies: 1, piety: 0 } },
    { id: 9, name: "Zhuge Liang", allegiance: "Shu", role: "Advisor", military: 1, influence: 5, supplies: -2, piety: 1, cost: { military: 1, influence: 5, supplies: 0, piety: 1 } },
    { id: 10, name: "Sima Yi", allegiance: "Wei", role: "Administrator", military: 0, influence: 4, supplies: 1, piety: 1, cost: { military: 0, influence: 4, supplies: 1, piety: 1 } },
    { id: 11, name: "Xiahou Dun", allegiance: "Wei", role: "General", military: 3, influence: 0, supplies: 2, piety: 1, cost: { military: 3, influence: 0, supplies: 2, piety: 1 } },
    { id: 12, name: "Dian Wei", allegiance: "Wei", role: "General", military: 4, influence: -1, supplies: 0, piety: 2, cost: { military: 4, influence: 0, supplies: 0, piety: 2 } },
    { id: 13, name: "Sun Ce", allegiance: "Wu", role: "General", military: 4, influence: -1, supplies: 3, piety: 0, cost: { military: 4, influence: 0, supplies: 3, piety: 0 } },
    { id: 14, name: "Yuan Shao", allegiance: "Coalition", role: "General", military: 1, influence: 3, supplies: 2, piety: 0, cost: { military: 1, influence: 3, supplies: 2, piety: 0 } },
    { id: 15, name: "Dong Zhuo", allegiance: "Dong Zhuo", role: "Administrator", military: 1, influence: 4, supplies: 3, piety: -2, cost: { military: 1, influence: 4, supplies: 3, piety: 0 } },
    { id: 16, name: "Gongsun Zan", allegiance: "Coalition", role: "General", military: 4, influence: 1, supplies: 0, piety: 1, cost: { military: 4, influence: 1, supplies: 0, piety: 1 } },
    { id: 17, name: "Zhang Jue", allegiance: "Rebels", role: "General", military: 2, influence: 2, supplies: 2, piety: 0, cost: { military: 2, influence: 2, supplies: 2, piety: 0 } },
    { id: 18, name: "Ma Teng", allegiance: "Han", role: "General", military: 2, influence: 0, supplies: 3, piety: 1, cost: { military: 2, influence: 0, supplies: 3, piety: 1 } },
    { id: 19, name: "Guo Jia", allegiance: "Wei", role: "Advisor", military: 0, influence: 4, supplies: 3, piety: -1, cost: { military: 0, influence: 4, supplies: 3, piety: 0 } },
    { id: 20, name: "Sun Quan", allegiance: "Wu", role: "Administrator", military: 1, influence: 2, supplies: 1, piety: 2, cost: { military: 1, influence: 2, supplies: 1, piety: 2 } }
];

// Title data subset for testing
export const TITLES_DATA = [
    { id: 1, name: "General of Earth", requirement: "General with at least 3 military", cost: { military: 6, influence: 2, supplies: 2, piety: 0 }, points: [0, 1, 2, 3], setType: "generals", setDescription: "Generals" },
    { id: 2, name: "General of Left", requirement: "A Shu hero", cost: { military: 4, influence: 3, supplies: 3, piety: 0 }, points: [0, 1, 2, 4, 5], setType: "shu", setDescription: "Shu heroes" },
    { id: 3, name: "Heavenly Commander", requirement: "Any Han hero", cost: { military: 5, influence: 0, supplies: 4, piety: 0 }, points: [0, 1, 2, 4, 5], setType: "han", setDescription: "Han heroes" },
    { id: 4, name: "Military Strategist", requirement: "General or advisor with resource stat of at least 3", cost: { military: 5, influence: 5, supplies: 0, piety: 0 }, points: [1, 3, 5], setType: "general-advisor-pairs", setDescription: "General-Advisor pairs" },
    { id: 5, name: "Coalition Leader", requirement: "Any hero with resource stat of at least 3", cost: { military: 4, influence: 4, supplies: 2, piety: 2 }, points: [0, 0, 2, 4], setType: "unique-allegiances", setDescription: "Unique allegiances" },
    { id: 6, name: "General of Guards", requirement: "Any Rebels or Dong Zhuo general", cost: { military: 4, influence: 0, supplies: 0, piety: 4 }, points: [0, 1, 2, 5, 6, 7], setType: "rebels-dong-zhuo", setDescription: "Rebels or Dong Zhuo generals" },
    { id: 7, name: "Civil Planners", requirement: "Tactician or administrator with resource stat of at least 3", cost: { military: 0, influence: 0, supplies: 5, piety: 5 }, points: [2, 4, 6], setType: "tactician-administrator-pairs", setDescription: "Tactician-Administrator pairs" },
    { id: 8, name: "Worth a Thousand Men", requirement: "Lu Bu, Gongsun Zan, Taishi Ci, Zhang Liao or Meng Huo", cost: { military: 6, influence: 2, supplies: 2, piety: 0 }, points: [0, 1, 3, 5, 7], setType: "legendary-warriors", setDescription: "Legendary Warriors + bonuses" },
    { id: 9, name: "General of the Right", requirement: "A Wei hero", cost: { military: 4, influence: 0, supplies: 3, piety: 3 }, points: [0, 1, 2, 4, 5], setType: "wei", setDescription: "Wei heroes" },
    { id: 10, name: "General of the Rear", requirement: "A Wu hero", cost: { military: 4, influence: 3, supplies: 0, piety: 3 }, points: [0, 1, 2, 4, 5], setType: "wu", setDescription: "Wu heroes" },
    { id: 11, name: "The Greatest Minds", requirement: "Any Advisor with 4+ Influence", cost: { military: 0, influence: 4, supplies: 4, piety: 2 }, points: [0, 1, 3, 5, 7], setType: "legendary-advisors", setDescription: "Legendary Advisors + bonuses" },
    { id: 12, name: "Five Tiger Generals", requirement: "Guan Yu, Zhang Fei, Ma Chao, Zhao Yun or Huang Zhong", cost: { military: 6, influence: 0, supplies: 0, piety: 4 }, points: [0, 2, 4, 6, 9], setType: "five-tigers", setDescription: "Five Tiger Generals" }
];

// Event data for testing
export const EVENTS_DATA = [
    { name: "Power of Han Wanes", leadingResource: "military" },
    { name: "Yellow Typhoon", leadingResource: "supplies" },
    { name: "Peach Garden", leadingResource: "influence" },
    { name: "Imperial Inspection", leadingResource: "piety" },
    { name: "Coalition Forms", leadingResource: "military" },
    { name: "Empress Poisoned", leadingResource: "supplies" },
    { name: "Dong Zhuo's Rise", leadingResource: "piety" },
    { name: "Red Gold Pearls", leadingResource: "influence" }
];
