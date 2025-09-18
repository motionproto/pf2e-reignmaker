package at.kmlite.pfrpg2e.kingdom.sheet

import at.kmlite.pfrpg2e.data.kingdom.KingdomSkill.*
import at.kmlite.pfrpg2e.kingdom.KingdomData
import at.kmlite.pfrpg2e.kingdom.KingdomSettings
import at.kmlite.pfrpg2e.kingdom.RawLeaderKingdomSkills
import at.kmlite.pfrpg2e.kingdom.RawLeaderSkills
import at.kmlite.pfrpg2e.kingdom.data.RawAbilityBoostChoices
import at.kmlite.pfrpg2e.kingdom.data.RawAbilityScores
import at.kmlite.pfrpg2e.kingdom.data.RawCharterChoices
import at.kmlite.pfrpg2e.kingdom.data.RawCommodities
import at.kmlite.pfrpg2e.kingdom.data.RawConsumption
import at.kmlite.pfrpg2e.kingdom.data.RawCurrentCommodities
import at.kmlite.pfrpg2e.kingdom.data.RawFame
import at.kmlite.pfrpg2e.kingdom.data.RawGovernmentChoices
import at.kmlite.pfrpg2e.kingdom.data.RawHeartlandChoices
import at.kmlite.pfrpg2e.kingdom.data.RawLeaderValues
import at.kmlite.pfrpg2e.kingdom.data.RawLeaders
import at.kmlite.pfrpg2e.kingdom.data.RawNotes
import at.kmlite.pfrpg2e.kingdom.data.RawSkillRanks
import at.kmlite.pfrpg2e.kingdom.data.RawGold
import at.kmlite.pfrpg2e.kingdom.data.RawWorksites
import at.kmlite.pfrpg2e.kingdom.data.RawStorageCapacity
import at.kmlite.pfrpg2e.kingdom.data.RawStorageBuildings
import at.kmlite.pfrpg2e.kingdom.disabledActivityIds
import at.kmlite.pfrpg2e.kingdom.initialMilestoneChoices

fun createKingdomDefaults(name: String) =
    KingdomData(
        name = name,
        atWar = false,
        fame = RawFame(type = "famous", now = 0, next = 0),
        level = 1,
        xpThreshold = 1000,
        xp = 0,
        size = 1,
        unrest = 0,
        // NEW Reignmaker-lite resource system
        gold = RawGold(treasury = 0, income = 0, upkeep = 0),
        worksites = RawWorksites(sites = emptyArray()),
        storageCapacity = RawStorageCapacity(food = 0, lumber = 0, stone = 0, ore = 0),
        storageBuildings = RawStorageBuildings(
            granaries = 0,
            storehouses = 0,
            warehouses = 0,
            strategicReserves = 0
        ),
        constructionQueue = null,
        currentTurnPhase = null,
        consumption = RawConsumption(armies = 0, now = 0, next = 0),
        settings = KingdomSettings(
            eventDc = 16,
            eventDcStep = 5,
            cultEventDc = 20,
            cultEventDcStep = 2,
            rpToXpConversionRate = 1,
            rpToXpConversionLimit = 120,
            automateStats = true,
            ruinThreshold = 10,
            increaseScorePicksBy = 0,
            settlementsGenerateRd = false,
            realmSceneId = null,
            xpPerClaimedHex = 10,
            includeCapitalItemModifier = true,
            cultOfTheBloomEvents = false,
            autoCalculateSettlementLevel = true,
            vanceAndKerensharaXP = false,
            capitalInvestmentInCapital = false,
            reduceDCToBuildLumberStructures = false,
            kingdomSkillIncreaseEveryLevel = false,
            kingdomAllStructureItemBonusesStack = false,
            kingdomIgnoreSkillRequirements = false,
            autoCalculateArmyConsumption = true,
            enableLeadershipModifiers = false,
            expandMagicUse = false,
            partialStructureConstruction = false,
            enableRefactoredActions = true,
            enableUnrestIncidents = true, // Unrest incident system enabled
            enableKingdomEvents = false, // Kingdom events disabled by default (Phase 4)
            kingdomEventRollMode = "gmroll",
            automateResources = "kingmaker",
            proficiencyMode = "none",
            kingdomEventsTable = null,
            kingdomCultTable = null,
            maximumFamePoints = 3,
            leaderKingdomSkills = RawLeaderKingdomSkills(
                ruler = arrayOf(INDUSTRY, INTRIGUE, POLITICS, STATECRAFT, WARFARE).map { it.value }.toTypedArray(),
                counselor = arrayOf(ARTS, FOLKLORE, POLITICS, SCHOLARSHIP, TRADE).map { it.value }.toTypedArray(),
                emissary = arrayOf(INTRIGUE, MAGIC, POLITICS, STATECRAFT, TRADE).map { it.value }.toTypedArray(),
                general = arrayOf(BOATING, DEFENSE, ENGINEERING, EXPLORATION, WARFARE).map { it.value }.toTypedArray(),
                magister = arrayOf(DEFENSE, FOLKLORE, MAGIC, SCHOLARSHIP, WILDERNESS).map { it.value }.toTypedArray(),
                treasurer = arrayOf(ARTS, BOATING, INDUSTRY, INTRIGUE, TRADE).map { it.value }.toTypedArray(),
                viceroy = arrayOf(AGRICULTURE, ENGINEERING, INDUSTRY, SCHOLARSHIP, WILDERNESS).map { it.value }
                    .toTypedArray(),
                warden = arrayOf(AGRICULTURE, BOATING, DEFENSE, EXPLORATION, WILDERNESS).map { it.value }
                    .toTypedArray(),
            ),
            leaderSkills = RawLeaderSkills(
                ruler = arrayOf(
                    "diplomacy",
                    "deception",
                    "intimidation",
                    "performance",
                    "society",
                    "heraldry",
                    "politics",
                    "ruler"
                ),
                counselor = arrayOf(
                    "diplomacy",
                    "deception",
                    "performance",
                    "religion",
                    "society",
                    "academia",
                    "art",
                    "counselor"
                ),
                emissary = arrayOf(
                    "diplomacy",
                    "deception",
                    "intimidation",
                    "stealth",
                    "thievery",
                    "politics",
                    "underworld",
                    "emissary"
                ),
                general = arrayOf(
                    "diplomacy",
                    "athletics",
                    "crafting",
                    "intimidation",
                    "survival",
                    "scouting",
                    "warfare",
                    "general"
                ),
                magister = arrayOf(
                    "diplomacy",
                    "arcana",
                    "nature",
                    "occultism",
                    "religion",
                    "academia",
                    "scribing",
                    "magister"
                ),
                treasurer = arrayOf(
                    "diplomacy",
                    "crafting",
                    "medicine",
                    "society",
                    "thievery",
                    "labor",
                    "mercantile",
                    "treasurer"
                ),
                viceroy = arrayOf(
                    "diplomacy",
                    "crafting",
                    "medicine",
                    "nature",
                    "society",
                    "architecture",
                    "engineering",
                    "viceroy"
                ),
                warden = arrayOf(
                    "diplomacy",
                    "athletics",
                    "nature",
                    "stealth",
                    "survival",
                    "farming",
                    "hunting",
                    "warden"
                ),
            ),
        ),
        heartlandBlacklist = emptyArray(),
        commodities = RawCurrentCommodities(
            now = RawCommodities(
                food = 0,
                lumber = 0,
                ore = 0,
                stone = 0,
            ),
            next = RawCommodities(
                food = 0,
                lumber = 0,
                ore = 0,
                stone = 0,
            ),
        ),
        activeSettlement = null,
        turnsWithoutCultEvent = 0,
        turnsWithoutEvent = 0,
        notes = RawNotes(
            gm = "",
            public = ""
        ),
        homebrewMilestones = emptyArray(),
        homebrewActivities = emptyArray(),
        homebrewCharters = emptyArray(),
        homebrewGovernments = emptyArray(),
        homebrewHeartlands = emptyArray(),
        homebrewFeats = emptyArray(),
        featBlacklist = emptyArray(),
        activityBlacklist = disabledActivityIds,
        modifiers = emptyArray(),
        settlements = emptyArray(),
        leaders = RawLeaders(
            ruler = RawLeaderValues(
                invested = false,
                type = "pc",
                vacant = false,
            ),
            counselor = RawLeaderValues(
                invested = false,
                type = "pc",
                vacant = false,
            ),
            emissary = RawLeaderValues(
                invested = false,
                type = "pc",
                vacant = false,
            ),
            general = RawLeaderValues(
                invested = false,
                type = "pc",
                vacant = false,
            ),
            magister = RawLeaderValues(
                invested = false,
                type = "pc",
                vacant = false,
            ),
            treasurer = RawLeaderValues(
                invested = false,
                type = "pc",
                vacant = false,
            ),
            viceroy = RawLeaderValues(
                invested = false,
                type = "pc",
                vacant = false,
            ),
            warden = RawLeaderValues(
                invested = false,
                type = "pc",
                vacant = false,
            ),
        ),
        charter = RawCharterChoices(
            type = null,
            abilityBoosts = RawAbilityBoostChoices(
                culture = false,
                economy = false,
                loyalty = false,
                stability = false,
            ),
        ),
        heartland = RawHeartlandChoices(
            type = null,
        ),
        government = RawGovernmentChoices(
            type = null,
            abilityBoosts = RawAbilityBoostChoices(
                culture = false,
                economy = false,
                loyalty = false,
                stability = false,
            ),
        ),
        abilityBoosts = RawAbilityBoostChoices(
            culture = false,
            economy = false,
            loyalty = false,
            stability = false,
        ),
        features = emptyArray(),
        bonusFeats = emptyArray(),
        groups = emptyArray(),
        skillRanks = RawSkillRanks(
            agriculture = 0,
            arts = 0,
            boating = 0,
            defense = 0,
            engineering = 0,
            exploration = 0,
            folklore = 0,
            industry = 0,
            intrigue = 0,
            magic = 0,
            politics = 0,
            scholarship = 0,
            statecraft = 0,
            trade = 0,
            warfare = 0,
            wilderness = 0,
        ),
        abilityScores = RawAbilityScores(
            culture = 10,
            economy = 10,
            loyalty = 10,
            stability = 10,
        ),
        milestones = initialMilestoneChoices,
        charterBlacklist = emptyArray(),
        governmentBlacklist = emptyArray(),
        initialProficiencies = emptyArray(),
        homebrewKingdomEvents = emptyArray(),
        kingdomEventBlacklist = emptyArray(),
        ongoingEvents = emptyArray(),
        selectedCharacterId = null,
    )
