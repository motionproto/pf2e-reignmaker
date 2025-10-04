#!/usr/bin/env python3
"""
Fix duration values: change numeric 1 to "immediate" for non-continuous events.
Continuous events should keep "ongoing", but single-turn effects should be "immediate".
"""

import json
import sys
from pathlib import Path

# List of continuous events (these keep "ongoing")
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
    """Fix duration: convert numeric 1 to 'immediate'."""
    if 'duration' in modifier:
        # If duration is numeric 1, change to "immediate"
        if modifier['duration'] == 1:
            modifier['duration'] = 'immediate'
    return modifier

def process_event(event):
    """Process a single event to fix durations (skip continuous events)."""
    event_id = event.get('id', '')
    
    # Skip continuous events - they should keep "ongoing"
    if event_id in CONTINUOUS_EVENTS:
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
    print("Fixing duration values: 1 → 'immediate' (non-continuous events only)")
    print("=" * 80)
    
    event_files = find_event_files('data/events')
    
    print(f"\nFound {len(event_files)} event files")
    print(f"Skipping {len(CONTINUOUS_EVENTS)} continuous events\n")
    
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
    print("\nSingle-turn effects now use 'immediate' instead of numeric 1.")
