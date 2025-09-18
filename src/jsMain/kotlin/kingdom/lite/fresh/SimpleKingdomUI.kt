package kingdom.lite.fresh

import kotlinx.html.*
import kotlinx.html.dom.create
import kotlinx.browser.document
import org.w3c.dom.HTMLElement

/**
 * Simple UI for Kingdom management
 */
class SimpleKingdomUI {
    private val manager = KingdomManager()
    
    fun render(): HTMLElement {
        val kingdom = manager.getKingdom()
        
        return document.create.div {
            classes = setOf("kingdom-ui")
            
            // Header
            h2 { +"Kingdom: ${kingdom.name}" }
            p { +"Level: ${kingdom.level} | XP: ${kingdom.xp} | Turn: ${kingdom.currentTurn}" }
            
            // Resources section
            div {
                h3 { +"Resources" }
                ul {
                    val res = kingdom.resources
                    li { +"Food: ${res.food}" }
                    li { +"Lumber: ${res.lumber}" }
                    li { +"Ore: ${res.ore}" }
                    li { +"Stone: ${res.stone}" }
                    li { +"Commodities: ${res.commodities}" }
                    li { +"Luxuries: ${res.luxuries}" }
                    li { +"Resource Points: ${res.resourcePoints}" }
                }
            }
            
            // Settlements section
            div {
                h3 { +"Settlements" }
                if (kingdom.settlements.isEmpty()) {
                    p { +"No settlements yet" }
                } else {
                    ul {
                        kingdom.settlements.forEach { settlement ->
                            li { 
                                +"${settlement.name} (Level ${settlement.level})"
                                if (settlement.structures.isNotEmpty()) {
                                    ul {
                                        settlement.structures.forEach { structureId ->
                                            li { +structureId }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
            
            // Active Events
            if (kingdom.activeEvents.isNotEmpty()) {
                div {
                    h3 { +"Active Events" }
                    ul {
                        kingdom.activeEvents.forEach { eventId ->
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
    fun addTestSettlement() {
        manager.addSettlement("Test Settlement ${manager.getKingdom().settlements.size + 1}")
    }
    
    fun addTestResources() {
        manager.modifyResources(
            food = 10,
            lumber = 5,
            resourcePoints = 100
        )
    }
    
    fun advanceTurn() {
        manager.advanceTurn()
    }
}

/**
 * Simple function to open the kingdom UI
 */
fun openSimpleKingdomUI() {
    val ui = SimpleKingdomUI()
    val element = ui.render()
    
    // Add to document body or a specific container
    document.body?.appendChild(element)
    
    console.log("Simple Kingdom UI opened")
}
