#!/usr/bin/env python3
"""
Script to validate event JSON files against Kingdom_Events.md and clean up translation keys.
This ensures we capture all data from the source and remove unnecessary translation strings.
"""

import json
import os
import re
from pathlib import Path
from typing import Dict, Any, Optional, List
from collections import defaultdict

def parse_kingdom_events_comprehensive(md_file_path: str) -> Dict[str, Dict[str, Any]]:
    """Parse the Kingdom_Events.md file to extract ALL event data comprehensively."""
    
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
            'type': '',
            'traits': [],
            'location': '',
            'target': '',
            'skills': [],
            'gifts': '',
            'demand': '',
            'outcomes': {},
            'special': '',
            'unresolved': ''
        }
        
        # Parse the section for specific fields
        outcome_table_started = False
        in_special = False
        in_unresolved = False
        special_lines = []
        unresolved_lines = []
        
        for i, line in enumerate(lines):
            line_stripped = line.strip()
            
            # Extract Type (traits)
            if line_stripped.startswith('**Type:**'):
                type_text = line_stripped.replace('**Type:**', '').strip()
                event_data['type'] = type_text
                # Parse traits from type
                traits = []
                if 'Beneficial' in type_text:
                    traits.append('beneficial')
                if 'Dangerous' in type_text:
                    traits.append('dangerous')
                if 'Continuous' in type_text:
                    traits.append('continuous')
                event_data['traits'] = traits
            
            # Extract Location
            elif line_stripped.startswith('**Location:**'):
                location_text = line_stripped.replace('**Location:**', '').strip()
                event_data['location'] = location_text
            
            # Extract Target
            elif line_stripped.startswith('**Target:**'):
                target_text = line_stripped.replace('**Target:**', '').strip()
                event_data['target'] = target_text
            
            # Extract Skills with qualifiers
            elif line_stripped.startswith('**Skill:**'):
                skills_text = line_stripped.replace('**Skill:**', '').strip()
                # Parse skills with their qualifiers - format: **Skill** (description)
                skill_pattern = r'\*\*(\w+)\*\*\s*\(([^)]+)\)'
                found_skills = re.findall(skill_pattern, skills_text)
                # Store as objects with skill and qualifier
                event_data['skills'] = []
                event_data['skill_qualifiers'] = {}
                for skill, qualifier in found_skills:
                    skill_lower = skill.lower()
                    event_data['skills'].append(skill_lower)
                    event_data['skill_qualifiers'][skill_lower] = qualifier
            
            # Extract Gifts (for festive invitation)
            elif line_stripped.startswith('**Gifts:**'):
                gifts_text = line_stripped.replace('**Gifts:**', '').strip()
                event_data['gifts'] = gifts_text
            
            # Extract Demand (for demand structure)
            elif line_stripped.startswith('**Demand:**'):
                demand_text = line_stripped.replace('**Demand:**', '').strip()
                event_data['demand'] = demand_text
            
            # Extract Special - handle multi-line
            elif line_stripped.startswith('**Special:**'):
                in_special = True
                in_unresolved = False
                # Get inline content
                inline_special = line_stripped.replace('**Special:**', '').strip()
                if inline_special:
                    special_lines.append(inline_special)
            elif in_special:
                if line_stripped.startswith('**') or line_stripped.startswith('---'):
                    in_special = False
                    event_data['special'] = ' '.join(special_lines)
                    special_lines = []
                elif line_stripped:
                    special_lines.append(line_stripped)
            
            # Extract If Unresolved - handle multi-line
            elif line_stripped.startswith('**If Unresolved:**'):
                in_unresolved = True
                in_special = False
                # Get inline content
                inline_unresolved = line_stripped.replace('**If Unresolved:**', '').strip()
                if inline_unresolved:
                    unresolved_lines.append(inline_unresolved)
            elif in_unresolved:
                if line_stripped.startswith('**') or line_stripped.startswith('---'):
                    in_unresolved = False
                    event_data['unresolved'] = ' '.join(unresolved_lines)
                    unresolved_lines = []
                elif line_stripped:
                    unresolved_lines.append(line_stripped)
            
            # Parse outcome table
            elif '| Degree of Success |' in line_stripped:
                outcome_table_started = True
            elif outcome_table_started and line_stripped.startswith('|'):
                parts = [p.strip() for p in line_stripped.split('|')]
                if len(parts) >= 3:
                    if 'Critical Success' in parts[1]:
                        event_data['outcomes']['criticalSuccess'] = parts[2]
                    elif 'Success' in parts[1] and 'Critical' not in parts[1]:
                        event_data['outcomes']['success'] = parts[2]
                    elif 'Failure' in parts[1] and 'Critical' not in parts[1]:
                        event_data['outcomes']['failure'] = parts[2]
                    elif 'Critical Failure' in parts[1]:
                        event_data['outcomes']['criticalFailure'] = parts[2]
        
        # Final cleanup for special and unresolved if still in progress at end
        if in_special and special_lines:
            event_data['special'] = ' '.join(special_lines)
        if in_unresolved and unresolved_lines:
            event_data['unresolved'] = ' '.join(unresolved_lines)
        
        events[event_key] = event_data
    
    return events

def extract_modifier_name_from_msg(msg: str) -> str:
    """Extract a short name from the msg field by taking text before semicolon or comma."""
    if not msg:
        return "Effect"
    
    # Try to get text before semicolon
    if ';' in msg:
        name = msg.split(';')[0].strip()
    # If no semicolon, try comma
    elif ',' in msg:
        name = msg.split(',')[0].strip()
    # Otherwise use the whole thing if it's short
    elif len(msg) < 30:
        name = msg.strip()
    # Or just take first few words
    else:
        words = msg.split()[:3]
        name = ' '.join(words)
    
    # Clean up any markdown
    name = name.replace('**', '').replace('*', '')
    
    # Remove "event ends" type phrases
    name = name.replace('event ends', '').strip()
    
    return name if name else "Effect"

def clean_event_json(json_path: str, event_data: Dict[str, Any], verbose: bool = True) -> Dict[str, Any]:
    """Clean up a single event JSON file, removing translation keys and updating with source data."""
    
    # Read existing JSON
    with open(json_path, 'r', encoding='utf-8') as f:
        json_data = json.load(f)
    
    changes = []
    
    # Remove unused "resolution" field
    if 'resolution' in json_data:
        del json_data['resolution']
        changes.append("Removed unused 'resolution' field")
    
    # Update location field if it's a translation key
    if 'location' in json_data and 'pf2e-reignmaker' in str(json_data.get('location', '')):
        # Use location from markdown or set to empty
        if event_data.get('location'):
            json_data['location'] = event_data['location']
            changes.append(f"Updated location to: {event_data['location']}")
        elif event_data.get('target'):
            json_data['location'] = event_data['target']
            changes.append(f"Updated location to: {event_data['target']}")
        else:
            json_data['location'] = ""
            changes.append("Cleared location translation key")
    
    # Convert skills to player action format (array of objects with skill and description)
    if 'stages' in json_data and event_data.get('skill_qualifiers'):
        for stage in json_data['stages']:
            if 'skills' in stage:
                # Check if skills are still in old format (array of strings)
                if stage['skills'] and isinstance(stage['skills'][0], str):
                    new_skills = []
                    for skill in stage['skills']:
                        skill_obj = {"skill": skill}
                        # Add description from qualifiers if available
                        if skill in event_data['skill_qualifiers']:
                            skill_obj["description"] = event_data['skill_qualifiers'][skill]
                        else:
                            skill_obj["description"] = skill  # Fallback to skill name
                        new_skills.append(skill_obj)
                    stage['skills'] = new_skills
                    changes.append("Converted skills to player action format")
                
                # Remove the old skill_qualifiers field if it exists
                if 'skill_qualifiers' in stage:
                    del stage['skill_qualifiers']
                    changes.append("Removed old skill_qualifiers field")
    
    # Clean up modifier names in stages
    if 'stages' in json_data:
        for stage_idx, stage in enumerate(json_data['stages']):
            for outcome_type in ['criticalSuccess', 'success', 'failure', 'criticalFailure']:
                if outcome_type in stage and 'modifiers' in stage[outcome_type]:
                    msg = stage[outcome_type].get('msg', '')
                    modifier_name = extract_modifier_name_from_msg(msg)
                    
                    for mod_idx, modifier in enumerate(stage[outcome_type]['modifiers']):
                        if 'name' in modifier and 'pf2e-reignmaker' in modifier['name']:
                            # Create a descriptive name based on the msg and selector
                            selector = modifier.get('selector', '')
                            value = modifier.get('value', 0)
                            
                            # Use the extracted name from msg
                            if modifier_name and modifier_name != "Effect":
                                modifier['name'] = modifier_name
                            else:
                                # Fallback to selector-based name
                                if selector == 'gold':
                                    modifier['name'] = "Gold gained" if value > 0 else "Gold lost"
                                elif selector == 'unrest':
                                    modifier['name'] = "Unrest change"
                                elif selector == 'fame':
                                    modifier['name'] = "Fame gained"
                                elif selector == 'food':
                                    modifier['name'] = "Food change"
                                elif selector == 'resources':
                                    modifier['name'] = "Resource change"
                                else:
                                    modifier['name'] = f"{selector.title()} change"
                            
                            changes.append(f"Updated modifier name in {outcome_type}")
    
    # Clean up unresolved event modifiers
    if 'ifUnresolved' in json_data:
        unresolved = json_data['ifUnresolved']
        
        # For continuous events with modifier templates
        if unresolved.get('type') == 'continuous' and 'continuous' in unresolved:
            cont = unresolved['continuous']
            if 'modifierTemplate' in cont:
                template = cont['modifierTemplate']
                
                # Update modifier template name if it's a translation key
                if 'name' in template and 'pf2e-reignmaker' in template.get('name', ''):
                    template['name'] = f"Unresolved: {json_data.get('name', 'Event')}"
                    changes.append("Updated unresolved modifier name")
                
                # Update description if it's a translation key
                if 'description' in template and 'pf2e-reignmaker' in template.get('description', ''):
                    if event_data.get('unresolved'):
                        template['description'] = event_data['unresolved']
                        changes.append("Updated unresolved description from source")
                
                # Clean up resolution automatic descriptions
                if 'resolution' in template and 'automatic' in template['resolution']:
                    auto = template['resolution']['automatic']
                    if 'description' in auto and 'pf2e-reignmaker' in auto.get('description', ''):
                        # Set a generic description or remove
                        auto['description'] = "Automatically resolved by hiring adventurers"
                        changes.append("Fixed automatic resolution description")
        
        # For expires events
        elif unresolved.get('type') == 'expires' and 'expires' in unresolved:
            expires = unresolved['expires']
            if 'message' in expires and 'pf2e-reignmaker' in expires.get('message', ''):
                # Use the unresolved text from source or a default
                if event_data.get('unresolved'):
                    expires['message'] = event_data['unresolved']
                else:
                    expires['message'] = f"{json_data.get('name', 'Event')} expires"
                changes.append("Fixed expires message")
    
    if verbose and changes:
        event_name = Path(json_path).stem
        print(f"  {event_name}: {len(changes)} changes")
        for change in changes:
            print(f"    - {change}")
    
    return json_data

def compare_data_coverage(json_data: Dict[str, Any], source_data: Dict[str, Any]) -> List[str]:
    """Compare JSON data with source to find missing fields."""
    missing = []
    
    # Check main fields
    if source_data.get('name') and json_data.get('name') != source_data['name']:
        missing.append(f"Name mismatch: '{json_data.get('name')}' vs '{source_data['name']}'")
    
    if source_data.get('description') and json_data.get('description') != source_data['description']:
        missing.append(f"Description mismatch")
    
    if source_data.get('special') and not json_data.get('special'):
        missing.append(f"Missing special: {source_data['special'][:50]}...")
    
    if source_data.get('unresolved') and 'ifUnresolved' not in json_data:
        missing.append(f"Missing unresolved handling")
    
    # Check if we have all skills (now they're objects with skill and description)
    if source_data.get('skills'):
        json_skills = []
        if 'stages' in json_data and json_data['stages']:
            stage_skills = json_data['stages'][0].get('skills', [])
            # Extract skill names from objects if they're in the new format
            if stage_skills and isinstance(stage_skills[0], dict):
                json_skills = [s['skill'] for s in stage_skills]
            else:
                json_skills = stage_skills
        
        missing_skills = set(source_data['skills']) - set(json_skills)
        if missing_skills:
            missing.append(f"Missing skills: {missing_skills}")
    
    return missing

def main():
    # Paths
    events_md_path = "_reignmaker-lite-reference/Kingdom_Events.md"
    events_dir = "data/events"
    
    # Parse the markdown file comprehensively
    print(f"Parsing {events_md_path} comprehensively...")
    events_data = parse_kingdom_events_comprehensive(events_md_path)
    print(f"Found {len(events_data)} events in markdown\n")
    
    # Get all JSON files
    json_files = list(Path(events_dir).glob("*.json"))
    print(f"Found {len(json_files)} JSON files to validate and clean\n")
    
    # Track statistics
    updated_files = 0
    missing_data_report = defaultdict(list)
    
    # Process each JSON file
    for json_path in sorted(json_files):
        event_key = json_path.stem
        
        if event_key in events_data:
            print(f"Processing {event_key}...")
            
            # Read current JSON
            with open(json_path, 'r', encoding='utf-8') as f:
                current_json = json.load(f)
            
            # Clean the JSON
            cleaned_json = clean_event_json(str(json_path), events_data[event_key], verbose=True)
            
            # Check for missing data
            missing = compare_data_coverage(cleaned_json, events_data[event_key])
            if missing:
                missing_data_report[event_key] = missing
            
            # Write updated JSON
            with open(json_path, 'w', encoding='utf-8') as f:
                json.dump(cleaned_json, f, indent=2, ensure_ascii=False)
                f.write('\n')
            
            updated_files += 1
        else:
            print(f"  Warning: No markdown data found for {event_key}")
    
    print(f"\n{'='*60}")
    print(f"SUMMARY")
    print(f"{'='*60}")
    print(f"✅ Updated {updated_files}/{len(json_files)} event files")
    
    # Report any missing coverage
    if missing_data_report:
        print(f"\n⚠️  Data Coverage Issues Found:")
        for event_key, issues in missing_data_report.items():
            print(f"\n  {event_key}:")
            for issue in issues:
                print(f"    - {issue}")
    else:
        print(f"\n✅ All source data successfully captured!")
    
    # List events in markdown without JSON files
    json_keys = {f.stem for f in json_files}
    missing_jsons = set(events_data.keys()) - json_keys
    if missing_jsons:
        print(f"\n⚠️  Events in markdown without JSON files:")
        for key in sorted(missing_jsons):
            print(f"  - {key} ({events_data[key]['name']})")
    
    # Report on data fields found in source
    print(f"\n📊 Data fields found in Kingdom_Events.md:")
    all_fields = set()
    for event in events_data.values():
        all_fields.update([k for k, v in event.items() if v])
    print(f"  Fields: {', '.join(sorted(all_fields))}")

if __name__ == "__main__":
    main()
