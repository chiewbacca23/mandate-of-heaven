// js/player.js - Enhanced Player Class with PurchaseManager Integration
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
        
        // Reference to PurchaseManager if available
        this.purchaseManager = null;
    }

    // Set purchase manager (called after initialization)
    setPurchaseManager(purchaseManager) {
        this.purchaseManager = purchaseManager;
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

    // Find a hero that meets title requirements (enhanced for real data)
    findEligibleHero(title) {
        const allAvailable = [
            ...this.hand,
            ...this.battlefield.wei,
            ...this.battlefield.wu,
            ...this.battlefield.shu
        ];
        
        const heroesOnly = allAvailable.filter(card => !card.name.includes('Peasant'));
        
        if (heroesOnly.length === 0) return null;
        
        // Enhanced requirement checking based on actual title requirements
        const requirement = title.requirement || title.Required_Hero || '';
        
        // Check for specific named heroes first
        const namedHeroMatch = heroesOnly.find(hero => 
            requirement.includes(hero.name)
        );
        if (namedHeroMatch) return namedHeroMatch;
        
        // Check for role-based requirements
        if (requirement.toLowerCase().includes('general')) {
            const generals = heroesOnly.filter(hero => 
                hero.roles && hero.roles.includes('General')
            );
            if (generals.length > 0) return generals[0];
        }
        
        if (requirement.toLowerCase().includes('advisor')) {
            const advisors = heroesOnly.filter(hero => 
                hero.roles && hero.roles.includes('Advisor')
            );
            if (advisors.length > 0) return advisors[0];
        }
        
        if (requirement.toLowerCase().includes('tactician')) {
            const tacticians = heroesOnly.filter(hero => 
                hero.roles && hero.roles.includes('Tactician')
            );
            if (tacticians.length > 0) return tacticians[0];
        }
        
        if (requirement.toLowerCase().includes('administrator')) {
            const administrators = heroesOnly.filter(hero => 
                hero.roles && hero.roles.includes('Administrator')
            );
            if (administrators.length > 0) return administrators[0];
        }
        
        // Check for allegiance-based requirements
        const allegiances = ['Shu', 'Wei', 'Wu', 'Han', 'Coalition', 'Rebels', 'Dong Zhuo'];
        for (const allegiance of allegiances) {
            if (requirement.includes(allegiance)) {
                const allegianceMatch = heroesOnly.find(hero => hero.allegiance === allegiance);
                if (allegianceMatch) return allegianceMatch;
            }
        }
        
        // Check for resource-based requirements (e.g., "at least 3 military")
        if (requirement.includes('at least')) {
            const resourceMatches = GAME_CONFIG.RESOURCES.filter(res => {
                if (requirement.includes(res)) {
                    const threshold = parseInt(requirement.match(/(\d+)/)?.[1] || '3');
                    return heroesOnly.find(hero => (hero[res] || 0) >= threshold);
                }
                return false;
            });
            if (resourceMatches.length > 0) {
                const res = resourceMatches[0];
                const threshold = parseInt(requirement.match(/(\d+)/)?.[1] || '3');
                return heroesOnly.find(hero => (hero[res] || 0) >= threshold);
            }
        }
        
        // Fallback: return first available hero
        return heroesOnly[0];
    }

    // Deploy cards to battlefield with enhanced AI
    deployCards(strategy = 'strategic') {
        const availableToPlay = Math.min(GAME_CONFIG.MAX_DEPLOYMENT_PER_TURN, this.hand.length);
        
        if (this.hand.length === 0) {
            this.gameEngine.log(`${this.name} has no cards to deploy`);
            return;
        }

        const deployed = [];
        const availableCards = [...this.hand];
        
        // Sort cards by strategic value
        availableCards.sort((a, b) => {
            // Prefer non-peasants
            const aPeasant = a.name.includes('Peasant') ? 0 : 10;
            const bPeasant = b.name.includes('Peasant') ? 0 : 10;
            
            // Calculate total positive resources
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
                
                // Choose kingdom strategically
                const kingdom = this.chooseBestKingdom(card, strategy);
                
                if (this.battlefield[kingdom].length < GAME_CONFIG.MAX_CARDS_PER_KINGDOM) {
                    this.battlefield[kingdom].push(card);
                    deployed.push(`${card.name} to ${kingdom.toUpperCase()}`);
                } else {
                    // Kingdom full, try another
                    const availableKingdoms = GAME_CONFIG.KINGDOMS.filter(k => 
                        this.battlefield[k].length < GAME_CONFIG.MAX_CARDS_PER_KINGDOM
                    );
                    if (availableKingdoms.length > 0) {
                        const fallbackKingdom = availableKingdoms[0];
                        this.battlefield[fallbackKingdom].push(card);
                        deployed.push(`${card.name} to ${fallbackKingdom.toUpperCase()}`);
                    } else {
                        // All kingdoms full, return to hand
                        this.hand.push(card);
                    }
                }
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
                // Choose based on what bonus would be most useful
                const currentEvent = this.gameEngine.gameState.currentEvent;
                if (currentEvent) {
                    const neededResource = currentEvent.leadingResource;
                    const beneficialKingdom = almostBonus.find(k => KINGDOM_BONUSES[k] === neededResource);
                    if (beneficialKingdom) return beneficialKingdom;
                }
                return almostBonus[0];
            }
            
            // Place in empty kingdoms first for flexibility
            const emptyKingdoms = availableKingdoms.filter(k => this.battlefield[k].length === 0);
            if (emptyKingdoms.length > 0) {
                return emptyKingdoms[0];
            }
        }
        
        // Random fallback
        return availableKingdoms[Math.floor(Math.random() * availableKingdoms.length)];
    }

    // Enhanced purchase logic with PurchaseManager integration
    makePurchase(turnNumber) {
        // DEFENSIVE CHECK: If PurchaseManager is available, use it
        if (this.purchaseManager) {
            try {
                const decision = this.purchaseManager.makeAIPurchase(
                    this,
                    this.gameEngine.gameState.heroMarket,
                    this.gameEngine.gameState.titleMarket,
                    this.gameEngine.gameState
                );
                
                // DEFENSIVE CHECK: Ensure decision is valid
                if (!decision || !decision.action) {
                    this.gameEngine.log(`${this.name} passes turn - no valid purchase decision`);
                    this.returnCardsToHand();
                    this.gameEngine.gameState.stats.totalPasses++;
                    return;
                }
                
                // Execute the decision
                if (decision.action === 'pass') {
                    this.gameEngine.log(`${this.name} passes turn - ${decision.reason || 'no affordable options'}`);
                    this.returnCardsToHand();
                    this.gameEngine.gameState.stats.totalPasses++;
                    return;
                }
                
                // Execute purchase using PurchaseManager
                this.purchaseManager.executePurchase(
                    this,
                    decision,
                    this.gameEngine.gameState.heroMarket,
                    this.gameEngine.gameState.titleMarket
                );
                
                return;
                
            } catch (error) {
                this.gameEngine.log(`${this.name} purchase error: ${error.message}`, 'error');
                this.returnCardsToHand();
                this.gameEngine.gameState.stats.totalPasses++;
                return;
            }
        }
        
        // FALLBACK: Use legacy purchase system if PurchaseManager not available
        this.makePurchaseLegacy(turnNumber);
    }

    // Legacy purchase system (fallback)
    makePurchaseLegacy(turnNumber) {
        let purchased = false;
        let emergencyUsed = 0;
        let tempBonus = { military: 0, influence: 0, supplies: 0, piety: 0 };
        
        const preferTitles = turnNumber > 3 || this.titles.length < 2;
        
        // Try to buy without emergency resources first
        while (!purchased && emergencyUsed < GAME_CONFIG.MAX_EMERGENCY_USES) {
            const affordableHeroes = this.gameEngine.gameState.heroMarket.filter(h => 
                this.canAfford(h.cost || {}, tempBonus)
            );
            const affordableTitles = this.gameEngine.gameState.titleMarket.filter(t => {
                return this.canAfford(t.cost || {}, tempBonus) && this.findEligibleHero(t) !== null;
            });
            
            let chosenPurchase = null;
            
            // Smart selection logic
            if (preferTitles && affordableTitles.length > 0) {
                // Choose title with best immediate scoring potential
                const scoredTitles = affordableTitles.map(title => {
                    const { collectionSize, points } = this.calculateCollectionScore(title);
                    return { title, expectedPoints: points, collectionSize };
                });
                
                scoredTitles.sort((a, b) => b.expectedPoints - a.expectedPoints);
                chosenPurchase = { type: 'title', item: scoredTitles[0].title };
                
            } else if (affordableHeroes.length > 0) {
                // Choose hero with best total stats and synergy
                const scoredHeroes = affordableHeroes.map(hero => {
                    let score = 0;
                    
                    // Base stat value
                    GAME_CONFIG.RESOURCES.forEach(res => {
                        score += Math.max(0, hero[res] || 0) * 2;
                    });
                    
                    // Allegiance synergy bonus
                    const sameAllegiance = this.getAllHeroes().filter(h => h.allegiance === hero.allegiance).length;
                    score += sameAllegiance * 3;
                    
                    // Role diversity bonus
                    const hasRole = this.getAllHeroes().some(h => 
                        h.roles && hero.roles && h.roles.some(r => hero.roles.includes(r))
                    );
                    if (!hasRole) score += 5;
                    
                    return { hero, score };
                });
                
                scoredHeroes.sort((a, b) => b.score - a.score);
                chosenPurchase = { type: 'hero', item: scoredHeroes[0].hero };
                
            } else if (affordableTitles.length > 0) {
                chosenPurchase = { type: 'title', item: affordableTitles[0] };
            }
            
            if (chosenPurchase) {
                // Execute the purchase
                const success = this.executePurchase(chosenPurchase, emergencyUsed);
                if (success) {
                    purchased = true;
                }
            } else {
                // Try emergency resources for high-value targets
                if (emergencyUsed >= 2) {
                    this.gameEngine.log(`${this.name} passes turn - too many emergency attempts`);
                    this.gameEngine.gameState.stats.totalPasses++;
                    break;
                }
                
                // Find the best target we're close to affording
                const allItems = [...this.gameEngine.gameState.heroMarket, ...this.gameEngine.gameState.titleMarket];
                const currentResources = this.calculateBattlefieldResources(tempBonus);
                
                let bestTarget = null;
                let minDeficit = Infinity;
                
                allItems.forEach(item => {
                    if (item.points && !this.findEligibleHero(item)) return; // Skip titles with no eligible hero
                    
                    let totalDeficit = 0;
                    GAME_CONFIG.RESOURCES.forEach(res => {
                        const deficit = Math.max(0, (item.cost?.[res] || 0) - currentResources[res]);
                        totalDeficit += deficit;
                    });
                    
                    if (totalDeficit > 0 && totalDeficit <= 4 && totalDeficit < minDeficit) {
                        minDeficit = totalDeficit;
                        bestTarget = item;
                    }
                });
                
                if (bestTarget && minDeficit <= 2) {
                    // Add emergency resources strategically
                    tempBonus.military += 1;
                    tempBonus.influence += 1;
                    emergencyUsed++;
                    this.emergencyUsed++;
                    this.score -= 1;
                    this.gameEngine.gameState.stats.totalEmergency++;
                    
                    this.gameEngine.log(`${this.name} uses emergency (-1 point, +1⚔️ +1📜) targeting ${bestTarget.name}`);
                } else {
                    this.gameEngine.log(`${this.name} passes turn - nothing affordable`);
                    this.gameEngine.gameState.stats.totalPasses++;
                    break;
                }
            }
        }
        
        // Return cards to hand even if didn't purchase
        if (!purchased) {
            this.returnCardsToHand();
        }
    }

    // Execute a purchase (hero or title)
    executePurchase(purchase, emergencyUsed) {
        if (purchase.type === 'title') {
            const title = purchase.item;
            const heroToRetire = this.findEligibleHero(title);
            
            if (heroToRetire && this.removeHeroFromPlay(heroToRetire)) {
                this.retiredHeroes.push(heroToRetire);
                this.titles.push({ title: title, retiredWith: heroToRetire });
                
                // Remove title from market
                this.gameEngine.gameState.titleMarket = this.gameEngine.gameState.titleMarket.filter(t => t !== title);
                this.gameEngine.gameState.stats.totalTitles++;
                
                // Return cards to hand
                this.returnCardsToHand();
                
                const emergencyText = emergencyUsed > 0 ? ` (${emergencyUsed} emergency used)` : '';
                this.gameEngine.log(`${this.name} purchases "${title.name}" retiring ${heroToRetire.name}${emergencyText}`);
                
                return true;
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
            
            return true;
        }
        
        return false;
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

    // Enhanced collection scoring for real title data
    calculateCollectionScore(title) {
        const allHeroes = this.getAllHeroes();
        let collectionSize = 0;
        
        // Use actual title setType from data if available
        const setType = title.setType || title.Set_Scoring || '';
        
        switch(setType.toLowerCase()) {
            case 'generals':
                collectionSize = allHeroes.filter(h => h.roles && h.roles.includes('General')).length;
                break;
            case 'shu':
            case 'shu heroes':
                collectionSize = allHeroes.filter(h => h.allegiance === 'Shu').length;
                break;
            case 'wei':
            case 'wei heroes':
                collectionSize = allHeroes.filter(h => h.allegiance === 'Wei').length;
                break;
            case 'wu':
            case 'wu heroes':
                collectionSize = allHeroes.filter(h => h.allegiance === 'Wu').length;
                break;
            case 'han':
            case 'han heroes':
                collectionSize = allHeroes.filter(h => h.allegiance === 'Han').length;
                break;
            case 'coalition':
            case 'coalition heroes':
                collectionSize = allHeroes.filter(h => h.allegiance === 'Coalition').length;
                break;
            case 'rebels':
            case 'rebels heroes':
                collectionSize = allHeroes.filter(h => h.allegiance === 'Rebels').length;
                break;
            case 'dong zhuo':
            case 'dong zhuo heroes':
                collectionSize = allHeroes.filter(h => h.allegiance === 'Dong Zhuo').length;
                break;
            case 'general-advisor-pairs':
                const generals = allHeroes.filter(h => h.roles && h.roles.includes('General')).length;
                const advisors = allHeroes.filter(h => h.roles && h.roles.includes('Advisor')).length;
                collectionSize = Math.min(generals, advisors);
                break;
            case 'unique-allegiances':
                collectionSize = new Set(allHeroes.map(h => h.allegiance)).size;
                break;
            case 'female heroes':
            case 'beauties':
                const femaleNames = ['Diaochan', 'Sun Ren', 'Lady Wu', 'Da Qiao', 'Xiao Qiao', 'Lady Bian', 'Lady Cai', 'Empress Dong', 'Empress He', 'Lady Zhurong'];
                collectionSize = allHeroes.filter(h => femaleNames.includes(h.name)).length;
                break;
            default:
                // Fallback: Use total hero count limited by title points array length
                collectionSize = Math.min(allHeroes.length, (title.points || [0]).length - 1);
        }
        
        // Handle set scoring array (points based on collection size)
        const points = title.points || title.Set_Scoring || [0];
        const pointIndex = Math.min(collectionSize, points.length - 1);
        
        return { 
            collectionSize, 
            points: Array.isArray(points) ? points[pointIndex] : points
        };
    }

    // Get player summary for display
    getSummary() {
        const resources = this.calculateBattlefieldResources();
        const totalHeroes = this.getAllHeroes().length;
        
        return {
            name: this.name,
            score: this.score,
            titles: this.titles.length,
            heroes: totalHeroes,
            hand: this.hand.length,
            emergency: this.emergencyUsed,
            battlefield: {
                wei: this.battlefield.wei.length,
                wu: this.battlefield.wu.length,
                shu: this.battlefield.shu.length
            },
            resources: resources
        };
    }
}
