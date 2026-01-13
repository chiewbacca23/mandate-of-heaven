// purchase-manager.js
// Main coordination module for purchase decisions in the simulator

import { PurchaseValidator } from './purchase-validator.js';
import { CollectionScorer } from './collection-scorer.js';
import { AIStrategy } from './ai-strategy.js';

export class PurchaseManager {
    constructor(heroesData, titlesData, eventsData) {
        this.validator = new PurchaseValidator(heroesData, titlesData);
        this.scorer = new CollectionScorer(heroesData, titlesData);
        this.ai = new AIStrategy(heroesData, titlesData);
        
        this.heroesData = heroesData;
        this.titlesData = titlesData;
        this.eventsData = eventsData;
        
        console.log('✅ PurchaseManager initialized with full game data');
    }

    /**
     * Make an AI purchase decision for a player
     * @param {Object} player - Player object
     * @param {Array} heroMarket - Available heroes in market
     * @param {Array} titleMarket - Available titles in market
     * @param {Object} gameState - Current game state
     * @returns {Object} Purchase decision { action: 'hero'|'title'|'pass', target: Object, heroesToUse: Array }
     */
    makeAIPurchase(player, heroMarket, titleMarket, gameState) {
        try {
            // Evaluate all possible purchases
            const titleOptions = this.evaluateAllTitles(player, titleMarket, gameState);
            const heroOptions = this.evaluateAllHeroes(player, heroMarket, gameState);
            
            // Let AI strategy choose the best option
            const decision = this.ai.chooseBestPurchase(titleOptions, heroOptions, player, gameState);
            
            return decision;
        } catch (error) {
            console.error('Error in makeAIPurchase:', error);
            return { action: 'pass', reason: 'Error during purchase evaluation' };
        }
    }

    /**
     * Evaluate all available titles and return viable options
     * @param {Object} player - Player object
     * @param {Array} titleMarket - Available titles
     * @param {Object} gameState - Current game state
     * @returns {Array} Array of { title, canAfford, points, efficiency, heroesToUse }
     */
    evaluateAllTitles(player, titleMarket, gameState) {
        const options = [];
        
        for (const title of titleMarket) {
            try {
                const evaluation = this.evaluateTitlePurchase(player, title, gameState);
                if (evaluation.canAfford) {
                    options.push(evaluation);
                }
            } catch (error) {
                console.warn(`Error evaluating title "${title.name}":`, error.message);
                // Continue to next title instead of crashing
            }
        }
        
        return options;
    }

    /**
     * Evaluate a single title purchase option
     * @param {Object} player - Player object
     * @param {Object} title - Title to evaluate
     * @param {Object} gameState - Current game state
     * @returns {Object} { title, canAfford, points, efficiency, heroesToUse, retireHero }
     */
    evaluateTitlePurchase(player, title, gameState) {
        // DEFENSIVE CHECK: Ensure title has required properties
        if (!title || !title.name) {
            throw new Error('Invalid title object');
        }

        // Check if player meets the title requirement
        const requirementCheck = this.validator.checkTitleRequirement(
            player,
            title.requirement,
            title.requirementType || 'simple'
        );
        
        if (!requirementCheck.canPurchase) {
            return {
                title,
                canAfford: false,
                reason: requirementCheck.reason,
                points: 0,
                efficiency: 0
            };
        }
        
        // Get the hero that will be retired
        const retireHero = requirementCheck.matchingHero;
        
        // Calculate available resources (battlefield + hand)
        const availableResources = this.calculateAvailableResources(player);
        
        // Check if player can afford the title
        const cost = title.cost || { military: 0, influence: 0, supplies: 0, piety: 0 };
        const affordCheck = this.validator.checkAffordability(
            availableResources,
            cost
        );
        
        if (!affordCheck.hasEnough) {
            return {
                title,
                canAfford: false,
                reason: affordCheck.reason,
                points: 0,
                efficiency: 0,
                retireHero
            };
        }
        
        // Calculate expected points from this title
        const pointsData = this.scorer.calculateTitlePoints(player, title);
        
        // DEFENSIVE CHECK: Ensure we got valid points data
        if (!pointsData || typeof pointsData.totalPoints !== 'number') {
            console.warn(`Invalid points calculation for title "${title.name}", defaulting to 0`);
            pointsData.totalPoints = 0;
        }
        
        // Calculate efficiency (points per resource cost)
        const totalCost = cost.military + cost.influence + cost.supplies + cost.piety;
        const efficiency = totalCost > 0 ? pointsData.totalPoints / totalCost : 0;
        
        // Determine which heroes to use for payment
        const heroesToUse = this.selectHeroesForPurchase(player, cost, retireHero);
        
        return {
            title,
            canAfford: true,
            points: pointsData.totalPoints,
            basePoints: pointsData.basePoints,
            legendBonus: pointsData.legendBonus,
            collectionSize: pointsData.collectionSize,
            efficiency,
            cost: totalCost,
            heroesToUse,
            retireHero
        };
    }

    /**
     * Evaluate all available heroes
     * @param {Object} player - Player object
     * @param {Array} heroMarket - Available heroes
     * @param {Object} gameState - Current game state
     * @returns {Array} Array of { hero, canAfford, value }
     */
    evaluateAllHeroes(player, heroMarket, gameState) {
        const options = [];
        
        // Check hand limit
        const currentHandSize = (player.hand || []).length;
        if (currentHandSize >= 5) {
            return []; // Can't buy heroes if hand is full
        }
        
        for (const hero of heroMarket) {
            try {
                const evaluation = this.evaluateHeroPurchase(player, hero, gameState);
                if (evaluation.canAfford) {
                    options.push(evaluation);
                }
            } catch (error) {
                console.warn(`Error evaluating hero "${hero.name}":`, error.message);
                // Continue to next hero instead of crashing
            }
        }
        
        return options;
    }

    /**
     * Evaluate a single hero purchase
     * @param {Object} player - Player object
     * @param {Object} hero - Hero to evaluate
     * @param {Object} gameState - Current game state
     * @returns {Object} { hero, canAfford, value, heroesToUse }
     */
    evaluateHeroPurchase(player, hero, gameState) {
        // DEFENSIVE CHECK: Ensure hero has required properties
        if (!hero || !hero.name) {
            throw new Error('Invalid hero object');
        }

        const availableResources = this.calculateAvailableResources(player);
        const cost = hero.cost || { military: 0, influence: 0, supplies: 0, piety: 0 };
        
        const affordCheck = this.validator.checkAffordability(availableResources, cost);
        
        if (!affordCheck.hasEnough) {
            return {
                hero,
                canAfford: false,
                reason: affordCheck.reason,
                value: 0
            };
        }
        
        // Calculate hero value (sum of positive resource stats)
        const value = Math.max(0, hero.military || 0) +
                     Math.max(0, hero.influence || 0) +
                     Math.max(0, hero.supplies || 0) +
                     Math.max(0, hero.piety || 0);
        
        // Select heroes to use for payment
        const heroesToUse = this.selectHeroesForPurchase(player, cost, null);
        
        return {
            hero,
            canAfford: true,
            value,
            heroesToUse
        };
    }

    /**
     * Calculate available resources from player's battlefield and hand
     * @param {Object} player - Player object
     * @returns {Object} Total available resources
     */
    calculateAvailableResources(player) {
        const totals = {
            military: 0,
            influence: 0,
            supplies: 0,
            piety: 0
        };
        
        // DEFENSIVE CHECK: Ensure battlefield exists
        if (player.battlefield) {
            // Add battlefield resources
            ['wei', 'wu', 'shu'].forEach(kingdom => {
                const cards = player.battlefield[kingdom];
                if (cards && Array.isArray(cards)) {
                    cards.forEach(hero => {
                        totals.military += hero.military || 0;
                        totals.influence += hero.influence || 0;
                        totals.supplies += hero.supplies || 0;
                        totals.piety += hero.piety || 0;
                    });
                }
            });
        }
        
        // DEFENSIVE CHECK: Ensure hand exists
        if (player.hand && Array.isArray(player.hand)) {
            // Add hand resources
            player.hand.forEach(hero => {
                totals.military += hero.military || 0;
                totals.influence += hero.influence || 0;
                totals.supplies += hero.supplies || 0;
                totals.piety += hero.piety || 0;
            });
        }
        
        return totals;
    }

    /**
     * Select which heroes to use for a purchase (greedy algorithm)
     * @param {Object} player - Player object
     * @param {Object} cost - Required resources
     * @param {Object} excludeHero - Hero that will be retired (don't use for payment)
     * @returns {Array} Selected heroes with kingdom property
     */
    selectHeroesForPurchase(player, cost, excludeHero) {
        const selected = [];
        const remaining = { ...cost };
        
        // Get all available heroes
        const availableHeroes = [];
        
        // DEFENSIVE CHECK: Ensure battlefield exists
        if (player.battlefield) {
            ['wei', 'wu', 'shu'].forEach(kingdom => {
                const cards = player.battlefield[kingdom];
                if (cards && Array.isArray(cards)) {
                    cards.forEach(hero => {
                        if (!excludeHero || hero.id !== excludeHero.id) {
                            availableHeroes.push({ ...hero, kingdom });
                        }
                    });
                }
            });
        }
        
        // DEFENSIVE CHECK: Ensure hand exists
        if (player.hand && Array.isArray(player.hand)) {
            player.hand.forEach(hero => {
                if (!excludeHero || hero.id !== excludeHero.id) {
                    availableHeroes.push({ ...hero, kingdom: null });
                }
            });
        }
        
        // Sort heroes by total value (prefer battlefield for column bonuses)
        availableHeroes.sort((a, b) => {
            const aValue = (a.military || 0) + (a.influence || 0) + (a.supplies || 0) + (a.piety || 0);
            const bValue = (b.military || 0) + (b.influence || 0) + (b.supplies || 0) + (b.piety || 0);
            if (a.kingdom && !b.kingdom) return -1;
            if (!a.kingdom && b.kingdom) return 1;
            return bValue - aValue;
        });
        
        // Greedy selection
        for (const hero of availableHeroes) {
            const needsMore = remaining.military > 0 || remaining.influence > 0 ||
                            remaining.supplies > 0 || remaining.piety > 0;
            
            if (!needsMore) break;
            
            selected.push(hero);
            remaining.military -= hero.military || 0;
            remaining.influence -= hero.influence || 0;
            remaining.supplies -= hero.supplies || 0;
            remaining.piety -= hero.piety || 0;
        }
        
        return selected;
    }

    /**
     * Execute a purchase (modifies player state)
     * @param {Object} player - Player object
     * @param {Object} decision - Purchase decision from makeAIPurchase
     * @param {Array} heroMarket - Hero market (to remove purchased hero)
     * @param {Array} titleMarket - Title market (to remove purchased title)
     */
    executePurchase(player, decision, heroMarket, titleMarket) {
        try {
            if (decision.action === 'pass') {
                return; // No purchase made
            }
            
            if (decision.action === 'title') {
                this.executeTitlePurchase(player, decision, titleMarket);
            } else if (decision.action === 'hero') {
                this.executeHeroPurchase(player, decision, heroMarket);
            }
        } catch (error) {
            console.error('Error executing purchase:', error);
            throw error;
        }
    }

    /**
     * Execute a title purchase
     */
    executeTitlePurchase(player, decision, titleMarket) {
        const { title, retireHero, points } = decision;
        
        // Add title to player's collection
        player.titles.push({
            title: title.name,
            points: points || 0
        });
        
        // Update player's score
        player.score += points || 0;
        
        // Retire the required hero
        if (retireHero) {
            this.retireHero(player, retireHero);
        }
        
        // Remove title from market
        const index = titleMarket.findIndex(t => t.id === title.id);
        if (index !== -1) {
            titleMarket.splice(index, 1);
        }
    }

    /**
     * Execute a hero purchase
     */
    executeHeroPurchase(player, decision, heroMarket) {
        const { hero } = decision;
        
        // Add hero to player's hand
        if (!player.hand) player.hand = [];
        player.hand.push(hero);
        
        // Remove hero from market
        const index = heroMarket.findIndex(h => h.id === hero.id);
        if (index !== -1) {
            heroMarket.splice(index, 1);
        }
    }

    /**
     * Retire a hero from player's collection
     */
    retireHero(player, hero) {
        // Remove from hand
        if (player.hand && Array.isArray(player.hand)) {
            const handIndex = player.hand.findIndex(h => h.id === hero.id);
            if (handIndex !== -1) {
                player.retired.push(player.hand.splice(handIndex, 1)[0]);
                return;
            }
        }
        
        // Remove from battlefield
        if (player.battlefield) {
            for (const kingdom of ['wei', 'wu', 'shu']) {
                const cards = player.battlefield[kingdom];
                if (cards && Array.isArray(cards)) {
                    const fieldIndex = cards.findIndex(h => h.id === hero.id);
                    if (fieldIndex !== -1) {
                        player.retired.push(cards.splice(fieldIndex, 1)[0]);
                        return;
                    }
                }
            }
        }
    }
}
