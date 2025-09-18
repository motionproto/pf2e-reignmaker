package at.kmlite.pfrpg2e.kingdom

import at.kmlite.pfrpg2e.data.actor.Proficiency
import at.kmlite.pfrpg2e.data.armies.findMaximumArmyTactics
import at.kmlite.pfrpg2e.data.kingdom.KingdomSkill
import at.kmlite.pfrpg2e.data.kingdom.KingdomSkillRank
import at.kmlite.pfrpg2e.data.kingdom.KingdomSkillRanks
import at.kmlite.pfrpg2e.data.kingdom.RealmData
import at.kmlite.pfrpg2e.data.kingdom.activities.ActivityDcType
import at.kmlite.pfrpg2e.data.kingdom.calculateControlDC
import at.kmlite.pfrpg2e.kingdom.modifiers.Modifier
import at.kmlite.pfrpg2e.utils.asSequence
import at.kmlite.pfrpg2e.utils.t
import js.array.component1
import js.array.component2
import js.objects.JsPlainObject
import js.objects.Record
import js.objects.recordOf
import kotlin.math.max

typealias KingdomDc = Any // number or control, custom, none, scouting, negotiation, negotiationOrControl

@JsPlainObject
external interface ActivityResult {
    var msg: String
    val modifiers: Array<RawModifier>
}

// TODO: Review if button insertion is still needed
private fun ActivityResult.addButtons(events: Array<RawKingdomEvent>): ActivityResult =
    ActivityResult.copy(
        this,
        msg = msg, // Stub - insertButtons function removed
        modifiers = modifiers
    )

@JsPlainObject
external interface RawActivity {
    var id: String
    var actions: Int?
    var title: String
    var description: String
    var requirement: String?
    var special: String?
    var skills: Record<String, Int>
    var phase: String
    var dc: KingdomDc
    var dcAdjustment: Int?
    var enabled: Boolean
    var automationNotes: String?
    var fortune: Boolean
    var oncePerRound: Boolean
    var hint: String?
    var criticalSuccess: ActivityResult?
    var success: ActivityResult?
    var failure: ActivityResult?
    var criticalFailure: ActivityResult?
    var modifiers: Array<RawModifier>?
    val order: Int?
}

// Simplified - removed ChosenFeat dependency
fun RawActivity.canBePerformed(
    allowCapitalInvestment: Boolean,
    kingdomSkillRanks: KingdomSkillRanks,
    kingdom: KingdomData,
): Boolean = (allowCapitalInvestment || id != "capital-investment")
        && (kingdom.settings.kingdomIgnoreSkillRequirements || 
            // TODO: Implement skill check without getValidActivitySkills dialog function
            true // Stub for now - always allow activities
        )

// Simplified - removed ChosenFeature dependency  
fun RawActivity.label(
    kingdomLevel: Int,
    activity: RawActivity,
): String {
    val id = activity.id
    val activityHints = if (id == "train-army") {
        t("kingdom.maxArmyTactics", recordOf("count" to findMaximumArmyTactics(kingdomLevel)))
    } else {
        null
    }
    val skillRanks = activity.skillRanks()
    val proficiency = if (skillRanks.all { it.proficiency >= Proficiency.LEGENDARY }) {
        t(Proficiency.LEGENDARY)
    } else if (skillRanks.all { it.proficiency >= Proficiency.MASTER }) {
        t(Proficiency.MASTER)
    } else if (skillRanks.all { it.proficiency >= Proficiency.EXPERT }) {
        t(Proficiency.EXPERT)
    } else if (skillRanks.all { it.proficiency >= Proficiency.TRAINED }) {
        t(Proficiency.TRAINED)
    } else {
        null
    }
    val oncePerRound = if (activity.oncePerRound) t("kingdom.oncePerRound") else null
    val hints = listOfNotNull(activityHints, oncePerRound, activity.hint, proficiency).joinToString(", ")
    return if (hints.isEmpty()) {
        activity.title
    } else {
        "${activity.title} ($hints)"
    }
}

@JsModule("./player-actions.json")
private external val rawPlayerActions: Array<RawActivity>

val disabledActivityIds = rawPlayerActions
    .filterNot { it.enabled }
    .map { it.id }
    .toTypedArray()

private var kingdomActivities: Array<RawActivity> = emptyArray()

private fun ActivityResult.translate(): ActivityResult =
    ActivityResult.copy(
        this,
        msg = t(msg),
    )

private fun RawActivity.translate(): RawActivity =
    RawActivity.copy(
        this,
        title = t(title),
        description = t(description),
        requirement = requirement?.let { t(it) },
        special = special?.let { t(it) },
        automationNotes = automationNotes?.let { t(it) },
        hint = hint?.let { t(it) },
        criticalSuccess = criticalSuccess?.translate(),
        success = success?.translate(),
        failure = failure?.translate(),
        criticalFailure = criticalFailure?.translate(),
    )

fun translateActivities(events: Array<RawKingdomEvent>) {
    kingdomActivities = rawPlayerActions
        .map {
            val translated = it.translate()
            RawActivity.copy(
                translated,
                description = translated.description, // Stub - insertButtons removed
                criticalSuccess = translated.criticalSuccess?.addButtons(events),
                success = translated.success?.addButtons(events),
                failure = translated.failure?.addButtons(events),
                criticalFailure = translated.criticalFailure?.addButtons(events),
            )
        }
        .toTypedArray()
}

fun KingdomData.getAllActivities(): List<RawActivity> {
    // Simplified - homebrewActivities field removed from KingdomData
    return kingdomActivities.toList()
}

fun KingdomData.getActivity(id: String): RawActivity? =
    getAllActivities().associateBy { it.id }[id]

suspend fun RawActivity.resolveDc(
    enemyArmyScoutingDcs: List<Int>,
    kingdomLevel: Int,
    realm: RealmData,
    rulerVacant: Boolean,
    groupDc: Int?,
    eventModifier: Int?,
): Int? {
    val dc = when (dc) {
        ActivityDcType.CONTROL.value -> calculateControlDC(
            kingdomLevel = kingdomLevel,
            realm = realm,
            rulerVacant = rulerVacant,
        )
        ActivityDcType.EVENT.value -> calculateControlDC(
            kingdomLevel = kingdomLevel,
            realm = realm,
            rulerVacant = rulerVacant,
        ) + (eventModifier ?: 0)
        ActivityDcType.NEGOTIATION_OR_CONTROL.value -> max(calculateControlDC(
            kingdomLevel = kingdomLevel,
            realm = realm,
            rulerVacant = rulerVacant,
        ), (groupDc ?: 0))
        ActivityDcType.NEGOTIATION.value -> groupDc
        ActivityDcType.CUSTOM.value -> null // TODO: askDc dialog removed - need alternate implementation
        ActivityDcType.NONE.value -> null
        ActivityDcType.SCOUTING.value -> enemyArmyScoutingDcs.maxOrNull() ?: 0
        else -> dc as Int
    }
    return dc?.let { it + (dcAdjustment ?: 0) }
}

fun RawActivity.parseModifiers(): List<Modifier> =
    modifiers?.map { it.parse() }.orEmpty()

fun RawActivity.skillRanks(): Set<KingdomSkillRank> =
    skills.asSequence()
        .mapNotNull { (name, rank) ->
            KingdomSkill.fromString(name)?.let {
                KingdomSkillRank(skill = it, rank = rank)
            }
        }
        .toSet()
