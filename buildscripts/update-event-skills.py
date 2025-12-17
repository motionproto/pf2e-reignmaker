#!/usr/bin/env python3
"""
Update event pipeline files with skills from EVENT_SKILLS_TABLE_add.csv

Rules:
1. If Skills column is empty → Replace with Add column content
2. If Skills column has content → Add the Add column to existing skills
3. Always include 'applicable lore' at the end
4. Normalize to lowercase and remove punctuation
"""

import csv
import re
from pathlib import Path
from typing import Dict, List, Tuple

# Map event names from CSV to TypeScript file names
EVENT_FILE_MAP = {
    "1. Criminal Trial": "criminal-trial.ts",
    "2. Feud": "feud.ts",
    "3. Inquisition": "inquisition.ts",
    "4. Public Scandal": "public-scandal.ts",
    "5. Plague": "plague.ts",
    "6. Food Shortage": "food-shortage.ts",
    "7. Natural Disaster": "natural-disaster.ts",
    "8. Immigration": "immigration.ts",
    "9. Assassination Attempt": "assassination-attempt.ts",
    "10. Crime Wave": "crime-wave.ts",
    "11. Notorious Heist": "notorious-heist.ts",
    "12. Bandit Activity": "bandit-activity.ts",
    "13. Raiders": "raiders.ts",
    "14. Trade Agreement": "trade-agreement.ts",
    "15. Economic Surge": "economic-surge.ts",
    "16. Food Surplus": "food-surplus.ts",
    "17. Boomtown": "boomtown.ts",
    "18. Land Rush": "land-rush.ts",
    "19. Pilgrimage": "pilgrimage.ts",
    "20. Diplomatic Overture": "diplomatic-overture.ts",
    "21. Festive Invitation": "festive-invitation.ts",
    "22. Visiting Celebrity": "visiting-celebrity.ts",
    "23. Grand Tournament": "grand-tournament.ts",
    "24. Archaeological Find": "archaeological-find.ts",
    "25. Magical Discovery": "magical-discovery.ts",
    "26. Remarkable Treasure": "remarkable-treasure.ts",
    "28. Nature's Blessing": "natures-blessing.ts",
    "29. Good Weather": "good-weather.ts",
    "30. Military Exercises": "military-exercises.ts",
    "31. Drug Den": "drug-den.ts",
    "32. Monster Attack": "monster-attack.ts",
    "33. Undead Uprising": "undead-uprising.ts",
    "34. Cult Activity": "cult-activity.ts",
}

# Map approach descriptors to approach IDs
APPROACH_MAP = {
    "Show Mercy": "virtuous",
    "Fair Trial": "practical",
    "Harsh Punishment": "ruthless",
    "Mediate Peacefully": "virtuous",
    "Manipulate Outcome": "practical",
    "Force Compliance": "ruthless",
    "Protect the Accused": "virtuous",
    "Formal Investigation": "practical",
    "Support Inquisitors": "ruthless",
    "Transparent Response": "virtuous",
    "Manage Narrative": "practical",
    "Suppress Story": "ruthless",
    "Quarantine & Care": "virtuous",
    "Contain Spread": "practical",
    "Burn the Infected": "ruthless",
    "Share Reserves": "virtuous",
    "Ration & Import": "practical",
    "Feed Nobility": "ruthless",
    "Rescue & Relief": "virtuous",
    "Protect Infrastructure": "practical",
    "Martial Law": "ruthless",
    "Welcome Citizens": "virtuous",
    "Selective Entry": "practical",
    "Forced Labour": "ruthless",
    "Public Investigation": "virtuous",
    "Secret Investigation": "practical",
    "Mass Arrests": "ruthless",
    "Community outreach": "virtuous",
    "Patrols": "practical",
    "Crackdown": "ruthless",
    "Track & Recover": "virtuous",
    "Increase Security": "practical",
    "Terrorize": "ruthless",
    "Negotiate": "virtuous",
    "Drive Off": "practical",
    "Hunt Mercilessly": "ruthless",
    "Defend & Protect": "virtuous",
    "Strategic Defense": "practical",
    "Counter-raid": "ruthless",
    "Generous terms": "virtuous",
    "Fair trade": "practical",
    "Exploit Partner": "ruthless",
    "Share Prosperity": "virtuous",
    "Stockpile Surplus": "practical",
    "Exploit for Profit": "ruthless",
    "Feed the Poor": "virtuous",
    "Store & Trade": "practical",
    "Tax the Farmers": "ruthless",
    "Community Planning": "virtuous",
    "Managed Expansion": "practical",
    "Exploit Markets": "ruthless",
    "Fair Distribution": "virtuous",
    "Auction": "practical",
    "Favor Allies": "ruthless",
    "Free Passage": "virtuous",
    "Protect the Pilgrims": "practical",
    "Pay or be Persecuted": "ruthless",
    "Generous Terms": "virtuous",
    "Balanced Agreement": "practical",
    "Exploit Relationship": "ruthless",
    "Attend Humbly": "virtuous",
    "Diplomatic Gifts": "practical",
    "Display Power": "ruthless",
    "Simple Hospitality": "virtuous",
    "Appropriate Ceremony": "practical",
    "Lavish Display": "ruthless",
    "Free Celebrations": "virtuous",
    "Organized Event": "practical",
    "Exclusive Affair": "ruthless",
    "Preserve Heritage": "virtuous",
    "Scholarly Study": "practical",
    "Sell Artifacts": "ruthless",
    "Share Freely": "virtuous",
    "Academic Study": "practical",
    "Secret Knowledge": "ruthless",
    "Share with All": "virtuous",
    "Add to Treasury": "practical",
    "Keep for Leadership": "ruthless",
    "Preserve Carefully": "virtuous",
    "Harvest Sustainably": "practical",
    "Exploit Fully": "ruthless",
    "Celebrate": "virtuous",
    "Work Hard": "practical",
    "Military Exercises": "ruthless",
    "Defensive Drills": "virtuous",
    "Equipment Focus": "practical",
    "Aggressive Training": "ruthless",
    "Rehabilitation": "virtuous",
    "Regulate & Tax": "practical",
    "Crush with Force": "ruthless",
    "Relocate Peacefully": "virtuous",
    "Hire Hunters": "practical",
    "Mobilize Army": "ruthless",
    "Consecrate Land": "virtuous",
    "Mobilize Troops": "practical",
    "Burn Everything": "ruthless",
    "Investigate Respectfully": "virtuous",
    "Monitor & Contain": "practical",
    "Heretics Burn": "ruthless",
    "256": "ruthless",  # Special case for Feud ruthless
}


def normalize_skill(skill: str) -> str:
    """Normalize skill name to lowercase and remove punctuation."""
    skill = skill.strip().lower()
    # Remove trailing punctuation
    skill = re.sub(r'[.,;:!?]+$', '', skill)
    return skill


def parse_skills(skills_str: str) -> List[str]:
    """Parse comma-separated skills string into list of normalized skills."""
    if not skills_str or skills_str.strip() == '':
        return []
    
    skills = [normalize_skill(s) for s in skills_str.split(',')]
    return [s for s in skills if s]  # Remove empty strings


def build_skills_mapping(csv_path: Path) -> Dict[str, Dict[str, Tuple[List[str], List[str]]]]:
    """
    Build mapping of event -> approach -> (existing_skills, skills_to_add).
    
    Returns:
        {
            'criminal-trial.ts': {
                'virtuous': (['religion', 'diplomacy'], ['performance']),
                'practical': (['society', 'diplomacy'], ['nature']),
                ...
            },
            ...
        }
    """
    mapping = {}
    
    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        
        current_event = None
        
        for row in reader:
            # Each row is one approach for an event
            event_name = row['Name'].strip()
            approach_descriptor = row['Approach Descriptor'].strip()
            existing_skills_str = row['Skills'].strip()
            add_skills_str = row.get('', '').strip()  # The Add column (4th column)
            
            # Find the Add column - it's the 4th column (index 3)
            # CSV columns: Name, Approach, Skills, <empty>, Skill Count, ...
            # The Add skills are in the column after Skills
            row_values = list(row.values())
            if len(row_values) > 3:
                add_skills_str = row_values[3].strip()
            else:
                add_skills_str = ''
            
            # Get the event file name
            if event_name and event_name in EVENT_FILE_MAP:
                current_event = EVENT_FILE_MAP[event_name]
            
            if not current_event:
                continue
            
            # Get approach ID
            approach_id = APPROACH_MAP.get(approach_descriptor)
            if not approach_id:
                print(f"WARNING: Unknown approach descriptor '{approach_descriptor}' for {event_name}")
                continue
            
            # Parse skills
            existing_skills = parse_skills(existing_skills_str)
            add_skills = parse_skills(add_skills_str)
            
            # Initialize event mapping if needed
            if current_event not in mapping:
                mapping[current_event] = {}
            
            # Store the mapping
            mapping[current_event][approach_id] = (existing_skills, add_skills)
    
    return mapping


def update_skills_array(existing: List[str], to_add: List[str], replace: bool) -> List[str]:
    """
    Update skills array based on rules.
    
    Args:
        existing: Current skills in the code (from CSV Skills column)
        to_add: Skills from Add column
        replace: True if Skills column was empty (means replace entirely)
    
    Returns:
        Updated skills list with 'applicable lore' at the end
    """
    if replace:
        # Replace: use only the skills from Add column
        result = to_add.copy()
    else:
        # Add: merge existing with new skills (avoid duplicates)
        result = existing.copy()
        for skill in to_add:
            if skill not in result and skill != 'applicable lore':
                result.append(skill)
    
    # Always ensure 'applicable lore' is at the end
    result = [s for s in result if s != 'applicable lore']
    result.append('applicable lore')
    
    return result


def main():
    csv_path = Path('docs/planning/EVENT_SKILLS_TABLE_add.csv')
    events_dir = Path('src/pipelines/events')
    
    # Parse CSV and build mapping
    print("Parsing CSV...")
    skills_mapping = build_skills_mapping(csv_path)
    
    print(f"\nFound skill updates for {len(skills_mapping)} events:")
    for event_file, approaches in skills_mapping.items():
        print(f"  {event_file}: {len(approaches)} approaches")
        for approach, (existing, add) in approaches.items():
            if add:
                replace = len(existing) == 0
                action = "REPLACE" if replace else "ADD"
                print(f"    - {approach}: {action} {add}")
    
    print(f"\nTotal updates to make: {sum(len(a) for a in skills_mapping.values())}")
    print("\nTo apply updates, we need to modify the TypeScript files.")
    print("This script has generated the mapping. Next step: update the .ts files.")
    
    # Output the mapping as JSON for use in another script
    import json
    output = {}
    for event_file, approaches in skills_mapping.items():
        output[event_file] = {}
        for approach, (existing, add) in approaches.items():
            replace = len(existing) == 0
            final_skills = update_skills_array(existing, add, replace)
            output[event_file][approach] = {
                'existing': existing,
                'add': add,
                'replace': replace,
                'final': final_skills
            }
    
    output_path = Path('buildscripts/event-skills-mapping.json')
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(output, f, indent=2)
    
    print(f"\nMapping saved to: {output_path}")


if __name__ == '__main__':
    main()
