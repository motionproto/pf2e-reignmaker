#!/usr/bin/env python3
"""
Remove redundant 'name' field from all modifiers in events and incidents.
The outcome message already provides the name/context.
"""

import json
import sys

def remove_modifier_names(data):
    """Remove 'name' field from all modifiers in effects."""
    if isinstance(data, dict):
        # Check if this is an effects object
        if 'effects' in data:
            effects = data['effects']
            for outcome_type in ['criticalSuccess', 'success', 'failure', 'criticalFailure']:
                if outcome_type in effects and 'modifiers' in effects[outcome_type]:
                    for modifier in effects[outcome_type]['modifiers']:
                        if 'name' in modifier:
                            del modifier['name']
        
        # Recurse into nested objects
        for value in data.values():
            remove_modifier_names(value)
    
    elif isinstance(data, list):
        # Recurse into list items
        for item in data:
            remove_modifier_names(item)

def process_file(filepath):
    """Remove modifier names from a JSON file."""
    print(f"\nProcessing {filepath}...")
    
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        # Count modifiers before
        before_count = count_modifier_names(data)
        
        # Remove names
        remove_modifier_names(data)
        
        # Count modifiers after
        after_count = count_modifier_names(data)
        
        # Write back
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=4, ensure_ascii=False)
        
        removed = before_count - after_count
        print(f"✓ Removed {removed} modifier 'name' fields from {filepath}")
        
    except Exception as e:
        print(f"✗ Error processing {filepath}: {e}")
        return False
    
    return True

def count_modifier_names(data):
    """Count how many modifiers have a 'name' field."""
    count = 0
    
    if isinstance(data, dict):
        if 'name' in data and ('value' in data or 'resource' in data or 'selector' in data):
            # This looks like a modifier
            count += 1
        
        for value in data.values():
            count += count_modifier_names(value)
    
    elif isinstance(data, list):
        for item in data:
            count += count_modifier_names(item)
    
    return count

if __name__ == '__main__':
    files = [
        'dist/events.json',
        'dist/incidents.json',
    ]
    
    if len(sys.argv) > 1:
        files = sys.argv[1:]
    
    print("=" * 80)
    print("Removing redundant 'name' fields from modifiers")
    print("=" * 80)
    
    success_count = 0
    for filepath in files:
        if process_file(filepath):
            success_count += 1
    
    print("\n" + "=" * 80)
    print(f"Complete: {success_count}/{len(files)} files processed successfully")
    print("=" * 80)
