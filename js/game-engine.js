// js/game-engine.js - Data-Aware Game Engine
import { Player } from './player.js';
import { GAME_CONFIG, RESOURCE_ICONS, dataLoader } from './config.js';

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
            purchasedHeroes: [],
            stats: {
                gamesPlayed: 0,
                totalScores: [],
                totalEmergency: 0,
                totalPasses: 0,
                totalTitles: 0,
                totalHeroes: 0,
                winners: {},
                titleAcquisitions: {},
                heroAcquisitions: {}
            }
        };
        
        // Data storage
        this.gameData = {
            heroes: [],
            titles: [],
            events: []
        };
        
        this.dataLoaded = false;
    }
    
    async initialize() {
        try {
            this.log('Initializing game engine with data from JSON files...', 'info');
            
            // Load all game data from JSON files
            const loadedData = await dataLoader.loadAllData();
            
            this.gameData.heroes = loadedData.heroes;
            this.gameData.titles = loadedData.titles;
            this.gameData.events = loadedData.events;
            
            this.dataLoaded = true;
            
            this.log(`✅ Game engine initialized successfully!`, 'success');
            this.log(`📊 Loaded: ${this.gameData.heroes.length} heroes, ${this.gameData.titles.length} titles, ${this.gameData.events.length} events`, 'info');
            
            return true;
            
        } catch (error) {
            this.log(`❌ Failed to initialize game engine: ${error.message}`, 'error');
            throw error;
        }
    }
    
    log(message, type = 'info') {
        // Send to main log function if available
        if (window.addLog) {
            window.addLog(message, type);
        } else {
            console.log(`[${type.toUpperCase()}] ${message}`);
        }
    }
    
    // Start a new game
    startNewGame(playerCount = 2) {
        if (!this.dataLoaded) {
            throw new Error('Game data not loaded. Call initialize() first.');
        }
        
        this.gameState.players = [];
        this.gameState.turn = 1;
        this.gameState.phase = 'deployment';
        this.gameState.purchasedHeroes = [];
        
        // Shuffle events from loaded data
        this.gameState.events = dataLoader.shuffle(this.gameData.events);
        this.gameState.currentEvent = this.gameState.events[0];
        
        // Setup markets from loaded data
        const heroMarketSize = playerCount === 2 ? GAME_CONFIG.HERO_MARKET_2P : GAME_CONFIG.HERO_MARKET_3P_PLUS;
        const turn1Bonus = GAME_CONFIG.TURN_1_BONUS_HEROES;
        this.gameState.heroMarket = dataLoader.shuffle(this.gameData.heroes).slice(0, heroMarketSize + turn1Bonus);
        this.gameState.titleMarket = dataLoader.shuffle(this.gameData.titles).slice(0, playerCount + GAME_CONFIG.TITLE_MARKET_BONUS);
        
        // Create players with peasants
        for (let i = 0; i < playerCount; i++) {
            const player = new Player(i, `Player ${i + 1}`, this);
            
            // Give starting peasants
            for (let j = 0; j < 4; j++) {
                player.hand.push(dataLoader.createPeasant(j));
            }
            
            this.gameState.players.push(player);
        }
        
        this.log(`🎮 New game started with ${playerCount} players`, 'important');
        this.log(`📋 Using ${this.gameState.events[0].name} as first event (${RESOURCE_ICONS[this.gameState.events[0].leadingResource]} ${this.gameState.events[0].leadingResource})`, 'info');
        
        return this.gameState;
    }
    
    // Execute one step of the game
    nextStep(strategy = 'strategic') {
        if (!this.dataLoaded) {
            throw new Error('Game data not loaded');
        }
        
        switch(this.gameState.phase) {
            case 'deployment':
                this.log(`--- Turn ${this.gameState.turn}: Deployment (${this.gameState.currentEvent.name}) ---`, 'important');
                this.gameState.players.forEach(p => p.deployCards(strategy));
                this.gameState.phase = 'reveal';
                break;
                
            case 'reveal':
                this.log(`--- Turn ${this.gameState.turn}: Turn Order Calculation ---`, 'important');
                this.calculateTurnOrder();
                this.gameState.phase = 'purchase';
                break;
                
            case 'purchase':
                this.log(`--- Turn ${this.gameState.turn}: Purchase Phase ---`, 'important');
                this.gameState.players.forEach(p => p.makePurchase(this.gameState.turn));
                this.gameState.phase = 'cleanup';
                break;
                
            case 'cleanup':
                this.cleanupPhase();
                if (this.gameState.turn > GAME_CONFIG.MAX_TURNS) {
                    this.endGame();
                    return 'game_ended';
                }
                this.gameState.phase = 'deployment';
                break;
        }
        
        return this.gameState.phase;
    }
    
    // Calculate turn order based on current event
    calculateTurnOrder() {
        const lead = this.gameState.currentEvent.leadingResource;

        const leadIcon = this.RESOURCE_ICONS[lead] || '❓';
        
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
        
        // Sort by turn order rules from game rules
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
        
        const availableHeroes = this.gameData.heroes.filter(h => 
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
            this.log(`Turn ${this.gameState.turn} begins - ${this.gameState.currentEvent.name} (${RESOURCE_ICONS[this.gameState.currentEvent.leadingResource]} ${this.gameState.currentEvent.leadingResource})`, 'important');
        }
    }
    
    // End game and calculate final scores
    endGame() {
        this.log(`=== GAME ENDED - FINAL SCORING ===`, 'important');
        
        // Calculate title scores based on actual collections
        this.gameState.players.forEach(player => {
            player.score = -player.emergencyUsed; // Start with emergency penalties
            
            player.titles.forEach(titleEntry => {
                const { collectionSize, points } = player.calculateCollectionScore(titleEntry.title);
                player.score += points;
                this.log(`${player.name}: "${titleEntry.title.name}" - Collection: ${collectionSize}, Points: ${points}`);
                
                // Track title acquisitions
                const titleName = titleEntry.title.name;
                this.gameState.stats.titleAcquisitions[titleName] = (this.gameState.stats.titleAcquisitions[titleName] || 0) + 1;
            });
        });
        
        // Resource majority bonuses based on event frequency
        const resourceCounts = { military: 0, influence: 0, supplies: 0, piety: 0 };
        this.gameState.events.slice(0, GAME_CONFIG.MAX_TURNS).forEach(event => {
            resourceCounts[event.leadingResource]++;
        });
        
        this.log(`--- RESOURCE MAJORITY BONUSES ---`, 'important');
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
                    this.log(`${winners[0].name} wins ${res} majority (${maxValue} total) for +${bonus} points`);
                }
            }
        });
        
        // Final scores
        const sorted = [...this.gameState.players].sort((a, b) => b.score - a.score);
        
        this.log(`--- FINAL SCORES ---`, 'important');
        sorted.forEach((player, i) => {
            this.log(`${i + 1}. ${player.name}: ${player.score} points (${player.titles.length} titles, ${player.emergencyUsed} emergency)`);
        });
        
        const winner = sorted[0];
        this.log(`🏆 WINNER: ${winner.name} with ${winner.score} points!`, 'success');
        
        // Update statistics
        this.gameState.stats.gamesPlayed++;
        this.gameState.stats.totalScores.push(...this.gameState.players.map(p => p.score));
        this.gameState.stats.totalEmergency += this.gameState.players.reduce((sum, p) => sum + p.emergencyUsed, 0);
        this.gameState.stats.totalTitles += this.gameState.players.reduce((sum, p) => sum + p.titles.length, 0);
        this.gameState.stats.totalHeroes += this.gameState.players.reduce((sum, p) => sum + p.getAllHeroes().length, 0);
        this.gameState.stats.winners[winner.name] = (this.gameState.stats.winners[winner.name] || 0) + 1;
        
        return winner;
    }
    
    // Run complete simulation
    async runSimulation(numGames = 1, playerCount = 2, strategy = 'strategic') {
        if (!this.dataLoaded) {
            await this.initialize();
        }
        
        const results = [];
        
        for (let game = 0; game < numGames; game++) {
            this.startNewGame(playerCount);
            
            let steps = 0;
            while (this.gameState.turn <= GAME_CONFIG.MAX_TURNS && steps < 100) {
                const phaseResult = this.nextStep(strategy);
                steps++;
                if (phaseResult === 'game_ended' || this.gameState.turn > GAME_CONFIG.MAX_TURNS) break;
            }
            
            if (steps >= 100) {
                this.log(`Game ${game + 1} stopped: too many steps`, 'error');
            }
            
            const winner = this.gameState.players.reduce((prev, current) => 
                (prev.score > current.score) ? prev : current
            );
            
            results.push({
                game: game + 1,
                winner: winner.name,
                winnerScore: winner.score,
                players: this.gameState.players.map(p => ({
                    name: p.name,
                    score: p.score,
                    titles: p.titles.length,
                    heroes: p.getAllHeroes().length,
                    emergencyUsed: p.emergencyUsed
                })),
                steps: steps
            });
        }
        
        return results;
    }
    
    // Export game data including loaded JSON data
    exportData() {
        return {
            gameState: this.gameState,
            gameData: {
                heroesCount: this.gameData.heroes.length,
                titlesCount: this.gameData.titles.length,
                eventsCount: this.gameData.events.length
            },
            stats: this.gameState.stats,
            timestamp: new Date().toISOString(),
            version: '2.0-data-aware'
        };
    }
    
    // Get summary statistics
    getStats() {
        const stats = this.gameState.stats;
        const avgScore = stats.totalScores.length > 0 ? 
            (stats.totalScores.reduce((a, b) => a + b, 0) / stats.totalScores.length).toFixed(1) : 0;
        
        const avgEmergency = stats.gamesPlayed > 0 ? 
            (stats.totalEmergency / stats.gamesPlayed).toFixed(1) : 0;
        
        const avgTitles = stats.gamesPlayed > 0 ? 
            (stats.totalTitles / stats.gamesPlayed).toFixed(1) : 0;
        
        return {
            gamesPlayed: stats.gamesPlayed,
            averageScore: avgScore,
            averageEmergency: avgEmergency,
            averageTitles: avgTitles,
            winners: stats.winners,
            titleAcquisitions: stats.titleAcquisitions,
            dataLoaded: this.dataLoaded,
            dataStats: this.dataLoaded ? {
                heroes: this.gameData.heroes.length,
                titles: this.gameData.titles.length,
                events: this.gameData.events.length
            } : null
        };
    }
}
