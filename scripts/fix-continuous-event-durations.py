#!/usr/bin/env python3
"""
Fix duration values for Continuous events.
Continuous events should have "ongoing" duration, not numeric values.
"""

import json
import sys
from pathlib import Path

# List of event IDs that are marked as "Continuous" in the source material
CONTINUOUS_EVENTS = [
    'bandit-activity',
    'boomtown',
    'demand-structure',
    'food-shortage',
    'cult-activity',
    'drug-den',
    'economic-surge',
    'demand-expansion',
    'feud',
    'good-weather',
    'inquisition',
    'plague',
    'raiders',
    'undead-uprising'
]

def fix_modifier_duration(modifier):
    """Fix duration to 'ongoing' for all continuous event modifiers."""
    if 'duration' in modifier:
        # Change ANY duration to 'ongoing' for continuous events
        modifier['duration'] = 'ongoing'
    return modifier

def process_event(event):
    """Process a single event to fix durations if it's continuous."""
    event_id = event.get('id', '')
    
    # Only process if this is a continuous event
    if event_id not in CONTINUOUS_EVENTS:
        return event, False
    
    changed = False
    
    if 'effects' in event:
        for outcome_type in ['criticalSuccess', 'success', 'failure', 'criticalFailure']:
            if outcome_type in event['effects']:
                outcome = event['effects'][outcome_type]
                if 'modifiers' in outcome and outcome['modifiers']:
                    for modifier in outcome['modifiers']:
                        old_duration = modifier.get('duration')
                        fix_modifier_duration(modifier)
                        if modifier.get('duration') != old_duration:
                            changed = True
    
    return event, changed

def process_file(filepath):
    """Process a single JSON file."""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        event, changed = process_event(data)
        
        if changed:
            with open(filepath, 'w', encoding='utf-8') as f:
                json.dump(event, f, indent=2, ensure_ascii=False)
            return True, True  # (success, changed)
        
        return True, False  # (success, not changed)
        
    except Exception as e:
        print(f"✗ Error processing {filepath}: {e}")
        import traceback
        traceback.print_exc()
        return False, False

def find_event_files(directory):
    """Find all event JSON files."""
    path = Path(directory)
    return list(path.glob('*.json'))

if __name__ == '__main__':
    print("=" * 80)
    print("Fixing duration values for Continuous events")
    print("=" * 80)
    
    event_files = find_event_files('data/events')
    
    print(f"\nFound {len(event_files)} event files")
    print(f"Checking {len(CONTINUOUS_EVENTS)} continuous events\n")
    
    success_count = 0
    changed_count = 0
    failed_files = []
    
    for filepath in event_files:
        success, changed = process_file(filepath)
        
        if success:
            success_count += 1
            if changed:
                changed_count += 1
                print(f"✓ Fixed: {filepath.name}")
        else:
            failed_files.append(filepath)
    
    print("\n" + "=" * 80)
    print(f"Complete: {success_count}/{len(event_files)} files processed")
    print(f"Changed: {changed_count} files updated")
    
    if failed_files:
        print(f"\nFailed files:")
        for f in failed_files:
            print(f"  - {f}")
    
    print("=" * 80)
    print("\nContinuous events now use 'ongoing' duration instead of numeric values.")
