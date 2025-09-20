package kingdom.lite.model

/**
 * Incident levels corresponding to unrest tiers
 */
enum class IncidentLevel {
    MINOR,    // Discontent (Unrest 3-5)
    MODERATE, // Turmoil (Unrest 6-8)
    MAJOR     // Rebellion (Unrest 9+)
}

/**
 * A skill option for resolving an incident
 */
data class IncidentSkillOption(
    val skill: String,
    val description: String
)

/**
 * An unrest incident that can occur
 */
data class Incident(
    val id: String,
    val name: String,
    val description: String,
    val level: IncidentLevel,
    val percentileMin: Int,
    val percentileMax: Int,
    val skillOptions: List<IncidentSkillOption>,
    val successEffect: String,
    val failureEffect: String,
    val criticalFailureEffect: String,
    val imagePath: String? = null
)

/**
 * Result of resolving an incident
 */
data class IncidentResult(
    val success: Boolean,
    val criticalSuccess: Boolean = false,
    val criticalFailure: Boolean = false,
    val unrestChange: Int = 0,
    val fameChange: Int = 0,
    val goldLoss: Int = 0,
    val message: String
)

/**
 * Manages incidents and their resolution
 */
object IncidentManager {
    
    /**
     * Get the unrest tier based on current unrest level
     */
    fun getUnrestTier(unrest: Int): Int {
        return when (unrest) {
            in 0..2 -> 0  // Stable
            in 3..5 -> 1  // Discontent
            in 6..8 -> 2  // Turmoil
            else -> 3     // Rebellion
        }
    }
    
    /**
     * Get the unrest tier name
     */
    fun getUnrestTierName(tier: Int): String {
        return when (tier) {
            0 -> "Stable"
            1 -> "Discontent"
            2 -> "Turmoil"
            3 -> "Rebellion"
            else -> "Unknown"
        }
    }
    
    /**
     * Get the unrest penalty for kingdom checks
     */
    fun getUnrestPenalty(unrest: Int): Int {
        return when (unrest) {
            in 0..2 -> 0   // Stable
            in 3..5 -> -1  // Discontent
            in 6..8 -> -2  // Turmoil
            else -> -3     // Rebellion
        }
    }
    
    /**
     * Get the incident level for a given unrest tier
     */
    fun getIncidentLevel(tier: Int): IncidentLevel? {
        return when (tier) {
            1 -> IncidentLevel.MINOR
            2 -> IncidentLevel.MODERATE
            3 -> IncidentLevel.MAJOR
            else -> null
        }
    }
    
    /**
     * Roll for an incident based on unrest tier
     * Returns null if no incident occurs
     */
    fun rollForIncident(tier: Int): Incident? {
        val level = getIncidentLevel(tier) ?: return null
        val roll = (1..100).random()
        
        // Check for no incident
        val noIncidentThreshold = when (level) {
            IncidentLevel.MINOR -> 20
            IncidentLevel.MODERATE -> 15
            IncidentLevel.MAJOR -> 10
        }
        
        if (roll <= noIncidentThreshold) {
            return null
        }
        
        // Get appropriate incident from the tables
        return getIncidentByRoll(level, roll)
    }
    
    /**
     * Get an incident by percentile roll
     */
    private fun getIncidentByRoll(level: IncidentLevel, roll: Int): Incident? {
        val incidents = when (level) {
            IncidentLevel.MINOR -> minorIncidents
            IncidentLevel.MODERATE -> moderateIncidents
            IncidentLevel.MAJOR -> majorIncidents
        }
        
        return incidents.find { roll in it.percentileMin..it.percentileMax }
    }
    
    /**
     * Get the placeholder image for an incident level
     */
    fun getIncidentImage(level: IncidentLevel): String {
        return when (level) {
            IncidentLevel.MINOR -> "img/incidents/minor_placeholder.webp"
            IncidentLevel.MODERATE -> "img/incidents/mod_placeholder.webp"
            IncidentLevel.MAJOR -> "img/incidents/major_placeholder.webp"
        }
    }
    
    // Incident definitions
    private val minorIncidents = listOf(
        Incident(
            id = "crime_wave",
            name = "Crime Wave",
            description = "Organized crime spreads through your settlements",
            level = IncidentLevel.MINOR,
            percentileMin = 21,
            percentileMax = 30,
            skillOptions = listOf(
                IncidentSkillOption("Intimidation", "Crack down on criminals"),
                IncidentSkillOption("Thievery", "Infiltrate gangs"),
                IncidentSkillOption("Society", "Implement legal reform"),
                IncidentSkillOption("Occultism", "Divine the source")
            ),
            successEffect = "Crime suppressed, no effect",
            failureEffect = "Lose 1d4 Gold",
            criticalFailureEffect = "Lose 2d4 Gold, +1 Unrest",
            imagePath = "img/incidents/minor_placeholder.webp"
        ),
        Incident(
            id = "work_stoppage",
            name = "Work Stoppage",
            description = "Workers refuse to continue their labor",
            level = IncidentLevel.MINOR,
            percentileMin = 31,
            percentileMax = 40,
            skillOptions = listOf(
                IncidentSkillOption("Diplomacy", "Negotiate with workers"),
                IncidentSkillOption("Intimidation", "Force them to work"),
                IncidentSkillOption("Performance", "Inspire them"),
                IncidentSkillOption("Medicine", "Address health concerns")
            ),
            successEffect = "Workers return, no effect",
            failureEffect = "One random worksite produces nothing this turn",
            criticalFailureEffect = "Two worksites produce nothing, +1 Unrest",
            imagePath = "img/incidents/minor_placeholder.webp"
        ),
        Incident(
            id = "emigration_threat",
            name = "Emigration Threat",
            description = "Citizens threaten to leave your kingdom",
            level = IncidentLevel.MINOR,
            percentileMin = 41,
            percentileMax = 50,
            skillOptions = listOf(
                IncidentSkillOption("Diplomacy", "Convince them to stay"),
                IncidentSkillOption("Society", "Address their concerns"),
                IncidentSkillOption("Religion", "Appeal to faith"),
                IncidentSkillOption("Nature", "Improve local conditions")
            ),
            successEffect = "Population stays, no effect",
            failureEffect = "Lose 1 random worksite permanently",
            criticalFailureEffect = "Lose 1 random worksite permanently, +1 unrest",
            imagePath = "img/incidents/minor_placeholder.webp"
        ),
        Incident(
            id = "protests",
            name = "Protests",
            description = "Citizens take to the streets in protest",
            level = IncidentLevel.MINOR,
            percentileMin = 51,
            percentileMax = 60,
            skillOptions = listOf(
                IncidentSkillOption("Diplomacy", "Address the crowd"),
                IncidentSkillOption("Intimidation", "Disperse protesters"),
                IncidentSkillOption("Performance", "Distract them"),
                IncidentSkillOption("Arcana", "Use magical calming")
            ),
            successEffect = "Peaceful resolution, no effect",
            failureEffect = "Lose 1d4 Gold (property damage)",
            criticalFailureEffect = "Lose 2d4 Gold, -1 Fame",
            imagePath = "img/incidents/minor_placeholder.webp"
        ),
        Incident(
            id = "corruption_scandal",
            name = "Corruption Scandal",
            description = "Officials are caught in corrupt activities",
            level = IncidentLevel.MINOR,
            percentileMin = 61,
            percentileMax = 70,
            skillOptions = listOf(
                IncidentSkillOption("Society", "Investigate thoroughly"),
                IncidentSkillOption("Deception", "Cover it up"),
                IncidentSkillOption("Intimidation", "Purge the corrupt"),
                IncidentSkillOption("Diplomacy", "Manage public relations")
            ),
            successEffect = "Scandal contained, no effect",
            failureEffect = "Lose 1d4 Gold (embezzlement discovered)",
            criticalFailureEffect = "Lose 2d4 Gold, -1 Fame",
            imagePath = "img/incidents/minor_placeholder.webp"
        ),
        Incident(
            id = "rising_tensions",
            name = "Rising Tensions",
            description = "General discontent grows among the populace",
            level = IncidentLevel.MINOR,
            percentileMin = 71,
            percentileMax = 80,
            skillOptions = listOf(
                IncidentSkillOption("Diplomacy", "Calm the populace"),
                IncidentSkillOption("Religion", "Provide spiritual guidance"),
                IncidentSkillOption("Performance", "Entertain the people"),
                IncidentSkillOption("Arcana", "Create magical displays")
            ),
            successEffect = "Tensions ease, no effect",
            failureEffect = "+1 Unrest",
            criticalFailureEffect = "+2 Unrest",
            imagePath = "img/incidents/minor_placeholder.webp"
        ),
        Incident(
            id = "bandit_activity",
            name = "Bandit Activity",
            description = "Bandits raid your territory",
            level = IncidentLevel.MINOR,
            percentileMin = 81,
            percentileMax = 90,
            skillOptions = listOf(
                IncidentSkillOption("Intimidation", "Show force"),
                IncidentSkillOption("Stealth", "Infiltrate their ranks"),
                IncidentSkillOption("Survival", "Track to their lair"),
                IncidentSkillOption("Occultism", "Scry their location")
            ),
            successEffect = "Bandits deterred, no effect",
            failureEffect = "Lose 1d4 Gold to raids",
            criticalFailureEffect = "Lose 2d4 Gold, bandits destroy a random worksite",
            imagePath = "img/incidents/minor_placeholder.webp"
        ),
        Incident(
            id = "minor_diplomatic_incident",
            name = "Minor Diplomatic Incident",
            description = "A diplomatic misstep threatens relations",
            level = IncidentLevel.MINOR,
            percentileMin = 91,
            percentileMax = 100,
            skillOptions = listOf(
                IncidentSkillOption("Diplomacy", "Smooth over the issue"),
                IncidentSkillOption("Society", "Make formal apology"),
                IncidentSkillOption("Deception", "Deny involvement")
            ),
            successEffect = "Relations maintained, no effect",
            failureEffect = "One neighboring kingdom's attitude worsens by 1 step",
            criticalFailureEffect = "Two kingdoms' attitudes worsen by 1 step",
            imagePath = "img/incidents/minor_placeholder.webp"
        )
    )
    
    private val moderateIncidents = listOf(
        Incident(
            id = "production_strike",
            name = "Production Strike",
            description = "Workers strike across multiple worksites",
            level = IncidentLevel.MODERATE,
            percentileMin = 16,
            percentileMax = 24,
            skillOptions = listOf(
                IncidentSkillOption("Diplomacy", "Negotiate with strikers"),
                IncidentSkillOption("Society", "Arbitrate the dispute"),
                IncidentSkillOption("Crafting", "Work alongside them"),
                IncidentSkillOption("Arcana", "Automate production")
            ),
            successEffect = "Strike ends, no effect",
            failureEffect = "Lose 1d4+1 of a random resource",
            criticalFailureEffect = "Lose 2d4+1 of a random resource",
            imagePath = "img/incidents/mod_placeholder.webp"
        ),
        Incident(
            id = "riot",
            name = "Riot",
            description = "Violence erupts in your settlements",
            level = IncidentLevel.MODERATE,
            percentileMin = 61,
            percentileMax = 69,
            skillOptions = listOf(
                IncidentSkillOption("Intimidation", "Suppress the riot"),
                IncidentSkillOption("Diplomacy", "Negotiate with leaders"),
                IncidentSkillOption("Athletics", "Contain the violence"),
                IncidentSkillOption("Medicine", "Treat the injured")
            ),
            successEffect = "Riot quelled, no effect",
            failureEffect = "+1 Unrest, 1 structure damaged",
            criticalFailureEffect = "+1 Unrest, 1 structure destroyed",
            imagePath = "img/incidents/mod_placeholder.webp"
        ),
        Incident(
            id = "assassination_attempt",
            name = "Assassination Attempt",
            description = "An attempt is made on a leader's life",
            level = IncidentLevel.MODERATE,
            percentileMin = 79,
            percentileMax = 87,
            skillOptions = listOf(
                IncidentSkillOption("Athletics", "Protect the target"),
                IncidentSkillOption("Medicine", "Treat wounds"),
                IncidentSkillOption("Stealth", "Avoid the assassin")
            ),
            successEffect = "Assassination prevented, no effect",
            failureEffect = "Leader escapes; +1 Unrest",
            criticalFailureEffect = "Leader wounded; +2 Unrest, PC cannot take Kingdom Action",
            imagePath = "img/incidents/mod_placeholder.webp"
        ),
        Incident(
            id = "mass_exodus",
            name = "Mass Exodus",
            description = "Large groups prepare to leave the kingdom",
            level = IncidentLevel.MODERATE,
            percentileMin = 94,
            percentileMax = 100,
            skillOptions = listOf(
                IncidentSkillOption("Diplomacy", "Convince them to stay"),
                IncidentSkillOption("Performance", "Inspire hope"),
                IncidentSkillOption("Religion", "Provide spiritual guidance")
            ),
            successEffect = "Population remains, no effect",
            failureEffect = "Lose 1 worksite permanently, +1 Unrest",
            criticalFailureEffect = "Lose 1 worksite permanently, +1 Unrest, -1 Fame",
            imagePath = "img/incidents/mod_placeholder.webp"
        )
    )
    
    private val majorIncidents = listOf(
        Incident(
            id = "guerrilla_movement",
            name = "Guerrilla Movement",
            description = "Rebels organize to seize territory",
            level = IncidentLevel.MAJOR,
            percentileMin = 11,
            percentileMax = 17,
            skillOptions = listOf(
                IncidentSkillOption("Diplomacy", "Negotiate with rebels"),
                IncidentSkillOption("Intimidation", "Crush the rebellion"),
                IncidentSkillOption("Society", "Address grievances"),
                IncidentSkillOption("Religion", "Appeal to faith")
            ),
            successEffect = "Rebellion dispersed",
            failureEffect = "Rebels seize 1d3 hexes",
            criticalFailureEffect = "Rebels seize 2d3 hexes and gain an army",
            imagePath = "img/incidents/major_placeholder.webp"
        ),
        Incident(
            id = "secession_crisis",
            name = "Secession Crisis",
            description = "A settlement threatens to declare independence",
            level = IncidentLevel.MAJOR,
            percentileMin = 81,
            percentileMax = 87,
            skillOptions = listOf(
                IncidentSkillOption("Diplomacy", "Negotiate autonomy"),
                IncidentSkillOption("Intimidation", "Suppress movement"),
                IncidentSkillOption("Society", "Address grievances"),
                IncidentSkillOption("Performance", "Inspire loyalty")
            ),
            successEffect = "Independence movement quelled, no effect",
            failureEffect = "Settlement loses one level, structure destroyed, lose 2d4 Gold",
            criticalFailureEffect = "Settlement declares independence with adjacent hexes, +2 Unrest",
            imagePath = "img/incidents/major_placeholder.webp"
        ),
        Incident(
            id = "international_crisis",
            name = "International Crisis",
            description = "A major diplomatic crisis threatens war",
            level = IncidentLevel.MAJOR,
            percentileMin = 88,
            percentileMax = 100,
            skillOptions = listOf(
                IncidentSkillOption("Diplomacy", "Damage control"),
                IncidentSkillOption("Deception", "Shift blame"),
                IncidentSkillOption("Society", "Formal reparations"),
                IncidentSkillOption("Performance", "Public relations")
            ),
            successEffect = "Crisis contained, no effect",
            failureEffect = "One kingdom's attitude worsens by 2 steps",
            criticalFailureEffect = "Two kingdoms' attitudes worsen by 2 steps, -1 Fame",
            imagePath = "img/incidents/major_placeholder.webp"
        )
    )
}
