#!/usr/bin/env python3
"""
Add back the top-level 'name' field to events and incidents.
This is for UI display only - we don't add names to effect levels.
"""

import json
from pathlib import Path

def generate_display_name(event_id: str) -> str:
    """Generate display name from ID."""
    return ' '.join(word.capitalize() for word in event_id.split('-'))

def add_name_to_file(filepath: Path) -> bool:
    """Add name field to a single event/incident file."""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        # Check if name already exists
        if 'name' in data:
            return False
        
        # Generate name from ID
        event_id = data.get('id', '')
        if not event_id:
            print(f"⚠️  No ID found in {filepath}")
            return False
        
        # Add name field after id
        ordered_data = {'id': data['id']}
        ordered_data['name'] = generate_display_name(event_id)
        
        # Add remaining fields
        for key, value in data.items():
            if key != 'id':
                ordered_data[key] = value
        
        # Write back
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(ordered_data, f, indent=2, ensure_ascii=False)
            f.write('\n')
        
        return True
        
    except Exception as e:
        print(f"✗ Error processing {filepath}: {e}")
        return False

def main():
    print("=" * 80)
    print("Adding back top-level 'name' field to events and incidents")
    print("=" * 80)
    
    # Process events
    events_dir = Path('data/events')
    event_files = list(events_dir.glob('*.json'))
    
    print(f"\n📚 Processing {len(event_files)} event files...")
    event_count = 0
    for filepath in sorted(event_files):
        if add_name_to_file(filepath):
            event_count += 1
            print(f"  ✓ {filepath.name}")
    
    # Process incidents (in subdirectories: minor, moderate, major)
    incidents_dir = Path('data/incidents')
    incident_files = []
    for subdir in ['minor', 'moderate', 'major']:
        incident_files.extend(list((incidents_dir / subdir).glob('*.json')))
    
    print(f"\n📚 Processing {len(incident_files)} incident files...")
    incident_count = 0
    for filepath in sorted(incident_files):
        if add_name_to_file(filepath):
            incident_count += 1
            print(f"  ✓ {filepath.parent.name}/{filepath.name}")
    
    print("\n" + "=" * 80)
    print("SUMMARY")
    print("=" * 80)
    print(f"✅ Added 'name' field to {event_count} events")
    print(f"✅ Added 'name' field to {incident_count} incidents")
    print(f"\nTotal: {event_count + incident_count} files updated")

if __name__ == '__main__':
    main()
