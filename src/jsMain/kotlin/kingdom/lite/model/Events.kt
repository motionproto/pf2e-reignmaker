package kingdom.lite.model

import kotlin.js.Json
import kotlin.js.json
import kotlin.random.Random

/**
 * Represents the outcome of an event resolution
 */
data class EventOutcome(
    val message: String,
    val goldChange: Int = 0,
    val unrestChange: Int = 0,
    val fameChange: Int = 0,
    val resourceChanges: Map<String, Int> = emptyMap()
)

/**
 * Represents a Kingdom Event
 */
data class KingdomEvent(
    val id: String,
    val name: String,
    val description: String,
    val traits: List<String>,
    val skills: List<String>,
    val imagePath: String = "img/events/event_placeholder.webp",
    val special: String? = null,
    val criticalSuccess: EventOutcome,
    val success: EventOutcome,
    val failure: EventOutcome,
    val criticalFailure: EventOutcome,
    val isContinuous: Boolean = false
)

/**
 * Manages kingdom events
 */
class EventManager {
    private val events = mutableListOf<KingdomEvent>()
    private var eventDC = 16
    
    init {
        loadEvents()
    }
    
    /**
     * Load all events from data
     */
    private fun loadEvents() {
        // Load all 40 events from the Kingdom Events document
        events.addAll(listOf(
            createArchaeologicalFind(),
            createAssassinationAttempt(),
            createBanditActivity(),
            createBoomtown(),
            createCultActivity(),
            createDemandExpansion(),
            createDemandStructure(),
            createDiplomaticOverture(),
            createDrugDen(),
            createEconomicSurge(),
            createFestiveInvitation(),
            createFeud(),
            createFoodShortage(),
            createFoodSurplus(),
            createGoodWeather(),
            createGrandTournament(),
            createImmigration(),
            createInquisition(),
            createJusticePrevails(),
            createLandRush(),
            createLocalDisaster(),
            createMagicalDiscovery(),
            createMilitaryExercises(),
            createMonsterAttack(),
            createNaturalDisaster(),
            createNatureBlessing(),
            createNotoriousHeist(),
            createPilgrimage(),
            createPlague(),
            createPublicScandal(),
            createRaiders(),
            createRemarkableTreasure(),
            createScholarlyDiscovery(),
            createSensationalCrime(),
            createTradeAgreement(),
            createUndeadUprising(),
            createVisitingCelebrity()
        ))
    }
    
    /**
     * Check for a kingdom event (Phase IV)
     */
    fun checkForEvent(): Boolean {
        val roll = (1..20).random()
        val success = roll >= eventDC
        
        if (!success) {
            // Decrease DC for next turn, minimum 6
            eventDC = maxOf(6, eventDC - 5)
            console.log("Event check failed (rolled $roll vs DC $eventDC). DC reduced to $eventDC for next turn.")
        } else {
            // Reset DC after successful event
            eventDC = 16
            console.log("Event triggered! (rolled $roll vs DC $eventDC)")
        }
        
        return success
    }
    
    /**
     * Get a random event
     */
    fun getRandomEvent(): KingdomEvent? {
        return if (events.isNotEmpty()) {
            events.random()
        } else null
    }
    
    /**
     * Resolve an event with a skill check
     */
    fun resolveEvent(
        event: KingdomEvent, 
        skill: String, 
        checkResult: Int,
        dc: Int
    ): EventOutcome {
        return when {
            checkResult >= dc + 10 -> event.criticalSuccess
            checkResult >= dc -> event.success
            checkResult <= dc - 10 -> event.criticalFailure
            else -> event.failure
        }
    }
    
    // Sample event creators
    private fun createArchaeologicalFind() = KingdomEvent(
        id = "archaeological-find",
        name = "Archaeological Find",
        description = "Ancient ruins or artifacts are discovered in your territory.",
        traits = listOf("beneficial"),
        skills = listOf("Society", "Religion", "Occultism"),
        criticalSuccess = EventOutcome(
            message = "Major discovery! The find brings wealth and reduces unrest.",
            goldChange = 2,
            unrestChange = -1,
            fameChange = 1
        ),
        success = EventOutcome(
            message = "Valuable artifacts found.",
            goldChange = 1
        ),
        failure = EventOutcome(
            message = "Minor artifacts provide some resources.",
            resourceChanges = mapOf("food" to 1)
        ),
        criticalFailure = EventOutcome(
            message = "The site proves dangerous.",
            unrestChange = 1
        ),
        special = "Knowledge & Magic structures provide bonus equal to tier"
    )
    
    private fun createAssassinationAttempt() = KingdomEvent(
        id = "assassination-attempt",
        name = "Assassination Attempt",
        description = "Someone attempts to kill one of your leaders!",
        traits = listOf("dangerous"),
        skills = listOf("Stealth", "Intimidation", "Medicine"),
        criticalSuccess = EventOutcome(
            message = "Assassin captured! You gain valuable information about your enemies."
        ),
        success = EventOutcome(
            message = "Attempt foiled successfully."
        ),
        failure = EventOutcome(
            message = "Leader escapes but the kingdom is shaken.",
            unrestChange = 1
        ),
        criticalFailure = EventOutcome(
            message = "Leader wounded! They cannot act this turn.",
            unrestChange = 2
        )
    )
    
    private fun createBanditActivity() = KingdomEvent(
        id = "bandit-activity",
        name = "Bandit Activity",
        description = "Bandits establish a camp and begin raiding travelers.",
        traits = listOf("dangerous", "continuous"),
        skills = listOf("Intimidation", "Diplomacy", "Stealth"),
        isContinuous = true,
        criticalSuccess = EventOutcome(
            message = "Bandits defeated or recruited! You seize their loot.",
            goldChange = 1
        ),
        success = EventOutcome(
            message = "Bandits scattered successfully."
        ),
        failure = EventOutcome(
            message = "Raids continue, disrupting trade.",
            resourceChanges = mapOf("food" to -1, "lumber" to -1),
            unrestChange = 1
        ),
        criticalFailure = EventOutcome(
            message = "Bandits grow bolder!",
            resourceChanges = mapOf("food" to -2, "lumber" to -2),
            unrestChange = 2
        )
    )
    
    private fun createFoodShortage() = KingdomEvent(
        id = "food-shortage",
        name = "Food Shortage",
        description = "Disease, weather, or pests destroy agricultural production.",
        traits = listOf("dangerous", "continuous"),
        skills = listOf("Nature", "Survival", "Diplomacy"),
        isContinuous = true,
        criticalSuccess = EventOutcome(
            message = "Crisis averted with minimal losses.",
            resourceChanges = mapOf("food" to -2)
        ),
        success = EventOutcome(
            message = "Shortage controlled.",
            resourceChanges = mapOf("food" to -4)
        ),
        failure = EventOutcome(
            message = "Severe shortage strikes the kingdom!",
            resourceChanges = mapOf("food" to -6),
            unrestChange = 1
        ),
        criticalFailure = EventOutcome(
            message = "Famine threatens!",
            resourceChanges = mapOf("food" to -8),
            unrestChange = 2
        )
    )
    
    private fun createFoodSurplus() = KingdomEvent(
        id = "food-surplus",
        name = "Food Surplus",
        description = "Exceptional harvests provide abundant food!",
        traits = listOf("beneficial"),
        skills = listOf("Nature", "Society", "Crafting"),
        criticalSuccess = EventOutcome(
            message = "Massive surplus! Excess sold for profit.",
            goldChange = 3,
            unrestChange = -1
        ),
        success = EventOutcome(
            message = "Good harvest brings wealth.",
            goldChange = 2
        ),
        failure = EventOutcome(
            message = "Minor surplus provides some benefit.",
            goldChange = 1
        ),
        criticalFailure = EventOutcome(
            message = "Surplus spoils due to poor management.",
            unrestChange = 1
        )
    )
    
    private fun createGoodWeather() = KingdomEvent(
        id = "good-weather",
        name = "Good Weather",
        description = "Perfect weather conditions boost morale and productivity.",
        traits = listOf("beneficial", "continuous"),
        skills = listOf("Nature", "Society", "Performance"),
        isContinuous = true,
        criticalSuccess = EventOutcome(
            message = "Weather holds perfectly!",
            resourceChanges = mapOf("food" to 2),
            unrestChange = -1
        ),
        success = EventOutcome(
            message = "Weather remains good.",
            resourceChanges = mapOf("food" to 2)
        ),
        failure = EventOutcome(
            message = "Weather changes."
        ),
        criticalFailure = EventOutcome(
            message = "Weather turns bad suddenly.",
            unrestChange = 1
        )
    )
    
    private fun createMonsterAttack() = KingdomEvent(
        id = "monster-attack",
        name = "Monster Attack",
        description = "A dangerous creature attacks a settlement or travelers!",
        traits = listOf("dangerous"),
        skills = listOf("Intimidation", "Nature", "Stealth"),
        criticalSuccess = EventOutcome(
            message = "Monster defeated! Trophy brings wealth and fame.",
            goldChange = 2,
            unrestChange = -1
        ),
        success = EventOutcome(
            message = "Monster driven away successfully."
        ),
        failure = EventOutcome(
            message = "Monster causes damage before fleeing.",
            unrestChange = 1
        ),
        criticalFailure = EventOutcome(
            message = "Monster rampages through settlement!",
            unrestChange = 2
        ),
        special = "Fortifications provide bonus equal to tier"
    )
    
    private fun createDiplomaticOverture() = KingdomEvent(
        id = "diplomatic-overture",
        name = "Diplomatic Overture",
        description = "A neighboring kingdom reaches out to establish or improve diplomatic relations.",
        traits = listOf("beneficial"),
        skills = listOf("Diplomacy", "Society", "Deception"),
        criticalSuccess = EventOutcome(
            message = "Relations greatly improved! Trade benefits follow.",
            goldChange = 1,
            unrestChange = -1
        ),
        success = EventOutcome(
            message = "Relations improve to Friendly."
        ),
        failure = EventOutcome(
            message = "No change in relations, minor diplomatic friction."
        ),
        criticalFailure = EventOutcome(
            message = "Relations worsen due to diplomatic blunder.",
            unrestChange = 1
        ),
        special = "Civic & Governance structures provide bonus equal to tier"
    )
    
    private fun createNaturalDisaster() = KingdomEvent(
        id = "natural-disaster",
        name = "Natural Disaster",
        description = "Earthquake, tornado, wildfire, or severe flooding strikes the kingdom!",
        traits = listOf("dangerous"),
        skills = listOf("Survival", "Crafting", "Society"),
        criticalSuccess = EventOutcome(
            message = "Minimal damage, citizens impressed by response.",
            unrestChange = -1
        ),
        success = EventOutcome(
            message = "Some damage but losses contained.",
            resourceChanges = mapOf("lumber" to -1)
        ),
        failure = EventOutcome(
            message = "Major damage across the kingdom!",
            resourceChanges = mapOf("food" to -2, "lumber" to -2),
            unrestChange = 1
        ),
        criticalFailure = EventOutcome(
            message = "Devastating losses!",
            resourceChanges = mapOf("food" to -3, "lumber" to -3, "stone" to -1),
            unrestChange = 2
        )
    )
    
    private fun createPilgrimage() = KingdomEvent(
        id = "pilgrimage",
        name = "Pilgrimage",
        description = "Religious pilgrims seek passage or sanctuary in your kingdom.",
        traits = listOf("beneficial"),
        skills = listOf("Religion", "Diplomacy", "Society"),
        criticalSuccess = EventOutcome(
            message = "Major pilgrimage brings wealth and fame!",
            goldChange = 1,
            unrestChange = -1,
            fameChange = 1
        ),
        success = EventOutcome(
            message = "Peaceful passage brings donations.",
            goldChange = 1
        ),
        failure = EventOutcome(
            message = "Minor disruption from the pilgrims."
        ),
        criticalFailure = EventOutcome(
            message = "Religious tensions arise.",
            unrestChange = 1
        ),
        special = "Faith & Nature structures provide bonus equal to tier"
    )
    
    private fun createBoomtown() = KingdomEvent(
        id = "boomtown",
        name = "Boomtown",
        description = "A settlement experiences sudden, dramatic growth!",
        traits = listOf("beneficial", "continuous"),
        skills = listOf("Society", "Crafting", "Diplomacy"),
        isContinuous = true,
        criticalSuccess = EventOutcome(
            message = "Major growth brings prosperity!",
            goldChange = 4
        ),
        success = EventOutcome(
            message = "Steady expansion continues.",
            goldChange = 2
        ),
        failure = EventOutcome(
            message = "Growth stalls."
        ),
        criticalFailure = EventOutcome(
            message = "Boom goes bust!",
            unrestChange = 1
        )
    )
    
    private fun createCultActivity() = KingdomEvent(
        id = "cult-activity",
        name = "Cult Activity",
        description = "A dangerous cult begins operating in secret within your kingdom.",
        traits = listOf("dangerous", "continuous"),
        skills = listOf("Stealth", "Religion", "Intimidation"),
        isContinuous = true,
        criticalSuccess = EventOutcome(
            message = "Cult exposed and defeated!",
            unrestChange = -1
        ),
        success = EventOutcome(
            message = "Cult defeated."
        ),
        failure = EventOutcome(
            message = "Cult continues to spread.",
            unrestChange = 1
        ),
        criticalFailure = EventOutcome(
            message = "Cult grows stronger!",
            unrestChange = 2
        ),
        special = "Faith & Nature structures provide bonus to defeat. Crime & Intrigue structures provide bonus to locate."
    )
    
    private fun createDemandStructure() = KingdomEvent(
        id = "demand-structure",
        name = "Demand Structure",
        description = "Citizens demand that a specific structure be built.",
        traits = listOf("dangerous", "continuous"),
        skills = listOf("Diplomacy", "Intimidation", "Society"),
        isContinuous = true,
        criticalSuccess = EventOutcome(
            message = "Citizens convinced to be patient.",
            unrestChange = -1
        ),
        success = EventOutcome(
            message = "Demands are satisfied."
        ),
        failure = EventOutcome(
            message = "Protests continue.",
            unrestChange = 1,
            goldChange = -1
        ),
        criticalFailure = EventOutcome(
            message = "Violence erupts!",
            unrestChange = 2
        ),
        special = "Building the demanded structure automatically ends the event"
    )
    
    private fun createDrugDen() = KingdomEvent(
        id = "drug-den",
        name = "Drug Den",
        description = "An illicit drug trade threatens to corrupt your settlement.",
        traits = listOf("dangerous", "continuous"),
        skills = listOf("Stealth", "Medicine", "Intimidation"),
        isContinuous = true,
        criticalSuccess = EventOutcome(
            message = "Drug ring destroyed!",
            unrestChange = -1
        ),
        success = EventOutcome(
            message = "Major arrests made. Ring dismantled."
        ),
        failure = EventOutcome(
            message = "Drug trade spreads.",
            unrestChange = 1,
            goldChange = -1
        ),
        criticalFailure = EventOutcome(
            message = "Major drug crisis!",
            unrestChange = 2
        ),
        special = "Crime & Intrigue structures provide bonus equal to tier"
    )
    
    private fun createEconomicSurge() = KingdomEvent(
        id = "economic-surge",
        name = "Economic Surge",
        description = "Trade and productivity boom throughout your kingdom!",
        traits = listOf("beneficial", "continuous"),
        skills = listOf("Society", "Diplomacy", "Crafting"),
        isContinuous = true,
        criticalSuccess = EventOutcome(
            message = "Trade bonanza!",
            goldChange = 2
        ),
        success = EventOutcome(
            message = "Steady growth continues.",
            goldChange = 1
        ),
        failure = EventOutcome(
            message = "Surge slows."
        ),
        criticalFailure = EventOutcome(
            message = "Economic bubble bursts!",
            unrestChange = 1
        ),
        special = "Commerce structures provide bonus equal to tier"
    )
    
    private fun createDemandExpansion() = KingdomEvent(
        id = "demand-expansion",
        name = "Demand Expansion",
        description = "Citizens demand the kingdom claim new territory.",
        traits = listOf("dangerous", "continuous"),
        skills = listOf("Diplomacy", "Survival", "Intimidation"),
        isContinuous = true,
        criticalSuccess = EventOutcome(
            message = "Citizens satisfied with expansion plans.",
            unrestChange = -1
        ),
        success = EventOutcome(
            message = "Citizens satisfied."
        ),
        failure = EventOutcome(
            message = "Citizens unhappy with lack of growth.",
            unrestChange = 1
        ),
        criticalFailure = EventOutcome(
            message = "Major dissatisfaction!",
            unrestChange = 2
        ),
        special = "Expanding territory this turn automatically succeeds and ends event"
    )
    
    private fun createFestiveInvitation() = KingdomEvent(
        id = "festive-invitation",
        name = "Festive Invitation",
        description = "A neighboring kingdom invites your leaders to a grand festival.",
        traits = listOf("beneficial"),
        skills = listOf("Diplomacy", "Performance", "Society"),
        criticalSuccess = EventOutcome(
            message = "Great success at the festival!",
            goldChange = 2,
            unrestChange = -1
        ),
        success = EventOutcome(
            message = "Pleasant visit with gifts exchanged.",
            goldChange = 1
        ),
        failure = EventOutcome(
            message = "Adequate visit, gifts not reciprocated."
        ),
        criticalFailure = EventOutcome(
            message = "Diplomatic faux pas!",
            unrestChange = 1
        ),
        special = "Bringing resources as gifts provides +2 to check"
    )
    
    private fun createFeud() = KingdomEvent(
        id = "feud",
        name = "Feud",
        description = "Rival factions from different settlements escalate their conflict.",
        traits = listOf("dangerous", "continuous"),
        skills = listOf("Diplomacy", "Intimidation", "Deception"),
        isContinuous = true,
        criticalSuccess = EventOutcome(
            message = "Feud ended, rivals become allies!",
            goldChange = 1
        ),
        success = EventOutcome(
            message = "Feud resolved."
        ),
        failure = EventOutcome(
            message = "Feud disrupts trade.",
            unrestChange = 1
        ),
        criticalFailure = EventOutcome(
            message = "Private war erupts!",
            unrestChange = 2
        )
    )
    
    private fun createImmigration() = KingdomEvent(
        id = "immigration",
        name = "Immigration",
        description = "New settlers arrive seeking homes in your kingdom.",
        traits = listOf("beneficial"),
        skills = listOf("Diplomacy", "Society", "Survival"),
        criticalSuccess = EventOutcome(
            message = "Major influx of skilled workers!",
            goldChange = 2
        ),
        success = EventOutcome(
            message = "Steady immigration boosts economy.",
            goldChange = 1
        ),
        failure = EventOutcome(
            message = "Few settlers stay."
        ),
        criticalFailure = EventOutcome(
            message = "Integration problems arise.",
            unrestChange = 1
        )
    )
    
    private fun createInquisition() = KingdomEvent(
        id = "inquisition",
        name = "Inquisition",
        description = "Zealots mobilize against a minority group or belief.",
        traits = listOf("dangerous", "continuous"),
        skills = listOf("Religion", "Intimidation", "Diplomacy"),
        isContinuous = true,
        criticalSuccess = EventOutcome(
            message = "Peacefully resolved!",
            unrestChange = -1
        ),
        success = EventOutcome(
            message = "Zealots dispersed."
        ),
        failure = EventOutcome(
            message = "Persecution spreads.",
            unrestChange = 2
        ),
        criticalFailure = EventOutcome(
            message = "Violence erupts!",
            unrestChange = 2
        ),
        special = "Faith & Nature structures provide bonus to Religion checks"
    )
    
    private fun createJusticePrevails() = KingdomEvent(
        id = "justice-prevails",
        name = "Justice Prevails",
        description = "Authorities catch a notorious criminal or resolve a major injustice.",
        traits = listOf("beneficial"),
        skills = listOf("Intimidation", "Diplomacy", "Society"),
        criticalSuccess = EventOutcome(
            message = "Major triumph of justice!",
            unrestChange = -2
        ),
        success = EventOutcome(
            message = "Justice served.",
            unrestChange = -1
        ),
        failure = EventOutcome(
            message = "Justice with complications.",
            unrestChange = 1
        ),
        criticalFailure = EventOutcome(
            message = "Miscarriage of justice!",
            unrestChange = 2
        ),
        special = "Civic & Governance structures provide bonus equal to tier"
    )
    
    private fun createLandRush() = KingdomEvent(
        id = "land-rush",
        name = "Land Rush",
        description = "Settlers attempt to claim wilderness at the kingdom's border.",
        traits = listOf("dangerous"),
        skills = listOf("Diplomacy", "Survival", "Intimidation"),
        criticalSuccess = EventOutcome(
            message = "Settlers successfully expand the kingdom! Gain 2 hexes."
        ),
        success = EventOutcome(
            message = "Settlers expand the kingdom. Gain 1 hex."
        ),
        failure = EventOutcome(
            message = "Settlers disperse without helping.",
            unrestChange = 1
        ),
        criticalFailure = EventOutcome(
            message = "Violence erupts at border!",
            unrestChange = 2
        ),
        special = "Hexes are claimed without requiring the normal action or resources"
    )
    
    private fun createLocalDisaster() = KingdomEvent(
        id = "local-disaster",
        name = "Local Disaster",
        description = "Fire, flood, or structural collapse strikes a settlement!",
        traits = listOf("dangerous"),
        skills = listOf("Crafting", "Survival", "Society"),
        criticalSuccess = EventOutcome(
            message = "Disaster contained with no damage."
        ),
        success = EventOutcome(
            message = "Limited damage.",
            unrestChange = 1
        ),
        failure = EventOutcome(
            message = "Major damage to settlement!",
            unrestChange = 1
        ),
        criticalFailure = EventOutcome(
            message = "Catastrophic damage!",
            unrestChange = 2
        ),
        special = "Settlements with Fortifications increase result by one degree"
    )
    
    private fun createMagicalDiscovery() = KingdomEvent(
        id = "magical-discovery",
        name = "Magical Discovery",
        description = "A powerful magical site or artifact is discovered in your kingdom!",
        traits = listOf("beneficial"),
        skills = listOf("Arcana", "Religion", "Occultism"),
        criticalSuccess = EventOutcome(
            message = "Major magical boon discovered!"
        ),
        success = EventOutcome(
            message = "Useful magical discovery.",
            unrestChange = -2,
            fameChange = 1
        ),
        failure = EventOutcome(
            message = "Magic proves dangerous.",
            unrestChange = 1
        ),
        criticalFailure = EventOutcome(
            message = "Magical disaster!",
            unrestChange = 2
        ),
        special = "Knowledge & Magic structures provide bonus equal to tier"
    )
    
    private fun createMilitaryExercises() = KingdomEvent(
        id = "military-exercises",
        name = "Military Exercises",
        description = "Your kingdom conducts large-scale military training maneuvers.",
        traits = listOf("beneficial"),
        skills = listOf("Athletics", "Acrobatics", "Intimidation"),
        criticalSuccess = EventOutcome(
            message = "Elite forces trained!",
            unrestChange = -1
        ),
        success = EventOutcome(
            message = "Successful training completed."
        ),
        failure = EventOutcome(
            message = "Training is ineffective."
        ),
        criticalFailure = EventOutcome(
            message = "Training accident!",
            unrestChange = 1
        ),
        special = "Military & Training structures provide bonus equal to tier"
    )
    
    private fun createNatureBlessing() = KingdomEvent(
        id = "natures-blessing",
        name = "Nature's Blessing",
        description = "A natural wonder appears - rare flowers, aurora, or returning wildlife!",
        traits = listOf("beneficial"),
        skills = listOf("Nature", "Performance", "Society"),
        criticalSuccess = EventOutcome(
            message = "Inspiring blessing!",
            unrestChange = -2,
            goldChange = 1
        ),
        success = EventOutcome(
            message = "Pleasant omen.",
            unrestChange = -1
        ),
        failure = EventOutcome(
            message = "Brief wonder with no lasting effect."
        ),
        criticalFailure = EventOutcome(
            message = "Arguments over meaning arise.",
            unrestChange = 1
        ),
        special = "Faith & Nature or Exploration & Wilderness structures provide bonus"
    )
    
    private fun createPlague() = KingdomEvent(
        id = "plague",
        name = "Plague",
        description = "Disease spreads rapidly through your settlements!",
        traits = listOf("dangerous", "continuous"),
        skills = listOf("Medicine", "Religion", "Society"),
        isContinuous = true,
        criticalSuccess = EventOutcome(
            message = "Plague cured!",
            unrestChange = -1
        ),
        success = EventOutcome(
            message = "Plague contained."
        ),
        failure = EventOutcome(
            message = "Plague spreads!",
            unrestChange = 1,
            goldChange = -2
        ),
        criticalFailure = EventOutcome(
            message = "Devastating outbreak!",
            unrestChange = 2,
            goldChange = -2
        ),
        special = "Medicine & Healing or Faith & Nature structures provide bonus. Bonuses stack."
    )
    
    private fun createPublicScandal() = KingdomEvent(
        id = "public-scandal",
        name = "Public Scandal",
        description = "A leader is implicated in an embarrassing or criminal situation!",
        traits = listOf("dangerous"),
        skills = listOf("Deception", "Diplomacy", "Intimidation"),
        criticalSuccess = EventOutcome(
            message = "Scandal deflected successfully."
        ),
        success = EventOutcome(
            message = "Damage controlled.",
            unrestChange = 1
        ),
        failure = EventOutcome(
            message = "Public outrage!",
            unrestChange = 2
        ),
        criticalFailure = EventOutcome(
            message = "Leader must lay low!",
            unrestChange = 2
        )
    )
    
    private fun createRaiders() = KingdomEvent(
        id = "raiders",
        name = "Raiders",
        description = "Armed raiders threaten settlements and trade routes!",
        traits = listOf("dangerous", "continuous"),
        skills = listOf("Intimidation", "Diplomacy", "Stealth"),
        isContinuous = true,
        criticalSuccess = EventOutcome(
            message = "Raiders defeated and looted!",
            goldChange = 1
        ),
        success = EventOutcome(
            message = "Raiders driven off."
        ),
        failure = EventOutcome(
            message = "Successful raid!",
            goldChange = -2,
            resourceChanges = mapOf("food" to -2),
            unrestChange = 1
        ),
        criticalFailure = EventOutcome(
            message = "Major raid devastates settlement!",
            goldChange = -2,
            resourceChanges = mapOf("food" to -2),
            unrestChange = 2
        ),
        special = "Can pay 2 Gold tribute to immediately end event. Fortifications provide bonus."
    )
    
    private fun createRemarkableTreasure() = KingdomEvent(
        id = "remarkable-treasure",
        name = "Remarkable Treasure",
        description = "Explorers discover valuable resources or ancient treasure!",
        traits = listOf("beneficial"),
        skills = listOf("Society", "Thievery", "Diplomacy"),
        criticalSuccess = EventOutcome(
            message = "Legendary treasure found!",
            goldChange = 4,
            unrestChange = -1
        ),
        success = EventOutcome(
            message = "Valuable find!",
            goldChange = 2
        ),
        failure = EventOutcome(
            message = "Modest value.",
            goldChange = 1
        ),
        criticalFailure = EventOutcome(
            message = "Treasure cursed or false!",
            unrestChange = 1
        ),
        special = "+1 to check for each mine or quarry you control"
    )
    
    private fun createSensationalCrime() = KingdomEvent(
        id = "sensational-crime",
        name = "Sensational Crime",
        description = "A notorious crime captures public attention.",
        traits = listOf("dangerous"),
        skills = listOf("Intimidation", "Society", "Diplomacy"),
        criticalSuccess = EventOutcome(
            message = "Criminal caught spectacularly!",
            unrestChange = -1
        ),
        success = EventOutcome(
            message = "Crime solved."
        ),
        failure = EventOutcome(
            message = "Criminal escapes.",
            unrestChange = 1
        ),
        criticalFailure = EventOutcome(
            message = "Copycat crimes spread!",
            unrestChange = 2
        ),
        special = "Crime & Intrigue structures provide bonus equal to tier"
    )
    
    private fun createTradeAgreement() = KingdomEvent(
        id = "trade-agreement",
        name = "Trade Agreement",
        description = "Merchants propose a lucrative trade arrangement.",
        traits = listOf("beneficial"),
        skills = listOf("Diplomacy", "Society", "Deception"),
        criticalSuccess = EventOutcome(
            message = "Exclusive deal secured!",
            goldChange = 2
        ),
        success = EventOutcome(
            message = "Standard agreement reached.",
            goldChange = 1
        ),
        failure = EventOutcome(
            message = "Poor terms accepted."
        ),
        criticalFailure = EventOutcome(
            message = "Trade dispute arises!",
            goldChange = -1,
            unrestChange = 1
        ),
        special = "Commerce structures provide bonus equal to tier"
    )
    
    private fun createUndeadUprising() = KingdomEvent(
        id = "undead-uprising",
        name = "Undead Uprising",
        description = "The dead rise from their graves to threaten the living!",
        traits = listOf("dangerous", "continuous"),
        skills = listOf("Religion", "Arcana", "Intimidation"),
        isContinuous = true,
        criticalSuccess = EventOutcome(
            message = "Undead destroyed!",
            unrestChange = -1
        ),
        success = EventOutcome(
            message = "Undead defeated."
        ),
        failure = EventOutcome(
            message = "Undead spread!",
            unrestChange = 1
        ),
        criticalFailure = EventOutcome(
            message = "Major outbreak!",
            unrestChange = 2
        ),
        special = "Faith & Nature or Knowledge & Magic structures provide bonus"
    )
    
    private fun createVisitingCelebrity() = KingdomEvent(
        id = "visiting-celebrity",
        name = "Visiting Celebrity",
        description = "A famous person visits your kingdom, bringing attention and opportunity!",
        traits = listOf("beneficial"),
        skills = listOf("Diplomacy", "Performance", "Society"),
        criticalSuccess = EventOutcome(
            message = "Spectacular visit!",
            goldChange = 2,
            unrestChange = -2
        ),
        success = EventOutcome(
            message = "Pleasant visit.",
            goldChange = 1
        ),
        failure = EventOutcome(
            message = "Mediocre visit."
        ),
        criticalFailure = EventOutcome(
            message = "Celebrity offended!",
            unrestChange = 1
        ),
        special = "Performance & Culture structures provide bonus equal to tier"
    )
    
    private fun createScholarlyDiscovery() = KingdomEvent(
        id = "scholarly-discovery",
        name = "Scholarly Discovery",
        description = "Researchers in your kingdom make an important academic breakthrough!",
        traits = listOf("beneficial"),
        skills = listOf("Lore", "Arcana", "Society"),
        criticalSuccess = EventOutcome(
            message = "Revolutionary discovery!",
            goldChange = 2,
            fameChange = 1
        ),
        success = EventOutcome(
            message = "Important findings.",
            goldChange = 1
        ),
        failure = EventOutcome(
            message = "Research inconclusive."
        ),
        criticalFailure = EventOutcome(
            message = "Academic scandal!",
            unrestChange = 1
        ),
        special = "Knowledge & Magic structures provide bonus equal to tier"
    )
    
    private fun createNotoriousHeist() = KingdomEvent(
        id = "notorious-heist",
        name = "Notorious Heist",
        description = "A daring theft threatens your kingdom's security and reputation!",
        traits = listOf("dangerous"),
        skills = listOf("Thievery", "Stealth", "Society"),
        criticalSuccess = EventOutcome(
            message = "Thieves captured with stolen goods!"
        ),
        success = EventOutcome(
            message = "Thieves arrested."
        ),
        failure = EventOutcome(
            message = "Thieves escape with loot!",
            goldChange = -2,
            unrestChange = 1
        ),
        criticalFailure = EventOutcome(
            message = "Crime syndicate exposed!",
            goldChange = -3,
            unrestChange = 2
        ),
        special = "Crime & Intrigue structures provide bonus. No effect if no treasury."
    )
    
    private fun createGrandTournament() = KingdomEvent(
        id = "grand-tournament",
        name = "Grand Tournament",
        description = "A martial competition draws competitors from across the realm!",
        traits = listOf("beneficial"),
        skills = listOf("Athletics", "Acrobatics", "Performance"),
        criticalSuccess = EventOutcome(
            message = "Spectacular event!",
            goldChange = 2,
            unrestChange = -1,
            fameChange = 1
        ),
        success = EventOutcome(
            message = "Successful tournament.",
            unrestChange = -1
        ),
        failure = EventOutcome(
            message = "Disappointing turnout."
        ),
        criticalFailure = EventOutcome(
            message = "Accident or scandal!",
            unrestChange = 1
        ),
        special = "Performance & Culture or Military & Training structures provide bonus"
    )
}
