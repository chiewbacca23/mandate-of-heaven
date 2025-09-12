# mandate-of-heaven
Mandate of Heaven board game
Three Kingdoms: Mandate of Heaven - Simulator Development Log
Project Overview
Development of a comprehensive web-based simulator to test game balance for "Three Kingdoms: Mandate of Heaven", a strategic card game set during the Chinese Three Kingdoms period. The simulator validates that all 40 titles are competitively viable and measures various balance metrics.

Development Timeline
Phase 1: Initial Simulator & Balance Issues (Early Development)
Built monolithic HTML simulator with embedded game logic
Identified critical balance problems from initial simulation data:
Emergency resource abuse (13+ uses per game vs intended 1-2)
Negative average scores (-5.3 points) due to emergency penalties
Zero resource majority bonuses (broken end-game scoring)
Missing hero purchase tracking
Phase 2: Core Fixes & Modularization (Mid Development)
Fixed emergency resource logic: Restricted to high-value targets only, limited to 2 uses per game
Implemented resource majority scoring: Players now earn bonus points based on event frequency
Added proper resource calculations: Fixed battlefield vs end-game resource handling
Solved JavaScript execution issues: Addressed missing script tags and file loading problems
Phase 3: Modular Architecture (Recent Development)
Transitioned from single-file simulator to maintainable modular system:

File Structure Created:
mandate-of-heaven/
├── index.html (main interface)
├── js/
│   ├── config.js (constants, game configuration)
│   ├── player.js (Player class, resource calculations)
│   ├── game-engine.js (core game logic, turn management)
│   ├── purchase-manager.js (AI purchase decisions, emergency logic)
│   └── stats-manager.js (data collection, export functionality)
└── data/
    ├── heroes.json (100 heroes)
    ├── titles.json (40 balanced titles)
    └── events.json (40 events)
Key Features Implemented:
Strategic AI Purchase Logic: Players evaluate market costs vs available resources
Emergency Resource System: Limited, strategic use for high-value purchases only
Comprehensive Statistics: Win rates, score distributions, purchase patterns
Data Export: JSON/CSV export for external analysis
Bulk Simulation: Run hundreds of games for statistical significance
Phase 4: Balance Validation System (Current)
Complete game flow: 8-turn structure with proper phase management
Market economics: Hero pool depletion tracking, cost analysis
Title acquisition: Proper hero retirement and set collection scoring
Turn order fairness: Resource-based priority with tiebreakers
Technical Achievements
Problem-Solving Milestones:
JavaScript Execution Failures: Resolved missing script tags and file loading issues
GitHub Pages Deployment: Set up proper file structure and caching workarounds
Resource Icon Display: Fixed case sensitivity issues in event data
Modular Integration: Successfully split 2000+ line monolith into maintainable components
Purchase Manager Integration: Resolved module loading and initialization sequence
Architecture Benefits:
Maintainable: Each module has clear responsibilities
Debuggable: Errors isolated to specific components
Scalable: Easy to add new features without breaking existing code
Testable: Individual modules can be verified independently
Current Capabilities
The simulator now provides:

Realistic game simulation: Players make intelligent purchase decisions
Statistical analysis: Comprehensive tracking of game balance metrics
Data export: Generate datasets for external analysis tools
Balance validation: Test whether all 40 titles are competitively viable
Performance metrics: Emergency usage, pass rates, score distributions
Next Development Priorities
Advanced title scoring logic: Implement complex set collection mechanics
Hero abilities system: Add special effects and interactions
Enhanced AI strategies: Multiple decision-making approaches
Event effects: Implement special event mechanics beyond basic resource bonuses
Balance Testing Results (Pending)
With the fixes implemented, expected improvements:

Emergency usage: 13+ per game → 1-3 per game
Average scores: -5.3 points → positive range (5-15 points)
Resource majorities: 0 awards → regular bonus point distribution
Pass rates: High → minimal with proper purchase logic
Technical Stack
Frontend: HTML5, CSS3, vanilla JavaScript
Deployment: GitHub Pages
Data Format: JSON for game content
Architecture: ES6 modules with class-based design
Testing: Built-in module verification and bulk simulation capabilities
Development Log: Modular simulator architecture completed and ready for comprehensive balance validation testing.

