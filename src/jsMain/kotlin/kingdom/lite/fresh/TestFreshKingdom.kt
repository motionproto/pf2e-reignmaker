package kingdom.lite.fresh

/**
 * Test file to demonstrate the fresh kingdom system works
 */
object TestFreshKingdom {
    
    fun runTests() {
        console.log("=== Testing Fresh Kingdom System ===")
        
        // Test 1: Create a kingdom
        val manager = KingdomManager()
        manager.setKingdomName("Test Kingdom")
        console.log("Created kingdom: ${manager.getKingdom().name}")
        
        // Test 2: Add resources
        manager.modifyResources(
            food = 100,
            lumber = 50,
            resourcePoints = 1000
        )
        val resources = manager.getKingdom().resources
        console.log("Resources - Food: ${resources.food}, Lumber: ${resources.lumber}, RP: ${resources.resourcePoints}")
        
        // Test 3: Add a settlement
        val settlement = manager.addSettlement("Capital City")
        console.log("Added settlement: ${settlement.name}")
        
        // Test 4: Add structure to settlement
        manager.addStructureToSettlement(settlement.id, "bazaar")
        console.log("Added bazaar to ${settlement.name}")
        
        // Test 5: Load data from JSON
        val testStructure = DataLoader.getTestStructure()
        console.log("Loaded structure from JSON: ${testStructure.name}")
        
        val testAction = DataLoader.getTestAction()
        console.log("Loaded player action from JSON: ${testAction.name}")
        
        val testEvent = DataLoader.getTestEvent()
        console.log("Loaded event from JSON: ${testEvent.name}")
        
        // Test 6: Add and resolve an event
        manager.addEvent("bandit-activity")
        console.log("Active events: ${manager.getKingdom().activeEvents}")
        manager.resolveEvent("bandit-activity")
        console.log("Events after resolution: ${manager.getKingdom().activeEvents}")
        
        // Test 7: Level up
        manager.addXP(1500)
        val kingdom = manager.getKingdom()
        console.log("After XP gain - Level: ${kingdom.level}, XP: ${kingdom.xp}")
        
        console.log("=== All tests completed successfully! ===")
    }
}

/**
 * Export a function that can be called from the browser console
 */
@JsExport
fun testFreshKingdomSystem() {
    TestFreshKingdom.runTests()
}
