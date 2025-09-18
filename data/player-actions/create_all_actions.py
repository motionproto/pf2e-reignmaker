#!/usr/bin/env python3
"""
Create all Kingdom Actions with proper modifier structures
Based on Kingdom_Actions.md reference
"""

import json
import os
from pathlib import Path

# Define the complete set of 28 kingdom actions with their modifiers
KINGDOM_ACTIONS = [
    # Uphold Stability (4 actions)
    {
        "id": "coordinated-effort",
        "name": "Coordinated Effort",
        "category": "uphold-stability",
        "description": "When two leaders form a partnership on a single action, their combined expertise ensures the best possible outcome",
        "skills": [
            {"skill": "politics", "description": "coordinate leadership"},
            {"skill": "performance", "description": "inspire teamwork"}
        ],
        "failureCausesUnrest": False,
        "special": "Meta-action that modifies other actions. Exactly TWO PCs may use this together once per turn.",
        "effects": {
            "criticalSuccess": {
                "description": "Both Coordinated Effort and the follow-up action gain +2 circumstance bonuses to their checks",
                "modifiers": {"meta": {"selfBonus": 2, "nextActionBonus": 2}}
            },
            "success": {
                "description": "The follow-up action gains a +2 circumstance bonus to its check",
                "modifiers": {"meta": {"nextActionBonus": 2}}
            },
            "failure": {
                "description": "The follow-up action gains a +1 circumstance bonus to its check",
                "modifiers": {"meta": {"nextActionBonus": 1}}
            },
            "criticalFailure": {
                "description": "Both actions fail automatically",
                "modifiers": {"meta": {"selfFails": True, "nextActionFails": True}}
            }
        }
    },
    {
        "id": "arrest-dissidents",
        "name": "Arrest Dissidents",
        "category": "uphold-stability",
        "description": "Round up troublemakers and malcontents, converting unrest into imprisoned unrest that can be dealt with through the justice system",
        "skills": [
            {"skill": "intimidation", "description": "show of force"},
            {"skill": "society", "description": "legal procedures"},
            {"skill": "stealth", "description": "covert operations"},
            {"skill": "deception", "description": "infiltration tactics"},
            {"skill": "athletics", "description": "physical pursuit"}
        ],
        "failureCausesUnrest": True,
        "requirements": ["Justice structure with capacity"],
        "effects": {
            "criticalSuccess": {
                "description": "Convert 4 Unrest to imprisoned Unrest (up to structure capacity)",
                "modifiers": {"imprisonedUnrest": 4, "unrest": -4}
            },
            "success": {
                "description": "Convert 2 Unrest to imprisoned Unrest (up to structure capacity)",
                "modifiers": {"imprisonedUnrest": 2, "unrest": -2}
            },
            "failure": {
                "description": "No effect"
            },
            "criticalFailure": {
                "description": "Botched arrests cause riots; gain 1 Unrest",
                "modifiers": {"unrest": 1}
            }
        }
    },
    {
        "id": "execute-or-pardon-prisoners",
        "name": "Execute or Pardon Prisoners",
        "category": "uphold-stability",
        "description": "Pass judgment on those who have threatened the kingdom's stability, choosing between mercy and justice",
        "skills": [
            {"skill": "intimidation", "description": "harsh justice (execute)"},
            {"skill": "society", "description": "legal proceedings (execute)"},
            {"skill": "diplomacy", "description": "clemency (pardon)"},
            {"skill": "religion", "description": "divine forgiveness (pardon)"},
            {"skill": "performance", "description": "public ceremony (pardon)"}
        ],
        "failureCausesUnrest": True,
        "requirements": ["Justice structure with imprisoned unrest"],
        "effects": {
            "criticalSuccess": {
                "description": "Remove all imprisoned Unrest in the settlement and reduce Unrest by 1",
                "modifiers": {"imprisonedUnrest": "removeAll", "unrest": -1}
            },
            "success": {
                "description": "Remove 1d4 imprisoned Unrest from the settlement",
                "modifiers": {"imprisonedUnrest": "remove1d4"}
            },
            "failure": {
                "description": "Remove none"
            },
            "criticalFailure": {
                "description": "Remove none; gain 1 current Unrest (riot, scandal, martyrdom)",
                "modifiers": {"unrest": 1}
            }
        }
    },
    {
        "id": "deal-with-unrest",
        "name": "Deal with Unrest",
        "category": "uphold-stability",
        "description": "Address grievances and calm tensions through various approaches: entertainment, religious ceremonies, shows of force, diplomatic engagement, scholarly discourse, or magical displays",
        "skills": [
            {"skill": "performance", "description": "entertainment and festivities"},
            {"skill": "religion", "description": "religious ceremonies"},
            {"skill": "intimidation", "description": "shows of force"},
            {"skill": "diplomacy", "description": "diplomatic engagement"},
            {"skill": "arcana", "description": "magical persuasion"},
            {"skill": "medicine", "description": "public health initiatives"},
            {"skill": "occultism", "description": "mystical demonstrations"},
            {"skill": "acrobatics", "description": "impressive physical feats"}
        ],
        "failureCausesUnrest": False,
        "special": "End of Turn Only",
        "effects": {
            "criticalSuccess": {
                "description": "Reduce Unrest by 3",
                "modifiers": {"unrest": -3}
            },
            "success": {
                "description": "Reduce Unrest by 2",
                "modifiers": {"unrest": -2}
            },
            "failure": {
                "description": "Reduce Unrest by 1",
                "modifiers": {"unrest": -1}
            },
            "criticalFailure": {
                "description": "No effect"
            }
        }
    },
    
    # Military Operations (6 actions)
    {
        "id": "recruit-unit",
        "name": "Recruit Unit",
        "category": "military-operations",
        "description": "Rally citizens to arms, drawing from the population to form new military units through inspiration, coercion, or demonstration of prowess",
        "skills": [
            {"skill": "diplomacy", "description": "inspire patriotism"},
            {"skill": "intimidation", "description": "conscription"},
            {"skill": "society", "description": "civic duty"},
            {"skill": "performance", "description": "recruitment rallies"},
            {"skill": "athletics", "description": "demonstrations of prowess"}
        ],
        "failureCausesUnrest": True,
        "effects": {
            "criticalSuccess": {
                "description": "Recruit a troop equal to the party level and reduce unrest by 1 as patriotism spreads",
                "modifiers": {"militaryUnits": 1, "unrest": -1}
            },
            "success": {
                "description": "Recruit a troop equal to the party level",
                "modifiers": {"militaryUnits": 1}
            },
            "failure": {
                "description": "No Recruits"
            },
            "criticalFailure": {
                "description": "No Recruit; +1 Unrest",
                "modifiers": {"unrest": 1}
            }
        }
    },
    {
        "id": "outfit-army",
        "name": "Outfit Army",
        "category": "military-operations",
        "description": "Equip your troops with superior arms, armor, and supplies to enhance their battlefield effectiveness",
        "skills": [
            {"skill": "crafting", "description": "forge equipment"},
            {"skill": "society", "description": "requisition supplies"},
            {"skill": "intimidation", "description": "commandeer resources"},
            {"skill": "thievery", "description": "acquire through subterfuge"},
            {"skill": "warfare-lore", "description": "military procurement"}
        ],
        "failureCausesUnrest": False,
        "special": "Equipment types: armor (+1 AC), runes (+1 to hit), weapons (+1 damage dice), equipment (+1 saving throws)",
        "effects": {
            "criticalSuccess": {
                "description": "Outfit a troop with two upgrades, or 2 troops with the same upgrade",
                "modifiers": {"armyUpgrades": 2}
            },
            "success": {
                "description": "Outfit troop",
                "modifiers": {"armyUpgrades": 1}
            },
            "failure": {
                "description": "No gear"
            },
            "criticalFailure": {
                "description": "No gear"
            }
        }
    },
    {
        "id": "deploy-army",
        "name": "Deploy Army",
        "category": "military-operations",
        "description": "Mobilize and maneuver your military forces across the kingdom's territory using various navigation methods",
        "skills": [
            {"skill": "nature", "description": "natural pathways"},
            {"skill": "survival", "description": "wilderness navigation"},
            {"skill": "athletics", "description": "forced march"},
            {"skill": "stealth", "description": "covert movement"},
            {"skill": "warfare-lore", "description": "military tactics"}
        ],
        "failureCausesUnrest": True,
        "effects": {
            "criticalSuccess": {
                "description": "Move, claim hex after battle",
                "modifiers": {"armyMove": True, "claimHex": True}
            },
            "success": {
                "description": "Move",
                "modifiers": {"armyMove": True}
            },
            "failure": {
                "description": "Move but -2 initiative, and troop is fatigued",
                "modifiers": {"armyMove": True, "initiative": -2, "fatigued": True}
            },
            "criticalFailure": {
                "description": "Your troop is lost they arrive at a Random nearby hex (1d6 for direction, 1-3 for offset); troop has -2 initiative, is fatigued and enfeebled 1; +1 Unrest",
                "modifiers": {"armyLost": True, "initiative": -2, "fatigued": True, "enfeebled": 1, "unrest": 1}
            }
        }
    },
    {
        "id": "recover-army",
        "name": "Recover Army",
        "category": "military-operations",
        "description": "Tend to wounded troops, restore morale, and replenish ranks after battle losses",
        "skills": [
            {"skill": "medicine", "description": "heal the wounded"},
            {"skill": "performance", "description": "boost morale"},
            {"skill": "religion", "description": "spiritual restoration"},
            {"skill": "nature", "description": "natural remedies"},
            {"skill": "crafting", "description": "repair equipment"},
            {"skill": "warfare-lore", "description": "veteran experience"}
        ],
        "failureCausesUnrest": False,
        "effects": {
            "criticalSuccess": {
                "description": "Troop recovers completely",
                "modifiers": {"armyRecover": "complete"}
            },
            "success": {
                "description": "Troop recovers 1 segment",
                "modifiers": {"armyRecover": 1}
            },
            "failure": {
                "description": "No recovery"
            },
            "criticalFailure": {
                "description": "No recovery"
            }
        }
    },
    {
        "id": "train-army",
        "name": "Train Army",
        "category": "military-operations",
        "description": "Drill your troops in tactics and discipline to improve their combat effectiveness through various training methods",
        "skills": [
            {"skill": "intimidation", "description": "harsh discipline"},
            {"skill": "athletics", "description": "physical conditioning"},
            {"skill": "acrobatics", "description": "agility training"},
            {"skill": "survival", "description": "endurance exercises"},
            {"skill": "warfare-lore", "description": "tactical doctrine"}
        ],
        "failureCausesUnrest": False,
        "effects": {
            "criticalSuccess": {
                "description": "Troop is promoted up to party level",
                "modifiers": {"armyLevel": "partyLevel"}
            },
            "success": {
                "description": "+1 level (max party level)",
                "modifiers": {"armyLevel": 1}
            },
            "failure": {
                "description": "No change"
            },
            "criticalFailure": {
                "description": "No change"
            }
        }
    },
    {
        "id": "disband-army",
        "name": "Disband Army",
        "category": "military-operations",
        "description": "Release military units from service, returning soldiers to civilian life",
        "skills": [
            {"skill": "intimidation", "description": "stern dismissal"},
            {"skill": "diplomacy", "description": "honorable discharge"},
            {"skill": "society", "description": "reintegration programs"},
            {"skill": "performance", "description": "farewell ceremony"},
            {"skill": "warfare-lore", "description": "military protocol"}
        ],
        "failureCausesUnrest": True,
        "effects": {
            "criticalSuccess": {
                "description": "People welcome them home with honours!, -2 Unrest",
                "modifiers": {"militaryUnits": -1, "unrest": -2}
            },
            "success": {
                "description": "Army disbands, -1 Unrest",
                "modifiers": {"militaryUnits": -1, "unrest": -1}
            },
            "failure": {
                "description": "Army disbands",
                "modifiers": {"militaryUnits": -1}
            },
            "criticalFailure": {
                "description": "Army disbands, +1 Unrest",
                "modifiers": {"militaryUnits": -1, "unrest": 1}
            }
        }
    },
    
    # Expand Borders (4 actions)
    {
        "id": "claim-hexes",
        "name": "Claim Hexes",
        "category": "expand-borders",
        "description": "Assert sovereignty over new territories, expanding your kingdom's borders into unclaimed lands",
        "skills": [
            {"skill": "nature", "description": "harmonize with the land"},
            {"skill": "survival", "description": "establish frontier camps"},
            {"skill": "intimidation", "description": "force submission"},
            {"skill": "occultism", "description": "mystical claiming rituals"},
            {"skill": "religion", "description": "divine mandate"}
        ],
        "failureCausesUnrest": False,
        "proficiencyScaling": {
            "trained": 1,
            "expert": 1,
            "master": 2,
            "legendary": 3
        },
        "special": "+2 circumstance bonus when claiming hexes adjacent to 3+ controlled hexes",
        "effects": {
            "criticalSuccess": {
                "description": "Claim all targeted hexes +1 extra hex",
                "modifiers": {"hexesClaimed": "proficiency+1"}
            },
            "success": {
                "description": "Claim targeted hexes (based on proficiency)",
                "modifiers": {"hexesClaimed": "proficiency"}
            },
            "failure": {
                "description": "no effect"
            },
            "criticalFailure": {
                "description": "No effect"
            }
        }
    },
    {
        "id": "build-roads",
        "name": "Build Roads",
        "category": "expand-borders",
        "description": "Construct pathways between settlements to improve trade, travel, and military movement",
        "skills": [
            {"skill": "crafting", "description": "engineering expertise"},
            {"skill": "survival", "description": "pathfinding routes"},
            {"skill": "athletics", "description": "manual labor"},
            {"skill": "nature", "description": "work with terrain"}
        ],
        "failureCausesUnrest": False,
        "effects": {
            "criticalSuccess": {
                "description": "Build roads +1 hex",
                "modifiers": {"roadsBuilt": 2}
            },
            "success": {
                "description": "Build roads",
                "modifiers": {"roadsBuilt": 1}
            },
            "failure": {
                "description": "no effect"
            },
            "criticalFailure": {
                "description": "No effect"
            }
        }
    },
    {
        "id": "send-scouts",
        "name": "Send Scouts",
        "category": "expand-borders",
        "description": "Dispatch explorers to gather intelligence about neighboring territories and potential threats",
        "skills": [
            {"skill": "stealth", "description": "covert reconnaissance"},
            {"skill": "survival", "description": "wilderness expertise"},
            {"skill": "nature", "description": "read the land"},
            {"skill": "society", "description": "gather local information"},
            {"skill": "athletics", "description": "rapid exploration"},
            {"skill": "acrobatics", "description": "navigate obstacles"}
        ],
        "failureCausesUnrest": False,
        "effects": {
            "criticalSuccess": {
                "description": "Learn about 2 hexes",
                "modifiers": {"hexesRevealed": 2}
            },
            "success": {
                "description": "Learn about 1 hex",
                "modifiers": {"hexesRevealed": 1}
            },
            "failure": {
                "description": "no report"
            },
            "criticalFailure": {
                "description": "Scouts lost"
            }
        }
    },
    {
        "id": "fortify-hex",
        "name": "Fortify Hex",
        "category": "expand-borders",
        "description": "Construct defensive structures and preparations in a hex to improve its resistance against invasion",
        "skills": [
            {"skill": "crafting", "description": "build fortifications"},
            {"skill": "athletics", "description": "manual construction"},
            {"skill": "intimidation", "description": "defensive displays"},
            {"skill": "thievery", "description": "trap placement"},
            {"skill": "warfare-lore", "description": "strategic defenses"}
        ],
        "failureCausesUnrest": False,
        "special": "Fortification Benefits: Troops defending in a fortified hex gain +1 armor class and +2 initiative circumstance bonus",
        "effects": {
            "criticalSuccess": {
                "description": "Fortify, reduce Unrest by 1",
                "modifiers": {"hexFortified": True, "unrest": -1}
            },
            "success": {
                "description": "Fortify",
                "modifiers": {"hexFortified": True}
            },
            "failure": {
                "description": "Fail"
            },
            "criticalFailure": {
                "description": "No effect"
            }
        }
    },
    
    # Urban Planning (4 actions)
    {
        "id": "establish-settlement",
        "name": "Establish Settlement",
        "category": "urban-planning",
        "description": "Found a new community where settlers can establish homes and begin building infrastructure",
        "skills": [
            {"skill": "society", "description": "organized settlement"},
            {"skill": "survival", "description": "frontier establishment"},
            {"skill": "diplomacy", "description": "attract settlers"},
            {"skill": "religion", "description": "blessed founding"},
            {"skill": "medicine", "description": "healthy community planning"}
        ],
        "failureCausesUnrest": False,
        "special": "Villages are typically Level 1. A new settlement begins as a Village unless special circumstances apply",
        "effects": {
            "criticalSuccess": {
                "description": "Found village +1 Structure",
                "modifiers": {"settlementLevel": 1, "structures": 1}
            },
            "success": {
                "description": "Found village",
                "modifiers": {"settlementLevel": 1}
            },
            "failure": {
                "description": "no effect"
            },
            "criticalFailure": {
                "description": "No effect"
            }
        }
    },
    {
        "id": "upgrade-settlement",
        "name": "Upgrade Settlement",
        "category": "urban-planning",
        "description": "Expand an existing settlement's size and capabilities, transforming villages into thriving centers of civilization",
        "skills": [
            {"skill": "crafting", "description": "infrastructure expansion"},
            {"skill": "society", "description": "urban planning"},
            {"skill": "performance", "description": "inspire growth"},
            {"skill": "arcana", "description": "magical enhancement"},
            {"skill": "medicine", "description": "public health improvements"}
        ],
        "failureCausesUnrest": False,
        "requirements": ["Village → Town: Level 2+ and 2+ Structures", "Town → City: Level 5+ and 4+ Structures", "City → Metropolis: Level 10+ and 6+ Structures"],
        "effects": {
            "criticalSuccess": {
                "description": "Increase Level +1 Structure",
                "modifiers": {"settlementUpgrade": True, "structures": 1}
            },
            "success": {
                "description": "Increase Level",
                "modifiers": {"settlementUpgrade": True}
            },
            "failure": {
                "description": "no effect"
            },
            "criticalFailure": {
                "description": "No effect"
            }
        }
    },
    {
        "id": "build-structure",
        "name": "Build Structure",
        "category": "urban-planning",
        "description": "Construct new buildings and infrastructure within a settlement to enhance its capabilities",
        "skills": [
            {"skill": "crafting", "description": "construction expertise"},
            {"skill": "society", "description": "organize workforce"},
            {"skill": "athletics", "description": "physical labor"},
            {"skill": "acrobatics", "description": "specialized construction"},
            {"skill": "stealth", "description": "discrete building"}
        ],
        "failureCausesUnrest": False,
        "effects": {
            "criticalSuccess": {
                "description": "Build Structures for half cost",
                "modifiers": {"structureBuilt": True, "costReduction": 0.5}
            },
            "success": {
                "description": "Build 1 Structure",
                "modifiers": {"structureBuilt": True}
            },
            "failure": {
                "description": "no progress"
            },
            "criticalFailure": {
                "description": "No progress"
            }
        }
    },
    {
        "id": "repair-structure",
        "name": "Repair Structure",
        "category": "urban-planning",
        "description": "Repair damaged structures within a settlement to restore its capabilities",
        "skills": [
            {"skill": "crafting", "description": "construction expertise"},
            {"skill": "society", "description": "organize workforce"},
            {"skill": "athletics", "description": "physical labor"},
            {"skill": "acrobatics", "description": "specialized construction"},
            {"skill": "stealth", "description": "discrete building"}
        ],
        "failureCausesUnrest": False,
        "effects": {
            "criticalSuccess": {
                "description": "The structure is repaired for free",
                "modifiers": {"structureRepaired": True, "costReduction": 1.0}
            },
            "success": {
                "description": "Pay 1d4 gold OR 1/2 the build cost for the structures tier",
                "modifiers": {"structureRepaired": True}
            },
            "failure": {
                "description": "remains damaged"
            },
            "criticalFailure": {
                "description": "Lose 1 gold",
                "modifiers": {"gold": -1}
            }
        }
    },
    
    # Foreign Affairs (5 actions)
    {
        "id": "establish-diplomatic-relations",
        "name": "Establish Diplomatic Relations",
        "category": "foreign-affairs",
        "description": "Open formal channels of communication with neighboring powers to enable future cooperation",
        "skills": [
            {"skill": "diplomacy", "description": "formal negotiations"},
            {"skill": "society", "description": "cultural exchange"},
            {"skill": "performance", "description": "diplomatic ceremonies"},
            {"skill": "deception", "description": "strategic positioning"},
            {"skill": "occultism", "description": "mystical bonds"},
            {"skill": "religion", "description": "sacred alliances"}
        ],
        "failureCausesUnrest": False,
        "effects": {
            "criticalSuccess": {
                "description": "Allies + request aid",
                "modifiers": {"diplomaticRelations": 2, "canRequestAid": True}
            },
            "success": {
                "description": "Allies",
                "modifiers": {"diplomaticRelations": 1}
            },
            "failure": {
                "description": "no effect"
            },
            "criticalFailure": {
                "description": "No effect"
            }
        }
    },
    {
        "id": "request-economic-aid",
        "name": "Request Economic Aid",
        "category": "foreign-affairs",
        "description": "Appeal to allied nations for material support in times of need",
        "skills": [
            {"skill": "diplomacy", "description": "formal request"},
            {"skill": "society", "description": "leverage connections"},
            {"skill": "performance", "description": "emotional appeal"},
            {"skill": "thievery", "description": "creative accounting"},
            {"skill": "medicine", "description": "humanitarian aid"}
        ],
        "failureCausesUnrest": False,
        "requirements": ["Diplomatic relations"],
        "effects": {
            "criticalSuccess": {
                "description": "Gain 3 Resources of your choice OR 3 Gold",
                "modifiers": {"resources": 3, "gold": 3}
            },
            "success": {
                "description": "Gain 2 Resources of your choice OR 2 Gold",
                "modifiers": {"resources": 2, "gold": 2}
            },
            "failure": {
                "description": "No effect"
            },
            "criticalFailure": {
                "description": "Ally refuses"
            }
        }
    },
    {
        "id": "request-military-aid",
        "name": "Request Military Aid",
        "category": "foreign-affairs",
        "description": "Call upon allies to provide troops or military support during conflicts",
        "skills": [
            {"skill": "diplomacy", "description": "alliance obligations"},
            {"skill": "intimidation", "description": "pressure tactics"},
            {"skill": "society", "description": "mutual defense"},
            {"skill": "arcana", "description": "magical pacts"},
            {"skill": "warfare-lore", "description": "strategic necessity"}
        ],
        "failureCausesUnrest": False,
        "requirements": ["Diplomatic relations"],
        "effects": {
            "criticalSuccess": {
                "description": "Gain 2 allied troops or a powerful special detachment for 1 battle",
                "modifiers": {"temporaryUnits": 2, "duration": "1 battle"}
            },
            "success": {
                "description": "Gain 1 allied troop for 1 battle",
                "modifiers": {"temporaryUnits": 1, "duration": "1 battle"}
            },
            "failure": {
                "description": "No effect"
            },
            "criticalFailure": {
                "description": "Ally is offended"
            }
        }
    },
    {
        "id": "infiltration",
        "name": "Infiltration",
        "category": "foreign-affairs",
        "description": "Deploy spies and agents to gather intelligence on rival kingdoms or potential threats",
        "skills": [
            {"skill": "deception", "description": "false identities"},
            {"skill": "stealth", "description": "covert operations"},
            {"skill": "thievery", "description": "steal secrets"},
            {"skill": "society", "description": "social infiltration"},
            {"skill": "arcana", "description": "magical espionage"},
            {"skill": "acrobatics", "description": "daring infiltration"}
        ],
        "failureCausesUnrest": False,
        "effects": {
            "criticalSuccess": {
                "description": "Valuable intel",
                "modifiers": {"intelligence": 2}
            },
            "success": {
                "description": "Broad intel",
                "modifiers": {"intelligence": 1}
            },
            "failure": {
                "description": "no effect"
            },
            "criticalFailure": {
                "description": "Spies are captured"
            }
        }
    },
    {
        "id": "hire-adventurers",
        "name": "Hire Adventurers",
        "category": "foreign-affairs",
        "description": "Contract independent heroes and mercenaries to handle dangerous tasks or resolve kingdom events",
        "skills": [
            {"skill": "diplomacy", "description": "negotiate contracts"},
            {"skill": "society", "description": "use connections"},
            {"skill": "deception", "description": "exaggerate rewards"},
            {"skill": "performance", "description": "inspire heroes"},
            {"skill": "thievery", "description": "recruit rogues"}
        ],
        "failureCausesUnrest": True,
        "costs": {"gold": 2},
        "special": "Limit: This action may only be attempted once per Kingdom Turn",
        "effects": {
            "criticalSuccess": {
                "description": "The adventurers resolve one ongoing Event entirely",
                "modifiers": {"eventResolved": True}
            },
            "success": {
                "description": "Roll to resolve an Event with a +2 circumstance bonus",
                "modifiers": {"eventBonus": 2}
            },
            "failure": {
                "description": "The adventurers cause trouble. Gain +1 Unrest",
                "modifiers": {"unrest": 1}
            },
            "criticalFailure": {
                "description": "The adventurers vanish or turn rogue. Gain +2 Unrest",
                "modifiers": {"unrest": 2}
            }
        }
    },
    
    # Economic & Resources (5 actions)
    {
        "id": "sell-surplus",
        "name": "Sell Surplus",
        "category": "economic-resources",
        "description": "Convert excess resources into gold through trade with merchants and neighboring kingdoms",
        "skills": [
            {"skill": "society", "description": "market knowledge"},
            {"skill": "diplomacy", "description": "trade negotiations"},
            {"skill": "deception", "description": "inflate value"},
            {"skill": "performance", "description": "showcase goods"},
            {"skill": "thievery", "description": "black market"},
            {"skill": "occultism", "description": "mystical trade"},
            {"skill": "mercantile-lore", "description": "trade expertise"}
        ],
        "failureCausesUnrest": False,
        "special": "Trade a single resource type for gold",
        "effects": {
            "criticalSuccess": {
                "description": "Trade 2 Resources → 2 Gold",
                "modifiers": {"resourcesSpent": 2, "gold": 2}
            },
            "success": {
                "description": "Trade 2 Resources → 1 Gold",
                "modifiers": {"resourcesSpent": 2, "gold": 1}
            },
            "failure": {
                "description": "No effect"
            },
            "criticalFailure": {
                "description": "No effect"
            }
        }
    },
    {
        "id": "purchase-resources",
        "name": "Purchase Resources",
        "category": "economic-resources",
        "description": "Use the kingdom's treasury to acquire needed materials from trade partners",
        "skills": [
            {"skill": "society", "description": "find suppliers"},
            {"skill": "diplomacy", "description": "negotiate deals"},
            {"skill": "intimidation", "description": "demand better prices"},
            {"skill": "deception", "description": "misleading negotiations"},
            {"skill": "mercantile-lore", "description": "market expertise"}
        ],
        "failureCausesUnrest": False,
        "special": "Offer gold in exchange for a single resource type",
        "effects": {
            "criticalSuccess": {
                "description": "Spend 2 Gold → Gain 1 Resource, +1 free resource of the same type",
                "modifiers": {"gold": -2, "resources": 2}
            },
            "success": {
                "description": "Spend 2 Gold → Gain 1 Resource",
                "modifiers": {"gold": -2, "resources": 1}
            },
            "failure": {
                "description": "No effect"
            },
            "criticalFailure": {
                "description": "Lose 2 Gold",
                "modifiers": {"gold": -2}
            }
        }
    },
    {
        "id": "create-worksite",
        "name": "Create Worksite",
        "category": "economic-resources",
        "description": "Establish resource extraction operations to harness the natural wealth of your territories",
        "skills": [
            {"skill": "crafting", "description": "build infrastructure"},
            {"skill": "nature", "description": "identify resources"},
            {"skill": "survival", "description": "frontier operations"},
            {"skill": "athletics", "description": "manual labor"},
            {"skill": "arcana", "description": "magical extraction"},
            {"skill": "religion", "description": "blessed endeavors"}
        ],
        "failureCausesUnrest": False,
        "special": "Choose a controlled hex. Establish a valid Worksite (Farm, Quarry, Mine, or Lumbermill)",
        "effects": {
            "criticalSuccess": {
                "description": "Immediately gain 1 Resource of the appropriate type, the Worksite is established and produces next turn",
                "modifiers": {"worksiteLevel": 1, "resources": 1}
            },
            "success": {
                "description": "The Worksite is established and produces next turn",
                "modifiers": {"worksiteLevel": 1}
            },
            "failure": {
                "description": "No effect"
            },
            "criticalFailure": {
                "description": "No effect"
            }
        }
    },
    {
        "id": "collect-resources",
        "name": "Collect Resources",
        "category": "economic-resources",
        "description": "Harvest materials from your territories, either through established worksites or direct extraction",
        "skills": [
            {"skill": "nature", "description": "natural harvesting"},
            {"skill": "survival", "description": "efficient extraction"},
            {"skill": "crafting", "description": "process materials"},
            {"skill": "athletics", "description": "physical labor"},
            {"skill": "occultism", "description": "mystical gathering"},
            {"skill": "medicine", "description": "herb collection"}
        ],
        "failureCausesUnrest": False,
        "special": "Choose one controlled hex. Either collect 1 resource of the appropriate type without a Worksite or collect from the worksite (once/turn)",
        "effects": {
            "criticalSuccess": {
                "description": "Gain an additional +1 Resource of the same type",
                "modifiers": {"resourceBonus": 1}
            },
            "success": {
                "description": "Collect resources from hex or worksite",
                "modifiers": {"resourceCollected": True}
            },
            "failure": {
                "description": "No effect"
            },
            "criticalFailure": {
                "description": "No effect"
            }
        }
    },
    {
        "id": "collect-stipend",
        "name": "Collect Stipend",
        "category": "economic-resources",
        "description": "Draw personal funds from the kingdom's treasury as compensation for your service",
        "skills": [
            {"skill": "intimidation", "description": "demand payment"},
            {"skill": "deception", "description": "creative accounting"},
            {"skill": "diplomacy", "description": "formal request"},
            {"skill": "society", "description": "proper procedures"},
            {"skill": "performance", "description": "justify worth"},
            {"skill": "acrobatics", "description": "impressive service"},
            {"skill": "thievery", "description": "skim the treasury"}
        ],
        "failureCausesUnrest": True,
        "requirements": ["Counting House (T2) or higher Taxation structure"],
        "special": "The PC gains personal Gold based on the settlement's level and the highest active Taxation tier in the kingdom",
        "effects": {
            "criticalSuccess": {
                "description": "Gain double the listed amount",
                "modifiers": {"personalGold": "double"}
            },
            "success": {
                "description": "Gain the listed amount",
                "modifiers": {"personalGold": "normal"}
            },
            "failure": {
                "description": "Gain half the listed amount, and the kingdom gains +1 Unrest",
                "modifiers": {"personalGold": "half", "unrest": 1}
            },
            "criticalFailure": {
                "description": "Gain nothing, and the kingdom gains +1d4 Unrest",
                "modifiers": {"personalGold": 0, "unrest": "1d4"}
            }
        }
    }
]


def create_action_file(action_data):
    """Create a single action JSON file with complete modifier structure"""
    
    # Build the complete action structure
    action = {
        "id": action_data["id"],
        "name": action_data["name"],
        "category": action_data["category"],
        "description": action_data["description"],
        "skills": action_data["skills"],
        "effects": {}
    }
    
    # Add optional properties
    if action_data.get("failureCausesUnrest"):
        action["failureCausesUnrest"] = True
    
    if action_data.get("requirements"):
        action["requirements"] = action_data["requirements"]
    
    if action_data.get("costs"):
        action["costs"] = action_data["costs"]
    
    if action_data.get("variableCost"):
        action["variableCost"] = True
    
    if action_data.get("proficiencyScaling"):
        action["proficiencyScaling"] = action_data["proficiencyScaling"]
    
    if action_data.get("special"):
        action["special"] = action_data["special"]
    
    # Build effects with proper modifier structure
    for outcome_type in ["criticalSuccess", "success", "failure", "criticalFailure"]:
        if outcome_type in action_data["effects"]:
            effect = action_data["effects"][outcome_type]
            action["effects"][outcome_type] = {
                "description": effect["description"]
            }
            
            # Add modifiers if present
            if "modifiers" in effect and effect["modifiers"]:
                action["effects"][outcome_type]["modifiers"] = effect["modifiers"]
    
    return action


def main():
    """Generate all kingdom action JSON files"""
    
    # Ensure the directory exists
    actions_dir = Path(".")
    
    # Create all action files
    for action_data in KINGDOM_ACTIONS:
        action = create_action_file(action_data)
        
        # Write the JSON file
        filename = f"{action_data['id']}.json"
        filepath = actions_dir / filename
        
        with open(filepath, 'w') as f:
            json.dump(action, f, indent=2)
        
        print(f"Created: {filename}")
    
    print(f"\nSuccessfully created {len(KINGDOM_ACTIONS)} kingdom action files")


if __name__ == "__main__":
    main()
