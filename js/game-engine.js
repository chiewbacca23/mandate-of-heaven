// js/game-engine.js - Complete Game Engine

import { Player } from './player.js';
import { GAME_CONFIG, RESOURCE_ICONS, dataLoader } from './config.js';
import { StatsManager } from './stats-manager.js';

export class GameEngine {
    constructor(gameData, logFunction, statsManager = null) {
        this.gameData = gameData;
        this.log = logFunction || console.log;
        this.statsManager = statsManager || new StatsManager();
        
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
                titleAcquisitions: {}
            }
        };
    }

    startNewGame(playerCount = 2) {
        this.gameState.players = [];
        this.gameState.turn = 1;
        this.gameState.phase = 'deployment';
        this.gameState.purchasedHeroes = [];
        
        // Select 8 random events from the event pool
        this.gameState.events = dataLoader.shuffle(this.gameData.events).slice(0, GAME_CONFIG.MAX_TURNS);
        this.gameState.currentEvent = this.gameState.events[0];
        
        // Setup markets
        const heroMarketSize = playerCount === 2 ? GAME_CONFIG.HERO_MARKET_2P : GAME_CONFIG.HERO_MARKET_3P_PLUS;
        const turn1Bonus = GAME_CONFIG.TURN_1_BONUS_HEROES;
        this.gameState.heroMarket = dataLoader.shuffle([...this.gameData.heroes]).slice(0, heroMarketSize + turn1Bonus);
        this.gameState.titleMarket = dataLoader.shuffle([...this.gameData.titles]).slice(0, playerCount + GAME_CONFIG.TITLE_MARKET_BONUS);
        
        // Shuffle provinces for random assignment
        const shuffledProvinces = dataLoader.shuffle([...GAME_CONFIG.PROVINCES]);
        
        // Shuffle provincial units
        const shuffledProvincialUnits = dataLoader.shuffle([...GAME_CONFIG.PROVINCIAL_UNITS]);
        
        // Create players with provinces and provincial units
        for (let i = 0; i < playerCount; i++) {
            const province = shuffledProvinces[i];
            const player = new Player(i, `Player ${i + 1}`, this, province);
            
            // Deal 2 provincial units, AI picks best
            const option1 = shuffledProvincialUnits[i * 2];
            const option2 = shuffledProvincialUnits[i * 2 + 1];
            
            if (option1 && option2) {
                const totalStats1 = (option1.military || 0) + (option1.influence || 0) + (option1.supplies || 0) + (option1.piety || 0);
                const totalStats2 = (option2.military || 0) + (option2.influence || 0) + (option2.supplies || 0) + (option2.piety || 0);
                player.provincialUnit = totalStats1 >= totalStats2 ? {...option1} : {...option2};
                player.hand.push(player.provincialUnit);
            }
            
            // Give starting peasants
            for (let j = 0; j < 4; j++) {
                player.hand.push(dataLoader.createPeasant(j));
            }
            
            this.gameState.players.push(player);
        }
        
        this.log(`🎮 Game started: ${playerCount} players, Event: ${this.gameState.currentEvent.name}`);
        this.gameState.players.forEach(p => {
            this.log(`  ${p.name}: ${p.province.name} (Priority ${p.province.priority}, +1 ${p.province.bonusResource}), Unit: ${p.provincialUnit?.name || 'None'}`);
        });
    }

    async runFullGame() {
        this.startNewGame(2);
        
        while (this.gameState.turn <= GAME_CONFIG.MAX_TURNS) {
            await this.runTurn();
        }
        
        this.endGame();
    }

    async runTurn() {
        // Deployment Phase
        this.gameState.phase = 'deployment';
        this.gameState.players.forEach(p => p.deployCards('strategic'));
        
        // Reveal & Turn Order
        this.gameState.phase = 'reveal';
        this.calculateTurnOrder();
        
        // Purchase Phase
        this.gameState.phase = 'purchase';
        this.gameState.turnOrder.forEach(p => p.makePurchase(this.gameState.turn));
        
        // Cleanup Phase
        this.gameState.phase = 'cleanup';
        this.cleanupPhase();
    }

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
            // 1. Most leading resource
            if (a.leadingValue !== b.leadingValue) return b.leadingValue - a.leadingValue;
            
            // 2. Most cards in kingdoms (Shu > Wu > Wei)
            if (a.shuCards !== b.shuCards) return b.shuCards - a.shuCards;
            if (a.wuCards !== b.wuCards) return b.wuCards - a.wuCards;
            if (a.weiCards !== b.weiCards) return b.weiCards - a.weiCards;
            
            // 3. Province priority (lower number = higher priority)
            const aPriority = a.player.province?.priority || 999;
            const bPriority = b.player.province?.priority || 999;
            return aPriority - bPriority;
        });
        
        this.gameState.turnOrder = playerData.map(pd => pd.player);
    }

    cleanupPhase() {
        const playerCount = this.gameState.players.length;
        const baseHeroSize = playerCount === 2 ? GAME_CONFIG.HERO_MARKET_2P : GAME_CONFIG.HERO_MARKET_3P_PLUS;
        
        // Remove turn 1 bonus heroes after turn 1
        const targetSize = this.gameState.turn === 1 ? baseHeroSize + GAME_CONFIG.TURN_1_BONUS_HEROES : baseHeroSize;
        
        // Discard bottom 2 heroes (or more if we're over target after purchases)
        const toDiscard = Math.max(
            GAME_CONFIG.HEROES_DISCARDED_PER_TURN,
            this.gameState.heroMarket.length - baseHeroSize
        );
        
        if (this.gameState.heroMarket.length >= toDiscard) {
            this.gameState.heroMarket.splice(-toDiscard, toDiscard);
        }
        
        // Refill to base size
        const availableHeroes = this.gameData.heroes.filter(h => 
            !this.gameState.heroMarket.some(mh => mh.id === h.id) && 
            !this.gameState.purchasedHeroes.some(ph => ph.id === h.id)
        );
        
        while (this.gameState.heroMarket.length < baseHeroSize && availableHeroes.length > 0) {
            const randomIndex = Math.floor(Math.random() * availableHeroes.length);
            const newHero = availableHeroes.splice(randomIndex, 1)[0];
            this.gameState.heroMarket.push(newHero);
        }
        
        // Advance turn
        this.gameState.turn++;
        if (this.gameState.turn <= GAME_CONFIG.MAX_TURNS) {
            this.gameState.currentEvent = this.gameState.events[this.gameState.turn - 1];
        }
    }

    endGame() {
        console.log('=== ENDGAME CALLED ===');
        
        // Calculate title scores
        this.gameState.players.forEach(player => {
            console.log(`Scoring ${player.name}: ${player.titles.length} titles, ${player.emergencyUsed} emergency`);
            player.score = -player.emergencyUsed;
            
            player.titles.forEach(titleEntry => {
                const { points } = player.calculateCollectionScore(titleEntry.title);
                console.log(`  Title "${titleEntry.title.name}" scored ${points} points`);
                player.score += points;
                
                const titleName = titleEntry.title.name;
                this.gameState.stats.titleAcquisitions[titleName] = 
                    (this.gameState.stats.titleAcquisitions[titleName] || 0) + 1;
            });
            
            console.log(`  ${player.name} final score before bonuses: ${player.score}`);
        });
        
        // Resource majority bonuses
        const resourceCounts = { military: 0, influence: 0, supplies: 0, piety: 0 };
        this.gameState.events.forEach(event => {
            // Normalize to lowercase to match GAME_CONFIG.RESOURCES
            const resource = (event.leadingResource || '').toLowerCase();
            if (resourceCounts[resource] !== undefined) {
                resourceCounts[resource]++;
            }
        });
        
        console.log('Resource counts from events:', resourceCounts);
        
        console.log('\n=== RESOURCE MAJORITY BONUSES ===');
        
        GAME_CONFIG.RESOURCES.forEach(res => {
            const bonus = resourceCounts[res];
            if (bonus > 0) {
                let maxValue = 0;
                let winners = [];
                
                this.gameState.players.forEach(player => {
                    const total = player.getTotalResources()[res];
                    console.log(`  ${player.name} has ${total} ${res}`);
                    if (total > maxValue) {
                        maxValue = total;
                        winners = [player];
                    } else if (total === maxValue && total > 0) {
                        winners.push(player);
                    }
                });
                
                if (winners.length === 1) {
                    console.log(`  ✓ ${winners[0].name} wins ${res} majority: +${bonus} points`);
                    winners[0].score += bonus;
                    
                    // Track in stats
                    if (this.statsManager) {
                        this.statsManager.recordResourceMajority(res, bonus);
                    }
                } else {
                    console.log(`  ✗ ${res} majority tied between ${winners.map(p => p.name).join(', ')}, no bonus awarded`);
                }
            }
        });
        
        // Determine winner
        const sorted = [...this.gameState.players].sort((a, b) => b.score - a.score);
        const winner = sorted[0];
        
        // Record game in stats manager
        this.statsManager.recordGame(this.gameState);
        
        // Update statistics
        this.gameState.stats.gamesPlayed++;
        this.gameState.stats.totalScores.push(...this.gameState.players.map(p => p.score));
        this.gameState.stats.totalEmergency += this.gameState.players.reduce((sum, p) => sum + p.emergencyUsed, 0);
        this.gameState.stats.totalTitles += this.gameState.players.reduce((sum, p) => sum + p.titles.length, 0);
        this.gameState.stats.winners[winner.name] = (this.gameState.stats.winners[winner.name] || 0) + 1;
    }

    getStats() {
        const stats = this.gameState.stats;
        const avgScore = stats.totalScores.length > 0 ? 
            (stats.totalScores.reduce((a, b) => a + b, 0) / stats.totalScores.length).toFixed(1) : 0;
        
        const avgEmergency = stats.gamesPlayed > 0 ? 
            (stats.totalEmergency / stats.gamesPlayed).toFixed(1) : 0;
        
        return {
            gamesPlayed: stats.gamesPlayed,
            averageScore: avgScore,
            averageEmergency: avgEmergency,
            winners: stats.winners,
            titleAcquisitions: stats.titleAcquisitions
        };
    }
}
