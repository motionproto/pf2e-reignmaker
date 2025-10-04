#!/usr/bin/env python3
"""
Simplify event/incident messages by removing redundant resource names.
Keeps labels before semicolons intact.

Example: "Legendary treasure; +{gold} Gold, {unrest} Unrest" 
      → "Legendary treasure; +{gold}, {unrest}"
"""

import json
import re
import sys

def simplify_message(message, modifiers):
    """
    Remove redundant resource names from message.
    Keeps any label before semicolon.
    
    Example: "+{gold} Gold, -{unrest} Unrest" → "+{gold}, {unrest}"
    """
    if not modifiers:
        return message
    
    # Extract resource names from modifiers
    resource_names = set()
    for modifier in modifiers:
        resource = modifier.get('selector') or modifier.get('resource')
        if resource and isinstance(resource, str):
            resource_names.add(resource)
    
    simplified = message
    
    # For each resource, remove redundant mentions after the placeholder
    for resource in resource_names:
        # Capitalize variations
        capitalized = resource.capitalize()
        
        # Patterns to match and remove:
        # 1. "{gold} Gold" → "{gold}"
        # 2. "{gold} gold" → "{gold}"
        # 3. Handle with punctuation: "{gold} Gold," → "{gold},"
        
        patterns = [
            # Match "{resource} Resource" or "{resource} resource" with optional punctuation
            (rf'\{{{resource}\}}\s+{capitalized}(?=\W|$)', f'{{{resource}}}'),
            (rf'\{{{resource}\}}\s+{resource.lower()}(?=\W|$)', f'{{{resource}}}'),
        ]
        
        for pattern, replacement in patterns:
            simplified = re.sub(pattern, replacement, simplified)
    
    return simplified

def simplify_outcome(outcome):
    """Simplify a single outcome message."""
    if not outcome or 'msg' not in outcome:
        return outcome
    
    modifiers = outcome.get('modifiers', [])
    original_msg = outcome['msg']
    simplified_msg = simplify_message(original_msg, modifiers)
    
    # Only update if simplification made changes
    if simplified_msg != original_msg:
        print(f"  Simplified: {original_msg}")
        print(f"          → {simplified_msg}")
        outcome['msg'] = simplified_msg
    
    return outcome

def simplify_effects(effects):
    """Simplify all outcomes in an effects object."""
    if not effects:
        return effects
    
    for outcome_type in ['criticalSuccess', 'success', 'failure', 'criticalFailure']:
        if outcome_type in effects:
            effects[outcome_type] = simplify_outcome(effects[outcome_type])
    
    return effects

def simplify_json_file(filepath):
    """Simplify messages in an entire JSON file."""
    print(f"\nSimplifying {filepath}...")
    
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        # Handle both array of items (events/incidents) and single objects
        items = data if isinstance(data, list) else [data]
        
        simplified_count = 0
        for item in items:
            if 'name' in item:
                print(f"\n{item['name']}:")
            
            if 'effects' in item:
                original_effects = json.dumps(item['effects'])
                item['effects'] = simplify_effects(item['effects'])
                if json.dumps(item['effects']) != original_effects:
                    simplified_count += 1
        
        # Write back
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=4, ensure_ascii=False)
        
        print(f"\n✓ Simplified {simplified_count} items in {filepath}")
        
    except Exception as e:
        print(f"✗ Error simplifying {filepath}: {e}")
        return False
    
    return True

if __name__ == '__main__':
    files = [
        'dist/events.json',
        'dist/incidents.json',
    ]
    
    if len(sys.argv) > 1:
        files = sys.argv[1:]
    
    print("=" * 80)
    print("Simplifying JSON messages by removing redundant resource names")
    print("=" * 80)
    
    success_count = 0
    for filepath in files:
        if simplify_json_file(filepath):
            success_count += 1
    
    print("\n" + "=" * 80)
    print(f"Simplification complete: {success_count}/{len(files)} files processed successfully")
    print("=" * 80)
