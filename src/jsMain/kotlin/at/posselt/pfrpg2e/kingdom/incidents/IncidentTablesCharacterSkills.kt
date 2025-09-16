package at.posselt.pfrpg2e.kingdom.incidents

import at.posselt.pfrpg2e.kingdom.data.*
import kotlin.random.Random

/**
 * Contains all unrest incident definitions using PF2e CHARACTER skills.
 * These are the actual PF2e skills that player characters use, not kingdom skills.
 * Players will roll using their character's skill bonuses.
 * 
 * Based on the Reignmaker-lite Unrest_incidents.md specification.
 */
object IncidentTablesCharacterSkills {
    
    // ===== MINOR INCIDENTS (DISCONTENT TIER) =====
    
    val minorIncidents = listOf(
        // 01-20: No Incident
        UnrestIncident(
            id = "no-incident-minor",
            name = "No Incident",
            tier = UnrestTier.DISCONTENT.name,
            description = "Tensions simmer but nothing erupts this turn",
            skillOptions = emptyList(),
            percentileRange = 1..20
        ),
        
        // 21-30: Crime Wave
        UnrestIncident(
            id = "crime-wave",
            name = "Crime Wave",
            tier = UnrestTier.DISCONTENT.name,
            description = "A wave of petty thefts and vandalism sweeps through the settlements.",
            skillOptions = listOf(
                IncidentSkillOption(
                    skill = "intimidation",
                    successEffect = "Crime suppressed, no effect",
                    failureEffect = "Lose 1d4 Gold",
                    criticalFailureExtra = "Lose 2d4 Gold, +1 Unrest"
                ),
                IncidentSkillOption(
                    skill = "thievery",
                    successEffect = "Infiltrate gangs, crime suppressed",
                    failureEffect = "Lose 1d4 Gold",
                    criticalFailureExtra = "Lose 2d4 Gold, +1 Unrest"
                ),
                IncidentSkillOption(
                    skill = "society",
                    successEffect = "Legal reform prevents crime",
                    failureEffect = "Lose 1d4 Gold",
                    criticalFailureExtra = "Lose 2d4 Gold, +1 Unrest"
                ),
                IncidentSkillOption(
                    skill = "occultism",
                    successEffect = "Divine the source, crime prevented",
                    failureEffect = "Lose 1d4 Gold",
                    criticalFailureExtra = "Lose 2d4 Gold, +1 Unrest"
                )
            ),
            percentileRange = 21..30
        ),
        
        // 31-40: Work Stoppage
        UnrestIncident(
            id = "work-stoppage",
            name = "Work Stoppage",
            tier = UnrestTier.DISCONTENT.name,
            description = "Workers in key industries threaten to strike over conditions.",
            skillOptions = listOf(
                IncidentSkillOption(
                    skill = "diplomacy",
                    successEffect = "Negotiate settlement, workers return",
                    failureEffect = "One random worksite produces nothing this turn",
                    criticalFailureExtra = "Two worksites produce nothing, +1 Unrest"
                ),
                IncidentSkillOption(
                    skill = "intimidation",
                    successEffect = "Force work to continue",
                    failureEffect = "One random worksite produces nothing this turn",
                    criticalFailureExtra = "Two worksites produce nothing, +1 Unrest"
                ),
                IncidentSkillOption(
                    skill = "performance",
                    successEffect = "Inspire workers to continue",
                    failureEffect = "One random worksite produces nothing this turn",
                    criticalFailureExtra = "Two worksites produce nothing, +1 Unrest"
                ),
                IncidentSkillOption(
                    skill = "medicine",
                    successEffect = "Address health and safety concerns",
                    failureEffect = "One random worksite produces nothing this turn",
                    criticalFailureExtra = "Two worksites produce nothing, +1 Unrest"
                )
            ),
            percentileRange = 31..40
        ),
        
        // 41-50: Emigration Threat
        UnrestIncident(
            id = "emigration-threat",
            name = "Emigration Threat",
            tier = UnrestTier.DISCONTENT.name,
            description = "Dissatisfied citizens threaten to leave the kingdom en masse.",
            skillOptions = listOf(
                IncidentSkillOption(
                    skill = "diplomacy",
                    successEffect = "Convince population to stay",
                    failureEffect = "Lose 1 random worksite permanently",
                    criticalFailureExtra = "Lose 1 random worksite permanently, +1 Unrest"
                ),
                IncidentSkillOption(
                    skill = "society",
                    successEffect = "Address systemic concerns",
                    failureEffect = "Lose 1 random worksite permanently",
                    criticalFailureExtra = "Lose 1 random worksite permanently, +1 Unrest"
                ),
                IncidentSkillOption(
                    skill = "religion",
                    successEffect = "Appeal to faith and tradition",
                    failureEffect = "Lose 1 random worksite permanently",
                    criticalFailureExtra = "Lose 1 random worksite permanently, +1 Unrest"
                ),
                IncidentSkillOption(
                    skill = "nature",
                    successEffect = "Improve local conditions",
                    failureEffect = "Lose 1 random worksite permanently",
                    criticalFailureExtra = "Lose 1 random worksite permanently, +1 Unrest"
                )
            ),
            percentileRange = 41..50
        ),
        
        // 51-60: Protests
        UnrestIncident(
            id = "protests",
            name = "Protests",
            tier = UnrestTier.DISCONTENT.name,
            description = "Citizens gather in the streets to protest kingdom policies.",
            skillOptions = listOf(
                IncidentSkillOption(
                    skill = "diplomacy",
                    successEffect = "Address crowd peacefully",
                    failureEffect = "Lose 1d4 Gold (property damage)",
                    criticalFailureExtra = "Lose 2d4 Gold, -1 Fame"
                ),
                IncidentSkillOption(
                    skill = "intimidation",
                    successEffect = "Disperse crowd",
                    failureEffect = "Lose 1d4 Gold (lost productivity)",
                    criticalFailureExtra = "Lose 2d4 Gold, -1 Fame"
                ),
                IncidentSkillOption(
                    skill = "performance",
                    successEffect = "Distract with entertainment",
                    failureEffect = "Lose 1d4 Gold",
                    criticalFailureExtra = "Lose 2d4 Gold, -1 Fame"
                ),
                IncidentSkillOption(
                    skill = "arcana",
                    successEffect = "Magical calming",
                    failureEffect = "Lose 1d4 Gold",
                    criticalFailureExtra = "Lose 2d4 Gold, -1 Fame"
                )
            ),
            percentileRange = 51..60
        ),
        
        // 61-70: Corruption Scandal
        UnrestIncident(
            id = "corruption-scandal",
            name = "Corruption Scandal",
            tier = UnrestTier.DISCONTENT.name,
            description = "Officials are caught embezzling from the kingdom treasury.",
            skillOptions = listOf(
                IncidentSkillOption(
                    skill = "society",
                    successEffect = "Investigation roots out corruption",
                    failureEffect = "Lose 1d4 Gold (embezzlement discovered)",
                    criticalFailureExtra = "Lose 2d4 Gold, -1 Fame (major corruption exposed)"
                ),
                IncidentSkillOption(
                    skill = "deception",
                    successEffect = "Cover-up successful",
                    failureEffect = "Lose 1d4 Gold",
                    criticalFailureExtra = "Lose 2d4 Gold, -1 Fame"
                ),
                IncidentSkillOption(
                    skill = "intimidation",
                    successEffect = "Purge corrupt officials",
                    failureEffect = "Lose 1d4 Gold",
                    criticalFailureExtra = "Lose 2d4 Gold, -1 Fame"
                ),
                IncidentSkillOption(
                    skill = "diplomacy",
                    successEffect = "Manage public relations",
                    failureEffect = "Lose 1d4 Gold",
                    criticalFailureExtra = "Lose 2d4 Gold, -1 Fame"
                )
            ),
            percentileRange = 61..70
        ),
        
        // 71-80: Rising Tensions
        UnrestIncident(
            id = "rising-tensions",
            name = "Rising Tensions",
            tier = UnrestTier.DISCONTENT.name,
            description = "Social divisions and resentments threaten to boil over.",
            skillOptions = listOf(
                IncidentSkillOption(
                    skill = "diplomacy",
                    successEffect = "Calm the populace",
                    failureEffect = "+1 Unrest",
                    criticalFailureExtra = "+2 Unrest"
                ),
                IncidentSkillOption(
                    skill = "religion",
                    successEffect = "Spiritual guidance eases tensions",
                    failureEffect = "+1 Unrest",
                    criticalFailureExtra = "+2 Unrest"
                ),
                IncidentSkillOption(
                    skill = "performance",
                    successEffect = "Entertainment distracts from problems",
                    failureEffect = "+1 Unrest",
                    criticalFailureExtra = "+2 Unrest"
                ),
                IncidentSkillOption(
                    skill = "arcana",
                    successEffect = "Magical displays inspire awe",
                    failureEffect = "+1 Unrest",
                    criticalFailureExtra = "+2 Unrest"
                )
            ),
            percentileRange = 71..80
        ),
        
        // 81-90: Bandit Activity
        UnrestIncident(
            id = "bandit-activity",
            name = "Bandit Activity",
            tier = UnrestTier.DISCONTENT.name,
            description = "Bandits raid trade routes and outlying settlements.",
            skillOptions = listOf(
                IncidentSkillOption(
                    skill = "intimidation",
                    successEffect = "Show of force deters bandits",
                    failureEffect = "Lose 1d4 Gold to raids",
                    criticalFailureExtra = "Lose 2d4 Gold, bandits destroy a random worksite"
                ),
                IncidentSkillOption(
                    skill = "stealth",
                    successEffect = "Infiltrate bandit camps",
                    failureEffect = "Lose 1d4 Gold",
                    criticalFailureExtra = "Lose 2d4 Gold, destroy worksite"
                ),
                IncidentSkillOption(
                    skill = "survival",
                    successEffect = "Track bandits to their lair",
                    failureEffect = "Lose 1d4 Gold",
                    criticalFailureExtra = "Lose 2d4 Gold, destroy worksite"
                ),
                IncidentSkillOption(
                    skill = "occultism",
                    successEffect = "Scrying reveals bandit locations",
                    failureEffect = "Lose 1d4 Gold",
                    criticalFailureExtra = "Lose 2d4 Gold, destroy worksite"
                )
            ),
            percentileRange = 81..90
        ),
        
        // 91-100: Minor Diplomatic Incident
        UnrestIncident(
            id = "minor-diplomatic-incident",
            name = "Minor Diplomatic Incident",
            tier = UnrestTier.DISCONTENT.name,
            description = "A diplomatic faux pas strains relations with neighbors.",
            skillOptions = listOf(
                IncidentSkillOption(
                    skill = "diplomacy",
                    successEffect = "Smooth over the incident",
                    failureEffect = "One neighboring kingdom's attitude worsens by 1 step",
                    criticalFailureExtra = "Two kingdoms' attitudes worsen by 1 step"
                ),
                IncidentSkillOption(
                    skill = "society",
                    successEffect = "Formal apology accepted",
                    failureEffect = "One neighboring kingdom's attitude worsens by 1 step",
                    criticalFailureExtra = "Two kingdoms' attitudes worsen by 1 step"
                ),
                IncidentSkillOption(
                    skill = "deception",
                    successEffect = "Deny involvement convincingly",
                    failureEffect = "One neighboring kingdom's attitude worsens by 1 step",
                    criticalFailureExtra = "Two kingdoms' attitudes worsen by 1 step"
                )
            ),
            percentileRange = 91..100
        )
    )
    
    // Additional table definitions would continue with all moderate and major incidents
    // following the same pattern...
    
    /**
     * Rolls for an incident based on the current unrest tier.
     * Returns null if no incident occurs or if the tier is Stable.
     */
    fun rollForIncident(tier: UnrestTier): UnrestIncident? {
        if (tier == UnrestTier.STABLE) {
            return null
        }
        
        val roll = Random.nextInt(1, 101) // 1-100 inclusive
        
        val incidentTable = when (tier) {
            UnrestTier.STABLE -> return null
            UnrestTier.DISCONTENT -> minorIncidents
            UnrestTier.TURMOIL -> minorIncidents // Placeholder - should be moderateIncidents
            UnrestTier.REBELLION -> minorIncidents // Placeholder - should be majorIncidents
        }
        
        val incident = incidentTable.find { incident ->
            incident.percentileRange?.contains(roll) == true
        }
        
        // Return null if it's a "No Incident" result
        return if (incident?.id?.startsWith("no-incident") == true) {
            null
        } else {
            incident
        }
    }
}
