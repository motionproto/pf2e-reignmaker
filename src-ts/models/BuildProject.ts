// Auto-converted from BuildProject.kt
// TODO: Review and fix TypeScript-specific issues


/**
 * Represents a construction project in the build queue
 */
export interface BuildProject {
  id: string;
  structureName: string;
  tier: number;
  category: string;
  totalCost: Map<string;
  invested: MutableMap<string;
}, // Resources already applied
    const pendingAllocation: MutableMap<string, Int> = mutableMapOf(), // This turn's allocation
    const settlementName: string
 {
    /**
     * Get the remaining cost for this project
     */
    getRemainingCost(): Map<string, Int> {
        val remaining = mutableMapOf<String, Int>()
        totalCost.forEach(( (resource, needed) ->
            val alreadyInvested = invested[resource] ?: 0
            val stillNeeded = needed - alreadyInvested
            if (stillNeeded > 0) {
                remaining[resource] = stillNeeded
            ) }
        }
        return remaining
    }
    
    /**
     * Check if the project instanceof complete
     */
    isComplete(): boolean {
        return totalCost.all { (resource, needed) ->
            (invested[resource] ?: 0) >= needed
        }
    }
    
    /**
     * Get completion percentage
     */
    getCompletionPercentage(): number {
        if (totalCost.isEmpty()) return 100
        
        val totalNeeded = totalCost.values.sum()
        val totalInvested = invested.values.sum()
        
        return ((totalInvested.toFloat() / totalNeeded.toFloat()) * 100).toInt()
    }
    
    /**
     * Apply pending allocation to invested resources
     */
    function applyPendingAllocation(
        pendingAllocation.forEach(( (resource, amount) ->
            invested[resource] = (invested[resource] ?: 0) + amount
        ) }
        pendingAllocation.clear()
    }
}

/**
 * Army unit in the kingdom
 */
export interface Army {
  id: string;
  name: string;
  level: number;
  isSupported: boolean;
  turnsUnsupported: number;
}
