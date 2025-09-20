// js/purchase-manager.js - Purchase Decision Module

import { GAME_CONFIG, RESOURCE_ICONS } from './config.js';

export class PurchaseManager {
    constructor(gameEngine) {
        this.game = gameEngine;
    }

    // Evaluate all available purchases for a player
    evaluatePurchaseOptions(player, turnNumber) {
        const options = [];
        
        // Evaluate heroes
        this.game.gameState.heroMarket.forEach(hero => {
            const evaluation = this.evaluateHeroPurchase(player, hero, turnNumber);
            if (evaluation.canAfford || evaluation.emergencyFeasible) {
                options.push({
                    type: 'hero',
                    item: hero,
                    evaluation: evaluation
                });
            }
        });
        
        // Evaluate titles
        this.game.gameState.titleMarket.forEach(title => {
            const evaluation = this.evaluateTitlePurchase(player, title, turnNumber);
            if (evaluation.canAfford || evaluation.emergencyFeasible) {
                options.push({
                    type: 'title',
                    item: title,
                    evaluation: evaluation
                });
            }
        });
        
        // Sort by priority score
        options.sort((a, b) => b.evaluation.priority - a.evaluation.priority);
        
        return options;
    }

    // Evaluate hero purchase
    evaluateHeroPurchase(player, hero, turnNumber) {
        const resources = player.calculateBattlefieldResources();
        const cost = hero.cost;
        
        // Check affordability
        const canAfford = GAME_CONFIG.RESOURCES.every(res => 
            resources[res] >= (cost[res] || 0)
        );
        
        // Calculate emergency resource needs
        let emergencyNeeded = 0;
        let deficitResources = [];
        
        if (!canAfford) {
            GAME_CONFIG.RESOURCES.forEach(res => {
                const deficit = Math.max(0, (cost[res] || 0) - resources[res]);
                if (deficit > 0) {
                    emergencyNeeded += deficit;
                    deficitResources.push({ resource: res, amount: deficit });
                }
            });
        }
        
        const emergencyFeasible = emergencyNeeded <= 4 && player.emergencyUsed < GAME_CONFIG.MAX_EMERGENCY_USES;
        
        // Calculate priority score
        let priority = this.calculateHeroPriority(player, hero, turnNumber);
        
        // Penalty for emergency use
        if (emergencyNeeded > 0) {
            priority -= emergencyNeeded * 10; // Heavy penalty for emergency
        }
        
        return {
            canAfford,
            emergencyFeasible,
            emergencyNeeded,
            deficitResources,
            priority,
            reasoning: `Hero ${hero.name}: Priority ${priority.toFixed(1)}`
        };
    }

    // Evaluate title purchase
    evaluateTitlePurchase(player, title, turnNumber) {
        const resources = player.calculateBattlefieldResources();
        const cost = title.cost;
        const eligibleHero = player.findEligibleHero(title);
        
        if (!eligibleHero) {
            return {
                canAfford: false,
                emergencyFeasible: false,
                emergencyNeeded: 999,
                deficitResources: [],
                priority: -1000,
                reasoning: `Title ${title.name}: No eligible hero`
            };
        }
        
        // Check affordability
        const canAfford = GAME_CONFIG.RESOURCES.every(res => 
            resources[res] >= (cost[res] || 0)
        );
        
        // Calculate emergency resource needs
        let emergencyNeeded = 0;
        let deficitResources = [];
        
        if (!canAfford) {
            GAME_CONFIG.RESOURCES.forEach(res => {
                const deficit = Math.max(0, (cost[res] || 0) - resources[res]);
                if (deficit > 0) {
                    emergencyNeeded += deficit;
                    deficitResources.push({ resource: res, amount: deficit });
                }
            });
        }
        
        const emergencyFeasible = emergencyNeeded <= 4 && player.emergencyUsed < GAME_CONFIG.MAX_EMERGENCY_USES;
        
        // Calculate priority score
        let priority = this.calculateTitlePriority(player, title, turnNumber);
        
        // Penalty for emergency use
        if (emergencyNeeded > 0) {
            priority -= emergencyNeeded * 15; // Even heavier penalty for titles
        }
        
        return {
            canAfford,
            emergencyFeasible,
            emergencyNeeded,
            deficitResources,
            priority,
            reasoning: `Title ${title.name}: Priority ${priority.toFixed(1)}`
        };
    }

    // Calculate hero priority score
    calculateHeroPriority(player, hero, turnNumber) {
        let priority = 0;
        
        // Base value from total positive resources
        const totalResources = Math.max(0, hero.military || 0) + 
                              Math.max(0, hero.influence || 0) + 
                              Math.max(0, hero.supplies || 0) + 
                              Math.max(0, hero.piety || 0);
        priority += totalResources * 5;
        
        // Bonus for non-peasants
        if (!hero.name.includes('Peasant')) {
            priority += 20;
        }
        
        // Faction synergy bonus
        const sameAllegiance = player.getAllHeroes().filter(h => h.allegiance === hero.allegiance).length;
        priority += sameAllegiance * 3;
        
        // Role diversity bonus
        const sameRole = player.getAllHeroes().filter(h => h.role === hero.role).length;
        if (sameRole === 0) {
            priority += 10; // First of this role
        }
        
        // Early game vs late game preferences
        if (turnNumber <= 3) {
            // Early game: prefer resource generators
            priority += totalResources * 2;
        } else {
            // Late game: prefer specific needs
            priority += 5;
        }
        
        return priority;
    }

    // Calculate title priority score
    calculateTitlePriority(player, title, turnNumber) {
        let priority = 0;
        
        // Calculate immediate points from title
        const { collectionSize, points } = player.calculateCollectionScore(title);
        priority += points * 20; // High weight for immediate points
        
        // Bonus for first/second title
        if (player.titles.length === 0) {
            priority += 50; // First title bonus
        } else if (player.titles.length === 1) {
            priority += 30; // Second title bonus
        }
        
        // Penalty for duplicate set types
        const duplicateSetType = player.titles.some(t => t.title.setType === title.setType);
        if (duplicateSetType) {
            priority -= 20;
        }
        
        // Late game urgency
        if (turnNumber >= 6) {
            priority += 25; // Late game bonus for any title
        }
        
        // Collection growth potential
        const maxPossiblePoints = title.points[title.points.length - 1];
        const growthPotential = maxPossiblePoints - points;
        priority += growthPotential * 5;
        
        return priority;
    }

    // Execute purchase with emergency resources if needed
    executePurchaseWithEmergency(player, option) {
        const evaluation = option.evaluation;
        let emergencyUsed = 0;
        let tempBonus = { military: 0, influence: 0, supplies: 0, piety: 0 };
        
        // Add emergency resources if needed
        if (!evaluation.canAfford && evaluation.emergencyFeasible) {
            evaluation.deficitResources.forEach(deficit => {
                const needed = Math.min(deficit.amount, 2); // Max 2 per resource type
                tempBonus[deficit.resource] += needed;
                emergencyUsed += needed;
            });
            
            // Update player state
            player.emergencyUsed += emergencyUsed;
            player.score -= emergencyUsed;
            this.game.gameState.stats.totalEmergency += emergencyUsed;
        }
        
        // Check if we can afford it now
        const finalAffordable = player.canAfford(option.item.cost, tempBonus);
        
        if (finalAffordable) {
            if (option.type === 'title') {
                this.executeTitlePurchase(player, option.item, emergencyUsed);
            } else {
                this.executeHeroPurchase(player, option.item, emergencyUsed);
            }
            return true;
        }
        
        return false;
    }

    // Execute title purchase
    executeTitlePurchase(player, title, emergencyUsed) {
        const heroToRetire = player.findEligibleHero(title);
        
        if (heroToRetire && player.removeHeroFromPlay(heroToRetire)) {
            player.retiredHeroes.push(heroToRetire);
            player.titles.push({ title: title, retiredWith: heroToRetire });
            
            // Remove title from market
            this.game.gameState.titleMarket = this.game.gameState.titleMarket.filter(t => t !== title);
            this.game.gameState.stats.totalTitles++;
            
            // Return cards to hand
            player.returnCardsToHand();
            
            const emergencyText = emergencyUsed > 0 ? ` (${emergencyUsed} emergency used)` : '';
            this.game.log(`${player.name} purchases "${title.name}" retiring ${heroToRetire.name}${emergencyText}`);
            
            return true;
        }
        
        return false;
    }

    // Execute hero purchase
    executeHeroPurchase(player, hero, emergencyUsed) {
        player.hand.push({...hero});
        
        // Remove hero from market
        this.game.gameState.heroMarket = this.game.gameState.heroMarket.filter(h => h !== hero);
        this.game.gameState.purchasedHeroes.push(hero);
        this.game.gameState.stats.totalHeroes++;
        
        // Return cards to hand
        player.returnCardsToHand();
        
        const emergencyText = emergencyUsed > 0 ? ` (${emergencyUsed} emergency used)` : '';
        this.game.log(`${player.name} purchases ${hero.name}${emergencyText}`);
        
        return true;
    }

    // Strategic purchase decision for AI
    makeStrategicPurchase(player, turnNumber) {
        const options = this.evaluatePurchaseOptions(player, turnNumber);
        
        if (options.length === 0) {
            this.game.log(`${player.name} passes turn - no viable options`);
            this.game.gameState.stats.totalPasses++;
            player.returnCardsToHand();
            return false;
        }
        
        // Take the best option
        const bestOption = options[0];
        
        this.game.log(`${player.name} evaluating: ${bestOption.evaluation.reasoning}`);
        
        const success = this.executePurchaseWithEmergency(player, bestOption);
        
        if (!success) {
            this.game.log(`${player.name} passes turn - purchase failed`);
            this.game.gameState.stats.totalPasses++;
            player.returnCardsToHand();
        }
        
        return success;
    }
}
