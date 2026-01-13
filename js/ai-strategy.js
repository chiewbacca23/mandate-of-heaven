// ai-strategy.js
// AI decision-making for purchasing titles and heroes

export class AIStrategy {
    constructor(heroesData, titlesData) {
        this.heroesData = heroesData;
        this.titlesData = titlesData;
    }

    /**
     * Choose best purchase from available options
     * @param {Array} titleOptions - Evaluated title options
     * @param {Array} heroOptions - Evaluated hero options
     * @param {Object} player - Player object
     * @param {Object} gameState - Current game state
     * @returns {Object} { action: 'hero'|'title'|'pass', target: Object, ... }
     */
    chooseBestPurchase(titleOptions, heroOptions, player, gameState) {
        const currentTurn = gameState.turn || 1;
        
        // DEFENSIVE CHECK: Ensure options arrays exist
        const validTitleOptions = Array.isArray(titleOptions) ? titleOptions : [];
        const validHeroOptions = Array.isArray(heroOptions) ? heroOptions : [];
        
        // Get best options
        const bestTitle = validTitleOptions[0];
        const bestHero = validHeroOptions[0];
        
        // Early game (turns 1-3): Prefer heroes to build collection
        if (currentTurn <= 3) {
            if (bestHero && bestHero.value > 5) {
                return {
                    action: 'hero',
                    target: bestHero.hero,
                    heroesToUse: bestHero.heroesToUse
                };
            }
            
            if (bestTitle && bestTitle.points > 6) {
                return {
                    action: 'title',
                    target: bestTitle.title,
                    heroesToUse: bestTitle.heroesToUse,
                    retireHero: bestTitle.retireHero,
                    points: bestTitle.points
                };
            }
        }
        
        // Late game (turns 7-8): Prioritize titles for points
        if (currentTurn >= 7) {
            if (bestTitle && bestTitle.points > 3) {
                return {
                    action: 'title',
                    target: bestTitle.title,
                    heroesToUse: bestTitle.heroesToUse,
                    retireHero: bestTitle.retireHero,
                    points: bestTitle.points
                };
            }
            
            if (bestHero && bestHero.value > 3) {
                return {
                    action: 'hero',
                    target: bestHero.hero,
                    heroesToUse: bestHero.heroesToUse
                };
            }
        }
        
        // Mid game (turns 4-6): Compare efficiency
        if (bestTitle && bestHero) {
            // Compare efficiency: title points vs hero value
            const titleScore = bestTitle.efficiency * 10;
            const heroScore = bestHero.value;
            
            if (titleScore > heroScore) {
                return {
                    action: 'title',
                    target: bestTitle.title,
                    heroesToUse: bestTitle.heroesToUse,
                    retireHero: bestTitle.retireHero,
                    points: bestTitle.points
                };
            } else {
                return {
                    action: 'hero',
                    target: bestHero.hero,
                    heroesToUse: bestHero.heroesToUse
                };
            }
        }
        
        // Only one type available
        if (bestTitle) {
            return {
                action: 'title',
                target: bestTitle.title,
                heroesToUse: bestTitle.heroesToUse,
                retireHero: bestTitle.retireHero,
                points: bestTitle.points
            };
        }
        
        if (bestHero) {
            return {
                action: 'hero',
                target: bestHero.hero,
                heroesToUse: bestHero.heroesToUse
            };
        }
        
        // Nothing affordable - pass
        return {
            action: 'pass',
            reason: 'No affordable options'
        };
    }

    /**
     * Evaluate a title purchase option (used by PurchaseManager)
     * @param {Object} titleEvaluation - Pre-evaluated title from PurchaseManager
     * @returns {number} Score for this title
     */
    scoreTitleOption(titleEvaluation) {
        if (!titleEvaluation.canAfford) return 0;
        
        let score = 0;
        
        // Base score from points
        score += titleEvaluation.points * 2;
        
        // Efficiency bonus
        score += titleEvaluation.efficiency * 3;
        
        // Legendary bonus
        if (titleEvaluation.basePoints !== titleEvaluation.points) {
            score += 2; // Has legend bonus
        }
        
        return score;
    }

    /**
     * Evaluate a hero purchase option (used by PurchaseManager)
     * @param {Object} heroEvaluation - Pre-evaluated hero from PurchaseManager
     * @returns {number} Score for this hero
     */
    scoreHeroOption(heroEvaluation) {
        if (!heroEvaluation.canAfford) return 0;
        
        let score = heroEvaluation.value;
        
        // Bonus for high-stat heroes
        if (heroEvaluation.value > 8) {
            score += 2;
        }
        
        return score;
    }
}
