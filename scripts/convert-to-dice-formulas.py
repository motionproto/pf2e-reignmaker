#!/usr/bin/env python3
"""
Convert event/incident JSON files to use direct dice formulas in modifier values.

This script:
1. Reads event/incident JSON files
2. Identifies hardcoded values that should be dice formulas (based on patterns)
3. Adds {resourceName} placeholders to messages
4. Ensures all modifiers have proper duration fields
5. Converts to the new simplified format

Usage:
    python scripts/convert-to-dice-formulas.py [--dry-run] [--file PATH]
"""

import json
import re
import os
import argparse
from pathlib import Path
from typing import Dict, Any, List, Optional

# Common dice formula patterns based on typical values
DICE_MAPPINGS = {
    # Common gold/resource losses
    2: "1d4",      # avg 2.5 → 1d4
    3: "1d4+1",    # avg 3.5 → 1d4+1
    4: "1d6+1",    # avg 4.5 → 1d6+1
    5: "2d4",      # avg 5 → 2d4
    6: "2d4",      # avg 5 → 2d4 (close enough)
    7: "2d6",      # avg 7 → 2d6
    8: "2d6+1",    # avg 8 → 2d6+1
    
    # Negative values
    -2: "-1d4",
    -3: "-1d4+1",
    -4: "-1d6+1",
    -5: "-2d4",
    -6: "-2d4",
    -7: "-2d6",
    -8: "-2d6+1",
}

# Resources that should likely use dice formulas for variety
RANDOMIZABLE_RESOURCES = {'gold', 'resources', 'lumber', 'ore', 'stone', 'food'}

# Resources that should usually stay static
STATIC_RESOURCES = {'unrest', 'fame'}

def should_randomize(resource: str, value: int) -> bool:
    """Determine if a value should be converted to a dice formula."""
    # Don't randomize +1 or -1 (too small)
    if abs(value) == 1:
        return False
    
    # Don't randomize static resources
    if resource in STATIC_RESOURCES:
        return False
    
    # Randomize resources that benefit from variety
    if resource in RANDOMIZABLE_RESOURCES and abs(value) >= 2:
        return True
    
    return False

def value_to_dice(value: int) -> str:
    """Convert a numeric value to a dice formula."""
    return DICE_MAPPINGS.get(value, str(value))

def add_placeholders_to_message(msg: str, modifiers: List[Dict[str, Any]]) -> str:
    """Add {resourceName} placeholders to a message string."""
    if not modifiers:
        return msg
    
    # Build a set of resources mentioned in modifiers
    resources = {m['resource'] for m in modifiers if 'resource' in m}
    
    # For each resource, try to add placeholder if value varies
    # This is a heuristic - we look for resource names in the message
    result = msg
    for resource in resources:
        # Check if resource is mentioned in message
        pattern = re.compile(rf'\b{resource}\b', re.IGNORECASE)
        if pattern.search(msg):
            # Check if there's already a placeholder
            if f'{{{resource}}}' not in msg:
                # Look for number patterns before the resource name
                # e.g., "Lose 6 gold" → "Lose {gold} gold"
                result = re.sub(
                    rf'\b(\d+)\s+{resource}\b',
                    rf'{{{resource}}} {resource}',
                    result,
                    flags=re.IGNORECASE
                )
    
    return result

def convert_modifier(modifier: Dict[str, Any], auto_randomize: bool = True) -> Dict[str, Any]:
    """Convert a single modifier to the new format."""
    result = modifier.copy()
    
    # Ensure duration field exists
    if 'duration' not in result:
        result['duration'] = 'immediate'
    
    # Convert value if appropriate
    if auto_randomize and 'resource' in result and isinstance(result.get('value'), int):
        value = result['value']
        resource = result['resource']
        
        if should_randomize(resource, value):
            result['value'] = value_to_dice(value)
            print(f"  🎲 Converted {resource}: {value} → {result['value']}")
    
    return result

def convert_outcome(outcome: Dict[str, Any], auto_randomize: bool = True) -> Dict[str, Any]:
    """Convert a single outcome to the new format."""
    if not outcome:
        return outcome
    
    result = {}
    
    # Copy message
    if 'msg' in outcome:
        result['msg'] = outcome['msg']
    
    # Convert modifiers
    if 'modifiers' in outcome:
        result['modifiers'] = [
            convert_modifier(m, auto_randomize) 
            for m in outcome['modifiers']
        ]
        
        # Add placeholders to message if we converted any values
        if result['modifiers'] and 'msg' in result:
            result['msg'] = add_placeholders_to_message(result['msg'], result['modifiers'])
    
    # Handle choices
    if 'choices' in outcome:
        result['choices'] = []
        for choice in outcome['choices']:
            new_choice = {'label': choice.get('label', '')}
            if 'modifiers' in choice:
                new_choice['modifiers'] = [
                    convert_modifier(m, auto_randomize)
                    for m in choice['modifiers']
                ]
                # Add placeholders to choice label
                new_choice['label'] = add_placeholders_to_message(
                    new_choice['label'],
                    new_choice['modifiers']
                )
            result['choices'].append(new_choice)
    
    # Copy other fields
    if 'endsEvent' in outcome:
        result['endsEvent'] = outcome['endsEvent']
    
    return result

def convert_file(file_path: Path, auto_randomize: bool = True, dry_run: bool = False) -> bool:
    """Convert a single JSON file to the new format."""
    print(f"\n📄 Processing: {file_path.name}")
    
    try:
        with open(file_path, 'r') as f:
            data = json.load(f)
        
        # Track if we made any changes
        changed = False
        
        # Convert effects
        if 'effects' in data:
            new_effects = {}
            for outcome_name, outcome_data in data['effects'].items():
                new_outcome = convert_outcome(outcome_data, auto_randomize)
                new_effects[outcome_name] = new_outcome
                
                # Check if this outcome changed
                if json.dumps(outcome_data, sort_keys=True) != json.dumps(new_outcome, sort_keys=True):
                    changed = True
                    print(f"  ✏️  Updated {outcome_name}")
            
            data['effects'] = new_effects
        
        # Write back if changed and not dry-run
        if changed and not dry_run:
            with open(file_path, 'w') as f:
                json.dump(data, f, indent=2)
            print(f"  ✅ Saved changes")
        elif changed and dry_run:
            print(f"  🔍 Would save changes (dry-run)")
        else:
            print(f"  ⏭️  No changes needed")
        
        return changed
        
    except Exception as e:
        print(f"  ❌ Error: {e}")
        return False

def main():
    parser = argparse.ArgumentParser(description='Convert event/incident files to new dice formula format')
    parser.add_argument('--dry-run', action='store_true', help='Show what would be changed without modifying files')
    parser.add_argument('--file', type=str, help='Convert a specific file instead of all files')
    parser.add_argument('--no-auto-randomize', action='store_true', help='Do not automatically convert values to dice formulas')
    parser.add_argument('--dir', type=str, help='Convert all files in a specific directory')
    
    args = parser.parse_args()
    
    auto_randomize = not args.no_auto_randomize
    
    print("🎲 Event/Incident Dice Formula Converter")
    print("=" * 50)
    
    if args.dry_run:
        print("🔍 DRY RUN MODE - No files will be modified\n")
    
    files_to_process = []
    
    if args.file:
        # Process single file
        files_to_process = [Path(args.file)]
    elif args.dir:
        # Process directory
        dir_path = Path(args.dir)
        files_to_process = list(dir_path.glob('**/*.json'))
    else:
        # Process all standard directories
        base_dirs = [
            Path('data/events'),
            Path('data/incidents/minor'),
            Path('data/incidents/moderate'),
            Path('data/incidents/major'),
            Path('data/player-actions'),
        ]
        
        for base_dir in base_dirs:
            if base_dir.exists():
                files_to_process.extend(base_dir.glob('*.json'))
    
    total_files = len(files_to_process)
    changed_files = 0
    
    print(f"📋 Found {total_files} files to process\n")
    
    for file_path in sorted(files_to_process):
        if convert_file(file_path, auto_randomize, args.dry_run):
            changed_files += 1
    
    print("\n" + "=" * 50)
    print(f"✨ Complete! Changed {changed_files}/{total_files} files")
    
    if args.dry_run:
        print("💡 Run without --dry-run to apply changes")

if __name__ == '__main__':
    main()
