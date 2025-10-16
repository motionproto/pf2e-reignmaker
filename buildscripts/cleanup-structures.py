#!/usr/bin/env python3
"""
Cleanup script to remove redundant properties from structure tier definitions.
Removes: type, category, tier, earnIncomeLevel, special, traits, upgradeFrom
"""

import json
import os
from pathlib import Path

# Properties to remove from each tier
PROPERTIES_TO_REMOVE = [
    "type",
    "category", 
    "tier",
    "earnIncomeLevel",
    "special",
    "traits",
    "upgradeFrom"
]

def cleanup_structure_file(filepath):
    """Remove redundant properties from a structure file."""
    print(f"Processing {filepath.name}...")
    
    with open(filepath, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    # Check if this file has tiers
    if 'tiers' not in data:
        print(f"  ⚠️  No 'tiers' found in {filepath.name}, skipping")
        return 0
    
    changes_count = 0
    
    # Process each tier
    for tier in data['tiers']:
        for prop in PROPERTIES_TO_REMOVE:
            if prop in tier:
                del tier[prop]
                changes_count += 1
    
    # Write back the cleaned data
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write('\n')  # Add trailing newline
    
    print(f"  ✅ Removed {changes_count} properties")
    return changes_count

def main():
    """Process all structure files in data/structures/"""
    structures_dir = Path(__file__).parent.parent / "data" / "structures"
    
    if not structures_dir.exists():
        print(f"❌ Directory not found: {structures_dir}")
        return
    
    print(f"🔍 Scanning {structures_dir}\n")
    
    # Get all JSON files
    json_files = sorted(structures_dir.glob("*.json"))
    
    if not json_files:
        print("❌ No JSON files found")
        return
    
    total_changes = 0
    total_files = 0
    
    for filepath in json_files:
        changes = cleanup_structure_file(filepath)
        total_changes += changes
        total_files += 1
    
    print(f"\n✨ Complete! Processed {total_files} files, removed {total_changes} properties total")

if __name__ == "__main__":
    main()
