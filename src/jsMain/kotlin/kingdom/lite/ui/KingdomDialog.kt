package kingdom.lite.ui

import kingdom.lite.fresh.KingdomManager
import kotlinx.browser.window
import kotlin.js.json

/**
 * Creates the Kingdom Management dialog with full layout
 */
fun createKingdomDialog(actorId: String): String {
    // Get kingdom data from the manager
    val manager = KingdomManager()
    val kingdom = manager.getKingdom()
    
    // Calculate some derived values
    val hexesControlled = 12 // This would come from the actual hex data
    val workSites = kingdom.settlements.sumOf { 
        it.structures.count { struct -> struct == "worksite" } 
    }
    
    return """
        <div class="kingdom-management-dialog" style="display: flex; flex-direction: column; height: 600px; width: 900px;">
            
            <!-- Top Section: Info and Tab Interface -->
            <div class="kingdom-header" style="padding: 10px; border-bottom: 2px solid #ccc;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <h2 style="margin: 0;">
                        <i class="fa-solid fa-chess-rook"></i> 
                        ${kingdom.name}
                    </h2>
                    <div style="display: flex; gap: 10px;">
                        <span><strong>Level:</strong> ${kingdom.level}</span>
                        <span><strong>XP:</strong> ${kingdom.xp}/${getXPThreshold(kingdom.level)}</span>
                        <span><strong>Fame:</strong> ${kingdom.fame}</span>
                    </div>
                </div>
                
                <!-- Tabs -->
                <div class="kingdom-tabs" style="margin-top: 10px;">
                    <button class="tab-button active" style="padding: 5px 15px; margin-right: 5px;">Overview</button>
                    <button class="tab-button" style="padding: 5px 15px; margin-right: 5px;">Settlements</button>
                    <button class="tab-button" style="padding: 5px 15px; margin-right: 5px;">Leaders</button>
                    <button class="tab-button" style="padding: 5px 15px;">Events</button>
                </div>
            </div>
            
            <!-- Main Content Area -->
            <div class="kingdom-content" style="display: flex; flex: 1; overflow: hidden;">
                
                <!-- Left Section: Kingdom Character Sheet -->
                <div class="kingdom-sheet" style="flex: 1; padding: 15px; overflow-y: auto; border-right: 1px solid #ccc;">
                    <h3 style="margin-top: 0;">Kingdom Status</h3>
                    
                    <!-- Basic Stats -->
                    <div class="stat-group" style="margin-bottom: 15px;">
                        <h4>Territory</h4>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 5px;">
                            <div><strong>Hexes Controlled:</strong> ${hexesControlled}</div>
                            <div><strong>Work Sites:</strong> ${workSites}</div>
                            <div><strong>Settlements:</strong> ${kingdom.settlements.size}</div>
                            <div><strong>Capital:</strong> ${kingdom.settlements.firstOrNull()?.name ?: "None"}</div>
                        </div>
                    </div>
                    
                    <!-- Resources -->
                    <div class="stat-group" style="margin-bottom: 15px;">
                        <h4>Resources</h4>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 5px;">
                            <div><strong>Gold:</strong> ${kingdom.gold} gp</div>
                            <div><strong>Food:</strong> ${kingdom.resources.food}</div>
                            <div><strong>Lumber:</strong> ${kingdom.resources.lumber}</div>
                            <div><strong>Stone:</strong> ${kingdom.resources.stone}</div>
                            <div><strong>Ore:</strong> ${kingdom.resources.ore}</div>
                            <div><strong>Luxuries:</strong> 0</div>
                        </div>
                    </div>
                    
                    <!-- Kingdom Health -->
                    <div class="stat-group" style="margin-bottom: 15px;">
                        <h4>Kingdom Health</h4>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 5px;">
                            <div><strong>Unrest:</strong> <span style="color: ${getUnrestColor(kingdom.unrest)}">${kingdom.unrest}</span></div>
                            <div><strong>Stability:</strong> ${getStabilityStatus(kingdom.unrest)}</div>
                            <div><strong>Consumption:</strong> ${calculateConsumption(kingdom)} food/turn</div>
                            <div><strong>Income:</strong> +${calculateIncome(kingdom)} gp/turn</div>
                        </div>
                    </div>
                    
                    <!-- Ability Scores -->
                    <div class="stat-group" style="margin-bottom: 15px;">
                        <h4>Kingdom Abilities</h4>
                        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 5px;">
                            <div><strong>Culture:</strong> +0</div>
                            <div><strong>Economy:</strong> +0</div>
                            <div><strong>Loyalty:</strong> +0</div>
                            <div><strong>Stability:</strong> +0</div>
                            <div><strong>Strife:</strong> +0</div>
                            <div><strong>Warfare:</strong> +0</div>
                        </div>
                    </div>
                    
                    <!-- Active Events -->
                    <div class="stat-group">
                        <h4>Active Events (${kingdom.activeEvents.size})</h4>
                        <div style="color: #666; font-style: italic;">No active events</div>
                    </div>
                </div>
                
                <!-- Right Section: Turn Order -->
                <div class="turn-order" style="flex: 1; padding: 15px; overflow-y: auto;">
                    <h3 style="margin-top: 0;">Turn Order</h3>
                    
                    <!-- Turn Phase Indicator -->
                    <div style="padding: 10px; background: #e8f4f8; border-radius: 5px; margin-bottom: 15px;">
                        <strong>Current Phase:</strong> Upkeep
                        <div style="font-size: 0.9em; color: #666; margin-top: 5px;">
                            Turn ${getCurrentTurn()} - ${getCurrentMonth()}
                        </div>
                    </div>
                    
                    <!-- Phase Actions -->
                    <div class="phase-sections">
                        <!-- Upkeep Phase -->
                        <div class="phase-section" style="margin-bottom: 20px;">
                            <h4 style="background: #ddd; padding: 5px; margin: 10px 0;">
                                <i class="fa-solid fa-gear"></i> Upkeep Phase
                            </h4>
                            <div style="padding-left: 10px;">
                                <label><input type="checkbox"> Pay Consumption (${calculateConsumption(kingdom)} food)</label><br>
                                <label><input type="checkbox"> Adjust Unrest</label><br>
                                <label><input type="checkbox"> Resource Collection</label><br>
                                <label><input type="checkbox"> Check for Random Events</label>
                            </div>
                        </div>
                        
                        <!-- Commerce Phase -->
                        <div class="phase-section" style="margin-bottom: 20px;">
                            <h4 style="background: #ddd; padding: 5px; margin: 10px 0;">
                                <i class="fa-solid fa-coins"></i> Commerce Phase
                            </h4>
                            <div style="padding-left: 10px;">
                                <button style="margin: 2px;">Collect Taxes</button>
                                <button style="margin: 2px;">Trade Commodities</button>
                                <button style="margin: 2px;">Purchase Resources</button>
                            </div>
                        </div>
                        
                        <!-- Leadership Phase -->
                        <div class="phase-section" style="margin-bottom: 20px;">
                            <h4 style="background: #ddd; padding: 5px; margin: 10px 0;">
                                <i class="fa-solid fa-crown"></i> Leadership Phase (2 activities)
                            </h4>
                            <div style="padding-left: 10px;">
                                <select style="width: 100%; margin: 5px 0;">
                                    <option>Choose Leadership Activity 1...</option>
                                    <option>Claim Hex</option>
                                    <option>Build Structure</option>
                                    <option>Establish Settlement</option>
                                    <option>Create Worksite</option>
                                </select>
                                <select style="width: 100%; margin: 5px 0;">
                                    <option>Choose Leadership Activity 2...</option>
                                    <option>Claim Hex</option>
                                    <option>Build Structure</option>
                                    <option>Establish Settlement</option>
                                    <option>Create Worksite</option>
                                </select>
                            </div>
                        </div>
                        
                        <!-- End Turn -->
                        <div class="phase-section">
                            <button style="width: 100%; padding: 10px; background: #4CAF50; color: white; border: none; border-radius: 5px; font-size: 16px;">
                                <i class="fa-solid fa-forward"></i> End Turn
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <style>
            .kingdom-management-dialog {
                font-family: system-ui, -apple-system, sans-serif;
            }
            
            .tab-button {
                background: #f0f0f0;
                border: 1px solid #ccc;
                border-bottom: none;
                cursor: pointer;
            }
            
            .tab-button.active {
                background: white;
                font-weight: bold;
            }
            
            .tab-button:hover:not(.active) {
                background: #e0e0e0;
            }
            
            .stat-group h4 {
                margin: 10px 0 5px 0;
                color: #333;
                border-bottom: 1px solid #ddd;
                padding-bottom: 3px;
            }
        </style>
    """.trimIndent()
}

// Helper functions
fun getXPThreshold(level: Int): Int = when(level) {
    1 -> 1000
    2 -> 3000
    3 -> 6000
    4 -> 10000
    5 -> 15000
    else -> 20000 + (level - 5) * 10000
}

fun getUnrestColor(unrest: Int): String = when {
    unrest == 0 -> "green"
    unrest <= 5 -> "orange"
    else -> "red"
}

fun getStabilityStatus(unrest: Int): String = when {
    unrest == 0 -> "Stable"
    unrest <= 5 -> "Restless"
    unrest <= 10 -> "Unstable"
    else -> "In Rebellion"
}

fun calculateConsumption(kingdom: Any): Int {
    // Simplified calculation - would be more complex in reality
    return try {
        val settlementsDynamic = kingdom.asDynamic().settlements
        val count = when {
            settlementsDynamic == null || settlementsDynamic == undefined -> 0
            settlementsDynamic.size != undefined -> settlementsDynamic.size as Int
            else -> 0
        }
        4 + count * 2
    } catch (e: Exception) {
        console.error("Error calculating consumption:", e)
        6 // Default consumption
    }
}

fun calculateIncome(kingdom: Any): Int {
    // Simplified calculation
    return try {
        val level = kingdom.asDynamic().level
        val levelInt = when {
            level == null || level == undefined -> 1
            else -> (level as? Int) ?: level.toString().toIntOrNull() ?: 1
        }
        50 + levelInt * 10
    } catch (e: Exception) {
        console.error("Error calculating income:", e)
        60 // Default income
    }
}

fun getCurrentTurn(): Int = 1

fun getCurrentMonth(): String = "Pharast"
