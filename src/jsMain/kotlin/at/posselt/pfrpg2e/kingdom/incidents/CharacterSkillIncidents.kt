package at.posselt.pfrpg2e.kingdom.incidents

import at.posselt.pfrpg2e.kingdom.data.*
import kotlin.random.Random

/**
 * Simplified incident system using PF2e CHARACTER skills.
 * Based on Reignmaker-lite, where players use their characters' skills
 * to resolve incidents, not kingdom skills.
 */
object CharacterSkillIncidents {
    
    /**
     * Gets a sample incident for testing.
     * In a full implementation, this would use the complete tables.
     */
    fun getSampleIncident(tier: UnrestTier): UnrestIncident {
        return when (tier) {
            UnrestTier.STABLE -> UnrestIncident(
                id = "no-incident",
                name = "No Incident",
                tier = tier.name,
                description = "The kingdom remains stable",
                skillOptions = emptyList(),
                percentileRange = null
            )
            
            UnrestTier.DISCONTENT -> UnrestIncident(
                id = "crime-wave",
                name = "Crime Wave",
                tier = tier.name,
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
            )
            
            UnrestTier.TURMOIL -> UnrestIncident(
                id = "riot",
                name = "Riot",
                tier = tier.name,
                description = "Angry mobs riot in the streets, destroying property.",
                skillOptions = listOf(
                    IncidentSkillOption(
                        skill = "intimidation",
                        successEffect = "Riot suppressed",
                        failureEffect = "+1 Unrest, 1 structure damaged",
                        criticalFailureExtra = "+1 Unrest, 1 structure destroyed"
                    ),
                    IncidentSkillOption(
                        skill = "diplomacy",
                        successEffect = "Negotiate with rioters",
                        failureEffect = "+1 Unrest, 1 structure damaged",
                        criticalFailureExtra = "+1 Unrest, 1 structure destroyed"
                    ),
                    IncidentSkillOption(
                        skill = "athletics",
                        successEffect = "Contain the riot",
                        failureEffect = "+1 Unrest, 1 structure damaged",
                        criticalFailureExtra = "+1 Unrest, 1 structure destroyed"
                    ),
                    IncidentSkillOption(
                        skill = "medicine",
                        successEffect = "Treat the injured",
                        failureEffect = "+1 Unrest, 1 structure damaged",
                        criticalFailureExtra = "+1 Unrest, 1 structure destroyed"
                    )
                ),
                percentileRange = 61..69
            )
            
            UnrestTier.REBELLION -> UnrestIncident(
                id = "guerrilla-movement",
                name = "Guerrilla Movement",
                tier = tier.name,
                description = "Armed rebels begin guerrilla warfare against the kingdom.",
                skillOptions = listOf(
                    IncidentSkillOption(
                        skill = "diplomacy",
                        successEffect = "Negotiate with rebels",
                        failureEffect = "Rebels seize 1d3 hexes",
                        criticalFailureExtra = "Rebels seize 2d3 hexes and gain an army"
                    ),
                    IncidentSkillOption(
                        skill = "intimidation",
                        successEffect = "Crush rebellion",
                        failureEffect = "Rebels seize 1d3 hexes",
                        criticalFailureExtra = "Rebels seize 2d3 hexes and gain an army"
                    ),
                    IncidentSkillOption(
                        skill = "society",
                        successEffect = "Address grievances",
                        failureEffect = "Rebels seize 1d3 hexes",
                        criticalFailureExtra = "Rebels seize 2d3 hexes and gain an army"
                    ),
                    IncidentSkillOption(
                        skill = "religion",
                        successEffect = "Appeal to faith",
                        failureEffect = "Rebels seize 1d3 hexes",
                        criticalFailureExtra = "Rebels seize 2d3 hexes and gain an army"
                    )
                ),
                percentileRange = 11..17
            )
        }
    }
    
    /**
     * Simplified roll for incident - always returns a sample incident for now.
     * In production, this would use the full percentile tables.
     */
    fun rollForIncident(tier: UnrestTier): UnrestIncident? {
        if (tier == UnrestTier.STABLE) {
            return null
        }
        
        // For now, 50% chance of incident
        return if (Random.nextInt(100) < 50) {
            getSampleIncident(tier)
        } else {
            null
        }
    }
}
