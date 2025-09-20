// js/stats-manager.js - Statistics Manager Module

export class StatsManager {
    constructor(gameEngine) {
        this.game = gameEngine;
        this.detailedStats = {
            gameResults: [],
            titleAcquisitions: {},
            heroAcquisitions: {},
            emergencyPatterns: [],
            turnOrderStats: [],
            resourceMajorities: {}
        };
    }

    // Record game completion
    recordGameResult(gameNumber, players, winner, turns) {
        const result = {
            gameNumber: gameNumber,
            winner: winner.name,
            winnerScore: winner.score,
            players: players.map(p => ({
                name: p.name,
                score: p.score,
                titles: p.titles.length,
                emergencyUsed: p.emergencyUsed,
                heroesOwned: p.getAllHeroes().length
            })),
            turns: turns,
            timestamp: new Date().toISOString()
        };
        
        this.detailedStats.gameResults.push(result);
        
        // Update title acquisition tracking
        players.forEach(player => {
            player.titles.forEach(titleEntry => {
                const titleName = titleEntry.title.name;
                if (!this.detailedStats.titleAcquisitions[titleName]) {
                    this.detailedStats.titleAcquisitions[titleName] = {
                        totalAcquired: 0,
                        players: {},
                        averagePoints: 0,
                        acquisitionRate: 0
                    };
                }
                
                this.detailedStats.titleAcquisitions[titleName].totalAcquired++;
                this.detailedStats.titleAcquisitions[titleName].players[player.name] = 
                    (this.detailedStats.titleAcquisitions[titleName].players[player.name] || 0) + 1;
            });
        });
        
        // Update hero acquisition tracking
        players.forEach(player => {
            player.getAllHeroes().forEach(hero => {
                if (!hero.name.includes('Peasant')) {
                    const heroName = hero.name;
                    if (!this.detailedStats.heroAcquisitions[heroName]) {
                        this.detailedStats.heroAcquisitions[heroName] = {
                            totalAcquired: 0,
                            players: {},
                            averageUtility: 0
                        };
                    }
                    
                    this.detailedStats.heroAcquisitions[heroName].totalAcquired++;
                    this.detailedStats.heroAcquisitions[heroName].players[player.name] = 
                        (this.detailedStats.heroAcquisitions[heroName].players[player.name] || 0) + 1;
                }
            });
        });
        
        return result;
    }

    // Calculate acquisition rates for titles
    calculateTitleStats() {
        const totalGames = this.detailedStats.gameResults.length;
        
        Object.keys(this.detailedStats.titleAcquisitions).forEach(titleName => {
            const titleData = this.detailedStats.titleAcquisitions[titleName];
            titleData.acquisitionRate = (titleData.totalAcquired / totalGames * 100).toFixed(1);
        });
        
        return this.detailedStats.titleAcquisitions;
    }

    // Calculate hero popularity
    calculateHeroStats() {
        const totalGames = this.detailedStats.gameResults.length;
        
        Object.keys(this.detailedStats.heroAcquisitions).forEach(heroName => {
            const heroData = this.detailedStats.heroAcquisitions[heroName];
            heroData.acquisitionRate = (heroData.totalAcquired / totalGames * 100).toFixed(1);
        });
        
        return this.detailedStats.heroAcquisitions;
    }

    // Calculate win rate by player position
    calculateWinRateByPosition() {
        const positionStats = {};
        
        this.detailedStats.gameResults.forEach(result => {
            result.players.forEach((player, index) => {
                const position = `Player ${index + 1}`;
                
                if (!positionStats[position]) {
                    positionStats[position] = {
                        games: 0,
                        wins: 0,
                        totalScore: 0,
                        winRate: 0
                    };
                }
                
                positionStats[position].games++;
                positionStats[position].totalScore += player.score;
                
                if (player.name === result.winner) {
                    positionStats[position].wins++;
                }
            });
        });
        
        // Calculate win rates
        Object.keys(positionStats).forEach(position => {
            const stats = positionStats[position];
            stats.winRate = ((stats.wins / stats.games) * 100).toFixed(1);
            stats.averageScore = (stats.totalScore / stats.games).toFixed(1);
        });
        
        return positionStats;
    }

    // Calculate score distribution
    calculateScoreDistribution() {
        const scores = [];
        
        this.detailedStats.gameResults.forEach(result => {
            result.players.forEach(player => {
                scores.push(player.score);
            });
        });
        
        scores.sort((a, b) => a - b);
        
        const distribution = {
            min: scores[0] || 0,
            max: scores[scores.length - 1] || 0,
            mean: scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2) : 0,
            median: scores.length > 0 ? scores[Math.floor(scores.length / 2)].toFixed(2) : 0,
            standardDeviation: 0,
            quartiles: {
                q1: scores.length > 0 ? scores[Math.floor(scores.length * 0.25)] : 0,
                q3: scores.length > 0 ? scores[Math.floor(scores.length * 0.75)] : 0
            }
        };
        
        // Calculate standard deviation
        if (scores.length > 1) {
            const mean = parseFloat(distribution.mean);
            const variance = scores.reduce((acc, score) => acc + Math.pow(score - mean, 2), 0) / scores.length;
            distribution.standardDeviation = Math.sqrt(variance).toFixed(2);
        }
        
        return distribution;
    }

    // Calculate emergency resource usage patterns
    calculateEmergencyStats() {
        const emergencyStats = {
            totalGames: this.detailedStats.gameResults.length,
            gamesWithEmergency: 0,
            averageEmergencyPerGame: 0,
            maxEmergencyInGame: 0,
            emergencyByTurn: {},
            emergencyEffectiveness: 0
        };
        
        let totalEmergency = 0;
        let emergencyUsers = 0;
        
        this.detailedStats.gameResults.forEach(result => {
            let gameEmergencyTotal = 0;
            let gameHadEmergency = false;
            
            result.players.forEach(player => {
                if (player.emergencyUsed > 0) {
                    gameHadEmergency = true;
                    emergencyUsers++;
                    totalEmergency += player.emergencyUsed;
                    gameEmergencyTotal += player.emergencyUsed;
                }
            });
            
            if (gameHadEmergency) {
                emergencyStats.gamesWithEmergency++;
            }
            
            emergencyStats.maxEmergencyInGame = Math.max(emergencyStats.maxEmergencyInGame, gameEmergencyTotal);
        });
        
        emergencyStats.averageEmergencyPerGame = emergencyStats.totalGames > 0 ? 
            (totalEmergency / emergencyStats.totalGames).toFixed(2) : 0;
        
        return emergencyStats;
    }

    // Generate comprehensive balance report
    generateBalanceReport() {
        const report = {
            summary: {
                totalGames: this.detailedStats.gameResults.length,
                generatedAt: new Date().toISOString()
            },
            winRates: this.calculateWinRateByPosition(),
            scoreDistribution: this.calculateScoreDistribution(),
            titleStats: this.calculateTitleStats(),
            heroStats: this.calculateHeroStats(),
            emergencyStats: this.calculateEmergencyStats(),
            recommendations: []
        };
        
        // Generate balance recommendations
        report.recommendations = this.generateRecommendations(report);
        
        return report;
    }

    // Generate balance recommendations based on stats
    generateRecommendations(report) {
        const recommendations = [];
        
        // Check for position bias
        const positionWinRates = Object.values(report.winRates).map(p => parseFloat(p.winRate));
        const winRateRange = Math.max(...positionWinRates) - Math.min(...positionWinRates);
        
        if (winRateRange > 15) {
            recommendations.push({
                type: 'balance',
                severity: 'high',
                issue: 'Position Bias',
                description: `Win rate variance of ${winRateRange.toFixed(1)}% between player positions indicates turn order advantage`,
                suggestion: 'Review turn order mechanics and consider balancing adjustments'
            });
        }
        
        // Check emergency usage
        const avgEmergency = parseFloat(report.emergencyStats.averageEmergencyPerGame);
        if (avgEmergency > 3) {
            recommendations.push({
                type: 'balance',
                severity: 'medium',
                issue: 'High Emergency Usage',
                description: `Average ${avgEmergency} emergency resources per game indicates resource scarcity`,
                suggestion: 'Consider increasing resource generation or reducing costs'
            });
        } else if (avgEmergency < 0.5) {
            recommendations.push({
                type: 'balance',
                severity: 'low',
                issue: 'Low Emergency Usage',
                description: `Average ${avgEmergency} emergency resources per game indicates resource abundance`,
                suggestion: 'Emergency system may be underutilized'
            });
        }
        
        // Check title diversity
        const titleStats = Object.values(report.titleStats);
        const highAcquisitionTitles = titleStats.filter(t => parseFloat(t.acquisitionRate) > 75);
        const lowAcquisitionTitles = titleStats.filter(t => parseFloat(t.acquisitionRate) < 10);
        
        if (highAcquisitionTitles.length > 0) {
            recommendations.push({
                type: 'design',
                severity: 'medium',
                issue: 'Dominant Titles',
                description: `${highAcquisitionTitles.length} titles have >75% acquisition rate`,
                suggestion: 'Consider increasing costs or requirements for over-popular titles'
            });
        }
        
        if (lowAcquisitionTitles.length > 0) {
            recommendations.push({
                type: 'design',
                severity: 'medium',
                issue: 'Underused Titles',
                description: `${lowAcquisitionTitles.length} titles have <10% acquisition rate`,
                suggestion: 'Consider reducing costs or improving rewards for underused titles'
            });
        }
        
        // Check score distribution
        const scoreRange = report.scoreDistribution.max - report.scoreDistribution.min;
        if (scoreRange > 30) {
            recommendations.push({
                type: 'balance',
                severity: 'high',
                issue: 'Wide Score Range',
                description: `Score range of ${scoreRange} points indicates high variance in game outcomes`,
                suggestion: 'Review scoring mechanisms for consistency'
            });
        }
        
        return recommendations;
    }

    // Export statistics to JSON
    exportToJSON() {
        const exportData = {
            metadata: {
                exportedAt: new Date().toISOString(),
                totalGames: this.detailedStats.gameResults.length,
                version: '1.0'
            },
            balanceReport: this.generateBalanceReport(),
            rawData: this.detailedStats
        };
        
        return JSON.stringify(exportData, null, 2);
    }

    // Export statistics to CSV
    exportToCSV() {
        const csvData = [];
        
        // Header
        csvData.push(['Game', 'Winner', 'WinnerScore', 'Player1Score', 'Player2Score', 'Player3Score', 'Player4Score', 'EmergencyUsed', 'TitlesAcquired']);
        
        // Data rows
        this.detailedStats.gameResults.forEach(result => {
            const row = [
                result.gameNumber,
                result.winner,
                result.winnerScore
            ];
            
            // Pad player scores to 4 players
            for (let i = 0; i < 4; i++) {
                row.push(result.players[i] ? result.players[i].score : '');
            }
            
            const totalEmergency = result.players.reduce((sum, p) => sum + (p.emergencyUsed || 0), 0);
            const totalTitles = result.players.reduce((sum, p) => sum + (p.titles || 0), 0);
            
            row.push(totalEmergency, totalTitles);
            csvData.push(row);
        });
        
        return csvData.map(row => row.join(',')).join('\n');
    }

    // Clear all statistics
    clearStats() {
        this.detailedStats = {
            gameResults: [],
            titleAcquisitions: {},
            heroAcquisitions: {},
            emergencyPatterns: [],
            turnOrderStats: [],
            resourceMajorities: {}
        };
    }

    // Get summary statistics for display
    getSummaryStats() {
        const totalGames = this.detailedStats.gameResults.length;
        
        if (totalGames === 0) {
            return {
                totalGames: 0,
                averageScore: 0,
                averageEmergency: 0,
                averageTitles: 0,
                winRateVariance: 0
            };
        }
        
        const allScores = this.detailedStats.gameResults.flatMap(r => r.players.map(p => p.score));
        const averageScore = allScores.reduce((a, b) => a + b, 0) / allScores.length;
        
        const allEmergency = this.detailedStats.gameResults.flatMap(r => r.players.map(p => p.emergencyUsed || 0));
        const averageEmergency = allEmergency.reduce((a, b) => a + b, 0) / allEmergency.length;
        
        const allTitles = this.detailedStats.gameResults.flatMap(r => r.players.map(p => p.titles || 0));
        const averageTitles = allTitles.reduce((a, b) => a + b, 0) / allTitles.length;
        
        const winRates = this.calculateWinRateByPosition();
        const winRateValues = Object.values(winRates).map(w => parseFloat(w.winRate || 0));
        const winRateVariance = winRateValues.length > 0 ? 
            Math.max(...winRateValues) - Math.min(...winRateValues) : 0;
        
        return {
            totalGames,
            averageScore: averageScore.toFixed(1),
            averageEmergency: averageEmergency.toFixed(1),
            averageTitles: averageTitles.toFixed(1),
            winRateVariance: winRateVariance.toFixed(1)
        };
    }
}
