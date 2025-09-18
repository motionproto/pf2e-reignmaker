#!/usr/bin/env python3
"""
Create all Kingdom Incidents with proper modifier structures
Based on Unrest_incidents.md reference
"""

import json
import os
from pathlib import Path

# Define all incidents with their modifiers
INCIDENTS = {
    "minor": [
        {
            "id": "crime-wave",
            "name": "Crime Wave",
            "tier": "MINOR",
            "description": "Criminal activity surges throughout your settlements",
            "percentileMin": 21,
            "percentileMax": 30,
            "skillOptions": [
                {
                    "skill": "intimidation",
                    "description": "crack down on criminals",
                    "effects": {
                        "success": {"description": "Crime suppressed, no effect"},
                        "failure": {"description": "Lose 1d4 Gold", "modifiers": {"gold": "-1d4"}},
                        "criticalFailure": {"description": "Lose 2d4 Gold, +1 Unrest", "modifiers": {"gold": "-2d4", "unrest": 1}}
                    }
                },
                {
                    "skill": "thievery",
                    "description": "infiltrate gangs",
                    "effects": {
                        "success": {"description": "Crime suppressed, no effect"},
                        "failure": {"description": "Lose 1d4 Gold", "modifiers": {"gold": "-1d4"}},
                        "criticalFailure": {"description": "Lose 2d4 Gold, +1 Unrest", "modifiers": {"gold": "-2d4", "unrest": 1}}
                    }
                },
                {
                    "skill": "society",
                    "description": "legal reform",
                    "effects": {
                        "success": {"description": "Crime suppressed, no effect"},
                        "failure": {"description": "Lose 1d4 Gold", "modifiers": {"gold": "-1d4"}},
                        "criticalFailure": {"description": "Lose 2d4 Gold, +1 Unrest", "modifiers": {"gold": "-2d4", "unrest": 1}}
                    }
                },
                {
                    "skill": "occultism",
                    "description": "divine the source",
                    "effects": {
                        "success": {"description": "Crime suppressed, no effect"},
                        "failure": {"description": "Lose 1d4 Gold", "modifiers": {"gold": "-1d4"}},
                        "criticalFailure": {"description": "Lose 2d4 Gold, +1 Unrest", "modifiers": {"gold": "-2d4", "unrest": 1}}
                    }
                }
            ]
        },
        {
            "id": "work-stoppage",
            "name": "Work Stoppage",
            "tier": "MINOR",
            "description": "Workers in your kingdom refuse to continue their labor",
            "percentileMin": 31,
            "percentileMax": 40,
            "skillOptions": [
                {
                    "skill": "diplomacy",
                    "description": "negotiate with workers",
                    "effects": {
                        "success": {"description": "Workers return, no effect"},
                        "failure": {"description": "One random worksite produces nothing this turn", "modifiers": {"worksiteDisabled": 1}},
                        "criticalFailure": {"description": "Two worksites produce nothing, +1 Unrest", "modifiers": {"worksiteDisabled": 2, "unrest": 1}}
                    }
                },
                {
                    "skill": "intimidation",
                    "description": "force work",
                    "effects": {
                        "success": {"description": "Workers return, no effect"},
                        "failure": {"description": "One random worksite produces nothing this turn", "modifiers": {"worksiteDisabled": 1}},
                        "criticalFailure": {"description": "Two worksites produce nothing, +1 Unrest", "modifiers": {"worksiteDisabled": 2, "unrest": 1}}
                    }
                },
                {
                    "skill": "performance",
                    "description": "inspire workers",
                    "effects": {
                        "success": {"description": "Workers return, no effect"},
                        "failure": {"description": "One random worksite produces nothing this turn", "modifiers": {"worksiteDisabled": 1}},
                        "criticalFailure": {"description": "Two worksites produce nothing, +1 Unrest", "modifiers": {"worksiteDisabled": 2, "unrest": 1}}
                    }
                },
                {
                    "skill": "medicine",
                    "description": "address health concerns",
                    "effects": {
                        "success": {"description": "Workers return, no effect"},
                        "failure": {"description": "One random worksite produces nothing this turn", "modifiers": {"worksiteDisabled": 1}},
                        "criticalFailure": {"description": "Two worksites produce nothing, +1 Unrest", "modifiers": {"worksiteDisabled": 2, "unrest": 1}}
                    }
                }
            ]
        },
        {
            "id": "emigration-threat",
            "name": "Emigration Threat",
            "tier": "MINOR",
            "description": "Citizens threaten to leave your kingdom permanently",
            "percentileMin": 41,
            "percentileMax": 50,
            "skillOptions": [
                {
                    "skill": "diplomacy",
                    "description": "convince to stay",
                    "effects": {
                        "success": {"description": "Population stays, no effect"},
                        "failure": {"description": "Lose 1 random worksite permanently", "modifiers": {"worksiteLost": 1}},
                        "criticalFailure": {"description": "Lose 1 random worksite permanently, +1 unrest", "modifiers": {"worksiteLost": 1, "unrest": 1}}
                    }
                },
                {
                    "skill": "society",
                    "description": "address concerns",
                    "effects": {
                        "success": {"description": "Population stays, no effect"},
                        "failure": {"description": "Lose 1 random worksite permanently", "modifiers": {"worksiteLost": 1}},
                        "criticalFailure": {"description": "Lose 1 random worksite permanently, +1 unrest", "modifiers": {"worksiteLost": 1, "unrest": 1}}
                    }
                },
                {
                    "skill": "religion",
                    "description": "appeal to faith",
                    "effects": {
                        "success": {"description": "Population stays, no effect"},
                        "failure": {"description": "Lose 1 random worksite permanently", "modifiers": {"worksiteLost": 1}},
                        "criticalFailure": {"description": "Lose 1 random worksite permanently, +1 unrest", "modifiers": {"worksiteLost": 1, "unrest": 1}}
                    }
                },
                {
                    "skill": "nature",
                    "description": "improve local conditions",
                    "effects": {
                        "success": {"description": "Population stays, no effect"},
                        "failure": {"description": "Lose 1 random worksite permanently", "modifiers": {"worksiteLost": 1}},
                        "criticalFailure": {"description": "Lose 1 random worksite permanently, +1 unrest", "modifiers": {"worksiteLost": 1, "unrest": 1}}
                    }
                }
            ]
        },
        {
            "id": "protests",
            "name": "Protests",
            "tier": "MINOR",
            "description": "Citizens take to the streets in organized protests",
            "percentileMin": 51,
            "percentileMax": 60,
            "skillOptions": [
                {
                    "skill": "diplomacy",
                    "description": "address crowd",
                    "effects": {
                        "success": {"description": "Peaceful resolution, no effect"},
                        "failure": {"description": "Lose 1d4 Gold (property damage, lost productivity)", "modifiers": {"gold": "-1d4"}},
                        "criticalFailure": {"description": "Lose 2d4 Gold, -1 Fame", "modifiers": {"gold": "-2d4", "fame": -1}}
                    }
                },
                {
                    "skill": "intimidation",
                    "description": "disperse crowds",
                    "effects": {
                        "success": {"description": "Peaceful resolution, no effect"},
                        "failure": {"description": "Lose 1d4 Gold (property damage, lost productivity)", "modifiers": {"gold": "-1d4"}},
                        "criticalFailure": {"description": "Lose 2d4 Gold, -1 Fame", "modifiers": {"gold": "-2d4", "fame": -1}}
                    }
                },
                {
                    "skill": "performance",
                    "description": "distract crowds",
                    "effects": {
                        "success": {"description": "Peaceful resolution, no effect"},
                        "failure": {"description": "Lose 1d4 Gold (property damage, lost productivity)", "modifiers": {"gold": "-1d4"}},
                        "criticalFailure": {"description": "Lose 2d4 Gold, -1 Fame", "modifiers": {"gold": "-2d4", "fame": -1}}
                    }
                },
                {
                    "skill": "arcana",
                    "description": "magical calming",
                    "effects": {
                        "success": {"description": "Peaceful resolution, no effect"},
                        "failure": {"description": "Lose 1d4 Gold (property damage, lost productivity)", "modifiers": {"gold": "-1d4"}},
                        "criticalFailure": {"description": "Lose 2d4 Gold, -1 Fame", "modifiers": {"gold": "-2d4", "fame": -1}}
                    }
                }
            ]
        },
        {
            "id": "corruption-scandal",
            "name": "Corruption Scandal",
            "tier": "MINOR",
            "description": "Corruption among your officials is exposed",
            "percentileMin": 61,
            "percentileMax": 70,
            "skillOptions": [
                {
                    "skill": "society",
                    "description": "investigation",
                    "effects": {
                        "success": {"description": "Scandal contained, no effect"},
                        "failure": {"description": "Lose 1d4 Gold (embezzlement/graft discovered)", "modifiers": {"gold": "-1d4"}},
                        "criticalFailure": {"description": "Lose 2d4 Gold, -1 Fame (major corruption exposed publicly)", "modifiers": {"gold": "-2d4", "fame": -1}}
                    }
                },
                {
                    "skill": "deception",
                    "description": "cover-up",
                    "effects": {
                        "success": {"description": "Scandal contained, no effect"},
                        "failure": {"description": "Lose 1d4 Gold (embezzlement/graft discovered)", "modifiers": {"gold": "-1d4"}},
                        "criticalFailure": {"description": "Lose 2d4 Gold, -1 Fame (major corruption exposed publicly)", "modifiers": {"gold": "-2d4", "fame": -1}}
                    }
                },
                {
                    "skill": "intimidation",
                    "description": "purge corrupt officials",
                    "effects": {
                        "success": {"description": "Scandal contained, no effect"},
                        "failure": {"description": "Lose 1d4 Gold (embezzlement/graft discovered)", "modifiers": {"gold": "-1d4"}},
                        "criticalFailure": {"description": "Lose 2d4 Gold, -1 Fame (major corruption exposed publicly)", "modifiers": {"gold": "-2d4", "fame": -1}}
                    }
                },
                {
                    "skill": "diplomacy",
                    "description": "manage public relations",
                    "effects": {
                        "success": {"description": "Scandal contained, no effect"},
                        "failure": {"description": "Lose 1d4 Gold (embezzlement/graft discovered)", "modifiers": {"gold": "-1d4"}},
                        "criticalFailure": {"description": "Lose 2d4 Gold, -1 Fame (major corruption exposed publicly)", "modifiers": {"gold": "-2d4", "fame": -1}}
                    }
                }
            ]
        },
        {
            "id": "rising-tensions",
            "name": "Rising Tensions",
            "tier": "MINOR",
            "description": "General tensions rise throughout your kingdom",
            "percentileMin": 71,
            "percentileMax": 80,
            "skillOptions": [
                {
                    "skill": "diplomacy",
                    "description": "calm populace",
                    "effects": {
                        "success": {"description": "Tensions ease, no effect"},
                        "failure": {"description": "+1 Unrest", "modifiers": {"unrest": 1}},
                        "criticalFailure": {"description": "+2 Unrest", "modifiers": {"unrest": 2}}
                    }
                },
                {
                    "skill": "religion",
                    "description": "spiritual guidance",
                    "effects": {
                        "success": {"description": "Tensions ease, no effect"},
                        "failure": {"description": "+1 Unrest", "modifiers": {"unrest": 1}},
                        "criticalFailure": {"description": "+2 Unrest", "modifiers": {"unrest": 2}}
                    }
                },
                {
                    "skill": "performance",
                    "description": "entertainment",
                    "effects": {
                        "success": {"description": "Tensions ease, no effect"},
                        "failure": {"description": "+1 Unrest", "modifiers": {"unrest": 1}},
                        "criticalFailure": {"description": "+2 Unrest", "modifiers": {"unrest": 2}}
                    }
                },
                {
                    "skill": "arcana",
                    "description": "magical displays",
                    "effects": {
                        "success": {"description": "Tensions ease, no effect"},
                        "failure": {"description": "+1 Unrest", "modifiers": {"unrest": 1}},
                        "criticalFailure": {"description": "+2 Unrest", "modifiers": {"unrest": 2}}
                    }
                }
            ]
        },
        {
            "id": "bandit-activity",
            "name": "Bandit Activity",
            "tier": "MINOR",
            "description": "Bandit raids threaten your trade routes and settlements",
            "percentileMin": 81,
            "percentileMax": 90,
            "skillOptions": [
                {
                    "skill": "intimidation",
                    "description": "show force",
                    "effects": {
                        "success": {"description": "Bandits deterred, no effect"},
                        "failure": {"description": "Lose 1d4 Gold to raids", "modifiers": {"gold": "-1d4"}},
                        "criticalFailure": {"description": "Lose 2d4 Gold, bandits destroy a random worksite", "modifiers": {"gold": "-2d4", "worksiteDestroyed": 1}}
                    }
                },
                {
                    "skill": "stealth",
                    "description": "infiltrate bandits",
                    "effects": {
                        "success": {"description": "Bandits deterred, no effect"},
                        "failure": {"description": "Lose 1d4 Gold to raids", "modifiers": {"gold": "-1d4"}},
                        "criticalFailure": {"description": "Lose 2d4 Gold, bandits destroy a random worksite", "modifiers": {"gold": "-2d4", "worksiteDestroyed": 1}}
                    }
                },
                {
                    "skill": "survival",
                    "description": "track to lair",
                    "effects": {
                        "success": {"description": "Bandits deterred, no effect"},
                        "failure": {"description": "Lose 1d4 Gold to raids", "modifiers": {"gold": "-1d4"}},
                        "criticalFailure": {"description": "Lose 2d4 Gold, bandits destroy a random worksite", "modifiers": {"gold": "-2d4", "worksiteDestroyed": 1}}
                    }
                },
                {
                    "skill": "occultism",
                    "description": "scrying",
                    "effects": {
                        "success": {"description": "Bandits deterred, no effect"},
                        "failure": {"description": "Lose 1d4 Gold to raids", "modifiers": {"gold": "-1d4"}},
                        "criticalFailure": {"description": "Lose 2d4 Gold, bandits destroy a random worksite", "modifiers": {"gold": "-2d4", "worksiteDestroyed": 1}}
                    }
                }
            ]
        },
        {
            "id": "minor-diplomatic-incident",
            "name": "Minor Diplomatic Incident",
            "tier": "MINOR",
            "description": "A diplomatic misstep strains relations with neighbors",
            "percentileMin": 91,
            "percentileMax": 100,
            "skillOptions": [
                {
                    "skill": "diplomacy",
                    "description": "smooth over",
                    "effects": {
                        "success": {"description": "Relations maintained, no effect"},
                        "failure": {"description": "One neighbouring kingdom's attitude worsens by 1 step", "modifiers": {"diplomaticRelations": -1}},
                        "criticalFailure": {"description": "Two random kingdoms' attitudes worsen by 1 step", "modifiers": {"diplomaticRelations": -2}}
                    }
                },
                {
                    "skill": "society",
                    "description": "formal apology",
                    "effects": {
                        "success": {"description": "Relations maintained, no effect"},
                        "failure": {"description": "One neighbouring kingdom's attitude worsens by 1 step", "modifiers": {"diplomaticRelations": -1}},
                        "criticalFailure": {"description": "Two random kingdoms' attitudes worsen by 1 step", "modifiers": {"diplomaticRelations": -2}}
                    }
                },
                {
                    "skill": "deception",
                    "description": "deny involvement",
                    "effects": {
                        "success": {"description": "Relations maintained, no effect"},
                        "failure": {"description": "One neighbouring kingdom's attitude worsens by 1 step", "modifiers": {"diplomaticRelations": -1}},
                        "criticalFailure": {"description": "Two random kingdoms' attitudes worsen by 1 step", "modifiers": {"diplomaticRelations": -2}}
                    }
                }
            ]
        }
    ],
    "moderate": [
        {
            "id": "production-strike",
            "name": "Production Strike",
            "tier": "MODERATE",
            "description": "Workers strike, halting resource production",
            "percentileMin": 16,
            "percentileMax": 24,
            "skillOptions": [
                {
                    "skill": "diplomacy",
                    "description": "negotiate with workers",
                    "effects": {
                        "success": {"description": "Strike ends, no effect"},
                        "failure": {"description": "Lose 1d4+1 of a random resource (Lumber, Ore, Stone)", "modifiers": {"resourceLoss": "1d4+1"}},
                        "criticalFailure": {"description": "Lose 2d4+1 of a random resource (Lumber, Ore, Stone)", "modifiers": {"resourceLoss": "2d4+1"}}
                    }
                },
                {
                    "skill": "society",
                    "description": "arbitrate",
                    "effects": {
                        "success": {"description": "Strike ends, no effect"},
                        "failure": {"description": "Lose 1d4+1 of a random resource (Lumber, Ore, Stone)", "modifiers": {"resourceLoss": "1d4+1"}},
                        "criticalFailure": {"description": "Lose 2d4+1 of a random resource (Lumber, Ore, Stone)", "modifiers": {"resourceLoss": "2d4+1"}}
                    }
                },
                {
                    "skill": "crafting",
                    "description": "work alongside",
                    "effects": {
                        "success": {"description": "Strike ends, no effect"},
                        "failure": {"description": "Lose 1d4+1 of a random resource (Lumber, Ore, Stone)", "modifiers": {"resourceLoss": "1d4+1"}},
                        "criticalFailure": {"description": "Lose 2d4+1 of a random resource (Lumber, Ore, Stone)", "modifiers": {"resourceLoss": "2d4+1"}}
                    }
                },
                {
                    "skill": "arcana",
                    "description": "automate production",
                    "effects": {
                        "success": {"description": "Strike ends, no effect"},
                        "failure": {"description": "Lose 1d4+1 of a random resource (Lumber, Ore, Stone)", "modifiers": {"resourceLoss": "1d4+1"}},
                        "criticalFailure": {"description": "Lose 2d4+1 of a random resource (Lumber, Ore, Stone)", "modifiers": {"resourceLoss": "2d4+1"}}
                    }
                }
            ]
        },
        {
            "id": "diplomatic-incident",
            "name": "Diplomatic Incident",
            "tier": "MODERATE",
            "description": "A serious diplomatic incident threatens relations",
            "percentileMin": 25,
            "percentileMax": 33,
            "skillOptions": [
                {
                    "skill": "diplomacy",
                    "description": "smooth over",
                    "effects": {
                        "success": {"description": "Relations maintained, no effect"},
                        "failure": {"description": "One neighbouring kingdom's attitude worsens by 1 step", "modifiers": {"diplomaticRelations": -1}},
                        "criticalFailure": {"description": "Two random kingdoms' attitudes worsen by 1 step", "modifiers": {"diplomaticRelations": -2}}
                    }
                },
                {
                    "skill": "deception",
                    "description": "deny responsibility",
                    "effects": {
                        "success": {"description": "Relations maintained, no effect"},
                        "failure": {"description": "One neighbouring kingdom's attitude worsens by 1 step", "modifiers": {"diplomaticRelations": -1}},
                        "criticalFailure": {"description": "Two random kingdoms' attitudes worsen by 1 step", "modifiers": {"diplomaticRelations": -2}}
                    }
                },
                {
                    "skill": "society",
                    "description": "formal apology",
                    "effects": {
                        "success": {"description": "Relations maintained, no effect"},
                        "failure": {"description": "One neighbouring kingdom's attitude worsens by 1 step", "modifiers": {"diplomaticRelations": -1}},
                        "criticalFailure": {"description": "Two random kingdoms' attitudes worsen by 1 step", "modifiers": {"diplomaticRelations": -2}}
                    }
                }
            ]
        },
        {
            "id": "tax-revolt",
            "name": "Tax Revolt",
            "tier": "MODERATE",
            "description": "Citizens revolt against tax collection",
            "percentileMin": 34,
            "percentileMax": 42,
            "skillOptions": [
                {
                    "skill": "intimidation",
                    "description": "enforce collection",
                    "effects": {
                        "success": {"description": "Taxes collected normally"},
                        "failure": {"description": "Lose 1d4 Gold (reduced tax collection)", "modifiers": {"gold": "-1d4"}},
                        "criticalFailure": {"description": "Lose 2d4 Gold, +1 Unrest", "modifiers": {"gold": "-2d4", "unrest": 1}}
                    }
                },
                {
                    "skill": "diplomacy",
                    "description": "negotiate rates",
                    "effects": {
                        "success": {"description": "Taxes collected normally"},
                        "failure": {"description": "Lose 1d4 Gold (reduced tax collection)", "modifiers": {"gold": "-1d4"}},
                        "criticalFailure": {"description": "Lose 2d4 Gold, +1 Unrest", "modifiers": {"gold": "-2d4", "unrest": 1}}
                    }
                },
                {
                    "skill": "society",
                    "description": "tax reform",
                    "effects": {
                        "success": {"description": "Taxes collected normally"},
                        "failure": {"description": "Lose 1d4 Gold (reduced tax collection)", "modifiers": {"gold": "-1d4"}},
                        "criticalFailure": {"description": "Lose 2d4 Gold, +1 Unrest", "modifiers": {"gold": "-2d4", "unrest": 1}}
                    }
                },
                {
                    "skill": "deception",
                    "description": "creative accounting",
                    "effects": {
                        "success": {"description": "Taxes collected normally"},
                        "failure": {"description": "Lose 1d4 Gold (reduced tax collection)", "modifiers": {"gold": "-1d4"}},
                        "criticalFailure": {"description": "Lose 2d4 Gold, +1 Unrest", "modifiers": {"gold": "-2d4", "unrest": 1}}
                    }
                }
            ]
        },
        {
            "id": "infrastructure-damage",
            "name": "Infrastructure Damage",
            "tier": "MODERATE",
            "description": "Critical infrastructure is damaged or sabotaged",
            "percentileMin": 43,
            "percentileMax": 51,
            "skillOptions": [
                {
                    "skill": "crafting",
                    "description": "emergency repairs",
                    "effects": {
                        "success": {"description": "Damage prevented, no effect"},
                        "failure": {"description": "One random structure in a random settlement becomes damaged", "modifiers": {"structureDamaged": 1}},
                        "criticalFailure": {"description": "1d3 random structures become damaged (random settlements), +1 unrest", "modifiers": {"structureDamaged": "1d3", "unrest": 1}}
                    }
                },
                {
                    "skill": "athletics",
                    "description": "labor mobilization",
                    "effects": {
                        "success": {"description": "Damage prevented, no effect"},
                        "failure": {"description": "One random structure in a random settlement becomes damaged", "modifiers": {"structureDamaged": 1}},
                        "criticalFailure": {"description": "1d3 random structures become damaged (random settlements), +1 unrest", "modifiers": {"structureDamaged": "1d3", "unrest": 1}}
                    }
                },
                {
                    "skill": "society",
                    "description": "organize response",
                    "effects": {
                        "success": {"description": "Damage prevented, no effect"},
                        "failure": {"description": "One random structure in a random settlement becomes damaged", "modifiers": {"structureDamaged": 1}},
                        "criticalFailure": {"description": "1d3 random structures become damaged (random settlements), +1 unrest", "modifiers": {"structureDamaged": "1d3", "unrest": 1}}
                    }
                },
                {
                    "skill": "arcana",
                    "description": "magical restoration",
                    "effects": {
                        "success": {"description": "Damage prevented, no effect"},
                        "failure": {"description": "One random structure in a random settlement becomes damaged", "modifiers": {"structureDamaged": 1}},
                        "criticalFailure": {"description": "1d3 random structures become damaged (random settlements), +1 unrest", "modifiers": {"structureDamaged": "1d3", "unrest": 1}}
                    }
                }
            ]
        },
        {
            "id": "disease-outbreak",
            "name": "Disease Outbreak",
            "tier": "MODERATE",
            "description": "A dangerous disease spreads through your settlements",
            "percentileMin": 52,
            "percentileMax": 60,
            "skillOptions": [
                {
                    "skill": "medicine",
                    "description": "treat disease",
                    "effects": {
                        "success": {"description": "Disease contained, no effect"},
                        "failure": {"description": "Lose 1d4 Food (feeding the sick), +1 Unrest", "modifiers": {"food": "-1d4", "unrest": 1}},
                        "criticalFailure": {"description": "Lose 2d4 Food, one Medicine or Faith structure becomes damaged, +1 Unrest", 
                                         "modifiers": {"food": "-2d4", "structureTypeDamaged": "medicine_or_faith", "unrest": 1}}
                    }
                },
                {
                    "skill": "nature",
                    "description": "natural remedies",
                    "effects": {
                        "success": {"description": "Disease contained, no effect"},
                        "failure": {"description": "Lose 1d4 Food (feeding the sick), +1 Unrest", "modifiers": {"food": "-1d4", "unrest": 1}},
                        "criticalFailure": {"description": "Lose 2d4 Food, one Medicine or Faith structure becomes damaged, +1 Unrest", 
                                         "modifiers": {"food": "-2d4", "structureTypeDamaged": "medicine_or_faith", "unrest": 1}}
                    }
                },
                {
                    "skill": "religion",
                    "description": "divine healing",
                    "effects": {
                        "success": {"description": "Disease contained, no effect"},
                        "failure": {"description": "Lose 1d4 Food (feeding the sick), +1 Unrest", "modifiers": {"food": "-1d4", "unrest": 1}},
                        "criticalFailure": {"description": "Lose 2d4 Food, one Medicine or Faith structure becomes damaged, +1 Unrest", 
                                         "modifiers": {"food": "-2d4", "structureTypeDamaged": "medicine_or_faith", "unrest": 1}}
                    }
                }
            ]
        },
        {
            "id": "riot",
            "name": "Riot",
            "tier": "MODERATE",
            "description": "Violent riots break out in your settlements",
            "percentileMin": 61,
            "percentileMax": 69,
            "skillOptions": [
                {
                    "skill": "intimidation",
                    "description": "suppress riot",
                    "effects": {
                        "success": {"description": "Riot quelled, no effect"},
                        "failure": {"description": "+1 Unrest, 1 structure damaged", "modifiers": {"unrest": 1, "structureDamaged": 1}},
                        "criticalFailure": {"description": "+1 Unrest, 1 structure destroyed", "modifiers": {"unrest": 1, "structureDestroyed": 1}}
                    }
                },
                {
                    "skill": "diplomacy",
                    "description": "negotiate with rioters",
                    "effects": {
                        "success": {"description": "Riot quelled, no effect"},
                        "failure": {"description": "+1 Unrest, 1 structure damaged", "modifiers": {"unrest": 1, "structureDamaged": 1}},
                        "criticalFailure": {"description": "+1 Unrest, 1 structure destroyed", "modifiers": {"unrest": 1, "structureDestroyed": 1}}
                    }
                },
                {
                    "skill": "athletics",
                    "description": "contain riot",
                    "effects": {
                        "success": {"description": "Riot quelled, no effect"},
                        "failure": {"description": "+1 Unrest, 1 structure damaged", "modifiers": {"unrest": 1, "structureDamaged": 1}},
                        "criticalFailure": {"description": "+1 Unrest, 1 structure destroyed", "modifiers": {"unrest": 1, "structureDestroyed": 1}}
                    }
                },
                {
                    "skill": "medicine",
                    "description": "treat injured",
                    "effects": {
                        "success": {"description": "Riot quelled, no effect"},
                        "failure": {"description": "+1 Unrest, 1 structure damaged", "modifiers": {"unrest": 1, "structureDamaged": 1}},
                        "criticalFailure": {"description": "+1 Unrest, 1 structure destroyed", "modifiers": {"unrest": 1, "structureDestroyed": 1}}
                    }
                }
            ]
        },
        {
            "id": "settlement-crisis",
            "name": "Settlement Crisis",
            "tier": "MODERATE",
            "description": "One of your settlements faces a major crisis",
            "percentileMin": 70,
            "percentileMax": 78,
            "skillOptions": [
                {
                    "skill": "diplomacy",
                    "description": "address concerns",
                    "effects": {
                        "success": {"description": "Settlement stabilized, no effect"},
                        "failure": {"description": "Random settlement loses 1d4 Gold OR 1 structure damaged", 
                                  "modifiers": {"gold": "-1d4", "structureDamaged": 1}},
                        "criticalFailure": {"description": "Random settlement loses one level (minimum level 1), +1 unrest", 
                                          "modifiers": {"settlementLevel": -1, "unrest": 1}}
                    }
                },
                {
                    "skill": "society",
                    "description": "emergency aid",
                    "effects": {
                        "success": {"description": "Settlement stabilized, no effect"},
                        "failure": {"description": "Random settlement loses 1d4 Gold OR 1 structure damaged", 
                                  "modifiers": {"gold": "-1d4", "structureDamaged": 1}},
                        "criticalFailure": {"description": "Random settlement loses one level (minimum level 1), +1 unrest", 
                                          "modifiers": {"settlementLevel": -1, "unrest": 1}}
                    }
                },
                {
                    "skill": "religion",
                    "description": "provide hope",
                    "effects": {
                        "success": {"description": "Settlement stabilized, no effect"},
                        "failure": {"description": "Random settlement loses 1d4 Gold OR 1 structure damaged", 
                                  "modifiers": {"gold": "-1d4", "structureDamaged": 1}},
                        "criticalFailure": {"description": "Random settlement loses one level (minimum level 1), +1 unrest", 
                                          "modifiers": {"settlementLevel": -1, "unrest": 1}}
                    }
                }
            ]
        },
        {
            "id": "assassination-attempt",
            "name": "Assassination Attempt",
            "tier": "MODERATE",
            "description": "An assassin targets one of your kingdom's leaders",
            "percentileMin": 79,
            "percentileMax": 87,
            "skillOptions": [
                {
                    "skill": "athletics",
                    "description": "protect target",
                    "effects": {
                        "success": {"description": "Assassination prevented, no effect"},
                        "failure": {"description": "Leader escapes; +1 Unrest", "modifiers": {"unrest": 1}},
                        "criticalFailure": {"description": "Leader wounded; +2 Unrest, that PC cannot take a Kingdom Action this turn", 
                                          "modifiers": {"unrest": 2, "leaderWounded": True}}
                    }
                },
                {
                    "skill": "medicine",
                    "description": "treat wounds",
                    "effects": {
                        "success": {"description": "Assassination prevented, no effect"},
                        "failure": {"description": "Leader escapes; +1 Unrest", "modifiers": {"unrest": 1}},
                        "criticalFailure": {"description": "Leader wounded; +2 Unrest, that PC cannot take a Kingdom Action this turn", 
                                          "modifiers": {"unrest": 2, "leaderWounded": True}}
                    }
                },
                {
                    "skill": "stealth",
                    "description": "avoid the assassin",
                    "effects": {
                        "success": {"description": "Assassination prevented, no effect"},
                        "failure": {"description": "Leader escapes; +1 Unrest", "modifiers": {"unrest": 1}},
                        "criticalFailure": {"description": "Leader wounded; +2 Unrest, that PC cannot take a Kingdom Action this turn", 
                                          "modifiers": {"unrest": 2, "leaderWounded": True}}
                    }
                }
            ]
        },
        {
            "id": "turmoil-trade-embargo",
            "name": "Trade Embargo",
            "tier": "MODERATE",
            "description": "Neighboring kingdoms impose trade restrictions",
            "percentileMin": 88,
            "percentileMax": 93,
            "skillOptions": [
                {
                    "skill": "diplomacy",
                    "description": "negotiate",
                    "effects": {
                        "success": {"description": "Trade continues, no effect"},
                        "failure": {"description": "Lose 1d4 Gold OR 1d4+1 Resources (player's choice)", 
                                  "modifiers": {"gold": "-1d4", "resources": "-1d4+1"}},
                        "criticalFailure": {"description": "Lose 2d4 Gold AND 1d4+1 Resources, +1 Unrest", 
                                          "modifiers": {"gold": "-2d4", "resources": "-1d4+1", "unrest": 1}}
                    }
                },
                {
                    "skill": "society",
                    "description": "find loopholes",
                    "effects": {
                        "success": {"description": "Trade continues, no effect"},
                        "failure": {"description": "Lose 1d4 Gold OR 1d4+1 Resources (player's choice)", 
                                  "modifiers": {"gold": "-1d4", "resources": "-1d4+1"}},
                        "criticalFailure": {"description": "Lose 2d4 Gold AND 1d4+1 Resources, +1 Unrest", 
                                          "modifiers": {"gold": "-2d4", "resources": "-1d4+1", "unrest": 1}}
                    }
                },
                {
                    "skill": "deception",
                    "description": "smuggling routes",
                    "effects": {
                        "success": {"description": "Trade continues, no effect"},
                        "failure": {"description": "Lose 1d4 Gold OR 1d4+1 Resources (player's choice)", 
                                  "modifiers": {"gold": "-1d4", "resources": "-1d4+1"}},
                        "criticalFailure": {"description": "Lose 2d4 Gold AND 1d4+1 Resources, +1 Unrest", 
                                          "modifiers": {"gold": "-2d4", "resources": "-1d4+1", "unrest": 1}}
                    }
                },
                {
                    "skill": "occultism",
                    "description": "divine trade routes",
                    "effects": {
                        "success": {"description": "Trade continues, no effect"},
                        "failure": {"description": "Lose 1d4 Gold OR 1d4+1 Resources (player's choice)", 
                                  "modifiers": {"gold": "-1d4", "resources": "-1d4+1"}},
                        "criticalFailure": {"description": "Lose 2d4 Gold AND 1d4+1 Resources, +1 Unrest", 
                                          "modifiers": {"gold": "-2d4", "resources": "-1d4+1", "unrest": 1}}
                    }
                }
            ]
        },
        {
            "id": "mass-exodus",
            "name": "Mass Exodus",
            "tier": "MODERATE",
            "description": "Large numbers of citizens flee your kingdom",
            "percentileMin": 94,
            "percentileMax": 100,
            "skillOptions": [
                {
                    "skill": "diplomacy",
                    "description": "convince to stay",
                    "effects": {
                        "success": {"description": "Population remains, no effect"},
                        "failure": {"description": "Lose 1 worksite permanently, +1 Unrest", "modifiers": {"worksiteLost": 1, "unrest": 1}},
                        "criticalFailure": {"description": "Lose 1 worksite permanently, +1 Unrest, -1 Fame", 
                                          "modifiers": {"worksiteLost": 1, "unrest": 1, "fame": -1}}
                    }
                },
                {
                    "skill": "performance",
                    "description": "inspire hope",
                    "effects": {
                        "success": {"description": "Population remains, no effect"},
                        "failure": {"description": "Lose 1 worksite permanently, +1 Unrest", "modifiers": {"worksiteLost": 1, "unrest": 1}},
                        "criticalFailure": {"description": "Lose 1 worksite permanently, +1 Unrest, -1 Fame", 
                                          "modifiers": {"worksiteLost": 1, "unrest": 1, "fame": -1}}
                    }
                },
                {
                    "skill": "religion",
                    "description": "spiritual guidance",
                    "effects": {
                        "success": {"description": "Population remains, no effect"},
                        "failure": {"description": "Lose 1 worksite permanently, +1 Unrest", "modifiers": {"worksiteLost": 1, "unrest": 1}},
                        "criticalFailure": {"description": "Lose 1 worksite permanently, +1 Unrest, -1 Fame", 
                                          "modifiers": {"worksiteLost": 1, "unrest": 1, "fame": -1}}
                    }
                }
            ]
        }
    ],
    "major": [
        {
            "id": "guerrilla-movement",
            "name": "Guerrilla Movement",
            "tier": "MAJOR",
            "description": "Armed rebels seize control of kingdom territory",
            "percentileMin": 11,
            "percentileMax": 17,
            "skillOptions": [
                {
                    "skill": "diplomacy",
                    "description": "negotiate with rebels",
                    "effects": {
                        "success": {"description": "Rebellion dispersed"},
                        "failure": {"description": "Rebels seize 1d3 hexes", "modifiers": {"hexesLost": "1d3"}},
                        "criticalFailure": {"description": "Rebels seize 2d3 hexes and gain an army (kingdom level -1)", 
                                          "modifiers": {"hexesLost": "2d3", "rebelArmy": 1}}
                    }
                },
                {
                    "skill": "intimidation",
                    "description": "crush rebellion",
                    "effects": {
                        "success": {"description": "Rebellion dispersed"},
                        "failure": {"description": "Rebels seize 1d3 hexes", "modifiers": {"hexesLost": "1d3"}},
                        "criticalFailure": {"description": "Rebels seize 2d3 hexes and gain an army (kingdom level -1)", 
                                          "modifiers": {"hexesLost": "2d3", "rebelArmy": 1}}
                    }
                },
                {
                    "skill": "society",
                    "description": "address grievances",
                    "effects": {
                        "success": {"description": "Rebellion dispersed"},
                        "failure": {"description": "Rebels seize 1d3 hexes", "modifiers": {"hexesLost": "1d3"}},
                        "criticalFailure": {"description": "Rebels seize 2d3 hexes and gain an army (kingdom level -1)", 
                                          "modifiers": {"hexesLost": "2d3", "rebelArmy": 1}}
                    }
                },
                {
                    "skill": "religion",
                    "description": "appeal to faith",
                    "effects": {
                        "success": {"description": "Rebellion dispersed"},
                        "failure": {"description": "Rebels seize 1d3 hexes", "modifiers": {"hexesLost": "1d3"}},
                        "criticalFailure": {"description": "Rebels seize 2d3 hexes and gain an army (kingdom level -1)", 
                                          "modifiers": {"hexesLost": "2d3", "rebelArmy": 1}}
                    }
                }
            ]
        },
        {
            "id": "mass-desertion-threat",
            "name": "Mass Desertion Threat",
            "tier": "MAJOR",
            "description": "Your armies threaten mass desertion",
            "percentileMin": 18,
            "percentileMax": 24,
            "skillOptions": [
                {
                    "skill": "diplomacy",
                    "description": "rally troops",
                    "effects": {
                        "success": {"description": "Troops remain loyal, no effect"},
                        "failure": {"description": "1 army makes morale checks, highest tier military structure is damaged", 
                                  "modifiers": {"armyMoraleCheck": 1, "structureTypeDamaged": "military"}},
                        "criticalFailure": {"description": "2 armies make morale checks, highest tier military structure is destroyed", 
                                          "modifiers": {"armyMoraleCheck": 2, "structureTypeDestroyed": "military"}}
                    }
                },
                {
                    "skill": "intimidation",
                    "description": "threaten deserters",
                    "effects": {
                        "success": {"description": "Troops remain loyal, no effect"},
                        "failure": {"description": "1 army makes morale checks, highest tier military structure is damaged", 
                                  "modifiers": {"armyMoraleCheck": 1, "structureTypeDamaged": "military"}},
                        "criticalFailure": {"description": "2 armies make morale checks, highest tier military structure is destroyed", 
                                          "modifiers": {"armyMoraleCheck": 2, "structureTypeDestroyed": "military"}}
                    }
                },
                {
                    "skill": "performance",
                    "description": "inspire loyalty",
                    "effects": {
                        "success": {"description": "Troops remain loyal, no effect"},
                        "failure": {"description": "1 army makes morale checks, highest tier military structure is damaged", 
                                  "modifiers": {"armyMoraleCheck": 1, "structureTypeDamaged": "military"}},
                        "criticalFailure": {"description": "2 armies make morale checks, highest tier military structure is destroyed", 
                                          "modifiers": {"armyMoraleCheck": 2, "structureTypeDestroyed": "military"}}
                    }
                }
            ]
        },
        {
            "id": "rebellion-trade-embargo",
            "name": "Trade Embargo",
            "tier": "MAJOR",
            "description": "A complete trade embargo devastates your economy",
            "percentileMin": 25,
            "percentileMax": 31,
            "skillOptions": [
                {
                    "skill": "diplomacy",
                    "description": "negotiate",
                    "effects": {
                        "success": {"description": "Trade continues, no effect"},
                        "failure": {"description": "Lose 2d4 Gold OR 2d4+1 Resources (player's choice)", 
                                  "modifiers": {"gold": "-2d4", "resources": "-2d4+1"}},
                        "criticalFailure": {"description": "Lose 3d4 Gold AND 2d4+1 Resources, +1 Unrest", 
                                          "modifiers": {"gold": "-3d4", "resources": "-2d4+1", "unrest": 1}}
                    }
                },
                {
                    "skill": "society",
                    "description": "find loopholes",
                    "effects": {
                        "success": {"description": "Trade continues, no effect"},
                        "failure": {"description": "Lose 2d4 Gold OR 2d4+1 Resources (player's choice)", 
                                  "modifiers": {"gold": "-2d4", "resources": "-2d4+1"}},
                        "criticalFailure": {"description": "Lose 3d4 Gold AND 2d4+1 Resources, +1 Unrest", 
                                          "modifiers": {"gold": "-3d4", "resources": "-2d4+1", "unrest": 1}}
                    }
                },
                {
                    "skill": "deception",
                    "description": "smuggling routes",
                    "effects": {
                        "success": {"description": "Trade continues, no effect"},
                        "failure": {"description": "Lose 2d4 Gold OR 2d4+1 Resources (player's choice)", 
                                  "modifiers": {"gold": "-2d4", "resources": "-2d4+1"}},
                        "criticalFailure": {"description": "Lose 3d4 Gold AND 2d4+1 Resources, +1 Unrest", 
                                          "modifiers": {"gold": "-3d4", "resources": "-2d4+1", "unrest": 1}}
                    }
                },
                {
                    "skill": "arcana",
                    "description": "teleportation network",
                    "effects": {
                        "success": {"description": "Trade continues, no effect"},
                        "failure": {"description": "Lose 2d4 Gold OR 2d4+1 Resources (player's choice)", 
                                  "modifiers": {"gold": "-2d4", "resources": "-2d4+1"}},
                        "criticalFailure": {"description": "Lose 3d4 Gold AND 2d4+1 Resources, +1 Unrest", 
                                          "modifiers": {"gold": "-3d4", "resources": "-2d4+1", "unrest": 1}}
                    }
                }
            ]
        },
        {
            "id": "rebellion-settlement-crisis",
            "name": "Settlement Crisis",
            "tier": "MAJOR",
            "description": "A major settlement faces total collapse",
            "percentileMin": 32,
            "percentileMax": 38,
            "skillOptions": [
                {
                    "skill": "diplomacy",
                    "description": "address concerns",
                    "effects": {
                        "success": {"description": "Settlement stabilized, no effect"},
                        "failure": {"description": "Random settlement loses 2d4 Gold OR 2 structures damaged", 
                                  "modifiers": {"gold": "-2d4", "structureDamaged": 2}},
                        "criticalFailure": {"description": "Random settlement loses one level (minimum level 1), 1 structure destroyed, +1 unrest", 
                                          "modifiers": {"settlementLevel": -1, "structureDestroyed": 1, "unrest": 1}}
                    }
                },
                {
                    "skill": "society",
                    "description": "emergency aid",
                    "effects": {
                        "success": {"description": "Settlement stabilized, no effect"},
                        "failure": {"description": "Random settlement loses 2d4 Gold OR 2 structures damaged", 
                                  "modifiers": {"gold": "-2d4", "structureDamaged": 2}},
                        "criticalFailure": {"description": "Random settlement loses one level (minimum level 1), 1 structure destroyed, +1 unrest", 
                                          "modifiers": {"settlementLevel": -1, "structureDestroyed": 1, "unrest": 1}}
                    }
                },
                {
                    "skill": "religion",
                    "description": "provide hope",
                    "effects": {
                        "success": {"description": "Settlement stabilized, no effect"},
                        "failure": {"description": "Random settlement loses 2d4 Gold OR 2 structures damaged", 
                                  "modifiers": {"gold": "-2d4", "structureDamaged": 2}},
                        "criticalFailure": {"description": "Random settlement loses one level (minimum level 1), 1 structure destroyed, +1 unrest", 
                                          "modifiers": {"settlementLevel": -1, "structureDestroyed": 1, "unrest": 1}}
                    }
                }
            ]
        },
        {
            "id": "international-scandal",
            "name": "International Scandal",
            "tier": "MAJOR",
            "description": "A massive scandal ruins your kingdom's reputation",
            "percentileMin": 39,
            "percentileMax": 45,
            "skillOptions": [
                {
                    "skill": "performance",
                    "description": "grand gesture",
                    "effects": {
                        "success": {"description": "Reputation maintained, no effect"},
                        "failure": {"description": "Lose 1 Fame AND 1d4 gold", "modifiers": {"fame": -1, "gold": "-1d4"}},
                        "criticalFailure": {"description": "King has zero fame this round and cannot gain fame this round, lose 2d4 gold, +1 Unrest", 
                                          "modifiers": {"fame": 0, "gold": "-2d4", "unrest": 1, "fameBlocked": True}}
                    }
                },
                {
                    "skill": "diplomacy",
                    "description": "public relations",
                    "effects": {
                        "success": {"description": "Reputation maintained, no effect"},
                        "failure": {"description": "Lose 1 Fame AND 1d4 gold", "modifiers": {"fame": -1, "gold": "-1d4"}},
                        "criticalFailure": {"description": "King has zero fame this round and cannot gain fame this round, lose 2d4 gold, +1 Unrest", 
                                          "modifiers": {"fame": 0, "gold": "-2d4", "unrest": 1, "fameBlocked": True}}
                    }
                },
                {
                    "skill": "deception",
                    "description": "propaganda",
                    "effects": {
                        "success": {"description": "Reputation maintained, no effect"},
                        "failure": {"description": "Lose 1 Fame AND 1d4 gold", "modifiers": {"fame": -1, "gold": "-1d4"}},
                        "criticalFailure": {"description": "King has zero fame this round and cannot gain fame this round, lose 2d4 gold, +1 Unrest", 
                                          "modifiers": {"fame": 0, "gold": "-2d4", "unrest": 1, "fameBlocked": True}}
                    }
                }
            ]
        },
        {
            "id": "prison-breaks",
            "name": "Prison Breaks",
            "tier": "MAJOR",
            "description": "Mass prison breaks release dangerous criminals",
            "percentileMin": 46,
            "percentileMax": 52,
            "skillOptions": [
                {
                    "skill": "intimidation",
                    "description": "lockdown prisons",
                    "effects": {
                        "success": {"description": "Break prevented, no effect"},
                        "failure": {"description": "Half imprisoned unrest becomes regular unrest, the justice structure is damaged", 
                                  "modifiers": {"imprisonedToUnrest": 0.5, "structureTypeDamaged": "justice"}},
                        "criticalFailure": {"description": "All imprisoned unrest becomes regular unrest, the justice structure is destroyed", 
                                          "modifiers": {"imprisonedToUnrest": 1.0, "structureTypeDestroyed": "justice"}}
                    }
                },
                {
                    "skill": "athletics",
                    "description": "pursuit",
                    "effects": {
                        "success": {"description": "Break prevented, no effect"},
                        "failure": {"description": "Half imprisoned unrest becomes regular unrest, the justice structure is damaged", 
                                  "modifiers": {"imprisonedToUnrest": 0.5, "structureTypeDamaged": "justice"}},
                        "criticalFailure": {"description": "All imprisoned unrest becomes regular unrest, the justice structure is destroyed", 
                                          "modifiers": {"imprisonedToUnrest": 1.0, "structureTypeDestroyed": "justice"}}
                    }
                },
                {
                    "skill": "society",
                    "description": "negotiation",
                    "effects": {
                        "success": {"description": "Break prevented, no effect"},
                        "failure": {"description": "Half imprisoned unrest becomes regular unrest, the justice structure is damaged", 
                                  "modifiers": {"imprisonedToUnrest": 0.5, "structureTypeDamaged": "justice"}},
                        "criticalFailure": {"description": "All imprisoned unrest becomes regular unrest, the justice structure is destroyed", 
                                          "modifiers": {"imprisonedToUnrest": 1.0, "structureTypeDestroyed": "justice"}}
                    }
                }
            ]
        },
        {
            "id": "noble-conspiracy",
            "name": "Noble Conspiracy",
            "tier": "MAJOR",
            "description": "Nobles plot to overthrow the kingdom's leadership",
            "percentileMin": 53,
            "percentileMax": 59,
            "skillOptions": [
                {
                    "skill": "stealth",
                    "description": "uncover plot",
                    "effects": {
                        "success": {"description": "Conspiracy exposed and dealt with, no effect"},
                        "failure": {"description": "Lose 1d4 Gold, -1 fame", "modifiers": {"gold": "-1d4", "fame": -1}},
                        "criticalFailure": {"description": "Lose 2d4 Gold, -1 fame, one random PC loses kingdom action this turn, +1 unrest", 
                                          "modifiers": {"gold": "-2d4", "fame": -1, "leaderDisabled": 1, "unrest": 1}}
                    }
                },
                {
                    "skill": "intimidation",
                    "description": "arrests",
                    "effects": {
                        "success": {"description": "Conspiracy exposed and dealt with, no effect"},
                        "failure": {"description": "Lose 1d4 Gold, -1 fame", "modifiers": {"gold": "-1d4", "fame": -1}},
                        "criticalFailure": {"description": "Lose 2d4 Gold, -1 fame, one random PC loses kingdom action this turn, +1 unrest", 
                                          "modifiers": {"gold": "-2d4", "fame": -1, "leaderDisabled": 1, "unrest": 1}}
                    }
                },
                {
                    "skill": "society",
                    "description": "political maneuvering",
                    "effects": {
                        "success": {"description": "Conspiracy exposed and dealt with, no effect"},
                        "failure": {"description": "Lose 1d4 Gold, -1 fame", "modifiers": {"gold": "-1d4", "fame": -1}},
                        "criticalFailure": {"description": "Lose 2d4 Gold, -1 fame, one random PC loses kingdom action this turn, +1 unrest", 
                                          "modifiers": {"gold": "-2d4", "fame": -1, "leaderDisabled": 1, "unrest": 1}}
                    }
                },
                {
                    "skill": "occultism",
                    "description": "divine truth",
                    "effects": {
                        "success": {"description": "Conspiracy exposed and dealt with, no effect"},
                        "failure": {"description": "Lose 1d4 Gold, -1 fame", "modifiers": {"gold": "-1d4", "fame": -1}},
                        "criticalFailure": {"description": "Lose 2d4 Gold, -1 fame, one random PC loses kingdom action this turn, +1 unrest", 
                                          "modifiers": {"gold": "-2d4", "fame": -1, "leaderDisabled": 1, "unrest": 1}}
                    }
                }
            ]
        },
        {
            "id": "economic-crash",
            "name": "Economic Crash",
            "tier": "MAJOR",
            "description": "Your kingdom's economy collapses",
            "percentileMin": 60,
            "percentileMax": 66,
            "skillOptions": [
                {
                    "skill": "society",
                    "description": "economic reform",
                    "effects": {
                        "success": {"description": "Economy stabilized, no effect"},
                        "failure": {"description": "Lose 2d6 gold, your highest tier commerce structure is damaged", 
                                  "modifiers": {"gold": "-2d6", "structureTypeDamaged": "commerce"}},
                        "criticalFailure": {"description": "Lose 4d6 gold, your highest tier commerce structure is destroyed", 
                                          "modifiers": {"gold": "-4d6", "structureTypeDestroyed": "commerce"}}
                    }
                },
                {
                    "skill": "diplomacy",
                    "description": "secure loans",
                    "effects": {
                        "success": {"description": "Economy stabilized, no effect"},
                        "failure": {"description": "Lose 2d6 gold, your highest tier commerce structure is damaged", 
                                  "modifiers": {"gold": "-2d6", "structureTypeDamaged": "commerce"}},
                        "criticalFailure": {"description": "Lose 4d6 gold, your highest tier commerce structure is destroyed", 
                                          "modifiers": {"gold": "-4d6", "structureTypeDestroyed": "commerce"}}
                    }
                },
                {
                    "skill": "crafting",
                    "description": "boost production",
                    "effects": {
                        "success": {"description": "Economy stabilized, no effect"},
                        "failure": {"description": "Lose 2d6 gold, your highest tier commerce structure is damaged", 
                                  "modifiers": {"gold": "-2d6", "structureTypeDamaged": "commerce"}},
                        "criticalFailure": {"description": "Lose 4d6 gold, your highest tier commerce structure is destroyed", 
                                          "modifiers": {"gold": "-4d6", "structureTypeDestroyed": "commerce"}}
                    }
                },
                {
                    "skill": "arcana",
                    "description": "transmute resources",
                    "effects": {
                        "success": {"description": "Economy stabilized, no effect"},
                        "failure": {"description": "Lose 2d6 gold, your highest tier commerce structure is damaged", 
                                  "modifiers": {"gold": "-2d6", "structureTypeDamaged": "commerce"}},
                        "criticalFailure": {"description": "Lose 4d6 gold, your highest tier commerce structure is destroyed", 
                                          "modifiers": {"gold": "-4d6", "structureTypeDestroyed": "commerce"}}
                    }
                }
            ]
        },
        {
            "id": "religious-schism",
            "name": "Religious Schism",
            "tier": "MAJOR",
            "description": "Religious divisions tear your kingdom apart",
            "percentileMin": 67,
            "percentileMax": 73,
            "skillOptions": [
                {
                    "skill": "religion",
                    "description": "theological debate",
                    "effects": {
                        "success": {"description": "Schism averted, no effect"},
                        "failure": {"description": "Church factions form, lose 2d6 gold, your highest tier religious structure is damaged", 
                                  "modifiers": {"gold": "-2d6", "structureTypeDamaged": "religious"}},
                        "criticalFailure": {"description": "Church splits, lose 4d6 gold, your highest tier religious structure is destroyed", 
                                          "modifiers": {"gold": "-4d6", "structureTypeDestroyed": "religious"}}
                    }
                },
                {
                    "skill": "diplomacy",
                    "description": "mediate factions",
                    "effects": {
                        "success": {"description": "Schism averted, no effect"},
                        "failure": {"description": "Church factions form, lose 2d6 gold, your highest tier religious structure is damaged", 
                                  "modifiers": {"gold": "-2d6", "structureTypeDamaged": "religious"}},
                        "criticalFailure": {"description": "Church splits, lose 4d6 gold, your highest tier religious structure is destroyed", 
                                          "modifiers": {"gold": "-4d6", "structureTypeDestroyed": "religious"}}
                    }
                },
                {
                    "skill": "occultism",
                    "description": "divine intervention",
                    "effects": {
                        "success": {"description": "Schism averted, no effect"},
                        "failure": {"description": "Church factions form, lose 2d6 gold, your highest tier religious structure is damaged", 
                                  "modifiers": {"gold": "-2d6", "structureTypeDamaged": "religious"}},
                        "criticalFailure": {"description": "Church splits, lose 4d6 gold, your highest tier religious structure is destroyed", 
                                          "modifiers": {"gold": "-4d6", "structureTypeDestroyed": "religious"}}
                    }
                },
                {
                    "skill": "society",
                    "description": "secular compromise",
                    "effects": {
                        "success": {"description": "Schism averted, no effect"},
                        "failure": {"description": "Church factions form, lose 2d6 gold, your highest tier religious structure is damaged", 
                                  "modifiers": {"gold": "-2d6", "structureTypeDamaged": "religious"}},
                        "criticalFailure": {"description": "Church splits, lose 4d6 gold, your highest tier religious structure is destroyed", 
                                          "modifiers": {"gold": "-4d6", "structureTypeDestroyed": "religious"}}
                    }
                }
            ]
        },
        {
            "id": "border-raid",
            "name": "Border Raid",
            "tier": "MAJOR",
            "description": "Enemy forces raid your border territories",
            "percentileMin": 74,
            "percentileMax": 80,
            "skillOptions": [
                {
                    "skill": "athletics",
                    "description": "rapid response",
                    "effects": {
                        "success": {"description": "Raiders repelled, no effect"},
                        "failure": {"description": "Lose 1 border hex permanently, lose 1d4 Gold (pillaging)", 
                                  "modifiers": {"hexesLost": 1, "gold": "-1d4"}},
                        "criticalFailure": {"description": "Lose 1d3 border hexes permanently, lose 2d4 Gold", 
                                          "modifiers": {"hexesLost": "1d3", "gold": "-2d4"}}
                    }
                },
                {
                    "skill": "intimidation",
                    "description": "retaliation",
                    "effects": {
                        "success": {"description": "Raiders repelled, no effect"},
                        "failure": {"description": "Lose 1 border hex permanently, lose 1d4 Gold (pillaging)", 
                                  "modifiers": {"hexesLost": 1, "gold": "-1d4"}},
                        "criticalFailure": {"description": "Lose 1d3 border hexes permanently, lose 2d4 Gold", 
                                          "modifiers": {"hexesLost": "1d3", "gold": "-2d4"}}
                    }
                },
                {
                    "skill": "survival",
                    "description": "tracking",
                    "effects": {
                        "success": {"description": "Raiders repelled, no effect"},
                        "failure": {"description": "Lose 1 border hex permanently, lose 1d4 Gold (pillaging)", 
                                  "modifiers": {"hexesLost": 1, "gold": "-1d4"}},
                        "criticalFailure": {"description": "Lose 1d3 border hexes permanently, lose 2d4 Gold", 
                                          "modifiers": {"hexesLost": "1d3", "gold": "-2d4"}}
                    }
                },
                {
                    "skill": "nature",
                    "description": "use terrain",
                    "effects": {
                        "success": {"description": "Raiders repelled, no effect"},
                        "failure": {"description": "Lose 1 border hex permanently, lose 1d4 Gold (pillaging)", 
                                  "modifiers": {"hexesLost": 1, "gold": "-1d4"}},
                        "criticalFailure": {"description": "Lose 1d3 border hexes permanently, lose 2d4 Gold", 
                                          "modifiers": {"hexesLost": "1d3", "gold": "-2d4"}}
                    }
                }
            ]
        },
        {
            "id": "secession-crisis",
            "name": "Secession Crisis",
            "tier": "MAJOR",
            "description": "A settlement declares independence from your kingdom",
            "percentileMin": 81,
            "percentileMax": 87,
            "skillOptions": [
                {
                    "skill": "diplomacy",
                    "description": "negotiate autonomy",
                    "effects": {
                        "success": {"description": "Independence movement quelled, no effect"},
                        "failure": {"description": "Settlement in revolt - loses one level (minimum 1), highest tier structure in that settlement is destroyed, lose 2d4 Gold", 
                                  "modifiers": {"settlementLevel": -1, "structureDestroyed": 1, "gold": "-2d4"}},
                        "criticalFailure": {"description": "Settlement declares independence with all adjacent hexes (becomes free city-state), +2 Unrest, any armies located in the hexes defect", 
                                          "modifiers": {"settlementLost": True, "unrest": 2, "armiesDefect": True}}
                    }
                },
                {
                    "skill": "intimidation",
                    "description": "suppress movement",
                    "effects": {
                        "success": {"description": "Independence movement quelled, no effect"},
                        "failure": {"description": "Settlement in revolt - loses one level (minimum 1), highest tier structure in that settlement is destroyed, lose 2d4 Gold", 
                                  "modifiers": {"settlementLevel": -1, "structureDestroyed": 1, "gold": "-2d4"}},
                        "criticalFailure": {"description": "Settlement declares independence with all adjacent hexes (becomes free city-state), +2 Unrest, any armies located in the hexes defect", 
                                          "modifiers": {"settlementLost": True, "unrest": 2, "armiesDefect": True}}
                    }
                },
                {
                    "skill": "society",
                    "description": "address grievances",
                    "effects": {
                        "success": {"description": "Independence movement quelled, no effect"},
                        "failure": {"description": "Settlement in revolt - loses one level (minimum 1), highest tier structure in that settlement is destroyed, lose 2d4 Gold", 
                                  "modifiers": {"settlementLevel": -1, "structureDestroyed": 1, "gold": "-2d4"}},
                        "criticalFailure": {"description": "Settlement declares independence with all adjacent hexes (becomes free city-state), +2 Unrest, any armies located in the hexes defect", 
                                          "modifiers": {"settlementLost": True, "unrest": 2, "armiesDefect": True}}
                    }
                },
                {
                    "skill": "performance",
                    "description": "inspire loyalty",
                    "effects": {
                        "success": {"description": "Independence movement quelled, no effect"},
                        "failure": {"description": "Settlement in revolt - loses one level (minimum 1), highest tier structure in that settlement is destroyed, lose 2d4 Gold", 
                                  "modifiers": {"settlementLevel": -1, "structureDestroyed": 1, "gold": "-2d4"}},
                        "criticalFailure": {"description": "Settlement declares independence with all adjacent hexes (becomes free city-state), +2 Unrest, any armies located in the hexes defect", 
                                          "modifiers": {"settlementLost": True, "unrest": 2, "armiesDefect": True}}
                    }
                }
            ]
        },
        {
            "id": "international-crisis",
            "name": "International Crisis",
            "tier": "MAJOR",
            "description": "Multiple kingdoms turn against you due to internal chaos",
            "percentileMin": 88,
            "percentileMax": 100,
            "skillOptions": [
                {
                    "skill": "diplomacy",
                    "description": "damage control",
                    "effects": {
                        "success": {"description": "Crisis contained, no effect"},
                        "failure": {"description": "One kingdom's attitude worsens by 2 steps", "modifiers": {"diplomaticRelations": -2}},
                        "criticalFailure": {"description": "Two kingdoms' attitudes worsen by 2 steps, -1 fame", 
                                          "modifiers": {"diplomaticRelations": -4, "fame": -1}}
                    }
                },
                {
                    "skill": "deception",
                    "description": "blame shifting",
                    "effects": {
                        "success": {"description": "Crisis contained, no effect"},
                        "failure": {"description": "One kingdom's attitude worsens by 2 steps", "modifiers": {"diplomaticRelations": -2}},
                        "criticalFailure": {"description": "Two kingdoms' attitudes worsen by 2 steps, -1 fame", 
                                          "modifiers": {"diplomaticRelations": -4, "fame": -1}}
                    }
                },
                {
                    "skill": "society",
                    "description": "formal reparations",
                    "effects": {
                        "success": {"description": "Crisis contained, no effect"},
                        "failure": {"description": "One kingdom's attitude worsens by 2 steps", "modifiers": {"diplomaticRelations": -2}},
                        "criticalFailure": {"description": "Two kingdoms' attitudes worsen by 2 steps, -1 fame", 
                                          "modifiers": {"diplomaticRelations": -4, "fame": -1}}
                    }
                },
                {
                    "skill": "performance",
                    "description": "public relations",
                    "effects": {
                        "success": {"description": "Crisis contained, no effect"},
                        "failure": {"description": "One kingdom's attitude worsens by 2 steps", "modifiers": {"diplomaticRelations": -2}},
                        "criticalFailure": {"description": "Two kingdoms' attitudes worsen by 2 steps, -1 fame", 
                                          "modifiers": {"diplomaticRelations": -4, "fame": -1}}
                    }
                }
            ]
        }
    ]
}

def create_incident_file(incident_data, tier):
    """Create a single incident JSON file with complete modifier structure"""
    
    # Build the complete incident structure
    incident = {
        "id": incident_data["id"],
        "name": incident_data["name"],
        "tier": incident_data["tier"],
        "description": incident_data["description"],
        "percentileMin": incident_data["percentileMin"],
        "percentileMax": incident_data["percentileMax"],
        "skillOptions": []
    }
    
    # Process skill options
    for skill_option in incident_data["skillOptions"]:
        option = {
            "skill": skill_option["skill"],
            "description": skill_option["description"],
            "effects": {}
        }
        
        # Process effects
        if "effects" in skill_option:
            effects = skill_option["effects"]
            
            # Add success effect
            if "success" in effects:
                option["effects"]["success"] = effects["success"]["description"]
                if "modifiers" in effects["success"]:
                    option["successModifiers"] = effects["success"]["modifiers"]
            
            # Add failure effect  
            if "failure" in effects:
                option["effects"]["failure"] = effects["failure"]["description"]
                if "modifiers" in effects["failure"]:
                    option["failureModifiers"] = effects["failure"]["modifiers"]
            
            # Add critical failure effect
            if "criticalFailure" in effects:
                option["effects"]["criticalFailure"] = effects["criticalFailure"]["description"]
                if "modifiers" in effects["criticalFailure"]:
                    option["criticalFailureModifiers"] = effects["criticalFailure"]["modifiers"]
        
        incident["skillOptions"].append(option)
    
    return incident


def main():
    """Generate all incident JSON files"""
    
    # Process each tier
    for tier, incidents in INCIDENTS.items():
        # Ensure the directory exists
        tier_dir = Path(tier)
        tier_dir.mkdir(exist_ok=True)
        
        # Create incidents for this tier
        for incident_data in incidents:
            incident = create_incident_file(incident_data, tier.upper())
            
            # Write the JSON file
            filename = f"{incident_data['id']}.json"
            filepath = tier_dir / filename
            
            with open(filepath, 'w') as f:
                json.dump(incident, f, indent=2)
            
            print(f"Created: {tier}/{filename}")
    
    # Get total count
    total = sum(len(incidents) for incidents in INCIDENTS.values())
    print(f"\nSuccessfully created {total} incident files")
    print(f"  Minor: {len(INCIDENTS['minor'])} incidents")
    print(f"  Moderate: {len(INCIDENTS['moderate'])} incidents")
    print(f"  Major: {len(INCIDENTS['major'])} incidents")


if __name__ == "__main__":
    main()
