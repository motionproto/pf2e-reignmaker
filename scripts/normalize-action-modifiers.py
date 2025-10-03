#!/usr/bin/env python3
"""
Normalize player action modifiers to use EventModifier format.

Converts from:
  "modifiers": { "unrest": -1, "gold": 2 }

To:
  "modifiers": [
    { "name": "...", "resource": "unrest", "value": -1, "duration": "immediate" }
  ]
"""

import json
from pathlib import Path
from typing import Dict, List, Any

# Standard resources that map to EventModifier.resource
STANDARD_RESOURCES = {
    'gold', 'food', 'ore', 'stone', 'lumber', 'luxuries', 'unrest', 'fame'
}

# Special modifiers that need custom handling (stored in description or meta fields)
SPECIAL_MODIFIERS = {
    'eventResolved', 'eventBonus', 'worksiteLevel', 'resources',
    'hexesClaimed', 'structuresBuilt', 'roadsBuilt', 'armyRecruited',
    'structureCostReduction', 'imprisonedUnrest', 'imprisonedUnrestRemoved',
    'settlementFounded', 'armyLevel', 'meta', 'aidBonus', 'rerollOnFailure'
}

def convert_modifiers(old_modifiers: Any, action_name: str) -> List[Dict[str, Any]]:
    """Convert old modifier format to EventModifier array."""
    if old_modifiers is None:
        return []
    
    # If already an array, return as-is (already converted)
    if isinstance(old_modifiers, list):
        return old_modifiers
    
    # If not a dict, return empty array
    if not isinstance(old_modifiers, dict):
        return []
    
    new_modifiers = []
    
    for key, value in old_modifiers.items():
        # Handle meta objects (like aid-another)
        if key == 'meta' and isinstance(value, dict):
            # For now, skip meta modifiers - they need special handling
            # These are game-mechanical effects, not resource changes
            continue
        
        # Handle standard resources
        if key in STANDARD_RESOURCES:
            new_modifiers.append({
                "name": action_name,
                "resource": key,
                "value": value,
                "duration": "immediate"
            })
        # Skip special modifiers - they're encoded in the description
        elif key in SPECIAL_MODIFIERS:
            # These are handled by action-execution.ts parsing logic
            continue
    
    return new_modifiers

def normalize_action_file(filepath: Path) -> None:
    """Normalize a single action JSON file."""
    print(f"Processing: {filepath.name}")
    
    with open(filepath, 'r') as f:
        data = json.load(f)
    
    action_name = data.get('name', 'Action Effect')
    modified = False
    
    # Process effects
    if 'effects' in data:
        for outcome in ['criticalSuccess', 'success', 'failure', 'criticalFailure']:
            if outcome in data['effects']:
                effect = data['effects'][outcome]
                if 'modifiers' in effect:
                    old_modifiers = effect['modifiers']
                    new_modifiers = convert_modifiers(old_modifiers, action_name)
                    
                    # Only update if changed
                    if old_modifiers != new_modifiers:
                        effect['modifiers'] = new_modifiers
                        modified = True
                else:
                    # Add empty modifiers array if missing
                    effect['modifiers'] = []
                    modified = True
    
    # Write back if modified
    if modified:
        with open(filepath, 'w') as f:
            json.dump(data, f, indent=2)
        print(f"  ✓ Updated: {filepath.name}")
    else:
        print(f"  - No changes: {filepath.name}")

def main():
    """Process all action files."""
    actions_dir = Path(__file__).parent.parent / "data" / "player-actions"
    
    print("=" * 60)
    print("NORMALIZING PLAYER ACTION MODIFIERS")
    print("=" * 60)
    print()
    
    # Get all JSON files (excluding utilities folder)
    action_files = [
        f for f in actions_dir.glob("*.json")
        if f.is_file()
    ]
    
    print(f"Found {len(action_files)} action files to process\n")
    
    for filepath in sorted(action_files):
        normalize_action_file(filepath)
    
    print()
    print("=" * 60)
    print("NORMALIZATION COMPLETE")
    print("=" * 60)
    print(f"Processed {len(action_files)} files")
    print("\nNote: Meta/special modifiers (like eventBonus, aidBonus) are")
    print("handled by description text and action-execution.ts parsing.")

if __name__ == "__main__":
    main()
