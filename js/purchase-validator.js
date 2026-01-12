// purchase-validator.js
// Validates whether a player can purchase a title based on requirements and resources

export class PurchaseValidator {
    constructor(heroesData) {
        this.heroesData = heroesData;
        this.heroesById = new Map(heroesData.map(h => [h.id, h]));
        this.heroesByName = new Map(heroesData.map(h => [h.name.toLowerCase(), h]));
    }

    /**
     * Check if player can purchase a title
     * @param {Object} player - Player object with hand, battlefield, retired heroes
     * @param {Object} title - Title object with requirements and costs
     * @param {Array} selectedHeroes - Heroes player wants to use for purchase
     * @returns {Object} { canPurchase: boolean, reason: string, retirementHero: Object }
     */
    canPurchaseTitle(player, title, selectedHeroes) {
        // 1. Check if player meets the hero requirement
        const requirementCheck = this.meetsHeroRequirement(player, title);
        if (!requirementCheck.meets) {
            return { 
                canPurchase: false, 
                reason: requirementCheck.reason,
                retirementHero: null
            };
        }

        // 2. Check if player has enough resources
        const resourceCheck = this.hasEnoughResources(selectedHeroes, title);
        if (!resourceCheck.hasEnough) {
            return {
                canPurchase: false,
                reason: resourceCheck.reason,
                retirementHero: requirementCheck.hero
            };
        }

        return {
            canPurchase: true,
            reason: 'All requirements met',
            retirementHero: requirementCheck.hero
        };
    }

    /**
     * Check if player meets the hero requirement for a title
     * @param {Object} player - Player object
     * @param {Object} title - Title object
     * @returns {Object} { meets: boolean, reason: string, hero: Object }
     */
    meetsHeroRequirement(player, title) {
        const requirement = title.requirement;
        const reqType = title.requirement_type;
        
        // Get all heroes player owns (hand + battlefield + retired)
        const allHeroes = [
            ...player.hand,
            ...player.battlefield.wei,
            ...player.battlefield.wu,
            ...player.battlefield.shu,
            ...player.retired
        ];

        // Parse requirement and find matching hero
        let matchingHero = null;

        switch(reqType) {
            case 'named':
                matchingHero = this.findNamedHero(allHeroes, requirement);
                break;
            case 'role':
                matchingHero = this.findRoleHero(allHeroes, requirement);
                break;
            case 'role_resource':
                matchingHero = this.findRoleResourceHero(allHeroes, requirement);
                break;
            case 'allegiance':
                matchingHero = this.findAllegianceHero(allHeroes, requirement);
                break;
            case 'role_allegiance':
                matchingHero = this.findRoleAllegianceHero(allHeroes, requirement);
                break;
            case 'resource':
                matchingHero = this.findResourceHero(allHeroes, requirement);
                break;
            case 'multi_role':
                matchingHero = this.findMultiRoleHero(allHeroes, requirement);
                break;
            case 'dual_role':
                matchingHero = this.findDualRoleHero(allHeroes, requirement);
                break;
            case 'multi_allegiance':
                matchingHero = this.findMultiAllegianceHero(allHeroes, requirement);
                break;
            default:
                // Try to parse generic requirement string
                matchingHero = this.findGenericMatch(allHeroes, requirement);
        }

        if (matchingHero) {
            return { meets: true, reason: 'Requirement met', hero: matchingHero };
        } else {
            return { meets: false, reason: `No hero matches requirement: ${requirement}`, hero: null };
        }
    }

    /**
     * Find a hero by specific name(s)
     */
    findNamedHero(heroes, requirement) {
        // Extract names from requirement (comma-separated)
        const namePattern = /([A-Za-z\s]+)(?:,|$)/g;
        const matches = [...requirement.matchAll(namePattern)];
        const requiredNames = matches.map(m => m[1].trim().toLowerCase());

        for (const hero of heroes) {
            if (requiredNames.includes(hero.name.toLowerCase())) {
                return hero;
            }
        }
        return null;
    }

    /**
     * Find a hero by role (General, Advisor, Tactician, Administrator)
     */
    findRoleHero(heroes, requirement) {
        const roles = ['General', 'Advisor', 'Tactician', 'Administrator'];
        const reqLower = requirement.toLowerCase();
        
        for (const role of roles) {
            if (reqLower.includes(role.toLowerCase())) {
                const matching = heroes.find(h => h.roles.includes(role));
                if (matching) return matching;
            }
        }
        return null;
    }

    /**
     * Find a hero by role AND resource threshold (e.g., "General with 3+ Military")
     */
    findRoleResourceHero(heroes, requirement) {
        // Parse requirement like "General with at least 3 military"
        const roleMatch = requirement.match(/(General|Advisor|Tactician|Administrator)/i);
        const resourceMatch = requirement.match(/(\d+)\s*\+?\s*(military|influence|supplies|piety)/i);
        
        if (!roleMatch || !resourceMatch) return null;
        
        const role = roleMatch[1];
        const threshold = parseInt(resourceMatch[1]);
        const resourceType = resourceMatch[2].toLowerCase();
        
        return heroes.find(h => 
            h.roles.includes(role) && h[resourceType] >= threshold
        );
    }

    /**
     * Find a hero by allegiance (Shu, Wei, Wu, Rebels, Coalition, Han, Dong Zhuo)
     */
    findAllegianceHero(heroes, requirement) {
        const allegiances = ['Shu', 'Wei', 'Wu', 'Rebels', 'Coalition', 'Han', 'Dong Zhuo'];
        const reqLower = requirement.toLowerCase();
        
        for (const allegiance of allegiances) {
            if (reqLower.includes(allegiance.toLowerCase())) {
                const matching = heroes.find(h => h.allegiance === allegiance);
                if (matching) return matching;
            }
        }
        return null;
    }

    /**
     * Find a hero by role AND allegiance
     */
    findRoleAllegianceHero(heroes, requirement) {
        const roleMatch = requirement.match(/(General|Advisor|Tactician|Administrator)/i);
        const allegianceMatch = requirement.match(/(Shu|Wei|Wu|Rebels|Coalition|Han|Dong Zhuo)/i);
        
        if (!roleMatch || !allegianceMatch) return null;
        
        const role = roleMatch[1];
        const allegiance = allegianceMatch[1];
        
        return heroes.find(h => 
            h.roles.includes(role) && h.allegiance === allegiance
        );
    }

    /**
     * Find a hero by resource threshold (any resource)
     */
    findResourceHero(heroes, requirement) {
        const resourceMatch = requirement.match(/(\d+)\s*\+?\s*(military|influence|supplies|piety)?/i);
        if (!resourceMatch) return null;
        
        const threshold = parseInt(resourceMatch[1]);
        const specificResource = resourceMatch[2]?.toLowerCase();
        
        if (specificResource) {
            return heroes.find(h => h[specificResource] >= threshold);
        } else {
            // Any resource at threshold
            return heroes.find(h => 
                h.military >= threshold || 
                h.influence >= threshold || 
                h.supplies >= threshold || 
                h.piety >= threshold
            );
        }
    }

    /**
     * Find a hero matching multiple roles (OR condition)
     */
    findMultiRoleHero(heroes, requirement) {
        const roles = ['General', 'Advisor', 'Tactician', 'Administrator'];
        const reqLower = requirement.toLowerCase();
        const matchingRoles = roles.filter(r => reqLower.includes(r.toLowerCase()));
        
        return heroes.find(h => 
            h.roles.some(role => matchingRoles.includes(role))
        );
    }

    /**
     * Find a dual-role hero (has 2+ roles)
     */
    findDualRoleHero(heroes, requirement) {
        return heroes.find(h => h.roles.length >= 2);
    }

    /**
     * Find a hero matching multiple allegiances (OR condition)
     */
    findMultiAllegianceHero(heroes, requirement) {
        const allegiances = ['Shu', 'Wei', 'Wu', 'Rebels', 'Coalition', 'Han', 'Dong Zhuo'];
        const reqLower = requirement.toLowerCase();
        const matchingAllegiances = allegiances.filter(a => reqLower.includes(a.toLowerCase()));
        
        return heroes.find(h => matchingAllegiances.includes(h.allegiance));
    }

    /**
     * Generic parser for complex requirements
     */
    findGenericMatch(heroes, requirement) {
        // Try each parsing method in sequence
        return this.findNamedHero(heroes, requirement) ||
               this.findRoleResourceHero(heroes, requirement) ||
               this.findRoleAllegianceHero(heroes, requirement) ||
               this.findRoleHero(heroes, requirement) ||
               this.findAllegianceHero(heroes, requirement) ||
               this.findResourceHero(heroes, requirement) ||
               this.findMultiRoleHero(heroes, requirement) ||
               this.findDualRoleHero(heroes, requirement) ||
               this.findMultiAllegianceHero(heroes, requirement);
    }

    /**
     * Check if selected heroes provide enough resources for the title cost
     * @param {Array} selectedHeroes - Heroes being used for purchase
     * @param {Object} title - Title being purchased
     * @returns {Object} { hasEnough: boolean, reason: string, totals: Object }
     */
    hasEnoughResources(selectedHeroes, title) {
        // Calculate total resources from selected heroes
        const totals = {
            military: 0,
            influence: 0,
            supplies: 0,
            piety: 0
        };

        for (const hero of selectedHeroes) {
            totals.military += hero.military;
            totals.influence += hero.influence;
            totals.supplies += hero.supplies;
            totals.piety += hero.piety;
        }

        // Check against title costs
        const shortfalls = [];
        if (totals.military < title.cost.military) {
            shortfalls.push(`Military (need ${title.cost.military}, have ${totals.military})`);
        }
        if (totals.influence < title.cost.influence) {
            shortfalls.push(`Influence (need ${title.cost.influence}, have ${totals.influence})`);
        }
        if (totals.supplies < title.cost.supplies) {
            shortfalls.push(`Supplies (need ${title.cost.supplies}, have ${totals.supplies})`);
        }
        if (totals.piety < title.cost.piety) {
            shortfalls.push(`Piety (need ${title.cost.piety}, have ${totals.piety})`);
        }

        if (shortfalls.length > 0) {
            return {
                hasEnough: false,
                reason: `Insufficient resources: ${shortfalls.join(', ')}`,
                totals
            };
        }

        return {
            hasEnough: true,
            reason: 'Sufficient resources',
            totals
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
