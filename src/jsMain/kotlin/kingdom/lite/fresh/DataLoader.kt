package kingdom.lite.fresh

/**
 * Data loader with mock data matching the actual JSON schema
 * 
 * This creates test data that matches the real JSON structure.
 * In a full implementation, this would load actual JSON files.
 */
object DataLoader {
    
    // Mock data matching the actual JSON schema
    fun getTestStructure(): RawStructure {
        @Suppress("UNCHECKED_CAST_TO_EXTERNAL_INTERFACE")
        return js("""({
            id: "bazaar",
            name: "Bazaar",
            type: "support",
            category: "commerce",
            tier: 2,
            effect: "Enables purchasing items",
            construction: {
                resources: {
                    lumber: 2,
                    stone: 2
                }
            },
            traits: ["building", "support-structure"],
            special: null,
            upgradeFrom: "market-square"
        })""") as RawStructure
    }
    
    fun getTestAction(): RawPlayerAction {
        @Suppress("UNCHECKED_CAST_TO_EXTERNAL_INTERFACE")
        return js("""({
            id: "build-roads",
            name: "Build Roads",
            category: "expand-borders",
            description: "Construct pathways between settlements",
            skills: [
                {
                    skill: "crafting",
                    description: "engineering expertise"
                }
            ],
            effects: {
                success: {
                    description: "Build roads",
                    modifiers: { roadsBuilt: 1 }
                },
                failure: {
                    description: "No effect",
                    modifiers: {}
                }
            }
        })""") as RawPlayerAction
    }
    
    fun getTestEvent(): RawEvent {
        @Suppress("UNCHECKED_CAST_TO_EXTERNAL_INTERFACE")
        return js("""({
            id: "bandit-activity",
            name: "Bandit Activity",
            description: "Bandits are causing trouble",
            traits: ["dangerous", "continuous"],
            location: "The borderlands",
            modifier: 0,
            resolution: "Deal with the bandits",
            resolvedOn: ["criticalSuccess", "success"],
            stages: [{
                skills: ["intimidation", "diplomacy"],
                success: {
                    msg: "Bandits driven off",
                    modifiers: []
                },
                failure: {
                    msg: "Bandits remain",
                    modifiers: [{
                        type: "untyped",
                        name: "Bandit trouble",
                        value: -1,
                        selector: "resources",
                        enabled: true,
                        turns: 1
                    }]
                }
            }],
            special: null
        })""") as RawEvent
    }
    
    // Stub methods for future implementation
    fun getAllStructures(): List<RawStructure> = listOf(getTestStructure())
    fun getAllPlayerActions(): List<RawPlayerAction> = listOf(getTestAction())
    fun getAllEvents(): List<RawEvent> = listOf(getTestEvent())
}
