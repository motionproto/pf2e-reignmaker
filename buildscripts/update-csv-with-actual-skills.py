#!/usr/bin/env python3
"""
Extract actual skills from event pipeline TypeScript files and update CSV.
"""

import re
import csv
from pathlib import Path

# Map event names to their file names
EVENT_FILE_MAP = {
    '1. Criminal Trial': 'criminal-trial.ts',
    '2. Feud': 'feud.ts',
    '3. Inquisition': 'inquisition.ts',
    '4. Public Scandal': 'public-scandal.ts',
    '5. Plague': 'plague.ts',
    '6. Food Shortage': 'food-shortage.ts',
    '7. Natural Disaster': 'natural-disaster.ts',
    '8. Immigration': 'immigration.ts',
    '9. Assassination Attempt': 'assassination-attempt.ts',
    '10. Crime Wave': 'crime-wave.ts',
    '11. Notorious Heist': 'notorious-heist.ts',
    '12. Bandit Activity': 'bandit-activity.ts',
    '13. Raiders': 'raiders.ts',
    '14. Trade Agreement': 'trade-agreement.ts',
    '15. Economic Surge': 'economic-surge.ts',
    '16. Food Surplus': 'food-surplus.ts',
    '17. Boomtown': 'boomtown.ts',
    '18. Land Rush': 'land-rush.ts',
    '19. Pilgrimage': 'pilgrimage.ts',
    '20. Diplomatic Overture': 'diplomatic-overture.ts',
    '21. Festive Invitation': 'festive-invitation.ts',
    '22. Visiting Celebrity': 'visiting-celebrity.ts',
    '23. Grand Tournament': 'grand-tournament.ts',
    '24. Archaeological Find': 'archaeological-find.ts',
    '25. Magical Discovery': 'magical-discovery.ts',
    '26. Remarkable Treasure': 'remarkable-treasure.ts',
    '27. Scholarly Discovery': 'scholarly-discovery.ts',
    "28. Nature's Blessing": 'natures-blessing.ts',
    '29. Good Weather': 'good-weather.ts',
    '30. Military Exercises': 'military-exercises.ts',
    '31. Drug Den': 'drug-den.ts',
    '32. Monster Attack': 'monster-attack.ts',
    '33. Undead Uprising': 'undead-uprising.ts',
    '34. Cult Activity': 'cult-activity.ts',
}

APPROACH_MAP = {
    'Virtuous': 'virtuous',
    'Practical': 'practical',
    'Ruthless': 'ruthless'
}

def extract_skills_from_file(filepath: Path, approach_id: str):
    """Extract skills array for a specific approach from a TypeScript file."""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Find the approach block - skills array is on the same line as "skills:"
    pattern = rf"id:\s*'{approach_id}'[^}}]+skills:\s*\[([^\]]+)\]"
    match = re.search(pattern, content, re.DOTALL)
    
    if match:
        skills_str = match.group(1)
        # Extract skill names from the array
        skills = re.findall(r"'([^']+)'", skills_str)
        # Remove 'applicable lore' if present
        skills = [s for s in skills if s != 'applicable lore']
        return skills
    
    return []

def main():
    events_dir = Path('src/pipelines/events')
    csv_path = Path('docs/planning/EVENT_SKILLS_TABLE.csv')
    
    # Read CSV
    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        rows = list(reader)
    
    updated_count = 0
    last_event_name = None
    
    # Update skills for each row
    for row in rows:
        event_name = row['Name']
        approach = row['Approach']
        
        # Track the last valid event name (for rows where Name is empty)
        if event_name:
            last_event_name = event_name
        elif last_event_name:
            event_name = last_event_name
        
        if event_name in EVENT_FILE_MAP and approach in APPROACH_MAP:
            filename = EVENT_FILE_MAP[event_name]
            filepath = events_dir / filename
            approach_id = APPROACH_MAP[approach]
            
            if filepath.exists():
                skills = extract_skills_from_file(filepath, approach_id)
                if skills:
                    row['Skills'] = ', '.join(skills)
                    row['Skill Count'] = str(len(skills))
                    print(f"✓ {event_name} - {approach}: {', '.join(skills)}")
                    updated_count += 1
                else:
                    print(f"✗ No skills found for {event_name} - {approach}")
            else:
                print(f"✗ File not found: {filepath}")
    
    # Write updated CSV
    with open(csv_path, 'w', encoding='utf-8', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=reader.fieldnames)
        writer.writeheader()
        writer.writerows(rows)
    
    print(f"\n✅ Updated {csv_path} ({updated_count} rows updated)")

if __name__ == '__main__':
    main()
