package at.kmlite.pfrpg2e.kingdom.managers

import at.kmlite.pfrpg2e.kingdom.data.*

/**
 * Manages worksite-based resource production in Reignmaker-lite.
 * Handles terrain-specific production rules and special trait bonuses.
 */
class WorksiteManager {
    
    /**
     * Calculate total production from all worksites.
     */
    fun calculateTotalProduction(worksites: RawWorksites): RawResourceYield {
        return worksites.calculateTotalProduction()
    }
    
    /**
     * Create a new worksite on a hex.
     * Validates that the worksite type is appropriate for the terrain.
     */
    fun createWorksite(
        hexId: String,
        terrain: String,
        worksiteType: String,
        specialTrait: String? = null
    ): WorksiteCreationResult {
        val terrainEnum = TerrainType.fromString(terrain)
        val worksiteEnum = WorksiteType.fromString(worksiteType)
        
        // Validate terrain type
        if (terrainEnum == null) {
            return WorksiteCreationResult(
                success = false,
                error = "Invalid terrain type: $terrain",
                worksite = null
            )
        }
        
        // Validate worksite type
        if (worksiteEnum == null) {
            return WorksiteCreationResult(
                success = false,
                error = "Invalid worksite type: $worksiteType",
                worksite = null
            )
        }
        
        // Check if worksite is valid for this terrain
        if (terrainEnum !in worksiteEnum.validTerrain) {
            return WorksiteCreationResult(
                success = false,
                error = "${worksiteEnum.value} cannot be built on ${terrainEnum.value} terrain",
                worksite = null
            )
        }
        
        // Validate special trait if provided
        if (specialTrait != null && !isValidSpecialTrait(specialTrait)) {
            return WorksiteCreationResult(
                success = false,
                error = "Invalid special trait: $specialTrait",
                worksite = null
            )
        }
        
        // Create the worksite
        val worksite = object : RawWorksite {
            override var hexId = hexId
            override var terrain = terrain
            override var type = worksiteType
            override var specialTrait = specialTrait
        }
        
        return WorksiteCreationResult(
            success = true,
            error = null,
            worksite = worksite
        )
    }
    
    /**
     * Get available worksite types for a given terrain.
     */
    fun getAvailableWorksitesForTerrain(terrain: String): List<WorksiteOption> {
        val terrainEnum = TerrainType.fromString(terrain) ?: return emptyList()
        
        return WorksiteType.values()
            .filter { terrainEnum in it.validTerrain }
            .map { worksiteType ->
                WorksiteOption(
                    type = worksiteType.value,
                    displayName = getWorksiteDisplayName(worksiteType),
                    baseYield = worksiteType.baseYield,
                    description = getWorksiteDescription(worksiteType)
                )
            }
    }
    
    /**
     * Calculate production preview for a potential worksite.
     */
    fun previewProduction(
        terrain: String,
        worksiteType: String,
        specialTrait: String? = null
    ): RawResourceYield? {
        val terrainEnum = TerrainType.fromString(terrain) ?: return null
        val worksiteEnum = WorksiteType.fromString(worksiteType) ?: return null
        
        if (terrainEnum !in worksiteEnum.validTerrain) {
            return null
        }
        
        val baseYield = worksiteEnum.baseYield
        
        // Apply special trait bonuses
        return when (specialTrait) {
            "fertile" -> object : RawResourceYield {
                override var food = baseYield.food + 1
                override var lumber = baseYield.lumber
                override var stone = baseYield.stone
                override var ore = baseYield.ore
            }
            "rich-vein" -> object : RawResourceYield {
                override var food = baseYield.food
                override var lumber = baseYield.lumber
                override var stone = baseYield.stone
                override var ore = baseYield.ore + 1
            }
            "abundant" -> object : RawResourceYield {
                override var food = baseYield.food
                override var lumber = baseYield.lumber + 1
                override var stone = baseYield.stone + 1
                override var ore = baseYield.ore
            }
            else -> baseYield
        }
    }
    
    /**
     * Check if a hex already has a worksite.
     */
    fun hexHasWorksite(worksites: RawWorksites, hexId: String): Boolean {
        return worksites.sites.any { it.hexId == hexId }
    }
    
    /**
     * Remove a worksite from a hex.
     */
    fun removeWorksite(worksites: RawWorksites, hexId: String): RawWorksites {
        return object : RawWorksites {
            override var sites = worksites.sites.filter { it.hexId != hexId }.toTypedArray()
        }
    }
    
    /**
     * Add a worksite to the kingdom.
     */
    fun addWorksite(worksites: RawWorksites, worksite: RawWorksite): RawWorksites {
        // Check if hex already has a worksite
        if (hexHasWorksite(worksites, worksite.hexId)) {
            // Replace existing worksite
            return object : RawWorksites {
                override var sites = worksites.sites.map { 
                    if (it.hexId == worksite.hexId) worksite else it 
                }.toTypedArray()
            }
        }
        
        // Add new worksite
        return object : RawWorksites {
            override var sites = worksites.sites + worksite
        }
    }
    
    /**
     * Get production summary by resource type.
     */
    fun getProductionSummary(worksites: RawWorksites): ProductionSummary {
        val production = calculateTotalProduction(worksites)
        val worksiteCount = worksites.sites.size
        
        val byType = worksites.sites.groupBy { it.type }
            .mapValues { (_, sites) -> sites.size }
        
        val byTerrain = worksites.sites.groupBy { it.terrain }
            .mapValues { (_, sites) -> sites.size }
        
        return ProductionSummary(
            totalFood = production.food,
            totalLumber = production.lumber,
            totalStone = production.stone,
            totalOre = production.ore,
            worksiteCount = worksiteCount,
            worksitesByType = byType,
            worksitesByTerrain = byTerrain
        )
    }
    
    /**
     * Check if a special trait is valid.
     */
    private fun isValidSpecialTrait(trait: String): Boolean {
        return trait in listOf("fertile", "rich-vein", "abundant")
    }
    
    /**
     * Get display name for a worksite type.
     */
    private fun getWorksiteDisplayName(type: WorksiteType): String {
        return when (type) {
            WorksiteType.FARMSTEAD -> "Farmstead"
            WorksiteType.LOGGING_CAMP -> "Logging Camp"
            WorksiteType.QUARRY -> "Quarry"
            WorksiteType.MINE -> "Mine"
            WorksiteType.HUNTING_CAMP -> "Hunting Camp"
            WorksiteType.BOG_MINE -> "Bog Mine"
            WorksiteType.OASIS_FARM -> "Oasis Farm"
        }
    }
    
    /**
     * Get description for a worksite type.
     */
    private fun getWorksiteDescription(type: WorksiteType): String {
        return when (type) {
            WorksiteType.FARMSTEAD -> "Produces food from fertile lands"
            WorksiteType.LOGGING_CAMP -> "Harvests lumber from forests"
            WorksiteType.QUARRY -> "Extracts stone from hills and mountains"
            WorksiteType.MINE -> "Digs ore from mountain deposits"
            WorksiteType.HUNTING_CAMP -> "Gathers food from swamp wildlife"
            WorksiteType.BOG_MINE -> "Extracts bog iron from swamps"
            WorksiteType.OASIS_FARM -> "Cultivates food in desert oases"
        }
    }
    
    /**
     * Get worksites context for display in the kingdom sheet.
     * This provides formatted data for rendering worksite information.
     */
    fun getWorksitesContext(kingdom: Any): Array<Any> {
        // Return an empty array for now - worksites UI will be implemented later
        return emptyArray()
    }
    
    /**
     * Update worksites from sheet submission data.
     * Handles converting form data back into worksite objects.
     */
    fun updateWorksites(worksitesData: Array<Any>): RawWorksites {
        // For now, just return an empty worksites object
        return object : RawWorksites {
            override var sites = emptyArray<RawWorksite>()
        }
    }
    
    /**
     * Suggest optimal worksite placement based on terrain and current needs.
     */
    fun suggestOptimalWorksite(
        terrain: String,
        currentProduction: RawResourceYield,
        currentConsumption: ResourceConsumption
    ): WorksiteSuggestion? {
        val terrainEnum = TerrainType.fromString(terrain) ?: return null
        val availableTypes = WorksiteType.values()
            .filter { terrainEnum in it.validTerrain }
        
        if (availableTypes.isEmpty()) return null
        
        // Priority: Food if running deficit, then balanced production
        val foodDeficit = currentConsumption.food - currentProduction.food
        
        return if (foodDeficit > 0 && availableTypes.any { it.baseYield.food > 0 }) {
            // Prioritize food production
            val foodProducer = availableTypes
                .filter { it.baseYield.food > 0 }
                .maxByOrNull { it.baseYield.food }
            
            foodProducer?.let {
                WorksiteSuggestion(
                    recommendedType = it.value,
                    reason = "Food production needed (deficit: $foodDeficit)",
                    expectedYield = it.baseYield
                )
            }
        } else {
            // Suggest based on terrain's best yield
            val bestOption = when (terrainEnum) {
                TerrainType.PLAINS -> WorksiteType.FARMSTEAD
                TerrainType.FOREST -> WorksiteType.LOGGING_CAMP
                TerrainType.HILLS -> WorksiteType.QUARRY
                TerrainType.MOUNTAINS -> WorksiteType.MINE
                TerrainType.SWAMP -> WorksiteType.BOG_MINE // Ore more valuable than food
                TerrainType.DESERT -> WorksiteType.OASIS_FARM
            }
            
            WorksiteSuggestion(
                recommendedType = bestOption.value,
                reason = "Optimal for ${terrainEnum.value} terrain",
                expectedYield = bestOption.baseYield
            )
        }
    }
}

/**
 * Result of creating a worksite.
 */
data class WorksiteCreationResult(
    val success: Boolean,
    val error: String?,
    val worksite: RawWorksite?
)

/**
 * Option for worksite creation.
 */
data class WorksiteOption(
    val type: String,
    val displayName: String,
    val baseYield: RawResourceYield,
    val description: String
)

/**
 * Summary of kingdom production.
 */
data class ProductionSummary(
    val totalFood: Int,
    val totalLumber: Int,
    val totalStone: Int,
    val totalOre: Int,
    val worksiteCount: Int,
    val worksitesByType: Map<String, Int>,
    val worksitesByTerrain: Map<String, Int>
)

/**
 * Suggested worksite for a hex.
 */
data class WorksiteSuggestion(
    val recommendedType: String,
    val reason: String,
    val expectedYield: RawResourceYield
)
