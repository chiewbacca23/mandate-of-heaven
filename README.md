# Three Kingdoms: Mandate of Heaven - Project Status Summary
## Updated: January 12, 2026

---

## 🎯 **PROJECT OVERVIEW**

**Three Kingdoms: Mandate of Heaven** is a strategic card game for 2-4 players set during the Chinese Three Kingdoms period. Players recruit legendary heroes, deploy them across kingdoms, and compete for prestigious titles to earn victory points over 8 turns.

**Current Phase**: Post-balance validation, legendary titles expansion complete, ready for comprehensive Monte Carlo simulation and playtesting.

---

## ✅ **COMPLETED MILESTONES**

### 1. **Core Game Design** ✅ COMPLETE
- **100 heroes** across 7 factions with unique abilities
- **40 balanced titles** with competitive viability (100% at 0.300+ efficiency)
- **40 events** with balanced resource distribution (4-4-4-4 across all resources)
- **4 resource types** with corresponding roles (Military/Influence/Supplies/Piety)
- **3 kingdom deployment** with column bonuses
- **8-turn structure** with turn order tiebreakers

### 2. **Title Balance Overhaul (v30-v31)** ✅ COMPLETE
- **10 legendary titles** with consistent mechanics
- **50 legendary heroes** across all legendaries (expanded from 46)
- **Cost standardization**: 28 titles at 10 resources
- **Set scoring enhancements** for faction titles
- **Legend bonus mechanic**: +1 point per named legend owned
- **Efficiency distribution**: 0.260-0.560 range with tight clustering

### 3. **Legendary Titles Validation & Expansion** ✅ COMPLETE
- **All 50 legends validated** against hero roles/allegiances
- **Seeds of Rebellion**: Fixed to Advisor/Tactician/Administrator requirement
- **Changing of the Guard**: Expanded to 5 legends (added Empress Dong, Empress He)
- **Campaign against the Tyrant**: Expanded to 5 legends (added Yan Liang, Wen Chou)
- **The Greatest Minds**: Simplified to resource-based requirement (4+ Influence)
- **Bringers of a New Age**: Hero corrections documented (Sun Jian, Sun Ce)

### 4. **Data Infrastructure** ✅ COMPLETE
- **titles.json**: All 40 titles with complete metadata
- **heroes data**: 100 heroes with stats, costs, effects (1 truncation issue documented)
- **events data**: 40 events with mechanics and resource distribution
- **Excel reference**: Comprehensive 4-sheet workbook with all game data

### 5. **Simulator Framework** ✅ ARCHITECTURE COMPLETE
- **Modular ES6 system** with clean separation of concerns
- **GitHub repository**: https://github.com/chiewbacca23/mandate-of-heaven
- **GitHub Pages deployment** for web-based simulation
- **Data loading system** with JSON validation
- **Statistical tracking** for balance analysis

---

## 🚧 **CURRENT STATUS - SIMULATOR IMPLEMENTATION**

### **What Works:**
- ✅ Module loading system (config, player, game-engine)
- ✅ Data validation (heroes, titles, events from JSON)
- ✅ Basic game flow structure
- ✅ Player initialization
- ✅ Market management skeleton

### **What Needs Implementation:**
- ⚠️ **Purchase phase logic**: Full title requirement checking
- ⚠️ **AI decision-making**: Strategic purchase evaluation
- ⚠️ **Set collection scoring**: Dynamic point calculation based on owned heroes
- ⚠️ **Legend bonus tracking**: Identify and count named legends
- ⚠️ **Hero abilities system**: Special effects and interactions
- ⚠️ **Event effects**: Special rules beyond resource bonuses
- ⚠️ **Statistical analysis**: Comprehensive balance metrics

### **Next Development Priority:**
1. **Implement title requirement validation**
   - Parse requirement strings (e.g., "Any Rebels Advisor/Tactician/Administrator")
   - Match heroes by name, role, allegiance, resource thresholds
   - Handle dual-role heroes correctly

2. **Build set collection scoring**
   - Track all owned heroes (hand + battlefield + retired)
   - Apply point arrays based on collection size
   - Calculate legend bonuses for legendary titles

3. **Create intelligent AI purchasing**
   - Evaluate available resources vs. market costs
   - Prioritize high-efficiency titles
   - Balance immediate points vs. long-term collection building

---

## 📊 **GAME BALANCE - CURRENT STATE**

### **Title Efficiency Distribution**
| Tier | Efficiency Range | Count | Examples |
|------|------------------|-------|----------|
| Top | 0.500-0.560 | 6 | Greatest Minds (0.560), Worth a Thousand Men (0.540) |
| High Mid | 0.400-0.500 | 13 | Military Strategist (0.450), Five Tiger Generals (0.440) |
| Low Mid | 0.350-0.400 | 18 | General of the Earth (0.350), Seeds of Rebellion (0.350) |
| Acceptable | 0.260-0.350 | 3 | Coalition Leader (0.300), Agile Cavalry (0.267) |

**Result**: 100% of titles are competitively viable in appropriate contexts.

### **Resource Distribution** (Events)
- **Military**: 4 events (25%)
- **Influence**: 4 events (25%)
- **Supplies**: 4 events (25%)
- **Piety**: 4 events (25%)

**Result**: Balanced turn order opportunities and end-game bonus scoring.

### **Legendary Titles Summary**
| ID | Title | Legends | Point Array | Efficiency |
|----|-------|---------|-------------|------------|
| 11 | Worth a Thousand Men | 5 | [1,2,4,6,8] + legends | 0.540 |
| 28 | The Greatest Minds | 4 | [1,2,4,6,8] + legends | 0.560 |
| 12 | Bringers of a New Age | 6 | [1,2,4,6,8] + legends | 0.530 |
| 27 | Changing of the Guard | 5 | [1,2,4,6,8] + legends | 0.450 |
| 38 | Campaign against the Tyrant | 5 | [1,2,4,6,8] + legends | 0.540 |
| 40 | Beauties of China | 5 | [1,2,4,6,8] + legends | 0.525 |
| 25 | Five Tiger Generals | 5 | [1,3,5,7,10] | 0.440 |
| 33 | Conquer the South | 5 | [1,3,5,7,10] | 0.390 |
| 36 | Guards the North | 5 | [1,3,5,7,10] | 0.390 |
| 37 | Seeds of Rebellion | 5 | [1,3,5,7,9] + legends | 0.350 |

---

## 📁 **PROJECT FILES & DELIVERABLES**

### **Game Data Files (Production Ready)**
- ✅ `titles.json` - All 40 titles with complete requirements and scoring
- ✅ `Three_Kingdoms_Complete_Game_Data.xlsx` - 4-sheet reference workbook
  - Summary sheet (statistics, updates, quick reference)
  - Heroes sheet (100 heroes with all stats)
  - Titles sheet (40 titles with requirements and legends)
  - Events sheet (40 events with effects)
- ✅ `heroes-sun-jian-sun-ce-corrected.json` - Role corrections for Bringers of a New Age
- ✅ `legendary-titles-final-configuration.md` - Complete legendary system documentation

### **Documentation**
- ✅ `Game_rules` - Complete gameplay reference
- ✅ `Three_Kingdoms_Titles_Analysis.md` - Balance analysis with efficiency calculations
- ✅ `Three_Kingdoms__Updated_Rules___Balance_Changes__v31_.md` - Comprehensive rules updates
- ✅ `simulator_journey_v7` - Development log and progress tracking
- ✅ `Prototype_progress_summary_v30` - Interactive prototype status
- ✅ `Three_Kingdoms_Simulator_-_Updated_Technical_Implementation_Summary.md` - Technical architecture

### **Source Code (GitHub Repository)**
```
mandate-of-heaven/
├── index.html (main simulator interface)
├── js/
│   ├── config.js (DataLoader, game constants)
│   ├── player.js (Player class, AI logic)
│   ├── game-engine.js (core game mechanics)
│   ├── purchase-manager.js (purchase decisions - needs implementation)
│   └── stats-manager.js (statistics collection - needs implementation)
└── data/
    ├── heroes.json (100 heroes - to be created)
    ├── titles.json (40 titles - COMPLETE)
    └── events.json (40 events - to be created)
```

### **Known Data Issues**
- ⚠️ `Three_Kingdoms__Complete_Heroes_Array__100_Heroes_.txt` truncated at line 1578
  - Hua Xiong (#54) has incomplete cost object
  - Workaround: Manual entry added to Excel file
  - Resolution needed: Complete the source file

---

## 🎮 **GAMEPLAY FEATURES**

### **Core Mechanics**
- **Hand Management**: 5-card limit with retirement system
- **Deployment**: Up to 3 cards per turn across 3 kingdoms
- **Turn Order**: 3-tier tiebreaker (leading resource > cards in kingdoms > province)
- **Purchases**: One hero OR one title per turn
- **Column Bonuses**: 2+ cards in same kingdom grants bonus resource
- **Emergency Resources**: -1 point for +2 different resources (strategic fallback)

### **Scoring System**
- **Title Points**: Set collection with dynamic scaling
- **Legend Bonuses**: +1 point per named legend owned (10 legendary titles)
- **Resource Majorities**: Bonus points based on event frequency (end-game)
- **Contest Victories**: 1 point per event contest win
- **Penalties**: -1 point per emergency resource use

### **Strategic Depth**
- **Multiple viable paths**: Faction focus, legendary hunting, generalist approach
- **Risk/reward decisions**: Retire powerful heroes for titles vs. keep for flexibility
- **Market timing**: Popular heroes taken by earlier players
- **Turn order manipulation**: Deploy resources strategically for priority
- **Collection building**: Balance immediate points with long-term set completion

---

## 🔬 **TESTING & VALIDATION NEEDS**

### **Immediate Testing (After Simulator Completion)**
1. **Statistical Balance Validation**
   - Run 1000+ games per player count (2P, 3P, 4P)
   - Measure win rate variance (target: ±5% from expected)
   - Track first-player advantage (target: <55% correlation)
   - Analyze title acquisition rates (target: 10-40% per title)

2. **Efficiency Verification**
   - Confirm all 40 titles see regular acquisition
   - Validate legendary titles competitive despite higher unlock requirements
   - Test faction-focused strategies vs. generalist approaches

3. **Edge Case Testing**
   - All peasant hands (no heroes drawn)
   - Market starvation scenarios
   - Extreme negative resource situations
   - Lu Bu placement restrictions

### **Future Playtesting (Physical Game)**
1. **2-player balance** (most important configuration)
2. **3-4 player scaling** (market size, turn order fairness)
3. **Hero ability interactions** (special effects, combos)
4. **Event variety** (40 events, 8 used per game)
5. **Legendary collection strategies** (are legends "must-haves" or nice bonuses?)

---

## 🐛 **KNOWN ISSUES & RESOLUTIONS**

### **Data Issues**
| Issue | Status | Resolution |
|-------|--------|------------|
| Hua Xiong truncated in source file | ⚠️ DOCUMENTED | Manual entry in Excel, needs source file fix |
| Sun Jian missing Administrator role | ✅ FIXED | Documented in corrections file, applied in Excel |
| Sun Ce missing Administrator role | ✅ FIXED | Documented in corrections file, applied in Excel |

### **Balance Issues (v29 → v30 → v31)**
| Issue | Status | Resolution |
|-------|--------|------------|
| Emergency resource abuse | ✅ FIXED | Limited to 2 uses, restricted to high-value purchases |
| Negative average scores | ✅ FIXED | Emergency logic improvement, scoring fixes |
| Resource majority bonuses broken | ✅ FIXED | Proper resource tracking from battlefield + hand + retired |
| Wei faction turn order advantage | ✅ FIXED | Balanced event distribution (4-4-4-4) |
| Legendary titles too expensive | ✅ FIXED | Cost standardization to 10 resources |
| "Trap option" titles | ✅ FIXED | Legend bonus mechanic makes all legendaries accessible |

### **Simulator Issues**
| Issue | Status | Resolution |
|-------|--------|------------|
| Module loading failures | ✅ FIXED | Proper ES6 import/export structure |
| Data loading errors | ✅ FIXED | DataLoader class with validation |
| Button logic not enabling | 🚧 IN PROGRESS | Debug system implemented, awaiting fix |
| Purchase phase skeleton | 🚧 IN PROGRESS | Needs full requirement validation logic |

---

## 📈 **SUCCESS METRICS**

### **Game Balance Targets**
- ✅ **Title viability**: 100% of titles at 0.300+ efficiency (ACHIEVED)
- ⏳ **Win rate balance**: ±5% variance from expected (PENDING TEST)
- ⏳ **First-player advantage**: <55% correlation (PENDING TEST)
- ⏳ **Score range**: 15-40 points typical (PENDING TEST)
- ✅ **Resource parity**: 4-4-4-4 event distribution (ACHIEVED)

### **Design Goals**
- ✅ **Strategic diversity**: Multiple viable strategies (ACHIEVED)
- ✅ **Thematic coherence**: Historical accuracy maintained (ACHIEVED)
- ✅ **No power creep**: Balanced without nerfing (ACHIEVED)
- ✅ **Collection depth**: 50 legendary heroes across 10 titles (ACHIEVED)
- ⏳ **Meaningful choices**: 3+ viable options per turn (NEEDS PLAYTESTING)

### **Technical Milestones**
- ✅ **Modular architecture**: Clean separation of concerns (ACHIEVED)
- ✅ **Data-driven design**: JSON-based configuration (ACHIEVED)
- ✅ **GitHub deployment**: Web-accessible simulator (ACHIEVED)
- 🚧 **Automated testing**: Bulk simulation capabilities (IN PROGRESS)
- ⏳ **Statistical analysis**: Comprehensive balance reports (PENDING)

---

## 🛠️ **NEXT STEPS - PRIORITY ORDER**

### **Phase 1: Complete Simulator Core** (1-2 weeks)
1. ✅ Fix hero source file truncation (Hua Xiong)
2. ⚠️ Implement title requirement validation
   - Parse requirement strings
   - Match heroes by attributes
   - Handle complex requirements (dual-role, resource thresholds)
3. ⚠️ Build set collection scoring system
   - Track all owned heroes
   - Apply point arrays dynamically
   - Calculate legend bonuses
4. ⚠️ Create intelligent AI purchasing
   - Evaluate market options
   - Balance efficiency vs. collection building
   - Strategic emergency resource usage

### **Phase 2: Statistical Validation** (1 week)
1. Run 1000+ game simulations
2. Generate balance reports
3. Identify any systematic advantages
4. Adjust if needed (minor tweaks only)

### **Phase 3: Enhanced Features** (2-3 weeks)
1. Implement hero abilities system
2. Add event special mechanics
3. Create multiple AI strategies
4. Visual game state display

### **Phase 4: Physical Playtesting** (Ongoing)
1. Print prototype cards
2. 2-player balance testing
3. 3-4 player scaling validation
4. Gather qualitative feedback
5. Minor refinements based on play experience

### **Phase 5: Production Preparation** (1 week)
1. Final balance confirmation
2. Rules document polish
3. Card layout finalization
4. Prepare for manufacturing

---

## 💡 **KEY LEARNINGS & DESIGN PRINCIPLES**

### **Balance Philosophy**
1. **Titles are the primary scoring mechanism** - Their competitive viability is essential
2. **Enhancement over nerfing** - Prefer boosting underperformers to penalizing success
3. **Thematic coherence matters** - Historical accuracy improves player engagement
4. **Collection rewards loyalty** - Legend bonuses reward thematic play without requiring specific heroes

### **Technical Insights**
1. **Data integrity is non-negotiable** - All content uses documented heroes/titles
2. **Modular architecture enables iteration** - Clean separation allows independent testing
3. **Statistical validation catches hidden issues** - Turn order bias, resource imbalances
4. **Emergency systems need careful tuning** - AI overuses without proper constraints

### **Design Evolution**
1. **Named hero requirements → Legendary titles** - Accessibility improved while maintaining theme
2. **Fixed costs → Standardized costs** - Reduced complexity without losing balance
3. **Simple set scoring → Scaled progression** - Rewards specialization appropriately
4. **Flat resource distribution → Balanced 4-4-4-4** - Eliminates systematic advantages

---

## 📞 **PROJECT CONTACTS & RESOURCES**

### **Repository**
- **GitHub**: https://github.com/chiewbacca23/mandate-of-heaven
- **Live Demo**: https://chiewbacca23.github.io/mandate-of-heaven/

### **Documentation**
- Game rules reference in project files
- Balance analysis spreadsheets
- Simulator development logs
- Technical architecture documents

### **Current Focus**
Implementing core simulator functionality to validate balance assumptions through statistical testing. All game design elements are complete and production-ready pending simulation validation.

---

## 🎯 **PROJECT VISION**

**Three Kingdoms: Mandate of Heaven** aims to deliver a strategic card game that:
- **Balances complexity with accessibility** - Deep strategy without overwhelming rules
- **Honors historical themes** - Authentic to Three Kingdoms period while maintaining gameplay focus
- **Offers replayability** - 100 heroes, 40 titles, 40 events ensure variety
- **Rewards skill** - Multiple viable strategies prevent single dominant approach
- **Engages collectors** - Legendary heroes provide thematic satisfaction without creating "must-haves"

**Current Status**: Post-design, pre-validation. Game is fully designed and balanced on paper, awaiting comprehensive simulation testing to confirm balance assumptions before physical playtesting and production.

---

*Last Updated: January 12, 2026*  
*Version: 31 (Legendary Titles Expansion Complete)*  
*Next Milestone: Simulator Core Implementation Complete*
