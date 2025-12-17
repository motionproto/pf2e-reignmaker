#!/usr/bin/env python3
"""
Extract skills and outcome descriptions from event TypeScript files
and update the EVENT_SKILLS_TABLE.csv file.
"""

import os
import re
import csv
from pathlib import Path

# Map event file names to CSV event numbers
EVENT_FILE_MAP = {
    'criminal-trial': 1,
    'feud': 2,
    'inquisition': 3,
    'public-scandal': 4,
    'plague': 5,
    'food-shortage': 6,
    'natural-disaster': 7,
    'immigration': 8,
    'assassination-attempt': 9,
    'crime-wave': 10,
    'notorious-heist': 11,
    'bandit-activity': 12,
    'raiders': 13,
    'trade-agreement': 14,
    'economic-surge': 15,
    'food-surplus': 16,
    'boomtown': 17,
    'land-rush': 18,
    'pilgrimage': 19,
    'diplomatic-overture': 20,
    'festive-invitation': 21,
    'visiting-celebrity': 22,
    'grand-tournament': 23,
    'archaeological-find': 24,
    'magical-discovery': 25,
    'remarkable-treasure': 26,
    'scholarly-discovery': 27,  # DELETED - skip
    'natures-blessing': 28,
    'good-weather': 29,
    'military-exercises': 30,
    'drug-den': 31,
    'monster-attack': 32,
    'undead-uprising': 33,
    'cult-activity': 34,
}

# Map non-standard approach IDs to their types
APPROACH_ID_MAP = {
    # Standard
    'virtuous': 'virtuous',
    'practical': 'practical',
    'ruthless': 'ruthless',
    # Food Shortage variants
    'feed-people': 'virtuous',
    'rationing': 'practical',
    'prioritize-elite': 'ruthless',
    # Natural Disaster variants
    'prioritize-lives': 'virtuous',
    'save-assets': 'ruthless',
    # Immigration variants
    'welcome-all': 'virtuous',
    'open-governance': 'virtuous',
}

def extract_event_data(filepath):
    """Extract all approach data from an event file."""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Find strategicChoice options
    options_match = re.search(r"strategicChoice:\s*\{.*?options:\s*\[(.*)]\s*\}", content, re.DOTALL)
    if not options_match:
        return []
    
    options_text = options_match.group(1)
    
    approaches = []
    
    # Split by looking for the start of each option object
    # Use a more flexible regex to find each complete option block
    current_pos = 0
    while True:
        # Find the next option start - match any ID
        match = re.search(r"\{\s*id:\s*'([^']+)'", options_text[current_pos:])
        if not match:
            break
        
        approach_id_raw = match.group(1)
        # Map to standard approach type
        approach_id = APPROACH_ID_MAP.get(approach_id_raw)
        if not approach_id:
            # Not a recognized approach, skip
            current_pos += match.end()
            continue
        
        start_pos = current_pos + match.start()
        
        # Find the matching closing brace for this option
        # Count braces to find the matching close
        brace_count = 0
        i = start_pos
        in_string = False
        escape_next = False
        
        while i < len(options_text):
            char = options_text[i]
            
            if escape_next:
                escape_next = False
                i += 1
                continue
            
            if char == '\\':
                escape_next = True
                i += 1
                continue
            
            if char in ('"', "'"):
                in_string = not in_string
            elif not in_string:
                if char == '{':
                    brace_count += 1
                elif char == '}':
                    brace_count -= 1
                    if brace_count == 0:
                        # Found the matching close brace
                        block_text = options_text[start_pos:i+1]
                        
                        # Extract skills
                        skills_match = re.search(r"skills:\s*\[(.*?)\]", block_text, re.DOTALL)
                        skills = ''
                        if skills_match:
                            skills_str = skills_match.group(1)
                            skill_list = re.findall(r"'([^']+)'", skills_str)
                            skills = ', '.join(skill_list)
                        
                        # Extract outcome descriptions
                        descriptions = {}
                        desc_match = re.search(r"outcomeDescriptions:\s*\{(.*?)\}", block_text, re.DOTALL)
                        if desc_match:
                            desc_block = desc_match.group(1)
                            
                            # Extract each outcome - handle multiline strings
                            for outcome in ['criticalSuccess', 'success', 'failure', 'criticalFailure']:
                                pattern = f"{outcome}:\\s*'(.*?)'"
                                outcome_match = re.search(pattern, desc_block, re.DOTALL)
                                if outcome_match:
                                    descriptions[outcome] = outcome_match.group(1).strip()
                        
                        approaches.append({
                            'approach': approach_id,
                            'skills': skills,
                            'cs_text': descriptions.get('criticalSuccess', ''),
                            's_text': descriptions.get('success', ''),
                            'f_text': descriptions.get('failure', ''),
                            'cf_text': descriptions.get('criticalFailure', '')
                        })
                        
                        current_pos = i + 1
                        break
            
            i += 1
        else:
            # Didn't find closing brace, move past this match
            current_pos = start_pos + len(match.group(0))
    
    return approaches

def update_csv():
    """Update the CSV file with extracted data."""
    csv_path = Path('docs/planning/EVENT_SKILLS_TABLE.csv')
    events_dir = Path('src/pipelines/events')
    
    # Read existing CSV
    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        rows = list(reader)
    
    # Extract data from all event files
    event_data = {}
    
    for event_file in events_dir.glob('*.ts'):
        event_name = event_file.stem
        if event_name in EVENT_FILE_MAP:
            event_num = EVENT_FILE_MAP[event_name]
            if event_num == 27:  # Skip deleted event
                continue
            
            print(f"Processing {event_name} (Event #{event_num})...")
            approaches = extract_event_data(event_file)
            
            if approaches:
                event_data[event_num] = {app['approach']: app for app in approaches}
                for app in approaches:
                    print(f"  Found {app['approach']}: {app['skills'][:50]}...")
    
    # Update CSV rows
    # Track which event we're in and which approach (row 0, 1, 2 for virtuous, practical, ruthless)
    current_event = None
    approach_index = 0
    
    for row in rows:
        # Check if this is a new event (Name column is not empty)
        name = row.get('Name', '').strip()
        if name:
            # Extract event number
            match = re.match(r'^(\d+)\.', name)
            if match:
                current_event = int(match.group(1))
                approach_index = 0  # First row is virtuous
            else:
                current_event = None
        else:
            # Empty Name means continuation of previous event
            approach_index += 1
        
        if current_event == 27:  # Skip deleted event
            continue
        
        # Map approach_index to approach type
        approach_map = ['virtuous', 'practical', 'ruthless']
        if approach_index < len(approach_map):
            approach_type = approach_map[approach_index]
        else:
            approach_type = None
        
        # Update row if we have data
        if current_event and current_event in event_data and approach_type and approach_type in event_data[current_event]:
            approach_data = event_data[current_event][approach_type]
            row['Skills'] = approach_data['skills']
            row['CS Text'] = approach_data['cs_text']
            row['S Text'] = approach_data['s_text']
            row['F Text'] = approach_data['f_text']
            row['CF Text'] = approach_data['cf_text']
            print(f"✓ Updated Event {current_event} - {approach_type}")
    
    # Write updated CSV
    with open(csv_path, 'w', encoding='utf-8', newline='') as f:
        fieldnames = rows[0].keys()
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)
    
    print(f"\n✅ Updated {csv_path}")

if __name__ == '__main__':
    update_csv()
