// js/player.js - Player Class Module

import { GAME_CONFIG, RESOURCE_ICONS, KINGDOM_BONUSES } from './config.js';

export class Player {
    constructor(id, name, gameEngine) {
        this.id = id;
        this.name = name;
        this.gameEngine = gameEngine;
        this.hand = [];
        this.battlefield = { wei: [], wu: [], shu: [] };
        this.score = 0;
        this.titles = [];
        this.retiredHeroes = [];
        this.emergencyUsed = 0;
    }

    // Get all heroes owned by player (hand + battlefield + retired)
    getAllHeroes() {
        return [
            ...this.hand,
            ...this.battlefield.wei,
            ...this.battlefield.wu,
            ...this.battlefield.shu,
            ...this.retiredHeroes
        ].filter(hero => !hero.name.includes('Peasant'));
    }

    // Calculate total resources across all owned heroes
    getTotalResources() {
        let totals = { military: 0, influence: 0, supplies: 0, piety: 0 };
        this.getAllHeroes().forEach(hero => {
            GAME_CONFIG.RESOURCES.forEach(res => {
                totals[res] += Math.max(0, hero[res] || 0);
            });
        });
        return totals;
    }

    // Calculate current battlefield resources including column bonuses
    calculateBattlefieldResources(tempBonus = {}) {
        let resources = { military: 0, influence: 0, supplies: 0, piety: 0 };
        
        // Add all card values (including negatives)
        GAME_CONFIG.KINGDOMS.forEach(kingdom => {
            this.battlefield[kingdom].forEach(card => {
                GAME_CONFIG.RESOURCES.forEach(res => {
                    resources[res] += card[res] || 0;
                });
            });
        });
        
        // Column bonuses (2+ cards in same kingdom)
        GAME_CONFIG.KINGDOMS.forEach(kingdom => {
            if (this.battlefield[kingdom].length >= 2) {
                const bonus = KINGDOM_BONUSES[kingdom];
                resources[bonus] += 1;
            }
        });
        
        // Add temporary bonuses (e.g., emergency resources)
        GAME_CONFIG.RESOURCES.forEach(res => {
            resources[res] += tempBonus[res] || 0;
        });
        
        return resources;
    }

    // Check if player can afford a purchase
    canAfford(cost, tempBonus = {}) {
        const resources = this.calculateBattlefieldResources(tempBonus);
        return GAME_CONFIG.RESOURCES.every(res => resources[res] >= (cost[res] || 0));
    }

    // Find a hero that meets title requirements
    findEligibleHero(title) {
        const allAvailable = [
            ...this.hand,
            ...this.battlefield.wei,
            ...this.battlefield.wu,
            ...this.battlefield.shu
        ];
        
        const heroesOnly = allAvailable.filter(card => !card.name.includes('Peasant'));
        
        // Simple eligibility check - just return first hero for now
        // TODO: Implement actual requirement checking
        return heroesOnly.length > 0 ? heroesOnly[0] : null;
    }

    // Deploy cards to battlefield (AI logic)
    deployCards(strategy = 'strategic') {
        const maxPerKingdom = GAME_CONFIG.MAX_CARDS_PER_KINGDOM;
        const availableToPlay = Math.min(GAME_CONFIG.MAX_DEPLOYMENT_PER_TURN, this.hand.length);
        
        if (this.hand.length === 0) {
            this.gameEngine.log(`${this.name} has no cards to deploy`);
            return;
        }

        // Simple deployment strategy
        const deployed = [];
        const availableCards = [...this.hand];
        
        for (let i = 0; i < availableToPlay && availableCards.length > 0; i++) {
            // Sort cards by total positive resources
            availableCards.sort((a, b) => {
                const aTotal = Math.max(0, a.military || 0) + Math.max(0, a.influence || 0) + 
                              Math.max(0, a.supplies || 0) + Math.max(0, a.piety || 0);
                const bTotal = Math.max(0, b.military || 0) + Math.max(0, b.influence || 0) + 
                              Math.max(0, b.supplies || 0) + Math.max(0, b.piety || 0);
                
                // Prefer non-peasants
                const aPeasant = a.name.includes('Peasant') ? 0 : 1;
                const bPeasant = b.name.includes('Peasant') ? 0 : 1;
                if (aPeasant !== bPeasant) return bPeasant - aPeasant;
                
                return bTotal - aTotal;
            });
            
            const card = availableCards.shift();
            const handIndex = this.hand.indexOf(card);
            
            if (handIndex > -1) {
                this.hand.splice(handIndex, 1);
                
                // Choose kingdom strategically
                const kingdom = this.chooseBestKingdom(card, strategy);
                
                this.battlefield[kingdom].push(card);
                deployed.push(`${card.name} to ${kingdom.toUpperCase()}`);
            }
        }
        
        if (deployed.length > 0) {
            this.gameEngine.log(`${this.name} deploys: ${deployed.join(', ')}`);
            const resources = this.calculateBattlefieldResources();
            this.gameEngine.log(`  Resources: ${GAME_CONFIG.RESOURCES.map(r => `${RESOURCE_ICONS[r]}${resources[r]}`).join(' ')}`);
        }
    }

    // Choose best kingdom for card placement
    chooseBestKingdom(card, strategy) {
        const availableKingdoms = GAME_CONFIG.KINGDOMS.filter(k => 
            this.battlefield[k].length < GAME_CONFIG.MAX_CARDS_PER_KINGDOM
        );
        
        if (availableKingdoms.length === 0) return 'wei'; // Fallback
        
        if (strategy === 'strategic') {
            // Try to get column bonuses
            const almostBonus = availableKingdoms.filter(k => this.battlefield[k].length === 1);
            if (almostBonus.length > 0) {
                return almostBonus[0];
            }
            
            // Place in empty kingdoms first
            const emptyKingdoms = availableKingdoms.filter(k => this.battlefield[k].length === 0);
            if (emptyKingdoms.length > 0) {
                return emptyKingdoms[0];
            }
        }
        
        // Random fallback
        return availableKingdoms[Math.floor(Math.random() * availableKingdoms.length)];
    }

    // Make a purchase (hero or title)
    makePurchase(turnNumber) {
        let purchased = false;
        let emergencyUsed = 0;
        let tempBonus = { military: 0, influence: 0, supplies: 0, piety: 0 };
        
        const preferTitles = turnNumber > 2 || this.titles.length < 2;
        
        // Try to buy without emergency resources first
        while (!purchased && emergencyUsed < GAME_CONFIG.MAX_EMERGENCY_USES) {
            const affordableHeroes = this.gameEngine.gameState.heroMarket.filter(h => 
                this.canAfford(h.cost, tempBonus)
            );
            const affordableTitles = this.gameEngine.gameState.titleMarket.filter(t => {
                return this.canAfford(t.cost, tempBonus) && this.findEligibleHero(t) !== null;
            });
            
            let chosenPurchase = null;
            
            // Smart selection logic
            if (preferTitles && affordableTitles.length > 0) {
                chosenPurchase = { 
                    type: 'title', 
                    item: affordableTitles[0] // Take first affordable title
                };
            } else if (affordableHeroes.length > 0) {
                chosenPurchase = { 
                    type: 'hero', 
                    item: affordableHeroes[0] // Take first affordable hero
                };
            } else if (affordableTitles.length > 0) {
                chosenPurchase = { type: 'title', item: affordableTitles[0] };
            }
            
            if (chosenPurchase) {
                // Execute the purchase
                this.executePurchase(chosenPurchase, emergencyUsed);
                purchased = true;
            } else {
                // Try emergency resources
                if (emergencyUsed >= 2) {
                    this.gameEngine.log(`${this.name} passes turn - too many emergency attempts`);
                    this.gameEngine.gameState.stats.totalPasses++;
                    break;
                }
                
                // Add emergency resources (+1 to two different types)
                tempBonus.military += 1;
                tempBonus.influence += 1;
                emergencyUsed++;
                this.emergencyUsed++;
                this.score -= 1;
                this.gameEngine.gameState.stats.totalEmergency++;
                
                this.gameEngine.log(`${this.name} uses emergency (-1 point, +1⚔️ +1📜)`);
            }
        }
        
        // Return cards to hand even if didn't purchase
        if (!purchased) {
            GAME_CONFIG.KINGDOMS.forEach(k => {
                this.hand.push(...this.battlefield[k]);
                this.battlefield[k] = [];
            });
        }
    }

    // Execute a purchase (hero or title)
    executePurchase(purchase, emergencyUsed) {
        if (purchase.type === 'title') {
            const title = purchase.item;
            const heroToRetire = this.findEligibleHero(title);
            
            if (heroToRetire) {
                // Remove hero from wherever it is
                this.removeHeroFromPlay(heroToRetire);
                this.retiredHeroes.push(heroToRetire);
                this.titles.push({ title: title, retiredWith: heroToRetire });
                
                // Remove title from market
                this.gameEngine.gameState.titleMarket = this.gameEngine.gameState.titleMarket.filter(t => t !== title);
                this.gameEngine.gameState.stats.totalTitles++;
                
                // Return cards to hand
                this.returnCardsToHand();
                
                const emergencyText = emergencyUsed > 0 ? ` (${emergencyUsed} emergency used)` : '';
                this.gameEngine.log(`${this.name} purchases "${title.name}" retiring ${heroToRetire.name}${emergencyText}`);
            }
            
        } else {
            const hero = purchase.item;
            this.hand.push({...hero});
            
            // Remove hero from market
            this.gameEngine.gameState.heroMarket = this.gameEngine.gameState.heroMarket.filter(h => h !== hero);
            this.gameEngine.gameState.purchasedHeroes.push(hero);
            this.gameEngine.gameState.stats.totalHeroes++;
            
            // Return cards to hand
            this.returnCardsToHand();
            
            const emergencyText = emergencyUsed > 0 ? ` (${emergencyUsed} emergency used)` : '';
            this.gameEngine.log(`${this.name} purchases ${hero.name}${emergencyText}`);
        }
    }

    // Remove a hero from hand or battlefield
    removeHeroFromPlay(hero) {
        let removed = false;
        
        // Try hand first
        const handIdx = this.hand.indexOf(hero);
        if (handIdx > -1) {
            this.hand.splice(handIdx, 1);
            removed = true;
        } else {
            // Try battlefield
            GAME_CONFIG.KINGDOMS.forEach(k => {
                const idx = this.battlefield[k].indexOf(hero);
                if (idx > -1) {
                    this.battlefield[k].splice(idx, 1);
                    removed = true;
                }
            });
        }
        
        return removed;
    }

    // Return all battlefield cards to hand
    returnCardsToHand() {
        GAME_CONFIG.KINGDOMS.forEach(k => {
            this.hand.push(...this.battlefield[k]);
            this.battlefield[k] = [];
        });
    }

    // Calculate title collection score
    calculateCollectionScore(title) {
        const allHeroes = this.getAllHeroes();
        let collectionSize = 0;
        
        switch(title.setType) {
            case 'generals':
                collectionSize = allHeroes.filter(h => h.role === 'General').length;
                break;
            case 'shu':
                collectionSize = allHeroes.filter(h => h.allegiance === 'Shu').length;
                break;
            case 'wei':
                collectionSize = allHeroes.filter(h => h.allegiance === 'Wei').length;
                break;
            case 'wu':
                collectionSize = allHeroes.filter(h => h.allegiance === 'Wu').length;
                break;
            case 'han':
                collectionSize = allHeroes.filter(h => h.allegiance === 'Han').length;
                break;
            case 'general-advisor-pairs':
                const generals = allHeroes.filter(h => h.role === 'General').length;
                const advisors = allHeroes.filter(h => h.role === 'Advisor').length;
                collectionSize = Math.min(generals, advisors);
                break;
            case 'unique-allegiances':
                collectionSize = new Set(allHeroes.map(h => h.allegiance)).size;
                break;
            default:
                collectionSize = 0;
        }
        
        const pointIndex = Math.min(collectionSize, title.points.length - 1);
        return { collectionSize, points: title.points[pointIndex] };
    }
}
