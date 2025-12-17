#!/usr/bin/env python3
"""
Analyze skill distribution across event pipelines.

This script examines all event pipeline files to:
1. Extract all skill references
2. Count total occurrences per skill
3. Map skills to character archetypes
4. Identify coverage gaps
"""

import os
import re
from collections import defaultdict
from pathlib import Path

# Pathfinder 2e core skills mapped to character archetypes
SKILL_ARCHETYPES = {
    # Martial/Warrior Skills
    'athletics': 'Warrior',
    'intimidation': 'Warrior/Leader',
    
    # Skilled/Rogue Skills
    'acrobatics': 'Rogue',
    'stealth': 'Rogue',
    'thievery': 'Rogue',
    'deception': 'Rogue/Social',
    
    # Social/Face Skills
    'diplomacy': 'Social/Leader',
    'performance': 'Social/Artist',
    'society': 'Scholar/Social',
    
    # Scholar/Wizard Skills
    'arcana': 'Wizard',
    'occultism': 'Wizard',
    'lore': 'Scholar',
    
    # Divine/Priest Skills
    'religion': 'Priest',
    'medicine': 'Priest/Healer',
    
    # Nature/Ranger Skills
    'nature': 'Druid/Ranger',
    'survival': 'Ranger',
    
    # Craft Skills
    'crafting': 'Artisan',
}

def extract_skills_from_file(filepath):
    """Extract all skill references from a TypeScript event file."""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Pattern: { skill: 'skillname', description: '...' }
    skill_pattern = r"{\s*skill:\s*['\"]([^'\"]+)['\"]"
    
    skills_found = []
    for match in re.finditer(skill_pattern, content):
        skill = match.group(1)
        # Handle "applicable lore" as "lore"
        if 'lore' in skill.lower():
            skill = 'lore'
        skills_found.append(skill.lower())
    
    return skills_found

def main():
    # Find all event pipeline files
    events_dir = Path('src/pipelines/events')
    event_files = sorted(events_dir.glob('*.ts'))
    
    # Count skill occurrences
    skill_counts = defaultdict(int)
    event_skill_map = {}
    
    for event_file in event_files:
        skills = extract_skills_from_file(event_file)
        event_name = event_file.stem
        event_skill_map[event_name] = skills
        
        for skill in skills:
            skill_counts[skill] += 1
    
    # Calculate archetype distribution
    archetype_counts = defaultdict(int)
    for skill, count in skill_counts.items():
        archetype = SKILL_ARCHETYPES.get(skill, 'Unknown')
        archetype_counts[archetype] += count
    
    # Generate report
    print("=" * 80)
    print("EVENT PIPELINE SKILL DISTRIBUTION ANALYSIS")
    print("=" * 80)
    print(f"\nTotal Events Analyzed: {len(event_files)}")
    print(f"Total Skill References: {sum(skill_counts.values())}")
    print(f"Unique Skills Used: {len(skill_counts)}")
    
    print("\n" + "=" * 80)
    print("SKILL FREQUENCY (Sorted by Count)")
    print("=" * 80)
    
    # Sort skills by count (descending)
    sorted_skills = sorted(skill_counts.items(), key=lambda x: x[1], reverse=True)
    
    for skill, count in sorted_skills:
        archetype = SKILL_ARCHETYPES.get(skill, 'Unknown')
        percentage = (count / sum(skill_counts.values())) * 100
        print(f"{skill.ljust(20)} {str(count).rjust(4)} ({percentage:5.1f}%)  [{archetype}]")
    
    print("\n" + "=" * 80)
    print("CHARACTER ARCHETYPE DISTRIBUTION")
    print("=" * 80)
    
    sorted_archetypes = sorted(archetype_counts.items(), key=lambda x: x[1], reverse=True)
    for archetype, count in sorted_archetypes:
        percentage = (count / sum(skill_counts.values())) * 100
        print(f"{archetype.ljust(25)} {str(count).rjust(4)} ({percentage:5.1f}%)")
    
    print("\n" + "=" * 80)
    print("PATHFINDER 2E CORE SKILLS - COVERAGE CHECK")
    print("=" * 80)
    
    # All PF2e core skills
    all_pf2e_skills = [
        'acrobatics', 'arcana', 'athletics', 'crafting', 'deception',
        'diplomacy', 'intimidation', 'lore', 'medicine', 'nature',
        'occultism', 'performance', 'religion', 'society', 'stealth',
        'survival', 'thievery'
    ]
    
    print("\nSkills Used:")
    for skill in all_pf2e_skills:
        if skill in skill_counts:
            print(f"  ✓ {skill.ljust(20)} ({skill_counts[skill]} occurrences)")
        else:
            print(f"  ✗ {skill.ljust(20)} (NOT USED)")
    
    print("\n" + "=" * 80)
    print("RECOMMENDATIONS")
    print("=" * 80)
    
    # Check for underrepresented skills (< 5% of total)
    threshold = sum(skill_counts.values()) * 0.03  # 3% threshold
    underrepresented = [(s, c) for s, c in skill_counts.items() if c < threshold]
    
    if underrepresented:
        print("\n⚠️  UNDERREPRESENTED SKILLS (< 3% of total):")
        for skill, count in sorted(underrepresented, key=lambda x: x[1]):
            archetype = SKILL_ARCHETYPES.get(skill, 'Unknown')
            print(f"  • {skill} ({count} uses) - {archetype}")
            print(f"    Consider adding more events that use this skill")
    
    # Check for overrepresented skills (> 15% of total)
    over_threshold = sum(skill_counts.values()) * 0.15
    overrepresented = [(s, c) for s, c in skill_counts.items() if c > over_threshold]
    
    if overrepresented:
        print("\n⚠️  OVERREPRESENTED SKILLS (> 15% of total):")
        for skill, count in sorted(overrepresented, key=lambda x: x[1], reverse=True):
            archetype = SKILL_ARCHETYPES.get(skill, 'Unknown')
            percentage = (count / sum(skill_counts.values())) * 100
            print(f"  • {skill} ({count} uses, {percentage:.1f}%) - {archetype}")
            print(f"    Consider balancing with other skills in this archetype")
    
    # Archetype balance check
    print("\n📊 ARCHETYPE BALANCE:")
    avg_archetype = sum(archetype_counts.values()) / len(archetype_counts)
    for archetype, count in sorted_archetypes:
        diff = count - avg_archetype
        status = "✓ Balanced" if abs(diff) < avg_archetype * 0.3 else "⚠️  Imbalanced"
        print(f"  {status} {archetype}: {count} ({diff:+.0f} from average)")
    
    print("\n" + "=" * 80)
    print("DETAILED EVENT BREAKDOWN")
    print("=" * 80)
    
    for event_name in sorted(event_skill_map.keys()):
        skills = event_skill_map[event_name]
        archetypes = [SKILL_ARCHETYPES.get(s, 'Unknown') for s in skills]
        print(f"\n{event_name}:")
        print(f"  Skills: {', '.join(skills) if skills else 'NONE'}")
        print(f"  Archetypes: {', '.join(set(archetypes)) if archetypes else 'NONE'}")

if __name__ == '__main__':
    main()
