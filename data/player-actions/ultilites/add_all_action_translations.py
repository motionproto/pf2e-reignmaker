#!/usr/bin/env python3
"""
Add all kingdom action translations to lang/en.json
Based on the JSON files created from Kingdom_Actions.md
"""

import json
import sys
import os
from pathlib import Path

# Add the langtools directory to the path
sys.path.insert(0, '../../lang/langtools')

from lang_manager import LanguageManager

# Define all action translations
ACTION_TRANSLATIONS = {
    "coordinated-effort": {
        "name": "Coordinated Effort",
        "description": "When two leaders form a partnership on a single action, their combined expertise ensures the best possible outcome",
        "special": "Meta-action that modifies other actions. Exactly TWO PCs may use this together once per turn.",
        "skills": {
            "politics": "coordinate leadership",
            "performance": "inspire teamwork"
        },
        "effects": {
            "criticalSuccess": "Both Coordinated Effort and the follow-up action gain +2 circumstance bonuses to their checks",
            "success": "The follow-up action gains a +2 circumstance bonus to its check",
            "failure": "The follow-up action gains a +1 circumstance bonus to its check",
            "criticalFailure": "Both actions fail automatically"
        }
    },
    "arrest-dissidents": {
        "name": "Arrest Dissidents",
        "description": "Round up troublemakers and malcontents, converting unrest into imprisoned unrest that can be dealt with through the justice system",
        "requirements": "Justice structure with capacity",
        "skills": {
            "intimidation": "show of force",
            "society": "legal procedures",
            "stealth": "covert operations",
            "deception": "infiltration tactics",
            "athletics": "physical pursuit"
        },
        "effects": {
            "criticalSuccess": "Convert 4 Unrest to imprisoned Unrest (up to structure capacity)",
            "success": "Convert 2 Unrest to imprisoned Unrest (up to structure capacity)",
            "failure": "No effect",
            "criticalFailure": "Botched arrests cause riots; gain 1 Unrest"
        }
    },
    "execute-or-pardon-prisoners": {
        "name": "Execute or Pardon Prisoners",
        "description": "Pass judgment on those who have threatened the kingdom's stability, choosing between mercy and justice",
        "requirements": "Justice structure with imprisoned unrest",
        "skills": {
            "intimidation": "harsh justice (execute)",
            "society": "legal proceedings (execute)",
            "diplomacy": "clemency (pardon)",
            "religion": "divine forgiveness (pardon)",
            "performance": "public ceremony (pardon)"
        },
        "effects": {
            "criticalSuccess": "Remove all imprisoned Unrest in the settlement and reduce Unrest by 1",
            "success": "Remove 1d4 imprisoned Unrest from the settlement",
            "failure": "Remove none",
            "criticalFailure": "Remove none; gain 1 current Unrest (riot, scandal, martyrdom)"
        }
    },
    "deal-with-unrest": {
        "name": "Deal with Unrest",
        "description": "Address grievances and calm tensions through various approaches: entertainment, religious ceremonies, shows of force, diplomatic engagement, scholarly discourse, or magical displays",
        "special": "End of Turn Only",
        "skills": {
            "performance": "entertainment and festivities",
            "religion": "religious ceremonies",
            "intimidation": "shows of force",
            "diplomacy": "diplomatic engagement",
            "arcana": "magical persuasion",
            "medicine": "public health initiatives",
            "occultism": "mystical demonstrations",
            "acrobatics": "impressive physical feats"
        },
        "effects": {
            "criticalSuccess": "Reduce Unrest by 3",
            "success": "Reduce Unrest by 2",
            "failure": "Reduce Unrest by 1",
            "criticalFailure": "No effect"
        }
    },
    "recruit-unit": {
        "name": "Recruit Unit",
        "description": "Rally citizens to arms, drawing from the population to form new military units through inspiration, coercion, or demonstration of prowess",
        "skills": {
            "diplomacy": "inspire patriotism",
            "intimidation": "conscription",
            "society": "civic duty",
            "performance": "recruitment rallies",
            "athletics": "demonstrations of prowess"
        },
        "effects": {
            "criticalSuccess": "Recruit a troop equal to the party level and reduce unrest by 1 as patriotism spreads",
            "success": "Recruit a troop equal to the party level",
            "failure": "No Recruits",
            "criticalFailure": "No Recruit; +1 Unrest"
        }
    },
    "outfit-army": {
        "name": "Outfit Army",
        "description": "Equip your troops with superior arms, armor, and supplies to enhance their battlefield effectiveness",
        "special": "Equipment types: armor (+1 AC), runes (+1 to hit), weapons (+1 damage dice), equipment (+1 saving throws)",
        "skills": {
            "crafting": "forge equipment",
            "society": "requisition supplies",
            "intimidation": "commandeer resources",
            "thievery": "acquire through subterfuge",
            "warfare-lore": "military procurement"
        },
        "effects": {
            "criticalSuccess": "Outfit a troop with two upgrades, or 2 troops with the same upgrade",
            "success": "Outfit troop",
            "failure": "No gear",
            "criticalFailure": "No gear"
        }
    },
    "deploy-army": {
        "name": "Deploy Army",
        "description": "Mobilize and maneuver your military forces across the kingdom's territory using various navigation methods",
        "skills": {
            "nature": "natural pathways",
            "survival": "wilderness navigation",
            "athletics": "forced march",
            "stealth": "covert movement",
            "warfare-lore": "military tactics"
        },
        "effects": {
            "criticalSuccess": "Move, claim hex after battle",
            "success": "Move",
            "failure": "Move but -2 initiative, and troop is fatigued",
            "criticalFailure": "Your troop is lost they arrive at a Random nearby hex (1d6 for direction, 1-3 for offset); troop has -2 initiative, is fatigued and enfeebled 1; +1 Unrest"
        }
    },
    "recover-army": {
        "name": "Recover Army",
        "description": "Tend to wounded troops, restore morale, and replenish ranks after battle losses",
        "skills": {
            "medicine": "heal the wounded",
            "performance": "boost morale",
            "religion": "spiritual restoration",
            "nature": "natural remedies",
            "crafting": "repair equipment",
            "warfare-lore": "veteran experience"
        },
        "effects": {
            "criticalSuccess": "Troop recovers completely",
            "success": "Troop recovers 1 segment",
            "failure": "No recovery",
            "criticalFailure": "No recovery"
        }
    },
    "train-army": {
        "name": "Train Army",
        "description": "Drill your troops in tactics and discipline to improve their combat effectiveness through various training methods",
        "skills": {
            "intimidation": "harsh discipline",
            "athletics": "physical conditioning",
            "acrobatics": "agility training",
            "survival": "endurance exercises",
            "warfare-lore": "tactical doctrine"
        },
        "effects": {
            "criticalSuccess": "Troop is promoted up to party level",
            "success": "+1 level (max party level)",
            "failure": "No change",
            "criticalFailure": "No change"
        }
    },
    "disband-army": {
        "name": "Disband Army",
        "description": "Release military units from service, returning soldiers to civilian life",
        "skills": {
            "intimidation": "stern dismissal",
            "diplomacy": "honorable discharge",
            "society": "reintegration programs",
            "performance": "farewell ceremony",
            "warfare-lore": "military protocol"
        },
        "effects": {
            "criticalSuccess": "People welcome them home with honours!, -2 Unrest",
            "success": "Army disbands, -1 Unrest",
            "failure": "Army disbands",
            "criticalFailure": "Army disbands, +1 Unrest"
        }
    },
    "claim-hexes": {
        "name": "Claim Hexes",
        "description": "Assert sovereignty over new territories, expanding your kingdom's borders into unclaimed lands",
        "special": "+2 circumstance bonus when claiming hexes adjacent to 3+ controlled hexes",
        "proficiencyScaling": "Trained/Expert: 1 hex, Master: 2 hexes, Legendary: 3 hexes",
        "skills": {
            "nature": "harmonize with the land",
            "survival": "establish frontier camps",
            "intimidation": "force submission",
            "occultism": "mystical claiming rituals",
            "religion": "divine mandate"
        },
        "effects": {
            "criticalSuccess": "Claim all targeted hexes +1 extra hex",
            "success": "Claim targeted hexes (based on proficiency)",
            "failure": "no effect",
            "criticalFailure": "No effect"
        }
    },
    "build-roads": {
        "name": "Build Roads",
        "description": "Construct pathways between settlements to improve trade, travel, and military movement",
        "skills": {
            "crafting": "engineering expertise",
            "survival": "pathfinding routes",
            "athletics": "manual labor",
            "nature": "work with terrain"
        },
        "effects": {
            "criticalSuccess": "Build roads +1 hex",
            "success": "Build roads",
            "failure": "no effect",
            "criticalFailure": "No effect"
        }
    },
    "send-scouts": {
        "name": "Send Scouts",
        "description": "Dispatch explorers to gather intelligence about neighboring territories and potential threats",
        "skills": {
            "stealth": "covert reconnaissance",
            "survival": "wilderness expertise",
            "nature": "read the land",
            "society": "gather local information",
            "athletics": "rapid exploration",
            "acrobatics": "navigate obstacles"
        },
        "effects": {
            "criticalSuccess": "Learn about 2 hexes",
            "success": "Learn about 1 hex",
            "failure": "no report",
            "criticalFailure": "Scouts lost"
        }
    },
    "fortify-hex": {
        "name": "Fortify Hex",
        "description": "Construct defensive structures and preparations in a hex to improve its resistance against invasion",
        "special": "Fortification Benefits: Troops defending in a fortified hex gain +1 armor class and +2 initiative circumstance bonus",
        "skills": {
            "crafting": "build fortifications",
            "athletics": "manual construction",
            "intimidation": "defensive displays",
            "thievery": "trap placement",
            "warfare-lore": "strategic defenses"
        },
        "effects": {
            "criticalSuccess": "Fortify, reduce Unrest by 1",
            "success": "Fortify",
            "failure": "Fail",
            "criticalFailure": "No effect"
        }
    },
    "establish-settlement": {
        "name": "Establish Settlement",
        "description": "Found a new community where settlers can establish homes and begin building infrastructure",
        "special": "Villages are typically Level 1. A new settlement begins as a Village unless special circumstances apply",
        "skills": {
            "society": "organized settlement",
            "survival": "frontier establishment",
            "diplomacy": "attract settlers",
            "religion": "blessed founding",
            "medicine": "healthy community planning"
        },
        "effects": {
            "criticalSuccess": "Found village +1 Structure",
            "success": "Found village",
            "failure": "no effect",
            "criticalFailure": "No effect"
        }
    },
    "upgrade-settlement": {
        "name": "Upgrade Settlement",
        "description": "Expand an existing settlement's size and capabilities, transforming villages into thriving centers of civilization",
        "requirements": "Village → Town: Level 2+ and 2+ Structures, Town → City: Level 5+ and 4+ Structures, City → Metropolis: Level 10+ and 6+ Structures",
        "skills": {
            "crafting": "infrastructure expansion",
            "society": "urban planning",
            "performance": "inspire growth",
            "arcana": "magical enhancement",
            "medicine": "public health improvements"
        },
        "effects": {
            "criticalSuccess": "Increase Level +1 Structure",
            "success": "Increase Level",
            "failure": "no effect",
            "criticalFailure": "No effect"
        }
    },
    "build-structure": {
        "name": "Build Structure",
        "description": "Construct new buildings and infrastructure within a settlement to enhance its capabilities",
        "skills": {
            "crafting": "construction expertise",
            "society": "organize workforce",
            "athletics": "physical labor",
            "acrobatics": "specialized construction",
            "stealth": "discrete building"
        },
        "effects": {
            "criticalSuccess": "Build Structures for half cost",
            "success": "Build 1 Structure",
            "failure": "no progress",
            "criticalFailure": "No progress"
        }
    },
    "repair-structure": {
        "name": "Repair Structure",
        "description": "Repair damaged structures within a settlement to restore its capabilities",
        "skills": {
            "crafting": "construction expertise",
            "society": "organize workforce",
            "athletics": "physical labor",
            "acrobatics": "specialized construction",
            "stealth": "discrete building"
        },
        "effects": {
            "criticalSuccess": "The structure is repaired for free",
            "success": "Pay 1d4 gold OR 1/2 the build cost for the structures tier",
            "failure": "remains damaged",
            "criticalFailure": "Lose 1 gold"
        }
    },
    "establish-diplomatic-relations": {
        "name": "Establish Diplomatic Relations",
        "description": "Open formal channels of communication with neighboring powers to enable future cooperation",
        "skills": {
            "diplomacy": "formal negotiations",
            "society": "cultural exchange",
            "performance": "diplomatic ceremonies",
            "deception": "strategic positioning",
            "occultism": "mystical bonds",
            "religion": "sacred alliances"
        },
        "effects": {
            "criticalSuccess": "Allies + request aid",
            "success": "Allies",
            "failure": "no effect",
            "criticalFailure": "No effect"
        }
    },
    "request-economic-aid": {
        "name": "Request Economic Aid",
        "description": "Appeal to allied nations for material support in times of need",
        "requirements": "Diplomatic relations",
        "skills": {
            "diplomacy": "formal request",
            "society": "leverage connections",
            "performance": "emotional appeal",
            "thievery": "creative accounting",
            "medicine": "humanitarian aid"
        },
        "effects": {
            "criticalSuccess": "Gain 3 Resources of your choice OR 3 Gold",
            "success": "Gain 2 Resources of your choice OR 2 Gold",
            "failure": "No effect",
            "criticalFailure": "Ally refuses"
        }
    },
    "request-military-aid": {
        "name": "Request Military Aid",
        "description": "Call upon allies to provide troops or military support during conflicts",
        "requirements": "Diplomatic relations",
        "skills": {
            "diplomacy": "alliance obligations",
            "intimidation": "pressure tactics",
            "society": "mutual defense",
            "arcana": "magical pacts",
            "warfare-lore": "strategic necessity"
        },
        "effects": {
            "criticalSuccess": "Gain 2 allied troops or a powerful special detachment for 1 battle",
            "success": "Gain 1 allied troop for 1 battle",
            "failure": "No effect",
            "criticalFailure": "Ally is offended"
        }
    },
    "infiltration": {
        "name": "Infiltration",
        "description": "Deploy spies and agents to gather intelligence on rival kingdoms or potential threats",
        "skills": {
            "deception": "false identities",
            "stealth": "covert operations",
            "thievery": "steal secrets",
            "society": "social infiltration",
            "arcana": "magical espionage",
            "acrobatics": "daring infiltration"
        },
        "effects": {
            "criticalSuccess": "Valuable intel",
            "success": "Broad intel",
            "failure": "no effect",
            "criticalFailure": "Spies are captured"
        }
    },
    "hire-adventurers": {
        "name": "Hire Adventurers",
        "description": "Contract independent heroes and mercenaries to handle dangerous tasks or resolve kingdom events",
        "costs": "2 Gold",
        "special": "Limit: This action may only be attempted once per Kingdom Turn",
        "skills": {
            "diplomacy": "negotiate contracts",
            "society": "use connections",
            "deception": "exaggerate rewards",
            "performance": "inspire heroes",
            "thievery": "recruit rogues"
        },
        "effects": {
            "criticalSuccess": "The adventurers resolve one ongoing Event entirely",
            "success": "Roll to resolve an Event with a +2 circumstance bonus",
            "failure": "The adventurers cause trouble. Gain +1 Unrest",
            "criticalFailure": "The adventurers vanish or turn rogue. Gain +2 Unrest"
        }
    },
    "sell-surplus": {
        "name": "Sell Surplus",
        "description": "Convert excess resources into gold through trade with merchants and neighboring kingdoms",
        "special": "Trade a single resource type for gold",
        "skills": {
            "society": "market knowledge",
            "diplomacy": "trade negotiations",
            "deception": "inflate value",
            "performance": "showcase goods",
            "thievery": "black market",
            "occultism": "mystical trade",
            "mercantile-lore": "trade expertise"
        },
        "effects": {
            "criticalSuccess": "Trade 2 Resources → 2 Gold",
            "success": "Trade 2 Resources → 1 Gold",
            "failure": "No effect",
            "criticalFailure": "No effect"
        }
    },
    "purchase-resources": {
        "name": "Purchase Resources",
        "description": "Use the kingdom's treasury to acquire needed materials from trade partners",
        "special": "Offer gold in exchange for a single resource type",
        "skills": {
            "society": "find suppliers",
            "diplomacy": "negotiate deals",
            "intimidation": "demand better prices",
            "deception": "misleading negotiations",
            "mercantile-lore": "market expertise"
        },
        "effects": {
            "criticalSuccess": "Spend 2 Gold → Gain 1 Resource, +1 free resource of the same type",
            "success": "Spend 2 Gold → Gain 1 Resource",
            "failure": "No effect",
            "criticalFailure": "Lose 2 Gold"
        }
    },
    "create-worksite": {
        "name": "Create Worksite",
        "description": "Establish resource extraction operations to harness the natural wealth of your territories",
        "special": "Choose a controlled hex. Establish a valid Worksite (Farm, Quarry, Mine, or Lumbermill)",
        "skills": {
            "crafting": "build infrastructure",
            "nature": "identify resources",
            "survival": "frontier operations",
            "athletics": "manual labor",
            "arcana": "magical extraction",
            "religion": "blessed endeavors"
        },
        "effects": {
            "criticalSuccess": "Immediately gain 1 Resource of the appropriate type, the Worksite is established and produces next turn",
            "success": "The Worksite is established and produces next turn",
            "failure": "No effect",
            "criticalFailure": "No effect"
        }
    },
    "collect-resources": {
        "name": "Collect Resources",
        "description": "Harvest materials from your territories, either through established worksites or direct extraction",
        "special": "Choose one controlled hex. Either collect 1 resource of the appropriate type without a Worksite or collect from the worksite (once/turn)",
        "skills": {
            "nature": "natural harvesting",
            "survival": "efficient extraction",
            "crafting": "process materials",
            "athletics": "physical labor",
            "occultism": "mystical gathering",
            "medicine": "herb collection"
        },
        "effects": {
            "criticalSuccess": "Gain an additional +1 Resource of the same type",
            "success": "Collect resources from hex or worksite",
            "failure": "No effect",
            "criticalFailure": "No effect"
        }
    },
    "collect-stipend": {
        "name": "Collect Stipend",
        "description": "Draw personal funds from the kingdom's treasury as compensation for your service",
        "requirements": "Counting House (T2) or higher Taxation structure",
        "special": "The PC gains personal Gold based on the settlement's level and the highest active Taxation tier in the kingdom",
        "skills": {
            "intimidation": "demand payment",
            "deception": "creative accounting",
            "diplomacy": "formal request",
            "society": "proper procedures",
            "performance": "justify worth",
            "acrobatics": "impressive service",
            "thievery": "skim the treasury"
        },
        "effects": {
            "criticalSuccess": "Gain double the listed amount",
            "success": "Gain the listed amount",
            "failure": "Gain half the listed amount, and the kingdom gains +1 Unrest",
            "criticalFailure": "Gain nothing, and the kingdom gains +1d4 Unrest"
        }
    }
}


def add_action_translations(manager, action_id, translations):
    """Add translations for a single action"""
    base_key = f"pf2e-kingdom-lite.actions.{action_id}"
    
    # Add main translations
    manager.set_key(f"{base_key}.name", translations["name"])
    manager.set_key(f"{base_key}.description", translations["description"])
    
    # Add special notes if present
    if "special" in translations:
        manager.set_key(f"{base_key}.special", translations["special"])
    
    # Add requirements if present
    if "requirements" in translations:
        manager.set_key(f"{base_key}.requirements", translations["requirements"])
    
    # Add costs if present
    if "costs" in translations:
        manager.set_key(f"{base_key}.costs", translations["costs"])
    
    # Add proficiency scaling if present
    if "proficiencyScaling" in translations:
        manager.set_key(f"{base_key}.proficiencyScaling", translations["proficiencyScaling"])
    
    # Add skills
    for skill, description in translations["skills"].items():
        manager.set_key(f"{base_key}.skills.{skill}", description)
    
    # Add effects
    for outcome, description in translations["effects"].items():
        manager.set_key(f"{base_key}.effects.{outcome}", description)


def main():
    """Add all action translations to the language file"""
    
    # Initialize the language manager
    manager = LanguageManager()
    
    # Track progress
    actions_added = 0
    translations_added = 0
    initial_stats = manager.get_stats()
    initial_total = initial_stats["total_keys"]
    
    # Add translations for each action
    for action_id, translations in ACTION_TRANSLATIONS.items():
        print(f"Adding translations for: {action_id}")
        add_action_translations(manager, action_id, translations)
        actions_added += 1
    
    # Get final stats
    final_stats = manager.get_stats()
    translations_added = final_stats["pending_changes"]["added"]
    
    # Save the updated file
    manager.export()
    
    print(f"\n✅ Successfully added translations for {actions_added} kingdom actions")
    print(f"📊 Total translation keys added: {translations_added}")
    print("Language file has been updated successfully")


if __name__ == "__main__":
    main()
