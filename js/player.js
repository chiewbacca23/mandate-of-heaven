// js/player.js - Player Class

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

    getAllHeroes() {
        return [
            ...this.hand,
            ...this.battlefield.wei,
            ...this.battlefield.wu,
            ...this.battlefield.shu,
            ...this.retiredHeroes
        ].filter(hero => !hero.name.includes('Peasant'));
    }

    getTotalResources() {
        let totals = { military: 0, influence: 0, supplies: 0, piety: 0 };
        this.getAllHeroes().forEach(hero => {
            GAME_CONFIG.RESOURCES.forEach(res => {
                totals[res] += Math.max(0, hero[res] || 0);
            });
        });
        return totals;
    }

    calculateBattlefieldResources(tempBonus = {}) {
        let resources = { military: 0, influence: 0, supplies: 0, piety: 0 };
        
        GAME_CONFIG.KINGDOMS.forEach(kingdom => {
            this.battlefield[kingdom].forEach(card => {
                GAME_CONFIG.RESOURCES.forEach(res => {
                    resources[res] += card[res] || 0;
                });
            });
        });
        
        GAME_CONFIG.KINGDOMS.forEach(kingdom => {
            if (this.battlefield[kingdom].length >= 2) {
                const bonus = KINGDOM_BONUSES[kingdom];
                resources[bonus] += 1;
            }
        });
        
        GAME_CONFIG.RESOURCES.forEach(res => {
            resources[res] += tempBonus[res] || 0;
        });
        
        return resources;
    }

    canAfford(cost, tempBonus = {}) {
        const resources = this.calculateBattlefieldResources(tempBonus);
        return GAME_CONFIG.RESOURCES.every(res => resources[res] >= (cost[res] || 0));
    }

    // NEW: Find a valid set of cards that can be used for a purchase
    // Returns array of cards that balance negatives and meet cost requirements
    findUsableCardsForPurchase(cost, tempBonus = {}) {
        const allBattlefieldCards = [
            ...this.battlefield.wei,
            ...this.battlefield.wu,
            ...this.battlefield.shu
        ];
        
        if (allBattlefieldCards.length === 0) return null;
        
        // Try to find a combination that:
        // 1. Balances all negatives (each resource >= 0)
        // 2. Meets the cost requirements
        
        // Strategy: Greedily select cards to balance negatives first, then meet cost
        const selected = [];
        const totals = { military: 0, influence: 0, supplies: 0, piety: 0 };
        
        // Add temp bonus
        GAME_CONFIG.RESOURCES.forEach(res => {
            totals[res] += tempBonus[res] || 0;
        });
        
        // Sort cards: positive contributors first, then by total value
        const sortedCards = [...allBattlefieldCards].sort((a, b) => {
            const aNegs = GAME_CONFIG.RESOURCES.filter(res => (a[res] || 0) < 0).length;
            const bNegs = GAME_CONFIG.RESOURCES.filter(res => (b[res] || 0) < 0).length;
            if (aNegs !== bNegs) return aNegs - bNegs; // Fewer negatives first
            
            const aTotal = GAME_CONFIG.RESOURCES.reduce((sum, res) => sum + Math.max(0, a[res] || 0), 0);
            const bTotal = GAME_CONFIG.RESOURCES.reduce((sum, res) => sum + Math.max(0, b[res] || 0), 0);
            return bTotal - aTotal; // Higher positive total first
        });
        
        // Greedily add cards until we meet requirements
        for (const card of sortedCards) {
            // Calculate what this card would contribute
            const newTotals = { ...totals };
            GAME_CONFIG.RESOURCES.forEach(res => {
                newTotals[res] += card[res] || 0;
            });
            
            // Check if adding this card keeps us non-negative
            const staysPositive = GAME_CONFIG.RESOURCES.every(res => newTotals[res] >= 0);
            
            if (staysPositive) {
                selected.push(card);
                GAME_CONFIG.RESOURCES.forEach(res => {
                    totals[res] = newTotals[res];
                });
                
                // Check if we now meet cost requirements
                const meetsCost = GAME_CONFIG.RESOURCES.every(res => totals[res] >= (cost[res] || 0));
                if (meetsCost) {
                    return selected; // Success!
                }
            }
        }
        
        // Couldn't find a valid combination
        return null;
    }

    // Calculate resources from a specific set of cards
    calculateResourcesFromCards(cards, tempBonus = {}) {
        const resources = { military: 0, influence: 0, supplies: 0, piety: 0 };
        
        cards.forEach(card => {
            GAME_CONFIG.RESOURCES.forEach(res => {
                resources[res] += card[res] || 0;
            });
        });
        
        // Add column bonuses based on which kingdoms these cards are from
        const kingdoms = { wei: 0, wu: 0, shu: 0 };
        cards.forEach(card => {
            GAME_CONFIG.KINGDOMS.forEach(k => {
                if (this.battlefield[k].includes(card)) {
                    kingdoms[k]++;
                }
            });
        });
        
        GAME_CONFIG.KINGDOMS.forEach(k => {
            if (kingdoms[k] >= 2) {
                resources[KINGDOM_BONUSES[k]] += 1;
            }
        });
        
        GAME_CONFIG.RESOURCES.forEach(res => {
            resources[res] += tempBonus[res] || 0;
        });
        
        return resources;
    }

    findEligibleHero(title) {
        const allAvailable = [
            ...this.hand,
            ...this.battlefield.wei,
            ...this.battlefield.wu,
            ...this.battlefield.shu
        ];
        
        const heroesOnly = allAvailable.filter(card => !card.name.includes('Peasant'));
        if (heroesOnly.length === 0) return null;
        
        const requirement = title.requirement || '';
        
        const namedMatch = heroesOnly.find(hero => requirement.includes(hero.name));
        if (namedMatch) return namedMatch;
        
        const roles = ['general', 'advisor', 'tactician', 'administrator'];
        for (const role of roles) {
            if (requirement.toLowerCase().includes(role)) {
                const roleMatch = heroesOnly.find(h => 
                    h.roles && h.roles.some(r => r.toLowerCase() === role)
                );
                if (roleMatch) return roleMatch;
            }
        }
        
        const allegiances = ['shu', 'wei', 'wu', 'han', 'coalition', 'rebels', 'dong zhuo'];
        for (const allegiance of allegiances) {
            if (requirement.toLowerCase().includes(allegiance)) {
                const allyMatch = heroesOnly.find(h => 
                    h.allegiance && h.allegiance.toLowerCase() === allegiance
                );
                if (allyMatch) return allyMatch;
            }
        }
        
        if (requirement.includes('at least')) {
            const match = requirement.match(/(\d+)\s*\+?\s*(military|influence|supplies|piety)/i);
            if (match) {
                const threshold = parseInt(match[1]);
                const resourceType = match[2].toLowerCase();
                const resourceMatch = heroesOnly.find(h => (h[resourceType] || 0) >= threshold);
                if (resourceMatch) return resourceMatch;
            }
        }
        
        return heroesOnly[0];
    }

    deployCards(strategy = 'strategic') {
        const availableToPlay = Math.min(GAME_CONFIG.MAX_DEPLOYMENT_PER_TURN, this.hand.length);
        
        if (this.hand.length === 0) {
            this.gameEngine.log(`${this.name} has no cards`);
            return;
        }

        const deployed = [];
        const availableCards = [...this.hand];
        
        availableCards.sort((a, b) => {
            const aPeasant = a.name.includes('Peasant') ? 0 : 10;
            const bPeasant = b.name.includes('Peasant') ? 0 : 10;
            const aTotal = Math.max(0, a.military || 0) + Math.max(0, a.influence || 0) + 
                          Math.max(0, a.supplies || 0) + Math.max(0, a.piety || 0);
            const bTotal = Math.max(0, b.military || 0) + Math.max(0, b.influence || 0) + 
                          Math.max(0, b.supplies || 0) + Math.max(0, b.piety || 0);
            return (bPeasant + bTotal) - (aPeasant + aTotal);
        });
        
        for (let i = 0; i < availableToPlay && availableCards.length > 0; i++) {
            const card = availableCards.shift();
            const handIndex = this.hand.indexOf(card);
            
            if (handIndex > -1) {
                this.hand.splice(handIndex, 1);
                const kingdom = this.chooseBestKingdom(card, strategy);
                
                if (this.battlefield[kingdom].length < GAME_CONFIG.MAX_CARDS_PER_KINGDOM) {
                    this.battlefield[kingdom].push(card);
                    deployed.push(`${card.name} → ${kingdom.toUpperCase()}`);
                } else {
                    const availableKingdoms = GAME_CONFIG.KINGDOMS.filter(k => 
                        this.battlefield[k].length < GAME_CONFIG.MAX_CARDS_PER_KINGDOM
                    );
                    if (availableKingdoms.length > 0) {
                        const fallback = availableKingdoms[0];
                        this.battlefield[fallback].push(card);
                        deployed.push(`${card.name} → ${fallback.toUpperCase()}`);
                    } else {
                        this.hand.push(card);
                    }
                }
            }
        }
        
        if (deployed.length > 0) {
            this.gameEngine.log(`${this.name}: ${deployed.join(', ')}`);
        }
    }

    chooseBestKingdom(card, strategy) {
        const available = GAME_CONFIG.KINGDOMS.filter(k => 
            this.battlefield[k].length < GAME_CONFIG.MAX_CARDS_PER_KINGDOM
        );
        if (available.length === 0) return 'wei';
        
        if (strategy === 'strategic') {
            const almostBonus = available.filter(k => this.battlefield[k].length === 1);
            if (almostBonus.length > 0) {
                const currentEvent = this.gameEngine.gameState.currentEvent;
                if (currentEvent) {
                    const needed = currentEvent.leadingResource;
                    const beneficial = almostBonus.find(k => KINGDOM_BONUSES[k] === needed);
                    if (beneficial) return beneficial;
                }
                return almostBonus[0];
            }
            
            const empty = available.filter(k => this.battlefield[k].length === 0);
            if (empty.length > 0) return empty[0];
        }
        
        return available[Math.floor(Math.random() * available.length)];
    }

    makePurchase(turnNumber) {
        let purchased = false;
        let emergencyUsed = 0;
        let tempBonus = { military: 0, influence: 0, supplies: 0, piety: 0 };
        
        const preferTitles = turnNumber > 3 || this.titles.length < 2;
        
        // DEBUG: Check if negatives are causing problems
        const rawResources = this.calculateBattlefieldResources();
        const hasNegatives = GAME_CONFIG.RESOURCES.some(res => rawResources[res] < 0);
        if (hasNegatives) {
            this.gameEngine.log(`${this.name} has negative battlefield resources - needs to balance`);
        }
        
        while (!purchased && emergencyUsed < GAME_CONFIG.MAX_EMERGENCY_USES) {
            // Find what we can actually afford using smart card selection
            const affordableHeroes = this.gameEngine.gameState.heroMarket.filter(h => {
                const usableCards = this.findUsableCardsForPurchase(h.cost || {}, tempBonus);
                return usableCards !== null;
            });
            
            const affordableTitles = this.gameEngine.gameState.titleMarket.filter(t => {
                if (!this.findEligibleHero(t)) return false;
                const usableCards = this.findUsableCardsForPurchase(t.cost || {}, tempBonus);
                return usableCards !== null;
            });
            
            let chosenPurchase = null;
            
            if (preferTitles && affordableTitles.length > 0) {
                const scored = affordableTitles.map(title => {
                    const { points } = this.calculateCollectionScore(title);
                    return { title, expectedPoints: points };
                });
                scored.sort((a, b) => b.expectedPoints - a.expectedPoints);
                chosenPurchase = { type: 'title', item: scored[0].title };
            } else if (affordableHeroes.length > 0) {
                const scored = affordableHeroes.map(hero => {
                    let score = 0;
                    GAME_CONFIG.RESOURCES.forEach(res => score += Math.max(0, hero[res] || 0) * 2);
                    const sameAlly = this.getAllHeroes().filter(h => h.allegiance === hero.allegiance).length;
                    score += sameAlly * 3;
                    return { hero, score };
                });
                scored.sort((a, b) => b.score - a.score);
                chosenPurchase = { type: 'hero', item: scored[0].hero };
            } else if (affordableTitles.length > 0) {
                chosenPurchase = { type: 'title', item: affordableTitles[0] };
            }
            
            if (chosenPurchase) {
                const success = this.executePurchase(chosenPurchase, emergencyUsed, tempBonus);
                if (success) purchased = true;
            } else {
                // Nothing affordable - consider emergency resources
                if (emergencyUsed >= 2) {
                    this.gameEngine.log(`${this.name} passes (no options)`);
                    this.gameEngine.gameState.stats.totalPasses++;
                    break;
                }
                
                const currentResources = this.calculateBattlefieldResources(tempBonus);
                
                // Find high-value titles we're close to affording
                const worthyTitles = this.gameEngine.gameState.titleMarket.filter(title => {
                    if (!this.findEligibleHero(title)) return false;
                    const { points } = this.calculateCollectionScore(title);
                    return points >= 3; // Only consider titles worth 3+ points
                });
                
                let bestTarget = null;
                let minDeficit = Infinity;
                let deficitResources = {};
                
                worthyTitles.forEach(title => {
                    let totalDeficit = 0;
                    let neededResources = {};
                    
                    GAME_CONFIG.RESOURCES.forEach(res => {
                        const deficit = Math.max(0, (title.cost?.[res] || 0) - currentResources[res]);
                        if (deficit > 0) {
                            neededResources[res] = deficit;
                            totalDeficit += deficit;
                        }
                    });
                    
                    // Only consider if we're 1-2 resources short
                    if (totalDeficit > 0 && totalDeficit <= 2 && totalDeficit < minDeficit) {
                        minDeficit = totalDeficit;
                        bestTarget = title;
                        deficitResources = neededResources;
                    }
                });
                
                // Use emergency ONLY for high-value titles we're close to affording
                if (bestTarget && minDeficit <= 2) {
                    // Add emergency resources intelligently based on what we need
                    const neededRes = Object.keys(deficitResources);
                    if (neededRes.length > 0) {
                        // Add to the two most needed resources
                        const sorted = neededRes.sort((a, b) => deficitResources[b] - deficitResources[a]);
                        tempBonus[sorted[0]] = (tempBonus[sorted[0]] || 0) + 1;
                        if (sorted[1]) {
                            tempBonus[sorted[1]] = (tempBonus[sorted[1]] || 0) + 1;
                        } else {
                            tempBonus[sorted[0]] = (tempBonus[sorted[0]] || 0) + 1;
                        }
                    }
                    
                    emergencyUsed++;
                    this.emergencyUsed++;
                    this.score -= 1;
                    this.gameEngine.gameState.stats.totalEmergency++;
                    
                    // Loop continues to try purchase with emergency bonus
                } else {
                    // No worthy targets for emergency - just pass
                    this.gameEngine.log(`${this.name} passes (nothing worth emergency)`);
                    this.gameEngine.gameState.stats.totalPasses++;
                    break;
                }
            }
        }
        
        if (!purchased) this.returnCardsToHand();
    }

    executePurchase(purchase, emergencyUsed, tempBonus = {}) {
        if (purchase.type === 'title') {
            const title = purchase.item;
            const heroToRetire = this.findEligibleHero(title);
            
            if (heroToRetire && this.removeHeroFromPlay(heroToRetire)) {
                // Find which cards were used for this purchase
                const usedCards = this.findUsableCardsForPurchase(title.cost || {}, tempBonus);
                
                // Remove used cards from battlefield and return to hand (except retired hero)
                if (usedCards) {
                    usedCards.forEach(card => {
                        if (card !== heroToRetire) {
                            GAME_CONFIG.KINGDOMS.forEach(k => {
                                const idx = this.battlefield[k].indexOf(card);
                                if (idx > -1) {
                                    this.battlefield[k].splice(idx, 1);
                                    this.hand.push(card);
                                }
                            });
                        }
                    });
                }
                
                this.retiredHeroes.push(heroToRetire);
                this.titles.push({ title, retiredWith: heroToRetire });
                this.gameEngine.gameState.titleMarket = this.gameEngine.gameState.titleMarket.filter(t => t !== title);
                this.gameEngine.gameState.stats.totalTitles++;
                
                const emerg = emergencyUsed > 0 ? ` (+${emergencyUsed} emergency)` : '';
                this.gameEngine.log(`${this.name} → "${title.name}"${emerg}`);
                return true;
            }
        } else {
            const hero = purchase.item;
            
            // Find which cards were used for this purchase
            const usedCards = this.findUsableCardsForPurchase(hero.cost || {}, tempBonus);
            
            // Remove used cards from battlefield and return to hand
            if (usedCards) {
                usedCards.forEach(card => {
                    GAME_CONFIG.KINGDOMS.forEach(k => {
                        const idx = this.battlefield[k].indexOf(card);
                        if (idx > -1) {
                            this.battlefield[k].splice(idx, 1);
                            this.hand.push(card);
                        }
                    });
                });
            }
            
            this.hand.push({...hero});
            this.gameEngine.gameState.heroMarket = this.gameEngine.gameState.heroMarket.filter(h => h !== hero);
            this.gameEngine.gameState.purchasedHeroes.push(hero);
            this.gameEngine.gameState.stats.totalHeroes++;
            
            const emerg = emergencyUsed > 0 ? ` (+${emergencyUsed} emergency)` : '';
            this.gameEngine.log(`${this.name} → ${hero.name}${emerg}`);
            return true;
        }
        return false;
    }

    removeHeroFromPlay(hero) {
        const handIdx = this.hand.indexOf(hero);
        if (handIdx > -1) {
            this.hand.splice(handIdx, 1);
            return true;
        }
        for (const kingdom of GAME_CONFIG.KINGDOMS) {
            const idx = this.battlefield[kingdom].indexOf(hero);
            if (idx > -1) {
                this.battlefield[kingdom].splice(idx, 1);
                return true;
            }
        }
        return false;
    }

    returnCardsToHand() {
        GAME_CONFIG.KINGDOMS.forEach(k => {
            this.hand.push(...this.battlefield[k]);
            this.battlefield[k] = [];
        });
    }

    calculateCollectionScore(title) {
        const allHeroes = this.getAllHeroes();
        let collectionSize = 0;
        const setType = (title.setType || '').toLowerCase();
        
        if (setType.includes('general')) {
            collectionSize = allHeroes.filter(h => h.roles && h.roles.includes('General')).length;
        } else if (setType.includes('shu')) {
            collectionSize = allHeroes.filter(h => h.allegiance === 'Shu').length;
        } else if (setType.includes('wei')) {
            collectionSize = allHeroes.filter(h => h.allegiance === 'Wei').length;
        } else if (setType.includes('wu')) {
            collectionSize = allHeroes.filter(h => h.allegiance === 'Wu').length;
        } else {
            collectionSize = Math.min(allHeroes.length, (title.points || [0]).length - 1);
        }
        
        const points = title.points || [0];
        const pointIndex = Math.min(collectionSize, points.length - 1);
        return { collectionSize, points: Array.isArray(points) ? points[pointIndex] : points };
    }
}
