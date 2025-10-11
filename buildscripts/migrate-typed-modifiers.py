#!/usr/bin/env python3
"""
Migrate event/incident/action modifiers to typed format.

Converts old modifier format:
  { "resource": "gold", "value": "-2d6" }

To new typed format:
  { "type": "dice", "resource": "gold", "formula": "2d6", "negative": true }

Handles:
- Static modifiers (numeric values)
- Dice modifiers (dice formulas)
- Choice modifiers (resource arrays)
"""

import json
import re
import os
from pathlib import Path
from typing import Any, Dict, List, Union

# Dice pattern matching
DICE_PATTERN = re.compile(r'^-?\(?\d+d\d+([+-]\d+)?\)?$')

def is_dice_formula(value: Any) -> bool:
    """Check if value is a dice formula string."""
    return isinstance(value, str) and bool(DICE_PATTERN.match(value))

def parse_dice_formula(formula: str) -> tuple[str, bool]:
    """
    Parse dice formula into clean formula and negative flag.
    
    Examples:
        "-2d6" -> ("2d6", True)
        "-(2d4+1)" -> ("2d4+1", True)
        "1d4" -> ("1d4", False)
        "2d6+1" -> ("2d6+1", False)
    """
    # Remove parentheses and check for negative
    clean = formula.strip()
    negative = False
    
    # Handle parenthetical negative: -(XdY+Z)
    if clean.startswith('-(') and clean.endswith(')'):
        clean = clean[2:-1]
        negative = True
    # Handle simple negative: -XdY or -XdY+Z
    elif clean.startswith('-'):
        clean = clean[1:]
        negative = True
    
    return clean, negative

def parse_dice_or_static(value: Union[int, str]) -> Union[int, Dict[str, Any]]:
    """
    Parse value that could be static number or dice formula.
    
    Returns:
        int for static values
        dict with formula/negative for dice values
    """
    if isinstance(value, (int, float)):
        return int(value)
    
    if is_dice_formula(value):
        formula, negative = parse_dice_formula(value)
        return {"formula": formula, "negative": negative}
    
    # Fallback: try to parse as int
    try:
        return int(value)
    except (ValueError, TypeError):
        print(f"⚠️  Warning: Could not parse value '{value}', using 0")
        return 0

def migrate_modifier(modifier: Dict[str, Any]) -> Dict[str, Any]:
    """
    Convert old modifier format to new typed format.
    
    Args:
        modifier: Old format modifier
        
    Returns:
        New format typed modifier
    """
    # Extract common fields
    resource = modifier.get('resource')
    value = modifier.get('value')
    duration = modifier.get('duration')
    name = modifier.get('name')
    
    # Case 1: Resource array (choice modifier)
    if isinstance(resource, list):
        parsed_value = parse_dice_or_static(value)
        result = {
            'type': 'choice',
            'resources': resource,
            'value': parsed_value,
        }
        if duration:
            result['duration'] = duration
        if name:
            result['name'] = name
        return result
    
    # Case 2: Dice formula (dice modifier)
    if is_dice_formula(value):
        formula, negative = parse_dice_formula(value)
        result = {
            'type': 'dice',
            'resource': resource,
            'formula': formula,
        }
        if negative:
            result['negative'] = negative
        if duration:
            result['duration'] = duration
        if name:
            result['name'] = name
        return result
    
    # Case 3: Static value (static modifier)
    result = {
        'type': 'static',
        'resource': resource,
        'value': int(value) if isinstance(value, (int, float)) else 0,
    }
    if duration:
        result['duration'] = duration
    if name:
        result['name'] = name
    return result

def migrate_outcome(outcome: Dict[str, Any]) -> Dict[str, Any]:
    """Migrate modifiers in an outcome object."""
    if 'modifiers' not in outcome:
        return outcome
    
    old_modifiers = outcome['modifiers']
    if not old_modifiers:
        return outcome
    
    new_modifiers = [migrate_modifier(mod) for mod in old_modifiers]
    outcome['modifiers'] = new_modifiers
    
    return outcome

def migrate_file(filepath: Path) -> bool:
    """
    Migrate a single JSON file.
    
    Returns:
        True if file was modified, False otherwise
    """
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        modified = False
        
        # Migrate effects in events/incidents/actions
        if 'effects' in data:
            effects = data['effects']
            for outcome_type in ['criticalSuccess', 'success', 'failure', 'criticalFailure']:
                if outcome_type in effects:
                    old_data = json.dumps(effects[outcome_type])
                    effects[outcome_type] = migrate_outcome(effects[outcome_type])
                    new_data = json.dumps(effects[outcome_type])
                    if old_data != new_data:
                        modified = True
        
        # Write back if modified
        if modified:
            with open(filepath, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
                f.write('\n')  # Trailing newline
            return True
        
        return False
        
    except Exception as e:
        print(f"❌ Error processing {filepath}: {e}")
        return False

def migrate_directory(directory: Path) -> tuple[int, int]:
    """
    Migrate all JSON files in directory recursively.
    
    Returns:
        (files_processed, files_modified)
    """
    files_processed = 0
    files_modified = 0
    
    for filepath in directory.rglob('*.json'):
        files_processed += 1
        if migrate_file(filepath):
            files_modified += 1
            print(f"✅ Migrated: {filepath.relative_to(directory)}")
        else:
            print(f"⏭️  Skipped: {filepath.relative_to(directory)} (no changes)")
    
    return files_processed, files_modified

def main():
    """Main migration script."""
    print("🔄 Starting modifier migration to typed format...\n")
    
    # Get project root
    script_dir = Path(__file__).parent
    project_root = script_dir.parent
    data_dir = project_root / 'data'
    
    if not data_dir.exists():
        print(f"❌ Data directory not found: {data_dir}")
        return 1
    
    # Migrate each data type
    total_processed = 0
    total_modified = 0
    
    for subdir in ['events', 'incidents', 'player-actions']:
        target_dir = data_dir / subdir
        if not target_dir.exists():
            print(f"⚠️  Skipping {subdir} (directory not found)")
            continue
        
        print(f"\n📁 Processing {subdir}/")
        print("=" * 60)
        processed, modified = migrate_directory(target_dir)
        total_processed += processed
        total_modified += modified
        print(f"✓ {subdir}: {modified}/{processed} files modified\n")
    
    # Summary
    print("\n" + "=" * 60)
    print(f"✅ Migration complete!")
    print(f"   Files processed: {total_processed}")
    print(f"   Files modified: {total_modified}")
    print(f"   Files unchanged: {total_processed - total_modified}")
    
    return 0

if __name__ == '__main__':
    exit(main())
