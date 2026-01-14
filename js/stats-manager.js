// stats-manager.js - Comprehensive statistics tracking for balance analysis

export class StatsManager {
    constructor() {
        this.reset();
    }

    reset() {
        this.stats = {
            // Basic game stats
            gamesPlayed: 0,
            totalScores: [],
            
            // Player position analysis
            playerPositionStats: {
                1: { wins: 0, games: 0, totalScore: 0 },
                2: { wins: 0, games: 0, totalScore: 0 },
                3: { wins: 0, games: 0, totalScore: 0 },
                4: { wins: 0, games: 0, totalScore: 0 }
            },
            
            // Title statistics
            titleStats: {
                // titleName: {
                //     acquired: count,
                //     totalPoints: sum of all points scored,
                //     gamesWithTitle: count of games where title was acquired,
                //     winsWithTitle: count of wins when player had this title,
                //     playerPositions: { 1: count, 2: count, 3: count, 4: count }
                // }
            },
            
            // Hero statistics
            heroStats: {
                // heroName: {
                //     purchased: count,
                //     gamesWithHero: count,
                //     winsWithHero: count,
                //     playerPositions: { 1: count, 2: count, 3: count, 4: count }
                // }
            },
            
            // Faction analysis
            factionStats: {
                // factionName: {
                //     heroesAcquired: count,
                //     titlesAcquired: count (faction-specific titles),
                //     wins: count (games where player had 3+ heroes from this faction)
                // }
            },
            
            // Score distribution (histogram)
            scoreDistribution: {
                '0-5': 0,
                '6-10': 0,
                '11-15': 0,
                '16-20': 0,
                '21-25': 0,
                '26+': 0
            },
            
            // Turn order analysis
            turnOrderStats: {
                firstPlayerWins: 0,
                firstPlayerGames: 0,
                avgFirstPlayerScore: 0,
                avgOtherPlayerScore: 0
            },
            
            // Emergency resource usage
            emergencyStats: {
                totalUsed: 0,
                gamesWithEmergency: 0,
                avgPerGame: 0,
                winsWithEmergency: 0
            },
            
            // Pass rate by turn
            passByTurn: {
                1: { passes: 0, opportunities: 0 },
                2: { passes: 0, opportunities: 0 },
                3: { passes: 0, opportunities: 0 },
                4: { passes: 0, opportunities: 0 },
                5: { passes: 0, opportunities: 0 },
                6: { passes: 0, opportunities: 0 },
                7: { passes: 0, opportunities: 0 },
                8: { passes: 0, opportunities: 0 }
            },
            
            // Resource majority bonuses
            resourceMajorityStats: {
                military: { wins: 0, totalBonus: 0, totalValue: 0, games: 0 },
                influence: { wins: 0, totalBonus: 0, totalValue: 0, games: 0 },
                supplies: { wins: 0, totalBonus: 0, totalValue: 0, games: 0 },
                piety: { wins: 0, totalBonus: 0, totalValue: 0, games: 0 }
            },
            
            // Provincial unit analysis
            provincialUnitStats: {
                // unitName: {
                //     timesUsed: count,
                //     wins: count,
                //     totalScore: sum,
                //     gamesWithUnit: count
                // }
            },
            
            // Home province analysis
            homeProvinceStats: {
                // provinceName: {
                //     timesAssigned: count,
                //     wins: count,
                //     totalScore: sum
                // }
            },
            
            // Resource totals tracking
            resourceTotals: {
                military: 0,
                influence: 0,
                supplies: 0,
                piety: 0,
                gamesTracked: 0
            }
        };
    }

    // Record a completed game
    recordGame(gameState) {
        this.stats.gamesPlayed++;
        
        // Find winner
        const sortedPlayers = [...gameState.players].sort((a, b) => b.score - a.score);
        const winner = sortedPlayers[0];
        
        // Track events used this game
        const eventNames = gameState.events.map(e => e.name).join(', ');
        
        // Log detailed game summary
        console.log(`\n=== GAME ${this.stats.gamesPlayed} SUMMARY ===`);
        console.log(`Events: ${eventNames}`);
        console.log(`Winner: ${winner.name} (${winner.score} points)`);
        
        // Log province assignments
        console.log('\nProvince Assignments:');
        gameState.players.forEach(p => {
            console.log(`  ${p.name}: ${p.province.name} (Priority ${p.province.priority}), Unit: ${p.provincialUnit?.name || 'None'}`);
        });
        
        console.log('\nPlayer Scores:');
        
        gameState.players.forEach((player, index) => {
            const playerPosition = index + 1;
            const isWinner = player === winner;
            
            // Calculate title points
            let titlePoints = 0;
            player.titles.forEach(titleEntry => {
                const { points } = player.calculateCollectionScore(titleEntry.title);
                titlePoints += points;
            });
            
            // Resource bonuses would be: score - titlePoints - emergencyPenalty
            const resourcePoints = player.score - titlePoints + player.emergencyUsed;
            
            console.log(`${player.name}: ${player.score} pts = ${titlePoints} (titles) + ${resourcePoints} (resources) - ${player.emergencyUsed} (emergency)`);
            console.log(`  Titles: ${player.titles.map(t => t.title.name).join(', ')}`);
            
            // Player position stats
            const posStats = this.stats.playerPositionStats[playerPosition];
            posStats.games++;
            posStats.totalScore += player.score;
            if (isWinner) posStats.wins++;
            
            // Score distribution
            this.recordScoreDistribution(player.score);
            this.stats.totalScores.push(player.score);
            
            // Title stats
            player.titles.forEach(titleEntry => {
                this.recordTitleAcquisition(titleEntry.title, player, isWinner, playerPosition);
            });
            
            // Hero stats
            const allHeroes = [...player.hand, ...player.retiredHeroes];
            player.battlefield.wei.forEach(h => allHeroes.push(h));
            player.battlefield.wu.forEach(h => allHeroes.push(h));
            player.battlefield.shu.forEach(h => allHeroes.push(h));
            
            allHeroes.forEach(hero => {
                if (hero.name && hero.name !== 'Peasant') {
                    this.recordHeroAcquisition(hero, isWinner, playerPosition);
                }
            });
            
            // Faction analysis
            this.recordFactionStats(allHeroes, player.titles, isWinner);
            
            // Provincial unit stats
            if (player.provincialUnit) {
                this.recordProvincialUnit(player.provincialUnit, isWinner, player.score);
            }
            
            // Home province stats
            if (player.province) {
                this.recordHomeProvince(player.province, isWinner, player.score);
            }
            
            // Resource totals (for end-game majority analysis)
            const finalResources = player.getTotalResources();
            ['military', 'influence', 'supplies', 'piety'].forEach(res => {
                this.stats.resourceTotals[res] += finalResources[res];
            });
            
            // Emergency resource stats
            if (player.emergencyUsed > 0) {
                this.stats.emergencyStats.totalUsed += player.emergencyUsed;
                this.stats.emergencyStats.gamesWithEmergency++;
                if (isWinner) {
                    this.stats.emergencyStats.winsWithEmergency++;
                }
            }
        });
        
        // Increment resource totals game counter
        this.stats.resourceTotals.gamesTracked++;
        
        // Calculate emergency average
        this.stats.emergencyStats.avgPerGame = 
            this.stats.emergencyStats.totalUsed / this.stats.gamesPlayed;
    }

    recordScoreDistribution(score) {
        if (score <= 5) this.stats.scoreDistribution['0-5']++;
        else if (score <= 10) this.stats.scoreDistribution['6-10']++;
        else if (score <= 15) this.stats.scoreDistribution['11-15']++;
        else if (score <= 20) this.stats.scoreDistribution['16-20']++;
        else if (score <= 25) this.stats.scoreDistribution['21-25']++;
        else this.stats.scoreDistribution['26+']++;
    }

    recordTitleAcquisition(title, player, isWinner, playerPosition) {
        const titleName = title.name;
        
        if (!this.stats.titleStats[titleName]) {
            this.stats.titleStats[titleName] = {
                acquired: 0,
                totalPoints: 0,
                gamesWithTitle: 0,
                winsWithTitle: 0,
                playerPositions: { 1: 0, 2: 0, 3: 0, 4: 0 }
            };
        }
        
        const titleStat = this.stats.titleStats[titleName];
        titleStat.acquired++;
        titleStat.gamesWithTitle++;
        titleStat.playerPositions[playerPosition]++;
        
        // Calculate points this title scored
        const { points } = player.calculateCollectionScore(title);
        titleStat.totalPoints += points;
        
        if (isWinner) {
            titleStat.winsWithTitle++;
        }
    }

    recordHeroAcquisition(hero, isWinner, playerPosition) {
        const heroName = hero.name;
        
        if (!this.stats.heroStats[heroName]) {
            this.stats.heroStats[heroName] = {
                purchased: 0,
                gamesWithHero: 0,
                winsWithHero: 0,
                playerPositions: { 1: 0, 2: 0, 3: 0, 4: 0 }
            };
        }
        
        const heroStat = this.stats.heroStats[heroName];
        heroStat.purchased++;
        heroStat.gamesWithHero++;
        heroStat.playerPositions[playerPosition]++;
        
        if (isWinner) {
            heroStat.winsWithHero++;
        }
    }

    recordFactionStats(heroes, titles, isWinner) {
        // Count heroes by faction
        const factionCounts = {};
        heroes.forEach(hero => {
            if (hero.allegiance && hero.name !== 'Peasant') {
                factionCounts[hero.allegiance] = (factionCounts[hero.allegiance] || 0) + 1;
            }
        });
        
        // Record faction stats
        Object.entries(factionCounts).forEach(([faction, count]) => {
            if (!this.stats.factionStats[faction]) {
                this.stats.factionStats[faction] = {
                    heroesAcquired: 0,
                    titlesAcquired: 0,
                    wins: 0
                };
            }
            
            this.stats.factionStats[faction].heroesAcquired += count;
            
            // Count if player focused on this faction (3+ heroes)
            if (count >= 3 && isWinner) {
                this.stats.factionStats[faction].wins++;
            }
        });
    }

    recordProvincialUnit(unit, isWinner, score) {
        const unitName = unit.name;
        
        if (!this.stats.provincialUnitStats[unitName]) {
            this.stats.provincialUnitStats[unitName] = {
                timesUsed: 0,
                wins: 0,
                totalScore: 0,
                gamesWithUnit: 0
            };
        }
        
        this.stats.provincialUnitStats[unitName].timesUsed++;
        this.stats.provincialUnitStats[unitName].gamesWithUnit++;
        this.stats.provincialUnitStats[unitName].totalScore += score;
        if (isWinner) {
            this.stats.provincialUnitStats[unitName].wins++;
        }
    }

    recordHomeProvince(province, isWinner, score) {
        const provinceName = province.name;
        
        if (!this.stats.homeProvinceStats[provinceName]) {
            this.stats.homeProvinceStats[provinceName] = {
                timesAssigned: 0,
                wins: 0,
                totalScore: 0
            };
        }
        
        this.stats.homeProvinceStats[provinceName].timesAssigned++;
        this.stats.homeProvinceStats[provinceName].totalScore += score;
        if (isWinner) {
            this.stats.homeProvinceStats[provinceName].wins++;
        }
    }

    recordPass(turn) {
        if (this.stats.passByTurn[turn]) {
            this.stats.passByTurn[turn].passes++;
            this.stats.passByTurn[turn].opportunities++;
        }
    }

    recordPurchase(turn) {
        if (this.stats.passByTurn[turn]) {
            this.stats.passByTurn[turn].opportunities++;
        }
    }

    recordResourceMajority(resource, bonus) {
        if (this.stats.resourceMajorityStats[resource]) {
            this.stats.resourceMajorityStats[resource].wins++;
            this.stats.resourceMajorityStats[resource].totalBonus += bonus;
        }
    }

    // Generate comprehensive report
    generateReport() {
        const report = {
            summary: this.generateSummary(),
            titleAnalysis: this.analyzeTitles(),
            heroAnalysis: this.analyzeHeroes(),
            factionAnalysis: this.analyzeFactions(),
            playerPositionAnalysis: this.analyzePlayerPositions(),
            provincialUnitAnalysis: this.analyzeProvincialUnits(),
            homeProvinceAnalysis: this.analyzeHomeProvinces(),
            resourceAnalysis: this.analyzeResources(),
            scoreDistribution: this.stats.scoreDistribution,
            emergencyAnalysis: this.analyzeEmergency(),
            passAnalysis: this.analyzePassRates()
        };
        
        return report;
    }

    generateSummary() {
        const avgScore = this.stats.totalScores.reduce((a, b) => a + b, 0) / this.stats.totalScores.length;
        const totalPlayers = this.stats.totalScores.length; // Total player-games
        const totalTitles = Object.values(this.stats.titleStats).reduce((sum, t) => sum + t.acquired, 0);
        const totalHeroes = Object.values(this.stats.heroStats).reduce((sum, h) => sum + h.purchased, 0);
        
        return {
            gamesPlayed: this.stats.gamesPlayed,
            averageScore: avgScore.toFixed(2),
            minScore: Math.min(...this.stats.totalScores),
            maxScore: Math.max(...this.stats.totalScores),
            totalTitlesAcquired: totalTitles,
            totalHeroesPurchased: totalHeroes,
            avgTitlesPerPlayer: (totalTitles / totalPlayers).toFixed(2),
            avgHeroesPerPlayer: (totalHeroes / totalPlayers).toFixed(2),
            avgTitlesPerGame: (totalTitles / this.stats.gamesPlayed).toFixed(2),
            avgHeroesPerGame: (totalHeroes / this.stats.gamesPlayed).toFixed(2)
        };
    }

    analyzeTitles() {
        const titles = Object.entries(this.stats.titleStats)
            .map(([name, stats]) => ({
                name,
                acquisitionRate: ((stats.gamesWithTitle / this.stats.gamesPlayed) * 100).toFixed(1),
                avgPointsScored: stats.gamesWithTitle > 0 ? (stats.totalPoints / stats.gamesWithTitle).toFixed(2) : 0,
                winRate: stats.gamesWithTitle > 0 ? ((stats.winsWithTitle / stats.gamesWithTitle) * 100).toFixed(1) : 0,
                timesAcquired: stats.acquired
            }))
            .sort((a, b) => b.acquisitionRate - a.acquisitionRate);
        
        // Identify problem titles
        const neverAcquired = titles.filter(t => t.acquisitionRate === '0.0');
        const overAcquired = titles.filter(t => parseFloat(t.acquisitionRate) > 50);
        const lowWinRate = titles.filter(t => parseFloat(t.winRate) < 30 && t.timesAcquired > 10);
        
        return {
            allTitles: titles,
            neverAcquired: neverAcquired.map(t => t.name),
            overAcquired: overAcquired.map(t => ({ name: t.name, rate: t.acquisitionRate })),
            lowWinRate: lowWinRate.map(t => ({ name: t.name, winRate: t.winRate, times: t.timesAcquired }))
        };
    }

    analyzeHeroes() {
        const heroes = Object.entries(this.stats.heroStats)
            .map(([name, stats]) => ({
                name,
                purchaseRate: ((stats.gamesWithHero / this.stats.gamesPlayed) * 100).toFixed(1),
                winRate: stats.gamesWithHero > 0 ? ((stats.winsWithHero / stats.gamesWithHero) * 100).toFixed(1) : 0,
                timesPurchased: stats.purchased
            }))
            .sort((a, b) => b.timesPurchased - a.timesPurchased);
        
        // Sort by win rate for analysis (minimum 10 purchases to be meaningful)
        const meaningfulHeroes = heroes.filter(h => h.timesPurchased >= 10);
        const byWinRate = [...meaningfulHeroes].sort((a, b) => parseFloat(b.winRate) - parseFloat(a.winRate));
        
        return {
            topHeroes: heroes.slice(0, 20), // Most purchased
            allHeroes: heroes, // Complete list for detailed analysis
            highWinRate: byWinRate.slice(0, 20), // Top 20 by win rate
            lowWinRate: byWinRate.slice(-20).reverse(), // Bottom 20 by win rate
            neverPurchased: heroes.filter(h => h.timesPurchased === 0).map(h => h.name)
        };
    }

    analyzeFactions() {
        return Object.entries(this.stats.factionStats)
            .map(([faction, stats]) => ({
                faction,
                heroesAcquired: stats.heroesAcquired,
                avgPerGame: (stats.heroesAcquired / this.stats.gamesPlayed).toFixed(2),
                wins: stats.wins,
                winRate: stats.wins > 0 ? ((stats.wins / this.stats.gamesPlayed) * 100).toFixed(1) : 0
            }))
            .sort((a, b) => b.heroesAcquired - a.heroesAcquired);
    }

    analyzePlayerPositions() {
        return Object.entries(this.stats.playerPositionStats)
            .filter(([pos, stats]) => stats.games > 0)
            .map(([position, stats]) => ({
                position: parseInt(position),
                winRate: ((stats.wins / stats.games) * 100).toFixed(1),
                avgScore: (stats.totalScore / stats.games).toFixed(2),
                games: stats.games
            }));
    }

    analyzeEmergency() {
        return {
            avgPerGame: this.stats.emergencyStats.avgPerGame.toFixed(2),
            gamesWithEmergency: this.stats.emergencyStats.gamesWithEmergency,
            percentageOfGames: ((this.stats.emergencyStats.gamesWithEmergency / this.stats.gamesPlayed) * 100).toFixed(1),
            winRateWithEmergency: this.stats.emergencyStats.gamesWithEmergency > 0 
                ? ((this.stats.emergencyStats.winsWithEmergency / this.stats.emergencyStats.gamesWithEmergency) * 100).toFixed(1)
                : 0
        };
    }

    analyzePassRates() {
        return Object.entries(this.stats.passByTurn)
            .map(([turn, stats]) => ({
                turn: parseInt(turn),
                passRate: stats.opportunities > 0 ? ((stats.passes / stats.opportunities) * 100).toFixed(1) : 0,
                passes: stats.passes,
                opportunities: stats.opportunities
            }));
    }

    analyzeProvincialUnits() {
        const units = Object.entries(this.stats.provincialUnitStats)
            .map(([name, stats]) => ({
                name,
                timesUsed: stats.timesUsed,
                winRate: stats.gamesWithUnit > 0 ? ((stats.wins / stats.gamesWithUnit) * 100).toFixed(1) : 0,
                avgScore: stats.gamesWithUnit > 0 ? (stats.totalScore / stats.gamesWithUnit).toFixed(2) : 0,
                gamesWithUnit: stats.gamesWithUnit
            }))
            .sort((a, b) => b.timesUsed - a.timesUsed);
        
        return {
            allUnits: units,
            highWinRate: units.filter(u => parseFloat(u.winRate) > 55 && u.gamesWithUnit >= 10),
            lowWinRate: units.filter(u => parseFloat(u.winRate) < 45 && u.gamesWithUnit >= 10)
        };
    }

    analyzeHomeProvinces() {
        const provinces = Object.entries(this.stats.homeProvinceStats)
            .map(([name, stats]) => ({
                name,
                timesAssigned: stats.timesAssigned,
                winRate: stats.timesAssigned > 0 ? ((stats.wins / stats.timesAssigned) * 100).toFixed(1) : 0,
                avgScore: stats.timesAssigned > 0 ? (stats.totalScore / stats.timesAssigned).toFixed(2) : 0
            }))
            .sort((a, b) => b.timesAssigned - a.timesAssigned);
        
        return {
            allProvinces: provinces,
            highWinRate: provinces.filter(p => parseFloat(p.winRate) > 55),
            lowWinRate: provinces.filter(p => parseFloat(p.winRate) < 45)
        };
    }

    analyzeResources() {
        const totalPlayers = this.stats.resourceTotals.gamesTracked;
        if (totalPlayers === 0) {
            return {
                avgFinalResources: { military: 0, influence: 0, supplies: 0, piety: 0 },
                resourceMajorityBonuses: {}
            };
        }
        
        return {
            avgFinalResources: {
                military: (this.stats.resourceTotals.military / totalPlayers).toFixed(2),
                influence: (this.stats.resourceTotals.influence / totalPlayers).toFixed(2),
                supplies: (this.stats.resourceTotals.supplies / totalPlayers).toFixed(2),
                piety: (this.stats.resourceTotals.piety / totalPlayers).toFixed(2)
            },
            resourceMajorityBonuses: {
                military: {
                    wins: this.stats.resourceMajorityStats.military.wins,
                    avgBonus: this.stats.resourceMajorityStats.military.wins > 0 
                        ? (this.stats.resourceMajorityStats.military.totalBonus / this.stats.resourceMajorityStats.military.wins).toFixed(2)
                        : 0
                },
                influence: {
                    wins: this.stats.resourceMajorityStats.influence.wins,
                    avgBonus: this.stats.resourceMajorityStats.influence.wins > 0
                        ? (this.stats.resourceMajorityStats.influence.totalBonus / this.stats.resourceMajorityStats.influence.wins).toFixed(2)
                        : 0
                },
                supplies: {
                    wins: this.stats.resourceMajorityStats.supplies.wins,
                    avgBonus: this.stats.resourceMajorityStats.supplies.wins > 0
                        ? (this.stats.resourceMajorityStats.supplies.totalBonus / this.stats.resourceMajorityStats.supplies.wins).toFixed(2)
                        : 0
                },
                piety: {
                    wins: this.stats.resourceMajorityStats.piety.wins,
                    avgBonus: this.stats.resourceMajorityStats.piety.wins > 0
                        ? (this.stats.resourceMajorityStats.piety.totalBonus / this.stats.resourceMajorityStats.piety.wins).toFixed(2)
                        : 0
                }
            }
        };
    }

    // Export to JSON
    exportToJSON() {
        return JSON.stringify(this.generateReport(), null, 2);
    }

    // Export raw data
    exportRawData() {
        return JSON.stringify(this.stats, null, 2);
    }
}
