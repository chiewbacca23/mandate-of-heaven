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
        
        // Setup events - ensure "Power of the Han Wanes" is first
        const powerEvent = dataLoader.events.find(e => e.Name === "The power of the Han wanes");
        const otherEvents = dataLoader.events.filter(e => e.Name !== "The power of the Han wanes");
        this.gameState.events = [powerEvent, ...dataLoader.shuffle(otherEvents)].slice(0, 8);
        
        // Setup markets
        this.gameState.heroMarket = dataLoader.shuffle([...dataLoader.heroes]).slice(0, 6); // 4 + 2 bonus T1
        this.gameState.titleMarket = dataLoader.shuffle([...dataLoader.titles]).slice(0, 4); // 2 players
        
        // Setup player
        this.gameState.player = {
            hand: this.createStartingHand(),
            battlefield: { wei: [], wu: [], shu: [] },
            titles: [],
            retiredHeroes: [],
            score: 0,
            emergencyUsed: 0
        };
        
        // Start turn 1
        this.gameState.turn = 1;
        this.gameState.currentEvent = this.gameState.events[0];
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
        
        const icon = GAME_CONFIG.RESOURCE_ICONS[this.gameState.currentEvent.Leading_resource];
        this.log(`--- Turn ${this.gameState.turn}: Deployment Phase ---`, 'phase');
        this.log(`Event: ${this.gameState.currentEvent.Name} (${icon} ${this.gameState.currentEvent.Leading_resource})`, 'state');
        this.logMarketState();
        
        this.updateDisplay();
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
        this.log(`Hero Market: ${this.gameState.heroMarket.map(h => h.name).join(', ')}`, 'state');
        this.log(`Title Market: ${this.gameState.titleMarket.map(t => t.Name).join(', ')}`, 'state');
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
        cardsArea.innerHTML = this.gameState.player.hand.map(card => `
            <div class="card ${this.selectedCards.includes(card.id) ? 'selected' : ''}" 
                 onclick="game.toggleCardSelection('${card.id}')">
                <div class="card-name">${card.name}</div>
                <div class="card-resources">
                    ${GAME_CONFIG.RESOURCES.map(r => card[r] ? 
                        `${GAME_CONFIG.RESOURCE_ICONS[r]}${card[r]}` : ''
                    ).filter(s => s).join(' ')}
                </div>
            </div>
        `).join('');
        
        // Render drop zones
        GAME_CONFIG.KINGDOMS.forEach(kingdom => {
            const zone = document.getElementById(`${kingdom}Deployment`);
            zone.innerHTML = this.deployment[kingdom].map(card => `
                <div class="card" onclick="game.deployToKingdom('${card.id}', null)">
                    <div class="card-name">${card.name}</div>
                </div>
            `).join('');
            
            // Make clickable for selected cards
            zone.onclick = () => {
                if (this.selectedCards.length > 0) {
                    this.deployToKingdom(this.selectedCards[0], kingdom);
                    this.selectedCards.splice(0, 1);
                }
            };
        });
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
            return `
                <div class="card ${affordable && hasHero ? 'affordable' : 'unaffordable'}
                            ${this.selectedPurchase?.item === title ? 'selected' : ''}"
                     onclick="game.selectPurchase('title', ${JSON.stringify(title).replace(/"/g, '&quot;')})">
                    <div class="card-name">${title.Name}</div>
                    <div class="card-requirement">${title.Required_Hero || 'Any hero'}</div>
                    <div class="card-cost">Cost: ${GAME_CONFIG.RESOURCES.map(r => title.cost[r] ? 
                        `${GAME_CONFIG.RESOURCE_ICONS[r]}${title.cost[r]}` : ''
                    ).filter(s => s).join(' ')}</div>
                    <div class="card-points">Points: ${(title.points || title.Set_Scoring || [0]).join(', ')}</div>
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
