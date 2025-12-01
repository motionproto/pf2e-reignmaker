#!/usr/bin/env python3
"""
Combine individual JSON files for factions (and optionally structures)
into their respective monolithic dist/ files.

NOTE: Events, incidents, and player actions are now fully defined in TypeScript
pipeline files (src/pipelines/). The JSON files in archived-implementations/data-json/
are kept for historical reference only.
"""

import json
from pathlib import Path

def combine_factions():
    """Combine all faction JSON files into src/data-compiled/factions.json."""
    factions_dir = Path(__file__).parent.parent / "data" / "factions"
    output_file = Path(__file__).parent.parent / "src" / "data-compiled" / "factions.json"
    
    all_factions = []
    faction_files = sorted(factions_dir.glob("*.json"))
    
    print("\n🤝 Processing Factions...")
    print(f"Reading faction files from: {factions_dir}")
    
    for json_file in faction_files:
        # Skip combined files
        if json_file.name in ["factions.json", "all_factions.json"]:
            continue
            
        try:
            with open(json_file, 'r') as f:
                faction_data = json.load(f)
                # If it's a single faction object, wrap in array
                if isinstance(faction_data, dict):
                    all_factions.append(faction_data)
                # If it's already an array, extend
                elif isinstance(faction_data, list):
                    all_factions.extend(faction_data)
                print(f"  ✓ Loaded: {json_file.name}")
        except Exception as e:
            print(f"  ✗ Error loading {json_file.name}: {e}")
    
    # Sort factions by id for consistency
    all_factions.sort(key=lambda x: x.get('id', ''))
    
    # Write combined file
    output_file.parent.mkdir(exist_ok=True)
    with open(output_file, 'w') as f:
        json.dump(all_factions, f, indent=4)
    
    print(f"✅ Successfully combined {len(all_factions)} factions")
    print(f"📁 Output written to: {output_file}")
    
    return all_factions

def main():
    """Run all combination processes."""
    print("=" * 60)
    print("COMBINING KINGDOM DATA FILES")
    print("=" * 60)
    
    # Process factions (still needed as JSON)
    factions = combine_factions()
    
    # Final summary
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    print(f"✅ Factions: {len(factions)} files combined")
    print("\nNOTE: Events, incidents, and player actions are now defined in TypeScript")
    print("      pipeline files (src/pipelines/). JSON compilation is no longer needed.")
    
    # Also update structures if the script exists
    structures_script = Path(__file__).parent / "combine-structures.py"
    if structures_script.exists():
        print("\n" + "=" * 60)
        print("UPDATING STRUCTURES")
        print("=" * 60)
        import subprocess
        result = subprocess.run(
            ["python3", str(structures_script)],
            capture_output=True,
            text=True
        )
        if result.returncode == 0:
            print("✅ Structures also updated successfully")
        else:
            print(f"⚠️  Error updating structures: {result.stderr}")

if __name__ == "__main__":
    main()
