package kingdom.lite.ui

import kingdom.lite.fresh.KingdomManager
import kotlinx.browser.window
import kotlin.js.json

/**
 * Creates the Kingdom Management dialog with full layout
 */
fun createKingdomDialogRevised(actorId: String): String {
    // Get kingdom data from the manager
    val manager = KingdomManager()
    val kingdom = manager.getKingdom()
    
    // Calculate some derived values
    val hexesControlled = 12 // This would come from the actual hex data
    val workSites = kingdom.settlements.sumOf { 
        it.structures.count { struct -> struct == "worksite" } 
    }
    
    return """
        <div class="kingdom-management-dialog" style="display: flex; flex-direction: column; height: 100%; width: 100%;">
            
            <!-- Top Section: Info and Tab Interface -->
            <div class="kingdom-header" style="background: #f8f9fa; border-bottom: 2px solid #dee2e6;">
                <!-- Kingdom Title Bar -->
                <div style="padding: 10px 15px; display: flex; justify-content: space-between; align-items: center;">
                    <h2 style="margin: 0; font-size: 1.5em;">
                        <i class="fa-solid fa-chess-rook"></i> 
                        ${kingdom.name}
                    </h2>
                    <div style="display: flex; gap: 20px; font-size: 0.9em;">
                        <span><strong>Level:</strong> ${kingdom.level}</span>
                        <span><strong>XP:</strong> ${kingdom.xp}/${getXPThreshold(kingdom.level)}</span>
                        <span><strong>Fame:</strong> ${kingdom.fame}</span>
                        <span><strong>Turn:</strong> ${kingdom.currentTurn}</span>
                    </div>
                </div>
                
                <!-- Horizontal Tabs -->
                <div class="kingdom-tabs" style="display: flex; padding: 0 15px; gap: 2px;">
                    <button class="tab-button active" data-tab="overview">Overview</button>
                    <button class="tab-button" data-tab="settlements">Settlements</button>
                    <button class="tab-button" data-tab="leaders">Leaders</button>
                    <button class="tab-button" data-tab="events">Events</button>
                    <button class="tab-button" data-tab="notes">Notes</button>
                </div>
            </div>
            
            <!-- Main Content Area -->
            <div class="kingdom-content" style="display: flex; flex: 1; overflow: hidden; padding: 15px; gap: 15px;">
                
                <!-- Left Section: Kingdom Character Sheet (60% width) -->
                <div class="kingdom-sheet" style="flex: 6; overflow-y: auto; padding-right: 15px; border-right: 1px solid #dee2e6;">
                    <h3 style="margin-top: 0;">Kingdom Status</h3>
                    
                    <!-- Two Column Layout for Stats -->
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                        
                        <!-- Territory & Settlements Column -->
                        <div>
                            <div class="stat-group">
                                <h4>Territory</h4>
                                <div class="stat-grid">
                                    <div><strong>Hexes:</strong> ${hexesControlled}</div>
                                    <div><strong>Work Sites:</strong> ${workSites}</div>
                                    <div><strong>Settlements:</strong> ${kingdom.settlements.size}</div>
                                    <div><strong>Capital:</strong> ${kingdom.settlements.firstOrNull()?.name ?: "None"}</div>
                                </div>
                            </div>
                            
                            <div class="stat-group">
                                <h4>Resources</h4>
                                <div class="stat-grid">
                                    <div><strong>Gold:</strong> ${kingdom.gold} gp</div>
                                    <div><strong>Food:</strong> ${kingdom.resources.food}</div>
                                    <div><strong>Lumber:</strong> ${kingdom.resources.lumber}</div>
                                    <div><strong>Stone:</strong> ${kingdom.resources.stone}</div>
                                    <div><strong>Ore:</strong> ${kingdom.resources.ore}</div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Kingdom Health & Abilities Column -->
                        <div>
                            <div class="stat-group">
                                <h4>Kingdom Health</h4>
                                <div class="stat-grid">
                                    <div><strong>Unrest:</strong> <span style="color: ${getUnrestColor(kingdom.unrest)}">${kingdom.unrest}</span></div>
                                    <div><strong>Stability:</strong> ${getStabilityStatus(kingdom.unrest)}</div>
                                    <div><strong>Consumption:</strong> ${calculateConsumption(kingdom)} food/turn</div>
                                    <div><strong>Income:</strong> +${calculateIncome(kingdom)} gp/turn</div>
                                </div>
                            </div>
                            
                            <div class="stat-group">
                                <h4>Ability Scores</h4>
                                <div class="stat-grid">
                                    <div><strong>Culture:</strong> +0</div>
                                    <div><strong>Economy:</strong> +0</div>
                                    <div><strong>Loyalty:</strong> +0</div>
                                    <div><strong>Stability:</strong> +0</div>
                                    <div><strong>Strife:</strong> +0</div>
                                    <div><strong>Warfare:</strong> +0</div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Active Events -->
                    <div class="stat-group" style="margin-top: 20px;">
                        <h4>Active Events (${kingdom.activeEvents.size})</h4>
                        <div style="color: #666; font-style: italic;">No active events</div>
                    </div>
                </div>
                
                <!-- Right Section: Turn Order (40% width) -->
                <div class="turn-order" style="flex: 4; overflow-y: auto;">
                    <h3 style="margin-top: 0;">Turn Order</h3>
                    
                    <!-- Current Phase Indicator -->
                    <div class="phase-indicator">
                        <strong>Current Phase:</strong> ${getCurrentPhase(kingdom)}
                        <div style="font-size: 0.9em; color: #666; margin-top: 5px;">
                            Turn ${kingdom.currentTurn} - ${getCurrentMonth()}
                        </div>
                    </div>
                    
                    <!-- Turn Phases from our actual data -->
                    <div class="phase-sections">
                        <!-- Upkeep Phase -->
                        <div class="phase-section active">
                            <h4><i class="fa-solid fa-gear"></i> Upkeep</h4>
                            <div class="phase-content">
                                <label><input type="checkbox"> Add unrest from events</label><br>
                                <label><input type="checkbox"> Resolve ongoing events</label><br>
                                <label><input type="checkbox"> Check for new events</label><br>
                                <label><input type="checkbox"> Collect resources & taxes</label>
                            </div>
                        </div>
                        
                        <!-- Leadership Phase -->
                        <div class="phase-section">
                            <h4><i class="fa-solid fa-crown"></i> Leadership (2 Activities)</h4>
                            <div class="phase-content">
                                <div style="margin-bottom: 10px;">
                                    <label>Activity 1:</label>
                                    <select style="width: 100%;">
                                        <option>Choose an activity...</option>
                                        <option>Build Roads</option>
                                        <option>Build Structure</option>
                                        <option>Claim Hexes</option>
                                        <option>Collect Resources</option>
                                        <option>Create Worksite</option>
                                        <option>Deal with Unrest</option>
                                        <option>Establish Settlement</option>
                                        <option>Fortify Hex</option>
                                        <option>Repair Structure</option>
                                    </select>
                                </div>
                                <div>
                                    <label>Activity 2:</label>
                                    <select style="width: 100%;">
                                        <option>Choose an activity...</option>
                                        <option>Build Roads</option>
                                        <option>Build Structure</option>
                                        <option>Claim Hexes</option>
                                        <option>Collect Resources</option>
                                        <option>Create Worksite</option>
                                        <option>Deal with Unrest</option>
                                        <option>Establish Settlement</option>
                                        <option>Fortify Hex</option>
                                        <option>Repair Structure</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Region Phase -->
                        <div class="phase-section">
                            <h4><i class="fa-solid fa-map"></i> Region</h4>
                            <div class="phase-content">
                                <label><input type="checkbox"> Check for leadership change</label><br>
                                <label><input type="checkbox"> Adjust unrest</label><br>
                                <label><input type="checkbox"> Resource decay</label>
                            </div>
                        </div>
                        
                        <!-- Civic Phase -->
                        <div class="phase-section">
                            <h4><i class="fa-solid fa-scroll"></i> Civic (3 Activities)</h4>
                            <div class="phase-content">
                                <button style="width: 100%; margin: 2px 0;">Quell Unrest</button>
                                <button style="width: 100%; margin: 2px 0;">Build Infrastructure</button>
                                <button style="width: 100%; margin: 2px 0;">Celebrate Holiday</button>
                            </div>
                        </div>
                        
                        <!-- End Turn -->
                        <div class="phase-section" style="margin-top: 20px;">
                            <button class="end-turn-button">
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
            
            .kingdom-tabs {
                background: transparent;
            }
            
            .tab-button {
                background: #e9ecef;
                border: 1px solid #dee2e6;
                border-bottom: none;
                border-radius: 5px 5px 0 0;
                cursor: pointer;
                padding: 8px 20px;
                font-size: 0.9em;
                transition: all 0.2s;
            }
            
            .tab-button.active {
                background: white;
                font-weight: 600;
                border-bottom: 2px solid white;
                position: relative;
                z-index: 1;
                margin-bottom: -2px;
            }
            
            .tab-button:hover:not(.active) {
                background: #f8f9fa;
            }
            
            .stat-group {
                margin-bottom: 15px;
            }
            
            .stat-group h4 {
                margin: 10px 0 8px 0;
                color: #495057;
                font-size: 1.1em;
                border-bottom: 1px solid #dee2e6;
                padding-bottom: 5px;
            }
            
            .stat-grid {
                display: grid;
                grid-template-columns: 1fr;
                gap: 4px;
                font-size: 0.95em;
            }
            
            .phase-indicator {
                padding: 12px;
                background: #e8f4f8;
                border-radius: 5px;
                margin-bottom: 15px;
                border-left: 4px solid #007bff;
            }
            
            .phase-section {
                margin-bottom: 15px;
                border: 1px solid #dee2e6;
                border-radius: 5px;
                overflow: hidden;
            }
            
            .phase-section h4 {
                background: #f8f9fa;
                margin: 0;
                padding: 10px;
                font-size: 0.95em;
                border-bottom: 1px solid #dee2e6;
            }
            
            .phase-section.active h4 {
                background: #007bff;
                color: white;
            }
            
            .phase-content {
                padding: 10px;
                font-size: 0.9em;
            }
            
            .end-turn-button {
                width: 100%;
                padding: 12px;
                background: #28a745;
                color: white;
                border: none;
                border-radius: 5px;
                font-size: 1.1em;
                font-weight: 600;
                cursor: pointer;
                transition: background 0.2s;
            }
            
            .end-turn-button:hover {
                background: #218838;
            }
            
            /* Responsive adjustments */
            @media (max-width: 1024px) {
                .kingdom-content {
                    flex-direction: column;
                }
                
                .kingdom-sheet {
                    border-right: none;
                    border-bottom: 1px solid #dee2e6;
                    padding-right: 0;
                    padding-bottom: 15px;
                }
            }
        </style>
    """.trimIndent()
}

// Helper function to get current phase for revised dialog
fun getCurrentPhase(kingdom: Any): String {
    // This would be determined by actual game state
    return "Upkeep"
}
