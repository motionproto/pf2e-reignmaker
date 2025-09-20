package kingdom.lite.model

/**
 * Manages the turn state and progression through phases
 * Based on Reignmaker Lite rules
 */
class TurnManager(private val kingdomState: KingdomState) {
    
    // Callbacks for UI updates
    var onTurnChanged: ((Int) -> Unit)? = null
    var onPhaseChanged: ((TurnPhase) -> Unit)? = null
    var onTurnEnded: ((Int) -> Unit)? = null
    var onFameGained: ((Int) -> Unit)? = null
    var onUnrestChanged: ((Int) -> Unit)? = null
    
    /**
     * Start a new game/reset turns
     */
    fun startNewGame() {
        kingdomState.currentTurn = 1
        kingdomState.currentPhase = TurnPhase.PHASE_I
        kingdomState.unrest = 0
        kingdomState.fame = 0
        kingdomState.oncePerTurnActions.clear()
        onTurnChanged?.invoke(kingdomState.currentTurn)
        onPhaseChanged?.invoke(kingdomState.currentPhase)
    }
    
    /**
     * Execute the current phase
     */
    fun executeCurrentPhase() {
        when (kingdomState.currentPhase) {
            TurnPhase.PHASE_I -> executePhaseI()
            TurnPhase.PHASE_II -> executePhaseII()
            TurnPhase.PHASE_III -> executePhaseIII()
            TurnPhase.PHASE_IV -> executePhaseIV()
            TurnPhase.PHASE_V -> executePhaseV()
            TurnPhase.PHASE_VI -> executePhaseVI()
        }
    }
    
    /**
     * Progress to the next phase
     */
    fun nextPhase() {
        val next = kingdomState.currentPhase.next()
        if (next != null) {
            kingdomState.currentPhase = next
            onPhaseChanged?.invoke(kingdomState.currentPhase)
        } else {
            // End of turn reached
            endTurn()
        }
    }
    
    /**
     * Skip to a specific phase (for testing or special events)
     */
    fun skipToPhase(phase: TurnPhase) {
        kingdomState.currentPhase = phase
        onPhaseChanged?.invoke(kingdomState.currentPhase)
    }
    
    /**
     * End the current turn and start a new one
     */
    fun endTurn() {
        onTurnEnded?.invoke(kingdomState.currentTurn)
        kingdomState.currentTurn++
        kingdomState.currentPhase = TurnPhase.PHASE_I
        kingdomState.oncePerTurnActions.clear()
        
        // Decrement modifier durations
        kingdomState.ongoingModifiers.removeAll { modifier ->
            if (modifier.duration > 0) {
                modifier.remainingTurns--
                modifier.remainingTurns <= 0
            } else {
                false
            }
        }
        
        onTurnChanged?.invoke(kingdomState.currentTurn)
        onPhaseChanged?.invoke(kingdomState.currentPhase)
    }
    
    /**
     * Phase I: Kingdom Status
     * - Gain 1 Fame automatically (max 3)
     * - Apply ongoing modifiers
     */
    private fun executePhaseI() {
        // Gain 1 Fame at start of turn (max fame is 3)
        if (kingdomState.fame < 3) {
            val fameGained = 1
            kingdomState.fame = (kingdomState.fame + fameGained).coerceAtMost(3)
            onFameGained?.invoke(fameGained)
            console.log("Phase I: Gained $fameGained Fame (Total: ${kingdomState.fame})")
        } else {
            console.log("Phase I: Fame already at maximum (3)")
        }
        
        // Apply ongoing modifiers
        kingdomState.ongoingModifiers.forEach { modifier ->
            modifier.effect(kingdomState)
            console.log("Applied modifier: ${modifier.name}")
        }
    }
    
    /**
     * Phase II: Resources
     * - Collect resources from worksites
     * - Food consumption for settlements and armies
     * - Military support checks
     * - Build queue processing
     */
    private fun executePhaseII() {
        // Phase II is now handled step-by-step through UI interactions
        console.log("Phase II: Resources - Awaiting step-by-step execution")
    }
    
    /**
     * Execute Step 1: Collect Resources
     */
    fun executeResourcesStep1() {
        if (kingdomState.isPhaseStepCompleted("resources_collect")) {
            console.log("Step 1 already completed")
            return
        }
        
        // Use centralized resource collection from KingdomState
        val production = kingdomState.calculateProduction()
        kingdomState.collectResources()
        
        // Log production details
        production.forEach { (resource, amount) ->
            console.log("Collected $amount $resource")
        }
        
        // Add gold from revenue structures
        // TODO: Calculate gold from structures when implemented
        
        kingdomState.markPhaseStepCompleted("resources_collect")
        console.log("Phase II Step 1: Resources collected")
    }
    
    /**
     * Execute Step 2: Food Consumption
     */
    fun executeResourcesStep2() {
        if (kingdomState.isPhaseStepCompleted("resources_consumption")) {
            console.log("Step 2 already completed")
            return
        }
        
        val totalFoodNeeded = kingdomState.getTotalFoodConsumption()
        val currentFood = kingdomState.resources["food"] ?: 0
        
        // Use centralized food consumption processing
        val shortage = kingdomState.processFoodConsumption()
        
        if (shortage > 0) {
            console.log("Food shortage! Need $totalFoodNeeded, have $currentFood. Unrest increased by $shortage (Total: ${kingdomState.unrest})")
            onUnrestChanged?.invoke(kingdomState.unrest)
        } else {
            console.log("Consumed $totalFoodNeeded food (Remaining: ${kingdomState.resources["food"]})")
        }
        
        kingdomState.markPhaseStepCompleted("resources_consumption")
    }
    
    /**
     * Execute Step 3: Military Support
     */
    fun executeResourcesStep3() {
        if (kingdomState.isPhaseStepCompleted("resources_military")) {
            console.log("Step 3 already completed")
            return
        }
        
        val totalSupport = kingdomState.getTotalArmySupport()
        val armyCount = kingdomState.armies.size
        val unsupportedCount = kingdomState.getUnsupportedArmies()
        
        if (unsupportedCount > 0) {
            // Mark unsupported armies and add unrest
            kingdomState.armies.forEachIndexed { index, army ->
                if (index >= totalSupport) {
                    // For now, just add unrest. Full morale checks can be implemented later
                    kingdomState.unrest += 1
                    console.log("Army '${army.name}' is unsupported. +1 Unrest (Total: ${kingdomState.unrest})")
                }
            }
            onUnrestChanged?.invoke(kingdomState.unrest)
        } else if (armyCount > 0) {
            console.log("All $armyCount armies are supported")
        }
        
        kingdomState.markPhaseStepCompleted("resources_military")
        console.log("Phase II Step 3: Military support processed")
    }
    
    /**
     * Execute Step 4: Build Queue
     */
    fun executeResourcesStep4() {
        if (kingdomState.isPhaseStepCompleted("resources_build")) {
            console.log("Step 4 already completed")
            return
        }
        
        // Apply pending allocations to projects
        kingdomState.buildQueue.forEach { project ->
            project.pendingAllocation.forEach { (resource, amount) ->
                val available = kingdomState.resources[resource] ?: 0
                val toApply = minOf(amount, available)
                if (toApply > 0) {
                    project.invested[resource] = (project.invested[resource] ?: 0) + toApply
                    kingdomState.resources[resource] = available - toApply
                    console.log("Applied $toApply $resource to ${project.structureName}")
                }
            }
            project.pendingAllocation.clear()
            
            if (project.isComplete()) {
                console.log("${project.structureName} construction complete!")
            }
        }
        
        // Remove completed projects
        kingdomState.buildQueue.removeAll { it.isComplete() }
        
        // Clear non-storable resources
        kingdomState.resources["lumber"] = 0
        kingdomState.resources["stone"] = 0
        kingdomState.resources["ore"] = 0
        console.log("Non-storable resources cleared")
        
        kingdomState.markPhaseStepCompleted("resources_build")
        console.log("Phase II Step 4: Build queue processed")
    }
    
    /**
     * Phase III: Unrest & Incidents
     * - Check unrest tier
     * - Roll for incidents if needed
     */
    private fun executePhaseIII() {
        val unrestTier = when (kingdomState.unrest) {
            in 0..2 -> 0 // Stable
            in 3..5 -> 1 // Discontent
            in 6..8 -> 2 // Turmoil
            else -> 3 // Rebellion
        }
        
        console.log("Phase III: Unrest level ${kingdomState.unrest} (Tier $unrestTier)")
        
        // Incidents would be rolled here based on tier
        // This will be expanded when we implement the incident system
    }
    
    /**
     * Phase IV: Events
     * - Check for kingdom events
     */
    private fun executePhaseIV() {
        // This will be expanded when we implement the event system
        console.log("Phase IV: Checking for events...")
    }
    
    /**
     * Phase V: Actions
     * - Players perform kingdom actions
     */
    private fun executePhaseV() {
        // This phase is handled by player interaction
        console.log("Phase V: Awaiting player actions...")
    }
    
    /**
     * Phase VI: Resolution
     * - End of turn cleanup
     */
    private fun executePhaseVI() {
        // Use centralized method to clear non-storable resources
        kingdomState.clearNonStorableResources()
        
        console.log("Phase VI: End of turn cleanup complete")
    }
    
    /**
     * Check if a once-per-turn action can be performed
     */
    fun canPerformAction(actionId: String): Boolean {
        return actionId !in kingdomState.oncePerTurnActions
    }
    
    /**
     * Mark an action as used this turn
     */
    fun markActionUsed(actionId: String) {
        kingdomState.oncePerTurnActions.add(actionId)
    }
    
    /**
     * Get unrest penalty for kingdom checks
     */
    fun getUnrestPenalty(): Int {
        return when (kingdomState.unrest) {
            in 0..2 -> 0
            in 3..5 -> -1
            in 6..8 -> -2
            else -> -3
        }
    }
    
    /**
     * Spend fame to reroll
     */
    fun spendFameForReroll(): Boolean {
        return if (kingdomState.fame > 0) {
            kingdomState.fame--
            onFameGained?.invoke(0) // Trigger update without gaining
            true
        } else {
            false
        }
    }
    
    /**
     * Get a summary of the current turn state
     */
    fun getTurnSummary(): String {
        return "Turn ${kingdomState.currentTurn} - ${kingdomState.currentPhase.displayName}"
    }
}
