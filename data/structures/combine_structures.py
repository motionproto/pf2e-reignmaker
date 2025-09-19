#!/usr/bin/env python3
"""
Combine all individual structure JSON files into a single dist/structures.json file.
This ensures the monolithic file accurately reflects the individual files' content.
"""

import json
from pathlib import Path

def combine_structures():
    """Read all individual structure JSON files and combine them into one."""
    
    # Paths
    structures_dir = Path(__file__).parent  # data/structures/
    project_root = structures_dir.parent.parent  # project root
    dist_dir = project_root / "dist"
    output_file = dist_dir / "structures.json"
    
    # Ensure dist directory exists
    dist_dir.mkdir(exist_ok=True)
    
    # Collect all structure data
    all_structures = []
    structure_files = sorted(structures_dir.glob("*.json"))
    
    print(f"Reading structure files from: {structures_dir}")
    print(f"Found {len(structure_files)} JSON files")
    
    for json_file in structure_files:
        # Skip any combined files if they exist in this directory
        if json_file.name in ["structures.json", "all_structures.json"]:
            continue
            
        try:
            with open(json_file, 'r') as f:
                structure_data = json.load(f)
                all_structures.append(structure_data)
                print(f"  ✓ Loaded: {json_file.name}")
        except Exception as e:
            print(f"  ✗ Error loading {json_file.name}: {e}")
    
    # Sort structures by category and then by tier and id for consistency
    # This groups structures by their functional category (e.g., commerce, justice, military-training, etc.)
    all_structures.sort(key=lambda x: (x.get('category', ''), x.get('tier', 0), x.get('id', '')))
    
    # Write combined file
    with open(output_file, 'w') as f:
        json.dump(all_structures, f, indent=4)
    
    print(f"\n✅ Successfully combined {len(all_structures)} structures")
    print(f"📁 Output written to: {output_file}")
    
    # Summary by tier
    tier_counts = {}
    for structure in all_structures:
        tier = structure.get('tier', 0)
        tier_counts[tier] = tier_counts.get(tier, 0) + 1
    
    print("\nStructures by tier:")
    for tier in sorted(tier_counts.keys()):
        print(f"  Tier {tier}: {tier_counts[tier]} structures")
    
    # Summary by type
    type_counts = {}
    for structure in all_structures:
        s_type = structure.get('type', 'unknown')
        type_counts[s_type] = type_counts.get(s_type, 0) + 1
    
    print("\nStructures by type:")
    for s_type in sorted(type_counts.keys()):
        print(f"  {s_type}: {type_counts[s_type]} structures")
    
    # Summary by category
    category_counts = {}
    for structure in all_structures:
        category = structure.get('category', 'uncategorized')
        category_counts[category] = category_counts.get(category, 0) + 1
    
    print("\nStructures by category:")
    for category in sorted(category_counts.keys()):
        print(f"  {category}: {category_counts[category]} structures")
    
    return all_structures

if __name__ == "__main__":
    combine_structures()
