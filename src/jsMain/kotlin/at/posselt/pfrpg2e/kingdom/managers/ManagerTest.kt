package at.posselt.pfrpg2e.kingdom.managers

import at.posselt.pfrpg2e.kingdom.data.*

/**
 * Test file to verify manager compilation and basic integration.
 * This can be removed once managers are integrated into the main system.
 */
class ManagerTest {
    fun testManagerIntegration() {
        // Create manager instances
        val worksiteManager = WorksiteManager()
        val storageManager = StorageManager()
        val constructionManager = ConstructionManager()
        val resourceManager = ResourceManager(
            worksiteManager = worksiteManager,
            storageManager = storageManager,
            constructionManager = constructionManager
        )
        
        // Create test data
        val testWorksites = object : RawWorksites {
            override var sites = arrayOf<RawWorksite>()
        }
        
        val testCommodities = object : RawCommodities {
            override var food = 10
            override var lumber = 5
            override var stone = 3
            override var ore = 2
        }
        
        val testGold = object : RawGold {
            override var treasury = 100
            override var income = 10
            override var upkeep = 5
        }
        
        val testStorage = object : RawStorageBuildings {
            override var granaries = 1
            override var storehouses = 0
            override var warehouses = 0
            override var strategicReserves = 0
        }
        
        // Test basic operations
        val production = worksiteManager.calculateTotalProduction(testWorksites)
        val capacity = storageManager.calculateTotalCapacity(testStorage)
        val storedResources = storageManager.applyStorageRules(testCommodities, capacity)
        
        // Test resource phase
        val phaseResult = resourceManager.processResourcePhase(
            worksites = testWorksites,
            commodities = testCommodities,
            gold = testGold,
            storageBuildings = testStorage,
            constructionProject = null,
            settlements = emptyList(),
            armies = emptyList()
        )
        
        // Test end of turn
        val endTurnResult = resourceManager.processEndOfTurn(
            commodities = phaseResult.commodities,
            storageBuildings = testStorage,
            gold = testGold
        )
        
        println("Manager integration test completed successfully")
        println("Final commodities: Food=${endTurnResult.commodities.food}, Lumber=${endTurnResult.commodities.lumber}")
        println("Resources lost: Lumber=${endTurnResult.resourcesLost.lumber}, Stone=${endTurnResult.resourcesLost.stone}, Ore=${endTurnResult.resourcesLost.ore}")
    }
}
