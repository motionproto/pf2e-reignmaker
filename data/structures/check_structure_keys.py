#!/usr/bin/env python3
"""
Check structure translation keys in the language file.
"""

import sys
from pathlib import Path
from collections import defaultdict

# Add langtools to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "lang" / "langtools"))
from lang_manager import LanguageManager

def check_structure_keys():
    """Analyze structure translation keys."""
    manager = LanguageManager()
    
    # Get all structure keys
    structures = manager.search_keys("pf2e-reignmaker.structures")
    
    print(f"Total structure translation keys found: {len(structures)}")
    print(f"Expected: 272 (68 structures × 4 keys each)")
    print()
    
    # Group keys by structure ID
    structure_data = defaultdict(list)
    
    for key in structures:
        parts = key.split(".")
        if len(parts) >= 4:
            structure_id = parts[2]
            property_name = parts[3]
            structure_data[structure_id].append(property_name)
    
    print(f"Found {len(structure_data)} unique structure IDs")
    print()
    
    # Check for structures with unusual number of properties
    print("Checking property counts:")
    unusual = []
    for structure_id, properties in structure_data.items():
        if len(properties) != 4:
            unusual.append((structure_id, len(properties)))
    
    if unusual:
        print(f"  Structures with != 4 properties:")
        for sid, count in unusual[:10]:
            print(f"    {sid}: {count} properties")
        if len(unusual) > 10:
            print(f"    ... and {len(unusual) - 10} more")
    else:
        print("  All structures have exactly 4 properties ✓")
    
    # List some structure IDs to verify they're correct
    print("\nFirst 10 structure IDs:")
    for i, sid in enumerate(sorted(structure_data.keys())[:10], 1):
        print(f"  {i}. {sid}")
    
    # Check for old structure names that might still be present
    old_structure_names = ["academy", "alchemy-laboratory", "arcanist-tower", "arena", 
                          "bank", "brewery", "castle", "cathedral"]
    
    print("\nChecking for old structure names:")
    found_old = [sid for sid in structure_data.keys() if sid in old_structure_names]
    if found_old:
        print(f"  Found {len(found_old)} old structures still present:")
        for old in found_old[:5]:
            print(f"    - {old}")
    else:
        print("  No old structure names found ✓")
    
    # Count the actual new structures
    new_structure_count = 0
    expected_new = [
        "rats-warren", "smugglers-den", "thieves-guild", "shadow-network",
        "town-hall", "city-hall", "diplomatic-quarter", "grand-forum",
        "gymnasium", "training-yard", "warriors-hall", "military-academy",
        "workshop", "artisans-hall", "blacksmiths-guild", "masterworks-foundry",
        "scholars-table", "library", "university", "arcane-academy",
        "shrine", "temple", "temple-district", "grand-basilica",
        "healers-hut", "infirmary", "hospital", "medical-college",
        "buskers-alley", "famous-tavern", "performance-hall", "grand-amphitheater",
        "hunters-lodge", "rangers-outpost", "druids-grove", "wildskeepers-enclave",
        "granary", "storehouses", "warehouses", "strategic-reserves",
        "wooden-palisade", "stone-walls", "fortified-walls", "grand-battlements",
        "barracks", "garrison", "fortress", "citadel",
        "market-square", "bazaar", "merchant-guild", "imperial-bank",
        "open-stage", "amphitheater", "playhouse", "auditorium",
        "tax-office", "counting-house", "treasury", "exchequer",
        "stocks", "jail", "prison", "donjon",
        "envoys-office", "embassy", "grand-embassy", "diplomatic-quarter-support"
    ]
    
    for sid in expected_new:
        if sid in structure_data:
            new_structure_count += 1
    
    print(f"\nNew structures present: {new_structure_count}/68")
    
    # Final summary
    print("\n" + "="*50)
    if len(structures) == 272 and new_structure_count == 68:
        print("✅ Structure translations are CORRECT!")
    else:
        print("❌ Structure translations need attention:")
        print(f"   - Total keys: {len(structures)} (should be 272)")
        print(f"   - New structures: {new_structure_count} (should be 68)")

if __name__ == "__main__":
    check_structure_keys()
