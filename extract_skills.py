#!/usr/bin/env python3
import json
import os
from pathlib import Path

def extract_skills_from_events():
    """Extract all unique skills from event JSON files"""
    skills = set()
    events_dir = Path("data/events")
    
    for file_path in events_dir.glob("*.json"):
        if file_path.name in ["add_all_event_translations.py", "add_event_translations.sh", 
                               "clean_event_translations.py", "create_all_events.py"]:
            continue
            
        try:
            with open(file_path, 'r') as f:
                data = json.load(f)
                for stage in data.get('stages', []):
                    skills.update(stage.get('skills', []))
        except (json.JSONDecodeError, KeyError) as e:
            print(f"Error processing {file_path}: {e}")
    
    return sorted(skills)

if __name__ == "__main__":
    skills = extract_skills_from_events()
    print("Found skills in event files:")
    for skill in skills:
        print(f"  - {skill}")
    
    print(f"\nTotal: {len(skills)} unique skills")
