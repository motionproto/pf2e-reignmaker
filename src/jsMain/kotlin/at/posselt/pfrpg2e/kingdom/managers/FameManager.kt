package at.posselt.pfrpg2e.kingdom.managers

import at.posselt.pfrpg2e.kingdom.KingdomActor
import at.posselt.pfrpg2e.kingdom.KingdomData
import at.posselt.pfrpg2e.kingdom.data.FameData
import at.posselt.pfrpg2e.kingdom.data.createFameData
import at.posselt.pfrpg2e.kingdom.data.RawFame
import at.posselt.pfrpg2e.kingdom.getKingdom
import at.posselt.pfrpg2e.kingdom.setKingdom
import js.objects.recordOf

/**
 * Manages the Fame System for the Reignmaker-lite features.
 * Handles fame point generation, usage, and turn management.
 */
class FameManager {
    
    /**
     * Called at the start of each kingdom turn.
     * Grants 1 fame point at the beginning of the turn.
     * This is typically triggered by clicking the "gain-fame" button.
     */
    suspend fun gainTurnFame(actor: KingdomActor) {
        val kingdom = actor.getKingdom() ?: return
        val existingFame = convertFromRawFame(kingdom.fame)
        
        // Gain 1 fame for the turn (can only be done once per turn)
        val newFame = createFameData(
            current = 1,
            maximum = kingdom.settings.maximumFamePoints,
            usedForRerolls = existingFame.usedForRerolls,
            gainedFromCriticals = existingFame.gainedFromCriticals,
            now = 1,
            next = 0
        )
        
        // Update the kingdom with the new fame data
        kingdom.fame = convertToRawFame(newFame)
        actor.setKingdom(kingdom)
    }
    
    /**
     * Attempts to use a fame point for a reroll.
     * Returns true if the fame was successfully spent, false otherwise.
     * Each check can only be rerolled once with fame.
     */
    suspend fun useForReroll(
        actor: KingdomActor, 
        checkId: String
    ): Boolean {
        val kingdom = actor.getKingdom() ?: return false
        val fameData = convertFromRawFame(kingdom.fame)
        
        // Check if we have fame and haven't already used it for this check
        if (fameData.current > 0 && checkId !in fameData.usedForRerolls) {
            val updatedFame = createFameData(
                current = fameData.current - 1,
                maximum = fameData.maximum,
                usedForRerolls = fameData.usedForRerolls + checkId,
                gainedFromCriticals = fameData.gainedFromCriticals,
                now = fameData.current - 1,
                next = fameData.next
            )
            
            kingdom.fame = convertToRawFame(updatedFame)
            actor.setKingdom(kingdom)
            return true
        }
        return false
    }
    
    /**
     * Awards a bonus fame point for achieving a critical success.
     */
    suspend fun gainFromCritical(actor: KingdomActor) {
        val kingdom = actor.getKingdom() ?: return
        val fameData = convertFromRawFame(kingdom.fame)
        
        val updatedFame = createFameData(
            current = (fameData.current + 1).coerceAtMost(fameData.maximum),
            maximum = fameData.maximum,
            usedForRerolls = fameData.usedForRerolls,
            gainedFromCriticals = fameData.gainedFromCriticals + 1,
            now = (fameData.current + 1).coerceAtMost(fameData.maximum),
            next = fameData.next
        )
        
        kingdom.fame = convertToRawFame(updatedFame)
        actor.setKingdom(kingdom)
    }
    
    /**
     * Called at the end of the kingdom turn.
     * Fame points do not carry over between turns.
     */
    suspend fun endTurn(actor: KingdomActor) {
        val kingdom = actor.getKingdom() ?: return
        
        // Reset fame to zero - it doesn't carry over
        val resetFame = createFameData(
            current = 0,
            maximum = kingdom.settings.maximumFamePoints,
            usedForRerolls = emptyArray(),
            gainedFromCriticals = 0,
            now = 0,
            next = 0
        )
        
        kingdom.fame = convertToRawFame(resetFame)
        actor.setKingdom(kingdom)
    }
    
    /**
     * Converts the enhanced FameData to the legacy RawFame format for storage.
     */
    private fun convertToRawFame(fameData: FameData): RawFame = object : RawFame {
        override var now = fameData.current
        override var next = fameData.next
        override var type = fameData.type ?: "enhanced"
    }
    
    /**
     * Converts legacy RawFame to the enhanced FameData format.
     */
    private fun convertFromRawFame(rawFame: RawFame): FameData {
        // Check if it's already enhanced fame data
        return if (rawFame.unsafeCast<FameData?>()?.usedForRerolls != null) {
            rawFame.unsafeCast<FameData>()
        } else {
            // Convert from legacy format
            createFameData(
                current = rawFame.now,
                maximum = 10,
                usedForRerolls = emptyArray(),
                gainedFromCriticals = 0,
                now = rawFame.now,
                next = rawFame.next,
                type = rawFame.type
            )
        }
    }
    
    /**
     * Gets the current fame data for the kingdom.
     */
    fun getCurrentFameData(kingdom: KingdomData): FameData {
        return convertFromRawFame(kingdom.fame)
    }
}
