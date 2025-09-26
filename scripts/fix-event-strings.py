#!/usr/bin/env python3
"""
Script to replace translation keys in event JSON files with actual text from Kingdom_Events.md
"""

import json
import os
import re
from pathlib import Path
from typing import Dict, Any, Optional

def parse_kingdom_events(md_file_path: str) -> Dict[str, Dict[str, Any]]:
    """Parse the Kingdom_Events.md file to extract event data."""
    
    with open(md_file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    events = {}
    
    # Split by event headers (## Event Name)
    event_sections = re.split(r'^## (?!Event Resolution Rules)', content, flags=re.MULTILINE)[1:]
    
    for section in event_sections:
        lines = section.strip().split('\n')
        if not lines:
            continue
            
        # Extract event name
        event_name = lines[0].strip()
        event_key = event_name.lower().replace(' ', '-').replace("'", '')
        
        # Extract description (first italic line)
        description = ""
        for line in lines[1:]:
            if line.startswith('_') and line.endswith('_'):
                description = line[1:-1].strip()
                break
        
        event_data = {
            'name': event_name,
            'description': description,
            'outcomes': {},
            'special': "",
            'location': "",
            'target': "",
            'unresolved': ""
        }
        
        # Parse the section for specific fields
        current_field = None
        outcome_table_started = False
        table_lines = []
        
        for line in lines:
            line = line.strip()
            
            # Extract location
            if line.startswith('**Location:**'):
                event_data['location'] = line.replace('**Location:**', '').strip()
            
            # Extract target
            elif line.startswith('**Target:**'):
                event_data['target'] = line.replace('**Target:**', '').strip()
            
            # Extract special
            elif line.startswith('**Special:**'):
                # Find the index in the original lines list by matching content
                special_text = []
                found_special = False
                for i, orig_line in enumerate(lines):
                    if orig_line.strip() == line:
                        found_special = True
                        # Get the rest of the Special text on the same line first
                        inline_special = orig_line.strip().replace('**Special:**', '').strip()
                        if inline_special:
                            special_text.append(inline_special)
                        # Then get any continuation lines
                        for j in range(i + 1, len(lines)):
                            next_line = lines[j].strip()
                            if next_line.startswith('**') or next_line.startswith('|') or next_line.startswith('---'):
                                break
                            if next_line:
                                special_text.append(next_line)
                        break
                event_data['special'] = ' '.join(special_text)
            
            # Extract If Unresolved
            elif line.startswith('**If Unresolved:**'):
                unresolved_text = []
                for i, orig_line in enumerate(lines):
                    if orig_line.strip() == line:
                        # Get the rest of the Unresolved text on the same line first
                        inline_unresolved = orig_line.strip().replace('**If Unresolved:**', '').strip()
                        if inline_unresolved:
                            unresolved_text.append(inline_unresolved)
                        # Then get any continuation lines
                        for j in range(i + 1, len(lines)):
                            next_line = lines[j].strip()
                            if next_line.startswith('**') or next_line.startswith('---'):
                                break
                            if next_line:
                                unresolved_text.append(next_line)
                        break
                event_data['unresolved'] = ' '.join(unresolved_text)
            
            # Parse outcome table
            elif '| Degree of Success |' in line:
                outcome_table_started = True
            elif outcome_table_started and line.startswith('|') and 'Critical Success' in line:
                parts = [p.strip() for p in line.split('|')]
                if len(parts) >= 3:
                    event_data['outcomes']['criticalSuccess'] = parts[2]
            elif outcome_table_started and line.startswith('|') and line.count('Success') == 1 and 'Critical' not in line:
                parts = [p.strip() for p in line.split('|')]
                if len(parts) >= 3:
                    event_data['outcomes']['success'] = parts[2]
            elif outcome_table_started and line.startswith('|') and line.count('Failure') == 1 and 'Critical' not in line:
                parts = [p.strip() for p in line.split('|')]
                if len(parts) >= 3:
                    event_data['outcomes']['failure'] = parts[2]
            elif outcome_table_started and line.startswith('|') and 'Critical Failure' in line:
                parts = [p.strip() for p in line.split('|')]
                if len(parts) >= 3:
                    event_data['outcomes']['criticalFailure'] = parts[2]
        
        events[event_key] = event_data
    
    return events

def update_event_json(json_path: str, event_data: Dict[str, Any]) -> None:
    """Update a single event JSON file with actual text."""
    
    # Read existing JSON
    with open(json_path, 'r', encoding='utf-8') as f:
        json_data = json.load(f)
    
    # Update basic fields
    json_data['name'] = event_data['name']
    json_data['description'] = event_data['description']
    
    # Update location if it exists
    if event_data.get('location'):
        json_data['location'] = event_data['location']
    elif event_data.get('target'):
        json_data['location'] = event_data['target']
    
    # Update special if it exists
    if event_data.get('special'):
        json_data['special'] = event_data['special']
    
    # Update stage messages with outcomes
    if 'stages' in json_data and json_data['stages']:
        stage = json_data['stages'][0]
        
        if 'criticalSuccess' in stage and 'criticalSuccess' in event_data['outcomes']:
            stage['criticalSuccess']['msg'] = event_data['outcomes']['criticalSuccess']
        
        if 'success' in stage and 'success' in event_data['outcomes']:
            stage['success']['msg'] = event_data['outcomes']['success']
        
        if 'failure' in stage and 'failure' in event_data['outcomes']:
            stage['failure']['msg'] = event_data['outcomes']['failure']
        
        if 'criticalFailure' in stage and 'criticalFailure' in event_data['outcomes']:
            stage['criticalFailure']['msg'] = event_data['outcomes']['criticalFailure']
    
    # Update unresolved description
    if event_data.get('unresolved') and 'ifUnresolved' in json_data:
        if 'continuous' in json_data['ifUnresolved']:
            if 'modifierTemplate' in json_data['ifUnresolved']['continuous']:
                json_data['ifUnresolved']['continuous']['modifierTemplate']['description'] = event_data['unresolved']
                # Also update the name to be more descriptive
                json_data['ifUnresolved']['continuous']['modifierTemplate']['name'] = f"Unresolved: {event_data['name']}"
    
    # Write updated JSON
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(json_data, f, indent=2, ensure_ascii=False)
        f.write('\n')

def main():
    # Paths
    events_md_path = "_reignmaker-lite-reference/Kingdom_Events.md"
    events_dir = "data/events"
    
    # Parse the markdown file
    print(f"Parsing {events_md_path}...")
    events_data = parse_kingdom_events(events_md_path)
    print(f"Found {len(events_data)} events in markdown")
    
    # Get all JSON files
    json_files = list(Path(events_dir).glob("*.json"))
    print(f"Found {len(json_files)} JSON files to update")
    
    # Update each JSON file
    updated_count = 0
    for json_path in json_files:
        event_key = json_path.stem
        
        if event_key in events_data:
            print(f"Updating {event_key}...")
            try:
                update_event_json(str(json_path), events_data[event_key])
                updated_count += 1
            except Exception as e:
                print(f"  Error updating {event_key}: {e}")
        else:
            print(f"  Warning: No markdown data found for {event_key}")
    
    print(f"\nUpdated {updated_count}/{len(json_files)} event files")
    
    # List any events in markdown that don't have JSON files
    json_keys = {f.stem for f in json_files}
    missing_jsons = set(events_data.keys()) - json_keys
    if missing_jsons:
        print("\nEvents in markdown without JSON files:")
        for key in sorted(missing_jsons):
            print(f"  - {key} ({events_data[key]['name']})")

if __name__ == "__main__":
    main()
