#!/usr/bin/env python3
"""
Unify modifier format across events and incidents:
- Rename 'selector' → 'resource'
- Remove 'enabled' field
- Consolidate duration: 'turns' field becomes duration value
- duration can be: "immediate", "ongoing", "permanent", or a number (turns)
"""

import json
import sys

def unify_modifier(modifier):
    """Convert a modifier to the unified format."""
    unified = {}
    
    # Resource: use 'resource' (rename from 'selector' if needed)
    if 'selector' in modifier:
        unified['resource'] = modifier['selector']
    elif 'resource' in modifier:
        unified['resource'] = modifier['resource']
    
    # Value: keep as-is
    if 'value' in modifier:
        unified['value'] = modifier['value']
    
    # Type: keep if it exists (for events)
    if 'type' in modifier:
        unified['type'] = modifier['type']
    
    # Duration: consolidate turns into duration
    if 'turns' in modifier:
        # If turns exists, use it as the duration value (number)
        unified['duration'] = modifier['turns']
    elif 'duration' in modifier:
        # Keep existing duration (string or number)
        unified['duration'] = modifier['duration']
    # If neither exists, don't add duration field
    
    # Remove: enabled, name (already removed), selector (renamed to resource)
    
    return unified

def process_modifiers_in_effects(effects):
    """Process all modifiers in an effects object."""
    if not effects:
        return effects
    
    for outcome_type in ['criticalSuccess', 'success', 'failure', 'criticalFailure']:
        if outcome_type in effects and 'modifiers' in effects[outcome_type]:
            unified_modifiers = []
            for modifier in effects[outcome_type]['modifiers']:
                unified_modifiers.append(unify_modifier(modifier))
            effects[outcome_type]['modifiers'] = unified_modifiers
    
    return effects

def process_data(data):
    """Recursively process all data."""
    if isinstance(data, dict):
        if 'effects' in data:
            data['effects'] = process_modifiers_in_effects(data['effects'])
        
        for value in data.values():
            process_data(value)
    
    elif isinstance(data, list):
        for item in data:
            process_data(item)

def process_file(filepath):
    """Unify modifier format in a JSON file."""
    print(f"\nProcessing {filepath}...")
    
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        # Count before
        before_stats = count_fields(data)
        
        # Process
        process_data(data)
        
        # Count after
        after_stats = count_fields(data)
        
        # Write back
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=4, ensure_ascii=False)
        
        print(f"  Renamed {before_stats['selector']} 'selector' → 'resource'")
        print(f"  Removed {before_stats['enabled']} 'enabled' fields")
        print(f"  Consolidated {before_stats['turns']} 'turns' into 'duration'")
        print(f"✓ Unified {filepath}")
        
    except Exception as e:
        print(f"✗ Error processing {filepath}: {e}")
        return False
    
    return True

def count_fields(data):
    """Count occurrences of specific fields in modifiers."""
    counts = {'selector': 0, 'enabled': 0, 'turns': 0}
    
    if isinstance(data, dict):
        # Check if this looks like a modifier
        if 'value' in data:
            if 'selector' in data:
                counts['selector'] += 1
            if 'enabled' in data:
                counts['enabled'] += 1
            if 'turns' in data:
                counts['turns'] += 1
        
        for value in data.values():
            sub_counts = count_fields(value)
            for key in counts:
                counts[key] += sub_counts[key]
    
    elif isinstance(data, list):
        for item in data:
            sub_counts = count_fields(item)
            for key in counts:
                counts[key] += sub_counts[key]
    
    return counts

if __name__ == '__main__':
    files = [
        'dist/events.json',
        'dist/incidents.json',
    ]
    
    if len(sys.argv) > 1:
        files = sys.argv[1:]
    
    print("=" * 80)
    print("Unifying modifier format across all files")
    print("=" * 80)
    
    success_count = 0
    for filepath in files:
        if process_file(filepath):
            success_count += 1
    
    print("\n" + "=" * 80)
    print(f"Complete: {success_count}/{len(files)} files processed successfully")
    print("=" * 80)
    print("\nUnified modifier format:")
    print("  {")
    print("    \"resource\": \"gold\",           // Unified field name")
    print("    \"value\": 4,                   // Number or dice formula")
    print("    \"duration\": 1                 // Number (turns) or string (immediate/ongoing/permanent)")
    print("  }")
