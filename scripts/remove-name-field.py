#!/usr/bin/env python3
"""
Remove the top-level 'name' field from events and incidents.
We only need 'id' - the name can be derived from it if needed.
"""

import json
import sys

def remove_name_field(data):
    """Remove 'name' field from all top-level objects."""
    if isinstance(data, list):
        for item in data:
            if isinstance(item, dict) and 'name' in item:
                del item['name']
    return data

def process_file(filepath):
    """Remove name field from a JSON file."""
    print(f"\nProcessing {filepath}...")
    
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        # Count before
        before_count = sum(1 for item in data if isinstance(item, dict) and 'name' in item)
        
        # Remove names
        remove_name_field(data)
        
        # Write back
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=4, ensure_ascii=False)
        
        print(f"✓ Removed {before_count} 'name' fields from {filepath}")
        
    except Exception as e:
        print(f"✗ Error processing {filepath}: {e}")
        import traceback
        traceback.print_exc()
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
    print("Removing top-level 'name' fields")
    print("=" * 80)
    
    success_count = 0
    for filepath in files:
        if process_file(filepath):
            success_count += 1
    
    print("\n" + "=" * 80)
    print(f"Complete: {success_count}/{len(files)} files processed successfully")
    print("=" * 80)
    print("\nOnly 'id' remains for identification.")
