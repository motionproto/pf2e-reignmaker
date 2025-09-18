package at.posselt.pfrpg2e.kingdom.data

import kotlinx.js.JsPlainObject

/**
 * Tracks storage capacity for resources in Reignmaker-lite.
 * Food can be stockpiled, while Lumber/Stone/Ore have limited storage
 * and are lost if unused at end of turn.
 */
@JsPlainObject
external interface RawStorageCapacity {
    var food: Int      // Can be stored across turns
    var lumber: Int    // Lost if unused at end of turn
    var stone: Int     // Lost if unused at end of turn
    var ore: Int       // Lost if unused at end of turn
    // Gold has no storage limit
}

/**
 * Tracks storage buildings in settlements.
 * These provide cumulative storage bonuses.
 */
@JsPlainObject
external interface RawStorageBuildings {
    var granaries: Int          // T1: +4 food
    var storehouses: Int        // T2: +8 food, +4 lumber
    var warehouses: Int         // T3: +16 food, +8 lumber, +4 stone, +4 ore
    var strategicReserves: Int  // T4: +36 food, +18 lumber, +9 stone, +9 ore
}

/**
 * Calculate total storage capacity from buildings.
 * Storage bonuses are cumulative across all settlements.
 */
fun RawStorageBuildings.calculateCapacity(): RawStorageCapacity {
    val foodCapacity = 
        (granaries * 4) +
        (storehouses * 8) +
        (warehouses * 16) +
        (strategicReserves * 36)
        
    val lumberCapacity = 
        (storehouses * 4) +
        (warehouses * 8) +
        (strategicReserves * 18)
        
    val stoneCapacity = 
        (warehouses * 4) +
        (strategicReserves * 9)
        
    val oreCapacity = 
        (warehouses * 4) +
        (strategicReserves * 9)
        
    return RawStorageCapacity(
        food = foodCapacity,
        lumber = lumberCapacity,
        stone = stoneCapacity,
        ore = oreCapacity
    )
}

/**
 * Apply storage limits to commodities.
 * Resources exceeding storage capacity are lost.
 */
fun RawCommodities.applyStorageLimits(capacity: RawStorageCapacity): RawCommodities {
    return RawCommodities(
        food = food.coerceIn(0, capacity.food),
        lumber = lumber.coerceIn(0, capacity.lumber),
        stone = stone.coerceIn(0, capacity.stone),
        ore = ore.coerceIn(0, capacity.ore)
    )
}

/**
 * Process end of turn storage.
 * Food is preserved up to capacity, other resources are lost if no storage.
 */
fun RawCommodities.processEndOfTurnStorage(capacity: RawStorageCapacity): RawCommodities {
    return RawCommodities(
        food = food.coerceIn(0, capacity.food),  // Food preserved up to capacity
        lumber = if (capacity.lumber > 0) lumber.coerceIn(0, capacity.lumber) else 0,  // Lost without storage
        stone = if (capacity.stone > 0) stone.coerceIn(0, capacity.stone) else 0,      // Lost without storage
        ore = if (capacity.ore > 0) ore.coerceIn(0, capacity.ore) else 0               // Lost without storage
    )
}
