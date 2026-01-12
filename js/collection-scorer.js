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
        
        // Get base points from the points array
        const basePoints = this.getBasePoints(title, collectionSize);
        
        // Calculate legend bonus if applicable
        const legendBonus = this.calculateLegendBonus(allHeroes, title);
        
        const totalPoints = basePoints + legendBonus;
        
        return {
            basePoints,
            legendBonus,
            totalPoints,
            collectionSize,
            matchingHeroes: this.getMatchingHeroes(allHeroes, title)
        };
    }

    /**
     * Get all heroes owned by player
     */
    getAllPlayerHeroes(player) {
        return [
            ...player.hand,
            ...player.battlefield.wei,
            ...player.battlefield.wu,
            ...player.battlefield.shu,
            ...player.retired
        ];
    }

    /**
     * Count heroes that match the title's set requirement
     * @param {Array} heroes - All heroes owned by player
     * @param {Object} title - Title with set requirements
     * @returns {number} Count of matching heroes
     */
    countMatchingHeroes(heroes, title) {
        const setType = title.set_type;
        const setDesc = title.set_description;
        
        return this.getMatchingHeroes(heroes, title).length;
    }

    /**
     * Get list of heroes that match the title's set requirement
     */
    getMatchingHeroes(heroes, title) {
        const setType = title.set_type;
        const setDesc = title.set_description;
        
        switch(setType) {
            case 'allegiance':
                return this.matchByAllegiance(heroes, setDesc);
            case 'role':
                return this.matchByRole(heroes, setDesc);
            case 'role_allegiance':
                return this.matchByRoleAndAllegiance(heroes, setDesc);
            case 'role_resource':
                return this.matchByRoleAndResource(heroes, setDesc);
            case 'multi_allegiance':
                return this.matchByMultiAllegiance(heroes, setDesc);
            case 'multi_role':
                return this.matchByMultiRole(heroes, setDesc);
            case 'resource':
                return this.matchByResource(heroes, setDesc);
            case 'dual_role':
                return this.matchByDualRole(heroes, setDesc);
            case 'unique_roles':
                return this.matchByUniqueRoles(heroes, setDesc);
            case 'unique_allegiances':
                return this.matchByUniqueAllegiances(heroes, setDesc);
            case 'role_pairs':
            case 'pair':
                return this.matchByRolePairs(heroes, setDesc);
            case 'specific_allegiance_spread':
                return this.matchByAllegianceSpread(heroes, setDesc);
            default:
                console.warn(`Unknown set type: ${setType}`);
                return [];
        }
    }

    /**
     * Match heroes by allegiance
     */
    matchByAllegiance(heroes, setDesc) {
        const allegiances = ['Shu', 'Wei', 'Wu', 'Rebels', 'Coalition', 'Han', 'Dong Zhuo'];
        const descLower = setDesc.toLowerCase();
        
        for (const allegiance of allegiances) {
            if (descLower.includes(allegiance.toLowerCase())) {
                return heroes.filter(h => h.allegiance === allegiance);
            }
        }
        return [];
    }

    /**
     * Match heroes by role
     */
    matchByRole(heroes, setDesc) {
        const roles = ['General', 'Advisor', 'Tactician', 'Administrator'];
        const descLower = setDesc.toLowerCase();
        
        for (const role of roles) {
            if (descLower.includes(role.toLowerCase())) {
                return heroes.filter(h => h.roles && Array.isArray(h.roles) && h.roles.includes(role));
            }
        }
        return [];
    }

    /**
     * Match heroes by role AND allegiance
     */
    matchByRoleAndAllegiance(heroes, setDesc) {
        const roleMatch = setDesc.match(/(General|Advisor|Tactician|Administrator)s?/i);
        const allegianceMatch = setDesc.match(/(Shu|Wei|Wu|Rebels|Coalition|Han|Dong Zhuo)/i);
        
        if (!roleMatch || !allegianceMatch) return [];
        
        const role = roleMatch[1];
        const allegiance = allegianceMatch[1];
        
        return heroes.filter(h => 
            h.roles && Array.isArray(h.roles) && h.roles.includes(role) && 
            h.allegiance && h.allegiance === allegiance
        );
    }

    /**
     * Match heroes by role AND resource threshold
     */
    matchByRoleAndResource(heroes, setDesc) {
        const roleMatch = setDesc.match(/(General|Advisor|Tactician|Administrator)s?/i);
        const resourceMatch = setDesc.match(/(\d+)\s*\+?\s*(military|influence|supplies|piety)/i);
        
        if (!roleMatch || !resourceMatch) return [];
        
        const role = roleMatch[1];
        const threshold = parseInt(resourceMatch[1]);
        const resourceType = resourceMatch[2].toLowerCase();
        
        return heroes.filter(h => 
            h.roles && Array.isArray(h.roles) && h.roles.includes(role) && 
            h[resourceType] !== undefined && h[resourceType] >= threshold
        );
    }

    /**
     * Match heroes by multiple allegiances (OR)
     */
    matchByMultiAllegiance(heroes, setDesc) {
        const allegiances = ['Shu', 'Wei', 'Wu', 'Rebels', 'Coalition', 'Han', 'Dong Zhuo'];
        const descLower = setDesc.toLowerCase();
        const matchingAllegiances = allegiances.filter(a => descLower.includes(a.toLowerCase()));
        
        return heroes.filter(h => matchingAllegiances.includes(h.allegiance));
    }

    /**
     * Match heroes by multiple roles (OR)
     */
    matchByMultiRole(heroes, setDesc) {
        const roles = ['General', 'Advisor', 'Tactician', 'Administrator'];
        const descLower = setDesc.toLowerCase();
        const matchingRoles = roles.filter(r => descLower.includes(r.toLowerCase()));
        
        return heroes.filter(h => 
            h.roles && Array.isArray(h.roles) && h.roles.some(role => matchingRoles.includes(role))
        );
    }

    /**
     * Match heroes by resource threshold
     */
    matchByResource(heroes, setDesc) {
        const resourceMatch = setDesc.match(/(\d+)\s*\+?\s*(military|influence|supplies|piety)?/i);
        if (!resourceMatch) return [];
        
        const threshold = parseInt(resourceMatch[1]);
        const specificResource = resourceMatch[2]?.toLowerCase();
        
        if (specificResource) {
            return heroes.filter(h => h[specificResource] >= threshold);
        } else {
            // Any resource at threshold
            return heroes.filter(h => 
                h.military >= threshold || 
                h.influence >= threshold || 
                h.supplies >= threshold || 
                h.piety >= threshold
            );
        }
    }

    /**
     * Match dual-role heroes (has 2+ roles)
     */
    matchByDualRole(heroes, setDesc) {
        return heroes.filter(h => h.roles && Array.isArray(h.roles) && h.roles.length >= 2);
    }

    /**
     * Match by unique roles (count distinct roles)
     */
    matchByUniqueRoles(heroes, setDesc) {
        // This counts the NUMBER of unique roles, not heroes
        const uniqueRoles = new Set();
        heroes.forEach(h => h.roles.forEach(r => uniqueRoles.add(r)));
        
        // Return heroes for counting purposes
        // The points array indices should correspond to number of unique roles
        return heroes; // Return all heroes, collection size handled separately
    }

    /**
     * Match by unique allegiances
     */
    matchByUniqueAllegiances(heroes, setDesc) {
        // Return heroes for counting purposes
        // The points array indices correspond to number of unique allegiances
        return heroes;
    }

    /**
     * Match role pairs (e.g., Generals AND Advisors)
     */
    matchByRolePairs(heroes, setDesc) {
        const roles = ['General', 'Advisor', 'Tactician', 'Administrator'];
        const descLower = setDesc.toLowerCase();
        const matchingRoles = roles.filter(r => descLower.includes(r.toLowerCase()));
        
        // Count pairs - need at least one of each role mentioned
        const roleCounts = {};
        matchingRoles.forEach(role => {
            roleCounts[role] = heroes.filter(h => h.roles && Array.isArray(h.roles) && h.roles.includes(role)).length;
        });
        
        // Return all matching heroes for now
        return heroes.filter(h => 
            h.roles && Array.isArray(h.roles) && h.roles.some(role => matchingRoles.includes(role))
        );
    }

    /**
     * Match by specific allegiance spread (e.g., one from Wei, Wu, and Shu)
     */
    matchByAllegianceSpread(heroes, setDesc) {
        // For titles like "General of the Front" that require one from each of Wei, Wu, Shu
        const hasWei = heroes.some(h => h.allegiance === 'Wei');
        const hasWu = heroes.some(h => h.allegiance === 'Wu');
        const hasShu = heroes.some(h => h.allegiance === 'Shu');
        
        // Return count based on how many allegiances are satisfied
        const count = [hasWei, hasWu, hasShu].filter(Boolean).length;
        
        // Return heroes from specified allegiances
        return heroes.filter(h => ['Wei', 'Wu', 'Shu'].includes(h.allegiance));
    }

    /**
     * Get base points from points array based on collection size
     */
    getBasePoints(title, collectionSize) {
        const pointsArray = title.points_array;
        
        // Points array is indexed by collection size
        // e.g., [0,1,3,5,7] means 0 heroes = 0 pts, 1 hero = 1 pt, 2 heroes = 3 pts, etc.
        
        if (collectionSize >= pointsArray.length) {
            // If collection exceeds array, use the last value
            return pointsArray[pointsArray.length - 1];
        }
        
        return pointsArray[collectionSize] || 0;
    }

    /**
     * Calculate legend bonus for legendary titles
     * @param {Array} heroes - All heroes owned by player
     * @param {Object} title - Title object
     * @returns {number} Legend bonus points
     */
    calculateLegendBonus(heroes, title) {
        if (!title.is_legendary || !title.named_legends || title.named_legends.length === 0) {
            return 0;
        }

        // Count how many named legends the player owns
        const legendCount = heroes.filter(h => 
            title.named_legends.some(legendName => 
                h.name.toLowerCase() === legendName.toLowerCase()
            )
        ).length;

        return legendCount * title.legend_bonus;
    }

    /**
     * Calculate special collection counts (for unique roles/allegiances)
     */
    countUniqueRoles(heroes) {
        const uniqueRoles = new Set();
        heroes.forEach(h => h.roles.forEach(r => uniqueRoles.add(r)));
        return uniqueRoles.size;
    }

    countUniqueAllegiances(heroes) {
        const uniqueAllegiances = new Set(heroes.map(h => h.allegiance));
        return uniqueAllegiances.size;
    }

    /**
     * Count role pairs (minimum of each paired role)
     */
    countRolePairs(heroes, roles) {
        const counts = roles.map(role => 
            heroes.filter(h => h.roles.includes(role)).length
        );
        return Math.min(...counts);
    }
}
