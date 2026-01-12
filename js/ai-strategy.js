// ai-strategy.js
// AI decision-making for purchasing titles and heroes

import { PurchaseValidator } from './purchase-validator.js';
import { CollectionScorer } from './collection-scorer.js';

export class AIStrategy {
    constructor(heroesData, titlesData) {
        this.validator = new PurchaseValidator(heroesData);
        this.scorer = new CollectionScorer(heroesData, titlesData);
        this.heroesData = heroesData;
        this.titlesData = titlesData;
    }

    /**
     * Decide what to purchase this turn
     * @param {Object} player - Player object
     * @param {Array} availableHeroes - Heroes in the market
     * @param {Array} availableTitles - Titles in the market
     * @param {Object} gameState - Current game state (turn, phase, etc.)
     * @returns {Object} { action: 'hero'|'title'|'pass', target: Object, heroes: Array }
     */
    decidePurchase(player, availableHeroes, availableTitles, gameState) {
        // Strategy: Prioritize titles with good efficiency, but build hero collection early
        
        // 1. Evaluate title opportunities
        const titleOpportunities = this.evaluateTitleOpportunities(player, availableTitles);
        
        // 2. Evaluate hero opportunities
        const heroOpportunities = this.evaluateHeroOpportunities(player, availableHeroes, availableTitles);
        
        // 3. Decide between title and hero purchase
        const decision = this.makeDecision(player, titleOpportunities, heroOpportunities, gameState);
        
        return decision;
    }

    /**
     * Evaluate all available titles
     */
    evaluateTitleOpportunities(player, availableTitles) {
        const opportunities = [];
        
        for (const title of availableTitles) {
            // Skip if already purchased
            if (player.titles.some(t => t.id === title.id)) {
                continue;
            }

            // Get all possible hero combinations from battlefield
            const heroCombinations = this.getHeroCombinations(player);
            
            let bestOption = null;
            let bestScore = -Infinity;
            
            for (const combo of heroCombinations) {
                const validation = this.validator.canPurchaseTitle(player, title, combo.heroes);
                
                if (validation.canPurchase) {
                    // Calculate points this title would give
                    const pointsCalc = this.scorer.calculateTitlePoints(player, title);
                    
                    // Calculate efficiency: points per resource cost
                    const efficiency = pointsCalc.totalPoints / title.total_cost;
                    
                    // Factor in column bonuses
                    const columnBonuses = this.validator.calculateColumnBonuses(combo.heroes);
                    const effectiveCost = title.total_cost - this.sumResources(columnBonuses);
                    const adjustedEfficiency = pointsCalc.totalPoints / Math.max(1, effectiveCost);
                    
                    const score = this.scoreOpportunity(
                        pointsCalc.totalPoints,
                        adjustedEfficiency,
                        title,
                        combo.heroes,
                        validation.retirementHero
                    );
                    
                    if (score > bestScore) {
                        bestScore = score;
                        bestOption = {
                            title,
                            heroes: combo.heroes,
                            retirementHero: validation.retirementHero,
                            points: pointsCalc.totalPoints,
                            efficiency: adjustedEfficiency,
                            score,
                            columnBonuses
                        };
                    }
                }
            }
            
            if (bestOption) {
                opportunities.push(bestOption);
            }
        }
        
        // Sort by score descending
        opportunities.sort((a, b) => b.score - a.score);
        
        return opportunities;
    }

    /**
     * Evaluate hero purchase opportunities
     */
    evaluateHeroOpportunities(player, availableHeroes, availableTitles) {
        const opportunities = [];
        
        for (const hero of availableHeroes) {
            // Calculate cost
            const cost = this.calculateHeroCost(hero);
            
            // Calculate value: how much this hero helps with future titles
            const value = this.calculateHeroValue(player, hero, availableTitles);
            
            // Check if affordable with current battlefield
            const heroCombos = this.getHeroCombinations(player);
            let affordable = false;
            let bestCombo = null;
            
            for (const combo of heroCombos) {
                const resources = this.calculateTotalResources(combo.heroes);
                const columnBonuses = this.validator.calculateColumnBonuses(combo.heroes);
                const totalResources = this.addResources(resources, columnBonuses);
                
                if (this.canAffordHero(hero, totalResources)) {
                    affordable = true;
                    bestCombo = combo.heroes;
                    break;
                }
            }
            
            if (affordable) {
                opportunities.push({
                    hero,
                    heroes: bestCombo,
                    cost,
                    value,
                    score: value / Math.max(1, cost)
                });
            }
        }
        
        // Sort by score descending
        opportunities.sort((a, b) => b.score - a.score);
        
        return opportunities;
    }

    /**
     * Make final decision between purchasing hero, title, or passing
     */
    makeDecision(player, titleOpps, heroOpps, gameState) {
        const currentTurn = gameState.turn || 1;
        const maxTurns = 8;
        const turnsRemaining = maxTurns - currentTurn;
        
        // Early game (turns 1-3): Prioritize hero collection
        // Mid game (turns 4-6): Balance between heroes and good titles
        // Late game (turns 7-8): Prioritize titles to maximize points
        
        const bestTitle = titleOpps[0];
        const bestHero = heroOpps[0];
        
        // Early game bias toward heroes
        if (currentTurn <= 3) {
            if (bestHero && bestHero.score > 0.8) {
                return {
                    action: 'hero',
                    target: bestHero.hero,
                    heroes: bestHero.heroes
                };
            }
            
            if (bestTitle && bestTitle.score > 8) {
                return {
                    action: 'title',
                    target: bestTitle.title,
                    heroes: bestTitle.heroes,
                    retirementHero: bestTitle.retirementHero
                };
            }
        }
        
        // Late game bias toward titles
        if (currentTurn >= 7) {
            if (bestTitle && bestTitle.score > 3) {
                return {
                    action: 'title',
                    target: bestTitle.title,
                    heroes: bestTitle.heroes,
                    retirementHero: bestTitle.retirementHero
                };
            }
        }
        
        // Mid game: compare opportunities directly
        if (bestTitle && bestHero) {
            // Normalize scores for comparison
            const titleScore = bestTitle.score;
            const heroScore = bestHero.score * 5; // Weight hero value
            
            if (titleScore > heroScore) {
                return {
                    action: 'title',
                    target: bestTitle.title,
                    heroes: bestTitle.heroes,
                    retirementHero: bestTitle.retirementHero
                };
            } else {
                return {
                    action: 'hero',
                    target: bestHero.hero,
                    heroes: bestHero.heroes
                };
            }
        }
        
        // Only title available
        if (bestTitle) {
            return {
                action: 'title',
                target: bestTitle.title,
                heroes: bestTitle.heroes,
                retirementHero: bestTitle.retirementHero
            };
        }
        
        // Only hero available
        if (bestHero) {
            return {
                action: 'hero',
                target: bestHero.hero,
                heroes: bestHero.heroes
            };
        }
        
        // Consider emergency resources as last resort
        if (this.shouldUseEmergency(player, gameState)) {
            // Try titles again with emergency resources
            const emergencyTitleOpps = this.evaluateTitlesWithEmergency(player, titleOpps);
            if (emergencyTitleOpps && emergencyTitleOpps.score > 5) {
                return {
                    action: 'title',
                    target: emergencyTitleOpps.title,
                    heroes: emergencyTitleOpps.heroes,
                    retirementHero: emergencyTitleOpps.retirementHero,
                    useEmergency: true
                };
            }
        }
        
        // Pass if nothing good available
        return {
            action: 'pass'
        };
    }

    /**
     * Generate all possible hero combinations from battlefield
     */
    getHeroCombinations(player) {
        // Get all heroes on battlefield
        const allBattlefieldHeroes = [
            ...player.battlefield.wei.map(h => ({ ...h, kingdom: 'wei' })),
            ...player.battlefield.wu.map(h => ({ ...h, kingdom: 'wu' })),
            ...player.battlefield.shu.map(h => ({ ...h, kingdom: 'shu' }))
        ];
        
        if (allBattlefieldHeroes.length === 0) {
            return [];
        }
        
        const combos = [];
        
        // Generate all possible subsets
        const n = allBattlefieldHeroes.length;
        for (let i = 1; i < (1 << n); i++) {
            const combo = [];
            for (let j = 0; j < n; j++) {
                if (i & (1 << j)) {
                    combo.push(allBattlefieldHeroes[j]);
                }
            }
            combos.push({ heroes: combo });
        }
        
        return combos;
    }

    /**
     * Score an opportunity (higher is better)
     */
    scoreOpportunity(points, efficiency, title, heroes, retirementHero) {
        let score = points * 2; // Base score from points
        
        // Efficiency bonus
        score += efficiency * 3;
        
        // Legendary bonus
        if (title.is_legendary) {
            score += 2;
        }
        
        // Penalty for retiring valuable heroes
        if (retirementHero) {
            const heroValue = this.calculateSingleHeroValue(retirementHero);
            score -= heroValue * 0.5;
        }
        
        return score;
    }

    /**
     * Calculate hero cost (considering negative values)
     */
    calculateHeroCost(hero) {
        return Math.max(0, hero.military) +
               Math.max(0, hero.influence) +
               Math.max(0, hero.supplies) +
               Math.max(0, hero.piety);
    }

    /**
     * Calculate hero value (how much it helps with future titles)
     */
    calculateHeroValue(player, hero, availableTitles) {
        let value = 0;
        
        // Check how many titles this hero would unlock or improve
        for (const title of availableTitles) {
            // Skip already purchased
            if (player.titles.some(t => t.id === title.id)) continue;
            
            // Test if adding this hero would unlock the title
            const testPlayer = { ...player };
            testPlayer.hand = [...player.hand, hero];
            
            const validation = this.validator.meetsHeroRequirement(testPlayer, title);
            if (validation.meets) {
                value += title.total_cost * 0.5; // Value proportional to title cost
            }
        }
        
        // Add intrinsic value based on resources
        value += (hero.military + hero.influence + hero.supplies + hero.piety) * 0.2;
        
        // Bonus for legendary heroes
        if (this.isLegendaryHero(hero)) {
            value += 3;
        }
        
        return value;
    }

    /**
     * Calculate single hero's intrinsic value
     */
    calculateSingleHeroValue(hero) {
        let value = 0;
        
        // Resource value
        value += Math.max(0, hero.military) * 0.3;
        value += Math.max(0, hero.influence) * 0.3;
        value += Math.max(0, hero.supplies) * 0.3;
        value += Math.max(0, hero.piety) * 0.3;
        
        // Legendary bonus
        if (this.isLegendaryHero(hero)) {
            value += 2;
        }
        
        // Dual-role bonus
        if (hero.roles.length >= 2) {
            value += 1;
        }
        
        return value;
    }

    /**
     * Check if hero is named in any legendary title
     */
    isLegendaryHero(hero) {
        for (const title of this.titlesData) {
            if (title.is_legendary && title.named_legends) {
                if (title.named_legends.some(name => 
                    name.toLowerCase() === hero.name.toLowerCase()
                )) {
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * Calculate total resources from hero list
     */
    calculateTotalResources(heroes) {
        return heroes.reduce((total, hero) => ({
            military: total.military + hero.military,
            influence: total.influence + hero.influence,
            supplies: total.supplies + hero.supplies,
            piety: total.piety + hero.piety
        }), { military: 0, influence: 0, supplies: 0, piety: 0 });
    }

    /**
     * Add two resource objects
     */
    addResources(r1, r2) {
        return {
            military: r1.military + r2.military,
            influence: r1.influence + r2.influence,
            supplies: r1.supplies + r2.supplies,
            piety: r1.piety + r2.piety
        };
    }

    /**
     * Sum all resources in an object
     */
    sumResources(resources) {
        return resources.military + resources.influence + resources.supplies + resources.piety;
    }

    /**
     * Check if player can afford a hero with given resources
     */
    canAffordHero(hero, resources) {
        const cost = {
            military: Math.max(0, hero.military),
            influence: Math.max(0, hero.influence),
            supplies: Math.max(0, hero.supplies),
            piety: Math.max(0, hero.piety)
        };
        
        return resources.military >= cost.military &&
               resources.influence >= cost.influence &&
               resources.supplies >= cost.supplies &&
               resources.piety >= cost.piety;
    }

    /**
     * Decide if emergency resources should be used
     */
    shouldUseEmergency(player, gameState) {
        const emergencyCount = player.emergencyUsed || 0;
        const currentTurn = gameState.turn || 1;
        
        // Only use emergency if:
        // 1. Haven't used too many already (limit 3)
        // 2. It's late game (turn 6+) OR there's a really good opportunity
        
        return emergencyCount < 3 && currentTurn >= 6;
    }

    /**
     * Re-evaluate titles assuming emergency resources are used
     */
    evaluateTitlesWithEmergency(player, titleOpps) {
        // For now, just take the best opportunity and assume it can be afforded
        // In a full implementation, this would add emergency resources to the calculation
        
        if (titleOpps.length > 0) {
            const best = titleOpps[0];
            if (best.score > 4) {
                return best;
            }
        }
        
        return null;
    }
}
