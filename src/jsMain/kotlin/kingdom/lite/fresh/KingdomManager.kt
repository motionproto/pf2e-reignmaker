package kingdom.lite.fresh

import kotlin.random.Random

/**
 * Simple kingdom management logic
 */
class KingdomManager(
    private var kingdom: Kingdom = Kingdom(id = "default")
) {
    
    // Basic kingdom operations
    fun getKingdom(): Kingdom = kingdom
    
    fun setKingdomName(name: String) {
        kingdom = kingdom.copy(name = name)
    }
    
    fun addSettlement(name: String): Settlement {
        val settlement = Settlement(
            id = "settlement_${Random.nextInt()}",
            name = name
        )
        kingdom = kingdom.copy(
            settlements = kingdom.settlements + settlement
        )
        return settlement
    }
    
    fun addStructureToSettlement(settlementId: String, structureId: String) {
        kingdom = kingdom.copy(
            settlements = kingdom.settlements.map { settlement ->
                if (settlement.id == settlementId) {
                    settlement.copy(structures = settlement.structures + structureId)
                } else {
                    settlement
                }
            }
        )
    }
    
    // Resource management
    fun modifyResources(
        food: Int = 0,
        lumber: Int = 0,
        ore: Int = 0,
        stone: Int = 0,
        commodities: Int = 0,
        luxuries: Int = 0,
        resourcePoints: Int = 0
    ) {
        val currentResources = kingdom.resources
        kingdom = kingdom.copy(
            resources = Resources(
                food = (currentResources.food + food).coerceAtLeast(0),
                lumber = (currentResources.lumber + lumber).coerceAtLeast(0),
                ore = (currentResources.ore + ore).coerceAtLeast(0),
                stone = (currentResources.stone + stone).coerceAtLeast(0),
                commodities = (currentResources.commodities + commodities).coerceAtLeast(0),
                luxuries = (currentResources.luxuries + luxuries).coerceAtLeast(0),
                resourcePoints = (currentResources.resourcePoints + resourcePoints).coerceAtLeast(0)
            )
        )
    }
    
    // Turn management
    fun advanceTurn() {
        kingdom = kingdom.copy(currentTurn = kingdom.currentTurn + 1)
        // TODO: Process turn events, resource generation, etc.
    }
    
    // Activity execution (simplified)
    fun executeActivity(actionId: String): String {
        // For now, just return a message
        // TODO: Implement actual activity logic based on the JSON data
        return "Executed activity: $actionId"
    }
    
    // Event handling (simplified)
    fun addEvent(eventId: String) {
        kingdom = kingdom.copy(activeEvents = kingdom.activeEvents + eventId)
    }
    
    fun resolveEvent(eventId: String) {
        kingdom = kingdom.copy(
            activeEvents = kingdom.activeEvents.filter { it != eventId }
        )
    }
    
    // XP and level management
    fun addXP(amount: Int) {
        val newXP = kingdom.xp + amount
        var newLevel = kingdom.level
        
        // Simple level calculation (every 1000 XP = 1 level)
        while (newXP >= newLevel * 1000) {
            newLevel++
        }
        
        kingdom = kingdom.copy(
            xp = newXP,
            level = newLevel
        )
    }
}
