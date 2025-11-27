#!/usr/bin/env python3
"""
Add 'Supports: [skills]' manualEffects to all skill structures (tiers 1-4).
Tier 4 already has the reroll effect, so we append the supports line.
"""

import json
import os
from pathlib import Path

# Define the skill structure files and their skills
SKILL_STRUCTURES = {
    'skill-civic-governance.json': ['Society', 'Diplomacy', 'Deception'],
    'skill-crafting-trade.json': ['Crafting', 'Lore', 'Society'],
    'skill-exploration-wilderness.json': ['Survival', 'Nature', 'Stealth'],
    'skill-faith-nature.json': ['Religion', 'Medicine', 'Nature'],
    'skill-knowledge-magic.json': ['Lore', 'Arcana', 'Occultism'],
    'skill-medicine-healing.json': ['Medicine', 'Lore', 'Arcana'],
    'skill-military-training.json': ['Athletics', 'Acrobatics', 'Intimidation'],
    'skill-performance-culture.json': ['Performance', 'Diplomacy', 'Lore']
}

def get_skills_for_tier(tier_data):
    """Extract skill names from gameEffects."""
    skills = []
    if 'gameEffects' in tier_data:
        for effect in tier_data['gameEffects']:
            if effect.get('type') == 'settlementSkillBonus':
                skill = effect.get('skill', '').capitalize()
                if skill and skill not in skills:
                    skills.append(skill)
    return skills

def process_file(filepath):
    """Add manualEffects to all tiers in a skill structure file."""
    print(f"\nProcessing: {filepath.name}")
    
    with open(filepath, 'r') as f:
        data = json.load(f)
    
    modified = False
    
    for tier in data.get('tiers', []):
        # Get skills for this tier
        skills = get_skills_for_tier(tier)
        
        if not skills:
            continue
        
        # Create the supports message
        supports_msg = f"Supports: {', '.join(skills)}"
        
        # Initialize manualEffects if not present
        if 'manualEffects' not in tier:
            tier['manualEffects'] = []
        
        # Check if supports message already exists
        if supports_msg not in tier['manualEffects']:
            # Add supports message at the beginning
            tier['manualEffects'].insert(0, supports_msg)
            modified = True
            print(f"  ✓ Added '{supports_msg}' to {tier['name']}")
    
    if modified:
        # Save the file with pretty formatting
        with open(filepath, 'w') as f:
            json.dump(data, f, indent=2)
            f.write('\n')  # Add trailing newline
        print(f"✅ Updated {filepath.name}")
    else:
        print(f"⏭️  No changes needed for {filepath.name}")

def main():
    # Get the data directory
    script_dir = Path(__file__).parent
    data_dir = script_dir.parent / 'data' / 'structures'
    
    print("=" * 60)
    print("ADDING 'Supports:' TO SKILL STRUCTURES")
    print("=" * 60)
    
    # Process each skill structure file (excluding crime-intrigue which we already did)
    for filename in SKILL_STRUCTURES.keys():
        filepath = data_dir / filename
        if filepath.exists():
            process_file(filepath)
        else:
            print(f"⚠️  File not found: {filename}")
    
    print("\n" + "=" * 60)
    print("DONE")
    print("=" * 60)

if __name__ == '__main__':
    main()
