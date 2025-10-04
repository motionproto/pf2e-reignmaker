#!/usr/bin/env python3
"""
Convert event/incident JSON files to use placeholder format.
Replaces hardcoded values in messages with {resource} placeholders.
"""

import json
import re
import sys

def extract_resource_values(modifiers):
    """Extract resource names and their values from modifiers array."""
    resource_map = {}
    for modifier in modifiers:
        # Support both 'selector' (events/incidents) and 'resource' (new format)
        resource = modifier.get('selector') or modifier.get('resource')
        if resource and isinstance(resource, str):
            value = modifier.get('value')
            if value is not None:
                resource_map[resource] = value
    return resource_map

def convert_message_to_placeholders(message, modifiers):
    """
    Convert a message with hardcoded values to use placeholders.
    
    Example: "Lose 2 Gold, +1 Unrest" -> "Lose {gold} Gold, +{unrest} Unrest"
    """
    if not modifiers:
        return message
    
    resource_map = extract_resource_values(modifiers)
    converted_message = message
    
    # Pattern to match resource mentions with values
    # Matches: "+2 Gold", "-1 Unrest", "2 Gold", etc.
    for resource, value in resource_map.items():
        # Capitalize first letter for matching in message
        resource_capitalized = resource.capitalize()
        
        # Try to find patterns like "+2 Gold", "-1 Gold", "2 Gold"
        # Also handle dice formulas that might be in the value
        value_str = str(value)
        
        # Build regex patterns to match this resource with its value
        patterns = [
            # "+2 Gold" or "-1 Gold"
            rf'([+-]?){re.escape(value_str)}\s+{resource_capitalized}',
            # "lose 2 gold" or "gain 1 gold" (lowercase)
            rf'([+-]?){re.escape(value_str)}\s+{resource.lower()}',
        ]
        
        for pattern in patterns:
            # Replace with placeholder, preserving the sign if present
            def replacer(match):
                sign = match.group(1) if match.group(1) else ''
                # Keep the capitalization of the resource name from the original
                if resource_capitalized in match.group(0):
                    return f'{sign}{{{resource}}} {resource_capitalized}'
                else:
                    return f'{sign}{{{resource}}} {resource.lower()}'
            
            converted_message = re.sub(pattern, replacer, converted_message, flags=re.IGNORECASE)
    
    return converted_message

def convert_outcome(outcome):
    """Convert a single outcome object to use placeholders."""
    if not outcome or 'msg' not in outcome:
        return outcome
    
    modifiers = outcome.get('modifiers', [])
    original_msg = outcome['msg']
    converted_msg = convert_message_to_placeholders(original_msg, modifiers)
    
    # Only update if conversion made changes
    if converted_msg != original_msg:
        print(f"  Converted: {original_msg}")
        print(f"         -> {converted_msg}")
        outcome['msg'] = converted_msg
    
    return outcome

def convert_effects(effects):
    """Convert all outcomes in an effects object."""
    if not effects:
        return effects
    
    for outcome_type in ['criticalSuccess', 'success', 'failure', 'criticalFailure']:
        if outcome_type in effects:
            effects[outcome_type] = convert_outcome(effects[outcome_type])
    
    return effects

def convert_json_file(filepath):
    """Convert an entire JSON file to use placeholders."""
    print(f"\nConverting {filepath}...")
    
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        # Handle both array of items (events/incidents) and single objects
        items = data if isinstance(data, list) else [data]
        
        converted_count = 0
        for item in items:
            if 'name' in item:
                print(f"\n{item['name']}:")
            
            if 'effects' in item:
                original_effects = json.dumps(item['effects'])
                item['effects'] = convert_effects(item['effects'])
                if json.dumps(item['effects']) != original_effects:
                    converted_count += 1
        
        # Write back
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=4, ensure_ascii=False)
        
        print(f"\n✓ Converted {converted_count} items in {filepath}")
        
    except Exception as e:
        print(f"✗ Error converting {filepath}: {e}")
        return False
    
    return True

if __name__ == '__main__':
    files = [
        'public/events.json',
    ]
    
    if len(sys.argv) > 1:
        files = sys.argv[1:]
    
    print("=" * 80)
    print("Converting JSON files to use placeholder format")
    print("=" * 80)
    
    success_count = 0
    for filepath in files:
        if convert_json_file(filepath):
            success_count += 1
    
    print("\n" + "=" * 80)
    print(f"Conversion complete: {success_count}/{len(files)} files converted successfully")
    print("=" * 80)
