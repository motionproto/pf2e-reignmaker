#!/usr/bin/env python3
"""
Generate player action JSON files from Kingdom_Actions.md reference.
This script creates all the kingdom actions as player skill-based actions.
"""

import json
import os
from typing import Dict, List, Any

def create_action(
    action_id: str,
    name: str,
    category: str,
    description: str,
    skills: List[Dict[str, str]],
    effects: Dict[str, Dict[str, Any]],
    **kwargs
) -> Dict[str, Any]:
    """Create a player action dictionary."""
    action = {
        "id": action_id,
        "name": name,
        "category": category,
        "description": description,
        "skills": skills,
        "effects": effects
    }
    
    # Add optional fields
    for key, value in kwargs.items():
        if value is not None:
            action[key] = value
    
    return action

def main():
    """Generate all player action JSON files."""
    
    actions = []
    
    # 1. Stability Actions
    
    # Coordinated Effort (special action, applies to other actions)
    actions.append(create_action(
        "coordinated-effort",
        "Coordinated Effort",
        "stability",
        "When two leaders form a partnership on a single action, their combined expertise ensures the best possible outcome.",
        [],  # Uses the skills of the chosen action
        {
            "criticalSuccess": {"description": "Use highest roll with +1 bonus"},
            "success": {"description": "Use highest roll with +1 bonus"},
            "failure": {"description": "Use highest roll with +1 bonus"},
            "criticalFailure": {"description": "Use highest roll with +1 bonus"}
        },
        limitations={"maxParticipants": 2, "oncePerTurn": True},
        availability="Exactly TWO PCs may use this together, once per turn"
    ))
    
    # Arrest Dissidents
    actions.append(create_action(
        "arrest-dissidents",
        "Arrest Dissidents",
        "stability",
        "Round up troublemakers and malcontents, converting unrest into imprisoned unrest that can be dealt with through the justice system.",
        [
            {"skill": "intimidation", "description": "show of force"},
            {"skill": "society", "description": "legal procedures"},
            {"skill": "stealth", "description": "covert operations"},
            {"skill": "deception", "description": "infiltration tactics"},
            {"skill": "athletics", "description": "physical pursuit"}
        ],
        {
            "criticalSuccess": {"description": "Convert 4 Unrest to imprisoned Unrest (up to structure capacity)", "unrest": -4},
            "success": {"description": "Convert 2 Unrest to imprisoned Unrest (up to structure capacity)", "unrest": -2},
            "failure": {"description": "No effect"},
            "criticalFailure": {"description": "Botched arrests cause riots; gain 1 Unrest", "unrest": 1}
        },
        failureCausesUnrest=True,
        requirements=[{"type": "structure", "details": "Justice structure with available capacity"}]
    ))
    
    # Execute or Pardon Prisoners
    actions.append(create_action(
        "execute-or-pardon-prisoners",
        "Execute or Pardon Prisoners",
        "stability",
        "Pass judgment on those who have threatened the kingdom's stability, choosing between mercy and justice.",
        [
            {"skill": "intimidation", "description": "harsh justice (execute)"},
            {"skill": "society", "description": "legal proceedings (execute)"},
            {"skill": "diplomacy", "description": "clemency (pardon)"},
            {"skill": "religion", "description": "divine forgiveness (pardon)"},
            {"skill": "performance", "description": "public ceremony (pardon)"}
        ],
        {
            "criticalSuccess": {"description": "Remove all imprisoned Unrest in the settlement and reduce Unrest by 1", "unrest": -1},
            "success": {"description": "Remove 1d4 imprisoned Unrest from the settlement"},
            "failure": {"description": "Remove none"},
            "criticalFailure": {"description": "Remove none; gain 1 current Unrest (riot, scandal, martyrdom)", "unrest": 1}
        },
        failureCausesUnrest=True,
        requirements=[{"type": "structure", "details": "Justice structure with imprisoned Unrest"}]
    ))
    
    # Deal with Unrest (already created)
    
    # 2. Military Operations
    
    # Recruit a Unit
    actions.append(create_action(
        "recruit-unit",
        "Recruit a Unit",
        "military",
        "Rally citizens to arms, drawing from the population to form new military units through inspiration, coercion, or demonstration of prowess.",
        [
            {"skill": "diplomacy", "description": "inspire patriotism"},
            {"skill": "intimidation", "description": "conscription"},
            {"skill": "society", "description": "civic duty"},
            {"skill": "performance", "description": "recruitment rallies"},
            {"skill": "athletics", "description": "demonstrations of prowess"}
        ],
        {
            "criticalSuccess": {"description": "Recruit a troop equal to the party level and reduce unrest by 1", "unrest": -1},
            "success": {"description": "Recruit a troop equal to the party level"},
            "failure": {"description": "No Recruits"},
            "criticalFailure": {"description": "No Recruit; +1 Unrest", "unrest": 1}
        },
        failureCausesUnrest=True
    ))
    
    # Outfit Army
    actions.append(create_action(
        "outfit-army",
        "Outfit Army",
        "military",
        "Equip your troops with superior arms, armor, and supplies to enhance their battlefield effectiveness.",
        [
            {"skill": "crafting", "description": "forge equipment"},
            {"skill": "society", "description": "requisition supplies"},
            {"skill": "intimidation", "description": "commandeer resources"},
            {"skill": "thievery", "description": "acquire through subterfuge"},
            {"skill": "warfare-lore", "description": "military procurement"}
        ],
        {
            "criticalSuccess": {"description": "Outfit a troop with two upgrades, or 2 troops with the same upgrade"},
            "success": {"description": "Outfit troop"},
            "failure": {"description": "No gear"},
            "criticalFailure": {"description": "No gear"}
        },
        failureCausesUnrest=False
    ))
    
    # Deploy Army
    actions.append(create_action(
        "deploy-army",
        "Deploy Army",
        "military",
        "Mobilize and maneuver your military forces across the kingdom's territory using various navigation methods.",
        [
            {"skill": "nature", "description": "natural pathways"},
            {"skill": "survival", "description": "wilderness navigation"},
            {"skill": "athletics", "description": "forced march"},
            {"skill": "stealth", "description": "covert movement"},
            {"skill": "warfare-lore", "description": "military tactics"}
        ],
        {
            "criticalSuccess": {"description": "Move, claim hex after battle"},
            "success": {"description": "Move"},
            "failure": {"description": "Move but -2 initiative, and troop is fatigued"},
            "criticalFailure": {"description": "Troop is lost to Random hex; -2 initiative, fatigued, enfeebled 1; +1 Unrest", "unrest": 1}
        },
        failureCausesUnrest=True
    ))
    
    # Recover Army
    actions.append(create_action(
        "recover-army",
        "Recover Army",
        "military",
        "Tend to wounded troops, restore morale, and replenish ranks after battle losses.",
        [
            {"skill": "medicine", "description": "heal the wounded"},
            {"skill": "performance", "description": "boost morale"},
            {"skill": "religion", "description": "spiritual restoration"},
            {"skill": "nature", "description": "natural remedies"},
            {"skill": "crafting", "description": "repair equipment"},
            {"skill": "warfare-lore", "description": "veteran experience"}
        ],
        {
            "criticalSuccess": {"description": "Troop recovers completely"},
            "success": {"description": "Troop recovers 1 segment"},
            "failure": {"description": "No recovery"},
            "criticalFailure": {"description": "No recovery"}
        },
        failureCausesUnrest=False
    ))
    
    # Train Army
    actions.append(create_action(
        "train-army",
        "Train Army",
        "military",
        "Drill your troops in tactics and discipline to improve their combat effectiveness through various training methods.",
        [
            {"skill": "intimidation", "description": "harsh discipline"},
            {"skill": "athletics", "description": "physical conditioning"},
            {"skill": "acrobatics", "description": "agility training"},
            {"skill": "survival", "description": "endurance exercises"},
            {"skill": "warfare-lore", "description": "tactical doctrine"}
        ],
        {
            "criticalSuccess": {"description": "Troop is promoted up to party level"},
            "success": {"description": "+1 level (max party level)"},
            "failure": {"description": "No change"},
            "criticalFailure": {"description": "No change"}
        },
        failureCausesUnrest=False
    ))
    
    # Disband Army
    actions.append(create_action(
        "disband-army",
        "Disband Army",
        "military",
        "Release military units from service, returning soldiers to civilian life.",
        [
            {"skill": "intimidation", "description": "stern dismissal"},
            {"skill": "diplomacy", "description": "honorable discharge"},
            {"skill": "society", "description": "reintegration programs"},
            {"skill": "performance", "description": "farewell ceremony"},
            {"skill": "warfare-lore", "description": "military protocol"}
        ],
        {
            "criticalSuccess": {"description": "People welcome them home with honours!, -2 Unrest", "unrest": -2},
            "success": {"description": "Army disbands, -1 Unrest", "unrest": -1},
            "failure": {"description": "Army disbands"},
            "criticalFailure": {"description": "Army disbands, +1 Unrest", "unrest": 1}
        },
        failureCausesUnrest=True
    ))
    
    # 3. Expand the Borders
    
    # Claim Hexes
    actions.append(create_action(
        "claim-hexes",
        "Claim Hexes",
        "borders",
        "Assert sovereignty over new territories, expanding your kingdom's borders into unclaimed lands.",
        [
            {"skill": "nature", "description": "harmonize with the land"},
            {"skill": "survival", "description": "establish frontier camps"},
            {"skill": "intimidation", "description": "force submission"},
            {"skill": "occultism", "description": "mystical claiming rituals"},
            {"skill": "religion", "description": "divine mandate"}
        ],
        {
            "criticalSuccess": {"description": "Claim all targeted hexes +1 extra hex"},
            "success": {"description": "Claim targeted hexes (based on proficiency)"},
            "failure": {"description": "No effect"},
            "criticalFailure": {"description": "No effect"}
        },
        proficiencyScaling={
            "trained": "Claim 1 hex per action",
            "expert": "Claim 1 hex per action",
            "master": "Claim 2 hexes per action",
            "legendary": "Claim 3 hexes per action"
        }
    ))
    
    # Build Roads (already created)
    
    # Send Scouts
    actions.append(create_action(
        "send-scouts",
        "Send Scouts",
        "borders",
        "Dispatch explorers to gather intelligence about neighboring territories and potential threats.",
        [
            {"skill": "stealth", "description": "covert reconnaissance"},
            {"skill": "survival", "description": "wilderness expertise"},
            {"skill": "nature", "description": "read the land"},
            {"skill": "society", "description": "gather local information"},
            {"skill": "athletics", "description": "rapid exploration"},
            {"skill": "acrobatics", "description": "navigate obstacles"}
        ],
        {
            "criticalSuccess": {"description": "Learn about 2 hexes"},
            "success": {"description": "Learn about 1 hex"},
            "failure": {"description": "No report"},
            "criticalFailure": {"description": "Scouts lost"}
        },
        failureCausesUnrest=False
    ))
    
    # Fortify Hex
    actions.append(create_action(
        "fortify-hex",
        "Fortify Hex",
        "borders",
        "Construct defensive structures and preparations in a hex to improve its resistance against invasion.",
        [
            {"skill": "crafting", "description": "build fortifications"},
            {"skill": "athletics", "description": "manual construction"},
            {"skill": "intimidation", "description": "defensive displays"},
            {"skill": "thievery", "description": "trap placement"},
            {"skill": "warfare-lore", "description": "strategic defenses"}
        ],
        {
            "criticalSuccess": {"description": "Fortify, reduce Unrest by 1", "unrest": -1},
            "success": {"description": "Fortify"},
            "failure": {"description": "Fail"},
            "criticalFailure": {"description": "No effect"}
        }
    ))
    
    # 4. Urban Planning
    
    # Establish a Settlement
    actions.append(create_action(
        "establish-settlement",
        "Establish a Settlement",
        "urban",
        "Found a new community where settlers can establish homes and begin building infrastructure.",
        [
            {"skill": "society", "description": "organized settlement"},
            {"skill": "survival", "description": "frontier establishment"},
            {"skill": "diplomacy", "description": "attract settlers"},
            {"skill": "religion", "description": "blessed founding"},
            {"skill": "medicine", "description": "healthy community planning"}
        ],
        {
            "criticalSuccess": {"description": "Found village +1 Structure"},
            "success": {"description": "Found village"},
            "failure": {"description": "No effect"},
            "criticalFailure": {"description": "No effect"}
        }
    ))
    
    # Upgrade a Settlement
    actions.append(create_action(
        "upgrade-settlement",
        "Upgrade a Settlement",
        "urban",
        "Expand an existing settlement's size and capabilities, transforming villages into thriving centers of civilization.",
        [
            {"skill": "crafting", "description": "infrastructure expansion"},
            {"skill": "society", "description": "urban planning"},
            {"skill": "performance", "description": "inspire growth"},
            {"skill": "arcana", "description": "magical enhancement"},
            {"skill": "medicine", "description": "public health improvements"}
        ],
        {
            "criticalSuccess": {"description": "Increase Level +1 Structure"},
            "success": {"description": "Increase Level"},
            "failure": {"description": "No effect"},
            "criticalFailure": {"description": "No effect"}
        },
        requirements=[{"type": "settlement", "details": "Must meet level and structure prerequisites"}]
    ))
    
    # Build Structure
    actions.append(create_action(
        "build-structure",
        "Build Structure",
        "urban",
        "Construct new buildings and infrastructure within a settlement to enhance its capabilities.",
        [
            {"skill": "crafting", "description": "construction expertise"},
            {"skill": "society", "description": "organize workforce"},
            {"skill": "athletics", "description": "physical labor"},
            {"skill": "acrobatics", "description": "specialized construction"},
            {"skill": "stealth", "description": "discrete building"}
        ],
        {
            "criticalSuccess": {"description": "Build Structures for half cost"},
            "success": {"description": "Build 1 Structure"},
            "failure": {"description": "No progress"},
            "criticalFailure": {"description": "No progress"}
        }
    ))
    
    # Repair Structure
    actions.append(create_action(
        "repair-structure",
        "Repair Structure",
        "urban",
        "Repair damaged structures within a settlement to restore its capabilities.",
        [
            {"skill": "crafting", "description": "construction expertise"},
            {"skill": "society", "description": "organize workforce"},
            {"skill": "athletics", "description": "physical labor"},
            {"skill": "acrobatics", "description": "specialized construction"},
            {"skill": "stealth", "description": "discrete building"}
        ],
        {
            "criticalSuccess": {"description": "The structure is repaired for free"},
            "success": {"description": "Pay 1d4 gold OR 1/2 the build cost for the structures tier"},
            "failure": {"description": "Remains damaged"},
            "criticalFailure": {"description": "Lose 1 gold", "resources": {"gold": -1}}
        }
    ))
    
    # 5. Foreign Affairs
    
    # Establish Diplomatic Relations
    actions.append(create_action(
        "establish-diplomatic-relations",
        "Establish Diplomatic Relations",
        "foreign",
        "Open formal channels of communication with neighboring powers to enable future cooperation.",
        [
            {"skill": "diplomacy", "description": "formal negotiations"},
            {"skill": "society", "description": "cultural exchange"},
            {"skill": "performance", "description": "diplomatic ceremonies"},
            {"skill": "deception", "description": "strategic positioning"},
            {"skill": "occultism", "description": "mystical bonds"},
            {"skill": "religion", "description": "sacred alliances"}
        ],
        {
            "criticalSuccess": {"description": "Allies + request aid"},
            "success": {"description": "Allies"},
            "failure": {"description": "No effect"},
            "criticalFailure": {"description": "No effect"}
        },
        failureCausesUnrest=False
    ))
    
    # Request Economic Aid
    actions.append(create_action(
        "request-economic-aid",
        "Request Economic Aid",
        "foreign",
        "Appeal to allied nations for material support in times of need.",
        [
            {"skill": "diplomacy", "description": "formal request"},
            {"skill": "society", "description": "leverage connections"},
            {"skill": "performance", "description": "emotional appeal"},
            {"skill": "thievery", "description": "creative accounting"},
            {"skill": "medicine", "description": "humanitarian aid"}
        ],
        {
            "criticalSuccess": {"description": "Gain 3 Resources of your choice OR 3 Gold", "resources": {"gold": 3}},
            "success": {"description": "Gain 2 Resources of your choice OR 2 Gold", "resources": {"gold": 2}},
            "failure": {"description": "No effect"},
            "criticalFailure": {"description": "Ally refuses"}
        },
        failureCausesUnrest=False,
        requirements=[{"type": "ally", "details": "Must have established diplomatic relations"}]
    ))
    
    # Request Military Aid
    actions.append(create_action(
        "request-military-aid",
        "Request Military Aid",
        "foreign",
        "Call upon allies to provide troops or military support during conflicts.",
        [
            {"skill": "diplomacy", "description": "alliance obligations"},
            {"skill": "intimidation", "description": "pressure tactics"},
            {"skill": "society", "description": "mutual defense"},
            {"skill": "arcana", "description": "magical pacts"},
            {"skill": "warfare-lore", "description": "strategic necessity"}
        ],
        {
            "criticalSuccess": {"description": "Gain 2 allied troops or a powerful special detachment for 1 battle"},
            "success": {"description": "Gain 1 allied troop for 1 battle"},
            "failure": {"description": "No effect"},
            "criticalFailure": {"description": "Ally is offended"}
        },
        failureCausesUnrest=False,
        requirements=[{"type": "ally", "details": "Must have established diplomatic relations"}]
    ))
    
    # Infiltration
    actions.append(create_action(
        "infiltration",
        "Infiltration",
        "foreign",
        "Deploy spies and agents to gather intelligence on rival kingdoms or potential threats.",
        [
            {"skill": "deception", "description": "false identities"},
            {"skill": "stealth", "description": "covert operations"},
            {"skill": "thievery", "description": "steal secrets"},
            {"skill": "society", "description": "social infiltration"},
            {"skill": "arcana", "description": "magical espionage"},
            {"skill": "acrobatics", "description": "daring infiltration"}
        ],
        {
            "criticalSuccess": {"description": "Valuable intel"},
            "success": {"description": "Broad intel"},
            "failure": {"description": "No effect"},
            "criticalFailure": {"description": "Spies are captured"}
        },
        failureCausesUnrest=False
    ))
    
    # Hire Adventurers
    actions.append(create_action(
        "hire-adventurers",
        "Hire Adventurers",
        "foreign",
        "Contract independent heroes and mercenaries to handle dangerous tasks or resolve kingdom events.",
        [
            {"skill": "diplomacy", "description": "negotiate contracts"},
            {"skill": "society", "description": "use connections"},
            {"skill": "deception", "description": "exaggerate rewards"},
            {"skill": "performance", "description": "inspire heroes"},
            {"skill": "thievery", "description": "recruit rogues"}
        ],
        {
            "criticalSuccess": {"description": "The adventurers resolve one ongoing Event entirely"},
            "success": {"description": "Roll to resolve an Event with a +2 circumstance bonus"},
            "failure": {"description": "The adventurers cause trouble. Gain +1 Unrest", "unrest": 1},
            "criticalFailure": {"description": "The adventurers vanish or turn rogue. Gain +2 Unrest", "unrest": 2}
        },
        failureCausesUnrest=True,
        cost={"gold": 2},
        limitations={"oncePerTurn": True}
    ))
    
    # 6. Economic & Resource Actions
    
    # Sell Surplus
    actions.append(create_action(
        "sell-surplus",
        "Sell Surplus",
        "economic",
        "Convert excess resources into gold through trade with merchants and neighboring kingdoms.",
        [
            {"skill": "society", "description": "market knowledge"},
            {"skill": "diplomacy", "description": "trade negotiations"},
            {"skill": "deception", "description": "inflate value"},
            {"skill": "performance", "description": "showcase goods"},
            {"skill": "thievery", "description": "black market"},
            {"skill": "occultism", "description": "mystical trade"},
            {"skill": "mercantile-lore", "description": "trade expertise"}
        ],
        {
            "criticalSuccess": {"description": "Trade 2 Resources → 2 Gold", "resources": {"gold": 2}},
            "success": {"description": "Trade 2 Resources → 1 Gold", "resources": {"gold": 1}},
            "failure": {"description": "No effect"},
            "criticalFailure": {"description": "No effect"}
        },
        failureCausesUnrest=False
    ))
    
    # Purchase Resources
    actions.append(create_action(
        "purchase-resources",
        "Purchase Resources",
        "economic",
        "Use the kingdom's treasury to acquire needed materials from trade partners.",
        [
            {"skill": "society", "description": "find suppliers"},
            {"skill": "diplomacy", "description": "negotiate deals"},
            {"skill": "intimidation", "description": "demand better prices"},
            {"skill": "deception", "description": "misleading negotiations"},
            {"skill": "mercantile-lore", "description": "market expertise"}
        ],
        {
            "criticalSuccess": {"description": "Spend 2 Gold → Gain 1 Resource, +1 free resource of the same type"},
            "success": {"description": "Spend 2 Gold → Gain 1 Resource"},
            "failure": {"description": "No effect"},
            "criticalFailure": {"description": "Lose 2 Gold", "resources": {"gold": -2}}
        },
        failureCausesUnrest=False,
        cost={"gold": 2}
    ))
    
    # Create Worksite
    actions.append(create_action(
        "create-worksite",
        "Create Worksite",
        "economic",
        "Establish resource extraction operations to harness the natural wealth of your territories.",
        [
            {"skill": "crafting", "description": "build infrastructure"},
            {"skill": "nature", "description": "identify resources"},
            {"skill": "survival", "description": "frontier operations"},
            {"skill": "athletics", "description": "manual labor"},
            {"skill": "arcana", "description": "magical extraction"},
            {"skill": "religion", "description": "blessed endeavors"}
        ],
        {
            "criticalSuccess": {"description": "Immediately gain 1 Resource of the appropriate type, the Worksite is established and produces next turn"},
            "success": {"description": "The Worksite is established and produces next turn"},
            "failure": {"description": "No effect"},
            "criticalFailure": {"description": "No effect"}
        }
    ))
    
    # Collect Resources
    actions.append(create_action(
        "collect-resources",
        "Collect Resources",
        "economic",
        "Harvest materials from your territories, either through established worksites or direct extraction.",
        [
            {"skill": "nature", "description": "natural harvesting"},
            {"skill": "survival", "description": "efficient extraction"},
            {"skill": "crafting", "description": "process materials"},
            {"skill": "athletics", "description": "physical labor"},
            {"skill": "occultism", "description": "mystical gathering"},
            {"skill": "medicine", "description": "herb collection"}
        ],
        {
            "criticalSuccess": {"description": "Gain an additional +1 Resource of the same type"},
            "success": {"description": "Collect resources from hex or worksite"},
            "failure": {"description": "No effect"},
            "criticalFailure": {"description": "No effect"}
        },
        failureCausesUnrest=False
    ))
    
    # Collect Stipend
    actions.append(create_action(
        "collect-stipend",
        "Collect Stipend",
        "economic",
        "Draw personal funds from the kingdom's treasury as compensation for your service.",
        [
            {"skill": "intimidation", "description": "demand payment"},
            {"skill": "deception", "description": "creative accounting"},
            {"skill": "diplomacy", "description": "formal request"},
            {"skill": "society", "description": "proper procedures"},
            {"skill": "performance", "description": "justify worth"},
            {"skill": "acrobatics", "description": "impressive service"},
            {"skill": "thievery", "description": "skim the treasury"}
        ],
        {
            "criticalSuccess": {"description": "Gain double the listed amount"},
            "success": {"description": "Gain the listed amount"},
            "failure": {"description": "Gain half the listed amount, and the kingdom gains +1 Unrest", "unrest": 1},
            "criticalFailure": {"description": "Gain nothing, and the kingdom gains +1d4 Unrest", "unrest": 2}
        },
        failureCausesUnrest=True,
        requirements=[{"type": "structure", "details": "Counting House (T2) or higher Taxation structure"}]
    ))
    
    # Create the data/player-actions directory if it doesn't exist
    os.makedirs("data/player-actions", exist_ok=True)
    
    # Write each action to a JSON file
    for action in actions:
        filename = f"data/player-actions/{action['id']}.json"
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(action, f, indent=2, ensure_ascii=False)
        print(f"Created: {filename}")
    
    print(f"\n✅ Successfully generated {len(actions)} player action JSON files!")
    
    # Also create one comprehensive file with all actions (for reference)
    with open("data/player-actions/all-actions.json", 'w', encoding='utf-8') as f:
        json.dump(actions, f, indent=2, ensure_ascii=False)
    print("Created: data/player-actions/all-actions.json (reference file)")

if __name__ == "__main__":
    main()
