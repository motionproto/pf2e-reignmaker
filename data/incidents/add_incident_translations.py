#!/usr/bin/env python3
"""
Add all incident translations to the language file
"""

import json
import sys
from pathlib import Path

# Add the langtools directory to the path
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "lang" / "langtools"))

from lang_manager import LanguageManager

def add_incident_translations():
    """Add translations for all incidents"""
    
    manager = LanguageManager()
    
    # Define all incident translations
    incidents = {
        # Minor Incidents
        "crime-wave": {
            "name": "Crime Wave",
            "description": "Criminal activity surges throughout your settlements",
            "skills": {
                "intimidation": "crack down on criminals",
                "thievery": "infiltrate gangs",
                "society": "legal reform",
                "occultism": "divine the source"
            },
            "effects": {
                "success": "Crime suppressed, no effect",
                "failure": "Lose 1d4 Gold",
                "criticalFailure": "Lose 2d4 Gold, +1 Unrest"
            }
        },
        "work-stoppage": {
            "name": "Work Stoppage",
            "description": "Workers in your kingdom refuse to continue their labor",
            "skills": {
                "diplomacy": "negotiate with workers",
                "intimidation": "force work",
                "performance": "inspire workers",
                "medicine": "address health concerns"
            },
            "effects": {
                "success": "Workers return, no effect",
                "failure": "One random worksite produces nothing this turn",
                "criticalFailure": "Two worksites produce nothing, +1 Unrest"
            }
        },
        "emigration-threat": {
            "name": "Emigration Threat",
            "description": "Citizens threaten to leave your kingdom permanently",
            "skills": {
                "diplomacy": "convince to stay",
                "society": "address concerns",
                "religion": "appeal to faith",
                "nature": "improve local conditions"
            },
            "effects": {
                "success": "Population stays, no effect",
                "failure": "Lose 1 random worksite permanently",
                "criticalFailure": "Lose 1 random worksite permanently, +1 unrest"
            }
        },
        "protests": {
            "name": "Protests",
            "description": "Citizens take to the streets in organized protests",
            "skills": {
                "diplomacy": "address crowd",
                "intimidation": "disperse crowds",
                "performance": "distract crowds",
                "arcana": "magical calming"
            },
            "effects": {
                "success": "Peaceful resolution, no effect",
                "failure": "Lose 1d4 Gold (property damage, lost productivity)",
                "criticalFailure": "Lose 2d4 Gold, -1 Fame"
            }
        },
        "corruption-scandal": {
            "name": "Corruption Scandal",
            "description": "Corruption among your officials is exposed",
            "skills": {
                "society": "investigation",
                "deception": "cover-up",
                "intimidation": "purge corrupt officials",
                "diplomacy": "manage public relations"
            },
            "effects": {
                "success": "Scandal contained, no effect",
                "failure": "Lose 1d4 Gold (embezzlement/graft discovered)",
                "criticalFailure": "Lose 2d4 Gold, -1 Fame (major corruption exposed publicly)"
            }
        },
        "rising-tensions": {
            "name": "Rising Tensions",
            "description": "General tensions rise throughout your kingdom",
            "skills": {
                "diplomacy": "calm populace",
                "religion": "spiritual guidance",
                "performance": "entertainment",
                "arcana": "magical displays"
            },
            "effects": {
                "success": "Tensions ease, no effect",
                "failure": "+1 Unrest",
                "criticalFailure": "+2 Unrest"
            }
        },
        "bandit-activity": {
            "name": "Bandit Activity",
            "description": "Bandit raids threaten your trade routes and settlements",
            "skills": {
                "intimidation": "show force",
                "stealth": "infiltrate bandits",
                "survival": "track to lair",
                "occultism": "scrying"
            },
            "effects": {
                "success": "Bandits deterred, no effect",
                "failure": "Lose 1d4 Gold to raids",
                "criticalFailure": "Lose 2d4 Gold, bandits destroy a random worksite"
            }
        },
        "minor-diplomatic-incident": {
            "name": "Minor Diplomatic Incident",
            "description": "A diplomatic misstep strains relations with neighbors",
            "skills": {
                "diplomacy": "smooth over",
                "society": "formal apology",
                "deception": "deny involvement"
            },
            "effects": {
                "success": "Relations maintained, no effect",
                "failure": "One neighbouring kingdom's attitude worsens by 1 step",
                "criticalFailure": "Two random kingdoms' attitudes worsen by 1 step"
            }
        },
        # Moderate Incidents
        "production-strike": {
            "name": "Production Strike",
            "description": "Workers strike, halting resource production",
            "skills": {
                "diplomacy": "negotiate with workers",
                "society": "arbitrate",
                "crafting": "work alongside",
                "arcana": "automate production"
            },
            "effects": {
                "success": "Strike ends, no effect",
                "failure": "Lose 1d4+1 of a random resource (Lumber, Ore, Stone)",
                "criticalFailure": "Lose 2d4+1 of a random resource (Lumber, Ore, Stone)"
            }
        },
        "diplomatic-incident": {
            "name": "Diplomatic Incident",
            "description": "A serious diplomatic incident threatens relations",
            "skills": {
                "diplomacy": "smooth over",
                "deception": "deny responsibility",
                "society": "formal apology"
            },
            "effects": {
                "success": "Relations maintained, no effect",
                "failure": "One neighbouring kingdom's attitude worsens by 1 step",
                "criticalFailure": "Two random kingdoms' attitudes worsen by 1 step"
            }
        },
        "tax-revolt": {
            "name": "Tax Revolt",
            "description": "Citizens revolt against tax collection",
            "skills": {
                "intimidation": "enforce collection",
                "diplomacy": "negotiate rates",
                "society": "tax reform",
                "deception": "creative accounting"
            },
            "effects": {
                "success": "Taxes collected normally",
                "failure": "Lose 1d4 Gold (reduced tax collection)",
                "criticalFailure": "Lose 2d4 Gold, +1 Unrest"
            }
        },
        "infrastructure-damage": {
            "name": "Infrastructure Damage",
            "description": "Critical infrastructure is damaged or sabotaged",
            "skills": {
                "crafting": "emergency repairs",
                "athletics": "labor mobilization",
                "society": "organize response",
                "arcana": "magical restoration"
            },
            "effects": {
                "success": "Damage prevented, no effect",
                "failure": "One random structure in a random settlement becomes damaged",
                "criticalFailure": "1d3 random structures become damaged (random settlements), +1 unrest"
            }
        },
        "disease-outbreak": {
            "name": "Disease Outbreak",
            "description": "A dangerous disease spreads through your settlements",
            "skills": {
                "medicine": "treat disease",
                "nature": "natural remedies",
                "religion": "divine healing"
            },
            "effects": {
                "success": "Disease contained, no effect",
                "failure": "Lose 1d4 Food (feeding the sick), +1 Unrest",
                "criticalFailure": "Lose 2d4 Food, one Medicine or Faith structure becomes damaged, +1 Unrest"
            }
        },
        "riot": {
            "name": "Riot",
            "description": "Violent riots break out in your settlements",
            "skills": {
                "intimidation": "suppress riot",
                "diplomacy": "negotiate with rioters",
                "athletics": "contain riot",
                "medicine": "treat injured"
            },
            "effects": {
                "success": "Riot quelled, no effect",
                "failure": "+1 Unrest, 1 structure damaged",
                "criticalFailure": "+1 Unrest, 1 structure destroyed"
            }
        },
        "settlement-crisis": {
            "name": "Settlement Crisis",
            "description": "One of your settlements faces a major crisis",
            "skills": {
                "diplomacy": "address concerns",
                "society": "emergency aid",
                "religion": "provide hope"
            },
            "effects": {
                "success": "Settlement stabilized, no effect",
                "failure": "Random settlement loses 1d4 Gold OR 1 structure damaged",
                "criticalFailure": "Random settlement loses one level (minimum level 1), +1 unrest"
            }
        },
        "assassination-attempt": {
            "name": "Assassination Attempt",
            "description": "An assassin targets one of your kingdom's leaders",
            "skills": {
                "athletics": "protect target",
                "medicine": "treat wounds",
                "stealth": "avoid the assassin"
            },
            "effects": {
                "success": "Assassination prevented, no effect",
                "failure": "Leader escapes; +1 Unrest",
                "criticalFailure": "Leader wounded; +2 Unrest, that PC cannot take a Kingdom Action this turn"
            }
        },
        "turmoil-trade-embargo": {
            "name": "Trade Embargo",
            "description": "Neighboring kingdoms impose trade restrictions",
            "skills": {
                "diplomacy": "negotiate",
                "society": "find loopholes",
                "deception": "smuggling routes",
                "occultism": "divine trade routes"
            },
            "effects": {
                "success": "Trade continues, no effect",
                "failure": "Lose 1d4 Gold OR 1d4+1 Resources (player's choice)",
                "criticalFailure": "Lose 2d4 Gold AND 1d4+1 Resources, +1 Unrest"
            }
        },
        "mass-exodus": {
            "name": "Mass Exodus",
            "description": "Large numbers of citizens flee your kingdom",
            "skills": {
                "diplomacy": "convince to stay",
                "performance": "inspire hope",
                "religion": "spiritual guidance"
            },
            "effects": {
                "success": "Population remains, no effect",
                "failure": "Lose 1 worksite permanently, +1 Unrest",
                "criticalFailure": "Lose 1 worksite permanently, +1 Unrest, -1 Fame"
            }
        },
        # Major Incidents
        "guerrilla-movement": {
            "name": "Guerrilla Movement",
            "description": "Armed rebels seize control of kingdom territory",
            "skills": {
                "diplomacy": "negotiate with rebels",
                "intimidation": "crush rebellion",
                "society": "address grievances",
                "religion": "appeal to faith"
            },
            "effects": {
                "success": "Rebellion dispersed",
                "failure": "Rebels seize 1d3 hexes",
                "criticalFailure": "Rebels seize 2d3 hexes and gain an army (kingdom level -1)"
            }
        },
        "mass-desertion-threat": {
            "name": "Mass Desertion Threat",
            "description": "Your armies threaten mass desertion",
            "skills": {
                "diplomacy": "rally troops",
                "intimidation": "threaten deserters",
                "performance": "inspire loyalty"
            },
            "effects": {
                "success": "Troops remain loyal, no effect",
                "failure": "1 army makes morale checks, highest tier military structure is damaged",
                "criticalFailure": "2 armies make morale checks, highest tier military structure is destroyed"
            }
        },
        "rebellion-trade-embargo": {
            "name": "Trade Embargo",
            "description": "A complete trade embargo devastates your economy",
            "skills": {
                "diplomacy": "negotiate",
                "society": "find loopholes",
                "deception": "smuggling routes",
                "arcana": "teleportation network"
            },
            "effects": {
                "success": "Trade continues, no effect",
                "failure": "Lose 2d4 Gold OR 2d4+1 Resources (player's choice)",
                "criticalFailure": "Lose 3d4 Gold AND 2d4+1 Resources, +1 Unrest"
            }
        },
        "rebellion-settlement-crisis": {
            "name": "Settlement Crisis",
            "description": "A major settlement faces total collapse",
            "skills": {
                "diplomacy": "address concerns",
                "society": "emergency aid",
                "religion": "provide hope"
            },
            "effects": {
                "success": "Settlement stabilized, no effect",
                "failure": "Random settlement loses 2d4 Gold OR 2 structures damaged",
                "criticalFailure": "Random settlement loses one level (minimum level 1), 1 structure destroyed, +1 unrest"
            }
        },
        "international-scandal": {
            "name": "International Scandal",
            "description": "A massive scandal ruins your kingdom's reputation",
            "skills": {
                "performance": "grand gesture",
                "diplomacy": "public relations",
                "deception": "propaganda"
            },
            "effects": {
                "success": "Reputation maintained, no effect",
                "failure": "Lose 1 Fame AND 1d4 gold",
                "criticalFailure": "King has zero fame this round and cannot gain fame this round, lose 2d4 gold, +1 Unrest"
            }
        },
        "prison-breaks": {
            "name": "Prison Breaks",
            "description": "Mass prison breaks release dangerous criminals",
            "skills": {
                "intimidation": "lockdown prisons",
                "athletics": "pursuit",
                "society": "negotiation"
            },
            "effects": {
                "success": "Break prevented, no effect",
                "failure": "Half imprisoned unrest becomes regular unrest, the justice structure is damaged",
                "criticalFailure": "All imprisoned unrest becomes regular unrest, the justice structure is destroyed"
            }
        },
        "noble-conspiracy": {
            "name": "Noble Conspiracy",
            "description": "Nobles plot to overthrow the kingdom's leadership",
            "skills": {
                "stealth": "uncover plot",
                "intimidation": "arrests",
                "society": "political maneuvering",
                "occultism": "divine truth"
            },
            "effects": {
                "success": "Conspiracy exposed and dealt with, no effect",
                "failure": "Lose 1d4 Gold, -1 fame",
                "criticalFailure": "Lose 2d4 Gold, -1 fame, one random PC loses kingdom action this turn, +1 unrest"
            }
        },
        "economic-crash": {
            "name": "Economic Crash",
            "description": "Your kingdom's economy collapses",
            "skills": {
                "society": "economic reform",
                "diplomacy": "secure loans",
                "crafting": "boost production",
                "arcana": "transmute resources"
            },
            "effects": {
                "success": "Economy stabilized, no effect",
                "failure": "Lose 2d6 gold, your highest tier commerce structure is damaged",
                "criticalFailure": "Lose 4d6 gold, your highest tier commerce structure is destroyed"
            }
        },
        "religious-schism": {
            "name": "Religious Schism",
            "description": "Religious divisions tear your kingdom apart",
            "skills": {
                "religion": "theological debate",
                "diplomacy": "mediate factions",
                "occultism": "divine intervention",
                "society": "secular compromise"
            },
            "effects": {
                "success": "Schism averted, no effect",
                "failure": "Church factions form, lose 2d6 gold, your highest tier religious structure is damaged",
                "criticalFailure": "Church splits, lose 4d6 gold, your highest tier religious structure is destroyed"
            }
        },
        "border-raid": {
            "name": "Border Raid",
            "description": "Enemy forces raid your border territories",
            "skills": {
                "athletics": "rapid response",
                "intimidation": "retaliation",
                "survival": "tracking",
                "nature": "use terrain"
            },
            "effects": {
                "success": "Raiders repelled, no effect",
                "failure": "Lose 1 border hex permanently, lose 1d4 Gold (pillaging)",
                "criticalFailure": "Lose 1d3 border hexes permanently, lose 2d4 Gold"
            }
        },
        "secession-crisis": {
            "name": "Secession Crisis",
            "description": "A settlement declares independence from your kingdom",
            "skills": {
                "diplomacy": "negotiate autonomy",
                "intimidation": "suppress movement",
                "society": "address grievances",
                "performance": "inspire loyalty"
            },
            "effects": {
                "success": "Independence movement quelled, no effect",
                "failure": "Settlement in revolt - loses one level (minimum 1), highest tier structure in that settlement is destroyed, lose 2d4 Gold",
                "criticalFailure": "Settlement declares independence with all adjacent hexes (becomes free city-state), +2 Unrest, any armies located in the hexes defect"
            }
        },
        "international-crisis": {
            "name": "International Crisis",
            "description": "Multiple kingdoms turn against you due to internal chaos",
            "skills": {
                "diplomacy": "damage control",
                "deception": "blame shifting",
                "society": "formal reparations",
                "performance": "public relations"
            },
            "effects": {
                "success": "Crisis contained, no effect",
                "failure": "One kingdom's attitude worsens by 2 steps",
                "criticalFailure": "Two kingdoms' attitudes worsen by 2 steps, -1 fame"
            }
        }
    }
    
    # Add translations for each incident
    added = 0
    for incident_id, incident_data in incidents.items():
        base_key = f"pf2e-reignmaker.incidents.{incident_id}"
        
        # Add name
        manager.set_key(f"{base_key}.name", incident_data["name"])
        
        # Add description
        manager.set_key(f"{base_key}.description", incident_data["description"])
        
        # Add skill descriptions
        for skill, desc in incident_data["skills"].items():
            manager.set_key(f"{base_key}.skills.{skill}", desc)
        
        # Add effect descriptions
        for effect, desc in incident_data["effects"].items():
            manager.set_key(f"{base_key}.effects.{effect}", desc)
        
        added += 1
    
    # Add tier descriptions
    manager.set_key("pf2e-reignmaker.incidents.tiers.minor", "Discontent")
    manager.set_key("pf2e-reignmaker.incidents.tiers.moderate", "Turmoil")
    manager.set_key("pf2e-reignmaker.incidents.tiers.major", "Rebellion")
    
    # Export and save changes
    print(f"\nAdding translations for {added} incidents...")
    manager.export()
    print("Language file updated successfully")
    
    # Verify
    manager_verify = LanguageManager()
    incidents_check = manager_verify.data.get('pf2e-reignmaker', {}).get('incidents', {})
    print(f"\nVerification: {len(incidents_check)} incidents in translations")

if __name__ == "__main__":
    add_incident_translations()
