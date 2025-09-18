#!/usr/bin/env python3
"""
Script to add all event translations to en.json
"""

import sys
import os
sys.path.append('../../lang/langtools')
from lang_manager import LanguageManager

# Import the event definitions from create_all_events.py
import create_all_events

def add_all_translations():
    """Add all event translations to the language file"""
    
    manager = LanguageManager()
    
    # Get all events from the create script - they're in events_data
    events = create_all_events.events_data
    
    print(f"Adding translations for {len(events)} events...")
    
    for event_data in events:
        event_id = event_data['id']
        base_key = f"pf2e-kingdom-lite.events.{event_id}"
        
        # Add basic event info
        manager.set_key(f"{base_key}.name", event_data['name'])
        manager.set_key(f"{base_key}.description", event_data['description'])
        manager.set_key(f"{base_key}.location", event_data['location'])
        manager.set_key(f"{base_key}.resolution", event_data['resolution'])
        
        if 'special' in event_data:
            manager.set_key(f"{base_key}.special", event_data['special'])
        
        # Add outcome messages  
        for outcome_key, msg in event_data.get('messages', {}).items():
            manager.set_key(f"{base_key}.stage-0.{outcome_key}.msg", f"<p>{msg}</p>")
            
        # Add modifiers from outcomes
        for outcome_key, mods in event_data.get('outcomes', {}).items():
            for mod_type, value in mods.items():
                if mod_type in ['gold', 'unrest', 'fame', 'food', 'resources', 'hex']:
                    mod_name = mod_type.title()
                    if value > 0:
                        mod_text = f"+{value} {mod_name}"
                    else:
                        mod_text = f"{value} {mod_name}"
                    manager.set_key(f"{base_key}.stage-0.{outcome_key}.{mod_type}", mod_text)
                elif mod_type == 'resource':
                    manager.set_key(f"{base_key}.stage-0.{outcome_key}.resource", "Choose 1 Resource")
                elif mod_type == 'damage_structure':
                    manager.set_key(f"{base_key}.stage-0.{outcome_key}.damage", "Structure Damaged")
                elif mod_type == 'destroy_structure':
                    manager.set_key(f"{base_key}.stage-0.{outcome_key}.destroy", "Structure Destroyed")
                elif mod_type == 'imprisoned_unrest':
                    manager.set_key(f"{base_key}.stage-0.{outcome_key}.imprisoned", f"Convert {value} Unrest to Imprisoned")
        
        print(f"  Added: {event_id}")
    
    # Export all changes at once
    print("\nExporting to en.json...")
    manager.export()
    print("Export complete!")
    
    # Verify
    manager_verify = LanguageManager()
    events_check = manager_verify.data.get('pf2e-kingdom-lite', {}).get('events', {})
    print(f"\nVerification: {len(events_check)} events in translations")
    
    if events_check:
        print("Events found:")
        for i, event_key in enumerate(sorted(events_check.keys())[:10], 1):
            print(f"  {i}. {event_key}")
        if len(events_check) > 10:
            print(f"  ... and {len(events_check) - 10} more")

if __name__ == "__main__":
    add_all_translations()
