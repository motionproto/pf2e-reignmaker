#!/usr/bin/env python3
"""
Combine all individual structure JSON files into a single dist/structures.json file.
This ensures the monolithic file accurately reflects the individual files' content.
"""

import json
import sys
from pathlib import Path

# Set UTF-8 encoding for stdout to handle Unicode characters
if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

def derive_category_from_family(family: str) -> str:
    """Convert family name to kebab-case category."""
    # Convert "Hospitality" -> "hospitality", "Crime & Intrigue" -> "crime-intrigue"
    category = family.lower()
    category = category.replace(' & ', '-')
    category = category.replace(' ', '-')
    return category

def combine_structures():
    """Read all individual structure JSON files and combine them into one, preserving hierarchical structure."""
    
    # Paths
    structures_dir = Path(__file__).parent.parent / "data" / "structures"  # data/structures/
    project_root = Path(__file__).parent.parent  # project root
    data_compiled_dir = project_root / "src" / "data-compiled"
    output_file = data_compiled_dir / "structures.json"
    
    # Ensure src/data-compiled directory exists
    data_compiled_dir.mkdir(parents=True, exist_ok=True)
    
    # Collect all structure families
    families = []
    structure_files = sorted(structures_dir.glob("*.json"))
    
    print(f"Reading structure files from: {structures_dir}")
    print(f"Found {len(structure_files)} JSON files")
    
    for json_file in structure_files:
        # Skip any combined files if they exist in this directory
        if json_file.name in ["structures.json", "all_structures.json"]:
            continue
            
        try:
            with open(json_file, 'r') as f:
                data = json.load(f)
                
                # Derive category from family field in JSON content
                family = data.get('family', '')
                if family:
                    category = derive_category_from_family(family)
                else:
                    # Fallback to filename if no family field
                    print(f"  [WARN] Warning: {json_file.name} has no 'family' field, using filename")
                    name = json_file.name.replace('.json', '')
                    if name.startswith('skill-'):
                        category = name.replace('skill-', '')
                    elif name.startswith('support-'):
                        category = name.replace('support-', '')
                    else:
                        category = name
                
                # Add category to family data
                data['category'] = category
                
                # Add this family to the output
                families.append(data)
                
                tier_count = len(data.get('tiers', []))
                print(f"  [OK] Loaded family: {json_file.name} ({tier_count} tiers)")
                
        except Exception as e:
            print(f"  [ERROR] Error loading {json_file.name}: {e}")
    
    # Sort families by type and category
    families.sort(key=lambda x: (x.get('type', ''), x.get('category', '')))
    
    # Create the structures object with families array
    structures_output = {
        "families": families
    }
    
    # Write combined file
    with open(output_file, 'w') as f:
        json.dump(structures_output, f, indent=4)
    
    print(f"\n[SUCCESS] Successfully combined {len(families)} structure families")
    print(f"[OUTPUT] Output written to: {output_file}")
    
    # Calculate statistics
    total_structures = sum(len(family.get('tiers', [])) for family in families)
    
    # Summary by type
    type_counts = {}
    for family in families:
        family_type = family.get('type', 'unknown')
        tier_count = len(family.get('tiers', []))
        type_counts[family_type] = type_counts.get(family_type, 0) + tier_count
    
    print(f"\nTotal structures: {total_structures}")
    print("\nStructures by type:")
    for s_type in sorted(type_counts.keys()):
        print(f"  {s_type}: {type_counts[s_type]} structures")
    
    # Summary by category
    print("\nFamilies by category:")
    for family in families:
        category = family.get('category', 'uncategorized')
        tier_count = len(family.get('tiers', []))
        print(f"  {category}: {tier_count} structures")
    
    return families

if __name__ == "__main__":
    combine_structures()
