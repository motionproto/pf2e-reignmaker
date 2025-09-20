package kingdom.lite.model

/**
 * Represents a construction project in the build queue
 */
data class BuildProject(
    val id: String,
    val structureName: String,
    val tier: Int,
    val category: String, // "Commerce", "Military", "Faith", etc.
    val totalCost: Map<String, Int>, // Total resources needed
    val invested: MutableMap<String, Int> = mutableMapOf(), // Resources already applied
    val pendingAllocation: MutableMap<String, Int> = mutableMapOf(), // This turn's allocation
    val settlementName: String
) {
    /**
     * Get the remaining cost for this project
     */
    fun getRemainingCost(): Map<String, Int> {
        val remaining = mutableMapOf<String, Int>()
        totalCost.forEach { (resource, needed) ->
            val alreadyInvested = invested[resource] ?: 0
            val stillNeeded = needed - alreadyInvested
            if (stillNeeded > 0) {
                remaining[resource] = stillNeeded
            }
        }
        return remaining
    }
    
    /**
     * Check if the project is complete
     */
    fun isComplete(): Boolean {
        return totalCost.all { (resource, needed) ->
            (invested[resource] ?: 0) >= needed
        }
    }
    
    /**
     * Get completion percentage
     */
    fun getCompletionPercentage(): Int {
        if (totalCost.isEmpty()) return 100
        
        val totalNeeded = totalCost.values.sum()
        val totalInvested = invested.values.sum()
        
        return ((totalInvested.toFloat() / totalNeeded.toFloat()) * 100).toInt()
    }
    
    /**
     * Apply pending allocation to invested resources
     */
    fun applyPendingAllocation() {
        pendingAllocation.forEach { (resource, amount) ->
            invested[resource] = (invested[resource] ?: 0) + amount
        }
        pendingAllocation.clear()
    }
}

/**
 * Army unit in the kingdom
 */
data class Army(
    val id: String,
    val name: String,
    val level: Int = 1,
    val isSupported: Boolean = true,
    val turnsUnsupported: Int = 0
)
