// js/game-engine.js - Core Game Engine Module

import { GAME_CONFIG, RESOURCE_ICONS, HEROES_DATA, TITLES_DATA, EVENTS_DATA } from './config.js';
import { Player } from './player.js';

export class GameEngine {
    constructor() {
        this.gameState = {
            players: [],
            turn: 0,
            phase: 'setup',
            events: [],
            currentEvent: null,
            heroMarket: [],
            titleMarket: [],
            turnOrder: [],
            purchasedHeroes: [],
            stats: {
                gamesPlayed: 0,
                totalScores: [],
                totalEmergency: 0,
                totalPasses: 0,
                totalTitles: 0,
                totalHeroes: 0
            }
        };
    }

    // Initialize the game engine
    async initialize() {
        this.log('GameEngine initialized successfully');
        return true;
    }

    // Utility functions
    shuffle(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    createPeasant(type) {
        const names = ['Military Peasant', 'Influence Peasant', 'Supplies Peasant', 'Piety Peasant'];
        const card = {
            name: names[type],
            allegiance: 'Peasant',
            role: 'Peasant',
            military: 0,
            influence: 0,
            supplies: 0,
            piety: 0
        };
        card[GAME_CONFIG.RESOURCES[type]] = 2;
        return card;
    }

    log(message, important = false) {
        try {
            const logDiv = document.getElementById('logArea');
            if (logDiv) {
                const entry = document.createElement('div');
                entry.className = important ? 'log-entry important' : 'log-entry';
                entry.textContent = `[T${this.gameState.turn}] ${message}`;
                logDiv.insertBefore(entry, logDiv.firstChild);
                
                while (logDiv.children.length > 100) {
                    logDiv.removeChild(logDiv.lastChild);
                }
            }
            console.log(message);
        } catch (e) {
            console.log(message);
        }
    }

    // Start a new game
    startNewGame(playerCount = 2) {
        this.gameState.players = [];
        this.gameState.turn = 1;
        this.gameState.phase = 'deployment';
        this.gameState.purchasedHeroes = [];
        
        // Shuffle events and heroes
        this.gameState.events = this.shuffle(EVENTS_DATA);
        this.gameState.currentEvent = this.gameState.events[0];
        
        // Setup markets
        const heroMarketSize = playerCount === 2 ? GAME_CONFIG.HERO_MARKET_2P : GAME_CONFIG.HERO_MARKET_3P_PLUS;
        const turn1Bonus = GAME_CONFIG.TURN_1_BONUS_HEROES;
        this.gameState.heroMarket = this.shuffle(HEROES_DATA).slice(0, heroMarketSize + turn1Bonus);
        this.gameState.titleMarket = this.shuffle(TITLES_DATA).slice(0, playerCount + GAME_CONFIG.TITLE_MARKET_BONUS);
        
        // Create players with peasants
        for (let i = 0; i < playerCount; i++) {
            const player = new Player(i, `Player ${i + 1}`, this);
            for (let j = 0; j < 4; j++) {
                player.hand.push(this.createPeasant(j));
            }
            this.gameState.players.push(player);
        }
        
        this.log(`=== NEW GAME STARTED (${playerCount} players) ===`, true);
        this.log(`Hero Pool: ${HEROES_DATA.length} total, Title Pool: ${TITLES_DATA.length} total`);
        
        return this.gameState;
    }

    // Execute one step of the game
    nextStep(strategy = 'strategic') {
        switch(this.gameState.phase) {
            case 'deployment':
                this.log(`--- Turn ${this.gameState.turn}: Deployment (${this.gameState.currentEvent.name}) ---`, true);
                this.gameState.players.forEach(p => p.deployCards(strategy));
                this.gameState.phase = 'reveal';
                break;
                
            case 'reveal':
                this.log(`--- Turn ${this.gameState.turn}: Turn Order Calculation ---`, true);
                this.calculateTurnOrder();
                this.gameState.phase = 'purchase';
                break;
                
            case 'purchase':
                this.log(`--- Turn ${this.gameState.turn}: Purchase Phase ---`, true);
                this.gameState.turnOrder.forEach(p => p.makePurchase(this.gameState.turn));
                this.gameState.phase = 'cleanup';
                break;
                
            case 'cleanup':
                this.cleanupPhase();
                if (this.gameState.turn > GAME_CONFIG.MAX_TURNS) {
                    this.endGame();
                    return;
                }
                this.gameState.phase = 'deployment';
                break;
        }
        
        return this.gameState;
    }

    // Calculate turn order based on current event
    calculateTurnOrder() {
        const lead = this.gameState.currentEvent.leadingResource;
        
        const playerData = this.gameState.players.map((player, index) => {
            const resources = player.calculateBattlefieldResources();
            return {
                player: player,
                index: index,
                leadingValue: resources[lead],
                shuCards: player.battlefield.shu.length,
                wuCards: player.battlefield.wu.length,
                weiCards: player.battlefield.wei.length
            };
        });
        
        // Sort by turn order rules
        playerData.sort((a, b) => {
            if (a.leadingValue !== b.leadingValue) return b.leadingValue - a.leadingValue;
            if (a.shuCards !== b.shuCards) return b.shuCards - a.shuCards;
            if (a.wuCards !== b.wuCards) return b.wuCards - a.wuCards;
            if (a.weiCards !== b.weiCards) return b.weiCards - a.weiCards;
            return a.index - b.index;
        });
        
        this.gameState.turnOrder = playerData.map(pd => pd.player);
        
        playerData.forEach((pd, i) => {
            this.log(`${i + 1}. ${pd.player.name}: ${RESOURCE_ICONS[lead]}${pd.leadingValue} (S:${pd.shuCards} W:${pd.wuCards} WE:${pd.weiCards})`);
        });
    }

    // Cleanup phase at end of turn
    cleanupPhase() {
        this.log(`--- Turn ${this.gameState.turn}: Cleanup ---`);
        
        // Market cleanup - discard bottom 2 heroes
        if (this.gameState.heroMarket.length >= GAME_CONFIG.HEROES_DISCARDED_PER_TURN) {
            const discarded = this.gameState.heroMarket.splice(-GAME_CONFIG.HEROES_DISCARDED_PER_TURN, GAME_CONFIG.HEROES_DISCARDED_PER_TURN);
            this.log(`Market cleanup: Discarded ${discarded.map(h => h.name).join(', ')}`);
        }
        
        // Refill markets
        const playerCount = this.gameState.players.length;
        const targetHeroSize = playerCount === 2 ? GAME_CONFIG.HERO_MARKET_2P : GAME_CONFIG.HERO_MARKET_3P_PLUS;
        
        const availableHeroes = HEROES_DATA.filter(h => 
            !this.gameState.heroMarket.some(mh => mh.id === h.id) && 
            !this.gameState.purchasedHeroes.some(ph => ph.id === h.id)
        );
        
        while (this.gameState.heroMarket.length < targetHeroSize && availableHeroes.length > 0) {
            const randomIndex = Math.floor(Math.random() * availableHeroes.length);
            const newHero = availableHeroes.splice(randomIndex, 1)[0];
            this.gameState.heroMarket.push(newHero);
        }
        
        this.gameState.turn++;
        if (this.gameState.turn <= GAME_CONFIG.MAX_TURNS) {
            this.gameState.currentEvent = this.gameState.events[this.gameState.turn - 1] || this.gameState.events[0];
            this.log(`Turn ${this.gameState.turn} begins - ${this.gameState.currentEvent.name}`, true);
        }
    }

    // End game and calculate final scores
    endGame() {
        this.log(`=== GAME ENDED - FINAL SCORING ===`, true);
        
        // Calculate title scores at end based on collections
        this.gameState.players.forEach(player => {
            player.score = -player.emergencyUsed; // Reset to just emergency penalties
            
            player.titles.forEach(titleEntry => {
                const { collectionSize, points } = player.calculateCollectionScore(titleEntry.title);
                player.score += points;
                this.log(`${player.name}: "${titleEntry.title.name}" - Collection: ${collectionSize}, Points: ${points}`);
            });
        });
        
        // Resource majority bonuses (simplified for now)
        const resourceCounts = { military: 0, influence: 0, supplies: 0, piety: 0 };
        this.gameState.events.forEach(event => {
            resourceCounts[event.leadingResource]++;
        });
        
        this.log(`--- RESOURCE MAJORITY BONUSES ---`, true);
        GAME_CONFIG.RESOURCES.forEach(res => {
            const bonus = resourceCounts[res];
            if (bonus > 0) {
                let maxValue = 0;
                let winners = [];
                
                this.gameState.players.forEach(player => {
                    const total = player.getTotalResources()[res];
                    if (total > maxValue) {
                        maxValue = total;
                        winners = [player];
                    } else if (total === maxValue && total > 0) {
                        winners.push(player);
                    }
                });
                
                if (winners.length === 1) {
                    winners[0].score += bonus;
                    this.log(`${winners[0].name} wins ${res} majority (${maxValue}) for +${bonus} points`);
                }
            }
        });
        
        // Final scores
        const sorted = [...this.gameState.players].sort((a, b) => b.score - a.score);
        
        this.log(`--- FINAL SCORES ---`, true);
        sorted.forEach((player, i) => {
            this.log(`${i + 1}. ${player.name}: ${player.score} points (${player.titles.length} titles, ${player.emergencyUsed} emergency)`);
        });
        
        const winner = sorted[0];
        this.log(`--- WINNER: ${winner.name} with ${winner.score} points! ---`, true);
        
        // Update statistics
        this.gameState.stats.gamesPlayed++;
        this.gameState.stats.totalScores.push(...this.gameState.players.map(p => p.score));
        this.gameState.stats.totalEmergency += this.gameState.players.reduce((sum, p) => sum + p.emergencyUsed, 0);
        this.gameState.stats.totalTitles += this.gameState.players.reduce((sum, p) => sum + p.titles.length, 0);
        this.gameState.stats.totalHeroes += this.gameState.players.reduce((sum, p) => sum + p.getAllHeroes().length, 0);
        
        return sorted[0]; // Return winner
    }

    // Run a complete game simulation
    async runSimulation(numGames = 1, playerCount = 2, strategy = 'strategic') {
        const results = [];
        
        for (let game = 0; game < numGames; game++) {
            this.startNewGame(playerCount);
            
            let steps = 0;
            while (this.gameState.turn <= GAME_CONFIG.MAX_TURNS && steps < 100) {
                this.nextStep(strategy);
                steps++;
                if (this.gameState.turn > GAME_CONFIG.MAX_TURNS) break;
            }
            
            if (steps >= 100) {
                this.log(`Game ${game + 1} stopped: too many steps`, true);
            }
            
            results.push({
                game: game + 1,
                winner: this.gameState.players.reduce((prev, current) => 
                    (prev.score > current.score) ? prev : current
                ),
                scores: this.gameState.players.map(p => p.score),
                steps: steps
            });
        }
        
        return results;
    }

    // Export game data
    exportData() {
        return {
            gameState: this.gameState,
            stats: this.gameState.stats,
            timestamp: new Date().toISOString()
        };
    }

    // Clear statistics
    clearStats() {
        this.gameState.stats = {
            gamesPlayed: 0,
            totalScores: [],
            totalEmergency: 0,
            totalPasses: 0,
            totalTitles: 0,
            totalHeroes: 0
        };
        this.log(`--- STATISTICS CLEARED ---`, true);
    }
}
