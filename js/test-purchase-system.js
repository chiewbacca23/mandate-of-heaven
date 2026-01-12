// test-purchase-system.js
// Test suite for the purchase system

import { PurchaseManager } from './purchase-manager.js';

/**
 * Test the purchase system with sample data
 */
export async function testPurchaseSystem() {
    console.log('🧪 Testing Purchase System...\n');
    
    try {
        // Load game data
        const heroesData = await loadJSON('./data/heroes.json');
        const titlesData = await loadJSON('./data/titles.json');
        const eventsData = await loadJSON('./data/events.json');
        
        console.log(`✅ Loaded ${heroesData.length} heroes`);
        console.log(`✅ Loaded ${titlesData.length} titles`);
        console.log(`✅ Loaded ${eventsData.length} events\n`);
        
        // Create purchase manager
        const purchaseManager = new PurchaseManager(heroesData, titlesData, eventsData);
        
        // Create test player
        const testPlayer = createTestPlayer(heroesData);
        
        // Create test market
        const availableHeroes = heroesData.slice(0, 4);
        const availableTitles = titlesData.slice(0, 4);
        
        // Test game state
        const gameState = {
            turn: 4,
            phase: 'purchase'
        };
        
        console.log('🎮 Test Player Setup:');
        console.log(`   Hand: ${testPlayer.hand.map(h => h.name).join(', ')}`);
        console.log(`   Battlefield Wei: ${testPlayer.battlefield.wei.map(h => h.name).join(', ')}`);
        console.log(`   Battlefield Wu: ${testPlayer.battlefield.wu.map(h => h.name).join(', ')}`);
        console.log(`   Battlefield Shu: ${testPlayer.battlefield.shu.map(h => h.name).join(', ')}\n`);
        
        console.log('🏪 Available Market:');
        console.log(`   Heroes: ${availableHeroes.map(h => h.name).join(', ')}`);
        console.log(`   Titles: ${availableTitles.map(t => t.name).join(', ')}\n`);
        
        // Execute purchase decision
        console.log('🤖 AI Making Purchase Decision...\n');
        const result = purchaseManager.executePurchase(
            testPlayer,
            availableHeroes,
            availableTitles,
            gameState
        );
        
        // Display results
        console.log('📊 Purchase Result:');
        console.log(`   Action: ${result.action}`);
        console.log(`   Success: ${result.success}`);
        console.log(`   Details:`, result.details);
        console.log();
        
        // Show updated player state
        console.log('👤 Updated Player State:');
        console.log(`   Score: ${testPlayer.score}`);
        console.log(`   Titles: ${testPlayer.titles.length} (${testPlayer.titles.map(t => t.name).join(', ')})`);
        console.log(`   Hand Size: ${testPlayer.hand.length}`);
        console.log(`   Retired: ${testPlayer.retired.length}\n`);
        
        // Test legendary title scoring
        console.log('⭐ Testing Legendary Title Scoring...\n');
        testLegendaryScoring(purchaseManager, heroesData, titlesData);
        
        // Test resource majority calculation
        console.log('\n💎 Testing Resource Majority Bonuses...\n');
        testResourceMajorities(purchaseManager, heroesData, eventsData);
        
        console.log('\n✅ All tests completed!\n');
        
        return {
            success: true,
            purchaseManager,
            testPlayer,
            result
        };
        
    } catch (error) {
        console.error('❌ Test failed:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Test legendary title scoring
 */
function testLegendaryScoring(purchaseManager, heroesData, titlesData) {
    // Find a legendary title
    const legendaryTitle = titlesData.find(t => t.is_legendary);
    if (!legendaryTitle) {
        console.log('⚠️  No legendary titles found');
        return;
    }
    
    console.log(`Testing with: ${legendaryTitle.name}`);
    console.log(`Named Legends: ${legendaryTitle.named_legends.join(', ')}`);
    
    // Create player with some legends
    const testPlayer = {
        hand: [],
        battlefield: { wei: [], wu: [], shu: [] },
        retired: [],
        titles: [],
        score: 0
    };
    
    // Add named legends to player
    const legendsToAdd = legendaryTitle.named_legends.slice(0, 2);
    for (const legendName of legendsToAdd) {
        const hero = heroesData.find(h => h.name.toLowerCase() === legendName.toLowerCase());
        if (hero) {
            testPlayer.hand.push(hero);
        }
    }
    
    // Add some matching heroes for base score
    const matchingHeroes = heroesData.filter(h => 
        purchaseManager.scorer.getMatchingHeroes([h], legendaryTitle).length > 0
    ).slice(0, 3);
    testPlayer.hand.push(...matchingHeroes);
    
    // Calculate points
    const pointsCalc = purchaseManager.scorer.calculateTitlePoints(testPlayer, legendaryTitle);
    
    console.log(`\nResults:`);
    console.log(`   Collection Size: ${pointsCalc.collectionSize}`);
    console.log(`   Base Points: ${pointsCalc.basePoints}`);
    console.log(`   Legend Bonus: ${pointsCalc.legendBonus} (${legendsToAdd.length} legends × ${legendaryTitle.legend_bonus})`);
    console.log(`   Total Points: ${pointsCalc.totalPoints}`);
}

/**
 * Test resource majority bonuses
 */
function testResourceMajorities(purchaseManager, heroesData, eventsData) {
    // Create 2 test players
    const player1 = createTestPlayer(heroesData);
    const player2 = createTestPlayer(heroesData);
    
    player1.id = 1;
    player2.id = 2;
    
    // Use first 8 events
    const gameEvents = eventsData.slice(0, 8);
    
    // Calculate final scores
    const scores = purchaseManager.calculateFinalScores([player1, player2], gameEvents);
    
    console.log('Player 1 Final Score:');
    console.log(`   Title Points: ${scores[1].titlePoints}`);
    console.log(`   Majority Bonus: ${scores[1].majorityBonus}`);
    console.log(`   Emergency Penalty: ${scores[1].emergencyPenalty}`);
    console.log(`   Final Score: ${scores[1].finalScore}`);
    
    console.log('\nPlayer 2 Final Score:');
    console.log(`   Title Points: ${scores[2].titlePoints}`);
    console.log(`   Majority Bonus: ${scores[2].majorityBonus}`);
    console.log(`   Emergency Penalty: ${scores[2].emergencyPenalty}`);
    console.log(`   Final Score: ${scores[2].finalScore}`);
}

/**
 * Create a test player with sample heroes
 */
function createTestPlayer(heroesData) {
    return {
        id: 1,
        hand: [
            heroesData[0],
            heroesData[1]
        ],
        battlefield: {
            wei: [heroesData[2], heroesData[3]],
            wu: [heroesData[4]],
            shu: [heroesData[5]]
        },
        retired: [],
        titles: [],
        score: 0,
        emergencyUsed: 0
    };
}

/**
 * Load JSON file
 */
async function loadJSON(path) {
    const response = await fetch(path);
    if (!response.ok) {
        throw new Error(`Failed to load ${path}: ${response.statusText}`);
    }
    return await response.json();
}

// Export for use in browser console
if (typeof window !== 'undefined') {
    window.testPurchaseSystem = testPurchaseSystem;
}
