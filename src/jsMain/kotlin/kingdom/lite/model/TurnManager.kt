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
     * - Build queue processing
     */
    private fun executePhaseII() {
        // This will be expanded when we implement worksites
        // For now, just handle food consumption
        
        val totalFoodNeeded = kingdomState.settlements.sumOf { it.foodConsumption }
        val currentFood = kingdomState.resources["food"] ?: 0
        
        if (currentFood < totalFoodNeeded) {
            val shortage = totalFoodNeeded - currentFood
            kingdomState.unrest += shortage
            kingdomState.resources["food"] = 0
            console.log("Phase II: Food shortage! Need $totalFoodNeeded, have $currentFood. Unrest increased by $shortage (Total: ${kingdomState.unrest})")
            onUnrestChanged?.invoke(kingdomState.unrest)
        } else {
            kingdomState.resources["food"] = currentFood - totalFoodNeeded
            console.log("Phase II: Consumed $totalFoodNeeded food (Remaining: ${kingdomState.resources["food"]})")
        }
        
        // Process territory-based unrest
        val hexes = kingdomState.size
        val territoryUnrest = when {
            hexes >= 32 -> 4
            hexes >= 24 -> 3
            hexes >= 16 -> 2
            hexes >= 8 -> 1
            else -> 0
        }
        
        if (territoryUnrest > 0) {
            kingdomState.unrest += territoryUnrest
            console.log("Phase II: Territory size ($hexes hexes) causes +$territoryUnrest unrest (Total: ${kingdomState.unrest})")
            onUnrestChanged?.invoke(kingdomState.unrest)
        }
        
        // Process war unrest
        if (kingdomState.isAtWar) {
            kingdomState.unrest += 1
            console.log("Phase II: War causes +1 unrest (Total: ${kingdomState.unrest})")
            onUnrestChanged?.invoke(kingdomState.unrest)
        }
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
        // Clear non-stored resources (lumber, stone, ore)
        kingdomState.resources["lumber"] = 0
        kingdomState.resources["stone"] = 0
        kingdomState.resources["ore"] = 0
        
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
