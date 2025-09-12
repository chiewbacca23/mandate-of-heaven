// purchase-manager.js - Purchase Logic Module

class PurchaseManager {
    constructor(gameEngine) {
        this.game = gameEngine;
    }

    get RESOURCE_ICONS() {
    return {
        military: '⚔️',
        influence: '📜', 
        supplies: '📦',
        piety: '🏛️'
        };
    }
    // Main purchase logic for a player
    makePurchase(player) {
        const preferTitles = this.game.turn > 2 || player.titlesPurchased.length < 2;
        let purchased = false;
        
        // Get current battlefield resources
        const currentResources = player.calculateBattlefieldResources();
        
        // Safety check
        if (!currentResources || typeof currentResources !== 'object') {
            this.game.log(`${player.name} has invalid battlefield resources - passing turn`, 'error');
            player.passedTurns++;
            player.returnCardsToHand();
            return false;
        }
        
        // Log purchase attempt with market analysis
        this.logPurchaseAttempt(player, currentResources);
        
        // Find immediately affordable options
        const affordableHeroes = this.getAffordableHeroes(player, currentResources);
        const affordableTitles = this.getAffordableTitles(player, currentResources);

        // Choose purchase target
        let target = null;
        if (preferTitles && affordableTitles.length > 0) {
            target = { type: 'title', item: this.chooseBestTitle(player, affordableTitles) };
        } else if (affordableHeroes.length > 0) {
            target = { type: 'hero', item: this.chooseBestHero(affordableHeroes) };
        } else if (affordableTitles.length > 0) {
            target = { type: 'title', item: this.chooseBestTitle(player, affordableTitles) };
        }

        if (target && target.item) {
            // Execute immediate purchase
            purchased = this.executePurchase(player, target, 0);
            if (purchased) {
            }
        } else {
            // Consider emergency resources for high-value targets
            const emergencyTarget = this.findEmergencyWorthyTarget(player);
            
            if (emergencyTarget && emergencyTarget.item && player.emergencyUsed < GAME_CONFIG.EMERGENCY_LIMIT) {
                purchased = this.attemptEmergencyPurchase(player, emergencyTarget, currentResources);
            }
            
            if (!purchased) {
                player.passedTurns++;
                this.game.log(`${player.name} passes turn - nothing affordable`);
            }
        }

        // Always return cards to hand
        player.returnCardsToHand();
        return purchased;
    }

    // Log detailed purchase attempt information
    logPurchaseAttempt(player, currentResources) {
        const heroMarketCosts = (this.game.heroMarket || []).map(h => {
            if (!h || !h.cost) return 'Invalid';
            const totalCost = (h.cost.military || 0) + (h.cost.influence || 0) + (h.cost.supplies || 0) + (h.cost.piety || 0);
            return `${h.name}(${totalCost})`;
        }).join(', ');
        
        const totalResources = (currentResources.military || 0) + (currentResources.influence || 0) + 
                              (currentResources.supplies || 0) + (currentResources.piety || 0);
        
        this.game.log(`${player.name} T${this.game.turn}: Resources=${totalResources}, Market=[${heroMarketCosts}]`, 'debug');
    }

    // Get heroes the player can afford
    getAffordableHeroes(player, resources) {
        return (this.game.heroMarket || []).filter(hero => 
            hero && hero.cost && player.canAfford(hero.cost, resources)
        );
    }

    // Get titles the player can afford and has heroes to retire for
    getAffordableTitles(player, resources) {
        return (this.game.titleMarket || []).filter(title => 
            title && title.cost && 
            player.canAfford(title.cost, resources) && 
            this.canRetireHeroForTitle(player, title)
        );
    }

    // Check if player has a hero they can retire for this title
    canRetireHeroForTitle(player, title) {
        const availableHeroes = [
            ...player.hand,
            ...Object.values(player.battlefield).flat()
        ].filter(card => !card.name.includes('Peasant'));
        
        return availableHeroes.length > 0;
    }

    // Choose best title based on potential points
    chooseBestTitle(player, titles) {
        if (!titles || titles.length === 0) return null;
        
        return titles.sort((a, b) => {
            const aScore = player.calculateTitleScore(a);
            const bScore = player.calculateTitleScore(b);
            return bScore.points - aScore.points;
        })[0];
    }

    // Choose best hero based on total resource value
    chooseBestHero(heroes) {
        if (!heroes || heroes.length === 0) return null;
        
        return heroes.sort((a, b) => {
            const aValue = this.calculateHeroValue(a);
            const bValue = this.calculateHeroValue(b);
            return bValue - aValue;
        })[0];
    }

    // Calculate total resource value of a hero
    calculateHeroValue(hero) {
        return Math.max(0, hero.military || 0) + 
               Math.max(0, hero.influence || 0) + 
               Math.max(0, hero.supplies || 0) + 
               Math.max(0, hero.piety || 0);
    }

    // Find targets worth using emergency resources for
    findEmergencyWorthyTarget(player) {
        // Only consider high-value titles or efficient heroes
        const valuableTitles = (this.game.titleMarket || []).filter(title => {
            if (!title || !this.canRetireHeroForTitle(player, title)) return false;
            try {
                const score = player.calculateTitleScore(title);
                return score && score.points >= 3; // Only for 3+ point titles
            } catch (error) {
                return false;
            }
        });
        
        const efficientHeroes = (this.game.heroMarket || []).filter(hero => {
            if (!hero) return false;
            try {
                const value = this.calculateHeroValue(hero);
                return value >= 6; // Only for 6+ total stat heroes
            } catch (error) {
                return false;
            }
        });
        
        if (valuableTitles.length > 0) {
            const bestTitle = this.chooseBestTitle(player, valuableTitles);
            return bestTitle ? { type: 'title', item: bestTitle } : null;
        } else if (efficientHeroes.length > 0) {
            const bestHero = this.chooseBestHero(efficientHeroes);
            return bestHero ? { type: 'hero', item: bestHero } : null;
        }
        
        return null;
    }

    // Attempt emergency purchase
    attemptEmergencyPurchase(player, target, currentResources) {
        const targetCost = target.cost || target.item.cost;
        const deficit = this.calculateResourceDeficit(targetCost, currentResources);
        
        this.game.log(`${player.name}: Considering emergency for ${target.item.name}, deficit: ${deficit.total}`, 'debug');
        
        // Only use emergency if deficit is reasonable (1-3 total resources)
        if (deficit && deficit.total <= 3 && deficit.total > 0) {
            player.emergencyUsed++;
            player.score -= 1;
            
            // Add strategic emergency resources
            const emergencyResources = this.calculateEmergencyBonus(deficit);
            if (emergencyResources && typeof emergencyResources === 'object') {
                const boostedResources = {...currentResources};
                
                // Apply emergency bonus
                ['military', 'influence', 'supplies', 'piety'].forEach(res => {
                    if (emergencyResources[res]) {
                        boostedResources[res] = (boostedResources[res] || 0) + emergencyResources[res];
                    }
                });
                
                if (targetCost && player.canAfford(targetCost, boostedResources)) {
                    const purchased = this.executePurchase(player, target, 1);
                    if (purchased) {
                        this.game.log(`${player.name} uses emergency (${this.formatEmergencyBonus(emergencyResources)}) for ${target.item.name}`);
                        return true;
                    }
                }
            }
        }
        
        return false;
    }

    // Calculate what resources the player is short
    calculateResourceDeficit(cost, currentResources) {
        const deficit = { military: 0, influence: 0, supplies: 0, piety: 0, total: 0 };
        
        if (!cost || typeof cost !== 'object' || !currentResources || typeof currentResources !== 'object') {
            return deficit;
        }
        
        ['military', 'influence', 'supplies', 'piety'].forEach(resource => {
            const needed = cost[resource] || 0;
            const available = currentResources[resource] || 0;
            const shortfall = Math.max(0, needed - available);
            deficit[resource] = shortfall;
            deficit.total += shortfall;
        });
        
        return deficit;
    }

    // Calculate emergency resource bonus
    calculateEmergencyBonus(deficit) {
        const bonus = { military: 0, influence: 0, supplies: 0, piety: 0 };
        
        if (!deficit || typeof deficit !== 'object') {
            // Default emergency bonus
            bonus.military = 1;
            bonus.influence = 1;
            return bonus;
        }
        
        // Emergency gives +1 to exactly two different resources
        const resourcesNeeded = Object.entries(deficit)
            .filter(([res, amount]) => res !== 'total' && amount > 0)
            .sort(([,a], [,b]) => b - a);
        
        if (resourcesNeeded.length >= 2) {
            // Cover the two biggest deficits
            bonus[resourcesNeeded[0][0]] = 1;
            bonus[resourcesNeeded[1][0]] = 1;
        } else if (resourcesNeeded.length === 1) {
            // Cover the deficit + add to leading resource
            bonus[resourcesNeeded[0][0]] = 1;
            const leadingRes = this.game.currentEvent?.leadingResource || 'influence';
            if (leadingRes !== resourcesNeeded[0][0]) {
                bonus[leadingRes] = 1;
            } else {
                bonus.influence = 1;
            }
        } else {
            // Default bonus
            bonus.military = 1;
            bonus.influence = 1;
        }
        
        return bonus;
    }

    // Format emergency bonus for display
    formatEmergencyBonus(bonus) {
        return Object.entries(bonus)
            .filter(([,amount]) => amount > 0)
            .map(([res, amount]) => `+${amount}${RESOURCE_ICONS[res]}`)
            .join(' ');
    }

    // Execute the actual purchase
    executePurchase(player, target, emergencyUsed) {
        if (target.type === 'title') {
            return this.purchaseTitle(player, target.item, emergencyUsed);
        } else {
            return this.purchaseHero(player, target.item, emergencyUsed);
        }
    }

    // Purchase a title and retire a hero
    purchaseTitle(player, title, emergencyUsed) {
        const heroToRetire = this.findHeroToRetire(player, title);
        if (!heroToRetire) return false;

        // Remove hero from player's collection
        this.removeHeroFromCollection(player, heroToRetire);
        player.retiredHeroes.push(heroToRetire);
        
        // Add title to player's collection
        const titleEntry = {
            ...title,
            retiredHero: heroToRetire
        };
        player.titlesPurchased.push(titleEntry);

        // Remove title from market
        this.game.titleMarket = this.game.titleMarket.filter(t => t.id !== title.id);

        const emergencyText = emergencyUsed > 0 ? ` (${emergencyUsed} emergency used)` : '';
        this.game.log(`${player.name} purchases title "${title.name}" retiring ${heroToRetire.name}${emergencyText}`);
        return true;
    }

    // Purchase a hero and add to hand
    purchaseHero(player, hero, emergencyUsed) {
        // Add hero to player's hand
        player.hand.push({...hero});

        // Remove from market and track purchase
        this.game.heroMarket = this.game.heroMarket.filter(h => h.id !== hero.id);
        this.game.purchasedHeroes.push(hero);

        const emergencyText = emergencyUsed > 0 ? ` (${emergencyUsed} emergency used)` : '';
        this.game.log(`${player.name} purchases ${hero.name}${emergencyText}`);
        return true;
    }

    // Find a hero the player can retire for this title
    findHeroToRetire(player, title) {
        const availableHeroes = [
            ...player.hand,
            ...Object.values(player.battlefield).flat()
        ].filter(card => !card.name.includes('Peasant'));
        
        // For now, just retire the first available hero
        // Could be made smarter based on title requirements
        return availableHeroes.length > 0 ? availableHeroes[0] : null;
    }

    // Remove hero from player's collection
    removeHeroFromCollection(player, hero) {
        // Remove from hand first
        let index = player.hand.indexOf(hero);
        if (index > -1) {
            player.hand.splice(index, 1);
            return;
        }

        // Remove from battlefield
        for (const kingdom of ['wei', 'wu', 'shu']) {
            index = player.battlefield[kingdom].indexOf(hero);
            if (index > -1) {
                player.battlefield[kingdom].splice(index, 1);
                return;
            }
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PurchaseManager };
}
