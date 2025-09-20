package kingdom.lite.ui.components

import kingdom.lite.model.PlayerAction
import kotlin.js.Date

/**
 * Reusable expandable card component for displaying player actions
 */
class ActionCard(
    private val action: PlayerAction,
    private val onPerform: (PlayerAction) -> Unit = {}
) {
    private val cardId = "action-card-${action.id}-${Date.now()}"
    
    fun render(isExpanded: Boolean = false): String = buildString {
        append("""
            <div class="action-card ${if (isExpanded) "expanded" else ""}" data-action-id="${action.id}" id="$cardId">
                <div class="action-header" onclick="toggleActionCard('$cardId')">
                    <div class="action-header-content">
                        <div class="action-chevron">
                            <i class="fas fa-chevron-${if (isExpanded) "down" else "right"}"></i>
                        </div>
                        <div class="action-info">
                            <div class="action-title">${action.name}</div>
                            <div class="action-brief">${action.description}</div>
                        </div>
                    </div>
                    <button class="action-perform-btn" onclick="event.stopPropagation(); performAction('${action.id}')">
                        <i class="fas fa-play"></i> Perform
                    </button>
                </div>
                
                <div class="action-details" style="display: ${if (isExpanded) "block" else "none"}">
                    ${renderSkills()}
                    ${renderEffects()}
                    ${renderSpecial()}
                    ${renderCost()}
                </div>
            </div>
        """)
    }
    
    private fun renderSkills(): String = if (action.skills.isNotEmpty()) {
        buildString {
            append("""<div class="action-skills">
                <div class="detail-label">Available Skills:</div>
                <div class="skill-list">
            """)
            
            action.skills.forEach { skill ->
                append("""
                    <div class="skill-option">
                        <span class="skill-name">${skill.skill}</span>
                        <span class="skill-desc">- ${skill.description}</span>
                    </div>
                """)
            }
            
            append("</div></div>")
        }
    } else ""
    
    private fun renderEffects(): String = buildString {
        append("""
            <div class="action-effects">
                <div class="detail-label">Outcomes:</div>
                <div class="effects-list">
        """)
        
        // Critical Success
        if (action.criticalSuccess.description.isNotEmpty()) {
            append("""
                <div class="effect-item critical-success">
                    <span class="effect-level">
                        <i class="fas fa-star"></i> Critical Success:
                    </span>
                    <span class="effect-desc">${action.criticalSuccess.description}</span>
                </div>
            """)
        }
        
        // Success
        append("""
            <div class="effect-item success">
                <span class="effect-level">
                    <i class="fas fa-check"></i> Success:
                </span>
                <span class="effect-desc">${action.success.description}</span>
            </div>
        """)
        
        // Failure
        append("""
            <div class="effect-item failure">
                <span class="effect-level">
                    <i class="fas fa-times"></i> Failure:
                </span>
                <span class="effect-desc">${action.failure.description}</span>
            </div>
        """)
        
        // Critical Failure
        if (action.criticalFailure.description != action.failure.description) {
            append("""
                <div class="effect-item critical-failure">
                    <span class="effect-level">
                        <i class="fas fa-skull"></i> Critical Failure:
                    </span>
                    <span class="effect-desc">${action.criticalFailure.description}</span>
                </div>
            """)
        }
        
        append("</div></div>")
        
        // Proficiency Scaling if present
        action.proficiencyScaling?.let { scaling ->
            append("""
                <div class="proficiency-scaling">
                    <div class="detail-label">Proficiency Scaling:</div>
                    <div class="scaling-list">
            """)
            
            scaling.forEach { (level, value) ->
                append("""
                    <span class="scaling-item">
                        <span class="scaling-level">${level.capitalize()}:</span>
                        <span class="scaling-value">${value} ${if (value == 1) "hex" else "hexes"}</span>
                    </span>
                """)
            }
            
            append("</div></div>")
        }
    }
    
    private fun renderSpecial(): String = action.special?.let {
        """
            <div class="action-special">
                <div class="detail-label">Special:</div>
                <div class="special-text">$it</div>
            </div>
        """
    } ?: ""
    
    private fun renderCost(): String = action.cost?.let { costs ->
        buildString {
            append("""
                <div class="action-cost">
                    <div class="detail-label">Cost:</div>
                    <div class="cost-list">
            """)
            
            costs.forEach { (resource, amount) ->
                val icon = when(resource) {
                    "gold" -> "fa-coins"
                    "food" -> "fa-wheat-awn"
                    "lumber" -> "fa-tree"
                    "stone" -> "fa-cube"
                    "ore" -> "fa-gem"
                    else -> "fa-circle"
                }
                append("""
                    <span class="cost-item">
                        <i class="fas $icon"></i> $amount ${resource.capitalize()}
                    </span>
                """)
            }
            
            append("</div></div>")
        }
    } ?: ""
    
    companion object {
        fun setupGlobalHandlers() {
            // Setup the toggle function
            kotlinx.browser.window.asDynamic().toggleActionCard = { cardId: String ->
                val card = kotlinx.browser.document.getElementById(cardId)
                if (card != null) {
                    val isExpanded = card.classList.contains("expanded")
                    
                    if (isExpanded) {
                        card.classList.remove("expanded")
                        // Update chevron
                        val chevron = card.querySelector(".action-chevron i")
                        chevron?.className = "fas fa-chevron-right"
                        // Hide details
                        val details = card.querySelector(".action-details") as? org.w3c.dom.HTMLElement
                        details?.style?.display = "none"
                    } else {
                        card.classList.add("expanded")
                        // Update chevron
                        val chevron = card.querySelector(".action-chevron i")
                        chevron?.className = "fas fa-chevron-down"
                        // Show details
                        val details = card.querySelector(".action-details") as? org.w3c.dom.HTMLElement
                        details?.style?.display = "block"
                    }
                }
            }
            
            // Setup the perform action function
            kotlinx.browser.window.asDynamic().performAction = { actionId: String ->
                console.log("Performing action: $actionId")
                // This will be connected to the actual game logic later
                kotlinx.browser.window.alert("Action performed: $actionId")
            }
        }
    }
}
