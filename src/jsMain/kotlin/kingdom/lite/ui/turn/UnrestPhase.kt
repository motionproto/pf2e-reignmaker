package kingdom.lite.ui.turn

import kingdom.lite.model.Incident
import kingdom.lite.model.IncidentLevel
import kingdom.lite.model.IncidentManager
import kingdom.lite.model.KingdomState
import kotlinx.browser.document
import kotlinx.browser.window
import org.w3c.dom.HTMLElement
import kotlin.js.Date

/**
 * Unrest Phase content for the Kingdom Sheet
 * Handles applying unrest and checking for incidents
 */
object UnrestPhase {
    private var currentIncident: Incident? = null
    private var lastRoll: Int = 0
    
    fun render(): String {
        val kingdomState = window.asDynamic().currentKingdomState as? KingdomState
        val currentUnrest = kingdomState?.unrest ?: 0
        val tier = IncidentManager.getUnrestTier(currentUnrest)
        val tierName = IncidentManager.getUnrestTierName(tier)
        val penalty = IncidentManager.getUnrestPenalty(currentUnrest)
        val incidentLevel = IncidentManager.getIncidentLevel(tier)
        
        return buildString {
            // Step 1: Unrest Dashboard
            append("""
                <div class="unrest-dashboard">
                    <div class="unrest-header">
                        <div class="unrest-title">
                            <i class="fas fa-fire unrest-icon"></i>
                            <span>Unrest Status</span>
                        </div>
                    </div>
                    
                    <div class="unrest-value-display">
                        <div class="unrest-current">$currentUnrest</div>
                        <div class="unrest-tier-badge tier-${tierName.lowercase()}">
                            $tierName
                        </div>
                    </div>
                    
                    ${if (penalty != 0) {
                        """
                        <div class="unrest-penalty">
                            <i class="fas fa-exclamation-triangle penalty-icon"></i>
                            <span class="penalty-text">Kingdom Check Penalty:</span>
                            <span class="penalty-value">$penalty</span>
                        </div>
                        """
                    } else { "" }}
                </div>
            """)
            
            // Step 2: Incident Section
            if (tier > 0 && incidentLevel != null) {
                append("""
                    <div class="incident-section">
                        <div class="incident-header">
                            <div class="incident-title">
                                Step 2: Check for ${incidentLevel.name.lowercase().replaceFirstChar { it.uppercase() }} Incidents
                            </div>
                            <button class="roll-incident-btn" onclick="kingdom.lite.ui.turn.UnrestPhase.rollForIncident()">
                                <i class="fas fa-dice-d20"></i> Roll for Incident
                            </button>
                        </div>
                        
                        <div id="incident-result-container"></div>
                    </div>
                """)
            } else {
                append("""
                    <div class="no-incident">
                        <i class="fas fa-dove no-incident-icon"></i>
                        <div class="no-incident-text">Kingdom is Stable</div>
                        <div class="no-incident-desc">No incidents occur when unrest is at this level</div>
                    </div>
                """)
            }
        }
    }
    
    @JsName("rollForIncident")
    fun rollForIncident() {
        val kingdomState = window.asDynamic().currentKingdomState as? KingdomState
        val currentUnrest = kingdomState?.unrest ?: 0
        val tier = IncidentManager.getUnrestTier(currentUnrest)
        
        if (tier == 0) return
        
        // Roll for incident
        lastRoll = (1..100).random()
        currentIncident = IncidentManager.rollForIncident(tier)
        
        // Display result
        val container = document.getElementById("incident-result-container") as? HTMLElement
        container?.innerHTML = renderIncidentResult()
    }
    
    private fun renderIncidentResult(): String {
        return if (currentIncident != null) {
            val incident = currentIncident!!
            """
            <div class="incident-display">
                <div class="roll-result">
                    <div class="roll-value rolling">$lastRoll</div>
                    <div class="roll-label">d100 Roll</div>
                </div>
                
                <div class="incident-image-container">
                    <img src="${incident.imagePath}" alt="${incident.name}" class="incident-image">
                    <div class="incident-level-overlay level-${incident.level.name.lowercase()}">
                        ${incident.level.name}
                    </div>
                </div>
                
                <div class="incident-info">
                    <div class="incident-name">${incident.name}</div>
                    <div class="incident-description">${incident.description}</div>
                </div>
                
                <div class="skill-options">
                    <div class="skill-options-title">Choose Resolution Approach:</div>
                    <div class="skill-option-grid">
                        ${incident.skillOptions.map { option ->
                            """
                            <button class="skill-option-btn" 
                                    onclick="kingdom.lite.ui.turn.UnrestPhase.resolveIncident('${option.skill}')">
                                <div class="skill-name">${option.skill}</div>
                                <div class="skill-description">${option.description}</div>
                            </button>
                            """
                        }.joinToString("")}
                    </div>
                </div>
                
                <div class="incident-effects">
                    <div class="effect-row">
                        <span class="effect-label">Success:</span>
                        <span class="effect-text effect-success">${incident.successEffect}</span>
                    </div>
                    <div class="effect-row">
                        <span class="effect-label">Failure:</span>
                        <span class="effect-text effect-failure">${incident.failureEffect}</span>
                    </div>
                    <div class="effect-row">
                        <span class="effect-label">Critical Failure:</span>
                        <span class="effect-text effect-failure">${incident.criticalFailureEffect}</span>
                    </div>
                </div>
            </div>
            """
        } else {
            """
            <div class="no-incident">
                <div class="roll-result">
                    <div class="roll-value">$lastRoll</div>
                    <div class="roll-label">d100 Roll</div>
                </div>
                <i class="fas fa-shield-alt no-incident-icon"></i>
                <div class="no-incident-text">No Incident!</div>
                <div class="no-incident-desc">The kingdom avoids crisis this turn</div>
            </div>
            """
        }
    }
    
    @JsName("resolveIncident")
    fun resolveIncident(skill: String) {
        val incident = currentIncident ?: return
        
        // Here we would normally trigger the skill check resolution
        // For now, we'll just display a message
        val container = document.getElementById("incident-result-container") as? HTMLElement
        container?.innerHTML = """
            <div class="incident-display">
                <div class="incident-info">
                    <div class="incident-name">Resolving: ${incident.name}</div>
                    <div class="incident-description">Using $skill to resolve the incident...</div>
                </div>
                <div class="skill-options">
                    <div class="skill-options-title">Ready to make a $skill check</div>
                    <div style="text-align: center; margin-top: 20px;">
                        <button class="roll-incident-btn" 
                                onclick="alert('Skill check system will be implemented next!')">
                            <i class="fas fa-dice-d20"></i> Roll $skill Check
                        </button>
                    </div>
                </div>
            </div>
        """
    }
}
