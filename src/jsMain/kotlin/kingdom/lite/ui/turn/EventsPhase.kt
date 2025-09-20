package kingdom.lite.ui.turn

import kingdom.lite.model.*
import kingdom.lite.ui.styles.EventStyles
import kotlinx.browser.window
import kotlin.random.Random

/**
 * Events Phase content for the Kingdom Sheet
 * Handles checking for kingdom events and resolving them
 */
class EventsPhase(
    private val kingdomState: KingdomState,
    private val turnManager: TurnManager
) {
    
    init {
        // Ensure styles are injected
        EventStyles.inject()
    }
    
    fun render(): String = buildString {
        val currentEvent = kingdomState.currentEvent
        
        if (currentEvent == null) {
            // No event yet - show stability check
            renderStabilityCheck()
        } else {
            // Event is active - show event card
            renderEventCard(currentEvent)
        }
    }
    
    private fun StringBuilder.renderStabilityCheck() {
        append("""
            <div class="event-phase-container">
                <div class="stability-check-section">
                    <h3>Kingdom Events Check</h3>
                    <p class="event-description">
                        The kingdom must make a Stability Check to see if an event occurs this turn.
                    </p>
                    <div class="dc-info">
                        <span class="dc-label">Event DC:</span>
                        <span class="dc-value">${kingdomState.eventDC}</span>
                    </div>
                    <button class="btn-primary event-check-btn" onclick="window.performStabilityCheck()">
                        <i class="fas fa-dice-d20"></i> Roll Stability Check
                    </button>
                    <div id="event-check-result" class="check-result-display"></div>
                </div>
            </div>
        """)
        
        // Add continuous events display if any
        if (kingdomState.continuousEvents.isNotEmpty()) {
            append("""
                <div class="continuous-events-section">
                    <h4>Ongoing Events</h4>
                    <div class="continuous-events-list">
            """)
            kingdomState.continuousEvents.forEach { event ->
                append("""
                    <div class="continuous-event-item">
                        <span class="event-name">${event.name}</span>
                        <span class="event-trait ${event.traits.firstOrNull() ?: ""}">${event.traits.firstOrNull() ?: ""}</span>
                    </div>
                """)
            }
            append("""
                    </div>
                </div>
            """)
        }
        
        // Set up the stability check handler
        window.asDynamic().performStabilityCheck = {
            val roll = (1..20).random()
            val success = roll >= kingdomState.eventDC
            val resultDiv = window.document.getElementById("event-check-result")
            
            if (success) {
                // Event triggered!
                kingdomState.eventDC = 16 // Reset DC
                val event = kingdomState.eventManager.getRandomEvent()
                if (event != null) {
                    kingdomState.currentEvent = event
                    resultDiv?.innerHTML = """
                        <div class="roll-result success">
                            <strong>Event Triggered!</strong> (Rolled $roll vs DC ${kingdomState.eventDC - 16 + 16})
                            <div>Drawing event card...</div>
                        </div>
                    """
                    
                    // Refresh the phase display after a short delay
                    window.setTimeout({
                        val phaseContent = window.document.querySelector(".phase-content")
                        phaseContent?.innerHTML = this.toString()
                    }, 1500)
                }
            } else {
                // No event this turn
                kingdomState.eventDC = maxOf(6, kingdomState.eventDC - 5)
                resultDiv?.innerHTML = """
                    <div class="roll-result failure">
                        <strong>No Event</strong> (Rolled $roll vs DC ${kingdomState.eventDC + 5})
                        <div>DC reduced to ${kingdomState.eventDC} for next turn.</div>
                    </div>
                """
            }
        }
    }
    
    private fun StringBuilder.renderEventCard(event: KingdomEvent) {
        append("""
            <div class="event-phase-container">
                <div class="event-card">
                    <div class="event-header">
                        <h3 class="event-title">${event.name}</h3>
                        <div class="event-traits">
        """)
        
        event.traits.forEach { trait ->
            append("""<span class="event-trait $trait">$trait</span>""")
        }
        
        append("""
                        </div>
                    </div>
                    
                    <div class="event-image-container">
                        <img src="${event.imagePath}" alt="${event.name}" class="event-image">
                    </div>
                    
                    <div class="event-body">
                        <p class="event-description">${event.description}</p>
        """)
        
        if (event.special != null) {
            append("""
                        <div class="event-special">
                            <i class="fas fa-info-circle"></i> ${event.special}
                        </div>
            """)
        }
        
        append("""
                        <div class="event-resolution">
                            <h4>Choose Your Response:</h4>
                            <div class="skill-options">
        """)
        
        event.skills.forEach { skill ->
            append("""
                                <button class="skill-btn" onclick="window.resolveEventWithSkill('$skill')">
                                    <i class="fas fa-dice-d20"></i> $skill
                                </button>
            """)
        }
        
        append("""
                            </div>
                        </div>
                        
                        <div id="event-resolution-result" class="event-result-display"></div>
                    </div>
                </div>
            </div>
        """)
        
        // Set up event resolution handler
        window.asDynamic().resolveEventWithSkill = { skill: String ->
            // Get party level for DC (defaulting to 3 if not available)
            val partyLevel = window.asDynamic().game?.pf2e?.party?.level as? Int ?: 3
            val dc = when(partyLevel) {
                1 -> 15
                2 -> 16
                3 -> 18
                4 -> 19
                5 -> 20
                6 -> 22
                7 -> 23
                8 -> 24
                9 -> 26
                10 -> 27
                else -> 15 + partyLevel
            }
            
            // Roll the check (simplified - in real game would use character modifiers)
            val roll = (1..20).random()
            val modifier = 5 // Base modifier, would come from character sheet
            val unrestPenalty = turnManager.getUnrestPenalty()
            val total = roll + modifier + unrestPenalty
            
            // Determine outcome
            val outcome = when {
                total >= dc + 10 -> event.criticalSuccess
                total >= dc -> event.success
                total <= dc - 10 -> event.criticalFailure
                else -> event.failure
            }
            
            // Apply effects
            applyEventOutcome(outcome)
            
            // Display result
            val resultDiv = window.document.getElementById("event-resolution-result")
            resultDiv?.innerHTML = """
                <div class="resolution-result">
                    <div class="roll-display">
                        <strong>$skill Check:</strong> Rolled $roll + $modifier ${if (unrestPenalty < 0) "$unrestPenalty (unrest)" else ""} = $total vs DC $dc
                    </div>
                    <div class="outcome-message ${if (total >= dc) "success" else "failure"}">
                        ${outcome.message}
                    </div>
                    <div class="outcome-effects">
            """
            
            val effects = mutableListOf<String>()
            if (outcome.goldChange != 0) {
                effects.add("${if (outcome.goldChange > 0) "+" else ""}${outcome.goldChange} Gold")
            }
            if (outcome.unrestChange != 0) {
                effects.add("${if (outcome.unrestChange > 0) "+" else ""}${outcome.unrestChange} Unrest")
            }
            if (outcome.fameChange != 0) {
                effects.add("${if (outcome.fameChange > 0) "+" else ""}${outcome.fameChange} Fame")
            }
            outcome.resourceChanges.forEach { (resource, amount) ->
                if (amount != 0) {
                    effects.add("${if (amount > 0) "+" else ""}$amount ${resource.capitalize()}")
                }
            }
            
            if (effects.isNotEmpty()) {
                resultDiv?.innerHTML = resultDiv.innerHTML + effects.joinToString(" | ")
            }
            
            resultDiv?.innerHTML = resultDiv.innerHTML + """
                    </div>
                    <button class="btn-primary" onclick="window.completeEventResolution()">
                        Continue
                    </button>
                </div>
            """
            
            // Mark event as resolved if not continuous
            if (!event.isContinuous || (outcome == event.criticalSuccess || outcome == event.success)) {
                kingdomState.currentEvent = null
            } else {
                // Add to continuous events if it persists
                if (!kingdomState.continuousEvents.contains(event)) {
                    kingdomState.continuousEvents.add(event)
                }
            }
        }
        
        // Complete event resolution handler
        window.asDynamic().completeEventResolution = {
            kingdomState.currentEvent = null
            val phaseContent = window.document.querySelector(".phase-content")
            phaseContent?.innerHTML = this.toString()
            
            // Update kingdom stats display
            window.asDynamic().updateKingdomStats?.invoke()
        }
    }
    
    private fun applyEventOutcome(outcome: EventOutcome) {
        // Apply gold change
        if (outcome.goldChange != 0) {
            kingdomState.resources["gold"] = (kingdomState.resources["gold"] ?: 0) + outcome.goldChange
        }
        
        // Apply unrest change
        if (outcome.unrestChange != 0) {
            kingdomState.unrest = maxOf(0, kingdomState.unrest + outcome.unrestChange)
        }
        
        // Apply fame change
        if (outcome.fameChange != 0) {
            kingdomState.fame = maxOf(0, minOf(3, kingdomState.fame + outcome.fameChange))
        }
        
        // Apply resource changes
        outcome.resourceChanges.forEach { (resource, amount) ->
            kingdomState.resources[resource] = maxOf(0, (kingdomState.resources[resource] ?: 0) + amount)
        }
    }
}
