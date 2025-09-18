package kingdom.lite.fresh

// Import the JSON data directly - must be top-level
@JsModule("../../../../data/structures/bazaar.json")
private external val bazaarStructure: RawStructure

@JsModule("../../../../data/player-actions/build-roads.json")
private external val buildRoadsAction: RawPlayerAction

@JsModule("../../../../data/events/bandit-activity.json")
private external val banditEvent: RawEvent

/**
 * Simple data loader for JSON resources
 */
object DataLoader {
    
    // For now, just expose a few items to test compilation
    fun getTestStructure(): RawStructure = bazaarStructure
    fun getTestAction(): RawPlayerAction = buildRoadsAction
    fun getTestEvent(): RawEvent = banditEvent
    
    // Later we'll load all JSON files properly
    fun getAllStructures(): List<RawStructure> {
        // TODO: Load all structure JSON files
        return listOf(bazaarStructure)
    }
    
    fun getAllPlayerActions(): List<RawPlayerAction> {
        // TODO: Load all player action JSON files
        return listOf(buildRoadsAction)
    }
    
    fun getAllEvents(): List<RawEvent> {
        // TODO: Load all event JSON files
        return listOf(banditEvent)
    }
}
