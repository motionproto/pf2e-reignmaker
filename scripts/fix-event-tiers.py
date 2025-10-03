#!/usr/bin/env python3
"""
Fix event tiers - change from number (1) to descriptor ("minor")
"""
import json
from pathlib import Path

def fix_event_tiers():
    events_path = Path('dist/events.json')
    
    with open(events_path, 'r', encoding='utf-8') as f:
        events = json.load(f)
    
    # Change tier from 1 to "minor" for all events
    for event in events:
        if 'tier' in event and event['tier'] == 1:
            event['tier'] = 'minor'
    
    # Write back with nice formatting
    with open(events_path, 'w', encoding='utf-8') as f:
        json.dump(events, f, indent=4, ensure_ascii=False)
    
    print(f"✅ Updated {len(events)} events: tier 1 → 'minor'")

if __name__ == '__main__':
    fix_event_tiers()
