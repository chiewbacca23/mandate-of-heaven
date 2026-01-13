// collection-scorer.js
// Calculates points from title set collection including legendary bonuses

export class CollectionScorer {
    constructor(heroesData, titlesData) {
        this.heroesData = heroesData;
        this.titlesData = titlesData;
        this.heroesById = new Map(heroesData.map(h => [h.id, h]));
        this.heroesByName = new Map(heroesData.map(h => [h.name.toLowerCase(), h]));
    }

    /**
     * Calculate total points for a purchased title based on player's collection
     * @param {Object} player - Player object with all owned heroes
     * @param {Object} title - Title object with set requirements
     * @returns {Object} { basePoints: number, legendBonus: number, totalPoints: number, collectionSize: number }
     */
    calculateTitlePoints(player, title) {
        // Get all heroes player owns (hand + battlefield + retired)
        const allHeroes = this.getAllPlayerHeroes(player);
        
        // Count how many heroes match the set requirement
        const collectionSize = this.countMatchingHeroes(allHeroes, title);
        
        // Get the points array (with defensive check)
        const pointsArray = title.pointsArray || title.setScoring;
        
        // DEFENSIVE CHECK: If no points array exists, return 0 points
        if (!pointsArray || !Array.isArray(pointsArray)) {
            console.warn(`Title "${title.name}" has no valid points array, defaulting to 0 points`);
            return {
                basePoints: 0,
                legendBonus: 0,
                totalPoints: 0,
                collectionSize: 0
            };
        }
        
        // Get base points from the array
        const index = Math.min(collectionSize, pointsArray.length - 1);
        const basePoints = pointsArray[index] || 0;
        
        // Calculate legendary bonus if applicable
        let legendBonus = 0;
        if (title.legendaryHeroes && Array.isArray(title.legendaryHeroes) && title.legendaryHeroes.length > 0) {
            legendBonus = this.countLegendaryHeroes(allHeroes, title.legendaryHeroes);
        }
        
        return {
            basePoints,
            legendBonus,
            totalPoints: basePoints + legendBonus,
            collectionSize
        };
    }

    /**
     * Count how many of player's heroes match the title's set requirement
     * @param {Array} allHeroes - All heroes owned by player
     * @param {Object} title - Title with set requirements
     * @returns {number} Count of matching heroes
     */
    countMatchingHeroes(allHeroes, title) {
        // Parse the set requirement
        const setReq = this.parseSetRequirement(title.setRequirement);
        
        if (!setReq) {
            console.warn(`Could not parse set requirement for title: ${title.name}`);
            return 0;
        }
        
        // Count heroes that match
        return allHeroes.filter(hero => this.heroMatchesSetRequirement(hero, setReq)).length;
    }

    /**
     * Parse a set requirement string into structured data
     * @param {string} requirement - e.g., "Generals from Wei"
     * @returns {Object|null} Structured requirement
     */
    parseSetRequirement(requirement) {
        if (!requirement) return null;
        
        const req = requirement.toLowerCase();
        
        // Check for role requirements
        const roles = [];
        if (req.includes('general')) roles.push('general');
        if (req.includes('advisor')) roles.push('advisor');
        if (req.includes('tactician')) roles.push('tactician');
        if (req.includes('administrator')) roles.push('administrator');
        
        // Check for allegiance requirements
        const allegiances = [];
        if (req.includes('wei')) allegiances.push('wei');
        if (req.includes('wu')) allegiances.push('wu');
        if (req.includes('shu')) allegiances.push('shu');
        if (req.includes('han')) allegiances.push('han');
        if (req.includes('rebels')) allegiances.push('rebels');
        if (req.includes('coalition')) allegiances.push('coalition');
        if (req.includes('dong zhuo')) allegiances.push('dong zhuo');
        
        // Check for resource requirements
        let resourceThreshold = null;
        const resourceMatch = req.match(/(\d+)\+?\s*(military|influence|supplies|piety)/);
        if (resourceMatch) {
            resourceThreshold = {
                value: parseInt(resourceMatch[1]),
                type: resourceMatch[2]
            };
        }
        
        // Check for dual-role requirement
        const dualRole = req.includes('dual-role');
        
        // Check for female requirement
        const female = req.includes('female');
        
        return {
            roles,
            allegiances,
            resourceThreshold,
            dualRole,
            female
        };
    }

    /**
     * Check if a hero matches a set requirement
     * @param {Object} hero - Hero object
     * @param {Object} setReq - Parsed set requirement
     * @returns {boolean} True if hero matches
     */
    heroMatchesSetRequirement(hero, setReq) {
        // Check role requirement
        if (setReq.roles.length > 0) {
            const heroRoles = [];
            if (hero.role) heroRoles.push(hero.role.toLowerCase());
            if (hero.role2) heroRoles.push(hero.role2.toLowerCase());
            
            const matchesRole = setReq.roles.some(reqRole => heroRoles.includes(reqRole));
            if (!matchesRole) return false;
        }
        
        // Check allegiance requirement
        if (setReq.allegiances.length > 0) {
            const heroAllegiance = (hero.allegiance || '').toLowerCase();
            const matchesAllegiance = setReq.allegiances.includes(heroAllegiance);
            if (!matchesAllegiance) return false;
        }
        
        // Check resource threshold
        if (setReq.resourceThreshold) {
            const { value, type } = setReq.resourceThreshold;
            const heroValue = hero[type] || 0;
            if (heroValue < value) return false;
        }
        
        // Check dual-role requirement
        if (setReq.dualRole && !hero.role2) {
            return false;
        }
        
        // Check female requirement
        if (setReq.female && !hero.female) {
            return false;
        }
        
        return true;
    }

    /**
     * Count how many legendary heroes the player owns
     * @param {Array} allHeroes - All heroes owned by player
     * @param {Array} legendNames - Array of legendary hero names
     * @returns {number} Count of owned legendaries
     */
    countLegendaryHeroes(allHeroes, legendNames) {
        if (!legendNames || !Array.isArray(legendNames)) return 0;
        
        return legendNames.filter(legendName => {
            const normalizedName = legendName.toLowerCase();
            return allHeroes.some(hero => 
                hero.name.toLowerCase() === normalizedName
            );
        }).length;
    }

    /**
     * Get all heroes owned by player (hand + battlefield + retired)
     * @param {Object} player - Player object
     * @returns {Array} All hero objects
     */
    getAllPlayerHeroes(player) {
        const heroes = [];
        
        // Add heroes from hand
        if (player.hand && Array.isArray(player.hand)) {
            heroes.push(...player.hand);
        }
        
        // Add heroes from battlefield
        if (player.battlefield) {
            if (player.battlefield.wei && Array.isArray(player.battlefield.wei)) {
                heroes.push(...player.battlefield.wei);
            }
            if (player.battlefield.wu && Array.isArray(player.battlefield.wu)) {
                heroes.push(...player.battlefield.wu);
            }
            if (player.battlefield.shu && Array.isArray(player.battlefield.shu)) {
                heroes.push(...player.battlefield.shu);
            }
        }
        
        // Add retired heroes
        if (player.retired && Array.isArray(player.retired)) {
            heroes.push(...player.retired);
        }
        
        return heroes;
    }

    /**
     * Calculate final game score including title points and bonuses
     * @param {Object} player - Player object
     * @param {Array} events - All events from the game
     * @returns {Object} Score breakdown
     */
    calculateFinalScore(player, events) {
        // Sum up all title points
        const titlePoints = player.titles.reduce((sum, titleData) => {
            return sum + (titleData.points || 0);
        }, 0);
        
        // Calculate resource majority bonuses
        const majorityBonus = this.calculateMajorityBonus(player, events);
        
        // Apply emergency resource penalty
        const emergencyPenalty = player.emergencyUsed || 0;
        
        // Calculate final score
        const finalScore = titlePoints + majorityBonus - emergencyPenalty;
        
        return {
            titlePoints,
            majorityBonus,
            emergencyPenalty,
            finalScore
        };
    }

    /**
     * Calculate bonus points from resource majorities
     * @param {Object} player - Player object
     * @param {Array} events - All events from the game
     * @returns {number} Bonus points
     */
    calculateMajorityBonus(player, events) {
        if (!events || events.length === 0) return 0;
        
        // Count frequency of each resource type in events
        const resourceFrequency = {
            military: 0,
            influence: 0,
            supplies: 0,
            piety: 0
        };
        
        events.forEach(event => {
            const leadingResource = (event.leadingResource || '').toLowerCase();
            if (resourceFrequency.hasOwnProperty(leadingResource)) {
                resourceFrequency[leadingResource]++;
            }
        });
        
        // Get player's total resources across all heroes
        const allHeroes = this.getAllPlayerHeroes(player);
        const playerTotals = {
            military: 0,
            influence: 0,
            supplies: 0,
            piety: 0
        };
        
        allHeroes.forEach(hero => {
            playerTotals.military += hero.military || 0;
            playerTotals.influence += hero.influence || 0;
            playerTotals.supplies += hero.supplies || 0;
            playerTotals.piety += hero.piety || 0;
        });
        
        // For now, award bonus equal to event frequency
        // (In multi-player, this would compare against other players)
        let bonus = 0;
        Object.keys(resourceFrequency).forEach(resource => {
            if (playerTotals[resource] > 0) {
                bonus += resourceFrequency[resource];
            }
        });
        
        return bonus;
    }
}
