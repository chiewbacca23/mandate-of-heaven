// stats-manager.js - Statistics and Export Module

class StatsManager {
    constructor() {
        this.stats = {
            gamesPlayed: 0,
            totalScores: [],
            winnerCounts: {},
            titlePurchases: {},
            heroPurchases: {},
            emergencyUses: 0,
            passedTurns: 0,
            turnOrderStats: {},
            resourceMajorities: { military: 0, influence: 0, supplies: 0, piety: 0 },
            gameResults: [], // Store complete game data
            averageGameLength: 0,
            marketData: {
                heroPoolDepletion: [],
                averageMarketCosts: [],
                popularHeroes: {}
            }
        };
    }

    // Record a completed game
    recordGame(gameEngine) {
        this.stats.gamesPlayed++;

        // Basic game data
        const gameResult = {
            gameId: this.stats.gamesPlayed,
            timestamp: new Date().toISOString(),
            playerCount: gameEngine.playerCount,
            finalTurn: gameEngine.turn,
            winner: gameEngine.getWinner()?.name || null,
            players: []
        };

        // Record each player's performance
        gameEngine.players.forEach((player, index) => {
            const playerData = {
                name: player.name,
                finalScore: player.score,
                titlesPurchased: player.titlesPurchased.length,
                heroesOwned: player.getAllHeroes().length,
                emergencyUsed: player.emergencyUsed,
                passedTurns: player.passedTurns,
                finalResources: player.calculateTotalResources(),
                titleDetails: player.titlesPurchased.map(title => ({
                    name: title.name,
                    points: player.calculateTitleScore(title).points
                }))
            };
            
            gameResult.players.push(playerData);
            
            // Update global stats
            this.stats.totalScores.push(player.score);
            this.stats.emergencyUses += player.emergencyUsed;
            this.stats.passedTurns += player.passedTurns;
            
            // Track winner
            if (player === gameEngine.getWinner()) {
                this.stats.winnerCounts[player.name] = (this.stats.winnerCounts[player.name] || 0) + 1;
            }
            
            // Track title purchases
            player.titlesPurchased.forEach(title => {
                this.stats.titlePurchases[title.name] = (this.stats.titlePurchases[title.name] || 0) + 1;
            });
        });

        // Market analysis
        gameResult.marketData = {
            heroPoolRemaining: gameEngine.gameData.heroes.length - gameEngine.purchasedHeroes.length,
            totalHeroesPurchased: gameEngine.purchasedHeroes.length,
            averageHeroCost: this.calculateAverageHeroCost(gameEngine.purchasedHeroes),
            events: gameEngine.events.map(e => ({
                name: e.name,
                leadingResource: e.leadingResource
            }))
        };

        this.stats.gameResults.push(gameResult);
        
        // Limit stored games to last 100 for performance
        if (this.stats.gameResults.length > 100) {
            this.stats.gameResults = this.stats.gameResults.slice(-100);
        }
    }

    // Calculate average hero cost
    calculateAverageHeroCost(heroes) {
        if (heroes.length === 0) return 0;
        
        const totalCost = heroes.reduce((sum, hero) => {
            const cost = (hero.cost.military || 0) + (hero.cost.influence || 0) + 
                        (hero.cost.supplies || 0) + (hero.cost.piety || 0);
            return sum + cost;
        }, 0);
        
        return Math.round((totalCost / heroes.length) * 10) / 10;
    }

    // Get summary statistics
    getSummary() {
        if (this.stats.gamesPlayed === 0) {
            return { message: "No games played yet" };
        }

        const avgScore = this.stats.totalScores.reduce((a, b) => a + b, 0) / this.stats.totalScores.length;
        const minScore = Math.min(...this.stats.totalScores);
        const maxScore = Math.max(...this.stats.totalScores);
        
        // Winner distribution
        const sortedWinners = Object.entries(this.stats.winnerCounts)
            .sort(([,a], [,b]) => b - a);
            
        // Most popular titles
        const sortedTitles = Object.entries(this.stats.titlePurchases)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10);
            
        // Pass and emergency rates
        const avgEmergency = this.stats.emergencyUses / this.stats.gamesPlayed;
        const avgPasses = this.stats.passedTurns / this.stats.gamesPlayed;

        return {
            gamesPlayed: this.stats.gamesPlayed,
            scoreStats: {
                average: Math.round(avgScore * 10) / 10,
                range: `${minScore} to ${maxScore}`
            },
            winnerDistribution: sortedWinners,
            popularTitles: sortedTitles,
            behaviorStats: {
                avgEmergencyPerGame: Math.round(avgEmergency * 10) / 10,
                avgPassesPerGame: Math.round(avgPasses * 10) / 10
            },
            lastGameResult: this.stats.gameResults[this.stats.gameResults.length - 1]
        };
    }

    // Export data for analysis
    exportData(format = 'json') {
        const exportData = {
            exportInfo: {
                timestamp: new Date().toISOString(),
                version: "1.0",
                format: format,
                totalGames: this.stats.gamesPlayed
            },
            summary: this.getSummary(),
            rawStats: this.stats,
            detailedGames: this.stats.gameResults
        };

        if (format === 'json') {
            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            this.downloadFile(blob, `three-kingdoms-data-${Date.now()}.json`);
        } else if (format === 'csv') {
            const csv = this.convertToCSV(exportData);
            const blob = new Blob([csv], { type: 'text/csv' });
            this.downloadFile(blob, `three-kingdoms-data-${Date.now()}.csv`);
        }
        
        return exportData;
    }

    // Convert game results to CSV format
    convertToCSV(data) {
        const headers = [
            'GameId', 'Timestamp', 'PlayerCount', 'Winner', 'PlayerName', 'FinalScore',
            'TitlesPurchased', 'HeroesOwned', 'EmergencyUsed', 'PassedTurns',
            'MilitaryTotal', 'InfluenceTotal', 'SuppliesTotal', 'PietyTotal'
        ];
        
        let csv = headers.join(',') + '\n';
        
        data.detailedGames.forEach(game => {
            game.players.forEach(player => {
                const row = [
                    game.gameId,
                    game.timestamp,
                    game.playerCount,
                    game.winner || 'None',
                    player.name,
                    player.finalScore,
                    player.titlesPurchased,
                    player.heroesOwned,
                    player.emergencyUsed,
                    player.passedTurns,
                    player.finalResources.military,
                    player.finalResources.influence,
                    player.finalResources.supplies,
                    player.finalResources.piety
                ];
                csv += row.join(',') + '\n';
            });
        });
        
        return csv;
    }

    // Download file helper
    downloadFile(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // Clear all statistics
    clearStats() {
        this.stats = {
            gamesPlayed: 0,
            totalScores: [],
            winnerCounts: {},
            titlePurchases: {},
            heroPurchases: {},
            emergencyUses: 0,
            passedTurns: 0,
            turnOrderStats: {},
            resourceMajorities: { military: 0, influence: 0, supplies: 0, piety: 0 },
            gameResults: [],
            averageGameLength: 0,
            marketData: {
                heroPoolDepletion: [],
                averageMarketCosts: [],
                popularHeroes: {}
            }
        };
    }

    // Bulk simulation runner
    async runBulkSimulation(gameData, playerCount, gameCount, progressCallback) {
        const results = [];
        
        for (let i = 0; i < gameCount; i++) {
            // Create and run game
            const game = new GameEngine(gameData, playerCount, () => {}); // Silent logging
            game.initialize();
            
            // Run to completion
            while (game.phase !== 'complete') {
                const gameOver = game.executeStep();
                if (gameOver) break;
            }
            
            // Record results
            this.recordGame(game);
            
            // Progress callback
            if (progressCallback && i % Math.max(1, Math.floor(gameCount / 20)) === 0) {
                progressCallback(i + 1, gameCount);
            }
        }
        
        return this.getSummary();
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { StatsManager };
}
