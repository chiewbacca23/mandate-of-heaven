// purchase-validator.js
// Validates whether a player can purchase a title based on requirements and resources

export class PurchaseValidator {
    constructor(heroesData, titlesData) {
        this.heroesData = heroesData;
        this.titlesData = titlesData;
        this.heroesById = new Map(heroesData.map(h => [h.id, h]));
        this.heroesByName = new Map(heroesData.map(h => [h.name.toLowerCase(), h]));
    }

    /**
     * Check if player meets title requirement and return matching hero
     * @param {Object} player - Player object
     * @param {string} requirement - Requirement string
     * @param {string} requirementType - Type of requirement (default: 'simple')
     * @returns {Object} { canPurchase: boolean, reason: string, matchingHero: Object }
     */
    checkTitleRequirement(player, requirement, requirementType = 'simple') {
        if (!requirement) {
            return { canPurchase: false, reason: 'No requirement specified', matchingHero: null };
        }

        // Get all available heroes (hand + battlefield, not retired)
        const availableHeroes = [
            ...player.hand,
            ...(player.battlefield?.wei || []),
            ...(player.battlefield?.wu || []),
            ...(player.battlefield?.shu || [])
        ].filter(hero => hero && !hero.name.includes('Peasant'));

        if (availableHeroes.length === 0) {
            return { canPurchase: false, reason: 'No heroes available', matchingHero: null };
        }

        // Try to find a matching hero
        const matchingHero = this.findMatchingHero(availableHeroes, requirement, requirementType);

        if (matchingHero) {
            return { canPurchase: true, reason: 'Requirement met', matchingHero };
        } else {
            return { canPurchase: false, reason: `No hero matches: ${requirement}`, matchingHero: null };
        }
    }

    /**
     * Find a hero that matches the requirement
     */
    findMatchingHero(heroes, requirement, requirementType) {
        const reqLower = requirement.toLowerCase();

        // Try specific named heroes first
        for (const hero of heroes) {
            if (reqLower.includes(hero.name.toLowerCase())) {
                return hero;
            }
        }

        // Check for role-based requirements
        const roles = ['general', 'advisor', 'tactician', 'administrator'];
        for (const role of roles) {
            if (reqLower.includes(role)) {
                const roleCapitalized = role.charAt(0).toUpperCase() + role.slice(1);
                const matching = heroes.find(h => 
                    h.roles && Array.isArray(h.roles) && 
                    h.roles.some(r => r.toLowerCase() === role)
                );
                if (matching) return matching;
            }
        }

        // Check for allegiance-based requirements
        const allegiances = ['shu', 'wei', 'wu', 'rebels', 'coalition', 'han', 'dong zhuo'];
        for (const allegiance of allegiances) {
            if (reqLower.includes(allegiance)) {
                const allegianceCapitalized = allegiance.split(' ')
                    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
                    .join(' ');
                const matching = heroes.find(h => 
                    h.allegiance && h.allegiance.toLowerCase() === allegiance
                );
                if (matching) return matching;
            }
        }

        // Check for resource threshold requirements (e.g., "at least 3 military")
        const resourceMatch = reqLower.match(/(\d+)\s*\+?\s*(military|influence|supplies|piety)/);
        if (resourceMatch) {
            const threshold = parseInt(resourceMatch[1]);
            const resourceType = resourceMatch[2];
            const matching = heroes.find(h => (h[resourceType] || 0) >= threshold);
            if (matching) return matching;
        }

        // Check for "any resource at least X"
        const anyResourceMatch = reqLower.match(/(\d+)/);
        if (anyResourceMatch) {
            const threshold = parseInt(anyResourceMatch[1]);
            const matching = heroes.find(h => 
                (h.military || 0) >= threshold ||
                (h.influence || 0) >= threshold ||
                (h.supplies || 0) >= threshold ||
                (h.piety || 0) >= threshold
            );
            if (matching) return matching;
        }

        // Check for dual-role requirement
        if (reqLower.includes('dual-role') || reqLower.includes('dual role')) {
            const matching = heroes.find(h => h.roles && Array.isArray(h.roles) && h.roles.length >= 2);
            if (matching) return matching;
        }

        // Fallback: return first available hero if requirement is vague
        return heroes[0] || null;
    }

    /**
     * Check if player can afford a purchase with available resources
     * @param {Object} availableResources - Total resources available
     * @param {Object} cost - Required cost
     * @returns {Object} { hasEnough: boolean, reason: string, totals: Object }
     */
    checkAffordability(availableResources, cost) {
        const shortfalls = [];

        const resources = ['military', 'influence', 'supplies', 'piety'];
        for (const res of resources) {
            const available = availableResources[res] || 0;
            const required = cost[res] || 0;
            
            if (available < required) {
                shortfalls.push(`${res}: need ${required}, have ${available}`);
            }
        }

        if (shortfalls.length > 0) {
            return {
                hasEnough: false,
                reason: `Insufficient: ${shortfalls.join(', ')}`,
                totals: availableResources
            };
        }

        return {
            hasEnough: true,
            reason: 'Sufficient resources',
            totals: availableResources
        };
    }

    /**
     * Calculate column bonuses from selected heroes
     * @param {Array} selectedHeroes - Heroes with kingdom property
     * @returns {Object} { military: 0, influence: 0, supplies: 0, piety: 0 }
     */
    calculateColumnBonuses(selectedHeroes) {
        const bonuses = {
            military: 0,
            influence: 0,
            supplies: 0,
            piety: 0
        };

        if (!selectedHeroes || selectedHeroes.length === 0) {
            return bonuses;
        }

        // Count heroes in each kingdom
        const weiCount = selectedHeroes.filter(h => h.kingdom === 'wei').length;
        const wuCount = selectedHeroes.filter(h => h.kingdom === 'wu').length;
        const shuCount = selectedHeroes.filter(h => h.kingdom === 'shu').length;

        // Apply column bonuses (2+ in same kingdom)
        if (weiCount >= 2) bonuses.influence += 1;
        if (wuCount >= 2) bonuses.supplies += 1;
        if (shuCount >= 2) bonuses.piety += 1;

        return bonuses;
    }
}
