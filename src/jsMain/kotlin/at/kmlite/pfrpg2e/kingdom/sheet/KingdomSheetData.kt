package at.kmlite.pfrpg2e.kingdom.sheet

import at.kmlite.pfrpg2e.kingdom.data.MilestoneChoice
import at.kmlite.pfrpg2e.kingdom.data.RawAbilityBoostChoices
import at.kmlite.pfrpg2e.kingdom.data.RawAbilityScores
import at.kmlite.pfrpg2e.kingdom.data.RawBonusFeat
import at.kmlite.pfrpg2e.kingdom.data.RawCharterChoices
import at.kmlite.pfrpg2e.kingdom.data.RawConsumption
import at.kmlite.pfrpg2e.kingdom.data.RawCurrentCommodities
import at.kmlite.pfrpg2e.kingdom.data.RawFame
import at.kmlite.pfrpg2e.kingdom.data.RawFeatureChoices
import at.kmlite.pfrpg2e.kingdom.data.RawGovernmentChoices
import at.kmlite.pfrpg2e.kingdom.data.RawGroup
import at.kmlite.pfrpg2e.kingdom.data.RawHeartlandChoices
import at.kmlite.pfrpg2e.kingdom.data.RawLeaders
import at.kmlite.pfrpg2e.kingdom.data.RawNotes
import at.kmlite.pfrpg2e.kingdom.data.RawResources
import at.kmlite.pfrpg2e.kingdom.data.RawRuin
import at.kmlite.pfrpg2e.kingdom.data.RawSkillRanks
import at.kmlite.pfrpg2e.kingdom.data.RawWorkSites
import kotlinx.js.JsPlainObject

@JsPlainObject
external interface KingdomSheetData {
    val name: String
    val atWar: Boolean
    val fame: RawFame
    val level: Int
    val xpThreshold: Int
    val xp: Int
    val size: Int
    val unrest: Int
    val resourcePoints: RawResources
    val resourceDice: RawResources
    val workSites: RawWorkSites
    val consumption: RawConsumption
    val supernaturalSolutions: Int
    val creativeSolutions: Int
    val commodities: RawCurrentCommodities
    val ruin: RawRuin
    val activeSettlement: String?
    val notes: RawNotes
    val leaders: RawLeaders
    var charter: RawCharterChoices
    var heartland: RawHeartlandChoices
    var government: RawGovernmentChoices
    var abilityBoosts: RawAbilityBoostChoices
    var features: Array<RawFeatureChoices>
    var bonusFeats: Array<RawBonusFeat>
    var groups: Array<RawGroup>
    val skillRanks: RawSkillRanks
    val abilityScores: RawAbilityScores
    val milestones: Array<MilestoneChoice>
    val ongoingEvent: String?
    val bonusFeat: String?
    val initialProficiencies: Array<String?>
    val activeLeader: String?
}