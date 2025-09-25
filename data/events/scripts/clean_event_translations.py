#!/usr/bin/env python3
"""
Script to remove all event translations from en.json
"""

import sys
import os
sys.path.append('../../lang/langtools')
from lang_manager import LanguageManager

def clean_event_translations():
    """Remove all event translations from the language file"""
    
    manager = LanguageManager()
    
    # Get the current events section
    events = manager.data.get('pf2e-reignmaker', {}).get('events', {})
    
    print(f"Found {len(events)} event translations to remove")
    
    # List all event keys
    event_keys = list(events.keys())
    removed_count = 0
    
    # Remove each event and its nested keys
    for event_key in event_keys:
        # Build the full path to the event
        base_path = f'pf2e-reignmaker.events.{event_key}'
        
        # Check if this event has nested keys
        event_data = events.get(event_key, {})
        
        # Function to recursively remove all keys
        def remove_nested_keys(data, parent_path=''):
            nonlocal removed_count
            if isinstance(data, dict):
                for key, value in data.items():
                    current_path = f"{parent_path}.{key}" if parent_path else key
                    if isinstance(value, dict):
                        remove_nested_keys(value, current_path)
                    else:
                        # This is a leaf node, remove it
                        full_key = f"{base_path}.{current_path}"
                        try:
                            manager.delete_key(full_key)
                            removed_count += 1
                            print(f"  Removed: {full_key}")
                        except Exception as e:
                            print(f"  Error removing {full_key}: {e}")
        
        # Remove all nested keys for this event
        if isinstance(event_data, dict):
            remove_nested_keys(event_data)
        
        # Also try to remove the event key itself if it exists as a direct value
        try:
            manager.delete_key(base_path)
            removed_count += 1
            print(f"  Removed: {base_path}")
        except:
            pass
    
    # Also remove the events key itself if it's empty
    try:
        manager.delete_key('pf2e-reignmaker.events')
        print(f"  Removed: pf2e-reignmaker.events")
        removed_count += 1
    except:
        pass
    
    print(f"\nTotal keys removed: {removed_count}")
    
    # Save the changes
    manager.export()
    print("Changes exported to en.json")
    
    # Verify removal
    manager_verify = LanguageManager()
    remaining_events = manager_verify.data.get('pf2e-reignmaker', {}).get('events', {})
    if remaining_events:
        print(f"\nWARNING: {len(remaining_events)} events still remain!")
        print("Remaining events:", list(remaining_events.keys())[:10])
    else:
        print("\nSuccess! All event translations have been removed.")

if __name__ == "__main__":
    clean_event_translations()
