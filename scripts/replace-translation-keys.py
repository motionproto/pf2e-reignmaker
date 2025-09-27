#!/usr/bin/env python3
"""
Replace translation keys with actual display names in structure JSON files.
This script converts keys like "structures.barracks.name" to "Barracks".
"""

import json
from pathlib import Path
import re

def convert_key_to_display_name(key):
    """
    Convert a translation key to a display name.
    Example: "structures.barracks.name" -> "Barracks"
    Example: "structures.diplomatic-quarter.name" -> "Diplomatic Quarter"
    """
    if not key or not isinstance(key, str):
        return key
    
    # Check if it looks like a translation key
    if not key.startswith("structures.") or not key.endswith(".name"):
        return key
    
    # Extract the middle part
    parts = key.split('.')
    if len(parts) != 3:
        return key
    
    structure_id = parts[1]
    
    # Convert hyphenated names to title case
    words = structure_id.split('-')
    display_name = ' '.join(word.capitalize() for word in words)
    
    # Handle special cases
    special_cases = {
        'Rats Warren': "Rat's Warren",
        'Smugglers Den': "Smuggler's Den",
        'Thieves Guild': "Thieves' Guild",
        'Blacksmiths Guild': "Blacksmiths' Guild",
        'Warriors Hall': "Warrior's Hall",
        'Masterworks Foundry': 'Masterworks Foundry',
        'Scholars Table': "Scholar's Table",
        'Druids Grove': "Druid's Grove",
        'Wildskeepers Enclave': "Wildskeeper's Enclave",
        'Town Hall': 'Town Hall',
        'City Hall': 'City Hall',
        'Grand Forum': 'Grand Forum',
        'Training Yard': 'Training Yard',
        'Military Academy': 'Military Academy',
        'Artisans Hall': "Artisan's Hall",
        'Arcane Academy': 'Arcane Academy',
        'Temple District': 'Temple District',
        'Grand Basilica': 'Grand Basilica',
        'Healers Hut': "Healer's Hut",
        'Medical College': 'Medical College',
        'Buskers Alley': "Busker's Alley",
        'Famous Tavern': 'Famous Tavern',
        'Performance Hall': 'Performance Hall',
        'Grand Amphitheater': 'Grand Amphitheater',
        'Hunters Lodge': "Hunter's Lodge",
        'Rangers Outpost': "Ranger's Outpost",
        'Strategic Reserves': 'Strategic Reserves',
        'Wooden Palisade': 'Wooden Palisade',
        'Stone Walls': 'Stone Walls',
        'Fortified Walls': 'Fortified Walls',
        'Grand Battlements': 'Grand Battlements',
        'Market Square': 'Market Square',
        'Merchant Guild': 'Merchant Guild',
        'Imperial Bank': 'Imperial Bank',
        'Open Stage': 'Open Stage',
        'Tax Office': 'Tax Office',
        'Counting House': 'Counting House',
        'Envoys Office': "Envoy's Office",
        'Grand Embassy': 'Grand Embassy',
        'Diplomatic Quarter Support': 'Diplomatic Quarter'  # Support version
    }
    
    return special_cases.get(display_name, display_name)

def process_structure_data(data):
    """
    Process structure data to replace translation keys with display names.
    """
    if isinstance(data, dict):
        # Create new dict to avoid modifying during iteration
        new_data = {}
        for key, value in data.items():
            if key == 'name' and isinstance(value, str) and value.startswith('structures.'):
                # Replace translation key with display name
                new_data[key] = convert_key_to_display_name(value)
            else:
                # Recursively process nested structures
                new_data[key] = process_structure_data(value)
        return new_data
    elif isinstance(data, list):
        # Process each item in the list
        return [process_structure_data(item) for item in data]
    else:
        # Return primitive values as-is
        return data

def update_structure_files():
    """Update all structure JSON files to replace translation keys."""
    structures_dir = Path('data/structures')
    
    # Find all JSON files
    json_files = list(structures_dir.glob('*.json'))
    
    print(f"Found {len(json_files)} JSON files to process")
    print("=" * 50)
    
    updated_count = 0
    
    for json_file in json_files:
        try:
            # Read the file
            with open(json_file, 'r') as f:
                data = json.load(f)
            
            # Process the data
            updated_data = process_structure_data(data)
            
            # Check if anything changed
            if data != updated_data:
                # Write back the updated data
                with open(json_file, 'w') as f:
                    json.dump(updated_data, f, indent=2)
                
                print(f"✓ Updated: {json_file.name}")
                updated_count += 1
                
                # Show what changed (for a few examples)
                if updated_count <= 3 and 'tiers' in updated_data:
                    for tier in updated_data['tiers'][:1]:  # Show first tier only
                        if 'name' in tier:
                            print(f"  Example: {tier.get('id', 'unknown')} -> \"{tier['name']}\"")
            else:
                print(f"  Skipped: {json_file.name} (no translation keys found)")
                
        except Exception as e:
            print(f"✗ Error processing {json_file.name}: {e}")
    
    print()
    print("=" * 50)
    print(f"Updated {updated_count} files")

def verify_changes():
    """Verify that all translation keys have been replaced."""
    structures_dir = Path('data/structures')
    
    print("\nVerifying changes...")
    print("=" * 50)
    
    translation_keys_found = []
    
    for json_file in structures_dir.glob('*.json'):
        try:
            with open(json_file, 'r') as f:
                content = f.read()
                
            # Look for any remaining translation keys
            matches = re.findall(r'"structures\.[^"]+\.name"', content)
            if matches:
                translation_keys_found.extend([(json_file.name, match) for match in matches])
                
        except Exception as e:
            print(f"Error reading {json_file.name}: {e}")
    
    if translation_keys_found:
        print("⚠️ Found remaining translation keys:")
        for filename, key in translation_keys_found[:10]:
            print(f"  {filename}: {key}")
        if len(translation_keys_found) > 10:
            print(f"  ... and {len(translation_keys_found) - 10} more")
    else:
        print("✅ All translation keys have been replaced!")

def main():
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == '--verify':
        verify_changes()
        return
    
    print("Replacing translation keys with display names...")
    print("=" * 50)
    print()
    
    update_structure_files()
    verify_changes()

if __name__ == '__main__':
    main()
