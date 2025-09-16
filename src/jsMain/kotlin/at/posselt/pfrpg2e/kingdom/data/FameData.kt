package at.posselt.pfrpg2e.kingdom.data

import kotlinx.js.JsPlainObject
import kotlinx.serialization.Serializable

/**
 * Enhanced Fame data model for Reignmaker-lite Fame System
 * Tracks fame points, reroll usage, and critical success bonuses
 */
@JsPlainObject
external interface FameData {
    var current: Int
    var maximum: Int
    var usedForRerolls: Array<String>
    var gainedFromCriticals: Int
    // Legacy fields from RawFame for compatibility
    var now: Int
    var next: Int
    var type: String?
}

/**
 * Creates a new FameData instance with default values
 */
fun createFameData(
    current: Int = 0,
    maximum: Int = 10,
    usedForRerolls: Array<String> = emptyArray(),
    gainedFromCriticals: Int = 0,
    now: Int = current,
    next: Int = 0,
    type: String? = null
): FameData = object : FameData {
    override var current = current
    override var maximum = maximum
    override var usedForRerolls = usedForRerolls
    override var gainedFromCriticals = gainedFromCriticals
    override var now = now
    override var next = next
    override var type = type
}

/**
 * Extension functions for FameData
 */
fun FameData.canUseForReroll(checkId: String): Boolean = 
    current > 0 && checkId !in usedForRerolls

fun FameData.useForReroll(checkId: String): FameData = 
    if (canUseForReroll(checkId)) {
        createFameData(
            current = current - 1,
            maximum = maximum,
            usedForRerolls = usedForRerolls + checkId,
            gainedFromCriticals = gainedFromCriticals,
            now = current - 1,
            next = next,
            type = type
        )
    } else {
        this
    }

fun FameData.gainFromCritical(): FameData = 
    createFameData(
        current = (current + 1).coerceAtMost(maximum),
        maximum = maximum,
        usedForRerolls = usedForRerolls,
        gainedFromCriticals = gainedFromCriticals + 1,
        now = (current + 1).coerceAtMost(maximum),
        next = next,
        type = type
    )

fun FameData.startNewTurn(): FameData = 
    createFameData(
        current = 1,
        maximum = maximum,
        usedForRerolls = emptyArray(),
        gainedFromCriticals = 0,
        now = 1,
        next = 0,
        type = type
    )

fun FameData.endTurn(): FameData = 
    createFameData(
        current = 0,
        maximum = maximum,
        usedForRerolls = emptyArray(),
        gainedFromCriticals = 0,
        now = 0,
        next = 0,
        type = type
    )
