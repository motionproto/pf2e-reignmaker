package kingdom.lite.ui.components

import org.w3c.dom.HTMLElement
import org.w3c.dom.HTMLInputElement
import org.w3c.dom.HTMLSelectElement
import kotlinx.browser.window
import kingdom.lite.api.getKingmakerRealmData
import kingdom.lite.api.isKingmakerInstalled
import kingdom.lite.model.KingdomState
import kingdom.lite.model.TurnManager

/**
 * Kingdom Statistics sidebar component
 * Displays the core kingdom statistics including Fame, Unrest, Gold, Resources, etc.
 */
object KingdomStats {
    // Store kingdom name (in real app, this would be stored in a proper state management system)
    private var kingdomName = "Kingdom Name"
    
    fun render(): String = buildString {
        // Get current realm data from Kingmaker module
        val realmData = if (isKingmakerInstalled()) getKingmakerRealmData() else null
        
        append("""
            <div class="kingdom-stats-container">
                <div class="kingdom-name-header" style="
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 8px 12px;
                    background-color: var(--color-dark-bg-alt);
                    border-bottom: none;
                ">
                    <h3 id="kingdom-name-text" style="
                        margin: 0;
                        color: var(--color-text-on-accent);
                        flex: 1;
                        display: block;
                        font-size: 24px;
                        text-decoration: none;
                        font-family: 'Eczar', serif;
                    ">$kingdomName</h3>
                    <input id="kingdom-name-input" type="text" value="$kingdomName" style="
                        flex: 1;
                        font-size: 24px;
                        font-weight: bold;
                        background-color: transparent;
                        border: none;
                        outline: 1px solid var(--color-text-on-accent);
                        color: var(--color-text-on-accent);
                        padding: 4px 8px;
                        border-radius: 4px;
                        display: none;
                        text-decoration: none;
                        font-family: 'Eczar', serif;
                    ">
                    <span id="kingdom-edit-btn" style="
                        cursor: pointer;
                        padding: 4px;
                        border-radius: 4px;
                        display: flex;
                        align-items: center;
                        transition: background-color 0.2s;
                        font-size: 16px;
                    " title="Edit kingdom name">
                        <i class="fa-solid fa-pen-fancy"></i>
                    </span>
                </div>
                <div class="kingdom-stats-scrollable">
                    <div class="kingdom-stats-content">
                        ${renderCoreTrackers()}
                        ${renderUnrest()}
                        ${renderKingdomSize()}
                        ${renderResources()}
                        ${renderQuickSummary()}
                    </div>
                </div>
            </div>
        """)
    }
    
    private fun renderCoreTrackers(): String {
        // Get the current kingdom state if available
        val kingdomState = window.asDynamic().currentKingdomState as? KingdomState
        val turnManager = window.asDynamic().currentTurnManager as? TurnManager
        
        val fame = kingdomState?.fame ?: 0
        val gold = kingdomState?.resources?.get("gold") ?: 0
        val currentTurn = kingdomState?.currentTurn ?: 1
        val isAtWar = kingdomState?.isAtWar ?: loadWarStatus()
        
        return """
            <div class="stat-group" style="border-top: none; margin-top: 0;">
                <div>
                    <div class="stat-item">
                        <label>Turn:</label>
                        <span class="stat-value">$currentTurn</span>
                    </div>
                <div class="stat-item">
                    <label>Fame:</label>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <button id="fame-decrease-btn" class="stat-adjust-button" title="Decrease Fame">
                            <i class="fas fa-minus"></i>
                        </button>
                        <span class="stat-value" id="kingdom-fame-value" style="min-width: 30px; text-align: center;">$fame</span>
                        <button id="fame-increase-btn" class="stat-adjust-button" title="Increase Fame">
                            <i class="fas fa-plus"></i>
                        </button>
                    </div>
                </div>
                <div class="stat-item">
                    <label>Gold:</label>
                    <span class="stat-value" id="kingdom-gold-value">$gold</span>
                </div>
                <div class="stat-item">
                    <label>Event DC:</label>
                    <span class="stat-value">14</span>
                </div>
                <div class="stat-item">
                    <label>War Status:</label>
                    <select id="war-status-select" class="kingdom-select">
                        <option value="peace" ${if (!isAtWar) "selected" else ""}>Peace</option>
                        <option value="war" ${if (isAtWar) "selected" else ""}>War</option>
                    </select>
                </div>
                </div>
            </div>
        """
    }
    
    private fun renderUnrest(): String {
        val kingdomState = window.asDynamic().currentKingdomState as? KingdomState
        val currentUnrest = kingdomState?.unrest ?: 0
        val isAtWar = kingdomState?.isAtWar ?: loadWarStatus()
        
        val realmData = if (isKingmakerInstalled()) getKingmakerRealmData() else null
        
        // Use kingdom state size if available, otherwise use realm data
        val hexes = kingdomState?.size ?: realmData?.size ?: 0
        
        // Calculate territory-based unrest
        val sizeUnrest = when {
            hexes >= 32 -> 4
            hexes >= 24 -> 3
            hexes >= 16 -> 2
            hexes >= 8 -> 1
            else -> 0
        }
        
        // War unrest
        val warUnrest = if (isAtWar) 1 else 0
        
        // Structure bonus (reduction) - currently 0 since we don't have structures yet
        // TODO: Calculate from actual structures when available
        val structureBonus = 0
        
        // Net unrest per turn 
        val unrestPerTurn = sizeUnrest + warUnrest - structureBonus
        
        return """
            <div class="stat-group">
                <h4 class="stat-group-header">Unrest</h4>
                <div>
                    <div class="stat-item">
                    <label>Current Unrest:</label>
                    <span class="stat-value" id="kingdom-unrest-value">$currentUnrest</span>
                </div>
                <div class="stat-item">
                    <label>From Size:</label>
                    <span class="stat-value" id="unrest-from-size">+$sizeUnrest</span>
                </div>
                ${if (isAtWar) {
                    """<div class="stat-item">
                        <label>From War:</label>
                        <span class="stat-value" style="color: #ff6b6b;">+$warUnrest</span>
                    </div>"""
                } else ""}
                <div class="stat-item">
                    <label>Structure Bonus:</label>
                    <span class="stat-value">-$structureBonus</span>
                </div>
                <div class="stat-item">
                    <label>Per Turn:</label>
                    <span class="stat-value" id="unrest-per-turn" style="${if (unrestPerTurn > 0) "color: #ff6b6b;" else if (unrestPerTurn < 0) "color: #51cf66;" else ""}">
                        ${if (unrestPerTurn >= 0) "+$unrestPerTurn" else "$unrestPerTurn"}
                    </span>
                </div>
                </div>
            </div>
        """
    }
    
    private fun renderKingdomSize(): String {
        val realmData = if (isKingmakerInstalled()) getKingmakerRealmData() else null
        
        return """
            <div class="stat-group">
                <h4 class="stat-group-header">Kingdom Size</h4>
                <div>
                    <div class="stat-item">
                    <label>Hexes Claimed:</label>
                    <span class="stat-value">${realmData?.size ?: 0}</span>
                </div>
                <div class="stat-item">
                    <label>Settlements:</label>
                    <span class="stat-value">${realmData?.settlements?.total ?: 0}</span>
                </div>
                <div class="stat-item">
                    <label>Metropolises:</label>
                    <span class="stat-value">${realmData?.settlements?.metropolises ?: 0}</span>
                </div>
                </div>
            </div>
        """
    }
    
    private fun renderResources(): String {
        val kingdomState = window.asDynamic().currentKingdomState as? KingdomState
        val realmData = if (isKingmakerInstalled()) getKingmakerRealmData() else null
        val worksites = realmData?.worksites
        
        // Get resources from kingdom state if available
        val currentFood = kingdomState?.resources?.get("food") ?: 0
        val currentLumber = kingdomState?.resources?.get("lumber") ?: 0
        val currentStone = kingdomState?.resources?.get("stone") ?: 0
        val currentOre = kingdomState?.resources?.get("ore") ?: 0
        
        // Calculate food production from worksites
        // Plains farmlands produce 2 food, hills/swamp produce 1
        // For now we'll assume all are plains (2 per farm) since we don't have terrain data yet
        val farmlands = worksites?.farmlands?.quantity ?: 0
        val foodProduction = farmlands * 2  // Default to plains production
        
        val lumberProduction = worksites?.lumberCamps?.resources ?: 0  
        val stoneProduction = worksites?.quarries?.resources ?: 0
        val oreProduction = worksites?.mines?.resources ?: 0
        
        return """
            <div class="stat-group">
                <h4 class="stat-group-header">Resources</h4>
                <div class="resource-section">
                    <div class="resource-header">Food</div>
                    <div class="stat-item">
                        <label>Current:</label>
                        <span class="stat-value" id="kingdom-food-value">$currentFood</span>
                    </div>
                    <div class="stat-item">
                        <label>Farmlands:</label>
                        <span class="stat-value">$farmlands</span>
                    </div>
                    <div class="stat-item">
                        <label>Production:</label>
                        <span class="stat-value">$foodProduction/turn</span>
                    </div>
                </div>
                <div class="resource-section">
                    <div class="resource-header">Resource Income</div>
                    <div class="resource-grid">
                        <div class="resource-item">
                            <label>Lumber:</label>
                            <span id="kingdom-lumber-value">$currentLumber</span>
                        </div>
                        <div class="resource-item">
                            <label>Stone:</label>
                            <span id="kingdom-stone-value">$currentStone</span>
                        </div>
                        <div class="resource-item">
                            <label>Ore:</label>
                            <span id="kingdom-ore-value">$currentOre</span>
                        </div>
                    </div>
                </div>
            </div>
        """
    }
    
    private fun renderQuickSummary(): String {
        val realmData = if (isKingmakerInstalled()) getKingmakerRealmData() else null
        val worksites = realmData?.worksites
        
        // Calculate total worksites (excluding luxury sources as they don't exist)
        val totalWorksites = (worksites?.farmlands?.quantity ?: 0) +
                           (worksites?.lumberCamps?.quantity ?: 0) +
                           (worksites?.mines?.quantity ?: 0) +
                           (worksites?.quarries?.quantity ?: 0)
        
        return """
            <div class="stat-group">
                <h4 class="stat-group-header">Quick Summary</h4>
                <div>
                    <div class="stat-item">
                    <label>Worksites:</label>
                    <span class="stat-value">$totalWorksites</span>
                </div>
                <div class="stat-item">
                    <label>Villages:</label>
                    <span class="stat-value">${realmData?.settlements?.villages ?: 0}</span>
                </div>
                <div class="stat-item">
                    <label>Towns:</label>
                    <span class="stat-value">${realmData?.settlements?.towns ?: 0}</span>
                </div>
                <div class="stat-item">
                    <label>Cities:</label>
                    <span class="stat-value">${realmData?.settlements?.cities ?: 0}</span>
                </div>
                <div class="stat-item">
                    <label>Metropolises:</label>
                    <span class="stat-value">${realmData?.settlements?.metropolises ?: 0}</span>
                </div>
                </div>
            </div>
        """
    }
    
    fun attachListeners(container: HTMLElement) {
        // Kingdom name editing functionality
        val nameText = container.querySelector("#kingdom-name-text") as? HTMLElement
        val nameInput = container.querySelector("#kingdom-name-input") as? HTMLInputElement
        val editBtn = container.querySelector("#kingdom-edit-btn") as? HTMLElement
        
        editBtn?.onclick = {
            // Switch to edit mode
            nameText?.style?.display = "none"
            nameInput?.style?.display = "block"
            editBtn.style.display = "none"
            
            // Focus and select the input
            nameInput?.focus()
            nameInput?.select()
        }
        
        // Add hover effect for edit button
        editBtn?.onmouseenter = {
            editBtn.style.backgroundColor = "rgba(255, 255, 255, 0.1)"
        }
        editBtn?.onmouseleave = {
            editBtn.style.backgroundColor = "transparent"
        }
        
        // Save on Enter key or blur
        nameInput?.onkeydown = { event ->
            val keyEvent = event.asDynamic()
            when (keyEvent.key) {
                "Enter" -> {
                    saveKingdomName(nameText, nameInput, editBtn)
                    event.preventDefault()
                }
                "Escape" -> {
                    // Cancel editing and restore original value
                    nameInput.value = kingdomName
                    switchToViewMode(nameText, nameInput, editBtn)
                    event.preventDefault()
                }
            }
        }
        
        nameInput?.onblur = {
            saveKingdomName(nameText, nameInput, editBtn)
        }
        
        // Fame adjustment button handlers
        val fameDecreaseBtn = container.querySelector("#fame-decrease-btn") as? HTMLElement
        val fameIncreaseBtn = container.querySelector("#fame-increase-btn") as? HTMLElement
        val fameValue = container.querySelector("#kingdom-fame-value") as? HTMLElement
        
        // Function to update button states
        fun updateFameButtonStates() {
            val kingdomState = window.asDynamic().currentKingdomState as? KingdomState
            if (kingdomState != null) {
                // Disable decrease button at 0
                if (kingdomState.fame <= 0) {
                    fameDecreaseBtn?.setAttribute("disabled", "true")
                    fameDecreaseBtn?.style?.opacity = "0.5"
                    fameDecreaseBtn?.style?.cursor = "not-allowed"
                } else {
                    fameDecreaseBtn?.removeAttribute("disabled")
                    fameDecreaseBtn?.style?.opacity = "1"
                    fameDecreaseBtn?.style?.cursor = "pointer"
                }
                
                // Disable increase button at 3
                if (kingdomState.fame >= 3) {
                    fameIncreaseBtn?.setAttribute("disabled", "true")
                    fameIncreaseBtn?.style?.opacity = "0.5"
                    fameIncreaseBtn?.style?.cursor = "not-allowed"
                } else {
                    fameIncreaseBtn?.removeAttribute("disabled")
                    fameIncreaseBtn?.style?.opacity = "1"
                    fameIncreaseBtn?.style?.cursor = "pointer"
                }
            }
        }
        
        // Initial button state update
        updateFameButtonStates()
        
        fameDecreaseBtn?.onclick = {
            val kingdomState = window.asDynamic().currentKingdomState as? KingdomState
            if (kingdomState != null && kingdomState.fame > 0) {
                kingdomState.fame--
                fameValue?.textContent = kingdomState.fame.toString()
                
                // Update button states
                updateFameButtonStates()
                
                // Update the turn controller display (including phases)
                val updateCallback = window.asDynamic().updateKingdomStats
                if (updateCallback != null) {
                    updateCallback()
                }
                
                // Also update the phase content if it's showing Status Phase
                updatePhaseContent()
            }
        }
        
        fameIncreaseBtn?.onclick = {
            val kingdomState = window.asDynamic().currentKingdomState as? KingdomState
            if (kingdomState != null && kingdomState.fame < 3) {  // Max fame is 3
                kingdomState.fame++
                fameValue?.textContent = kingdomState.fame.toString()
                
                // Update button states
                updateFameButtonStates()
                
                // Update the turn controller display (including phases)
                val updateCallback = window.asDynamic().updateKingdomStats
                if (updateCallback != null) {
                    updateCallback()
                }
                
                // Also update the phase content if it's showing Status Phase
                updatePhaseContent()
            }
        }
        
        // War status dropdown handler
        val warStatusSelect = container.querySelector("#war-status-select") as? HTMLSelectElement
        warStatusSelect?.onchange = {
            val kingdomState = window.asDynamic().currentKingdomState as? KingdomState
            if (kingdomState != null) {
                val isAtWar = warStatusSelect.value == "war"
                kingdomState.isAtWar = isAtWar
                
                // Save to localStorage
                saveWarStatus(isAtWar)
                
                // Update the unrest display to reflect war status change
                val statsContainer = container.querySelector(".kingdom-stats-content") as? HTMLElement
                if (statsContainer != null) {
                    // Re-render the unrest section
                    val unrestSection = statsContainer.querySelector(".stat-group:nth-of-type(2)") as? HTMLElement
                    if (unrestSection != null) {
                        unrestSection.outerHTML = renderUnrest()
                    }
                }
                
                // Trigger any update callbacks
                val updateCallback = window.asDynamic().updateKingdomStats
                if (updateCallback != null) {
                    updateCallback()
                }
            }
        }
    }
    
    private fun saveKingdomName(
        nameText: HTMLElement?, 
        nameInput: HTMLInputElement?, 
        editBtn: HTMLElement?
    ) {
        nameInput?.value?.let { newName ->
            if (newName.isNotBlank()) {
                kingdomName = newName
                nameText?.textContent = kingdomName
                
                // Store in browser's localStorage for persistence
                window.localStorage.setItem("kingdomName", kingdomName)
            }
        }
        switchToViewMode(nameText, nameInput, editBtn)
    }
    
    private fun switchToViewMode(
        nameText: HTMLElement?,
        nameInput: HTMLInputElement?,
        editBtn: HTMLElement?
    ) {
        nameText?.style?.display = "block"
        nameInput?.style?.display = "none"
        editBtn?.style?.display = "flex"
    }
    
    private fun saveWarStatus(isAtWar: Boolean) {
        window.localStorage.setItem("kingdomWarStatus", if (isAtWar) "war" else "peace")
    }
    
    private fun loadWarStatus(): Boolean {
        return window.localStorage.getItem("kingdomWarStatus") == "war"
    }
    
    private fun updatePhaseContent() {
        // Update the phase content area if it exists
        val phaseContentArea = kotlinx.browser.document.querySelector(".phase-content-scrollable")
        if (phaseContentArea != null) {
            val kingdomState = window.asDynamic().currentKingdomState as? KingdomState
            val turnManager = window.asDynamic().currentTurnManager as? TurnManager
            
            // Check if we're in Status Phase (Phase I)
            if (kingdomState?.currentPhase == kingdom.lite.model.TurnPhase.PHASE_I) {
                // Re-render the Status Phase content
                val statusPhase = kingdom.lite.ui.turn.StatusPhase(kingdomState, turnManager ?: return)
                phaseContentArea.innerHTML = statusPhase.render()
            }
        }
        
        // Also update the resource summary in the turn header
        val resourceSummary = kotlinx.browser.document.querySelector(".resource-summary")
        if (resourceSummary != null) {
            val kingdomState = window.asDynamic().currentKingdomState as? KingdomState
            if (kingdomState != null) {
                val fameSpan = resourceSummary.querySelector(".resource-item:first-child")
                if (fameSpan != null) {
                    fameSpan.innerHTML = """<i class="fas fa-star"></i> Fame: ${kingdomState.fame}"""
                }
            }
        }
    }
    
    init {
        // Load saved kingdom name from localStorage if available
        window.localStorage.getItem("kingdomName")?.let { savedName ->
            if (savedName.isNotBlank()) {
                kingdomName = savedName
            }
        }
        
        // Load saved war status and apply to kingdom state when initialized
        val savedWarStatus = loadWarStatus()
        window.asDynamic().savedWarStatus = savedWarStatus
    }
}
