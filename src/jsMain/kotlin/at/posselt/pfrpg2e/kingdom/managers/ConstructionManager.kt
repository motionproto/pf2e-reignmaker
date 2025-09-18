package at.posselt.pfrpg2e.kingdom.managers

import at.posselt.pfrpg2e.kingdom.data.*

/**
 * Manages construction queue and building projects in Reignmaker-lite.
 * Resources are automatically applied to construction each turn.
 */
class ConstructionManager {
    
    /**
     * Apply available resources to a construction project.
     * Returns the updated project and remaining resources.
     */
    fun applyResourcesToProject(
        project: RawConstructionProject,
        available: RawCommodities,
        gold: Int
    ): ConstructionResult {
        // Convert commodities to resource yield format
        val availableYield = object : RawResourceYield {
            override var food = 0  // Food not used for construction
            override var lumber = available.lumber
            override var stone = available.stone
            override var ore = available.ore
        }
        
        val (updatedProject, leftoverYield) = project.applyResources(availableYield, gold)
        
        // Convert back to commodities
        val remainingCommodities = object : RawCommodities {
            override var food = available.food  // Food unchanged
            override var lumber = leftoverYield.lumber
            override var stone = leftoverYield.stone
            override var ore = leftoverYield.ore
        }
        
        // Calculate gold spent
        val goldSpent = if (project.totalCost.gold > project.invested.gold) {
            minOf(gold, project.totalCost.gold - project.invested.gold)
        } else {
            0
        }
        
        return ConstructionResult(
            project = updatedProject,
            remainingResources = remainingCommodities,
            goldSpent = goldSpent,
            completed = updatedProject.isComplete()
        )
    }
    
    /**
     * Start a new construction project.
     */
    fun startProject(
        structureId: String,
        structureName: String,
        settlementId: String,
        tier: Int,
        customCost: RawConstructionCost? = null
    ): RawConstructionProject {
        val cost = customCost ?: ConstructionCosts.getByTier(tier)
        
        return object : RawConstructionProject {
            override var structureId = structureId
            override var structureName = structureName
            override var settlementId = settlementId
            override var tier = tier
            override var totalCost = cost
            override var invested = object : RawConstructionCost {
                override var lumber = 0
                override var stone = 0
                override var ore = 0
                override var gold = 0
            }
            override var turnsActive = 0
        }
    }
    
    /**
     * Check if there are enough resources to complete a project immediately.
     */
    fun canCompleteImmediately(
        project: RawConstructionProject,
        commodities: RawCommodities,
        gold: Int
    ): Boolean {
        val remaining = project.remainingCost()
        return commodities.lumber >= remaining.lumber &&
               commodities.stone >= remaining.stone &&
               commodities.ore >= remaining.ore &&
               gold >= remaining.gold
    }
    
    /**
     * Calculate estimated turns to complete based on production rates.
     */
    fun estimateCompletion(
        project: RawConstructionProject,
        productionPerTurn: RawResourceYield,
        currentCommodities: RawCommodities,
        currentGold: Int
    ): CompletionEstimate {
        val remaining = project.remainingCost()
        
        // Check immediate completion
        if (canCompleteImmediately(project, currentCommodities, currentGold)) {
            return CompletionEstimate(
                turnsRemaining = 1,
                bottleneckResource = null,
                canComplete = true,
                warnings = emptyList()
            )
        }
        
        // Calculate turns needed for each resource
        val lumberTurns = if (remaining.lumber > 0 && productionPerTurn.lumber > 0) {
            val afterCurrent = (remaining.lumber - currentCommodities.lumber).coerceAtLeast(0)
            (afterCurrent + productionPerTurn.lumber - 1) / productionPerTurn.lumber
        } else if (remaining.lumber > 0) {
            Int.MAX_VALUE  // No production
        } else {
            0
        }
        
        val stoneTurns = if (remaining.stone > 0 && productionPerTurn.stone > 0) {
            val afterCurrent = (remaining.stone - currentCommodities.stone).coerceAtLeast(0)
            (afterCurrent + productionPerTurn.stone - 1) / productionPerTurn.stone
        } else if (remaining.stone > 0) {
            Int.MAX_VALUE
        } else {
            0
        }
        
        val oreTurns = if (remaining.ore > 0 && productionPerTurn.ore > 0) {
            val afterCurrent = (remaining.ore - currentCommodities.ore).coerceAtLeast(0)
            (afterCurrent + productionPerTurn.ore - 1) / productionPerTurn.ore
        } else if (remaining.ore > 0) {
            Int.MAX_VALUE
        } else {
            0
        }
        
        // Gold is not automatically produced, warn if needed
        val goldNeeded = remaining.gold > currentGold
        
        // Find the bottleneck
        val maxTurns = maxOf(lumberTurns, stoneTurns, oreTurns)
        
        val bottleneck = when (maxTurns) {
            lumberTurns -> "lumber"
            stoneTurns -> "stone"
            oreTurns -> "ore"
            else -> null
        }
        
        val warnings = mutableListOf<String>()
        
        if (maxTurns == Int.MAX_VALUE) {
            when {
                lumberTurns == Int.MAX_VALUE && remaining.lumber > 0 -> 
                    warnings.add("No lumber production - need worksites on forest terrain")
                stoneTurns == Int.MAX_VALUE && remaining.stone > 0 -> 
                    warnings.add("No stone production - need quarries on hills/mountains")
                oreTurns == Int.MAX_VALUE && remaining.ore > 0 -> 
                    warnings.add("No ore production - need mines on mountains/swamps")
            }
        }
        
        if (goldNeeded) {
            warnings.add("Requires ${remaining.gold - currentGold} more gold")
        }
        
        return CompletionEstimate(
            turnsRemaining = if (maxTurns == Int.MAX_VALUE) null else maxTurns,
            bottleneckResource = bottleneck,
            canComplete = maxTurns != Int.MAX_VALUE && !goldNeeded,
            warnings = warnings
        )
    }
    
    /**
     * Get construction recommendations based on kingdom needs.
     */
    fun getConstructionPriorities(
        settlementCount: Int,
        currentProduction: RawResourceYield,
        foodConsumption: Int,
        hasStorageBuildings: Boolean
    ): List<ConstructionPriority> {
        val priorities = mutableListOf<ConstructionPriority>()
        
        // Priority 1: Food production if running deficit
        val foodDeficit = foodConsumption - currentProduction.food
        if (foodDeficit > 0) {
            priorities.add(
                ConstructionPriority(
                    priority = 1,
                    category = "Food Production",
                    recommendation = "Build Mills or Farms to address food deficit",
                    reason = "Current food deficit: $foodDeficit per turn"
                )
            )
        }
        
        // Priority 2: Storage if none exists
        if (!hasStorageBuildings) {
            priorities.add(
                ConstructionPriority(
                    priority = 2,
                    category = "Storage",
                    recommendation = "Build Granaries or Storehouses",
                    reason = "No storage - resources will be lost at turn end"
                )
            )
        }
        
        // Priority 3: Production buildings for construction materials
        if (currentProduction.lumber == 0 && settlementCount > 0) {
            priorities.add(
                ConstructionPriority(
                    priority = 3,
                    category = "Resource Production",
                    recommendation = "Create logging camps on forest hexes",
                    reason = "No lumber production for construction"
                )
            )
        }
        
        if (currentProduction.stone == 0 && settlementCount > 1) {
            priorities.add(
                ConstructionPriority(
                    priority = 4,
                    category = "Resource Production",
                    recommendation = "Create quarries on hill/mountain hexes",
                    reason = "No stone production for advanced buildings"
                )
            )
        }
        
        // Priority 4: Economic buildings
        priorities.add(
            ConstructionPriority(
                priority = 5,
                category = "Economy",
                recommendation = "Build Markets or Trade Posts",
                reason = "Generate gold income for kingdom expenses"
            )
        )
        
        // Priority 5: Defense
        if (settlementCount > 0) {
            priorities.add(
                ConstructionPriority(
                    priority = 6,
                    category = "Defense",
                    recommendation = "Build Walls or Watchtowers",
                    reason = "Improve kingdom defense and reduce unrest"
                )
            )
        }
        
        return priorities.sortedBy { it.priority }
    }
    
    /**
     * Cancel a construction project and calculate refund.
     */
    fun cancelProject(
        project: RawConstructionProject,
        refundPercentage: Int = 50
    ): ConstructionRefund {
        val lumberRefund = (project.invested.lumber * refundPercentage) / 100
        val stoneRefund = (project.invested.stone * refundPercentage) / 100
        val oreRefund = (project.invested.ore * refundPercentage) / 100
        val goldRefund = (project.invested.gold * refundPercentage) / 100
        
        return ConstructionRefund(
            lumber = lumberRefund,
            stone = stoneRefund,
            ore = oreRefund,
            gold = goldRefund,
            turnsWasted = project.turnsActive
        )
    }
    
    /**
     * Get a summary of the current project status.
     */
    fun getProjectStatus(project: RawConstructionProject?): ProjectStatus {
        if (project == null) {
            return ProjectStatus(
                hasProject = false,
                projectName = null,
                settlementName = null,
                percentComplete = 0,
                turnsActive = 0,
                resourcesInvested = null,
                resourcesRemaining = null,
                isComplete = false
            )
        }
        
        return ProjectStatus(
            hasProject = true,
            projectName = project.structureName,
            settlementName = project.settlementId,  // Would need lookup for actual name
            percentComplete = project.completionPercentage(),
            turnsActive = project.turnsActive,
            resourcesInvested = ResourceSummary(
                lumber = project.invested.lumber,
                stone = project.invested.stone,
                ore = project.invested.ore,
                gold = project.invested.gold
            ),
            resourcesRemaining = ResourceSummary(
                lumber = project.remainingCost().lumber,
                stone = project.remainingCost().stone,
                ore = project.remainingCost().ore,
                gold = project.remainingCost().gold
            ),
            isComplete = project.isComplete()
        )
    }
    
    /**
     * Check if a project would be worth rushing with purchased resources.
     */
    fun analyzeRushCost(
        project: RawConstructionProject,
        tradeRates: TradeRates
    ): RushAnalysis {
        val remaining = project.remainingCost()
        
        val lumberCost = remaining.lumber * tradeRates.lumberSellRate * 2  // Buy rate is typically 2x sell
        val stoneCost = remaining.stone * tradeRates.stoneSellRate * 2
        val oreCost = remaining.ore * tradeRates.oreSellRate * 2
        val directGoldCost = remaining.gold
        
        val totalGoldCost = lumberCost + stoneCost + oreCost + directGoldCost
        
        // Estimate value based on tier
        val estimatedValue = when (project.tier) {
            1 -> 5
            2 -> 15
            3 -> 30
            4 -> 60
            else -> 10
        }
        
        val worthRushing = totalGoldCost < estimatedValue * 2  // Rush if cost is less than 2x value
        
        return RushAnalysis(
            goldCostToRush = totalGoldCost,
            breakdown = mapOf(
                "Lumber" to lumberCost,
                "Stone" to stoneCost,
                "Ore" to oreCost,
                "Direct Gold" to directGoldCost
            ),
            worthRushing = worthRushing,
            recommendation = if (worthRushing) {
                "Rushing would cost $totalGoldCost gold - reasonable for a Tier ${project.tier} structure"
            } else {
                "Rushing would cost $totalGoldCost gold - too expensive, wait for normal production"
            }
        )
    }
}

/**
 * Result of applying resources to construction.
 */
data class ConstructionResult(
    val project: RawConstructionProject,
    val remainingResources: RawCommodities,
    val goldSpent: Int,
    val completed: Boolean
)

/**
 * Estimated completion time for a project.
 */
data class CompletionEstimate(
    val turnsRemaining: Int?,  // Null if cannot complete with current production
    val bottleneckResource: String?,
    val canComplete: Boolean,
    val warnings: List<String>
)

/**
 * Construction priority recommendation.
 */
data class ConstructionPriority(
    val priority: Int,
    val category: String,
    val recommendation: String,
    val reason: String
)

/**
 * Refund from cancelling a project.
 */
data class ConstructionRefund(
    val lumber: Int,
    val stone: Int,
    val ore: Int,
    val gold: Int,
    val turnsWasted: Int
)

/**
 * Status of current construction project.
 */
data class ProjectStatus(
    val hasProject: Boolean,
    val projectName: String?,
    val settlementName: String?,
    val percentComplete: Int,
    val turnsActive: Int,
    val resourcesInvested: ResourceSummary?,
    val resourcesRemaining: ResourceSummary?,
    val isComplete: Boolean
)

/**
 * Resource summary for display.
 */
data class ResourceSummary(
    val lumber: Int,
    val stone: Int,
    val ore: Int,
    val gold: Int
)

/**
 * Analysis of rushing a construction project.
 */
data class RushAnalysis(
    val goldCostToRush: Int,
    val breakdown: Map<String, Int>,
    val worthRushing: Boolean,
    val recommendation: String
)
