// Three Kingdoms Prototype - Main Game Logic
import { GAME_CONFIG, dataLoader } from './prototype-config.js';

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
        
        this.init();
    }

    async init() {
        try {
            await dataLoader.loadAllData();
            this.log('✅ Game data loaded successfully', 'state');
            this.updateDisplay();
            document.getElementById('newGameBtn').disabled = false;
        } catch (error) {
            this.log('❌ Failed to load game data: ' + error.message, 'error');
        }
    }

    async startNewGame() {
        this.log('=== NEW GAME STARTED ===', 'phase');
        
        console.log('DEBUG: All events:', dataLoader.events);
        console.log('DEBUG: Event names:', dataLoader.events.map(e => e.Name || e.name));
        
        // Setup events - ensure "Power of the Han Wanes" is first
        // Try multiple possible field names
        const powerEvent = dataLoader.events.find(e => 
            (e.Name && e.Name.toLowerCase().includes("power of the han")) ||
            (e.name && e.name.toLowerCase().includes("power of the han"))
        );
        
        console.log('DEBUG: Found power event:', powerEvent);
        
        if (!powerEvent) {
            this.log('⚠️ Could not find Power of Han Wanes event, using first event', 'error');
            console.error('Available events:', dataLoader.events.map(e => ({
                Name: e.Name,
                name: e.name,
                fullObject: e
            })));
        }
        
        const otherEvents = dataLoader.events.filter(e => e !== powerEvent);
        const firstEvent = powerEvent || dataLoader.events[0];
        
        if (!firstEvent) {
            this.log('ERROR: No events available at all!', 'error');
            console.error('Events data:', dataLoader.events);
            return;
        }
        
        this.gameState.events = [firstEvent, ...dataLoader.shuffle(otherEvents)].slice(0, 8);
        
        console.log('DEBUG: Events array after setup:', this.gameState.events);
        console.log('DEBUG: First event:', this.gameState.events[0]);
        
        // Setup markets
        this.gameState.heroMarket = dataLoader.shuffle([...dataLoader.heroes]).slice(0, 6); // 4 + 2 bonus T1
        this.gameState.titleMarket = dataLoader.shuffle([...dataLoader.titles]).slice(0, 4); // 2 players
        
        console.log('DEBUG: Hero market size:', this.gameState.heroMarket.length);
        console.log('DEBUG: Title market size:', this.gameState.titleMarket.length);
        
        // Setup player
        this.gameState.player = {
            hand: this.createStartingHand(),
            battlefield: { wei: [], wu: [], shu: [] },
            titles: [],
            retiredHeroes: [],
            score: 0,
            emergencyUsed: 0
        };
        
        console.log('DEBUG: Player hand:', this.gameState.player.hand);
        
        // Start turn 1
        this.gameState.turn = 1;
        this.gameState.currentEvent = this.gameState.events[0];
        
        console.log('DEBUG: Current event set to:', this.gameState.currentEvent);
        
        if (!this.gameState.currentEvent) {
            this.log('ERROR: No current event! Events array is empty or invalid', 'error');
            console.error('Events array:', this.gameState.events);
            return;
        }
        
        this.startDeploymentPhase();
        
        document.getElementById('exportLogBtn').disabled = false;
    }

    createStartingHand() {
        const peasants = [];
        const names = ['Military Peasant', 'Influence Peasant', 'Supplies Peasant', 'Piety Peasant'];
        GAME_CONFIG.RESOURCES.forEach((res, idx) => {
            peasants.push({
                id: `peasant_${res}`,
                name: names[idx],
                allegiance: 'Peasant',
                roles: ['Peasant'],
                military: res === 'military' ? 2 : 0,
                influence: res === 'influence' ? 2 : 0,
                supplies: res === 'supplies' ? 2 : 0,
                piety: res === 'piety' ? 2 : 0,
                cost: { military: 0, influence: 0, supplies: 0, piety: 0 }
            });
        });
        return peasants;
    }

    // ===== DEPLOYMENT PHASE =====
    startDeploymentPhase() {
        this.gameState.phase = 'deployment';
        this.selectedCards = [];
        this.deployment = { wei: [], wu: [], shu: [] };
        
        console.log('DEBUG: Starting deployment phase');
        console.log('DEBUG: Current event:', this.gameState.currentEvent);
        console.log('DEBUG: Player hand:', this.gameState.player.hand);
        
        // Safe access to event properties
        const eventName = this.gameState.currentEvent?.Name || this.gameState.currentEvent?.name || 'Unknown Event';
        const leadingResource = this.gameState.currentEvent?.Leading_resource || 
                               this.gameState.currentEvent?.leading_resource || 
                               this.gameState.currentEvent?.leadingResource || 'military';
        
        const icon = GAME_CONFIG.RESOURCE_ICONS[leadingResource] || '❓';
        
        this.log(`--- Turn ${this.gameState.turn}: Deployment Phase ---`, 'phase');
        this.log(`Event: ${eventName} (${icon} ${leadingResource})`, 'state');
        
        // LOG FULL MARKET INFO - This is critical for decision making
        this.log('=== MARKET STATE (Review before deploying) ===', 'phase');
        
        this.log('--- Available Heroes ---', 'state');
        this.gameState.heroMarket.forEach(hero => {
            const name = hero.name || hero.Name || 'Unknown';
            const allegiance = hero.allegiance || hero.Allegiance || '?';
            const role = (hero.roles && hero.roles[0]) || hero.Role || '?';
            const cost = this.formatCost(hero.cost);
            const stats = this.formatStats(hero);
            this.log(`${name} (${allegiance} ${role}) - Cost: ${cost} | Stats: ${stats}`, 'state');
        });
        
        this.log('--- Available Titles ---', 'state');
        this.gameState.titleMarket.forEach(title => {
            const name = title.name || title.Name || 'Unknown';
            const req = title.Required_Hero || title.requirement || 'Any hero';
            const cost = this.formatCost(title.cost);
            const points = (title.points || title.Set_Scoring || [0]).join('/');
            this.log(`"${name}" - Req: ${req} | Cost: ${cost} | Points: [${points}]`, 'state');
        });
        
        this.log('=== Now deploy your cards ===', 'phase');
        
        console.log('DEBUG: About to update display');
        this.updateDisplay();
        console.log('DEBUG: Display updated');
    }

    formatCost(cost) {
        if (!cost) return 'Free';
        return GAME_CONFIG.RESOURCES.map(r => {
            const val = cost[r];
            if (val && val > 0) return `${GAME_CONFIG.RESOURCE_ICONS[r]}${val}`;
            return '';
        }).filter(s => s).join(' ') || 'Free';
    }

    formatStats(hero) {
        return GAME_CONFIG.RESOURCES.map(r => {
            const val = hero[r];
            if (val !== 0 && val !== undefined && val !== null) {
                return `${GAME_CONFIG.RESOURCE_ICONS[r]}${val}`;
            }
            return '';
        }).filter(s => s).join(' ') || 'None';
    }

    toggleCardSelection(cardId) {
        const idx = this.selectedCards.indexOf(cardId);
        if (idx > -1) {
            this.selectedCards.splice(idx, 1);
        } else {
            if (this.selectedCards.length < GAME_CONFIG.MAX_DEPLOYMENT) {
                this.selectedCards.push(cardId);
            }
        }
        this.updateDisplay();
    }

    deployToKingdom(cardId, kingdom) {
        if (this.deployment[kingdom].length >= GAME_CONFIG.MAX_CARDS_PER_KINGDOM) {
            this.log(`Cannot deploy to ${kingdom.toUpperCase()} - max 3 cards per kingdom`, 'error');
            return;
        }
        
        // Remove from other kingdoms if already deployed
        GAME_CONFIG.KINGDOMS.forEach(k => {
            const idx = this.deployment[k].findIndex(c => c.id === cardId);
            if (idx > -1) this.deployment[k].splice(idx, 1);
        });
        
        // Add to new kingdom
        const card = this.gameState.player.hand.find(c => c.id === cardId);
        if (card) {
            this.deployment[kingdom].push(card);
            this.updateDisplay();
        }
    }

    confirmDeployment() {
        // Move deployed cards from hand to battlefield
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
                deployed.push(`${k.toUpperCase()}: ${this.gameState.player.battlefield[k].map(c => c.name).join(', ')}`);
            }
        });
        this.log(`Deployed: ${deployed.join(' | ')}`, 'decision');
        
        const resources = this.calculateBattlefieldResources();
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
        this.updateDisplay();
    }

    selectPurchase(type, item) {
        if (this.selectedPurchase && this.selectedPurchase.item === item) {
            this.selectedPurchase = null;
        } else {
            this.selectedPurchase = { type, item };
        }
        this.updateDisplay();
    }

    toggleEmergency() {
        const checkbox = document.getElementById('useEmergency');
        const selector = document.getElementById('emergencySelector');
        selector.style.display = checkbox.checked ? 'block' : 'none';
        this.updateDisplay();
    }

    getEmergencyBonus() {
        const checkbox = document.getElementById('useEmergency');
        if (!checkbox || !checkbox.checked) {
            return { military: 0, influence: 0, supplies: 0, piety: 0 };
        }
        
        const checkboxes = document.querySelectorAll('input[name="emergency"]:checked');
        if (checkboxes.length !== 2) return { military: 0, influence: 0, supplies: 0, piety: 0 };
        
        const bonus = { military: 0, influence: 0, supplies: 0, piety: 0 };
        checkboxes.forEach(cb => {
            bonus[cb.value] = 1;
        });
        return bonus;
    }

    confirmPurchase() {
        if (!this.selectedPurchase) return;
        
        const emergency = this.getEmergencyBonus();
        const usingEmergency = Object.values(emergency).some(v => v > 0);
        
        if (this.selectedPurchase.type === 'hero') {
            const hero = this.selectedPurchase.item;
            this.gameState.player.hand.push({...hero});
            this.gameState.heroMarket = this.gameState.heroMarket.filter(h => h.id !== hero.id);
            
            if (usingEmergency) {
                this.gameState.player.emergencyUsed++;
                this.gameState.player.score -= 1;
                const resources = Object.entries(emergency).filter(([_, v]) => v > 0).map(([r, _]) => 
                    GAME_CONFIG.RESOURCE_ICONS[r]
                ).join(' +1');
                this.log(`Used emergency: +1${resources} (-1 point)`, 'decision');
            }
            
            this.log(`Purchased: ${hero.name}`, 'decision');
            
        } else if (this.selectedPurchase.type === 'title') {
            const title = this.selectedPurchase.item;
            const heroToRetire = this.findEligibleHero(title);
            
            if (!heroToRetire) {
                this.log('ERROR: No eligible hero to retire!', 'error');
                return;
            }
            
            // Remove hero and add to retired
            this.removeHeroFromCollection(heroToRetire);
            this.gameState.player.retiredHeroes.push(heroToRetire);
            this.gameState.player.titles.push({ title, retiredWith: heroToRetire });
            this.gameState.titleMarket = this.gameState.titleMarket.filter(t => t.id !== title.id);
            
            if (usingEmergency) {
                this.gameState.player.emergencyUsed++;
                this.gameState.player.score -= 1;
                const resources = Object.entries(emergency).filter(([_, v]) => v > 0).map(([r, _]) => 
                    GAME_CONFIG.RESOURCE_ICONS[r]
                ).join(' +1');
                this.log(`Used emergency: +1${resources} (-1 point)`, 'decision');
            }
            
            const score = this.calculateTitleScore(title);
            this.log(`Purchased: "${title.Name}" (retired ${heroToRetire.name}) - ${score} points`, 'decision');
        }
        
        this.completeTurn();
    }

    passTurn() {
        this.log('Passed turn - no purchase', 'decision');
        this.completeTurn();
    }

    completeTurn() {
        // Return battlefield cards to hand
        GAME_CONFIG.KINGDOMS.forEach(kingdom => {
            this.gameState.player.hand.push(...this.gameState.player.battlefield[kingdom]);
            this.gameState.player.battlefield[kingdom] = [];
        });
        
        // Market cleanup
        if (this.gameState.heroMarket.length >= 2) {
            const discarded = this.gameState.heroMarket.splice(-2, 2);
            this.log(`Market cleanup: Discarded ${discarded.map(h => h.name).join(', ')}`, 'state');
        }
        
        // Refill hero market to 4
        const availableHeroes = dataLoader.heroes.filter(h => 
            !this.gameState.heroMarket.some(mh => mh.id === h.id) &&
            !this.gameState.player.hand.some(ph => ph.id === h.id) &&
            !this.gameState.player.retiredHeroes.some(rh => rh.id === h.id)
        );
        
        while (this.gameState.heroMarket.length < 4 && availableHeroes.length > 0) {
            const idx = Math.floor(Math.random() * availableHeroes.length);
            this.gameState.heroMarket.push(availableHeroes.splice(idx, 1)[0]);
        }
        
        // Next turn or game over
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
        
        // Calculate final scores
        let titlePoints = 0;
        this.gameState.player.titles.forEach(({ title }) => {
            const score = this.calculateTitleScore(title);
            titlePoints += score;
            this.log(`"${title.Name}": ${score} points`, 'state');
        });
        
        const finalScore = titlePoints - this.gameState.player.emergencyUsed;
        this.gameState.player.score = finalScore;
        
        this.log(`Final Score: ${finalScore} points`, 'phase');
        this.log(`(${titlePoints} from titles - ${this.gameState.player.emergencyUsed} emergency)`, 'state');
        
        this.updateDisplay();
    }

    // ===== HELPER METHODS =====
    calculateBattlefieldResources(emergencyBonus = {}) {
        const resources = { military: 0, influence: 0, supplies: 0, piety: 0 };
        
        // Add card values
        GAME_CONFIG.KINGDOMS.forEach(kingdom => {
            this.gameState.player.battlefield[kingdom].forEach(card => {
                GAME_CONFIG.RESOURCES.forEach(res => {
                    resources[res] += (card[res] || 0);
                });
            });
        });
        
        // Add column bonuses
        GAME_CONFIG.KINGDOMS.forEach(kingdom => {
            if (this.gameState.player.battlefield[kingdom].length >= 2) {
                const bonusResource = GAME_CONFIG.KINGDOM_BONUSES[kingdom];
                resources[bonusResource] += 1;
            }
        });
        
        // Add emergency bonus
        GAME_CONFIG.RESOURCES.forEach(res => {
            resources[res] += (emergencyBonus[res] || 0);
        });
        
        return resources;
    }

    canAfford(cost, emergencyBonus = {}) {
        const resources = this.calculateBattlefieldResources(emergencyBonus);
        return GAME_CONFIG.RESOURCES.every(res => 
            resources[res] >= (cost[res] || 0)
        );
    }

    findEligibleHero(title) {
        const allHeroes = [
            ...this.gameState.player.hand,
            ...this.gameState.player.battlefield.wei,
            ...this.gameState.player.battlefield.wu,
            ...this.gameState.player.battlefield.shu
        ].filter(h => !h.name.includes('Peasant'));
        
        return allHeroes.length > 0 ? allHeroes[0] : null;
    }

    removeHeroFromCollection(hero) {
        let removed = false;
        const handIdx = this.gameState.player.hand.findIndex(h => h.id === hero.id);
        if (handIdx > -1) {
            this.gameState.player.hand.splice(handIdx, 1);
            removed = true;
        }
        
        if (!removed) {
            GAME_CONFIG.KINGDOMS.forEach(k => {
                const idx = this.gameState.player.battlefield[k].findIndex(h => h.id === hero.id);
                if (idx > -1) {
                    this.gameState.player.battlefield[k].splice(idx, 1);
                    removed = true;
                }
            });
        }
    }

    calculateTitleScore(title) {
        const allHeroes = [
            ...this.gameState.player.hand,
            ...this.gameState.player.retiredHeroes
        ];
        
        // Simple collection count for now
        const points = title.points || title.Set_Scoring || [0];
        const collectionSize = Math.min(allHeroes.length, points.length - 1);
        return points[collectionSize] || 0;
    }

    // ===== LOGGING =====
    log(message, type = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        this.gameState.log.unshift({ timestamp, message, type });
        console.log(`[${timestamp}] ${message}`);
        this.updateLogDisplay();
    }

    logMarketState() {
        console.log('DEBUG: Hero market:', this.gameState.heroMarket);
        console.log('DEBUG: Title market:', this.gameState.titleMarket);
        
        const heroNames = this.gameState.heroMarket.map(h => h.name || h.Name || 'Unknown').join(', ');
        const titleNames = this.gameState.titleMarket.map(t => t.name || t.Name || 'Unknown').join(', ');
        
        this.log(`Hero Market: ${heroNames}`, 'state');
        this.log(`Title Market: ${titleNames}`, 'state');
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

    // ===== UI UPDATES =====
    updateDisplay() {
        this.updateGameInfo();
        this.updatePlayerState();
        this.updateActionArea();
        this.updateLogDisplay();
    }

    updateGameInfo() {
        document.getElementById('turnDisplay').textContent = this.gameState.turn;
        document.getElementById('phaseDisplay').textContent = this.gameState.phase;
        document.getElementById('eventDisplay').textContent = this.gameState.currentEvent?.Name || '-';
        
        if (this.gameState.currentEvent) {
            const icon = GAME_CONFIG.RESOURCE_ICONS[this.gameState.currentEvent.Leading_resource];
            document.getElementById('leadingDisplay').textContent = 
                `${icon} ${this.gameState.currentEvent.Leading_resource}`;
        }
        
        if (this.gameState.player) {
            document.getElementById('scoreDisplay').textContent = this.gameState.player.score;
            document.getElementById('emergencyDisplay').textContent = this.gameState.player.emergencyUsed;
        }
    }

    updatePlayerState() {
        if (!this.gameState.player) return;
        
        // Hand count
        document.getElementById('handCount').textContent = this.gameState.player.hand.length;
        
        // Battlefield resources
        const resources = this.calculateBattlefieldResources();
        document.getElementById('resourcesDisplay').innerHTML = GAME_CONFIG.RESOURCES.map(r =>
            `<span>${GAME_CONFIG.RESOURCE_ICONS[r]} ${resources[r]}</span>`
        ).join('');
        
        // Titles
        document.getElementById('titleCount').textContent = this.gameState.player.titles.length;
        document.getElementById('ownedTitles').innerHTML = this.gameState.player.titles.map(({ title, retiredWith }) => `
            <div class="title-item">
                <div class="title-item-name">${title.Name}</div>
                <div class="title-item-score">${this.calculateTitleScore(title)} points</div>
                <div style="font-size:0.8em;color:#aaa;">Retired: ${retiredWith.name}</div>
            </div>
        `).join('');
        
        // All heroes count
        const allHeroes = [
            ...this.gameState.player.hand,
            ...this.gameState.player.retiredHeroes
        ].filter(h => !h.name.includes('Peasant'));
        document.getElementById('heroCount').textContent = allHeroes.length;
    }

    updateActionArea() {
        // Hide all phases
        document.querySelectorAll('.phase-area').forEach(el => el.style.display = 'none');
        
        if (this.gameState.phase === 'deployment') {
            document.getElementById('actionTitle').textContent = 'Deployment Phase';
            document.getElementById('deploymentPhase').style.display = 'block';
            this.renderDeploymentUI();
        } else if (this.gameState.phase === 'purchase') {
            document.getElementById('actionTitle').textContent = 'Purchase Phase';
            document.getElementById('purchasePhase').style.display = 'block';
            this.renderPurchaseUI();
        } else if (this.gameState.phase === 'gameover') {
            document.getElementById('actionTitle').textContent = 'Game Over';
            document.getElementById('gameOverPhase').style.display = 'block';
        }
    }

    renderDeploymentUI() {
        const cardsArea = document.getElementById('deploymentCards');
        
        // Show ALL cards in hand, not just non-deployed ones
        const availableCards = this.gameState.player.hand.filter(card => {
            // Check if card is already deployed
            return !GAME_CONFIG.KINGDOMS.some(k => 
                this.deployment[k].some(deployed => deployed.id === card.id)
            );
        });
        
        console.log('DEBUG: Available cards for deployment:', availableCards.length);
        console.log('DEBUG: Cards in hand:', this.gameState.player.hand.length);
        
        cardsArea.innerHTML = availableCards.map(card => {
            const name = card.name || card.Name || 'Unknown';
            const allegiance = card.allegiance || card.Allegiance || '';
            const isSelected = this.selectedCards.includes(card.id);
            
            return `
                <div class="card ${isSelected ? 'selected' : ''}" 
                     onclick="game.toggleCardSelection('${card.id}')">
                    <div class="card-name">${name}</div>
                    ${allegiance ? `<div class="card-allegiance">${allegiance}</div>` : ''}
                    <div class="card-resources">
                        ${this.formatStats(card)}
                    </div>
                </div>
            `;
        }).join('');
        
        // Render drop zones
        GAME_CONFIG.KINGDOMS.forEach(kingdom => {
            const zone = document.getElementById(`${kingdom}Deployment`);
            zone.innerHTML = this.deployment[kingdom].map(card => {
                const name = card.name || card.Name || 'Unknown';
                return `
                    <div class="card" onclick="game.removeFromDeployment('${card.id}', '${kingdom}')">
                        <div class="card-name">${name}</div>
                        <small style="color:#888;">Click to remove</small>
                    </div>
                `;
            }).join('');
            
            // Make clickable for selected cards
            zone.onclick = (e) => {
                // Only trigger if clicking the zone itself, not a card
                if (e.target.id.includes('Deployment')) {
                    if (this.selectedCards.length > 0) {
                        this.deployToKingdom(this.selectedCards[0], kingdom);
                        this.selectedCards.splice(0, 1);
                    }
                }
            };
        });
    }

    removeFromDeployment(cardId, kingdom) {
        const idx = this.deployment[kingdom].findIndex(c => c.id === cardId);
        if (idx > -1) {
            this.deployment[kingdom].splice(idx, 1);
            this.updateDisplay();
        }
    }

    renderPurchaseUI() {
        const emergency = this.getEmergencyBonus();
        
        // Hero market
        document.getElementById('heroMarket').innerHTML = this.gameState.heroMarket.map(hero => {
            const affordable = this.canAfford(hero.cost, emergency);
            return `
                <div class="card ${affordable ? 'affordable' : 'unaffordable'} 
                            ${this.selectedPurchase?.item === hero ? 'selected' : ''}"
                     onclick="game.selectPurchase('hero', ${JSON.stringify(hero).replace(/"/g, '&quot;')})">
                    <div class="card-name">${hero.name}</div>
                    <div class="card-allegiance">${hero.allegiance} - ${hero.roles?.[0] || 'Hero'}</div>
                    <div class="card-resources">
                        ${GAME_CONFIG.RESOURCES.map(r => hero[r] ? 
                            `${GAME_CONFIG.RESOURCE_ICONS[r]}${hero[r]}` : ''
                        ).filter(s => s).join(' ')}
                    </div>
                    <div class="card-cost">Cost: ${GAME_CONFIG.RESOURCES.map(r => hero.cost[r] ? 
                        `${GAME_CONFIG.RESOURCE_ICONS[r]}${hero.cost[r]}` : ''
                    ).filter(s => s).join(' ')}</div>
                </div>
            `;
        }).join('');
        
        // Title market
        document.getElementById('titleMarket').innerHTML = this.gameState.titleMarket.map(title => {
            const affordable = this.canAfford(title.cost, emergency);
            const hasHero = this.findEligibleHero(title) !== null;
            
            // Handle multiple possible field names
            const name = title.name || title.Name || 'Unknown Title';
            const requirement = title.Required_Hero || title.requirement || 'Any hero';
            const points = title.points || title.Set_Scoring || [0];
            const setDesc = title.Set_Description || title.setDescription || '';
            
            return `
                <div class="card ${affordable && hasHero ? 'affordable' : 'unaffordable'}
                            ${this.selectedPurchase?.item === title ? 'selected' : ''}"
                     onclick='game.selectPurchase("title", ${JSON.stringify(title).replace(/'/g, "&apos;").replace(/"/g, "&quot;")})'>
                    <div class="card-name">${name}</div>
                    <div class="card-requirement">Requires: ${requirement}</div>
                    ${setDesc ? `<div class="card-allegiance">${setDesc}</div>` : ''}
                    <div class="card-cost">Cost: ${this.formatCost(title.cost)}</div>
                    <div class="card-points">Points: ${points.join(' → ')}</div>
                </div>
            `;
        }).join('');
        
        // Update confirm button
        document.getElementById('confirmPurchaseBtn').disabled = !this.selectedPurchase;
    }

    updateLogDisplay() {
        const logArea = document.getElementById('logArea');
        logArea.innerHTML = this.gameState.log.slice(0, 50).map(entry => `
            <div class="log-entry ${entry.type}">
                <span style="color:#888;">[${entry.timestamp}]</span> ${entry.message}
            </div>
        `).join('');
    }
}
