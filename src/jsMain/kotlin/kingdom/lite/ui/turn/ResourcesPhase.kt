package kingdom.lite.ui.turn

import kingdom.lite.model.*
import kingdom.lite.ui.styles.ResourceStyles

/**
 * Resources Phase content for the Kingdom Sheet
 * Handles resource collection, consumption, military support, and build queue
 */
class ResourcesPhase(
    private val kingdomState: KingdomState,
    private val turnManager: TurnManager
) {
    
    private val production = kingdomState.calculateProduction()
    
    fun render(): String = buildString {
        // Include resource styles
        append(ResourceStyles.render())
        
        append("""
            <div class="resources-phase-container">
                <!-- Part 1: Resource Display at the Top -->
                ${renderResourceDisplay()}
                
                <!-- Part 2: Resource Steps Underneath -->
                ${renderResourceSteps()}
            </div>
        """)
    }
    
    /**
     * Part 1: Render the resource display at the top
     */
    private fun renderResourceDisplay(): String = renderResourceDashboard()
    
    /**
     * Part 2: Render all resource steps in a scrollable container
     */
    private fun renderResourceSteps(): String = buildString {
        append("""
            <div class="resource-steps-scroll">
                ${renderStep1CollectResources()}
                ${renderStep2FoodConsumption()}
                ${renderStep3MilitarySupport()}
                ${renderStep4BuildQueue()}
            </div>
        """)
    }
    
    /**
     * Render the resource dashboard (non-sticky)
     */
    private fun renderResourceDashboard(): String = buildString {
        append("""
            <div class="resource-dashboard-wrapper">
                <div class="resource-dashboard">
                    ${renderCompactResourceCard("food", kingdomState.resources["food"] ?: 0)}
                    ${renderCompactResourceCard("lumber", kingdomState.resources["lumber"] ?: 0)}
                    ${renderCompactResourceCard("stone", kingdomState.resources["stone"] ?: 0)}
                    ${renderCompactResourceCard("ore", kingdomState.resources["ore"] ?: 0)}
                    ${renderCompactResourceCard("gold", kingdomState.resources["gold"] ?: 0)}
                </div>
            </div>
        """)
    }
    
    /**
     * Render a compact resource card for the sticky dashboard
     */
    private fun renderCompactResourceCard(resource: String, value: Int): String {
        val (icon, color) = when (resource) {
            "food" -> "fa-wheat-awn" to "#8B4513"
            "lumber" -> "fa-tree" to "#228B22"
            "stone" -> "fa-cube" to "#708090"
            "ore" -> "fa-mountain" to "#4B0082"
            "gold" -> "fa-coins" to "#FFD700"
            else -> "fa-question" to "#666666"
        }
        
        return """
            <div class="resource-card">
                <i class="fas $icon resource-icon" style="color: $color;"></i>
                <div class="resource-value">$value</div>
                <div class="resource-label">${resource.capitalize()}</div>
            </div>
        """
    }
    
    /**
     * Step 1: Collect Resources
     */
    private fun renderStep1CollectResources(): String = buildString {
        val isCompleted = kingdomState.isPhaseStepCompleted("resources_collect")
        
        append("""
            <div class="phase-step-container" style="position: relative;">
                ${if (isCompleted) """<i class="fas fa-check-circle phase-step-complete"></i>""" else ""}
                <strong>Step 1: Collect Resources and Revenue</strong>
                
                <!-- Always show production summary at the top -->
                ${if (production.isNotEmpty() || kingdomState.hexes.any { it.worksite != null }) {
                    """
                    <div class="production-summary" style="margin: 15px 0; padding: 15px; background: linear-gradient(135deg, #f5f5f5 0%, #e5e5e5 100%); border-radius: 8px; border: 1px solid #d1d1d1;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                            <div class="production-summary-title" style="font-weight: bold; font-size: 16px;">Expected Income This Turn:</div>
                            <div style="font-weight: bold; color: #22c55e;">
                                ${if (production.isNotEmpty()) {
                                    production.entries.joinToString(" | ") { "+${it.value} ${it.key.capitalize()}" }
                                } else {
                                    "No Production"
                                }}
                            </div>
                        </div>
                        
                        ${if (kingdomState.hexes.any { it.worksite != null }) {
                            """
                            <details style="margin-top: 10px;">
                                <summary style="cursor: pointer; color: #666; font-size: 14px;">View Worksite Details</summary>
                                <ul class="worksite-list" style="margin-top: 10px;">
                                    ${kingdomState.hexes.filter { it.worksite != null }.joinToString("") { hex ->
                                        val prod = hex.getProduction()
                                        """<li class="worksite-item">
                                            <span>${hex.name ?: "Hex ${hex.id}"} (${hex.terrain})</span>
                                            <span>${if (prod.isNotEmpty()) {
                                                prod.entries.joinToString(", ") { "${it.value} ${it.key.capitalize()}" }
                                            } else {
                                                "No production"
                                            }}</span>
                                        </li>"""
                                    }}
                                </ul>
                            </details>
                            """
                        } else {
                            ""
                        }}
                    </div>
                    """
                } else {
                    """<div style="margin: 15px 0; padding: 15px; background: #f9f9f9; border-radius: 8px; border: 1px solid #e5e5e5; text-align: center; color: #666; font-style: italic;">
                        No worksites currently producing resources
                    </div>"""
                }}
                
                ${if (isCompleted) {
                    """<div style="margin-top: 10px; color: #666; font-style: italic; text-align: center;">Resources have been collected for this turn.</div>"""
                } else {
                    ""
                }}
                
                ${if (!isCompleted) {
                    """<button class="turn-action-button" onclick="window.executeResourceStep1()">
                        <i class="fas fa-hand-holding-usd"></i> Collect Resources
                    </button>"""
                } else {
                    """<button class="turn-action-button" disabled style="opacity: 0.5;">
                        <i class="fas fa-check"></i> Resources Collected
                    </button>"""
                }}
            </div>
        """)
    }
    
    /**
     * Step 2: Food Consumption
     */
    private fun renderStep2FoodConsumption(): String = buildString {
        val isCompleted = kingdomState.isPhaseStepCompleted("resources_consumption")
        val totalFoodNeeded = kingdomState.getTotalFoodConsumption()
        val currentFood = kingdomState.resources["food"] ?: 0
        val shortage = maxOf(0, totalFoodNeeded - currentFood)
        
        append("""
            <div class="phase-step-container" style="position: relative;">
                ${if (isCompleted) """<i class="fas fa-check-circle phase-step-complete"></i>""" else ""}
                <strong>Step 2: Food Consumption</strong>
                
                <div style="margin: 10px 0;">
                    <div style="display: flex; justify-content: space-around; flex-wrap: wrap; gap: 20px;">
                        <div style="text-align: center;">
                            <i class="fas fa-home" style="font-size: 32px; color: #8B4513;"></i>
                            <div style="font-size: 20px; font-weight: bold; margin: 2px 0;">
                                ${kingdomState.settlements.sumOf { it.foodConsumption }}
                            </div>
                            <div style="font-size: 11px; color: #666;">Settlement Consumption</div>
                        </div>
                        
                        <div style="text-align: center;">
                            <i class="fas fa-shield-alt" style="font-size: 32px; color: #4682B4;"></i>
                            <div style="font-size: 20px; font-weight: bold; margin: 2px 0;">
                                ${kingdomState.armies.size}
                            </div>
                            <div style="font-size: 11px; color: #666;">Army Consumption</div>
                        </div>
                        
                        <div style="text-align: center;">
                            <i class="fas fa-wheat-awn" style="font-size: 32px; color: ${if (shortage > 0) "#ef4444" else "#22c55e"};"></i>
                            <div style="font-size: 20px; font-weight: bold; margin: 2px 0; color: ${if (shortage > 0) "#ef4444" else "#22c55e"};">
                                $currentFood / $totalFoodNeeded
                            </div>
                            <div style="font-size: 11px; color: #666;">Available / Required</div>
                        </div>
                    </div>
                    
                    ${if (shortage > 0 && !isCompleted) {
                        """<div class="consumption-warning">
                            <i class="fas fa-exclamation-triangle"></i>
                            <strong>Warning:</strong> Food shortage of $shortage will cause +$shortage Unrest!
                        </div>"""
                    } else {
                        ""
                    }}
                </div>
                
                ${if (!isCompleted) {
                    """<button class="turn-action-button" onclick="window.executeResourceStep2()">
                        <i class="fas fa-utensils"></i> Pay Food Consumption
                    </button>"""
                } else {
                    """<button class="turn-action-button" disabled style="opacity: 0.5;">
                        <i class="fas fa-check"></i> Consumption Paid
                    </button>"""
                }}
            </div>
        """)
    }
    
    /**
     * Step 3: Military Support
     */
    private fun renderStep3MilitarySupport(): String = buildString {
        val isCompleted = kingdomState.isPhaseStepCompleted("resources_military")
        val totalSupport = kingdomState.getTotalArmySupport()
        val armyCount = kingdomState.armies.size
        val unsupportedCount = maxOf(0, armyCount - totalSupport)
        
        append("""
            <div class="phase-step-container" style="position: relative;">
                ${if (isCompleted) """<i class="fas fa-check-circle phase-step-complete"></i>""" else ""}
                <strong>Step 3: Military Support</strong>
                
                <div class="army-support-display">
                    <div class="support-status ${when {
                        unsupportedCount > 0 -> "danger"
                        armyCount == totalSupport -> "warning"
                        else -> "good"
                    }}">
                        <i class="fas fa-shield-alt army-icon"></i>
                        <div>
                            <div style="font-size: 18px; font-weight: bold;">$armyCount / $totalSupport</div>
                            <div style="font-size: 12px; color: #666;">Armies / Capacity</div>
                        </div>
                    </div>
                    
                    ${if (unsupportedCount > 0) {
                        """<div class="support-status danger">
                            <i class="fas fa-exclamation-triangle" style="font-size: 32px; color: #ef4444;"></i>
                            <div>
                                <div style="font-size: 18px; font-weight: bold; color: #ef4444;">$unsupportedCount</div>
                                <div style="font-size: 12px; color: #666;">Unsupported</div>
                            </div>
                        </div>"""
                    } else {
                        ""
                    }}
                </div>
                
                ${if (unsupportedCount > 0 && !isCompleted) {
                    """<div class="consumption-warning">
                        <i class="fas fa-exclamation-triangle"></i>
                        <strong>Warning:</strong> $unsupportedCount unsupported ${if (unsupportedCount == 1) "army" else "armies"} will require morale checks!
                    </div>"""
                } else if (armyCount == 0) {
                    """<div style="margin-top: 10px; color: #666; font-style: italic; text-align: center;">No armies currently fielded</div>"""
                } else {
                    ""
                }}
                
                ${if (!isCompleted) {
                    """<button class="turn-action-button" onclick="window.executeResourceStep3()">
                        <i class="fas fa-flag"></i> Process Military Support
                    </button>"""
                } else {
                    """<button class="turn-action-button" disabled style="opacity: 0.5;">
                        <i class="fas fa-check"></i> Support Processed
                    </button>"""
                }}
            </div>
        """)
    }
    
    /**
     * Step 4: Build Queue
     */
    private fun renderStep4BuildQueue(): String = buildString {
        val isCompleted = kingdomState.isPhaseStepCompleted("resources_build")
        
        append("""
            <div class="phase-step-container" style="position: relative;">
                ${if (isCompleted) """<i class="fas fa-check-circle phase-step-complete"></i>""" else ""}
                <strong>Step 4: Process Build Queue</strong>
                
                ${if (kingdomState.buildQueue.isNotEmpty()) {
                    """<div class="build-queue-container">
                        <div style="margin-bottom: 15px; font-weight: bold;">
                            Available Resources: 
                            ${listOf("lumber", "stone", "ore").joinToString(", ") { 
                                "${kingdomState.resources[it] ?: 0} ${it.capitalize()}"
                            }}
                        </div>
                        
                        ${kingdomState.buildQueue.joinToString("") { project ->
                            renderBuildProject(project, isCompleted)
                        }}
                    </div>"""
                } else {
                    """<div style="margin-top: 10px; color: #666; font-style: italic; text-align: center;">No construction projects in queue</div>"""
                }}
                
                ${if (!isCompleted && kingdomState.buildQueue.isNotEmpty()) {
                    """<button class="turn-action-button" onclick="window.executeResourceStep4()">
                        <i class="fas fa-hammer"></i> Apply to Construction
                    </button>"""
                } else if (isCompleted) {
                    """<button class="turn-action-button" disabled style="opacity: 0.5;">
                        <i class="fas fa-check"></i> Resources Applied
                    </button>"""
                } else {
                    ""
                }}
            </div>
        """)
    }
    
    /**
     * Render a single resource card
     */
    private fun renderResourceCard(resource: String, amount: Int, showChange: Boolean): String {
        val (icon, color) = when (resource) {
            "food" -> "fa-wheat-awn" to "#8B4513"
            "lumber" -> "fa-tree" to "#228B22"
            "stone" -> "fa-cube" to "#708090"
            "ore" -> "fa-mountain" to "#4B0082"
            "gold" -> "fa-coins" to "#FFD700"
            else -> "fa-question" to "#666666"
        }
        
        val currentValue = kingdomState.resources[resource] ?: 0
        
        return """
            <div class="resource-card">
                <i class="fas $icon resource-icon" style="color: $color;"></i>
                <div class="resource-value">${if (showChange) currentValue else currentValue}</div>
                <div class="resource-label">${resource.capitalize()}</div>
                ${if (showChange && amount > 0) {
                    """<div class="resource-change positive">+$amount</div>"""
                } else {
                    ""
                }}
            </div>
        """
    }
    
    /**
     * Render a build project card
     */
    private fun renderBuildProject(project: BuildProject, isCompleted: Boolean): String {
        val percentage = project.getCompletionPercentage()
        val remaining = project.getRemainingCost()
        
        return """
            <div class="build-project-card">
                <div class="build-project-header">
                    <span class="build-project-name">${project.structureName}</span>
                    <span class="build-project-tier">Tier ${project.tier}</span>
                </div>
                
                <div class="progress-bar-container">
                    <div class="progress-bar-fill" style="width: $percentage%;">
                        <span class="progress-bar-text">$percentage%</span>
                    </div>
                </div>
                
                <div style="font-size: 14px; color: #666; margin-top: 5px;">
                    ${if (remaining.isNotEmpty()) {
                        "Needs: ${remaining.entries.joinToString(", ") { "${it.value} ${it.key}" }}"
                    } else {
                        "Complete!"
                    }}
                </div>
                
                ${if (!isCompleted && remaining.isNotEmpty()) {
                    """<div class="resource-allocation">
                        ${remaining.entries.joinToString("") { (resource, _) ->
                            val available = kingdomState.resources[resource] ?: 0
                            val pending = project.pendingAllocation[resource] ?: 0
                            """
                            <div class="allocation-control">
                                <i class="fas ${getResourceIcon(resource)}" style="color: ${getResourceColor(resource)};"></i>
                                <button class="allocation-button" onclick="window.adjustAllocation('${project.id}', '$resource', -1)" 
                                    ${if (pending <= 0) "disabled" else ""}>−</button>
                                <span class="allocation-value">$pending</span>
                                <button class="allocation-button" onclick="window.adjustAllocation('${project.id}', '$resource', 1)"
                                    ${if (pending >= available) "disabled" else ""}>+</button>
                            </div>
                            """
                        }}
                    </div>"""
                } else {
                    ""
                }}
            </div>
        """
    }
    
    private fun getResourceIcon(resource: String): String = when (resource) {
        "lumber" -> "fa-tree"
        "stone" -> "fa-cube"
        "ore" -> "fa-mountain"
        else -> "fa-question"
    }
    
    private fun getResourceColor(resource: String): String = when (resource) {
        "lumber" -> "#228B22"
        "stone" -> "#708090"
        "ore" -> "#4B0082"
        else -> "#666666"
    }
}
