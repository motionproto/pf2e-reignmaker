package kingdom.lite.ui

import kingdom.lite.fresh.KingdomManager
import kotlinx.browser.window
import kotlin.js.json

/**
 * Creates the Kingdom Management dialog with updated layout
 */
fun createKingdomDialogV2(actorId: String): String {
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
                
                <!-- Left Section: Kingdom Character Sheet (40% width) -->
                <div class="kingdom-sheet" style="flex: 4; overflow-y: auto; padding-right: 15px; border-right: 1px solid #dee2e6;">
                    <h3 style="margin-top: 0;">Kingdom Status</h3>
                    
                    <!-- Compact Stats -->
                    <div class="stat-group">
                        <h4>Territory</h4>
                        <div class="stat-grid-compact">
                            <div><strong>Hexes:</strong> ${hexesControlled}</div>
                            <div><strong>Work Sites:</strong> ${workSites}</div>
                            <div><strong>Settlements:</strong> ${kingdom.settlements.size}</div>
                            <div><strong>Capital:</strong> ${kingdom.settlements.firstOrNull()?.name ?: "None"}</div>
                        </div>
                    </div>
                    
                    <div class="stat-group">
                        <h4>Resources</h4>
                        <div class="stat-grid-compact">
                            <div><strong>Gold:</strong> ${kingdom.gold} gp</div>
                            <div><strong>Food:</strong> ${kingdom.resources.food}</div>
                            <div><strong>Lumber:</strong> ${kingdom.resources.lumber}</div>
                            <div><strong>Stone:</strong> ${kingdom.resources.stone}</div>
                            <div><strong>Ore:</strong> ${kingdom.resources.ore}</div>
                        </div>
                    </div>
                    
                    <div class="stat-group">
                        <h4>Kingdom Health</h4>
                        <div class="stat-grid-compact">
                            <div><strong>Unrest:</strong> <span style="color: ${getUnrestColor(kingdom.unrest)}">${kingdom.unrest}</span></div>
                            <div><strong>Stability:</strong> ${getStabilityStatus(kingdom.unrest)}</div>
                            <div><strong>Fame Points:</strong> ${kingdom.fame}</div>
                        </div>
                    </div>
                    
                    <div class="stat-group">
                        <h4>Active Events</h4>
                        <div style="color: #666; font-style: italic;">No active events</div>
                    </div>
                </div>
                
                <!-- Right Section: Turn Phases & Actions (60% width) -->
                <div class="turn-order" style="flex: 6; overflow-y: auto;">
                    <h3 style="margin-top: 0;">Kingdom Turn Phases</h3>
                    
                    <!-- Turn Phase Progress -->
                    <div class="phase-progress" style="margin-bottom: 20px;">
                        <div style="display: flex; gap: 10px; align-items: center;">
                            <div class="phase-step active">1. Gain Fame</div>
                            <div class="phase-step">2. Check Incidents</div>
                            <div class="phase-step">3. Check Events</div>
                            <div class="phase-step">4. Resources</div>
                            <div class="phase-step">5. Actions</div>
                            <div class="phase-step">6. End Turn</div>
                        </div>
                    </div>
                    
                    <!-- Kingdom Actions Section -->
                    <div class="actions-section">
                        <h4 style="margin-bottom: 10px;">Kingdom Actions (4 PCs = 4 Actions)</h4>
                        <div style="font-size: 0.85em; color: #666; margin-bottom: 15px;">
                            Each PC performs one action per turn. Actions from the Capital gain +1 bonus.
                        </div>
                        
                        <!-- Action Categories as Collapsible Sections -->
                        
                        <!-- Uphold Stability -->
                        <div class="action-category">
                            <div class="action-header" onclick="this.parentElement.classList.toggle('expanded')">
                                <i class="fa-solid fa-chevron-right"></i>
                                <strong>Uphold Stability</strong>
                                <span style="font-size: 0.85em; color: #666;">- Maintain cohesion and quell unrest</span>
                            </div>
                            <div class="action-content">
                                ${createActionItem("Coordinated Effort", "Partnership action: Two PCs combine on one action (+1 bonus, take highest)", "Once per turn")}
                                ${createActionItem("Deal with Unrest", "Reduce unrest by 1-3 based on success (Performance, Religion, Intimidation, Diplomacy, etc.)", "")}
                                ${createActionItem("Arrest Dissidents", "Convert unrest to imprisoned unrest (requires Justice structure)", "Intimidation/Society/Stealth")}
                                ${createActionItem("Execute or Pardon", "Deal with imprisoned unrest through justice system", "Requires prisoners")}
                                ${createActionItem("Resolve Kingdom Event", "Address ongoing disasters, uprisings, or opportunities", "Varies by event")}
                            </div>
                        </div>
                        
                        <!-- Military Operations -->
                        <div class="action-category">
                            <div class="action-header" onclick="this.parentElement.classList.toggle('expanded')">
                                <i class="fa-solid fa-chevron-right"></i>
                                <strong>Military Operations</strong>
                                <span style="font-size: 0.85em; color: #666;">- Manage armies and warfare</span>
                            </div>
                            <div class="action-content">
                                ${createActionItem("Recruit Unit", "Rally citizens to form new military units", "Diplomacy/Intimidation")}
                                ${createActionItem("Outfit Army", "Equip troops with armor, weapons, runes, or equipment", "Crafting/Society")}
                                ${createActionItem("Deploy Army", "Move military forces across territory", "Nature/Survival/Athletics")}
                                ${createActionItem("Train Army", "Improve unit levels up to party level", "Intimidation/Athletics")}
                                ${createActionItem("Recover Army", "Heal and restore damaged units", "Medicine/Performance")}
                                ${createActionItem("Disband Army", "Decommission troops and return soldiers home", "Diplomacy/Society")}
                            </div>
                        </div>
                        
                        <!-- Expand Borders -->
                        <div class="action-category">
                            <div class="action-header" onclick="this.parentElement.classList.toggle('expanded')">
                                <i class="fa-solid fa-chevron-right"></i>
                                <strong>Expand Borders</strong>
                                <span style="font-size: 0.85em; color: #666;">- Grow territory and infrastructure</span>
                            </div>
                            <div class="action-content">
                                ${createActionItem("Claim Hexes", "Assert sovereignty over new territories (1-3 hexes based on proficiency)", "Nature/Survival")}
                                ${createActionItem("Build Roads", "Connect settlements to improve trade and movement", "Crafting/Survival")}
                                ${createActionItem("Send Scouts", "Gather intelligence about neighboring territories", "Stealth/Survival")}
                                ${createActionItem("Fortify Hex", "Build defensive structures (+1 AC, +2 initiative for defenders)", "Crafting/Athletics")}
                                ${createActionItem("Create Worksite", "Establish farms, mines, quarries, or lumber camps", "Crafting/Nature")}
                            </div>
                        </div>
                        
                        <!-- Urban Planning -->
                        <div class="action-category">
                            <div class="action-header" onclick="this.parentElement.classList.toggle('expanded')">
                                <i class="fa-solid fa-chevron-right"></i>
                                <strong>Urban Planning</strong>
                                <span style="font-size: 0.85em; color: #666;">- Build and develop settlements</span>
                            </div>
                            <div class="action-content">
                                ${createActionItem("Establish Settlement", "Found a new village in controlled territory", "Society/Survival")}
                                ${createActionItem("Upgrade Settlement", "Advance settlement tier (requires level + structures)", "Crafting/Society")}
                                ${createActionItem("Build Structure", "Construct buildings within settlements", "Crafting/Society")}
                                ${createActionItem("Repair Structure", "Restore damaged buildings to functionality", "Crafting/Athletics")}
                            </div>
                        </div>
                        
                        <!-- Foreign Affairs -->
                        <div class="action-category">
                            <div class="action-header" onclick="this.parentElement.classList.toggle('expanded')">
                                <i class="fa-solid fa-chevron-right"></i>
                                <strong>Foreign Affairs</strong>
                                <span style="font-size: 0.85em; color: #666;">- Diplomacy and espionage</span>
                            </div>
                            <div class="action-content">
                                ${createActionItem("Diplomatic Relations", "Open formal channels with neighboring powers", "Diplomacy/Society")}
                                ${createActionItem("Request Economic Aid", "Appeal to allies for resources or gold", "Diplomacy/Society")}
                                ${createActionItem("Request Military Aid", "Call upon allies for troops in conflicts", "Diplomacy/Intimidation")}
                                ${createActionItem("Infiltration", "Deploy spies to gather intelligence", "Deception/Stealth")}
                                ${createActionItem("Hire Adventurers", "Contract heroes to resolve events (costs 2 Gold)", "Diplomacy/Society")}
                            </div>
                        </div>
                        
                        <!-- Economic Actions -->
                        <div class="action-category">
                            <div class="action-header" onclick="this.parentElement.classList.toggle('expanded')">
                                <i class="fa-solid fa-chevron-right"></i>
                                <strong>Economic Actions</strong>
                                <span style="font-size: 0.85em; color: #666;">- Manage trade and resources</span>
                            </div>
                            <div class="action-content">
                                ${createActionItem("Sell Surplus", "Trade 2 resources for 1 gold (crit: 2 for 2)", "Society/Diplomacy")}
                                ${createActionItem("Purchase Resources", "Spend 2 gold for 1 resource", "Society/Diplomacy")}
                                ${createActionItem("Collect Resources", "Harvest from hexes with or without worksites", "Nature/Survival")}
                                ${createActionItem("Collect Stipend", "Draw personal funds from treasury (requires Counting House)", "Society/Intimidation")}
                            </div>
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
                margin-bottom: 12px;
            }
            
            .stat-group h4 {
                margin: 8px 0 6px 0;
                color: #495057;
                font-size: 1em;
                border-bottom: 1px solid #dee2e6;
                padding-bottom: 3px;
            }
            
            .stat-grid-compact {
                display: grid;
                grid-template-columns: 1fr;
                gap: 2px;
                font-size: 0.9em;
            }
            
            .phase-progress {
                padding: 10px;
                background: #f8f9fa;
                border-radius: 5px;
            }
            
            .phase-step {
                padding: 5px 10px;
                background: #e9ecef;
                border-radius: 3px;
                font-size: 0.85em;
                white-space: nowrap;
            }
            
            .phase-step.active {
                background: #007bff;
                color: white;
                font-weight: 600;
            }
            
            .action-category {
                margin-bottom: 5px;
                border: 1px solid #dee2e6;
                border-radius: 5px;
            }
            
            .action-header {
                padding: 10px;
                background: #f8f9fa;
                cursor: pointer;
                display: flex;
                align-items: center;
                gap: 8px;
                transition: background 0.2s;
            }
            
            .action-header:hover {
                background: #e9ecef;
            }
            
            .action-header i {
                transition: transform 0.2s;
                font-size: 0.8em;
            }
            
            .action-category.expanded .action-header i {
                transform: rotate(90deg);
            }
            
            .action-content {
                display: none;
                padding: 10px;
                background: white;
            }
            
            .action-category.expanded .action-content {
                display: block;
            }
            
            .action-item {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                padding: 8px;
                margin-bottom: 5px;
                background: #f8f9fa;
                border-radius: 3px;
            }
            
            .action-item:hover {
                background: #e9ecef;
            }
            
            .action-details {
                flex: 1;
            }
            
            .action-name {
                font-weight: 600;
                margin-bottom: 2px;
            }
            
            .action-desc {
                font-size: 0.85em;
                color: #666;
                margin-bottom: 2px;
            }
            
            .action-skills {
                font-size: 0.8em;
                color: #888;
                font-style: italic;
            }
            
            .perform-button {
                padding: 4px 12px;
                background: #28a745;
                color: white;
                border: none;
                border-radius: 3px;
                cursor: pointer;
                font-size: 0.85em;
                white-space: nowrap;
                transition: background 0.2s;
            }
            
            .perform-button:hover {
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
                
                .phase-progress {
                    overflow-x: auto;
                }
                
                .phase-step {
                    font-size: 0.75em;
                    padding: 3px 6px;
                }
            }
        </style>
    """.trimIndent()
}

// Helper function to create action item HTML
fun createActionItem(name: String, description: String, skills: String): String {
    return """
        <div class="action-item">
            <div class="action-details">
                <div class="action-name">$name</div>
                <div class="action-desc">$description</div>
                ${if (skills.isNotEmpty()) "<div class=\"action-skills\">$skills</div>" else ""}
            </div>
            <button class="perform-button">Perform</button>
        </div>
    """
}

// Helper function to get current phase for V2 dialog
fun getCurrentPhaseV2(kingdom: Any): String {
    // This would be determined by actual game state
    return "Actions"
}
