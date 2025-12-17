#!/usr/bin/env python3
"""
Analyze event approaches and suggest skill additions.

This script examines each event's strategic approaches and identifies
opportunities to add underrepresented skills.
"""

import os
import re
from pathlib import Path

# Underrepresented skills to prioritize
UNDERREPRESENTED = {
    'arcana': 'Wizard',
    'occultism': 'Wizard', 
    'athletics': 'Warrior',
    'acrobatics': 'Rogue',
    'medicine': 'Priest/Healer',
    'crafting': 'Artisan',
    'lore': 'Scholar'
}

def extract_event_details(filepath):
    """Extract event details including approaches and skills."""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    event_name = filepath.stem
    
    # Find strategic choice options
    approaches = []
    
    # Pattern for approach definitions
    approach_pattern = r"{\s*id:\s*['\"]([^'\"]+)['\"]\s*,\s*label:\s*['\"]([^'\"]+)['\"]\s*,\s*description:\s*['\"]([^'\"]+)['\"]\s*,\s*icon:[^,]+,\s*skills:\s*\[([^\]]+)\]"
    
    for match in re.finditer(approach_pattern, content, re.DOTALL):
        approach_id = match.group(1)
        label = match.group(2)
        description = match.group(3)
        skills_str = match.group(4)
        
        # Extract individual skills
        skill_matches = re.findall(r"['\"]([^'\"]+)['\"]", skills_str)
        skills = [s.lower() for s in skill_matches if s.lower() != 'applicable lore']
        if 'applicable lore' in skills_str.lower():
            skills.append('lore')
        
        approaches.append({
            'id': approach_id,
            'label': label,
            'description': description,
            'skills': skills
        })
    
    return {
        'name': event_name,
        'approaches': approaches
    }

def suggest_skill_additions(event):
    """Suggest underrepresented skills that could fit each approach."""
    suggestions = []
    
    for approach in event['approaches']:
        approach_suggestions = []
        
        # Check approach description and label for keywords
        text = (approach['label'] + ' ' + approach['description']).lower()
        
        # Arcana/Occultism - magical, arcane, mystical, enchanted
        if any(word in text for word in ['magic', 'arcane', 'mystical', 'enchanted', 'spell', 'ritual', 'supernatural', 'otherworldly']):
            if 'arcana' not in approach['skills'] and 'occultism' not in approach['skills']:
                approach_suggestions.append('arcana or occultism')
        
        # Athletics - physical, strength, labor, construction, rescue
        if any(word in text for word in ['physical', 'strength', 'force', 'labor', 'construction', 'build', 'rescue', 'climb', 'swim']):
            if 'athletics' not in approach['skills']:
                approach_suggestions.append('athletics')
        
        # Medicine - healing, medical, health, disease, injury, treatment
        if any(word in text for word in ['heal', 'medical', 'health', 'disease', 'injury', 'treatment', 'sick', 'wounded', 'care', 'recovery']):
            if 'medicine' not in approach['skills']:
                approach_suggestions.append('medicine')
        
        # Crafting - craft, build, repair, create, infrastructure, equipment
        if any(word in text for word in ['craft', 'build', 'repair', 'create', 'infrastructure', 'equipment', 'tool', 'manufacture', 'construct']):
            if 'crafting' not in approach['skills']:
                approach_suggestions.append('crafting')
        
        # Lore - knowledge, research, history, ancient, study, scholarly
        if any(word in text for word in ['knowledge', 'research', 'history', 'ancient', 'study', 'scholarly', 'academic', 'lore', 'records']):
            if 'lore' not in approach['skills']:
                approach_suggestions.append('lore')
        
        # Acrobatics - agility, quick, nimble, evasive, acrobatic
        if any(word in text for word in ['agility', 'quick', 'nimble', 'evasive', 'acrobatic', 'dodge', 'maneuver']):
            if 'acrobatics' not in approach['skills']:
                approach_suggestions.append('acrobatics')
        
        if approach_suggestions:
            suggestions.append({
                'approach': approach['label'],
                'current_skills': approach['skills'],
                'suggestions': approach_suggestions
            })
    
    return suggestions

def main():
    # Find all event pipeline files
    events_dir = Path('src/pipelines/events')
    event_files = sorted(events_dir.glob('*.ts'))
    
    print("=" * 100)
    print("EVENT APPROACHES AND SKILL IMPROVEMENT OPPORTUNITIES")
    print("=" * 100)
    print("\nUnderrepresented Skills to Add:")
    for skill, archetype in UNDERREPRESENTED.items():
        print(f"  • {skill} ({archetype})")
    print("\n" + "=" * 100)
    
    events_with_suggestions = []
    
    for event_file in event_files:
        event = extract_event_details(event_file)
        suggestions = suggest_skill_additions(event)
        
        if suggestions:
            events_with_suggestions.append((event, suggestions))
    
    # Print events with improvement opportunities
    print(f"\nFound {len(events_with_suggestions)} events with skill addition opportunities:\n")
    
    for event, suggestions in events_with_suggestions:
        print(f"\n{'=' * 100}")
        print(f"EVENT: {event['name']}")
        print(f"{'=' * 100}")
        
        for suggestion in suggestions:
            print(f"\n  Approach: {suggestion['approach']}")
            print(f"  Current Skills: {', '.join(suggestion['current_skills'])}")
            print(f"  ✅ ADD: {', '.join(suggestion['suggestions'])}")
    
    # Also print all events for reference
    print("\n\n" + "=" * 100)
    print("COMPLETE EVENT REFERENCE (All Events)")
    print("=" * 100)
    
    for event_file in event_files:
        event = extract_event_details(event_file)
        print(f"\n{'=' * 100}")
        print(f"EVENT: {event['name']}")
        print(f"{'=' * 100}")
        
        if not event['approaches']:
            print("  ⚠️  No strategic approaches found (may be non-choice event)")
            continue
        
        for i, approach in enumerate(event['approaches'], 1):
            print(f"\n  {i}. {approach['label']} ({approach['id']})")
            print(f"     Description: {approach['description']}")
            print(f"     Skills: {', '.join(approach['skills'])}")

if __name__ == '__main__':
    main()
