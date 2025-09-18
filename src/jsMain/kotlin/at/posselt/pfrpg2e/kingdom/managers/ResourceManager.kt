package at.posselt.pfrpg2e.kingdom.managers

import at.posselt.pfrpg2e.kingdom.data.*

/**
 * Main orchestrator for the Reignmaker-lite resource management system.
 * Coordinates production, consumption, construction, and storage mechanics.
 */
class ResourceManager(
    private val worksiteManager: WorksiteManager,
    private val storageManager: StorageManager,
    private val constructionManager: ConstructionManager
) {
    
    /**
     * Process all resource operations for Phase 4 of the turn sequence.
     * This is called automatically during the Manage Resources phase.
     */
    fun processResourcePhase(
        worksites: RawWorksites,
        commodities: RawCommodities,
        gold: RawGold,
        storageBuildings: RawStorageBuildings,
        constructionProject: RawConstructionProject?,
        settlements: List<SettlementResourceInfo>,
        armies: List<ArmyResourceInfo>
    ): ResourcePhaseResult {
        // Step 1: Calculate production from worksites
        val production = worksiteManager.calculateTotalProduction(worksites)
        
        // Step 2: Calculate consumption from settlements and armies
        val consumption = calculateTotalConsumption(settlements, armies)
        
        // Step 3: Apply production to current resources
        var updatedCommodities = RawCommodities(
            food = commodities.food + production.food,
            lumber = commodities.lumber + production.lumber,
            stone = commodities.stone + production.stone,
            ore = commodities.ore + production.ore
        )
        
        // Step 4: Deduct consumption
        updatedCommodities = RawCommodities(
            food = (updatedCommodities.food - consumption.food).coerceAtLeast(0),
            lumber = updatedCommodities.lumber, // Not consumed
            stone = updatedCommodities.stone,   // Not consumed
            ore = updatedCommodities.ore        // Not consumed
        )
        
        // Step 5: Apply resources to construction if project exists
        var updatedProject = constructionProject
        if (constructionProject != null && !constructionProject.isComplete()) {
            val constructionResult = constructionManager.applyResourcesToProject(
                project = constructionProject,
                available = updatedCommodities,
                gold = gold.treasury
            )
            updatedProject = constructionResult.project
            updatedCommodities = constructionResult.remainingResources
        }
        
        // Step 6: Check for food shortage and apply unrest
        val foodShortage = consumption.food > (commodities.food + production.food)
        val unrestIncrease = if (foodShortage) 1 else 0
        
        return ResourcePhaseResult(
            commodities = updatedCommodities,
            constructionProject = updatedProject,
            unrestIncrease = unrestIncrease,
            production = production,
            consumption = consumption,
            foodShortage = foodShortage
        )
    }
    
    /**
     * Process end of turn resource loss (Phase 6).
     * Food is preserved up to storage capacity, other resources are lost if not stored.
     */
    fun processEndOfTurn(
        commodities: RawCommodities,
        storageBuildings: RawStorageBuildings,
        gold: RawGold
    ): EndOfTurnResult {
        // Calculate storage capacity
        val storageCapacity = storageManager.calculateTotalCapacity(storageBuildings)
        
        // Apply storage rules
        val storedCommodities = storageManager.applyStorageRules(commodities, storageCapacity)
        
        // Process gold (persists between turns)
        val updatedGold = gold.endTurn()
        
        return EndOfTurnResult(
            commodities = storedCommodities,
            gold = updatedGold,
            resourcesLost = calculateResourceLoss(commodities, storedCommodities)
        )
    }
    
    /**
     * Calculate total consumption from settlements and armies.
     */
    private fun calculateTotalConsumption(
        settlements: List<SettlementResourceInfo>,
        armies: List<ArmyResourceInfo>
    ): ResourceConsumption {
        val settlementFood = settlements.sumOf { it.foodConsumption }
        val armyFood = armies.sumOf { it.foodConsumption }
        
        return ResourceConsumption(
            food = settlementFood + armyFood
        )
    }
    
    /**
     * Calculate resources lost due to storage limitations.
     */
    private fun calculateResourceLoss(
        before: RawCommodities,
        after: RawCommodities
    ): ResourceLoss {
        return ResourceLoss(
            lumber = (before.lumber - after.lumber).coerceAtLeast(0),
            stone = (before.stone - after.stone).coerceAtLeast(0),
            ore = (before.ore - after.ore).coerceAtLeast(0)
        )
    }
    
    /**
     * Check if there are enough resources for a construction project.
     */
    fun canAffordConstruction(
        cost: RawConstructionCost,
        commodities: RawCommodities,
        gold: Int
    ): Boolean {
        return commodities.lumber >= cost.lumber &&
               commodities.stone >= cost.stone &&
               commodities.ore >= cost.ore &&
               gold >= cost.gold
    }
    
    /**
     * Preview the results of a trade action.
     */
    fun previewTrade(
        currentCommodities: RawCommodities,
        tradeRates: TradeRates,
        tradeType: TradeType,
        amount: Int
    ): TradePreview {
        return when (tradeType) {
            TradeType.SELL_FOOD -> TradePreview(
                commoditiesAfter = RawCommodities(
                    food = currentCommodities.food - amount,
                    lumber = currentCommodities.lumber,
                    stone = currentCommodities.stone,
                    ore = currentCommodities.ore
                ),
                goldGained = amount * tradeRates.foodSellRate,
                valid = currentCommodities.food >= amount
            )
            TradeType.BUY_FOOD -> TradePreview(
                commoditiesAfter = RawCommodities(
                    food = currentCommodities.food + amount,
                    lumber = currentCommodities.lumber,
                    stone = currentCommodities.stone,
                    ore = currentCommodities.ore
                ),
                goldCost = amount * tradeRates.foodBuyRate,
                valid = true // Gold check done elsewhere
            )
            TradeType.SELL_LUMBER -> TradePreview(
                commoditiesAfter = RawCommodities(
                    food = currentCommodities.food,
                    lumber = currentCommodities.lumber - amount,
                    stone = currentCommodities.stone,
                    ore = currentCommodities.ore
                ),
                goldGained = amount * tradeRates.lumberSellRate,
                valid = currentCommodities.lumber >= amount
            )
            TradeType.SELL_STONE -> TradePreview(
                commoditiesAfter = RawCommodities(
                    food = currentCommodities.food,
                    lumber = currentCommodities.lumber,
                    stone = currentCommodities.stone - amount,
                    ore = currentCommodities.ore
                ),
                goldGained = amount * tradeRates.stoneSellRate,
                valid = currentCommodities.stone >= amount
            )
            TradeType.SELL_ORE -> TradePreview(
                commoditiesAfter = RawCommodities(
                    food = currentCommodities.food,
                    lumber = currentCommodities.lumber,
                    stone = currentCommodities.stone,
                    ore = currentCommodities.ore - amount
                ),
                goldGained = amount * tradeRates.oreSellRate,
                valid = currentCommodities.ore >= amount
            )
        }
    }
}

/**
 * Result of processing the resource phase.
 */
data class ResourcePhaseResult(
    val commodities: RawCommodities,
    val constructionProject: RawConstructionProject?,
    val unrestIncrease: Int,
    val production: RawResourceYield,
    val consumption: ResourceConsumption,
    val foodShortage: Boolean
)

/**
 * Result of processing end of turn.
 */
data class EndOfTurnResult(
    val commodities: RawCommodities,
    val gold: RawGold,
    val resourcesLost: ResourceLoss
)

/**
 * Resources consumed per turn.
 */
data class ResourceConsumption(
    val food: Int
)

/**
 * Resources lost at end of turn.
 */
data class ResourceLoss(
    val lumber: Int,
    val stone: Int,
    val ore: Int
)

/**
 * Information about settlement resource needs.
 */
data class SettlementResourceInfo(
    val id: String,
    val name: String,
    val tier: Int, // 1=Village, 2=Town, 3=City, 4=Metropolis
    val foodConsumption: Int
)

/**
 * Information about army resource needs.
 */
data class ArmyResourceInfo(
    val id: String,
    val name: String,
    val size: Int,
    val foodConsumption: Int
)

/**
 * Trade types supported.
 */
enum class TradeType {
    SELL_FOOD,
    BUY_FOOD,
    SELL_LUMBER,
    SELL_STONE,
    SELL_ORE
}

/**
 * Trade exchange rates.
 */
data class TradeRates(
    val foodSellRate: Int = 1,    // Gold per food when selling
    val foodBuyRate: Int = 2,     // Gold per food when buying
    val lumberSellRate: Int = 1,  // Gold per lumber
    val stoneSellRate: Int = 1,   // Gold per stone
    val oreSellRate: Int = 2      // Gold per ore (more valuable)
)

/**
 * Preview of a trade transaction.
 */
data class TradePreview(
    val commoditiesAfter: RawCommodities,
    val goldGained: Int = 0,
    val goldCost: Int = 0,
    val valid: Boolean
)
