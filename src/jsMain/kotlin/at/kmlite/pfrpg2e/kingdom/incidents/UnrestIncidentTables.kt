package at.kmlite.pfrpg2e.kingdom.incidents

import at.kmlite.pfrpg2e.kingdom.data.*

/**
 * Complete incident tables for the unrest system using CHARACTER skills.
 * Based on Reignmaker-lite tables where players use their PF2e character skills.
 */
object UnrestIncidentTables {
    
    /**
     * All minor tier incidents (Unrest 3-5)
     */
    val minorIncidents = listOf(
        // No Incident (01-20)
        UnrestIncident(
            id = "minor-no-incident",
            name = "No Incident",
            tier = UnrestTier.MINOR.name,
            description = "Tensions simmer but nothing erupts this turn",
            skillOptions = emptyList(),
            percentileRange = 1..20
        ),
        
        // Crime Wave (21-30)
        UnrestIncident(
            id = "crime-wave",
            name = "Crime Wave",
            tier = UnrestTier.MINOR.name,
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
        
        // Work Stoppage (31-40)
        UnrestIncident(
            id = "work-stoppage",
            name = "Work Stoppage",
            tier = UnrestTier.MINOR.name,
            description = "Workers refuse to continue their duties, disrupting production.",
            skillOptions = listOf(
                IncidentSkillOption(
                    skill = "diplomacy",
                    successEffect = "Workers return, no effect",
                    failureEffect = "One random worksite produces nothing this turn",
                    criticalFailureExtra = "Two worksites produce nothing, +1 Unrest"
                ),
                IncidentSkillOption(
                    skill = "intimidation",
                    successEffect = "Workers forced back, no effect",
                    failureEffect = "One random worksite produces nothing this turn",
                    criticalFailureExtra = "Two worksites produce nothing, +1 Unrest"
                ),
                IncidentSkillOption(
                    skill = "performance",
                    successEffect = "Workers inspired, no effect",
                    failureEffect = "One random worksite produces nothing this turn",
                    criticalFailureExtra = "Two worksites produce nothing, +1 Unrest"
                ),
                IncidentSkillOption(
                    skill = "medicine",
                    successEffect = "Health concerns addressed, no effect",
                    failureEffect = "One random worksite produces nothing this turn",
                    criticalFailureExtra = "Two worksites produce nothing, +1 Unrest"
                )
            ),
            percentileRange = 31..40
        ),
        
        // Emigration Threat (41-50)
        UnrestIncident(
            id = "emigration-threat",
            name = "Emigration Threat",
            tier = UnrestTier.MINOR.name,
            description = "Citizens threaten to leave the kingdom for better opportunities elsewhere.",
            skillOptions = listOf(
                IncidentSkillOption(
                    skill = "diplomacy",
                    successEffect = "Population stays, no effect",
                    failureEffect = "Lose 1 random worksite permanently",
                    criticalFailureExtra = "Lose 1 random worksite permanently, +1 unrest"
                ),
                IncidentSkillOption(
                    skill = "society",
                    successEffect = "Concerns addressed, no effect",
                    failureEffect = "Lose 1 random worksite permanently",
                    criticalFailureExtra = "Lose 1 random worksite permanently, +1 unrest"
                ),
                IncidentSkillOption(
                    skill = "religion",
                    successEffect = "Faith keeps them home, no effect",
                    failureEffect = "Lose 1 random worksite permanently",
                    criticalFailureExtra = "Lose 1 random worksite permanently, +1 unrest"
                ),
                IncidentSkillOption(
                    skill = "nature",
                    successEffect = "Local conditions improved, no effect",
                    failureEffect = "Lose 1 random worksite permanently",
                    criticalFailureExtra = "Lose 1 random worksite permanently, +1 unrest"
                )
            ),
            percentileRange = 41..50
        ),
        
        // Protests (51-60)
        UnrestIncident(
            id = "protests",
            name = "Protests",
            tier = UnrestTier.MINOR.name,
            description = "Angry citizens take to the streets in protest.",
            skillOptions = listOf(
                IncidentSkillOption(
                    skill = "diplomacy",
                    successEffect = "Peaceful resolution, no effect",
                    failureEffect = "Lose 1d4 Gold (property damage, lost productivity)",
                    criticalFailureExtra = "Lose 2d4 Gold, -1 Fame"
                ),
                IncidentSkillOption(
                    skill = "intimidation",
                    successEffect = "Protests dispersed, no effect",
                    failureEffect = "Lose 1d4 Gold (property damage, lost productivity)",
                    criticalFailureExtra = "Lose 2d4 Gold, -1 Fame"
                ),
                IncidentSkillOption(
                    skill = "performance",
                    successEffect = "Crowd distracted, no effect",
                    failureEffect = "Lose 1d4 Gold (property damage, lost productivity)",
                    criticalFailureExtra = "Lose 2d4 Gold, -1 Fame"
                ),
                IncidentSkillOption(
                    skill = "arcana",
                    successEffect = "Magical calming, no effect",
                    failureEffect = "Lose 1d4 Gold (property damage, lost productivity)",
                    criticalFailureExtra = "Lose 2d4 Gold, -1 Fame"
                )
            ),
            percentileRange = 51..60
        ),
        
        // Corruption Scandal (61-70)
        UnrestIncident(
            id = "corruption-scandal",
            name = "Corruption Scandal",
            tier = UnrestTier.MINOR.name,
            description = "Officials are caught embezzling kingdom funds.",
            skillOptions = listOf(
                IncidentSkillOption(
                    skill = "society",
                    successEffect = "Scandal contained, no effect",
                    failureEffect = "Lose 1d4 Gold (embezzlement/graft discovered)",
                    criticalFailureExtra = "Lose 2d4 Gold, -1 Fame (major corruption exposed)"
                ),
                IncidentSkillOption(
                    skill = "deception",
                    successEffect = "Cover-up successful, no effect",
                    failureEffect = "Lose 1d4 Gold (embezzlement/graft discovered)",
                    criticalFailureExtra = "Lose 2d4 Gold, -1 Fame (major corruption exposed)"
                ),
                IncidentSkillOption(
                    skill = "intimidation",
                    successEffect = "Officials purged, no effect",
                    failureEffect = "Lose 1d4 Gold (embezzlement/graft discovered)",
                    criticalFailureExtra = "Lose 2d4 Gold, -1 Fame (major corruption exposed)"
                ),
                IncidentSkillOption(
                    skill = "diplomacy",
                    successEffect = "Public relations managed, no effect",
                    failureEffect = "Lose 1d4 Gold (embezzlement/graft discovered)",
                    criticalFailureExtra = "Lose 2d4 Gold, -1 Fame (major corruption exposed)"
                )
            ),
            percentileRange = 61..70
        ),
        
        // Rising Tensions (71-80)
        UnrestIncident(
            id = "rising-tensions",
            name = "Rising Tensions",
            tier = UnrestTier.MINOR.name,
            description = "General unease spreads throughout the kingdom.",
            skillOptions = listOf(
                IncidentSkillOption(
                    skill = "diplomacy",
                    successEffect = "Tensions ease, no effect",
                    failureEffect = "+1 Unrest",
                    criticalFailureExtra = "+2 Unrest"
                ),
                IncidentSkillOption(
                    skill = "religion",
                    successEffect = "Spiritual guidance calms, no effect",
                    failureEffect = "+1 Unrest",
                    criticalFailureExtra = "+2 Unrest"
                ),
                IncidentSkillOption(
                    skill = "performance",
                    successEffect = "Entertainment distracts, no effect",
                    failureEffect = "+1 Unrest",
                    criticalFailureExtra = "+2 Unrest"
                ),
                IncidentSkillOption(
                    skill = "arcana",
                    successEffect = "Magical displays impress, no effect",
                    failureEffect = "+1 Unrest",
                    criticalFailureExtra = "+2 Unrest"
                )
            ),
            percentileRange = 71..80
        ),
        
        // Bandit Activity (81-90)
        UnrestIncident(
            id = "bandit-activity",
            name = "Bandit Activity",
            tier = UnrestTier.MINOR.name,
            description = "Bandits raid trade routes and settlements.",
            skillOptions = listOf(
                IncidentSkillOption(
                    skill = "intimidation",
                    successEffect = "Bandits deterred, no effect",
                    failureEffect = "Lose 1d4 Gold to raids",
                    criticalFailureExtra = "Lose 2d4 Gold, bandits destroy a random worksite"
                ),
                IncidentSkillOption(
                    skill = "stealth",
                    successEffect = "Bandits infiltrated, no effect",
                    failureEffect = "Lose 1d4 Gold to raids",
                    criticalFailureExtra = "Lose 2d4 Gold, bandits destroy a random worksite"
                ),
                IncidentSkillOption(
                    skill = "survival",
                    successEffect = "Bandits tracked to lair, no effect",
                    failureEffect = "Lose 1d4 Gold to raids",
                    criticalFailureExtra = "Lose 2d4 Gold, bandits destroy a random worksite"
                ),
                IncidentSkillOption(
                    skill = "occultism",
                    successEffect = "Bandits found by scrying, no effect",
                    failureEffect = "Lose 1d4 Gold to raids",
                    criticalFailureExtra = "Lose 2d4 Gold, bandits destroy a random worksite"
                )
            ),
            percentileRange = 81..90
        ),
        
        // Minor Diplomatic Incident (91-100)
        UnrestIncident(
            id = "minor-diplomatic-incident",
            name = "Minor Diplomatic Incident",
            tier = UnrestTier.MINOR.name,
            description = "A diplomatic misstep strains relations with neighbors.",
            skillOptions = listOf(
                IncidentSkillOption(
                    skill = "diplomacy",
                    successEffect = "Relations maintained, no effect",
                    failureEffect = "One neighbouring kingdom's attitude worsens by 1 step",
                    criticalFailureExtra = "Two random kingdoms' attitudes worsen by 1 step"
                ),
                IncidentSkillOption(
                    skill = "society",
                    successEffect = "Formal apology accepted, no effect",
                    failureEffect = "One neighbouring kingdom's attitude worsens by 1 step",
                    criticalFailureExtra = "Two random kingdoms' attitudes worsen by 1 step"
                ),
                IncidentSkillOption(
                    skill = "deception",
                    successEffect = "Involvement denied, no effect",
                    failureEffect = "One neighbouring kingdom's attitude worsens by 1 step",
                    criticalFailureExtra = "Two random kingdoms' attitudes worsen by 1 step"
                )
            ),
            percentileRange = 91..100
        )
    )
    
    /**
     * All moderate tier incidents (Unrest 6-8)
     */
    val moderateIncidents = listOf(
        // No Incident (01-15)
        UnrestIncident(
            id = "moderate-no-incident",
            name = "No Incident",
            tier = UnrestTier.MODERATE.name,
            description = "Close calls but the kingdom holds steady",
            skillOptions = emptyList(),
            percentileRange = 1..15
        ),
        
        // Production Strike (16-24)
        UnrestIncident(
            id = "production-strike",
            name = "Production Strike",
            tier = UnrestTier.MODERATE.name,
            description = "Workers refuse to produce critical resources.",
            skillOptions = listOf(
                IncidentSkillOption(
                    skill = "diplomacy",
                    successEffect = "Strike ends, no effect",
                    failureEffect = "Lose 1d4+1 of a random resource (Lumber, Ore, Stone)",
                    criticalFailureExtra = "Lose 2d4+1 of a random resource"
                ),
                IncidentSkillOption(
                    skill = "society",
                    successEffect = "Arbitration successful, no effect",
                    failureEffect = "Lose 1d4+1 of a random resource (Lumber, Ore, Stone)",
                    criticalFailureExtra = "Lose 2d4+1 of a random resource"
                ),
                IncidentSkillOption(
                    skill = "crafting",
                    successEffect = "Work alongside strikers, no effect",
                    failureEffect = "Lose 1d4+1 of a random resource (Lumber, Ore, Stone)",
                    criticalFailureExtra = "Lose 2d4+1 of a random resource"
                ),
                IncidentSkillOption(
                    skill = "arcana",
                    successEffect = "Production automated, no effect",
                    failureEffect = "Lose 1d4+1 of a random resource (Lumber, Ore, Stone)",
                    criticalFailureExtra = "Lose 2d4+1 of a random resource"
                )
            ),
            percentileRange = 16..24
        ),
        
        // Diplomatic Incident (25-33)
        UnrestIncident(
            id = "diplomatic-incident",
            name = "Diplomatic Incident",
            tier = UnrestTier.MODERATE.name,
            description = "A serious diplomatic blunder threatens foreign relations.",
            skillOptions = listOf(
                IncidentSkillOption(
                    skill = "diplomacy",
                    successEffect = "Relations maintained, no effect",
                    failureEffect = "One neighbouring kingdom's attitude worsens by 1 step",
                    criticalFailureExtra = "Two random kingdoms' attitudes worsen by 1 step"
                ),
                IncidentSkillOption(
                    skill = "deception",
                    successEffect = "Responsibility denied, no effect",
                    failureEffect = "One neighbouring kingdom's attitude worsens by 1 step",
                    criticalFailureExtra = "Two random kingdoms' attitudes worsen by 1 step"
                ),
                IncidentSkillOption(
                    skill = "society",
                    successEffect = "Formal apology accepted, no effect",
                    failureEffect = "One neighbouring kingdom's attitude worsens by 1 step",
                    criticalFailureExtra = "Two random kingdoms' attitudes worsen by 1 step"
                )
            ),
            percentileRange = 25..33
        ),
        
        // Tax Revolt (34-42)
        UnrestIncident(
            id = "tax-revolt",
            name = "Tax Revolt",
            tier = UnrestTier.MODERATE.name,
            description = "Citizens refuse to pay taxes.",
            skillOptions = listOf(
                IncidentSkillOption(
                    skill = "intimidation",
                    successEffect = "Taxes collected normally",
                    failureEffect = "Lose 1d4 Gold (reduced tax collection)",
                    criticalFailureExtra = "Lose 2d4 Gold, +1 Unrest"
                ),
                IncidentSkillOption(
                    skill = "diplomacy",
                    successEffect = "Tax rates negotiated, no effect",
                    failureEffect = "Lose 1d4 Gold (reduced tax collection)",
                    criticalFailureExtra = "Lose 2d4 Gold, +1 Unrest"
                ),
                IncidentSkillOption(
                    skill = "society",
                    successEffect = "Tax reform accepted, no effect",
                    failureEffect = "Lose 1d4 Gold (reduced tax collection)",
                    criticalFailureExtra = "Lose 2d4 Gold, +1 Unrest"
                ),
                IncidentSkillOption(
                    skill = "deception",
                    successEffect = "Creative accounting works, no effect",
                    failureEffect = "Lose 1d4 Gold (reduced tax collection)",
                    criticalFailureExtra = "Lose 2d4 Gold, +1 Unrest"
                )
            ),
            percentileRange = 34..42
        ),
        
        // Infrastructure Damage (43-51)
        UnrestIncident(
            id = "infrastructure-damage",
            name = "Infrastructure Damage",
            tier = UnrestTier.MODERATE.name,
            description = "Critical infrastructure is damaged by sabotage or neglect.",
            skillOptions = listOf(
                IncidentSkillOption(
                    skill = "crafting",
                    successEffect = "Damage prevented, no effect",
                    failureEffect = "One random structure in a random settlement becomes damaged",
                    criticalFailureExtra = "1d3 random structures become damaged, +1 unrest"
                ),
                IncidentSkillOption(
                    skill = "athletics",
                    successEffect = "Labor mobilized, no effect",
                    failureEffect = "One random structure in a random settlement becomes damaged",
                    criticalFailureExtra = "1d3 random structures become damaged, +1 unrest"
                ),
                IncidentSkillOption(
                    skill = "society",
                    successEffect = "Response organized, no effect",
                    failureEffect = "One random structure in a random settlement becomes damaged",
                    criticalFailureExtra = "1d3 random structures become damaged, +1 unrest"
                ),
                IncidentSkillOption(
                    skill = "arcana",
                    successEffect = "Magical restoration, no effect",
                    failureEffect = "One random structure in a random settlement becomes damaged",
                    criticalFailureExtra = "1d3 random structures become damaged, +1 unrest"
                )
            ),
            percentileRange = 43..51
        ),
        
        // Disease Outbreak (52-60)
        UnrestIncident(
            id = "disease-outbreak",
            name = "Disease Outbreak",
            tier = UnrestTier.MODERATE.name,
            description = "A dangerous disease spreads through the kingdom.",
            skillOptions = listOf(
                IncidentSkillOption(
                    skill = "medicine",
                    successEffect = "Disease contained, no effect",
                    failureEffect = "Lose 1d4 Food, +1 Unrest",
                    criticalFailureExtra = "Lose 2d4 Food, one Medicine or Faith structure damaged, +1 Unrest"
                ),
                IncidentSkillOption(
                    skill = "nature",
                    successEffect = "Natural remedies work, no effect",
                    failureEffect = "Lose 1d4 Food, +1 Unrest",
                    criticalFailureExtra = "Lose 2d4 Food, one Medicine or Faith structure damaged, +1 Unrest"
                ),
                IncidentSkillOption(
                    skill = "religion",
                    successEffect = "Divine healing succeeds, no effect",
                    failureEffect = "Lose 1d4 Food, +1 Unrest",
                    criticalFailureExtra = "Lose 2d4 Food, one Medicine or Faith structure damaged, +1 Unrest"
                )
            ),
            percentileRange = 52..60
        ),
        
        // Riot (61-69)
        UnrestIncident(
            id = "riot",
            name = "Riot",
            tier = UnrestTier.MODERATE.name,
            description = "Angry mobs riot in the streets, destroying property.",
            skillOptions = listOf(
                IncidentSkillOption(
                    skill = "intimidation",
                    successEffect = "Riot quelled, no effect",
                    failureEffect = "+1 Unrest, 1 structure damaged",
                    criticalFailureExtra = "+1 Unrest, 1 structure destroyed"
                ),
                IncidentSkillOption(
                    skill = "diplomacy",
                    successEffect = "Negotiation succeeds, no effect",
                    failureEffect = "+1 Unrest, 1 structure damaged",
                    criticalFailureExtra = "+1 Unrest, 1 structure destroyed"
                ),
                IncidentSkillOption(
                    skill = "athletics",
                    successEffect = "Riot contained, no effect",
                    failureEffect = "+1 Unrest, 1 structure damaged",
                    criticalFailureExtra = "+1 Unrest, 1 structure destroyed"
                ),
                IncidentSkillOption(
                    skill = "medicine",
                    successEffect = "Injured treated, tensions ease, no effect",
                    failureEffect = "+1 Unrest, 1 structure damaged",
                    criticalFailureExtra = "+1 Unrest, 1 structure destroyed"
                )
            ),
            percentileRange = 61..69
        ),
        
        // Settlement Crisis (70-78)
        UnrestIncident(
            id = "settlement-crisis",
            name = "Settlement Crisis",
            tier = UnrestTier.MODERATE.name,
            description = "An entire settlement faces economic or social collapse.",
            skillOptions = listOf(
                IncidentSkillOption(
                    skill = "diplomacy",
                    successEffect = "Settlement stabilized, no effect",
                    failureEffect = "Random settlement loses 1d4 Gold OR 1 structure damaged",
                    criticalFailureExtra = "Random settlement loses one level (minimum 1), +1 unrest"
                ),
                IncidentSkillOption(
                    skill = "society",
                    successEffect = "Emergency aid effective, no effect",
                    failureEffect = "Random settlement loses 1d4 Gold OR 1 structure damaged",
                    criticalFailureExtra = "Random settlement loses one level (minimum 1), +1 unrest"
                ),
                IncidentSkillOption(
                    skill = "religion",
                    successEffect = "Hope restored, no effect",
                    failureEffect = "Random settlement loses 1d4 Gold OR 1 structure damaged",
                    criticalFailureExtra = "Random settlement loses one level (minimum 1), +1 unrest"
                )
            ),
            percentileRange = 70..78
        ),
        
        // Assassination Attempt (79-87)
        UnrestIncident(
            id = "assassination-attempt",
            name = "Assassination Attempt",
            tier = UnrestTier.MODERATE.name,
            description = "An attempt is made on a kingdom leader's life.",
            skillOptions = listOf(
                IncidentSkillOption(
                    skill = "athletics",
                    successEffect = "Assassination prevented, no effect",
                    failureEffect = "Leader escapes; +1 Unrest",
                    criticalFailureExtra = "Leader wounded; +2 Unrest, that PC cannot take a Kingdom Action this turn"
                ),
                IncidentSkillOption(
                    skill = "medicine",
                    successEffect = "Wounds treated quickly, no effect",
                    failureEffect = "Leader escapes; +1 Unrest",
                    criticalFailureExtra = "Leader wounded; +2 Unrest, that PC cannot take a Kingdom Action this turn"
                ),
                IncidentSkillOption(
                    skill = "stealth",
                    successEffect = "Assassin avoided, no effect",
                    failureEffect = "Leader escapes; +1 Unrest",
                    criticalFailureExtra = "Leader wounded; +2 Unrest, that PC cannot take a Kingdom Action this turn"
                )
            ),
            percentileRange = 79..87
        ),
        
        // Trade Embargo (88-93)
        UnrestIncident(
            id = "moderate-trade-embargo",
            name = "Trade Embargo",
            tier = UnrestTier.MODERATE.name,
            description = "Neighboring kingdoms impose trade restrictions.",
            skillOptions = listOf(
                IncidentSkillOption(
                    skill = "diplomacy",
                    successEffect = "Trade continues, no effect",
                    failureEffect = "Lose 1d4 Gold OR 1d4+1 Resources",
                    criticalFailureExtra = "Lose 2d4 Gold AND 1d4+1 Resources, +1 Unrest"
                ),
                IncidentSkillOption(
                    skill = "society",
                    successEffect = "Loopholes found, no effect",
                    failureEffect = "Lose 1d4 Gold OR 1d4+1 Resources",
                    criticalFailureExtra = "Lose 2d4 Gold AND 1d4+1 Resources, +1 Unrest"
                ),
                IncidentSkillOption(
                    skill = "deception",
                    successEffect = "Smuggling routes established, no effect",
                    failureEffect = "Lose 1d4 Gold OR 1d4+1 Resources",
                    criticalFailureExtra = "Lose 2d4 Gold AND 1d4+1 Resources, +1 Unrest"
                ),
                IncidentSkillOption(
                    skill = "occultism",
                    successEffect = "Trade routes divined, no effect",
                    failureEffect = "Lose 1d4 Gold OR 1d4+1 Resources",
                    criticalFailureExtra = "Lose 2d4 Gold AND 1d4+1 Resources, +1 Unrest"
                )
            ),
            percentileRange = 88..93
        ),
        
        // Mass Exodus (94-100)
        UnrestIncident(
            id = "mass-exodus",
            name = "Mass Exodus",
            tier = UnrestTier.MODERATE.name,
            description = "Large numbers of citizens flee the kingdom.",
            skillOptions = listOf(
                IncidentSkillOption(
                    skill = "diplomacy",
                    successEffect = "Population remains, no effect",
                    failureEffect = "Lose 1 worksite permanently, +1 Unrest",
                    criticalFailureExtra = "Lose 1 worksite permanently, +1 Unrest, -1 Fame"
                ),
                IncidentSkillOption(
                    skill = "performance",
                    successEffect = "Hope inspired, no effect",
                    failureEffect = "Lose 1 worksite permanently, +1 Unrest",
                    criticalFailureExtra = "Lose 1 worksite permanently, +1 Unrest, -1 Fame"
                ),
                IncidentSkillOption(
                    skill = "religion",
                    successEffect = "Spiritual guidance works, no effect",
                    failureEffect = "Lose 1 worksite permanently, +1 Unrest",
                    criticalFailureExtra = "Lose 1 worksite permanently, +1 Unrest, -1 Fame"
                )
            ),
            percentileRange = 94..100
        )
    )
    
    /**
     * All major tier incidents (Unrest 9+)
     */
    val majorIncidents = listOf(
        // No Incident (01-10)
        UnrestIncident(
            id = "major-no-incident",
            name = "No Incident",
            tier = UnrestTier.MAJOR.name,
            description = "The crisis simmers without boiling over",
            skillOptions = emptyList(),
            percentileRange = 1..10
        ),
        
        // Guerrilla Movement (11-17)
        UnrestIncident(
            id = "guerrilla-movement",
            name = "Guerrilla Movement",
            tier = UnrestTier.MAJOR.name,
            description = "Armed rebels begin guerrilla warfare against the kingdom.",
            skillOptions = listOf(
                IncidentSkillOption(
                    skill = "diplomacy",
                    successEffect = "Rebellion dispersed",
                    failureEffect = "Rebels seize 1d3 hexes",
                    criticalFailureExtra = "Rebels seize 2d3 hexes and gain an army"
                ),
                IncidentSkillOption(
                    skill = "intimidation",
                    successEffect = "Rebellion crushed",
                    failureEffect = "Rebels seize 1d3 hexes",
                    criticalFailureExtra = "Rebels seize 2d3 hexes and gain an army"
                ),
                IncidentSkillOption(
                    skill = "society",
                    successEffect = "Grievances addressed",
                    failureEffect = "Rebels seize 1d3 hexes",
                    criticalFailureExtra = "Rebels seize 2d3 hexes and gain an army"
                ),
                IncidentSkillOption(
                    skill = "religion",
                    successEffect = "Faith unites kingdom",
                    failureEffect = "Rebels seize 1d3 hexes",
                    criticalFailureExtra = "Rebels seize 2d3 hexes and gain an army"
                )
            ),
            percentileRange = 11..17
        ),
        
        // Mass Desertion Threat (18-24)
        UnrestIncident(
            id = "mass-desertion-threat",
            name = "Mass Desertion Threat",
            tier = UnrestTier.MAJOR.name,
            description = "Military forces threaten to desert or mutiny.",
            skillOptions = listOf(
                IncidentSkillOption(
                    skill = "diplomacy",
                    successEffect = "Troops remain loyal, no effect",
                    failureEffect = "1 army makes morale check, highest tier military structure damaged",
                    criticalFailureExtra = "2 armies make morale checks, highest tier military structure destroyed"
                ),
                IncidentSkillOption(
                    skill = "intimidation",
                    successEffect = "Deserters threatened into compliance, no effect",
                    failureEffect = "1 army makes morale check, highest tier military structure damaged",
                    criticalFailureExtra = "2 armies make morale checks, highest tier military structure destroyed"
                ),
                IncidentSkillOption(
                    skill = "performance",
                    successEffect = "Loyalty inspired, no effect",
                    failureEffect = "1 army makes morale check, highest tier military structure damaged",
                    criticalFailureExtra = "2 armies make morale checks, highest tier military structure destroyed"
                )
            ),
            percentileRange = 18..24
        ),
        
        // Trade Embargo (25-31)
        UnrestIncident(
            id = "major-trade-embargo",
            name = "Trade Embargo",
            tier = UnrestTier.MAJOR.name,
            description = "Complete trade blockade by neighboring kingdoms.",
            skillOptions = listOf(
                IncidentSkillOption(
                    skill = "diplomacy",
                    successEffect = "Trade continues, no effect",
                    failureEffect = "Lose 2d4 Gold OR 2d4+1 Resources",
                    criticalFailureExtra = "Lose 3d4 Gold AND 2d4+1 Resources, +1 Unrest"
                ),
                IncidentSkillOption(
                    skill = "society",
                    successEffect = "Loopholes exploited, no effect",
                    failureEffect = "Lose 2d4 Gold OR 2d4+1 Resources",
                    criticalFailureExtra = "Lose 3d4 Gold AND 2d4+1 Resources, +1 Unrest"
                ),
                IncidentSkillOption(
                    skill = "deception",
                    successEffect = "Smuggling network established, no effect",
                    failureEffect = "Lose 2d4 Gold OR 2d4+1 Resources",
                    criticalFailureExtra = "Lose 3d4 Gold AND 2d4+1 Resources, +1 Unrest"
                ),
                IncidentSkillOption(
                    skill = "arcana",
                    successEffect = "Teleportation network created, no effect",
                    failureEffect = "Lose 2d4 Gold OR 2d4+1 Resources",
                    criticalFailureExtra = "Lose 3d4 Gold AND 2d4+1 Resources, +1 Unrest"
                )
            ),
            percentileRange = 25..31
        ),
        
        // Settlement Crisis (32-38)
        UnrestIncident(
            id = "major-settlement-crisis",
            name = "Settlement Crisis",
            tier = UnrestTier.MAJOR.name,
            description = "A major settlement faces complete collapse.",
            skillOptions = listOf(
                IncidentSkillOption(
                    skill = "diplomacy",
                    successEffect = "Settlement stabilized, no effect",
                    failureEffect = "Random settlement loses 2d4 Gold OR 2 structures damaged",
                    criticalFailureExtra = "Random settlement loses one level (minimum 1), 1 structure destroyed, +1 unrest"
                ),
                IncidentSkillOption(
                    skill = "society",
                    successEffect = "Emergency aid prevents collapse, no effect",
                    failureEffect = "Random settlement loses 2d4 Gold OR 2 structures damaged",
                    criticalFailureExtra = "Random settlement loses one level (minimum 1), 1 structure destroyed, +1 unrest"
                ),
                IncidentSkillOption(
                    skill = "religion",
                    successEffect = "Faith provides hope, no effect",
                    failureEffect = "Random settlement loses 2d4 Gold OR 2 structures damaged",
                    criticalFailureExtra = "Random settlement loses one level (minimum 1), 1 structure destroyed, +1 unrest"
                )
            ),
            percentileRange = 32..38
        ),
        
        // International Scandal (39-45)
        UnrestIncident(
            id = "international-scandal",
            name = "International Scandal",
            tier = UnrestTier.MAJOR.name,
            description = "A major scandal damages the kingdom's international reputation.",
            skillOptions = listOf(
                IncidentSkillOption(
                    skill = "performance",
                    successEffect = "Reputation maintained, no effect",
                    failureEffect = "Lose 1 Fame AND 1d4 gold",
                    criticalFailureExtra = "King has zero fame this round, lose 2d4 gold, +1 Unrest"
                ),
                IncidentSkillOption(
                    skill = "diplomacy",
                    successEffect = "Public relations managed, no effect",
                    failureEffect = "Lose 1 Fame AND 1d4 gold",
                    criticalFailureExtra = "King has zero fame this round, lose 2d4 gold, +1 Unrest"
                ),
                IncidentSkillOption(
                    skill = "deception",
                    successEffect = "Propaganda campaign succeeds, no effect",
                    failureEffect = "Lose 1 Fame AND 1d4 gold",
                    criticalFailureExtra = "King has zero fame this round, lose 2d4 gold, +1 Unrest"
                )
            ),
            percentileRange = 39..45
        ),
        
        // Prison Breaks (46-52)
        UnrestIncident(
            id = "prison-breaks",
            name = "Prison Breaks",
            tier = UnrestTier.MAJOR.name,
            description = "Mass prison break threatens public safety.",
            skillOptions = listOf(
                IncidentSkillOption(
                    skill = "intimidation",
                    successEffect = "Break prevented, no effect",
                    failureEffect = "Half imprisoned unrest becomes regular unrest, justice structure damaged",
                    criticalFailureExtra = "All imprisoned unrest becomes regular unrest, justice structure destroyed"
                ),
                IncidentSkillOption(
                    skill = "athletics",
                    successEffect = "Prisoners pursued and caught, no effect",
                    failureEffect = "Half imprisoned unrest becomes regular unrest, justice structure damaged",
                    criticalFailureExtra = "All imprisoned unrest becomes regular unrest, justice structure destroyed"
                ),
                IncidentSkillOption(
                    skill = "society",
                    successEffect = "Negotiation prevents break, no effect",
                    failureEffect = "Half imprisoned unrest becomes regular unrest, justice structure damaged",
                    criticalFailureExtra = "All imprisoned unrest becomes regular unrest, justice structure destroyed"
                )
            ),
            percentileRange = 46..52
        ),
        
        // Noble Conspiracy (53-59)
        UnrestIncident(
            id = "noble-conspiracy",
            name = "Noble Conspiracy",
            tier = UnrestTier.MAJOR.name,
            description = "Nobles plot against the throne.",
            skillOptions = listOf(
                IncidentSkillOption(
                    skill = "stealth",
                    successEffect = "Conspiracy exposed and dealt with, no effect",
                    failureEffect = "Lose 1d4 Gold, -1 fame",
                    criticalFailureExtra = "Lose 2d4 Gold, -1 fame, one PC loses kingdom action, +1 unrest"
                ),
                IncidentSkillOption(
                    skill = "intimidation",
                    successEffect = "Conspirators arrested, no effect",
                    failureEffect = "Lose 1d4 Gold, -1 fame",
                    criticalFailureExtra = "Lose 2d4 Gold, -1 fame, one PC loses kingdom action, +1 unrest"
                ),
                IncidentSkillOption(
                    skill = "society",
                    successEffect = "Political maneuvering succeeds, no effect",
                    failureEffect = "Lose 1d4 Gold, -1 fame",
                    criticalFailureExtra = "Lose 2d4 Gold, -1 fame, one PC loses kingdom action, +1 unrest"
                ),
                IncidentSkillOption(
                    skill = "occultism",
                    successEffect = "Truth divined, conspiracy prevented, no effect",
                    failureEffect = "Lose 1d4 Gold, -1 fame",
                    criticalFailureExtra = "Lose 2d4 Gold, -1 fame, one PC loses kingdom action, +1 unrest"
                )
            ),
            percentileRange = 53..59
        ),
        
        // Economic Crash (60-66)
        UnrestIncident(
            id = "economic-crash",
            name = "Economic Crash",
            tier = UnrestTier.MAJOR.name,
            description = "Complete economic collapse threatens the kingdom.",
            skillOptions = listOf(
                IncidentSkillOption(
                    skill = "society",
                    successEffect = "Economy stabilized, no effect",
                    failureEffect = "Lose 2d6 gold, highest tier commerce structure damaged",
                    criticalFailureExtra = "Lose 4d6 gold, highest tier commerce structure destroyed"
                ),
                IncidentSkillOption(
                    skill = "diplomacy",
                    successEffect = "Loans secured, no effect",
                    failureEffect = "Lose 2d6 gold, highest tier commerce structure damaged",
                    criticalFailureExtra = "Lose 4d6 gold, highest tier commerce structure destroyed"
                ),
                IncidentSkillOption(
                    skill = "crafting",
                    successEffect = "Production boosted, no effect",
                    failureEffect = "Lose 2d6 gold, highest tier commerce structure damaged",
                    criticalFailureExtra = "Lose 4d6 gold, highest tier commerce structure destroyed"
                ),
                IncidentSkillOption(
                    skill = "arcana",
                    successEffect = "Resources transmuted, no effect",
                    failureEffect = "Lose 2d6 gold, highest tier commerce structure damaged",
                    criticalFailureExtra = "Lose 4d6 gold, highest tier commerce structure destroyed"
                )
            ),
            percentileRange = 60..66
        ),
        
        // Religious Schism (67-73)
        UnrestIncident(
            id = "religious-schism",
            name = "Religious Schism",
            tier = UnrestTier.MAJOR.name,
            description = "Religious factions threaten to split the kingdom.",
            skillOptions = listOf(
                IncidentSkillOption(
                    skill = "religion",
                    successEffect = "Schism averted, no effect",
                    failureEffect = "Lose 2d6 gold, highest tier religious structure damaged",
                    criticalFailureExtra = "Lose 4d6 gold, highest tier religious structure destroyed"
                ),
                IncidentSkillOption(
                    skill = "diplomacy",
                    successEffect = "Factions mediated, no effect",
                    failureEffect = "Lose 2d6 gold, highest tier religious structure damaged",
                    criticalFailureExtra = "Lose 4d6 gold, highest tier religious structure destroyed"
                ),
                IncidentSkillOption(
                    skill = "occultism",
                    successEffect = "Divine intervention succeeds, no effect",
                    failureEffect = "Lose 2d6 gold, highest tier religious structure damaged",
                    criticalFailureExtra = "Lose 4d6 gold, highest tier religious structure destroyed"
                ),
                IncidentSkillOption(
                    skill = "society",
                    successEffect = "Secular compromise found, no effect",
                    failureEffect = "Lose 2d6 gold, highest tier religious structure damaged",
                    criticalFailureExtra = "Lose 4d6 gold, highest tier religious structure destroyed"
                )
            ),
            percentileRange = 67..73
        ),
        
        // Border Raid (74-80)
        UnrestIncident(
            id = "border-raid",
            name = "Border Raid",
            tier = UnrestTier.MAJOR.name,
            description = "Enemy forces raid the kingdom's borders.",
            skillOptions = listOf(
                IncidentSkillOption(
                    skill = "athletics",
                    successEffect = "Raiders repelled, no effect",
                    failureEffect = "Lose 1 border hex permanently, lose 1d4 Gold",
                    criticalFailureExtra = "Lose 1d3 border hexes permanently, lose 2d4 Gold"
                ),
                IncidentSkillOption(
                    skill = "intimidation",
                    successEffect = "Retaliation deters raiders, no effect",
                    failureEffect = "Lose 1 border hex permanently, lose 1d4 Gold",
                    criticalFailureExtra = "Lose 1d3 border hexes permanently, lose 2d4 Gold"
                ),
                IncidentSkillOption(
                    skill = "survival",
                    successEffect = "Raiders tracked and stopped, no effect",
                    failureEffect = "Lose 1 border hex permanently, lose 1d4 Gold",
                    criticalFailureExtra = "Lose 1d3 border hexes permanently, lose 2d4 Gold"
                ),
                IncidentSkillOption(
                    skill = "nature",
                    successEffect = "Terrain used defensively, no effect",
                    failureEffect = "Lose 1 border hex permanently, lose 1d4 Gold",
                    criticalFailureExtra = "Lose 1d3 border hexes permanently, lose 2d4 Gold"
                )
            ),
            percentileRange = 74..80
        ),
        
        // Secession Crisis (81-87)
        UnrestIncident(
            id = "secession-crisis",
            name = "Secession Crisis",
            tier = UnrestTier.MAJOR.name,
            description = "A settlement declares independence from the kingdom.",
            skillOptions = listOf(
                IncidentSkillOption(
                    skill = "diplomacy",
                    successEffect = "Independence movement quelled, no effect",
                    failureEffect = "Settlement loses one level, highest tier structure destroyed, lose 2d4 Gold",
                    criticalFailureExtra = "Settlement declares independence with all adjacent hexes, +2 Unrest"
                ),
                IncidentSkillOption(
                    skill = "intimidation",
                    successEffect = "Movement suppressed, no effect",
                    failureEffect = "Settlement loses one level, highest tier structure destroyed, lose 2d4 Gold",
                    criticalFailureExtra = "Settlement declares independence with all adjacent hexes, +2 Unrest"
                ),
                IncidentSkillOption(
                    skill = "society",
                    successEffect = "Grievances addressed, no effect",
                    failureEffect = "Settlement loses one level, highest tier structure destroyed, lose 2d4 Gold",
                    criticalFailureExtra = "Settlement declares independence with all adjacent hexes, +2 Unrest"
                ),
                IncidentSkillOption(
                    skill = "performance",
                    successEffect = "Loyalty inspired, no effect",
                    failureEffect = "Settlement loses one level, highest tier structure destroyed, lose 2d4 Gold",
                    criticalFailureExtra = "Settlement declares independence with all adjacent hexes, +2 Unrest"
                )
            ),
            percentileRange = 81..87
        ),
        
        // International Crisis (88-100)
        UnrestIncident(
            id = "international-crisis",
            name = "International Crisis",
            tier = UnrestTier.MAJOR.name,
            description = "Multiple kingdoms turn against you due to internal chaos.",
            skillOptions = listOf(
                IncidentSkillOption(
                    skill = "diplomacy",
                    successEffect = "Crisis contained, no effect",
                    failureEffect = "One kingdom's attitude worsens by 2 steps",
                    criticalFailureExtra = "Two kingdoms' attitudes worsen by 2 steps, -1 fame"
                ),
                IncidentSkillOption(
                    skill = "deception",
                    successEffect = "Blame shifted, no effect",
                    failureEffect = "One kingdom's attitude worsens by 2 steps",
                    criticalFailureExtra = "Two kingdoms' attitudes worsen by 2 steps, -1 fame"
                ),
                IncidentSkillOption(
                    skill = "society",
                    successEffect = "Formal reparations accepted, no effect",
                    failureEffect = "One kingdom's attitude worsens by 2 steps",
                    criticalFailureExtra = "Two kingdoms' attitudes worsen by 2 steps, -1 fame"
                ),
                IncidentSkillOption(
                    skill = "performance",
                    successEffect = "Public relations campaign succeeds, no effect",
                    failureEffect = "One kingdom's attitude worsens by 2 steps",
                    criticalFailureExtra = "Two kingdoms' attitudes worsen by 2 steps, -1 fame"
                )
            ),
            percentileRange = 88..100
        )
    )
    
    /**
     * Get all incidents for a specific tier
     */
    fun getIncidentsForTier(tier: UnrestTier): List<UnrestIncident> {
        return when (tier) {
            UnrestTier.STABLE -> emptyList()
            UnrestTier.MINOR -> minorIncidents
            UnrestTier.MODERATE -> moderateIncidents
            UnrestTier.MAJOR -> majorIncidents
        }
    }
    
    /**
     * Roll for a random incident based on tier
     */
    fun rollIncident(tier: UnrestTier): UnrestIncident? {
        if (tier == UnrestTier.STABLE) return null
        
        val incidents = getIncidentsForTier(tier)
        val roll = (1..100).random()
        
        return incidents.find { incident ->
            incident.percentileRange?.contains(roll) == true
        }
    }
}
