#!/usr/bin/env python3
"""
Clean old structure translations from the language file.

This script removes old PF2e structure translations while keeping the new
Reignmaker Lite structure translations.
"""

import sys
from pathlib import Path

# Add langtools to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "lang" / "langtools"))
from lang_manager import LanguageManager

# List of OLD structures to remove (original PF2e structures)
OLD_STRUCTURES = [
    "academy", "alchemy-laboratory", "arcanist-tower", "arena",
    "bank", "bank-vk", "brewery", "bridge", "bridge-stone",
    "castle", "castle-vk", "cathedral", "cemetery",
    "construction-yard", "construction-yard-vk", "dump",
    "festival-hall", "festival-hall-vk", "fishing-fleets-vk",
    "foundry", "garrison-vk", "general-store", "gladiatorial-arena",
    "granary-vk", "guildhall", "herbalist", "houses",
    "illicit-market", "inn", "inn-vk", "keep",
    "library-vk", "lumberyard", "luxury-store",
    "magic-shop", "magic-shop-vk", "magical-streetlamps",
    "mansion", "marketplace", "menagerie", "mill", "mint",
    "monument", "monument-vk", "museum", "noble-villa",
    "occult-shop", "occult-shop-vk", "opera-house", "orphanage",
    "palace", "palace-vk", "park", "paved-streets",
    "pier", "pier-vk", "printing-house", "rubble",
    "sacred-grove", "secure-warehouse", "sewer-system",
    "smithy", "smithy-vk", "specialized-artisan", "stable",
    "stockyard", "stonemason", "tannery",
    "tavern-dive", "tavern-dive-vk", "tavern-luxury", "tavern-luxury-vk",
    "tavern-popular", "tavern-popular-vk", "tavern-world-class", "tavern-world-class-vk",
    "tenement", "theater", "thieves-guild-old",  # Note: thieves-guild is in new structures
    "town-hall-vk", "trade-shop",
    "wall-stone", "wall-wooden", "watchtower", "watchtower-stone",
    "waterfront", "waterfront-vk"
]

# List of NEW structures to keep (Reignmaker Lite structures)
NEW_STRUCTURES = [
    # Crime & Intrigue
    "rats-warren", "smugglers-den", "thieves-guild", "shadow-network",
    # Civic & Governance
    "town-hall", "city-hall", "diplomatic-quarter", "grand-forum",
    # Military & Training
    "gymnasium", "training-yard", "warriors-hall", "military-academy",
    # Crafting & Trade
    "workshop", "artisans-hall", "blacksmiths-guild", "masterworks-foundry",
    # Knowledge & Magic
    "scholars-table", "library", "university", "arcane-academy",
    # Faith & Nature
    "shrine", "temple", "temple-district", "grand-basilica",
    # Medicine & Healing
    "healers-hut", "infirmary", "hospital", "medical-college",
    # Performance & Culture
    "buskers-alley", "famous-tavern", "performance-hall", "grand-amphitheater",
    # Exploration & Wilderness
    "hunters-lodge", "rangers-outpost", "druids-grove", "wildskeepers-enclave",
    # Food Storage
    "granary", "storehouses", "warehouses", "strategic-reserves",
    # Fortifications
    "wooden-palisade", "stone-walls", "fortified-walls", "grand-battlements",
    # Logistics
    "barracks", "garrison", "fortress", "citadel",
    # Commerce
    "market-square", "bazaar", "merchant-guild", "imperial-bank",
    # Culture
    "open-stage", "amphitheater", "playhouse", "auditorium",
    # Revenue
    "tax-office", "counting-house", "treasury", "exchequer",
    # Justice
    "stocks", "jail", "prison", "donjon",
    # Diplomacy
    "envoys-office", "embassy", "grand-embassy", "diplomatic-quarter-support"
]

def clean_old_structure_translations():
    """Remove old structure translations while keeping new ones."""
    # Initialize the LanguageManager
    manager = LanguageManager()
    
    print("Cleaning old structure translations...")
    
    # Get all structure keys
    all_structure_keys = manager.search_keys("pf2e-kingdom-lite.structures")
    
    # Track what we're doing
    keys_to_delete = []
    keys_to_keep = []
    
    for key in all_structure_keys:
        # Extract the structure ID from the key
        # Format: pf2e-kingdom-lite.structures.{structure-id}.{property}
        parts = key.split(".")
        if len(parts) >= 3:
            structure_id = parts[2]
            
            # Check if this is an old structure
            if structure_id in OLD_STRUCTURES:
                keys_to_delete.append(key)
            # Check if this is a new structure
            elif structure_id in NEW_STRUCTURES:
                keys_to_keep.append(key)
            # Handle special cases (like the base "structures" key)
            elif structure_id == "structures" and len(parts) == 2:
                # This is just "pf2e-kingdom-lite.structures" - keep it if it exists
                keys_to_keep.append(key)
            else:
                # Unknown structure - let's check if it contains old structure names
                is_old = any(old in structure_id for old in OLD_STRUCTURES)
                is_new = any(new in structure_id for new in NEW_STRUCTURES)
                
                if is_old and not is_new:
                    keys_to_delete.append(key)
                elif is_new and not is_old:
                    keys_to_keep.append(key)
                else:
                    print(f"  Unknown structure key: {key}")
    
    print(f"\nAnalysis complete:")
    print(f"  Keys to delete (old): {len(keys_to_delete)}")
    print(f"  Keys to keep (new): {len(keys_to_keep)}")
    
    if keys_to_delete:
        print(f"\nDeleting {len(keys_to_delete)} old structure keys...")
        for key in keys_to_delete:
            manager.delete_key(key)
        
        # Export changes
        manager.export()
        print(f"✅ Successfully cleaned {len(keys_to_delete)} old structure translation keys")
    else:
        print("No old structure keys found to delete")
    
    print(f"✅ Kept {len(keys_to_keep)} new structure translation keys")
    print("\nLanguage file has been cleaned successfully")
    
    # Final verification
    manager_verify = LanguageManager()
    remaining_structures = manager_verify.search_keys("pf2e-kingdom-lite.structures")
    print(f"\nFinal count: {len(remaining_structures)} structure translation keys")

if __name__ == "__main__":
    clean_old_structure_translations()
