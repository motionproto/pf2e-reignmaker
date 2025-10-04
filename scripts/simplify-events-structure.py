#!/usr/bin/env python3
"""
Simplify events structure to match incidents format:
- Remove: location, modifier, resolvedOn, ifUnresolved, special, traits
- Keep: id, name, description, skills, effects, tier (add if missing)
- Match incidents structure exactly
"""

import json
import sys

def simplify_event(event):
    """Simplify an event to match incident structure."""
    simplified = {}
    
    # Core fields (same as incidents)
    if 'id' in event:
        simplified['id'] = event['id']
    if 'name' in event:
        simplified['name'] = event['name']
    
    # Add tier if missing (events don't have this, but incidents do)
    # We can infer from traits or just mark as 'event'
    simplified['tier'] = 'event'  # Mark as event type
    
    if 'description' in event:
        simplified['description'] = event['description']
    
    # Skills array (same format)
    if 'skills' in event:
        simplified['skills'] = event['skills']
    
    # Effects (same format)
    if 'effects' in event:
        simplified['effects'] = event['effects']
    
    # Remove these event-specific fields:
    # - traits
    # - location
    # - modifier
    # - resolvedOn
    # - ifUnresolved
    # - special
    
    return simplified

def process_file(filepath):
    """Simplify events structure in a JSON file."""
    print(f"\nProcessing {filepath}...")
    
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        # Process each event
        simplified_events = []
        for event in data:
            simplified_events.append(simplify_event(event))
        
        # Write back
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(simplified_events, f, indent=4, ensure_ascii=False)
        
        print(f"✓ Simplified {len(simplified_events)} events to match incidents structure")
        print(f"  Removed: traits, location, modifier, resolvedOn, ifUnresolved, special")
        print(f"  Kept: id, name, tier, description, skills, effects")
        
    except Exception as e:
        print(f"✗ Error processing {filepath}: {e}")
        return False
    
    return True

if __name__ == '__main__':
    files = ['dist/events.json']
    
    if len(sys.argv) > 1:
        files = sys.argv[1:]
    
    print("=" * 80)
    print("Simplifying events structure to match incidents")
    print("=" * 80)
    
    success_count = 0
    for filepath in files:
        if process_file(filepath):
            success_count += 1
    
    print("\n" + "=" * 80)
    print(f"Complete: {success_count}/{len(files)} files processed successfully")
    print("=" * 80)
    print("\nUnified structure:")
    print("  {")
    print("    \"id\": \"...\",")
    print("    \"name\": \"...\",")
    print("    \"tier\": \"event\",")
    print("    \"description\": \"...\",")
    print("    \"skills\": [...],")
    print("    \"effects\": {...}")
    print("  }")
