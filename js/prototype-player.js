// Three Kingdoms Prototype - Player Module
import { GAME_CONFIG } from './prototype-config.js';

export class Player {
    constructor() {
        this.hand = [];
        this.battlefield = { wei: [], wu: [], shu: [] };
        this.titles = [];
        this.retiredHeroes = [];
        this.score = 0;
        this.emergencyUsed = 0;
    }

    createStartingHand() {
        const peasants = [];
        const names = ['Military Peasant', 'Influence Peasant', 'Supplies Peasant', 'Piety Peasant'];
        GAME_CONFIG.RESOURCES.forEach((res, idx) => {
            peasants.push({
                id: `peasant_${res}`,
                name: names[idx],
                allegiance: 'Peasant',
                roles: ['Peasant'],
                military: res === 'military' ? 2 : 0,
                influence: res === 'influence' ? 2 : 0,
                supplies: res === 'supplies' ? 2 : 0,
                piety: res === 'piety' ? 2 : 0,
                cost: { military: 0, influence: 0, supplies: 0, piety: 0 }
            });
        });
        this.hand = peasants;
    }

    calculateBattlefieldResources(emergencyBonus = {}) {
        const resources = { military: 0, influence: 0, supplies: 0, piety: 0 };
        
        // Add card values from battlefield
        GAME_CONFIG.KINGDOMS.forEach(kingdom => {
            this.battlefield[kingdom].forEach(card => {
                GAME_CONFIG.RESOURCES.forEach(res => {
                    resources[res] += (card[res] || 0);
                });
            });
        });
        
        // Add column bonuses (2+ cards in same kingdom)
        GAME_CONFIG.KINGDOMS.forEach(kingdom => {
            if (this.battlefield[kingdom].length >= 2) {
                const bonusResource = GAME_CONFIG.KINGDOM_BONUSES[kingdom];
                resources[bonusResource] += 1;
            }
        });
        
        // Add emergency bonus
        GAME_CONFIG.RESOURCES.forEach(res => {
            resources[res] += (emergencyBonus[res] || 0);
        });
        
        return resources;
    }

    canAfford(cost, emergencyBonus = {}) {
        const resources = this.calculateBattlefieldResources(emergencyBonus);
        return GAME_CONFIG.RESOURCES.every(res => 
            resources[res] >= (cost[res] || 0)
        );
    }

    findEligibleHero(title) {
        const allHeroes = [
            ...this.hand,
            ...this.battlefield.wei,
            ...this.battlefield.wu,
            ...this.battlefield.shu
        ].filter(h => !(h.name || h.Name || '').includes('Peasant'));
        
        return allHeroes.length > 0 ? allHeroes[0] : null;
    }

    removeHeroFromCollection(hero) {
        let removed = false;
        
        // Try hand first
        const handIdx = this.hand.findIndex(h => h.id === hero.id);
        if (handIdx > -1) {
            this.hand.splice(handIdx, 1);
            return true;
        }
        
        // Try battlefield
        GAME_CONFIG.KINGDOMS.forEach(k => {
            const idx = this.battlefield[k].findIndex(h => h.id === hero.id);
            if (idx > -1) {
                this.battlefield[k].splice(idx, 1);
                removed = true;
            }
        });
        
        return removed;
    }

    getAllHeroes() {
        return [
            ...this.hand,
            ...this.battlefield.wei,
            ...this.battlefield.wu,
            ...this.battlefield.shu,
            ...this.retiredHeroes
        ].filter(h => !(h.name || h.Name || '').includes('Peasant'));
    }

    getHandHeroes() {
        return this.hand.filter(h => !(h.name || h.Name || '').includes('Peasant'));
    }

    getBattlefieldHeroes() {
        return [
            ...this.battlefield.wei,
            ...this.battlefield.wu,
            ...this.battlefield.shu
        ].filter(h => !(h.name || h.Name || '').includes('Peasant'));
    }

    addToHand(card) {
        this.hand.push(card);
    }

    returnBattlefieldToHand() {
        GAME_CONFIG.KINGDOMS.forEach(kingdom => {
            this.hand.push(...this.battlefield[kingdom]);
            this.battlefield[kingdom] = [];
        });
    }

    getBattlefieldCardCount() {
        return this.battlefield.wei.length + 
               this.battlefield.wu.length + 
               this.battlefield.shu.length;
    }
}
