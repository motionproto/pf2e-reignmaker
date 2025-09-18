#!/usr/bin/env python3
"""
Create all structure JSON files for PF2e Kingdom Lite.

This script generates structure files based on the simplified structure system
defined in the Reignmaker Lite reference documents.
"""

import json
from pathlib import Path

# Define all structures based on Structures.md

# ========== SKILL-BASED STRUCTURES ==========

SKILL_STRUCTURES = {
    # Crime & Intrigue [Thievery, Deception, Stealth]
    "crime-intrigue": {
        "tiers": [
            {
                "tier": 1,
                "id": "rats-warren",
                "name": "Rats' Warren",
                "earnIncomeLevel": "settlement",
                "bonus": 0,
                "skills": ["thievery"],
                "cost": {"lumber": 2}
            },
            {
                "tier": 2,
                "id": "smugglers-den",
                "name": "Smugglers' Den",
                "earnIncomeLevel": "settlement+2",
                "bonus": 1,
                "skills": ["thievery", "deception"],
                "cost": {"lumber": 2, "stone": 2}
            },
            {
                "tier": 3,
                "id": "thieves-guild",
                "name": "Thieves' Guild",
                "earnIncomeLevel": "settlement+4",
                "bonus": 2,
                "skills": ["thievery", "deception", "stealth"],
                "cost": {"lumber": 2, "stone": 3, "ore": 3}
            },
            {
                "tier": 4,
                "id": "shadow-network",
                "name": "Shadow Network",
                "earnIncomeLevel": "settlement+6",
                "bonus": 3,
                "skills": ["thievery", "deception", "stealth"],
                "cost": {"lumber": 4, "stone": 6, "ore": 6},
                "special": "Reroll 1 failed skill check per turn"
            }
        ]
    },
    
    # Civic & Governance [Society, Diplomacy, Deception]
    "civic-governance": {
        "tiers": [
            {
                "tier": 1,
                "id": "town-hall",
                "name": "Town Hall",
                "earnIncomeLevel": "settlement",
                "bonus": 0,
                "skills": ["society"],
                "cost": {"stone": 2}
            },
            {
                "tier": 2,
                "id": "city-hall",
                "name": "City Hall",
                "earnIncomeLevel": "settlement+2",
                "bonus": 1,
                "skills": ["society", "diplomacy"],
                "cost": {"lumber": 2, "stone": 2}
            },
            {
                "tier": 3,
                "id": "diplomatic-quarter",
                "name": "Diplomatic Quarter",
                "earnIncomeLevel": "settlement+4",
                "bonus": 2,
                "skills": ["society", "diplomacy", "deception"],
                "cost": {"lumber": 2, "stone": 4, "ore": 2}
            },
            {
                "tier": 4,
                "id": "grand-forum",
                "name": "Grand Forum",
                "earnIncomeLevel": "settlement+6",
                "bonus": 3,
                "skills": ["society", "diplomacy", "deception"],
                "cost": {"lumber": 4, "stone": 6, "ore": 6},
                "special": "Reroll 1 failed skill check per turn"
            }
        ]
    },
    
    # Military & Training [Athletics, Acrobatics, Intimidation]
    "military-training": {
        "tiers": [
            {
                "tier": 1,
                "id": "gymnasium",
                "name": "Gymnasium",
                "earnIncomeLevel": "settlement",
                "bonus": 0,
                "skills": ["athletics"],
                "cost": {"lumber": 2}
            },
            {
                "tier": 2,
                "id": "training-yard",
                "name": "Training Yard",
                "earnIncomeLevel": "settlement+2",
                "bonus": 1,
                "skills": ["athletics", "acrobatics"],
                "cost": {"lumber": 2, "stone": 2}
            },
            {
                "tier": 3,
                "id": "warriors-hall",
                "name": "Warrior's Hall",
                "earnIncomeLevel": "settlement+4",
                "bonus": 2,
                "skills": ["athletics", "acrobatics", "intimidation"],
                "cost": {"lumber": 2, "stone": 3, "ore": 3}
            },
            {
                "tier": 4,
                "id": "military-academy",
                "name": "Military Academy",
                "earnIncomeLevel": "settlement+6",
                "bonus": 3,
                "skills": ["athletics", "acrobatics", "intimidation"],
                "cost": {"lumber": 4, "stone": 6, "ore": 6},
                "special": "Reroll 1 failed skill check per turn"
            }
        ]
    },
    
    # Crafting & Trade [Crafting, Lore, Society]
    "crafting-trade": {
        "tiers": [
            {
                "tier": 1,
                "id": "workshop",
                "name": "Workshop",
                "earnIncomeLevel": "settlement",
                "bonus": 0,
                "skills": ["crafting"],
                "cost": {"lumber": 2}
            },
            {
                "tier": 2,
                "id": "artisans-hall",
                "name": "Artisan's Hall",
                "earnIncomeLevel": "settlement+2",
                "bonus": 1,
                "skills": ["crafting", "lore"],
                "cost": {"lumber": 2, "stone": 2}
            },
            {
                "tier": 3,
                "id": "blacksmiths-guild",
                "name": "Blacksmiths' Guild",
                "earnIncomeLevel": "settlement+4",
                "bonus": 2,
                "skills": ["crafting", "lore", "society"],
                "cost": {"lumber": 2, "stone": 2, "ore": 4}
            },
            {
                "tier": 4,
                "id": "masterworks-foundry",
                "name": "Masterworks Foundry",
                "earnIncomeLevel": "settlement+6",
                "bonus": 3,
                "skills": ["crafting", "lore", "society"],
                "cost": {"lumber": 4, "stone": 4, "ore": 8},
                "special": "Reroll 1 failed skill check per turn"
            }
        ]
    },
    
    # Knowledge & Magic [Lore, Arcana, Occultism]
    "knowledge-magic": {
        "tiers": [
            {
                "tier": 1,
                "id": "scholars-table",
                "name": "Scholars' Table",
                "earnIncomeLevel": "settlement",
                "bonus": 0,
                "skills": ["lore"],
                "cost": {"stone": 2}
            },
            {
                "tier": 2,
                "id": "library",
                "name": "Library",
                "earnIncomeLevel": "settlement+2",
                "bonus": 1,
                "skills": ["lore", "arcana"],
                "cost": {"lumber": 1, "stone": 3}
            },
            {
                "tier": 3,
                "id": "university",
                "name": "University",
                "earnIncomeLevel": "settlement+4",
                "bonus": 2,
                "skills": ["lore", "arcana", "occultism"],
                "cost": {"lumber": 2, "stone": 4, "ore": 2}
            },
            {
                "tier": 4,
                "id": "arcane-academy",
                "name": "Arcane Academy",
                "earnIncomeLevel": "settlement+6",
                "bonus": 3,
                "skills": ["lore", "arcana", "occultism"],
                "cost": {"lumber": 4, "stone": 6, "ore": 6},
                "special": "Reroll 1 failed skill check per turn"
            }
        ]
    },
    
    # Faith & Nature [Religion, Medicine, Nature]
    "faith-nature": {
        "tiers": [
            {
                "tier": 1,
                "id": "shrine",
                "name": "Shrine",
                "earnIncomeLevel": "settlement",
                "bonus": 0,
                "skills": ["religion"],
                "cost": {"stone": 2}
            },
            {
                "tier": 2,
                "id": "temple",
                "name": "Temple",
                "earnIncomeLevel": "settlement+2",
                "bonus": 1,
                "skills": ["religion", "medicine"],
                "cost": {"lumber": 1, "stone": 3}
            },
            {
                "tier": 3,
                "id": "temple-district",
                "name": "Temple District",
                "earnIncomeLevel": "settlement+4",
                "bonus": 2,
                "skills": ["religion", "medicine", "nature"],
                "cost": {"lumber": 2, "stone": 4, "ore": 2}
            },
            {
                "tier": 4,
                "id": "grand-basilica",
                "name": "Grand Basilica",
                "earnIncomeLevel": "settlement+6",
                "bonus": 3,
                "skills": ["religion", "medicine", "nature"],
                "cost": {"lumber": 4, "stone": 6, "ore": 6},
                "special": "Reroll 1 failed skill check per turn"
            }
        ]
    },
    
    # Medicine & Healing [Medicine, Lore, Arcana]
    "medicine-healing": {
        "tiers": [
            {
                "tier": 1,
                "id": "healers-hut",
                "name": "Healer's Hut",
                "earnIncomeLevel": "settlement",
                "bonus": 0,
                "skills": ["medicine"],
                "cost": {"lumber": 2}
            },
            {
                "tier": 2,
                "id": "infirmary",
                "name": "Infirmary",
                "earnIncomeLevel": "settlement+2",
                "bonus": 1,
                "skills": ["medicine", "lore"],
                "cost": {"lumber": 1, "stone": 3}
            },
            {
                "tier": 3,
                "id": "hospital",
                "name": "Hospital",
                "earnIncomeLevel": "settlement+4",
                "bonus": 2,
                "skills": ["medicine", "lore", "arcana"],
                "cost": {"lumber": 2, "stone": 4, "ore": 2}
            },
            {
                "tier": 4,
                "id": "medical-college",
                "name": "Medical College",
                "earnIncomeLevel": "settlement+6",
                "bonus": 3,
                "skills": ["medicine", "lore", "arcana"],
                "cost": {"lumber": 4, "stone": 6, "ore": 6},
                "special": "Reroll 1 failed skill check per turn"
            }
        ]
    },
    
    # Performance & Culture [Performance, Diplomacy, Lore]
    "performance-culture": {
        "tiers": [
            {
                "tier": 1,
                "id": "buskers-alley",
                "name": "Buskers' Alley",
                "earnIncomeLevel": "settlement",
                "bonus": 0,
                "skills": ["performance"],
                "cost": {"lumber": 2}
            },
            {
                "tier": 2,
                "id": "famous-tavern",
                "name": "Famous Tavern",
                "earnIncomeLevel": "settlement+2",
                "bonus": 1,
                "skills": ["performance", "diplomacy"],
                "cost": {"lumber": 2, "stone": 2}
            },
            {
                "tier": 3,
                "id": "performance-hall",
                "name": "Performance Hall",
                "earnIncomeLevel": "settlement+4",
                "bonus": 2,
                "skills": ["performance", "diplomacy", "lore"],
                "cost": {"lumber": 4, "stone": 2, "ore": 2}
            },
            {
                "tier": 4,
                "id": "grand-amphitheater",
                "name": "Grand Amphitheater",
                "earnIncomeLevel": "settlement+6",
                "bonus": 3,
                "skills": ["performance", "diplomacy", "lore"],
                "cost": {"lumber": 6, "stone": 6, "ore": 4},
                "special": "Reroll 1 failed skill check per turn"
            }
        ]
    },
    
    # Exploration & Wilderness [Survival, Nature, Stealth]
    "exploration-wilderness": {
        "tiers": [
            {
                "tier": 1,
                "id": "hunters-lodge",
                "name": "Hunter's Lodge",
                "earnIncomeLevel": "settlement",
                "bonus": 0,
                "skills": ["survival"],
                "cost": {"lumber": 2}
            },
            {
                "tier": 2,
                "id": "rangers-outpost",
                "name": "Ranger's Outpost",
                "earnIncomeLevel": "settlement+2",
                "bonus": 1,
                "skills": ["survival", "nature"],
                "cost": {"lumber": 2, "stone": 2}
            },
            {
                "tier": 3,
                "id": "druids-grove",
                "name": "Druids' Grove",
                "earnIncomeLevel": "settlement+4",
                "bonus": 2,
                "skills": ["survival", "nature", "stealth"],
                "cost": {"lumber": 4, "stone": 2, "ore": 2}
            },
            {
                "tier": 4,
                "id": "wildskeepers-enclave",
                "name": "Wildskeepers' Enclave",
                "earnIncomeLevel": "settlement+6",
                "bonus": 3,
                "skills": ["survival", "nature", "stealth"],
                "cost": {"lumber": 6, "stone": 6, "ore": 4},
                "special": "Reroll 1 failed skill check per turn"
            }
        ]
    }
}

# ========== SUPPORT STRUCTURES ==========

SUPPORT_STRUCTURES = {
    # Food Storage
    "food-storage": {
        "tiers": [
            {
                "tier": 1,
                "id": "granary",
                "name": "Granary",
                "effect": "+4 Food capacity",
                "cost": {"lumber": 2}
            },
            {
                "tier": 2,
                "id": "storehouses",
                "name": "Storehouses",
                "effect": "+8 Food capacity",
                "cost": {"lumber": 2, "stone": 2}
            },
            {
                "tier": 3,
                "id": "warehouses",
                "name": "Warehouses",
                "effect": "+16 Food capacity",
                "cost": {"lumber": 3, "stone": 3, "ore": 2}
            },
            {
                "tier": 4,
                "id": "strategic-reserves",
                "name": "Strategic Reserves",
                "effect": "+36 Food capacity",
                "cost": {"lumber": 4, "stone": 6, "ore": 6},
                "special": "Once per Kingdom Turn, roll flat check DC 15; on success, negate a spoilage/loss event affecting Food."
            }
        ]
    },
    
    # Fortifications
    "fortifications": {
        "tiers": [
            {
                "tier": 1,
                "id": "wooden-palisade",
                "name": "Wooden Palisade",
                "effect": "+1 Army AC",
                "cost": {"lumber": 2}
            },
            {
                "tier": 2,
                "id": "stone-walls",
                "name": "Stone Walls",
                "effect": "+1 Army AC, +1 Effective Level",
                "cost": {"lumber": 1, "stone": 3}
            },
            {
                "tier": 3,
                "id": "fortified-walls",
                "name": "Fortified Walls",
                "effect": "+1 Army AC, +2 Effective Level",
                "cost": {"lumber": 1, "stone": 4, "ore": 3}
            },
            {
                "tier": 4,
                "id": "grand-battlements",
                "name": "Grand Battlements",
                "effect": "+2 Army AC, +3 Effective Level",
                "cost": {"lumber": 2, "stone": 8, "ore": 6},
                "special": "Defenders located in this recover each turn as long as the city has food"
            }
        ]
    },
    
    # Logistics
    "logistics": {
        "tiers": [
            {
                "tier": 1,
                "id": "barracks",
                "name": "Barracks",
                "effect": "Increases the settlement's unit capacity by +1",
                "cost": {"stone": 2}
            },
            {
                "tier": 2,
                "id": "garrison",
                "name": "Garrison",
                "effect": "Increases the settlement's unit capacity by +2",
                "cost": {"lumber": 1, "stone": 3}
            },
            {
                "tier": 3,
                "id": "fortress",
                "name": "Fortress",
                "effect": "Increases the settlement's unit capacity by +3",
                "cost": {"lumber": 2, "stone": 4, "ore": 2}
            },
            {
                "tier": 4,
                "id": "citadel",
                "name": "Citadel",
                "effect": "Increases the settlement's unit capacity by +4",
                "cost": {"lumber": 2, "stone": 8, "ore": 6},
                "special": "At the start of each Kingdom Turn, reduce the kingdom's Unrest by 1"
            }
        ]
    },
    
    # Commerce
    "commerce": {
        "tiers": [
            {
                "tier": 1,
                "id": "market-square",
                "name": "Market Square",
                "effect": "Enables selling surplus at 2:1 (resources:gold). Purchase non-magical items up to settlement level",
                "cost": {"lumber": 2}
            },
            {
                "tier": 2,
                "id": "bazaar",
                "name": "Bazaar",
                "effect": "Enables purchasing scrolls and consumables up to settlement level",
                "cost": {"lumber": 2, "stone": 2}
            },
            {
                "tier": 3,
                "id": "merchant-guild",
                "name": "Merchant Guild",
                "effect": "Improves selling surplus to 3:2 (resources:gold). Purchase magical items up to settlement level. +1 gold income per turn",
                "cost": {"lumber": 3, "stone": 3, "ore": 2}
            },
            {
                "tier": 4,
                "id": "imperial-bank",
                "name": "Imperial Bank",
                "effect": "Improves selling surplus to 1:1 (resources:gold). +2 gold income per turn",
                "cost": {"lumber": 4, "stone": 4, "ore": 8}
            }
        ]
    },
    
    # Culture
    "culture": {
        "tiers": [
            {
                "tier": 1,
                "id": "open-stage",
                "name": "Open Stage",
                "effect": "PCs in this settlement gain +1 to checks made to reduce Unrest",
                "cost": {"lumber": 2}
            },
            {
                "tier": 2,
                "id": "amphitheater",
                "name": "Amphitheater",
                "effect": "PCs in this settlement gain +2 to checks made to reduce Unrest",
                "cost": {"lumber": 3, "stone": 1}
            },
            {
                "tier": 3,
                "id": "playhouse",
                "name": "Playhouse",
                "effect": "PCs in this settlement gain +2 to checks made to reduce Unrest",
                "cost": {"lumber": 4, "stone": 3, "ore": 1}
            },
            {
                "tier": 4,
                "id": "auditorium",
                "name": "Auditorium",
                "effect": "+1 Fame each turn. PCs in this settlement gain +2 to checks made to reduce Unrest",
                "cost": {"lumber": 6, "stone": 6, "ore": 4},
                "special": "At the start of each Kingdom Turn, reduce Unrest by 1"
            }
        ]
    },
    
    # Revenue
    "revenue": {
        "tiers": [
            {
                "tier": 1,
                "id": "tax-office",
                "name": "Tax Office",
                "effect": "Each Kingdom Turn, the kingdom gains 1 Gold",
                "cost": {"stone": 2},
                "special": "Only one Taxation structure may exist in the kingdom at a time"
            },
            {
                "tier": 2,
                "id": "counting-house",
                "name": "Counting House",
                "effect": "Each Kingdom Turn, the kingdom gains 2 Gold. PCs may attempt the Personal Income kingdom action",
                "cost": {"lumber": 1, "stone": 3},
                "special": "Only one Taxation structure may exist in the kingdom at a time"
            },
            {
                "tier": 3,
                "id": "treasury",
                "name": "Treasury",
                "effect": "Each Kingdom Turn, the kingdom gains 4 Gold. PCs may attempt the Personal Income action (Income T3)",
                "cost": {"lumber": 2, "stone": 5, "ore": 1},
                "special": "Only one Taxation structure may exist in the kingdom at a time"
            },
            {
                "tier": 4,
                "id": "exchequer",
                "name": "Exchequer",
                "effect": "Each Kingdom Turn, the kingdom gains 8 Gold. PCs may attempt the Personal Income action (Income T4)",
                "cost": {"lumber": 3, "stone": 9, "ore": 4},
                "special": "Only one Taxation structure may exist in the kingdom at a time"
            }
        ]
    },
    
    # Justice
    "justice": {
        "tiers": [
            {
                "tier": 1,
                "id": "stocks",
                "name": "Stocks",
                "effect": "Can hold 1 imprisoned Unrest. Allows Execute action only",
                "cost": {"stone": 2}
            },
            {
                "tier": 2,
                "id": "jail",
                "name": "Jail",
                "effect": "Can hold 2 imprisoned Unrest. Allows Execute action only",
                "cost": {"lumber": 2, "stone": 2}
            },
            {
                "tier": 3,
                "id": "prison",
                "name": "Prison",
                "effect": "Can hold 4 imprisoned Unrest. Allows Execute or Pardon actions",
                "cost": {"lumber": 2, "stone": 4, "ore": 2}
            },
            {
                "tier": 4,
                "id": "donjon",
                "name": "Donjon",
                "effect": "Can hold 8 imprisoned Unrest. Allows Execute or Pardon actions",
                "cost": {"lumber": 4, "stone": 6, "ore": 6},
                "special": "Once per turn, can convert 1 regular Unrest to imprisoned Unrest without an action"
            }
        ]
    },
    
    # Diplomacy
    "diplomacy": {
        "tiers": [
            {
                "tier": 1,
                "id": "envoys-office",
                "name": "Envoy's Office",
                "effect": "+1 Diplomatic capacity. Enables 'Establish Diplomatic Relations' action",
                "cost": {"stone": 2}
            },
            {
                "tier": 2,
                "id": "embassy",
                "name": "Embassy",
                "effect": "+2 Diplomatic capacity",
                "cost": {"lumber": 2, "stone": 2}
            },
            {
                "tier": 3,
                "id": "grand-embassy",
                "name": "Grand Embassy",
                "effect": "+3 Diplomatic capacity. +1 Fame",
                "cost": {"lumber": 2, "stone": 4, "ore": 2}
            },
            {
                "tier": 4,
                "id": "diplomatic-quarter-support",
                "name": "Diplomatic Quarter",
                "effect": "+4 Diplomatic capacity. +1 Fame",
                "cost": {"lumber": 4, "stone": 6, "ore": 6},
                "special": "-1 Unrest each Kingdom Turn"
            }
        ]
    }
}

def create_skill_structure(structure_data, category):
    """Create a JSON structure for a skill-based structure."""
    return {
        "id": structure_data["id"],
        "name": f"structures.{structure_data['id']}.name",
        "type": "skill",
        "category": category,
        "tier": structure_data["tier"],
        "earnIncomeLevel": structure_data["earnIncomeLevel"],
        "bonus": structure_data["bonus"],
        "skills": structure_data["skills"],
        "construction": {
            "resources": structure_data["cost"]
        },
        "traits": ["building", "skill-structure", f"tier-{structure_data['tier']}"],
        "special": structure_data.get("special"),
        "upgradeFrom": None  # Will be set later for T2+ structures
    }

def create_support_structure(structure_data, category):
    """Create a JSON structure for a support structure."""
    return {
        "id": structure_data["id"],
        "name": f"structures.{structure_data['id']}.name",
        "type": "support",
        "category": category,
        "tier": structure_data["tier"],
        "effect": structure_data["effect"],
        "construction": {
            "resources": structure_data["cost"]
        },
        "traits": ["building", "support-structure", f"tier-{structure_data['tier']}"],
        "special": structure_data.get("special"),
        "upgradeFrom": None  # Will be set later for T2+ structures
    }

def main():
    # Ensure output directory exists
    output_dir = Path(__file__).parent
    output_dir.mkdir(exist_ok=True)
    
    # Track created files for summary
    created_files = []
    
    # Process skill-based structures
    print("Creating skill-based structures...")
    for category, category_data in SKILL_STRUCTURES.items():
        prev_tier_id = None
        for structure in category_data["tiers"]:
            json_data = create_skill_structure(structure, category)
            
            # Set upgrade path for T2+ structures
            if structure["tier"] > 1 and prev_tier_id:
                json_data["upgradeFrom"] = prev_tier_id
            
            # Save to file
            filename = f"{structure['id']}.json"
            filepath = output_dir / filename
            
            with open(filepath, 'w') as f:
                json.dump(json_data, f, indent=2)
            
            created_files.append(filename)
            print(f"  Created: {filename}")
            
            prev_tier_id = structure['id']
    
    # Process support structures
    print("\nCreating support structures...")
    for category, category_data in SUPPORT_STRUCTURES.items():
        prev_tier_id = None
        for structure in category_data["tiers"]:
            json_data = create_support_structure(structure, category)
            
            # Set upgrade path for T2+ structures
            if structure["tier"] > 1 and prev_tier_id:
                json_data["upgradeFrom"] = prev_tier_id
            
            # Save to file
            filename = f"{structure['id']}.json"
            filepath = output_dir / filename
            
            with open(filepath, 'w') as f:
                json.dump(json_data, f, indent=2)
            
            created_files.append(filename)
            print(f"  Created: {filename}")
            
            prev_tier_id = structure['id']
    
    # Summary
    print(f"\n✅ Successfully created {len(created_files)} structure files")
    print(f"  Skill-based structures: {sum(len(c['tiers']) for c in SKILL_STRUCTURES.values())}")
    print(f"  Support structures: {sum(len(c['tiers']) for c in SUPPORT_STRUCTURES.values())}")
    
    # Count by tier
    tier_counts = {1: 0, 2: 0, 3: 0, 4: 0}
    for category_data in {**SKILL_STRUCTURES, **SUPPORT_STRUCTURES}.values():
        for structure in category_data["tiers"]:
            tier_counts[structure["tier"]] += 1
    
    print("\nStructures by tier:")
    for tier, count in tier_counts.items():
        print(f"  Tier {tier}: {count} structures")

if __name__ == "__main__":
    main()
