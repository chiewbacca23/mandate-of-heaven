// game-engine.js - Core Game Logic Module

class GameEngine {
    constructor(gameData, playerCount, logger) {
        this.gameData = gameData;
        this.playerCount = playerCount;
        this.log = logger || console.log;
        
        // Game state
        this.players = [];
        this.turn = 1;
        this.phase = 'setup';
        this.currentEvent = null;
        this.events = [];
        this.heroMarket = [];
        this.titleMarket = [];
        this.purchasedHeroes = [];
        this.turnOrder = [];
    }

    // Initialize new game
    initialize() {
        this.log('🎲 Initializing game...', 'important');
        
        // Create players
        for (let i = 0; i < this.playerCount; i++) {
            const player = new Player(i, `Player ${i + 1}`, this);
            player.addPeasants(); // Give each player 4 peasants
            this.players.push(player);
        }

        // Shuffle and select events for this game
        this.events = this.shuffleArray([...this.gameData.events]).slice(0, GAME_CONFIG.TOTAL_TURNS);
        this.currentEvent = this.events[0];

        // Initialize markets
        this.setupMarkets();

        this.phase = 'deployment';
        this.log(`✅ Game initialized: ${this.playerCount} players, ${GAME_CONFIG.TOTAL_TURNS} turns`);
    }

    // Setup hero and title markets
    setupMarkets() {
        // Hero market size based on player count
        const baseSize = GAME_CONFIG.HERO_MARKET_SIZE[this.playerCount] || 4;
        const turn1Bonus = this.turn === 1 ? GAME_CONFIG.TURN_1_HERO_BONUS : 0;
        const heroMarketSize = baseSize + turn1Bonus;

        this.heroMarket = this.shuffleArray([...this.gameData.heroes]).slice(0, heroMarketSize);

        // Title market: playerCount + 2
        const titleMarketSize = this.playerCount + GAME_CONFIG.TITLE_MARKET_BONUS;
        this.titleMarket = this.shuffleArray([...this.gameData.titles]).slice(0, titleMarketSize);

        this.log(`📊 Markets: ${this.heroMarket.length} heroes, ${this.titleMarket.length} titles`);
    }

    // Execute one step of the game
    executeStep() {
        switch (this.phase) {
            case 'deployment':
                return this.deploymentPhase();
            case 'reveal':
                return this.revealPhase();
            case 'purchase':
                return this.purchasePhase();
            case 'cleanup':
                return this.cleanupPhase();
            case 'endgame':
                return this.endGamePhase();
            default:
                return true; // Game over
        }
    }

    // Phase 1: All players deploy cards simultaneously
    deploymentPhase() {
        this.log(`--- Turn ${this.turn}: Deployment Phase ---`, 'important');
        const leadingRes = this.currentEvent.leadingResource;
        const resIcon = getResourceIcon(leadingRes);
        this.log(`Event: ${this.currentEvent.name} (Leading: ${resIcon} ${leadingRes})`);

        // All players deploy simultaneously
        this.players.forEach(player => {
            player.deployCards();
        });

        this.phase = 'reveal';
        return false; // Game continues
    }

    // Phase 2: Calculate turn order
    revealPhase() {
        this.log(`--- Turn ${this.turn}: Reveal & Turn Order ---`, 'important');
        this.calculateTurnOrder();
        this.phase = 'purchase';
        return false; // Game continues
    }

    // Calculate turn order based on leading resource
    calculateTurnOrder() {
        const leadingResource = this.currentEvent.leadingResource;

        const playerData = this.players.map((player, index) => {
            const resources = player.calculateBattlefieldResources();
            const kingdoms = player.battlefield;

            return {
                player: player,
                index: index,
                leadingValue: resources[leadingResource] || 0,
                shuCards: kingdoms.shu.length,
                wuCards: kingdoms.wu.length,
                weiCards: kingdoms.wei.length
            };
        });

        // Sort by game rules: leading resource > Shu > Wu > Wei > player index
        playerData.sort((a, b) => {
            if (a.leadingValue !== b.leadingValue) return b.leadingValue - a.leadingValue;
            if (a.shuCards !== b.shuCards) return b.shuCards - a.shuCards;
            if (a.wuCards !== b.wuCards) return b.wuCards - a.wuCards;
            if (a.weiCards !== b.weiCards) return b.weiCards - a.weiCards;
            return a.index - b.index;
        });

        this.turnOrder = playerData.map(pd => pd.player);

        // Log turn order
        const resIcon = RESOURCE_ICONS[leadingResource] || '❓';
        playerData.forEach((pd, i) => {
            const resValue = pd.leadingValue || 0;
            this.log(`${i + 1}. ${pd.player.name}: ${resIcon}${resValue} (S:${pd.shuCards} W:${pd.wuCards} WE:${pd.weiCards})`);
        });
    }

    // Phase 3: Players make purchases in turn order
    purchasePhase() {
        this.log(`--- Turn ${this.turn}: Purchase Phase ---`, 'important');

        // Simple purchase phase for testing - players just pass for now
        this.turnOrder.forEach(player => {
            try {
                // Simplified: just return cards to hand for now
                player.returnCardsToHand();
                this.log(`${player.name} returns cards to hand (purchase logic coming soon)`);
            } catch (error) {
                this.log(`ERROR in ${player.name} purchase: ${error.message}`, 'error');
            }
        });

        this.phase = 'cleanup';
        return false; // Game continues
    }

    // Phase 4: Cleanup and advance turn
    cleanupPhase() {
        this.log(`--- Turn ${this.turn}: Cleanup ---`);

        // Market cleanup - discard bottom 2 heroes
        if (this.heroMarket.length >= 2) {
            const discarded = this.heroMarket.splice(-2, 2);
            this.log(`Market cleanup: Discarded ${discarded.map(h => h.name).join(', ')}`);
        }

        // Refill hero market
        this.refillHeroMarket();

        // Advance turn
        this.turn++;
        
        if (this.turn > GAME_CONFIG.TOTAL_TURNS) {
            this.phase = 'endgame';
        } else {
            this.currentEvent = this.events[this.turn - 1];
            this.phase = 'deployment';
            this.log(`Turn ${this.turn} begins: ${this.currentEvent.name}`, 'important');
        }

        return false; // Game continues
    }

    // Refill hero market to target size
    refillHeroMarket() {
        const targetSize = GAME_CONFIG.HERO_MARKET_SIZE[this.playerCount] || 4;
        
        const availableHeroes = this.gameData.heroes.filter(hero => 
            !this.heroMarket.some(mh => mh.id === hero.id) && 
            !this.purchasedHeroes.some(ph => ph.id === hero.id)
        );

        while (this.heroMarket.length < targetSize && availableHeroes.length > 0) {
            const randomIndex = Math.floor(Math.random() * availableHeroes.length);
            const newHero = availableHeroes.splice(randomIndex, 1)[0];
            this.heroMarket.push(newHero);
        }
        
        if (availableHeroes.length === 0 && this.heroMarket.length < targetSize) {
            this.log(`⚠️ HERO POOL DEPLETED! Only ${this.heroMarket.length}/${targetSize} heroes in market`, 'error');
        }
    }

    // Phase 5: End game and calculate final scores
    endGamePhase() {
        this.log(`=== FINAL SCORING ===`, 'important');

        // Calculate final scores
        this.players.forEach(player => {
            player.calculateFinalScore();
        });

        // TODO: Add resource majority bonuses
        
        // Sort players by score
        this.players.sort((a, b) => b.score - a.score);

        this.phase = 'complete';
        this.log(`🏁 Game completed! Winner: ${this.players[0].name} with ${this.players[0].score} points`, 'success');
        
        return true; // Game over
    }

    // Get current winner
    getWinner() {
        if (this.players.length === 0) return null;
        return this.players.reduce((winner, player) => 
            player.score > winner.score ? player : winner
        );
    }

    // Utility: Shuffle array
    shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { GameEngine };
}
