// Three Kingdoms Prototype - Main Game Controller (Modular)
import { GAME_CONFIG, dataLoader } from './prototype-config.js';
import { Player } from './prototype-player.js';
import { UIManager } from './prototype-ui.js';

export class PrototypeGame {
    constructor() {
        this.gameState = {
            turn: 0,
            phase: 'setup',
            currentEvent: null,
            events: [],
            heroMarket: [],
            titleMarket: [],
            player: null,
            log: []
        };
        
        this.selectedCards = [];
        this.deployment = { wei: [], wu: [], shu: [] };
        this.selectedPurchase = null;
        
        this.ui = new UIManager(this);
        this.init();
    }

    async init() {
        try {
            await dataLoader.loadAllData();
            this.log('✅ Game data loaded successfully', 'state');
            this.ui.updateAll();
            document.getElementById('newGameBtn').disabled = false;
        } catch (error) {
            this.log('❌ Failed to load game data: ' + error.message, 'error');
        }
    }

    // ===== GAME SETUP =====
    async startNewGame() {
        this.log('=== NEW GAME STARTED ===', 'phase');
        
        // Setup events
        const powerEvent = dataLoader.events.find(e => 
            (e.Name && e.Name.toLowerCase().includes("power of the han")) ||
            (e.name && e.name.toLowerCase().includes("power of the han"))
        );
        
        const firstEvent = powerEvent || dataLoader.events[0];
        if (!firstEvent) {
            this.log('ERROR: No events available!', 'error');
            return;
        }
        
        const otherEvents = dataLoader.events.filter(e => e !== powerEvent);
        this.gameState.events = [firstEvent, ...dataLoader.shuffle(otherEvents)].slice(0, 8);
        
        // Setup markets
        this.gameState.heroMarket = dataLoader.shuffle([...dataLoader.heroes]).slice(0, 6);
        this.gameState.titleMarket = dataLoader.shuffle([...dataLoader.titles]).slice(0, 4);
        
        // Setup player
        this.gameState.player = new Player();
        this.gameState.player.createStartingHand();
        
        // Start turn 1
        this.gameState.turn = 1;
        this.gameState.currentEvent = this.gameState.events[0];
        
        this.startDeploymentPhase();
        document.getElementById('exportLogBtn').disabled = false;
    }

    // ===== DEPLOYMENT PHASE =====
    startDeploymentPhase() {
        this.gameState.phase = 'deployment';
        this.selectedCards = [];
        this.deployment = { wei: [], wu: [], shu: [] };
        
        const eventName = this.gameState.currentEvent?.Name || this.gameState.currentEvent?.name || 'Unknown';
        const leadingResource = this.gameState.currentEvent?.Leading_resource || 
                               this.gameState.currentEvent?.leading_resource || 'military';
        const icon = GAME_CONFIG.RESOURCE_ICONS[leadingResource] || '❓';
        
        this.log(`--- Turn ${this.gameState.turn}: Deployment Phase ---`, 'phase');
        this.log(`Event: ${eventName} (${icon} ${leadingResource})`, 'state');
        
        // Log full market info
        this.log('=== MARKET STATE (Review before deploying) ===', 'phase');
        this.log('--- Available Heroes ---', 'state');
        this.gameState.heroMarket.forEach(hero => {
            const name = hero.name || hero.Name || 'Unknown';
            const allegiance = hero.allegiance || hero.Allegiance || '?';
            const role = (hero.roles && hero.roles[0]) || hero.Role || '?';
            const cost = this.ui.formatCost(hero.cost);
            const stats = this.ui.formatStats(hero);
            this.log(`${name} (${allegiance} ${role}) - Cost: ${cost} | Stats: ${stats}`, 'state');
        });
        
        this.log('--- Available Titles ---', 'state');
        this.gameState.titleMarket.forEach(title => {
            const name = title.name || title.Name || 'Unknown';
            const req = title.Required_Hero || title.requirement || 'Any hero';
            const cost = this.ui.formatCost(title.cost);
            const points = (title.points || title.Set_Scoring || [0]).join('/');
            this.log(`"${name}" - Req: ${req} | Cost: ${cost} | Points: [${points}]`, 'state');
        });
        
        this.log('=== Now deploy your cards ===', 'phase');
        this.ui.updateAll();
    }

    toggleCardSelection(cardId) {
        console.log('DEBUG: toggleCardSelection called with', cardId);
        console.log('DEBUG: Currently selected cards', this.selectedCards);
        
        const idx = this.selectedCards.indexOf(cardId);
        if (idx > -1) {
            this.selectedCards.splice(idx, 1);
        } else {
            if (this.selectedCards.length < GAME_CONFIG.MAX_DEPLOYMENT) {
                this.selectedCards.push(cardId);
            } else {
                this.log('Maximum 3 cards can be selected for deployment', 'error');
            }
        }
        
        console.log('DEBUG: Selected cards after toggle', this.selectedCards);
        this.ui.updateAll();
    }

    deployToKingdom(cardId, kingdom) {
        console.log('DEBUG: deployToKingdom called', cardId, kingdom);
        
        if (this.deployment[kingdom].length >= GAME_CONFIG.MAX_CARDS_PER_KINGDOM) {
            this.log(`Cannot deploy to ${kingdom.toUpperCase()} - max 3 cards`, 'error');
            return;
        }
        
        // Find the card in hand (use name as fallback for ID)
        const card = this.gameState.player.hand.find(c => 
            c.id === cardId || c.name === cardId || (c.Name && c.Name === cardId)
        );
        
        if (!card) {
            console.error('Card not found in hand:', cardId);
            this.log('Error: Card not found in hand', 'error');
            return;
        }
        
        // Remove from other kingdoms if already deployed
        GAME_CONFIG.KINGDOMS.forEach(k => {
            this.deployment[k] = this.deployment[k].filter(c => {
                const cId = c.id || c.name || c.Name;
                return cId !== cardId;
            });
        });
        
        // Add to new kingdom
        this.deployment[kingdom].push(card);
        this.log(`Deployed ${card.name || card.Name} to ${kingdom.toUpperCase()}`, 'decision');
        
        this.ui.updateAll();
    }

    removeFromDeployment(cardId, kingdom) {
        this.deployment[kingdom] = this.deployment[kingdom].filter(c => c.id !== cardId);
        this.ui.updateAll();
    }

    // Helper for zone clicks (called from inline onclick)
    handleZoneClick(kingdom) {
        if (this.selectedCards.length > 0) {
            const cardId = this.selectedCards[0];
            this.deployToKingdom(cardId, kingdom);
            this.selectedCards.splice(0, 1);
        }
    }

    confirmDeployment() {
        // Move deployed cards to battlefield
        GAME_CONFIG.KINGDOMS.forEach(kingdom => {
            this.deployment[kingdom].forEach(card => {
                const handIdx = this.gameState.player.hand.findIndex(c => c.id === card.id);
                if (handIdx > -1) {
                    this.gameState.player.hand.splice(handIdx, 1);
                    this.gameState.player.battlefield[kingdom].push(card);
                }
            });
        });
        
        // Log deployment
        const deployed = [];
        GAME_CONFIG.KINGDOMS.forEach(k => {
            if (this.gameState.player.battlefield[k].length > 0) {
                deployed.push(`${k.toUpperCase()}: ${this.gameState.player.battlefield[k].map(c => c.name || c.Name).join(', ')}`);
            }
        });
        this.log(`Deployed: ${deployed.join(' | ')}`, 'decision');
        
        const resources = this.gameState.player.calculateBattlefieldResources();
        this.log(`Resources: ${GAME_CONFIG.RESOURCES.map(r => 
            `${GAME_CONFIG.RESOURCE_ICONS[r]}${resources[r]}`
        ).join(' ')}`, 'state');
        
        this.startPurchasePhase();
    }

    // ===== PURCHASE PHASE =====
    startPurchasePhase() {
        this.gameState.phase = 'purchase';
        this.selectedPurchase = null;
        this.log('--- Purchase Phase ---', 'phase');
        this.ui.updateAll();
    }

    selectPurchase(type, itemId) {
        console.log('DEBUG: selectPurchase called', type, itemId, 'type:', typeof itemId);
        
        // Convert itemId to match comparison (could be string or number)
        const searchId = itemId;
        
        // Find the item in the appropriate market
        let item;
        if (type === 'hero') {
            item = this.gameState.heroMarket.find(h => {
                const heroId = h.id || h.name || h.Name;
                // Compare with type coercion
                return heroId == searchId || String(heroId) === String(searchId);
            });
        } else {
            item = this.gameState.titleMarket.find(t => {
                const titleId = t.id || t.name || t.Name;
                // Compare with type coercion
                return titleId == searchId || String(titleId) === String(searchId);
            });
        }
        
        console.log('DEBUG: Found item?', item ? item.name || item.Name : 'NOT FOUND');
        
        if (!item) {
            console.error('Item not found in market:', type, searchId);
            return;
        }
        
        // Toggle selection
        if (this.selectedPurchase && this.selectedPurchase.item === item) {
            this.selectedPurchase = null;
        } else {
            this.selectedPurchase = { type, item };
        }
        
        console.log('DEBUG: Selected purchase:', this.selectedPurchase ? 'SET' : 'CLEARED');
        this.ui.updateAll();
    }

    toggleEmergency() {
        const checkbox = document.getElementById('useEmergency');
        const selector = document.getElementById('emergencySelector');
        selector.style.display = checkbox.checked ? 'block' : 'none';
        this.ui.updateAll();
    }

    getEmergencyBonus() {
        const checkbox = document.getElementById('useEmergency');
        if (!checkbox || !checkbox.checked) {
            return { military: 0, influence: 0, supplies: 0, piety: 0 };
        }
        
        const checkboxes = document.querySelectorAll('input[name="emergency"]:checked');
        if (checkboxes.length !== 2) {
            return { military: 0, influence: 0, supplies: 0, piety: 0 };
        }
        
        const bonus = { military: 0, influence: 0, supplies: 0, piety: 0 };
        checkboxes.forEach(cb => bonus[cb.value] = 1);
        return bonus;
    }

    confirmPurchase() {
        if (!this.selectedPurchase) return;
        
        const player = this.gameState.player;
        const emergency = this.getEmergencyBonus();
        const usingEmergency = Object.values(emergency).some(v => v > 0);
        
        if (this.selectedPurchase.type === 'hero') {
            const hero = this.selectedPurchase.item;
            player.addToHand({...hero});
            this.gameState.heroMarket = this.gameState.heroMarket.filter(h => h.id !== hero.id);
            
            if (usingEmergency) {
                player.emergencyUsed++;
                player.score -= 1;
                const resources = Object.entries(emergency).filter(([_, v]) => v > 0)
                    .map(([r, _]) => GAME_CONFIG.RESOURCE_ICONS[r]).join(' +1');
                this.log(`Used emergency: +1${resources} (-1 point)`, 'decision');
            }
            
            const name = hero.name || hero.Name || 'Unknown';
            this.log(`Purchased: ${name} (added to hand)`, 'decision');
            
            // Return battlefield cards to hand
            player.returnBattlefieldToHand();
            this.log('Battlefield cards returned to hand', 'state');
            
        } else if (this.selectedPurchase.type === 'title') {
            const title = this.selectedPurchase.item;
            const heroToRetire = player.findEligibleHero(title);
            
            if (!heroToRetire) {
                this.log('ERROR: No eligible hero to retire!', 'error');
                return;
            }
            
            player.removeHeroFromCollection(heroToRetire);
            player.retiredHeroes.push(heroToRetire);
            player.titles.push({ title, retiredWith: heroToRetire });
            this.gameState.titleMarket = this.gameState.titleMarket.filter(t => t.id !== title.id);
            
            if (usingEmergency) {
                player.emergencyUsed++;
                player.score -= 1;
                const resources = Object.entries(emergency).filter(([_, v]) => v > 0)
                    .map(([r, _]) => GAME_CONFIG.RESOURCE_ICONS[r]).join(' +1');
                this.log(`Used emergency: +1${resources} (-1 point)`, 'decision');
            }
            
            const titleName = title.name || title.Name || 'Unknown';
            const heroName = heroToRetire.name || heroToRetire.Name || 'Unknown';
            const score = this.calculateTitleScore(title);
            this.log(`Purchased: "${titleName}" (retired ${heroName}) - ${score} points`, 'decision');
            
            // Return battlefield cards (except retired hero already removed)
            player.returnBattlefieldToHand();
            this.log('Battlefield cards returned to hand', 'state');
        }
        
        this.completeTurn();
    }

    passTurn() {
        this.log('Passed turn - no purchase made', 'decision');
        this.log('Battlefield cards remain deployed for next turn', 'state');
        this.completeTurn();
    }

    completeTurn() {
        const player = this.gameState.player;
        this.log(`Hand: ${player.hand.length} | Battlefield: ${player.getBattlefieldCardCount()}`, 'state');
        
        // Market cleanup
        if (this.gameState.heroMarket.length >= 2) {
            const discarded = this.gameState.heroMarket.splice(-2, 2);
            const names = discarded.map(h => h.name || h.Name || 'Unknown').join(', ');
            this.log(`Market cleanup: Discarded ${names}`, 'state');
        }
        
        // Refill hero market
        const availableHeroes = dataLoader.heroes.filter(h => 
            !this.gameState.heroMarket.some(mh => mh.id === h.id) &&
            !player.hand.some(ph => ph.id === h.id) &&
            !player.retiredHeroes.some(rh => rh.id === h.id) &&
            !player.getBattlefieldHeroes().some(bh => bh.id === h.id)
        );
        
        while (this.gameState.heroMarket.length < 4 && availableHeroes.length > 0) {
            const idx = Math.floor(Math.random() * availableHeroes.length);
            this.gameState.heroMarket.push(availableHeroes.splice(idx, 1)[0]);
        }
        
        // Next turn
        this.gameState.turn++;
        if (this.gameState.turn > GAME_CONFIG.TOTAL_TURNS) {
            this.endGame();
        } else {
            this.gameState.currentEvent = this.gameState.events[this.gameState.turn - 1];
            this.startDeploymentPhase();
        }
    }

    // ===== GAME END =====
    endGame() {
        this.gameState.phase = 'gameover';
        this.log('=== GAME OVER ===', 'phase');
        
        const player = this.gameState.player;
        let titlePoints = 0;
        
        player.titles.forEach(({ title }) => {
            const score = this.calculateTitleScore(title);
            titlePoints += score;
            const name = title.name || title.Name || 'Unknown';
            this.log(`"${name}": ${score} points`, 'state');
        });
        
        player.score = titlePoints - player.emergencyUsed;
        this.log(`Final Score: ${player.score} points`, 'phase');
        this.log(`(${titlePoints} from titles - ${player.emergencyUsed} emergency)`, 'state');
        
        this.ui.updateAll();
    }

    calculateTitleScore(title) {
        const player = this.gameState.player;
        const allHeroes = player.getAllHeroes();
        const points = title.points || title.Set_Scoring || [0];
        const collectionSize = Math.min(allHeroes.length, points.length - 1);
        return points[collectionSize] || 0;
    }

    // ===== LOGGING =====
    log(message, type = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        this.gameState.log.unshift({ timestamp, message, type });
        console.log(`[${timestamp}] ${message}`);
        if (this.ui) this.ui.updateLog();
    }

    exportLog() {
        const logText = this.gameState.log.map(entry => 
            `[${entry.timestamp}] ${entry.message}`
        ).reverse().join('\n');
        
        const blob = new Blob([logText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `three-kingdoms-log-${Date.now()}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    }
}
