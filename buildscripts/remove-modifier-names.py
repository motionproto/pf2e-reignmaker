#!/usr/bin/env python3
"""
Remove 'name' field from modifiers in events, incidents, and player-actions
"""

import json
import glob

def remove_modifier_names(obj):
    """Recursively remove 'name' field from modifier objects"""
    modified = False
    
    if isinstance(obj, dict):
        for key, value in list(obj.items()):
            if key == 'modifiers' and isinstance(value, list):
                # Found a modifiers array
                for modifier in value:
                    if isinstance(modifier, dict) and 'name' in modifier and 'type' in modifier:
                        del modifier['name']
                        modified = True
            elif isinstance(value, (dict, list)):
                if remove_modifier_names(value):
                    modified = True
    elif isinstance(obj, list):
        for item in obj:
            if remove_modifier_names(item):
                modified = True
    
    return modified

# Process all JSON files in data directory
for filepath in glob.glob('data/**/*.json', recursive=True):
    try:
        with open(filepath, 'r') as f:
            data = json.load(f)
        
        # Process the data
        modified = remove_modifier_names(data)
        
        # Write back if modified
        if modified:
            with open(filepath, 'w') as f:
                json.dump(data, f, indent=2)
                f.write('\n')  # Add trailing newline
            print(f'✓ {filepath}')
    except Exception as e:
        print(f'✗ {filepath}: {e}')

print('Done!')
