// player.js - Player Class Module

class Player {
    constructor(id, name, game) {
        this.id = id;
        this.name = name;
        this.game = game;
        this.hand = [];
        this.battlefield = { wei: [], wu: [], shu: [] };
        this.titlesPurchased = [];
        this.retiredHeroes = [];
        this.score = 0;
        this.emergencyUsed = 0;
        this.passedTurns = 0;
    }

    // Add starting peasants to hand
    addPeasants() {
        const peasantTypes = ['military', 'influence', 'supplies', 'piety'];
        peasantTypes.forEach((type) => {
            const peasant = this.createPeasant(type);
            this.hand.push(peasant);
        });
    }

    // Create a peasant card
    createPeasant(type) {
        const peasant = {
            id: `peasant_${type}_${this.id}`,
            name: `${type.charAt(0).toUpperCase() + type.slice(1)} Peasant`,
            allegiance: 'Peasant',
            role: 'Peasant',
            military: 0,
            influence: 0,
            supplies: 0,
            piety: 0
        };
        peasant[type] = 2;
        return peasant;
    }

    // Calculate resources on battlefield including column bonuses
    getBattlefieldResources() {
        const resources = {
            military: 0,
            influence: 0,
            supplies: 0,
            piety: 0
        };
    
        // Sum resources from all cards on battlefield (including peasants!)
        ['wei', 'wu', 'shu'].forEach(kingdom => {
            this.battlefield[kingdom].forEach(card => {
                // Make sure we're reading the card properties correctly
                resources.military += (card.military || 0);
                resources.influence += (card.influence || 0);
                resources.supplies += (card.supplies || 0);
                resources.piety += (card.piety || 0);
            });
        });
    
        // Add kingdom bonuses for 2+ cards in same kingdom
        if (this.battlefield.wei.length >= 2) {
            resources.influence += 1; // Wei bonus
        }
        if (this.battlefield.wu.length >= 2) {
            resources.supplies += 1; // Wu bonus  
        }
        if (this.battlefield.shu.length >= 2) {
            resources.piety += 1; // Shu bonus
        }
    
        // Debug log to verify calculation (remove this after testing)
        if (this.battlefield.wei.length > 0 || this.battlefield.wu.length > 0 || this.battlefield.shu.length > 0) {
            console.log(`${this.name} battlefield calculation:`, {
                cards: {
                    wei: this.battlefield.wei.map(c => `${c.name}(M:${c.military||0})`),
                    wu: this.battlefield.wu.map(c => `${c.name}(M:${c.military||0})`), 
                    shu: this.battlefield.shu.map(c => `${c.name}(M:${c.military||0})`)
                },
                totalResources: resources
            });
        }
    
        return resources;
    }

    // Calculate total resources from all owned heroes (for end-game majorities)
    calculateTotalResources() {
        const resources = { military: 0, influence: 0, supplies: 0, piety: 0 };
        
        // Only count positive values for majorities
        this.getAllHeroes().forEach(hero => {
            resources.military += Math.max(0, hero.military || 0);
            resources.influence += Math.max(0, hero.influence || 0);
            resources.supplies += Math.max(0, hero.supplies || 0);
            resources.piety += Math.max(0, hero.piety || 0);
        });
        
        return resources;
    }

    // Get all heroes owned by this player (excluding peasants)
    getAllHeroes() {
        return [
            ...this.hand,
            ...Object.values(this.battlefield).flat(),
            ...this.retiredHeroes
        ].filter(card => !card.name.includes('Peasant'));
    }

    // Check if player can afford a given cost
    canAfford(cost, resources) {
        if (!cost || typeof cost !== 'object') return false;
        if (!resources || typeof resources !== 'object') return false;
        
        const resourceTypes = ['military', 'influence', 'supplies', 'piety'];
        return resourceTypes.every(resource => {
            const needed = cost[resource] || 0;
            const available = resources[resource] || 0;
            return available >= needed;
        });
    }

    // Simple card deployment (for testing)
    deployCards(strategy = 'balanced') {
        const maxCards = Math.min(3, this.hand.length);
        if (maxCards === 0) return;

        // Simple deployment: take first 3 cards and place randomly
        const cardsToPlay = this.hand.slice(0, maxCards);
        const kingdoms = ['wei', 'wu', 'shu'];
        
        const deployed = [];
        cardsToPlay.forEach(card => {
            // Find kingdom with space
            const availableKingdoms = kingdoms.filter(k => 
                this.battlefield[k].length < GAME_CONFIG.MAX_BATTLEFIELD_CARDS
            );
            
            if (availableKingdoms.length > 0) {
                const kingdom = availableKingdoms[Math.floor(Math.random() * availableKingdoms.length)];
                this.battlefield[kingdom].push(card);
                this.hand.splice(this.hand.indexOf(card), 1);
                deployed.push(`${card.name} → ${kingdom.toUpperCase()}`);
            }
        });

        if (deployed.length > 0 && this.game && this.game.log) {
            this.game.log(`${this.name} deploys: ${deployed.join(', ')}`);
            
            const resources = this.calculateBattlefieldResources();
            const resourceDisplay = Object.entries(resources)
                .map(([res, val]) => `${RESOURCE_ICONS[res]}${val}`)
                .join(' ');
            this.game.log(`  Resources: ${resourceDisplay}`);
        }
    }

    // Return all battlefield cards to hand
    returnCardsToHand() {
        Object.keys(this.battlefield).forEach(kingdom => {
            this.hand.push(...this.battlefield[kingdom]);
            this.battlefield[kingdom] = [];
        });
    }

    // Calculate final score at end of game
    calculateFinalScore() {
        this.score = -this.emergencyUsed; // Start with emergency penalty
        
        // Add title points based on current collections
        this.titlesPurchased.forEach(title => {
            const titleScore = this.calculateTitleScore(title);
            this.score += titleScore.points;
        });
    }

    // Calculate points for a specific title based on collection
    calculateTitleScore(title) {
        // Simplified version - just return base points for now
        // This will be expanded with proper set scoring logic
        return {
            collectionSize: this.getAllHeroes().length,
            points: title.points ? title.points[0] || 0 : 0
        };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Player };
}
