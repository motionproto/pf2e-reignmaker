#!/usr/bin/env python3
"""
Script to flatten event structure by removing unnecessary stages array.
Moves skills and outcomes to top level, wrapping outcomes in 'effects' for consistency.
"""

import json
from pathlib import Path
from typing import Dict, Any

def flatten_event_structure(event_data: Dict[str, Any]) -> Dict[str, Any]:
    """Flatten the event structure by removing stages and reorganizing."""
    
    # If there are no stages, return as-is
    if 'stages' not in event_data:
        return event_data
    
    # Since all events have exactly 1 stage, we can safely take the first
    if event_data['stages'] and len(event_data['stages']) > 0:
        stage = event_data['stages'][0]
        
        # Move skills to top level
        if 'skills' in stage:
            event_data['skills'] = stage['skills']
        
        # Create effects object and move outcomes into it
        event_data['effects'] = {}
        
        # Move each outcome type to effects
        outcome_types = ['criticalSuccess', 'success', 'failure', 'criticalFailure']
        for outcome in outcome_types:
            if outcome in stage:
                event_data['effects'][outcome] = stage[outcome]
    
    # Remove the stages array
    del event_data['stages']
    
    return event_data

def process_all_events(events_dir: str) -> int:
    """Process all event JSON files to flatten their structure."""
    
    events_path = Path(events_dir)
    json_files = list(events_path.glob("*.json"))
    
    updated_count = 0
    
    for json_path in sorted(json_files):
        print(f"Processing {json_path.name}...")
        
        # Read the event file
        with open(json_path, 'r', encoding='utf-8') as f:
            event_data = json.load(f)
        
        # Check if it needs flattening
        if 'stages' in event_data:
            # Flatten the structure
            flattened = flatten_event_structure(event_data)
            
            # Write the updated structure
            with open(json_path, 'w', encoding='utf-8') as f:
                json.dump(flattened, f, indent=2, ensure_ascii=False)
                f.write('\n')
            
            print(f"  ✓ Flattened structure")
            updated_count += 1
        else:
            print(f"  - Already flattened")
    
    return updated_count

def main():
    """Main function to flatten all event structures."""
    
    events_dir = "data/events"
    
    print("=" * 60)
    print("FLATTENING EVENT STRUCTURES")
    print("=" * 60)
    print()
    print(f"Processing events in: {events_dir}")
    print()
    
    # Process all events
    updated = process_all_events(events_dir)
    
    print()
    print("=" * 60)
    print("SUMMARY")
    print("=" * 60)
    print(f"✅ Updated {updated} event files")
    print()
    print("Structure changes:")
    print("  - Removed 'stages' array wrapper")
    print("  - Moved 'skills' to top level")
    print("  - Wrapped outcomes in 'effects' object")
    print("  - Maintained all modifier details and msg fields")

if __name__ == "__main__":
    main()
