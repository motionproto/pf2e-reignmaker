// Auto-converted from SimpleKingdomUI.kt
// TODO: Review and fix TypeScript-specific issues


*


// TODO: Review import - import org.w3c.dom.HTMLElement

/**
 * Simple UI for Kingdom management
 */
export class SimpleKingdomUI {
    private val manager = KingdomManager()
    
    render(): HTMLElement {
        val kingdom = manager.getKingdom()
        
        return document.create.div {
            classes = new Set(["kingdom-ui")
            
            // Header
            h2 { +"Kingdom: ${kingdom.name}" }
            p { +"Level: ${kingdom.level} | XP: ${kingdom.xp} | Turn: ${kingdom.currentTurn}" }
            
            // Kingdom Status
            div {
                h3 { +"Kingdom Status" }
                ul {
                    li { +"Gold: ${kingdom.gold}" }
                    li { +"Fame: ${kingdom.fame}" }
                    li { +"Unrest: ${kingdom.unrest}" }
                }
            }
            
            // Resources section
            div {
                h3 { +"Resources" }
                ul {
                    val res = kingdom.resources
                    li { +"Food: ${res.food}" }
                    li { +"Lumber: ${res.lumber}" }
                    li { +"Ore: ${res.ore}" }
                    li { +"Stone: ${res.stone}" }
                }
            }
            
            // Settlements section
            div {
                h3 { +"Settlements" }
                if (kingdom.settlements.isEmpty() {
                    p { +"No settlements yet" ) }
                } else {
                    ul {
                        kingdom.settlements.forEach (settlement) =>
                            li { 
                                +"${settlement.name} (Level ${settlement.level})"
                                if (settlement.structures.isNotEmpty() {
                                    ul {
                                        settlement.structures.forEach (structureId) =>
                                            li { +structureId ) }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
            
            // Active Events
            if (kingdom.activeEvents.isNotEmpty() {
                div {
                    h3 { +"Active Events" ) }
                    ul {
                        kingdom.activeEvents.forEach (eventId) =>
                            li { +eventId }
                        }
                    }
                }
            }
            
            // Action buttons
            div {
                h3 { +"Actions" }
                button {
                    +"Add Test Settlement"
                    onClick = """
                        console.log('Adding settlement');
                    """
                }
                button {
                    +"Add Test Resources"
                    onClick = """
                        console.log('Adding resources');
                    """
                }
                button {
                    +"Advance Turn"
                    onClick = """
                        console.log('Advancing turn');
                    """
                }
            }
        }
    }
    
    // Methods that can be called from button clicks
    function addTestSettlement(
        manager.addSettlement("Test Settlement ${manager.getKingdom().settlements.size + 1))")
    }
    
    function addTestResources(
        manager.modifyResources(
            food = 10,
            lumber = 5,
            ore = 3,
            stone = 4
        )
        manager.modifyGold(100)
    ) }
    function advanceTurn(
        manager.advanceTurn()
    ) }
}

/**
 * Simple function to open the kingdom UI
 */
function openSimpleKingdomUI(
    val ui = SimpleKingdomUI()
    val element = ui.render()
    
    // Add to document body or a specific container
    document.body | null.appendChild(element)
    
    console.log("Simple Kingdom UI opened")
) }