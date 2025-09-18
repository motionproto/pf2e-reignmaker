package at.posselt.pfrpg2e.kingdom.data

import kotlinx.js.JsPlainObject

/**
 * Tracks a construction project in progress.
 * Resources are automatically applied each turn until the project is complete.
 */
@JsPlainObject
external interface RawConstructionProject {
    var structureId: String      // ID of the structure being built
    var structureName: String    // Name for display purposes
    var settlementId: String     // Settlement where it's being built
    var tier: Int                // Structure tier (1-4)
    var totalCost: RawConstructionCost  // Total resources needed
    var invested: RawConstructionCost   // Resources invested so far
    var turnsActive: Int         // How many turns the project has been active
}

/**
 * Resource costs for construction.
 * Different from commodities as it doesn't include food.
 */
@JsPlainObject
external interface RawConstructionCost {
    var lumber: Int
    var stone: Int
    var ore: Int
    var gold: Int  // Optional gold cost for some structures
}

/**
 * Apply available resources to a construction project.
 * Returns the updated project and any leftover resources.
 */
fun RawConstructionProject.applyResources(
    available: RawResourceYield,
    gold: Int = 0
): Pair<RawConstructionProject, RawResourceYield> {
    
    // Calculate how much of each resource we can apply
    val lumberToApply = minOf(
        available.lumber, 
        totalCost.lumber - invested.lumber
    )
    val stoneToApply = minOf(
        available.stone, 
        totalCost.stone - invested.stone
    )
    val oreToApply = minOf(
        available.ore, 
        totalCost.ore - invested.ore
    )
    val goldToApply = minOf(
        gold,
        totalCost.gold - invested.gold
    )
    
    // Update the project
    val updatedProject = RawConstructionProject(
        structureId = structureId,
        structureName = structureName,
        settlementId = settlementId,
        tier = tier,
        totalCost = totalCost,
        invested = RawConstructionCost(
            lumber = invested.lumber + lumberToApply,
            stone = invested.stone + stoneToApply,
            ore = invested.ore + oreToApply,
            gold = invested.gold + goldToApply
        ),
        turnsActive = turnsActive + 1
    )
    
    // Calculate leftover resources
    val leftover = RawResourceYield(
        food = available.food,  // Food is never used for construction
        lumber = available.lumber - lumberToApply,
        stone = available.stone - stoneToApply,
        ore = available.ore - oreToApply
    )
    
    return updatedProject to leftover
}

/**
 * Check if a construction project is complete.
 */
fun RawConstructionProject.isComplete(): Boolean {
    return invested.lumber >= totalCost.lumber &&
           invested.stone >= totalCost.stone &&
           invested.ore >= totalCost.ore &&
           invested.gold >= totalCost.gold
}

/**
 * Calculate remaining resources needed for a project.
 */
fun RawConstructionProject.remainingCost(): RawConstructionCost {
    return RawConstructionCost(
        lumber = (totalCost.lumber - invested.lumber).coerceAtLeast(0),
        stone = (totalCost.stone - invested.stone).coerceAtLeast(0),
        ore = (totalCost.ore - invested.ore).coerceAtLeast(0),
        gold = (totalCost.gold - invested.gold).coerceAtLeast(0)
    )
}

/**
 * Calculate completion percentage for display.
 */
fun RawConstructionProject.completionPercentage(): Int {
    val totalRequired = totalCost.lumber + totalCost.stone + totalCost.ore + totalCost.gold
    if (totalRequired == 0) return 100
    
    val totalInvested = invested.lumber + invested.stone + invested.ore + invested.gold
    return ((totalInvested * 100) / totalRequired).coerceIn(0, 100)
}

/**
 * Standard construction costs by tier.
 * These are guidelines; specific structures may vary.
 */
object ConstructionCosts {
    val TIER_1 = RawConstructionCost(
        lumber = 1,
        stone = 1,
        ore = 0,
        gold = 0
    )
    
    val TIER_2 = RawConstructionCost(
        lumber = 2,
        stone = 2,
        ore = 0,
        gold = 0
    )
    
    val TIER_3 = RawConstructionCost(
        lumber = 3,
        stone = 3,
        ore = 2,
        gold = 0
    )
    
    val TIER_4 = RawConstructionCost(
        lumber = 4,
        stone = 4,
        ore = 4,
        gold = 2
    )
    
    fun getByTier(tier: Int): RawConstructionCost = when (tier) {
        1 -> TIER_1
        2 -> TIER_2
        3 -> TIER_3
        4 -> TIER_4
        else -> TIER_1
    }
}
