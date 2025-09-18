package at.kmlite.pfrpg2e.kingdom.managers

import at.kmlite.pfrpg2e.kingdom.data.*

/**
 * Manages resource storage capacity and loss mechanics in Reignmaker-lite.
 * Food can be stored across turns, while lumber/stone/ore are lost if not stored.
 */
class StorageManager {
    
    /**
     * Calculate total storage capacity from all storage buildings.
     */
    fun calculateTotalCapacity(storageBuildings: RawStorageBuildings): RawStorageCapacity {
        return storageBuildings.calculateCapacity()
    }
    
    /**
     * Apply storage rules at end of turn.
     * Food is preserved up to capacity, other resources require storage or are lost.
     */
    fun applyStorageRules(
        commodities: RawCommodities,
        capacity: RawStorageCapacity
    ): RawCommodities {
        return commodities.processEndOfTurnStorage(capacity)
    }
    
    /**
     * Check if resources will be lost at end of turn.
     */
    fun checkForPotentialLoss(
        commodities: RawCommodities,
        capacity: RawStorageCapacity
    ): StorageLossWarning {
        val foodLoss = (commodities.food - capacity.food).coerceAtLeast(0)
        val lumberLoss = if (capacity.lumber == 0) {
            commodities.lumber
        } else {
            (commodities.lumber - capacity.lumber).coerceAtLeast(0)
        }
        val stoneLoss = if (capacity.stone == 0) {
            commodities.stone
        } else {
            (commodities.stone - capacity.stone).coerceAtLeast(0)
        }
        val oreLoss = if (capacity.ore == 0) {
            commodities.ore
        } else {
            (commodities.ore - capacity.ore).coerceAtLeast(0)
        }
        
        val hasLoss = foodLoss > 0 || lumberLoss > 0 || stoneLoss > 0 || oreLoss > 0
        
        return StorageLossWarning(
            willLoseResources = hasLoss,
            foodLoss = foodLoss,
            lumberLoss = lumberLoss,
            stoneLoss = stoneLoss,
            oreLoss = oreLoss,
            warnings = generateWarnings(foodLoss, lumberLoss, stoneLoss, oreLoss, capacity)
        )
    }
    
    /**
     * Generate warning messages for potential resource loss.
     */
    private fun generateWarnings(
        foodLoss: Int,
        lumberLoss: Int,
        stoneLoss: Int,
        oreLoss: Int,
        capacity: RawStorageCapacity
    ): List<String> {
        val warnings = mutableListOf<String>()
        
        if (foodLoss > 0) {
            warnings.add("$foodLoss food will be lost (exceeds storage capacity of ${capacity.food})")
        }
        
        if (lumberLoss > 0) {
            if (capacity.lumber == 0) {
                warnings.add("All $lumberLoss lumber will be lost (no storage buildings for lumber)")
            } else {
                warnings.add("$lumberLoss lumber will be lost (exceeds storage capacity of ${capacity.lumber})")
            }
        }
        
        if (stoneLoss > 0) {
            if (capacity.stone == 0) {
                warnings.add("All $stoneLoss stone will be lost (no storage buildings for stone)")
            } else {
                warnings.add("$stoneLoss stone will be lost (exceeds storage capacity of ${capacity.stone})")
            }
        }
        
        if (oreLoss > 0) {
            if (capacity.ore == 0) {
                warnings.add("All $oreLoss ore will be lost (no storage buildings for ore)")
            } else {
                warnings.add("$oreLoss ore will be lost (exceeds storage capacity of ${capacity.ore})")
            }
        }
        
        return warnings
    }
    
    /**
     * Calculate required storage buildings to prevent resource loss.
     */
    fun calculateRequiredStorage(commodities: RawCommodities): StorageRequirement {
        // Calculate how many of each building type would be needed
        val foodNeeded = commodities.food
        val lumberNeeded = commodities.lumber
        val stoneNeeded = commodities.stone
        val oreNeeded = commodities.ore
        
        // Start with most efficient buildings (highest tier)
        var granaries = 0
        var storehouses = 0
        var warehouses = 0
        var strategicReserves = 0
        
        // Try to fulfill with Strategic Reserves first (most efficient)
        if (foodNeeded > 0 || lumberNeeded > 0 || stoneNeeded > 0 || oreNeeded > 0) {
            strategicReserves = maxOf(
                (foodNeeded + 35) / 36,  // Round up
                (lumberNeeded + 17) / 18,
                (stoneNeeded + 8) / 9,
                (oreNeeded + 8) / 9
            )
            
            val strategicFood = strategicReserves * 36
            val strategicLumber = strategicReserves * 18
            val strategicStone = strategicReserves * 9
            val strategicOre = strategicReserves * 9
            
            // Check if Strategic Reserves alone are sufficient
            if (strategicFood >= foodNeeded && 
                strategicLumber >= lumberNeeded && 
                strategicStone >= stoneNeeded && 
                strategicOre >= oreNeeded) {
                return StorageRequirement(
                    granaries = 0,
                    storehouses = 0,
                    warehouses = 0,
                    strategicReserves = strategicReserves,
                    alternativeOptions = listOf(
                        StorageOption(
                            granaries = (foodNeeded + 3) / 4,
                            storehouses = 0,
                            warehouses = 0,
                            strategicReserves = 0,
                            description = "Granaries only (handles food)"
                        ),
                        StorageOption(
                            granaries = 0,
                            storehouses = 0,
                            warehouses = maxOf(
                                (foodNeeded + 15) / 16,
                                (lumberNeeded + 7) / 8,
                                (stoneNeeded + 3) / 4,
                                (oreNeeded + 3) / 4
                            ),
                            strategicReserves = 0,
                            description = "Warehouses only"
                        )
                    )
                )
            }
        }
        
        // Calculate a mixed approach for efficiency
        var remainingFood = foodNeeded
        var remainingLumber = lumberNeeded
        var remainingStone = stoneNeeded
        var remainingOre = oreNeeded
        
        // Add warehouses for stone/ore if needed
        if (remainingStone > 0 || remainingOre > 0) {
            warehouses = maxOf(
                (remainingStone + 3) / 4,
                (remainingOre + 3) / 4
            )
            remainingFood = (remainingFood - warehouses * 16).coerceAtLeast(0)
            remainingLumber = (remainingLumber - warehouses * 8).coerceAtLeast(0)
            remainingStone = 0
            remainingOre = 0
        }
        
        // Add storehouses for lumber if needed
        if (remainingLumber > 0) {
            storehouses = (remainingLumber + 3) / 4
            remainingFood = (remainingFood - storehouses * 8).coerceAtLeast(0)
            remainingLumber = 0
        }
        
        // Add granaries for remaining food
        if (remainingFood > 0) {
            granaries = (remainingFood + 3) / 4
        }
        
        return StorageRequirement(
            granaries = granaries,
            storehouses = storehouses,
            warehouses = warehouses,
            strategicReserves = 0,
            alternativeOptions = emptyList()
        )
    }
    
    /**
     * Get storage building recommendations based on kingdom size and production.
     */
    fun getStorageRecommendations(
        currentBuildings: RawStorageBuildings,
        currentProduction: RawResourceYield,
        settlementCount: Int
    ): StorageRecommendation {
        val currentCapacity = calculateTotalCapacity(currentBuildings)
        
        // Estimate reasonable storage needs
        val recommendedFoodStorage = settlementCount * 8  // Buffer for emergencies
        val recommendedLumberStorage = currentProduction.lumber * 2  // 2 turns buffer
        val recommendedStoneStorage = currentProduction.stone * 2
        val recommendedOreStorage = currentProduction.ore * 2
        
        val foodDeficit = (recommendedFoodStorage - currentCapacity.food).coerceAtLeast(0)
        val lumberDeficit = (recommendedLumberStorage - currentCapacity.lumber).coerceAtLeast(0)
        val stoneDeficit = (recommendedStoneStorage - currentCapacity.stone).coerceAtLeast(0)
        val oreDeficit = (recommendedOreStorage - currentCapacity.ore).coerceAtLeast(0)
        
        val recommendations = mutableListOf<String>()
        
        if (foodDeficit > 0) {
            val granaiesNeeded = (foodDeficit + 3) / 4
            recommendations.add("Build $granaiesNeeded more Granaries for food storage")
        }
        
        if (lumberDeficit > 0 && stoneDeficit == 0 && oreDeficit == 0) {
            val storehousesNeeded = (lumberDeficit + 3) / 4
            recommendations.add("Build $storehousesNeeded more Storehouses for lumber storage")
        }
        
        if (stoneDeficit > 0 || oreDeficit > 0) {
            val warehousesNeeded = maxOf(
                (stoneDeficit + 3) / 4,
                (oreDeficit + 3) / 4
            )
            recommendations.add("Build $warehousesNeeded more Warehouses for stone/ore storage")
        }
        
        if (settlementCount >= 4 && currentBuildings.strategicReserves == 0) {
            recommendations.add("Consider building a Strategic Reserve for comprehensive storage")
        }
        
        return StorageRecommendation(
            currentCapacity = currentCapacity,
            recommendedCapacity = object : RawStorageCapacity {
                override var food = recommendedFoodStorage
                override var lumber = recommendedLumberStorage
                override var stone = recommendedStoneStorage
                override var ore = recommendedOreStorage
            },
            recommendations = if (recommendations.isEmpty()) {
                listOf("Storage capacity is adequate")
            } else {
                recommendations
            }
        )
    }
    
    /**
     * Calculate efficiency of current storage setup.
     */
    fun calculateStorageEfficiency(
        buildings: RawStorageBuildings,
        commodities: RawCommodities
    ): StorageEfficiency {
        val capacity = calculateTotalCapacity(buildings)
        
        val foodUtilization = if (capacity.food > 0) {
            (commodities.food.toDouble() / capacity.food * 100).coerceIn(0.0, 100.0)
        } else if (commodities.food > 0) {
            100.0  // Over capacity
        } else {
            0.0
        }
        
        val lumberUtilization = if (capacity.lumber > 0) {
            (commodities.lumber.toDouble() / capacity.lumber * 100).coerceIn(0.0, 100.0)
        } else if (commodities.lumber > 0) {
            100.0
        } else {
            0.0
        }
        
        val stoneUtilization = if (capacity.stone > 0) {
            (commodities.stone.toDouble() / capacity.stone * 100).coerceIn(0.0, 100.0)
        } else if (commodities.stone > 0) {
            100.0
        } else {
            0.0
        }
        
        val oreUtilization = if (capacity.ore > 0) {
            (commodities.ore.toDouble() / capacity.ore * 100).coerceIn(0.0, 100.0)
        } else if (commodities.ore > 0) {
            100.0
        } else {
            0.0
        }
        
        val totalBuildings = buildings.granaries + buildings.storehouses + 
                           buildings.warehouses + buildings.strategicReserves
        
        val overallUtilization = if (totalBuildings > 0) {
            (foodUtilization + lumberUtilization + stoneUtilization + oreUtilization) / 4
        } else {
            0.0
        }
        
        return StorageEfficiency(
            foodUtilization = foodUtilization,
            lumberUtilization = lumberUtilization,
            stoneUtilization = stoneUtilization,
            oreUtilization = oreUtilization,
            overallUtilization = overallUtilization,
            totalBuildingCount = totalBuildings
        )
    }
}

/**
 * Warning about potential resource loss.
 */
data class StorageLossWarning(
    val willLoseResources: Boolean,
    val foodLoss: Int,
    val lumberLoss: Int,
    val stoneLoss: Int,
    val oreLoss: Int,
    val warnings: List<String>
)

/**
 * Required storage buildings to prevent loss.
 */
data class StorageRequirement(
    val granaries: Int,
    val storehouses: Int,
    val warehouses: Int,
    val strategicReserves: Int,
    val alternativeOptions: List<StorageOption>
)

/**
 * Alternative storage building configuration.
 */
data class StorageOption(
    val granaries: Int,
    val storehouses: Int,
    val warehouses: Int,
    val strategicReserves: Int,
    val description: String
)

/**
 * Storage recommendations based on kingdom needs.
 */
data class StorageRecommendation(
    val currentCapacity: RawStorageCapacity,
    val recommendedCapacity: RawStorageCapacity,
    val recommendations: List<String>
)

/**
 * Storage efficiency metrics.
 */
data class StorageEfficiency(
    val foodUtilization: Double,      // Percentage 0-100
    val lumberUtilization: Double,    // Percentage 0-100
    val stoneUtilization: Double,     // Percentage 0-100
    val oreUtilization: Double,       // Percentage 0-100
    val overallUtilization: Double,   // Average utilization
    val totalBuildingCount: Int
)
