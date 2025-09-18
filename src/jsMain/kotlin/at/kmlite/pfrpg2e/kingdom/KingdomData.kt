package at.kmlite.pfrpg2e.kingdom

import at.kmlite.pfrpg2e.data.actor.Attribute
import at.kmlite.pfrpg2e.data.actor.Lore
import at.kmlite.pfrpg2e.data.actor.SkillRanks
import at.kmlite.pfrpg2e.data.kingdom.KingdomSkill
import at.kmlite.pfrpg2e.data.kingdom.leaders.Leader
import at.kmlite.pfrpg2e.data.kingdom.leaders.LeaderKingdomSkills
import at.kmlite.pfrpg2e.data.kingdom.leaders.LeaderSkills
import at.kmlite.pfrpg2e.data.kingdom.settlements.Settlement
import at.kmlite.pfrpg2e.data.kingdom.settlements.SettlementType
import at.kmlite.pfrpg2e.kingdom.data.RawConsumption
import at.kmlite.pfrpg2e.kingdom.data.RawCurrentCommodities
import at.kmlite.pfrpg2e.kingdom.data.RawFame
import at.kmlite.pfrpg2e.kingdom.data.RawGroup
import at.kmlite.pfrpg2e.kingdom.data.RawNotes
import at.kmlite.pfrpg2e.kingdom.data.RawGold
import at.kmlite.pfrpg2e.kingdom.data.RawWorksites
import at.kmlite.pfrpg2e.kingdom.data.RawStorageCapacity
import at.kmlite.pfrpg2e.kingdom.data.RawStorageBuildings
import at.kmlite.pfrpg2e.kingdom.data.RawConstructionProject
import at.kmlite.pfrpg2e.kingdom.modifiers.Modifier
import at.kmlite.pfrpg2e.kingdom.modifiers.evaluation.evaluateGlobalBonuses
import at.kmlite.pfrpg2e.kingdom.modifiers.evaluation.includeCapital
import at.kmlite.pfrpg2e.kingdom.modifiers.penalties.ArmyConditionInfo
import at.kmlite.pfrpg2e.kingdom.structures.RawSettlement
import at.kmlite.pfrpg2e.kingdom.structures.parseSettlement
import com.foundryvtt.core.Game
import js.array.component1
import js.array.component2
import kotlinx.js.JsPlainObject

@JsPlainObject
external interface KingdomSettings {
    var rpToXpConversionRate: Int
    var rpToXpConversionLimit: Int
    var settlementsGenerateRd: Boolean
    var ruinThreshold: Int
    var increaseScorePicksBy: Int
    var realmSceneId: String?
    var xpPerClaimedHex: Int
    var includeCapitalItemModifier: Boolean
    var cultOfTheBloomEvents: Boolean
    var autoCalculateSettlementLevel: Boolean
    var vanceAndKerensharaXP: Boolean
    var capitalInvestmentInCapital: Boolean
    var reduceDCToBuildLumberStructures: Boolean
    var kingdomSkillIncreaseEveryLevel: Boolean
    var kingdomAllStructureItemBonusesStack: Boolean
    var kingdomIgnoreSkillRequirements: Boolean
    var autoCalculateArmyConsumption: Boolean
    var enableLeadershipModifiers: Boolean
    var expandMagicUse: Boolean
    var kingdomEventRollMode: String
    var automateResources: String
    var proficiencyMode: String
    var kingdomEventsTable: String?
    var kingdomCultTable: String?
    var maximumFamePoints: Int
    var leaderKingdomSkills: RawLeaderKingdomSkills
    var leaderSkills: RawLeaderSkills
    var automateStats: Boolean
    var recruitableArmiesFolderId: String?
    var eventDc: Int
    var eventDcStep: Int
    var cultEventDc: Int
    var cultEventDcStep: Int
    var partialStructureConstruction: Boolean
    var enableRefactoredActions: Boolean?
    var enableUnrestIncidents: Boolean?
    var enableKingdomEvents: Boolean?
}

@JsPlainObject
external interface RawLeaderKingdomSkills {
    var ruler: Array<String>
    var counselor: Array<String>
    var emissary: Array<String>
    var general: Array<String>
    var magister: Array<String>
    var treasurer: Array<String>
    var viceroy: Array<String>
    var warden: Array<String>
}

@JsPlainObject
external interface RawLeaderSkills {
    var ruler: Array<String>
    var counselor: Array<String>
    var emissary: Array<String>
    var general: Array<String>
    var magister: Array<String>
    var treasurer: Array<String>
    var viceroy: Array<String>
    var warden: Array<String>
}

@JsPlainObject
external interface KingdomData {
    var name: String
    var selectedCharacterId: String? // ID of the character selected for skill checks
    var atWar: Boolean
    var fame: RawFame
    var level: Int
    var xpThreshold: Int
    var xp: Int
    var size: Int
    var unrest: Int
    
    // NEW Reignmaker-lite resource system
    var gold: RawGold                                // Persistent currency
    var worksites: RawWorksites                      // Production sites on hexes
    var storageCapacity: RawStorageCapacity          // Resource storage limits
    var storageBuildings: RawStorageBuildings        // Storage structure tracking
    var constructionQueue: RawConstructionProject?   // Current building project
    var currentTurnPhase: String?                    // Track turn progress (phase1-6)
    
    // SIMPLIFIED consumption (just food now)
    var consumption: RawConsumption
    var commodities: RawCurrentCommodities  // No luxuries
    
    // Existing fields that remain
    var settings: KingdomSettings
    var activeSettlement: String?
    var turnsWithoutCultEvent: Int
    var turnsWithoutEvent: Int
    var notes: RawNotes
    
    // Keep these for now - user can review later
    var ongoingEvents: Array<RawOngoingKingdomEvent>?
    var modifiers: Array<RawModifier>?
    var settlements: Array<RawSettlement>
    var groups: Array<RawGroup>?
}

fun RawLeaderKingdomSkills.hasSkill(leader: Leader, skill: KingdomSkill) =
    when (leader) {
        Leader.RULER -> ruler.contains(skill.value)
        Leader.COUNSELOR -> counselor.contains(skill.value)
        Leader.EMISSARY -> emissary.contains(skill.value)
        Leader.GENERAL -> general.contains(skill.value)
        Leader.MAGISTER -> magister.contains(skill.value)
        Leader.TREASURER -> treasurer.contains(skill.value)
        Leader.VICEROY -> viceroy.contains(skill.value)
        Leader.WARDEN -> warden.contains(skill.value)
    }

fun RawLeaderSkills.hasAttribute(leader: Leader, attribute: Attribute) =
    when (leader) {
        Leader.RULER -> ruler.contains(attribute.value)
        Leader.COUNSELOR -> counselor.contains(attribute.value)
        Leader.EMISSARY -> emissary.contains(attribute.value)
        Leader.GENERAL -> general.contains(attribute.value)
        Leader.MAGISTER -> magister.contains(attribute.value)
        Leader.TREASURER -> treasurer.contains(attribute.value)
        Leader.VICEROY -> viceroy.contains(attribute.value)
        Leader.WARDEN -> warden.contains(attribute.value)
    }

fun RawLeaderSkills.deleteLore(attribute: Attribute) = RawLeaderSkills(
    ruler = ruler.filter { it != attribute.value }.toTypedArray(),
    counselor = counselor.filter { it != attribute.value }.toTypedArray(),
    emissary = emissary.filter { it != attribute.value }.toTypedArray(),
    general = general.filter { it != attribute.value }.toTypedArray(),
    magister = magister.filter { it != attribute.value }.toTypedArray(),
    treasurer = treasurer.filter { it != attribute.value }.toTypedArray(),
    viceroy = viceroy.filter { it != attribute.value }.toTypedArray(),
    warden = warden.filter { it != attribute.value }.toTypedArray(),
)

// REMOVED: Functions that depended on deleted types (vacancies, getTrainedSkills, parseSkillRanks, 
// hasAssurance, parseAbilityScores, hasLeaderUuid, parseLeaderActors)

// Keep these leader-related functions for now - user can review
fun RawLeaderSkills.parse() = LeaderSkills(
    ruler = ruler.map { Attribute.fromString(it) },
    counselor = counselor.map { Attribute.fromString(it) },
    emissary = emissary.map { Attribute.fromString(it) },
    general = general.map { Attribute.fromString(it) },
    magister = magister.map { Attribute.fromString(it) },
    treasurer = treasurer.map { Attribute.fromString(it) },
    viceroy = viceroy.map { Attribute.fromString(it) },
    warden = warden.map { Attribute.fromString(it) },
)

fun RawLeaderKingdomSkills.parse() = LeaderKingdomSkills(
    ruler = ruler.mapNotNull { KingdomSkill.fromString(it) },
    counselor = counselor.mapNotNull { KingdomSkill.fromString(it) },
    emissary = emissary.mapNotNull { KingdomSkill.fromString(it) },
    general = general.mapNotNull { KingdomSkill.fromString(it) },
    magister = magister.mapNotNull { KingdomSkill.fromString(it) },
    treasurer = treasurer.mapNotNull { KingdomSkill.fromString(it) },
    viceroy = viceroy.mapNotNull { KingdomSkill.fromString(it) },
    warden = warden.mapNotNull { KingdomSkill.fromString(it) }
)

data class SettlementResult(
    val allSettlements: List<Settlement>,
    val capital: Settlement?,
    val current: Settlement?,
)

// TODO: Review createModifiers - may need updating for new system
suspend fun KingdomData.createModifiers(
    settlements: SettlementResult,
    armyConditions: ArmyConditionInfo? = null,
): List<Modifier> {
    val allSettlements = settlements.allSettlements
    val globalBonuses = evaluateGlobalBonuses(allSettlements)
    val currentSettlement = settlements.current?.let {
        includeCapital(
            settlement = it,
            capital = settlements.capital,
            capitalModifierFallbackEnabled = settings.includeCapitalItemModifier
        )
    }
    // checkModifiers function needs to be reviewed/updated
    return emptyList() // Stub for now
}

fun KingdomData.getAllSettlements(game: Game): SettlementResult {
    val settlementAndActive = settlements.mapNotNull { raw ->
        val scene = game.scenes.get(raw.sceneId)
        if (scene == null) {
            null
        } else {
            val active = raw.sceneId == activeSettlement
            scene.parseSettlement(
                raw,
                settings.autoCalculateSettlementLevel,
                settings.kingdomAllStructureItemBonusesStack,
                settings.capitalInvestmentInCapital,
            ) to active
        }
    }
    val allSettlements = settlementAndActive.map { it.component1() }
    return SettlementResult(
        allSettlements = allSettlements,
        capital = allSettlements.find { it.type == SettlementType.CAPITAL },
        current = settlementAndActive.find { it.component2() }?.first,
    )
}


fun Game.getKingdomActors(): List<KingdomActor> =
    actors.contents
        .filterIsInstance<KingdomActor>()
        .filter { it.getKingdom() != null }
