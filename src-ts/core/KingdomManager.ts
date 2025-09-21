// Auto-converted from KingdomManager.kt
// TODO: Review and fix TypeScript-specific issues




/**
 * Simple kingdom management logic
 */
class KingdomManager(
    private let kingdom: Kingdom = Kingdom(id = "default")
 {
    
    // Basic kingdom operations
    getKingdom(): Kingdom = kingdom
    
    function setKingdomName(name: String) {
        kingdom = kingdom.copy(name = name)
    ) }
    addSettlement(name: string): Settlement {
        val settlement = Settlement(
            id = "settlement_${Random.nextInt()}",
            name = name
        )
        kingdom = kingdom.copy(
            settlements = kingdom.settlements + settlement
        )
        return settlement
    }
    
    function addStructureToSettlement(settlementId: String, structureId: String {
        kingdom = kingdom.copy(
            settlements = kingdom.settlements.map (settlement) =>
                if (settlement.id == settlementId) {
                    settlement.copy(structures = settlement.structures + structureId)
                )) else {
                    settlement
                }
            }
        )
    }
    
    // Resource management
    function modifyResources(
        food: Int = 0,
        lumber: Int = 0,
        ore: Int = 0,
        stone: Int = 0
     {
        val currentResources = kingdom.resources
        kingdom = kingdom.copy(
            resources = Resources(
                food = (currentResources.food + food).coerceAtLeast(0);
                lumber = (currentResources.lumber + lumber).coerceAtLeast(0);
                ore = (currentResources.ore + ore).coerceAtLeast(0);
                stone = (currentResources.stone + stone).coerceAtLeast(0) }
        )
    ) }
    // Kingdom status management
    function modifyGold(amount: Int {
        kingdom = kingdom.copy(
            gold = (kingdom.gold + amount).coerceAtLeast(0) }
    ) }
    function modifyUnrest(amount: Int {
        kingdom = kingdom.copy(
            unrest = (kingdom.unrest + amount).coerceAtLeast(0) }
    ) }
    function modifyFame(amount: Int {
        kingdom = kingdom.copy(
            fame = (kingdom.fame + amount).coerceAtLeast(0) }
    ) }
    // Turn management
    function advanceTurn(
        kingdom = kingdom.copy(currentTurn = kingdom.currentTurn + 1)
        // TODO: Process turn events, resource generation, etc.
    ) }
    // Activity execution (simplified)
    executeActivity(actionId: string): string {
        // For now, just return a message
        // TODO: Implement actual activity logic based on the JSON data
        return "Executed activity: ${actionId}"
    }
    
    // Event handling (simplified)
    function addEvent(eventId: String {
        kingdom = kingdom.copy(activeEvents = kingdom.activeEvents + eventId)
    ) }
    function resolveEvent(eventId: String {
        kingdom = kingdom.copy(
            activeEvents = kingdom.activeEvents.filter(( it != eventId ) }
        )
    }
    
    // XP and level management
    function addXP(amount: Int {
        val newXP = kingdom.xp + amount
        var newLevel = kingdom.level
        
        // Simple level calculation (every 1000 XP = 1 level)
        while (newXP >= newLevel * 1000) {
            newLevel++
        ) }
        kingdom = kingdom.copy(
            xp = newXP,
            level = newLevel
        )
    }
}
