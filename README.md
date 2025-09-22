# Three Kingdoms: Mandate of Heaven - Game Balance Simulator

> **A comprehensive web-based simulator for testing and validating game balance in the Three Kingdoms strategic card game**

[![Version](https://img.shields.io/badge/version-2.0-blue.svg)](https://github.com/chiewbacca23/mandate-of-heaven)
[![Status](https://img.shields.io/badge/status-active-success.svg)](https://github.com/chiewbacca23/mandate-of-heaven)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

## 🎮 Overview

Three Kingdoms: Mandate of Heaven is a strategic card game set during the Chinese Three Kingdoms period. This simulator validates game balance by running thousands of simulated games, analyzing win rates, title acquisition patterns, and resource economy dynamics.

**Live Demo**: [https://chiewbacca23.github.io/mandate-of-heaven/](https://chiewbacca23.github.io/mandate-of-heaven/)

## ✨ Features

### 🔬 Comprehensive Game Simulation
- **Full 8-turn gameplay** with authentic game mechanics
- **2-4 player support** with configurable AI strategies
- **Real-time visualization** of game state and player resources
- **Step-by-step debugging** for detailed analysis

### 📊 Statistical Analysis
- **Bulk simulation mode**: Run 10-500 games for statistical significance
- **Win rate tracking**: Identify balance issues across player positions
- **Score distribution**: Monitor average scores and variance
- **Resource economy**: Track emergency usage and pass rates
- **Title diversity**: Measure acquisition rates for all 40 titles

### 🐛 Advanced Debugging
- **Module testing**: Verify ES6 module loading
- **Data validation**: Confirm JSON integrity
- **State inspection**: Real-time debug logging
- **Mock fallback**: Test framework even without full implementation
- **Performance metrics**: Games per second monitoring

### 🎯 Game Balance Validation
- **40 balanced titles** with revised scoring systems
- **100 heroes** with diverse allegiances and roles
- **40 events** with strategic resource allocation
- **Turn order fairness** testing
- **Resource majority bonuses** validation

## 🏗️ Architecture

### Modular ES6 System
```
mandate-of-heaven/
├── index.html              # Main debug simulator interface
├── js/
│   ├── config.js          # Game constants & DataLoader class
│   ├── player.js          # Player AI logic & resource calculations
│   ├── game-engine.js     # Core game mechanics & turn management
│   ├── purchase-manager.js # Purchase decisions & emergency logic
│   └── stats-manager.js   # Statistics collection & export
└── data/
    ├── heroes.json        # 100 hero cards with stats
    ├── titles.json        # 40 balanced titles with requirements
    └── events.json        # 40 events with leading resources
```

### Technology Stack
- **Frontend**: Vanilla JavaScript (ES6 modules)
- **Data Format**: JSON
- **Deployment**: GitHub Pages
- **Testing**: Built-in mock system for development

## 🚀 Quick Start

### Online Version (Recommended)
1. Visit [https://chiewbacca23.github.io/mandate-of-heaven/](https://chiewbacca23.github.io/mandate-of-heaven/)
2. Click **"✅ Test Modules"** to load game logic
3. Click **"📁 Check Data"** to load game content
4. Click **"🎮 Initialize"** to setup game engine
5. Configure players and AI strategy
6. Click **"🎯 New Game"** to start simulating!

### Local Development
```bash
# Clone the repository
git clone https://github.com/chiewbacca23/mandate-of-heaven.git
cd mandate-of-heaven

# Serve locally (Python 3)
python -m http.server 8000

# Or use any local server
# Then open http://localhost:8000
```

### Running Simulations

#### Single Game Mode
```
1. Click "🎯 New Game" - Initialize a single game
2. Click "👉 Next Step" - Advance turn-by-turn
3. Click "⚡ Auto Game" - Complete game automatically
```

#### Bulk Analysis Mode
```
1. Select bulk count (10-500 games)
2. Click "📊 Bulk Sim"
3. Review statistics panel for results
```

## 📈 Game Balance Metrics

### Target Metrics (Post-Balance)
| Metric | Target | Purpose |
|--------|--------|---------|
| Win Rate Variance | <15% | Ensure position fairness |
| Average Score | 10-25 points | Healthy scoring range |
| Emergency Usage | 1-3 per game | Resource scarcity check |
| Pass Rate | <20% | Market viability |
| Title Diversity | >10% each | Competitive balance |

### Balance Validation Process
1. **Run 100+ games** per configuration
2. **Analyze win rates** by player position
3. **Check score distributions** for outliers
4. **Monitor emergency usage** for resource balance
5. **Review title acquisition** for diversity

## 🎲 Game Design Features

### Title Rebalancing (v30)
- **6 Legendary Titles** revised with consistent legend bonuses
- **Base scoring**: [0,1,3,5,7] progression
- **Legend mechanic**: +1 point per named hero owned
- **Cost standardization**: Expensive titles reduced to 10 resources
- **100% viability**: All titles competitively balanced

### Enhanced Set Scoring
- **Faction titles** improved scaling for specialization
- **Small factions** (11-17 heroes): Enhanced rewards
- **Large factions** (52 heroes): Extended tier ranges
- **Result**: 7 viable faction strategies

### Resource Balance
- **Event distribution**: 4-4-4-4 across Military/Influence/Supplies/Piety
- **Turn order fairness**: Random event selection eliminates bias
- **Column bonuses**: Strategic kingdom placement rewards

## 🔧 Development Progress

### Phase 1: Initial Prototype ✅
- [x] Monolithic HTML simulator
- [x] Identified balance issues (emergency abuse, negative scores)
- [x] Basic game flow implementation

### Phase 2: Core Fixes ✅
- [x] Emergency resource limiting
- [x] Resource majority scoring
- [x] Market management
- [x] Hero purchase tracking

### Phase 3: Modular Architecture ✅
- [x] ES6 module system
- [x] JSON data separation
- [x] Enhanced Player AI
- [x] Comprehensive statistics

### Phase 4: Enhanced Debug System ✅ (Current)
- [x] Full game simulation
- [x] Mock fallback system
- [x] Real-time state inspection
- [x] Bulk testing capabilities

### Phase 5: Advanced Features 🚧 (Upcoming)
- [ ] Hero ability implementation
- [ ] Event special mechanics
- [ ] Multiple AI strategies
- [ ] Visual game state display
- [ ] Data export (CSV/JSON)

## 📊 Sample Results

### Pre-Balance Issues (v29)
```
❌ Emergency Usage: 13+ per game (abuse detected)
❌ Average Score: -5.3 points (too many penalties)
❌ Resource Majorities: 0 awards (broken scoring)
❌ Pass Rate: 35% (poor market viability)
```

### Post-Balance Improvements (v30)
```
✅ Emergency Usage: 1-3 per game (strategic use)
✅ Average Score: 15.2 points (healthy range)
✅ Resource Majorities: Regular distribution
✅ Pass Rate: 12% (good market options)
✅ Title Diversity: All 40 titles acquired
```

## 🐛 Debug Features

### System Status Monitoring
- **Module Loading**: Track ES6 import success
- **Data Validation**: Verify JSON structure
- **Game State**: Real-time turn/phase display
- **Button Logic**: Automatic enable/disable based on readiness

### Enhanced Logging
```javascript
// Color-coded log types
[SUCCESS] ✅ Modules loaded
[INFO]    📋 Turn 3 started
[GAME]    🎮 Player 1 purchases "Greatest Minds"
[DEBUG]   🐛 Button state: engineReady=true
[ERROR]   ❌ Failed to load heroes.json
```

### Mock System
```javascript
// Fallback for testing when modules unavailable
createMockGameEngine() {
    // Simulates full game with random data
    // Allows UI/UX testing without backend
}
```

## 📝 Game Rules Summary

### Turn Structure (8 Turns)
1. **Deployment**: Play up to 3 cards to kingdoms
2. **Reveal**: Calculate turn order (leading resource priority)
3. **Purchase**: Buy heroes or titles (column bonuses apply)
4. **Cleanup**: Refill markets, advance event

### Victory Conditions
- **Title Points**: Set collection scoring
- **Resource Majorities**: Bonus points for highest totals
- **Emergency Penalties**: -1 point per use
- **Highest Score Wins**

### Key Mechanics
- **Column Bonuses**: 2+ cards in same kingdom = +1 resource
- **Turn Order**: Leading resource > Cards in Shu/Wu/Wei > Province
- **Retirement**: Heroes used for titles permanently removed
- **Hand Limit**: 5 cards maximum

## 🤝 Contributing

We welcome contributions! Here's how to help:

### Bug Reports
1. Use GitHub Issues
2. Include browser console logs
3. Describe expected vs actual behavior
4. Provide reproduction steps

### Feature Requests
1. Check existing issues first
2. Describe use case clearly
3. Explain expected benefits

### Code Contributions
1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📚 Documentation

### Game Design Documents
- [Complete Rules Reference](docs/game-rules.md)
- [Title Balance Analysis](docs/title-balance.md)
- [Hero Database](docs/heroes.md)
- [Event Mechanics](docs/events.md)

### Technical Documentation
- [Module Architecture](docs/architecture.md)
- [AI Strategy Guide](docs/ai-strategies.md)
- [Data Format Specification](docs/data-format.md)
- [Testing Guidelines](docs/testing.md)

## 🔍 Troubleshooting

### Common Issues

**Modules won't load**
- Check browser console for CORS errors
- Ensure using a local server (not file://)
- Verify all .js files exist in /js/ directory

**Data files fail to load**
- Confirm JSON files are valid (use JSONLint)
- Check file paths match exactly (case-sensitive)
- Clear browser cache and reload

**Game doesn't start**
- Click buttons in order: Modules → Data → Init → New Game
- Use "🐛 Debug" to check system state
- Try mock fallback if real engine fails

**Performance issues**
- Reduce bulk simulation count
- Close unnecessary browser tabs
- Check console for errors

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Three Kingdoms History**: Inspiration from Romance of the Three Kingdoms
- **Game Design**: Strategic depth inspired by deck-building classics
- **Community**: Thanks to all playtesters and contributors

## 📧 Contact

**Project Maintainer**: [@chiewbacca23](https://github.com/chiewbacca23)

**Repository**: [https://github.com/chiewbacca23/mandate-of-heaven](https://github.com/chiewbacca23/mandate-of-heaven)

## 🗺️ Roadmap

### Q1 2025
- ✅ Complete module system
- ✅ Enhanced debug interface
- ✅ Bulk simulation capabilities
- 🚧 Hero abilities implementation

### Q2 2025
- Event special mechanics
- Multiple AI personalities
- Visual game state display
- Export functionality (CSV/JSON)

### Q3 2025
- Advanced statistics dashboard
- Tournament mode
- Save/load game states
- Mobile responsive design

### Q4 2025
- Multiplayer simulation
- Custom scenario builder
- Performance optimizations
- Comprehensive test suite

---

**Made with ⚔️ by the Three Kingdoms community**

*"The empire, long divided, must unite; long united, must divide. Thus it has ever been."*
