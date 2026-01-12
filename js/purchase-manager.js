// purchase-manager.js
// Main purchase manager that integrates validation, scoring, and AI strategy

import { PurchaseValidator } from './purchase-validator.js';
import { CollectionScorer } from './collection-scorer.js';
import { AIStrategy } from './ai-strategy.js';

export class PurchaseManager {
    constructor(heroesData, titlesData, eventsData) {
        this.heroesData = heroesData;
        this.titlesData = titlesData;
        this.eventsData = eventsData;
        
        this.validator = new PurchaseValidator(heroesData);
        this.scorer = new CollectionScorer(heroesData, titlesData);
        this.aiStrategy = new AIStrategy(heroesData, titlesData);
        
        console.log('✅ PurchaseManager initialized with full game data');
    }

    /**
     * Execute AI's purchase decision for a player
     * @param {Object} player - Player object
     * @param {Array} availableHeroes - Heroes in market
     * @param {Array} availableTitles - Titles in market
     * @param {Object} gameState - Current game state
     * @returns {Object} { success: boolean, action: string, details: Object }
     */
    executePurchase(player, availableHeroes, availableTitles, gameState) {
        // 1. Get AI decision
        const decision = this.aiStrategy.decidePurchase(
            player,
            availableHeroes,
            availableTitles,
            gameState
        );
        
        // 2. Execute the decision
        switch (decision.action) {
            case 'title':
                return this.purchaseTitle(player, decision);
            case 'hero':
                return this.purchaseHero(player, decision);
            case 'pass':
                return this.pass(player);
            default:
                return { success: false, action: 'error', details: 'Unknown action' };
        }
    }

    /**
     * Purchase a title
     */
    purchaseTitle(player, decision) {
        const { target: title, heroes, retirementHero, useEmergency } = decision;
        
        // Validate purchase is still valid
        const validation = this.validator.canPurchaseTitle(player, title, heroes);
        if (!validation.canPurchase) {
            return {
                success: false,
                action: 'title',
                details: {
                    title: title.name,
                    reason: validation.reason
                }
            };
        }

        // Calculate points
        const pointsCalc = this.scorer.calculateTitlePoints(player, title);
        
        // Apply emergency resources if needed
        let emergencyPenalty = 0;
        if (useEmergency) {
            player.emergencyUsed = (player.emergencyUsed || 0) + 1;
            emergencyPenalty = -1;
        }

        // Retire the required hero
        this.retireHero(player, retirementHero);
        
        // Remove heroes from battlefield (they return to hand after purchase)
        this.returnHeroesToHand(player, heroes);
        
        // Add title to player's collection
        player.titles.push(title);
        player.score += pointsCalc.totalPoints + emergencyPenalty;
        
        return {
            success: true,
            action: 'title',
            details: {
                title: title.name,
                points: pointsCalc.totalPoints,
                basePoints: pointsCalc.basePoints,
                legendBonus: pointsCalc.legendBonus,
                emergencyPenalty,
                retiredHero: retirementHero.name,
                heroesUsed: heroes.map(h => h.name)
            }
        };
    }

    /**
     * Purchase a hero
     */
    purchaseHero(player, decision) {
        const { target: hero, heroes } = decision;
        
        // Calculate cost and available resources
        const resources = this.aiStrategy.calculateTotalResources(heroes);
        const columnBonuses = this.validator.calculateColumnBonuses(heroes);
        const totalResources = this.aiStrategy.addResources(resources, columnBonuses);
        
        // Verify affordability
        if (!this.aiStrategy.canAffordHero(hero, totalResources)) {
            return {
                success: false,
                action: 'hero',
                details: {
                    hero: hero.name,
                    reason: 'Insufficient resources'
                }
            };
        }

        // Remove heroes from battlefield (they return to hand after purchase)
        this.returnHeroesToHand(player, heroes);
        
        // Add hero to hand
        player.hand.push(hero);
        
        // Check hand limit
        this.enforceHandLimit(player);
        
        return {
            success: true,
            action: 'hero',
            details: {
                hero: hero.name,
                cost: this.aiStrategy.calculateHeroCost(hero),
                heroesUsed: heroes.map(h => h.name),
                columnBonuses
            }
        };
    }

    /**
     * Pass on purchasing
     */
    pass(player) {
        return {
            success: true,
            action: 'pass',
            details: {
                reason: 'No good opportunities available'
            }
        };
    }

    /**
     * Retire a hero (permanently remove from play)
     */
    retireHero(player, hero) {
        // Remove from hand
        player.hand = player.hand.filter(h => h.id !== hero.id);
        
        // Remove from battlefield
        player.battlefield.wei = player.battlefield.wei.filter(h => h.id !== hero.id);
        player.battlefield.wu = player.battlefield.wu.filter(h => h.id !== hero.id);
        player.battlefield.shu = player.battlefield.shu.filter(h => h.id !== hero.id);
        
        // Add to retired list
        player.retired.push(hero);
    }

    /**
     * Return heroes from battlefield to hand after purchase
     */
    returnHeroesToHand(player, heroes) {
        for (const hero of heroes) {
            // Remove from battlefield
            player.battlefield.wei = player.battlefield.wei.filter(h => h.id !== hero.id);
            player.battlefield.wu = player.battlefield.wu.filter(h => h.id !== hero.id);
            player.battlefield.shu = player.battlefield.shu.filter(h => h.id !== hero.id);
            
            // Add back to hand if not already there
            if (!player.hand.some(h => h.id === hero.id)) {
                player.hand.push(hero);
            }
        }
    }

    /**
     * Enforce 5-card hand limit
     */
    enforceHandLimit(player) {
        const HAND_LIMIT = 5;
        
        while (player.hand.length > HAND_LIMIT) {
            // AI strategy: retire least valuable card
            const leastValuable = this.findLeastValuableHero(player.hand);
            this.retireHero(player, leastValuable);
        }
    }

    /**
     * Find least valuable hero in hand
     */
    findLeastValuableHero(hand) {
        let minValue = Infinity;
        let minHero = hand[0];
        
        for (const hero of hand) {
            const value = this.aiStrategy.calculateSingleHeroValue(hero);
            if (value < minValue) {
                minValue = value;
                minHero = hero;
            }
        }
        
        return minHero;
    }

    /**
     * Calculate final score with resource majority bonuses
     * @param {Array} players - All players
     * @param {Array} events - Events that occurred in the game
     * @returns {Object} Final scores with breakdown
     */
    calculateFinalScores(players, events) {
        const scores = {};
        
        // Count resource frequency in events
        const resourceFrequency = {
            military: 0,
            influence: 0,
            supplies: 0,
            piety: 0
        };
        
        for (const event of events) {
            const leadingResource = event.leading_resource?.toLowerCase();
            if (leadingResource && resourceFrequency.hasOwnProperty(leadingResource)) {
                resourceFrequency[leadingResource]++;
            }
        }
        
        // Calculate each player's resource totals
        const playerResources = players.map(player => {
            const allHeroes = this.scorer.getAllPlayerHeroes(player);
            
            return {
                player,
                military: allHeroes.reduce((sum, h) => sum + h.military, 0),
                influence: allHeroes.reduce((sum, h) => sum + h.influence, 0),
                supplies: allHeroes.reduce((sum, h) => sum + h.supplies, 0),
                piety: allHeroes.reduce((sum, h) => sum + h.piety, 0)
            };
        });
        
        // Award majority bonuses for each resource
        const resourceTypes = ['military', 'influence', 'supplies', 'piety'];
        const majorityBonuses = {};
        
        for (const resource of resourceTypes) {
            const frequency = resourceFrequency[resource];
            if (frequency === 0) continue;
            
            // Find player with most of this resource
            let maxAmount = -Infinity;
            let winner = null;
            let tie = false;
            
            for (const pr of playerResources) {
                if (pr[resource] > maxAmount) {
                    maxAmount = pr[resource];
                    winner = pr.player;
                    tie = false;
                } else if (pr[resource] === maxAmount && maxAmount > 0) {
                    tie = true;
                }
            }
            
            // Award bonus if no tie
            if (winner && !tie) {
                if (!majorityBonuses[winner.id]) {
                    majorityBonuses[winner.id] = 0;
                }
                majorityBonuses[winner.id] += frequency;
            }
        }
        
        // Calculate final scores
        for (const player of players) {
            const titlePoints = player.score || 0;
            const majorityBonus = majorityBonuses[player.id] || 0;
            const emergencyPenalty = -(player.emergencyUsed || 0);
            
            scores[player.id] = {
                titlePoints,
                majorityBonus,
                emergencyPenalty,
                finalScore: titlePoints + majorityBonus + emergencyPenalty,
                titles: player.titles.length,
                titlesAcquired: player.titles.map(t => t.name)
            };
        }
        
        return scores;
    }

    /**
     * Get purchase statistics for analysis
     */
    getPurchaseStats(player) {
        return {
            titlesAcquired: player.titles.length,
            titleNames: player.titles.map(t => t.name),
            legendaryTitles: player.titles.filter(t => t.is_legendary).length,
            heroesOwned: this.scorer.getAllPlayerHeroes(player).length,
            heroesRetired: player.retired.length,
            emergencyUsed: player.emergencyUsed || 0,
            currentScore: player.score || 0
        };
    }
}
