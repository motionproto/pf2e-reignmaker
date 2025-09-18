#!/usr/bin/env python3
"""
Add translations for all structure JSON files to the language file.

This script adds structure translations to the en.json language file
using the LanguageManager API.
"""

import json
import sys
from pathlib import Path

# Add langtools to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "lang" / "langtools"))
from lang_manager import LanguageManager

# Define structure data for translations
STRUCTURES = {
    # ========== SKILL-BASED STRUCTURES ==========
    
    # Crime & Intrigue
    "rats-warren": {
        "name": "Rats' Warren",
        "description": "A network of tunnels and hideouts where thieves gather to plan their activities.",
        "effect": "Earn Income at settlement level for Thievery",
        "notes": "T1 Crime & Intrigue structure"
    },
    "smugglers-den": {
        "name": "Smugglers' Den",
        "description": "Secret warehouses and hidden passages used for illicit trade and deception.",
        "effect": "Earn Income at settlement level +2; +1 bonus to Thievery and Deception",
        "notes": "T2 Crime & Intrigue structure"
    },
    "thieves-guild": {
        "name": "Thieves' Guild",
        "description": "An organized criminal network with extensive resources and training facilities.",
        "effect": "Earn Income at settlement level +4; +2 bonus to Thievery, Deception, and Stealth",
        "notes": "T3 Crime & Intrigue structure"
    },
    "shadow-network": {
        "name": "Shadow Network",
        "description": "A master criminal organization with influence throughout the kingdom.",
        "effect": "Earn Income at settlement level +6; +3 bonus to Thievery, Deception, and Stealth; Reroll 1 failed skill check per turn",
        "notes": "T4 Crime & Intrigue structure"
    },
    
    # Civic & Governance
    "town-hall": {
        "name": "Town Hall",
        "description": "The administrative center for local governance and civil affairs.",
        "effect": "Earn Income at settlement level for Society",
        "notes": "T1 Civic & Governance structure"
    },
    "city-hall": {
        "name": "City Hall",
        "description": "An expanded governmental complex with diplomatic facilities.",
        "effect": "Earn Income at settlement level +2; +1 bonus to Society and Diplomacy",
        "notes": "T2 Civic & Governance structure"
    },
    "diplomatic-quarter": {
        "name": "Diplomatic Quarter",
        "description": "A dedicated district for international relations and political intrigue.",
        "effect": "Earn Income at settlement level +4; +2 bonus to Society, Diplomacy, and Deception",
        "notes": "T3 Civic & Governance structure"
    },
    "grand-forum": {
        "name": "Grand Forum",
        "description": "The kingdom's premier center for politics, diplomacy, and civil discourse.",
        "effect": "Earn Income at settlement level +6; +3 bonus to Society, Diplomacy, and Deception; Reroll 1 failed skill check per turn",
        "notes": "T4 Civic & Governance structure"
    },
    
    # Military & Training
    "gymnasium": {
        "name": "Gymnasium",
        "description": "A basic training facility for physical fitness and athletics.",
        "effect": "Earn Income at settlement level for Athletics",
        "notes": "T1 Military & Training structure"
    },
    "training-yard": {
        "name": "Training Yard",
        "description": "An expanded facility with obstacle courses and combat training areas.",
        "effect": "Earn Income at settlement level +2; +1 bonus to Athletics and Acrobatics",
        "notes": "T2 Military & Training structure"
    },
    "warriors-hall": {
        "name": "Warrior's Hall",
        "description": "A martial complex where warriors train in all aspects of combat.",
        "effect": "Earn Income at settlement level +4; +2 bonus to Athletics, Acrobatics, and Intimidation",
        "notes": "T3 Military & Training structure"
    },
    "military-academy": {
        "name": "Military Academy",
        "description": "An elite institution that trains the kingdom's finest warriors and strategists.",
        "effect": "Earn Income at settlement level +6; +3 bonus to Athletics, Acrobatics, and Intimidation; Reroll 1 failed skill check per turn",
        "notes": "T4 Military & Training structure"
    },
    
    # Crafting & Trade
    "workshop": {
        "name": "Workshop",
        "description": "A basic crafting facility where artisans create goods.",
        "effect": "Earn Income at settlement level for Crafting",
        "notes": "T1 Crafting & Trade structure"
    },
    "artisans-hall": {
        "name": "Artisan's Hall",
        "description": "A guild hall where craftsmen share knowledge and techniques.",
        "effect": "Earn Income at settlement level +2; +1 bonus to Crafting and Lore",
        "notes": "T2 Crafting & Trade structure"
    },
    "blacksmiths-guild": {
        "name": "Blacksmiths' Guild",
        "description": "A major guild complex with forges, workshops, and trade connections.",
        "effect": "Earn Income at settlement level +4; +2 bonus to Crafting, Lore, and Society",
        "notes": "T3 Crafting & Trade structure"
    },
    "masterworks-foundry": {
        "name": "Masterworks Foundry",
        "description": "The kingdom's premier crafting facility, producing legendary items.",
        "effect": "Earn Income at settlement level +6; +3 bonus to Crafting, Lore, and Society; Reroll 1 failed skill check per turn",
        "notes": "T4 Crafting & Trade structure"
    },
    
    # Knowledge & Magic
    "scholars-table": {
        "name": "Scholars' Table",
        "description": "A gathering place for learned individuals to share knowledge.",
        "effect": "Earn Income at settlement level for Lore",
        "notes": "T1 Knowledge & Magic structure"
    },
    "library": {
        "name": "Library",
        "description": "A repository of books and scrolls covering mundane and arcane subjects.",
        "effect": "Earn Income at settlement level +2; +1 bonus to Lore and Arcana",
        "notes": "T2 Knowledge & Magic structure"
    },
    "university": {
        "name": "University",
        "description": "A center of higher learning with multiple colleges and research facilities.",
        "effect": "Earn Income at settlement level +4; +2 bonus to Lore, Arcana, and Occultism",
        "notes": "T3 Knowledge & Magic structure"
    },
    "arcane-academy": {
        "name": "Arcane Academy",
        "description": "The kingdom's foremost institution for magical study and research.",
        "effect": "Earn Income at settlement level +6; +3 bonus to Lore, Arcana, and Occultism; Reroll 1 failed skill check per turn",
        "notes": "T4 Knowledge & Magic structure"
    },
    
    # Faith & Nature
    "shrine": {
        "name": "Shrine",
        "description": "A small sacred site dedicated to divine worship.",
        "effect": "Earn Income at settlement level for Religion",
        "notes": "T1 Faith & Nature structure"
    },
    "temple": {
        "name": "Temple",
        "description": "A consecrated building where clergy provide spiritual and medical services.",
        "effect": "Earn Income at settlement level +2; +1 bonus to Religion and Medicine",
        "notes": "T2 Faith & Nature structure"
    },
    "temple-district": {
        "name": "Temple District",
        "description": "A holy quarter with multiple temples, healing centers, and sacred groves.",
        "effect": "Earn Income at settlement level +4; +2 bonus to Religion, Medicine, and Nature",
        "notes": "T3 Faith & Nature structure"
    },
    "grand-basilica": {
        "name": "Grand Basilica",
        "description": "A magnificent religious complex serving as the kingdom's spiritual center.",
        "effect": "Earn Income at settlement level +6; +3 bonus to Religion, Medicine, and Nature; Reroll 1 failed skill check per turn",
        "notes": "T4 Faith & Nature structure"
    },
    
    # Medicine & Healing
    "healers-hut": {
        "name": "Healer's Hut",
        "description": "A simple clinic where herbalists and healers treat the sick.",
        "effect": "Earn Income at settlement level for Medicine",
        "notes": "T1 Medicine & Healing structure"
    },
    "infirmary": {
        "name": "Infirmary",
        "description": "An expanded medical facility with trained physicians and better equipment.",
        "effect": "Earn Income at settlement level +2; +1 bonus to Medicine and Lore",
        "notes": "T2 Medicine & Healing structure"
    },
    "hospital": {
        "name": "Hospital",
        "description": "A major medical center combining traditional and magical healing methods.",
        "effect": "Earn Income at settlement level +4; +2 bonus to Medicine, Lore, and Arcana",
        "notes": "T3 Medicine & Healing structure"
    },
    "medical-college": {
        "name": "Medical College",
        "description": "The kingdom's premier institution for medical training and healing research.",
        "effect": "Earn Income at settlement level +6; +3 bonus to Medicine, Lore, and Arcana; Reroll 1 failed skill check per turn",
        "notes": "T4 Medicine & Healing structure"
    },
    
    # Performance & Culture
    "buskers-alley": {
        "name": "Buskers' Alley",
        "description": "A street where performers entertain crowds for coin.",
        "effect": "Earn Income at settlement level for Performance",
        "notes": "T1 Performance & Culture structure"
    },
    "famous-tavern": {
        "name": "Famous Tavern",
        "description": "A renowned establishment where bards perform and diplomats meet.",
        "effect": "Earn Income at settlement level +2; +1 bonus to Performance and Diplomacy",
        "notes": "T2 Performance & Culture structure"
    },
    "performance-hall": {
        "name": "Performance Hall",
        "description": "A dedicated venue for theatrical productions and cultural events.",
        "effect": "Earn Income at settlement level +4; +2 bonus to Performance, Diplomacy, and Lore",
        "notes": "T3 Performance & Culture structure"
    },
    "grand-amphitheater": {
        "name": "Grand Amphitheater",
        "description": "A massive cultural complex hosting the kingdom's greatest performances.",
        "effect": "Earn Income at settlement level +6; +3 bonus to Performance, Diplomacy, and Lore; Reroll 1 failed skill check per turn",
        "notes": "T4 Performance & Culture structure"
    },
    
    # Exploration & Wilderness
    "hunters-lodge": {
        "name": "Hunter's Lodge",
        "description": "A rustic building where hunters and trappers gather.",
        "effect": "Earn Income at settlement level for Survival",
        "notes": "T1 Exploration & Wilderness structure"
    },
    "rangers-outpost": {
        "name": "Ranger's Outpost",
        "description": "A fortified post where rangers monitor the wilderness and train recruits.",
        "effect": "Earn Income at settlement level +2; +1 bonus to Survival and Nature",
        "notes": "T2 Exploration & Wilderness structure"
    },
    "druids-grove": {
        "name": "Druids' Grove",
        "description": "A sacred natural sanctuary where druids commune with nature.",
        "effect": "Earn Income at settlement level +4; +2 bonus to Survival, Nature, and Stealth",
        "notes": "T3 Exploration & Wilderness structure"
    },
    "wildskeepers-enclave": {
        "name": "Wildskeepers' Enclave",
        "description": "The kingdom's premier wilderness organization, maintaining harmony between civilization and nature.",
        "effect": "Earn Income at settlement level +6; +3 bonus to Survival, Nature, and Stealth; Reroll 1 failed skill check per turn",
        "notes": "T4 Exploration & Wilderness structure"
    },
    
    # ========== SUPPORT STRUCTURES ==========
    
    # Food Storage
    "granary": {
        "name": "Granary",
        "description": "A basic storage facility for preserving food supplies.",
        "effect": "+4 Food storage capacity",
        "notes": "T1 Food Storage structure"
    },
    "storehouses": {
        "name": "Storehouses",
        "description": "Expanded warehouses with improved preservation methods.",
        "effect": "+8 Food storage capacity",
        "notes": "T2 Food Storage structure"
    },
    "warehouses": {
        "name": "Warehouses",
        "description": "Large storage complexes with advanced preservation techniques.",
        "effect": "+16 Food storage capacity",
        "notes": "T3 Food Storage structure"
    },
    "strategic-reserves": {
        "name": "Strategic Reserves",
        "description": "Massive fortified storage facilities with magical preservation.",
        "effect": "+36 Food storage capacity; DC 15 flat check to negate food loss events",
        "notes": "T4 Food Storage structure"
    },
    
    # Fortifications
    "wooden-palisade": {
        "name": "Wooden Palisade",
        "description": "A basic wooden wall providing minimal defense.",
        "effect": "+1 Army AC",
        "notes": "T1 Fortification structure"
    },
    "stone-walls": {
        "name": "Stone Walls",
        "description": "Solid stone fortifications with defensive positions.",
        "effect": "+1 Army AC, +1 Effective Level",
        "notes": "T2 Fortification structure"
    },
    "fortified-walls": {
        "name": "Fortified Walls",
        "description": "Reinforced walls with towers and murder holes.",
        "effect": "+1 Army AC, +2 Effective Level",
        "notes": "T3 Fortification structure"
    },
    "grand-battlements": {
        "name": "Grand Battlements",
        "description": "Massive fortifications with multiple defensive layers.",
        "effect": "+2 Army AC, +3 Effective Level; Defenders recover each turn with food",
        "notes": "T4 Fortification structure"
    },
    
    # Logistics
    "barracks": {
        "name": "Barracks",
        "description": "Basic military housing for soldiers.",
        "effect": "+1 army capacity",
        "notes": "T1 Logistics structure"
    },
    "garrison": {
        "name": "Garrison",
        "description": "Fortified military quarters with training facilities.",
        "effect": "+2 army capacity",
        "notes": "T2 Logistics structure"
    },
    "fortress": {
        "name": "Fortress",
        "description": "A major military installation supporting multiple units.",
        "effect": "+3 army capacity",
        "notes": "T3 Logistics structure"
    },
    "citadel": {
        "name": "Citadel",
        "description": "A massive fortified complex serving as a military headquarters.",
        "effect": "+4 army capacity; -1 Unrest per turn",
        "notes": "T4 Logistics structure"
    },
    
    # Commerce
    "market-square": {
        "name": "Market Square",
        "description": "An open area where merchants sell goods and resources.",
        "effect": "Enables resource trading (2:1); Purchase non-magical items",
        "notes": "T1 Commerce structure"
    },
    "bazaar": {
        "name": "Bazaar",
        "description": "A covered market with exotic goods and magical items.",
        "effect": "Purchase scrolls and consumables",
        "notes": "T2 Commerce structure"
    },
    "merchant-guild": {
        "name": "Merchant Guild",
        "description": "A powerful trade organization controlling commerce.",
        "effect": "Better trade rates (3:2); Purchase magic items; +1 gold/turn",
        "notes": "T3 Commerce structure"
    },
    "imperial-bank": {
        "name": "Imperial Bank",
        "description": "The kingdom's central financial institution.",
        "effect": "Best trade rates (1:1); +2 gold/turn",
        "notes": "T4 Commerce structure"
    },
    
    # Culture
    "open-stage": {
        "name": "Open Stage",
        "description": "A simple platform for public performances.",
        "effect": "+1 to reduce Unrest checks",
        "notes": "T1 Culture structure"
    },
    "amphitheater": {
        "name": "Amphitheater",
        "description": "An outdoor venue for theatrical performances.",
        "effect": "+2 to reduce Unrest checks",
        "notes": "T2 Culture structure"
    },
    "playhouse": {
        "name": "Playhouse",
        "description": "An enclosed theater with regular productions.",
        "effect": "+2 to reduce Unrest checks",
        "notes": "T3 Culture structure"
    },
    "auditorium": {
        "name": "Auditorium",
        "description": "A grand cultural center hosting major events.",
        "effect": "+1 Fame/turn; +2 to reduce Unrest checks; -1 Unrest/turn",
        "notes": "T4 Culture structure"
    },
    
    # Revenue
    "tax-office": {
        "name": "Tax Office",
        "description": "A basic facility for collecting taxes.",
        "effect": "+1 gold per turn",
        "notes": "T1 Revenue structure (only one taxation structure allowed)"
    },
    "counting-house": {
        "name": "Counting House",
        "description": "An expanded financial office with bookkeepers.",
        "effect": "+2 gold per turn; Enables Personal Income action",
        "notes": "T2 Revenue structure (only one taxation structure allowed)"
    },
    "treasury": {
        "name": "Treasury",
        "description": "A secure vault with professional administrators.",
        "effect": "+4 gold per turn; Personal Income (T3)",
        "notes": "T3 Revenue structure (only one taxation structure allowed)"
    },
    "exchequer": {
        "name": "Exchequer",
        "description": "The kingdom's central financial authority.",
        "effect": "+8 gold per turn; Personal Income (T4)",
        "notes": "T4 Revenue structure (only one taxation structure allowed)"
    },
    
    # Justice
    "stocks": {
        "name": "Stocks",
        "description": "Public restraints for punishing minor criminals.",
        "effect": "Hold 1 imprisoned Unrest; Execute only",
        "notes": "T1 Justice structure"
    },
    "jail": {
        "name": "Jail",
        "description": "A small prison for holding criminals.",
        "effect": "Hold 2 imprisoned Unrest; Execute only",
        "notes": "T2 Justice structure"
    },
    "prison": {
        "name": "Prison",
        "description": "A secure facility with cells and guards.",
        "effect": "Hold 4 imprisoned Unrest; Execute or Pardon",
        "notes": "T3 Justice structure"
    },
    "donjon": {
        "name": "Donjon",
        "description": "A massive fortified prison complex.",
        "effect": "Hold 8 imprisoned Unrest; Execute or Pardon; Convert 1 Unrest/turn",
        "notes": "T4 Justice structure"
    },
    
    # Diplomacy
    "envoys-office": {
        "name": "Envoy's Office",
        "description": "A small office for diplomatic correspondence.",
        "effect": "+1 Diplomatic capacity; Enables diplomacy",
        "notes": "T1 Diplomacy structure"
    },
    "embassy": {
        "name": "Embassy",
        "description": "A dedicated building for foreign relations.",
        "effect": "+2 Diplomatic capacity",
        "notes": "T2 Diplomacy structure"
    },
    "grand-embassy": {
        "name": "Grand Embassy",
        "description": "An impressive diplomatic complex.",
        "effect": "+3 Diplomatic capacity; +1 Fame",
        "notes": "T3 Diplomacy structure"
    },
    "diplomatic-quarter-support": {
        "name": "Diplomatic Quarter",
        "description": "An entire district dedicated to international relations.",
        "effect": "+4 Diplomatic capacity; +1 Fame; -1 Unrest/turn",
        "notes": "T4 Diplomacy structure"
    }
}

def add_all_translations():
    """Add translations for all structures to the language file."""
    # Initialize the LanguageManager
    manager = LanguageManager()
    
    print("Adding translations for all structures...")
    translation_count = 0
    
    for structure_id, data in STRUCTURES.items():
        base_key = f"pf2e-kingdom-lite.structures.{structure_id}"
        
        # Add each translation
        manager.set_key(f"{base_key}.name", data["name"])
        manager.set_key(f"{base_key}.description", data["description"])
        manager.set_key(f"{base_key}.effect", data["effect"])
        manager.set_key(f"{base_key}.notes", data["notes"])
        
        translation_count += 4
        print(f"  Added: {structure_id}")
    
    # Export all changes at once
    manager.export()
    print(f"\n✅ Successfully added translations for {len(STRUCTURES)} structures")
    print(f"📊 Total translation keys added: {translation_count}")
    print("Language file has been updated successfully")

if __name__ == "__main__":
    add_all_translations()
