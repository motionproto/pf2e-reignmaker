package kingdom.lite.model

/**
 * Represents a hex of territory controlled by the kingdom
 */
data class Hex(
    val id: String,
    val terrain: String, // "Plains", "Forest", "Hills", "Mountains", "Swamp", "Desert"
    val worksite: Worksite? = null,
    val hasSpecialTrait: Boolean = false, // Fertile, Rich Vein, etc.
    val name: String? = null // Optional name for the hex
) {
    /**
     * Calculate the production from this hex
     */
    fun getProduction(): Map<String, Int> {
        if (worksite == null) return emptyMap()
        
        val baseProduction = worksite.getBaseProduction(terrain).toMutableMap()
        
        // Special traits add +1 to production
        if (hasSpecialTrait) {
            baseProduction.forEach { (resource, amount) ->
                baseProduction[resource] = amount + 1
            }
        }
        
        return baseProduction
    }
}

/**
 * Represents a worksite built on a hex
 */
data class Worksite(
    val type: WorksiteType
) {
    /**
     * Get base production based on terrain type according to Kingdom Rules
     * Each hex can hold ONE worksite, and terrain determines what it can produce
     */
    fun getBaseProduction(terrain: String): Map<String, Int> {
        return when (type) {
            WorksiteType.FARMSTEAD -> when (terrain) {
                "Plains" -> mapOf("food" to 2)
                "Hills" -> mapOf("food" to 1)  // Alternative option for Hills
                else -> emptyMap()
            }
            WorksiteType.LOGGING_CAMP -> when (terrain) {
                "Forest" -> mapOf("lumber" to 2)
                else -> emptyMap()
            }
            WorksiteType.QUARRY -> when (terrain) {
                "Hills" -> mapOf("stone" to 1)
                "Mountains" -> mapOf("stone" to 1)  // Alternative option for Mountains
                else -> emptyMap()
            }
            WorksiteType.MINE -> when (terrain) {
                "Mountains" -> mapOf("ore" to 1)
                else -> emptyMap()
            }
            WorksiteType.BOG_MINE -> when (terrain) {
                "Swamp" -> mapOf("ore" to 1)  // Alternative option for Swamp
                else -> emptyMap()
            }
            WorksiteType.HUNTING_FISHING_CAMP -> when (terrain) {
                "Swamp" -> mapOf("food" to 1)
                else -> emptyMap()
            }
            WorksiteType.OASIS_FARM -> when (terrain) {
                "Desert" -> mapOf("food" to 1)  // Special case: only if Oasis trait is present
                else -> emptyMap()
            }
        }
    }
    
    /**
     * Check if this worksite type is valid for the given terrain
     */
    fun isValidForTerrain(terrain: String): Boolean {
        return getBaseProduction(terrain).isNotEmpty()
    }
}

/**
 * Types of worksites that can be built according to Kingdom Rules
 */
enum class WorksiteType(val displayName: String, val icon: String) {
    FARMSTEAD("Farmstead", "fa-wheat-awn"),
    LOGGING_CAMP("Logging Camp", "fa-tree"),
    QUARRY("Quarry", "fa-cube"),
    MINE("Mine", "fa-gem"),
    BOG_MINE("Bog Mine", "fa-tint"),
    HUNTING_FISHING_CAMP("Hunting/Fishing Camp", "fa-fish"),
    OASIS_FARM("Oasis Farm", "fa-water")
}

/**
 * Get valid worksite types for a specific terrain
 */
fun getValidWorksitesForTerrain(terrain: String, hasOasisTrait: Boolean = false): List<WorksiteType> {
    return when (terrain) {
        "Plains" -> listOf(WorksiteType.FARMSTEAD)
        "Forest" -> listOf(WorksiteType.LOGGING_CAMP)
        "Hills" -> listOf(WorksiteType.QUARRY, WorksiteType.FARMSTEAD)
        "Mountains" -> listOf(WorksiteType.MINE, WorksiteType.QUARRY)
        "Swamp" -> listOf(WorksiteType.HUNTING_FISHING_CAMP, WorksiteType.BOG_MINE)
        "Desert" -> if (hasOasisTrait) listOf(WorksiteType.OASIS_FARM) else emptyList()
        else -> emptyList()
    }
}
