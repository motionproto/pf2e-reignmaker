#!/usr/bin/env python3
"""
Migration script to convert skill structures from ad-hoc bonus/skills properties
to structured gameEffects format.

Converts:
  { "bonus": 2, "skills": ["diplomacy", "society"] }

To:
  { "gameEffects": [
      { "type": "settlementSkillBonus", "skill": "diplomacy", "value": 2 },
      { "type": "settlementSkillBonus", "skill": "society", "value": 2 }
    ]
  }
"""

import json
from pathlib import Path

def migrate_skill_structure_tier(tier):
    """Migrate a single tier from bonus/skills to gameEffects."""
    # Get bonus and skills
    bonus = tier.get('bonus', 0)
    skills = tier.get('skills', [])
    
    if not skills:
        print(f"  ⚠️  Tier {tier.get('name')} has no skills, skipping")
        return False
    
    # Create gameEffects array
    game_effects = []
    for skill in skills:
        game_effects.append({
            "type": "settlementSkillBonus",
            "skill": skill,
            "value": bonus
        })
    
    # Add gameEffects to tier
    tier['gameEffects'] = game_effects
    
    # Remove old properties
    if 'bonus' in tier:
        del tier['bonus']
    if 'skills' in tier:
        del tier['skills']
    
    return True

def migrate_skill_structure_file(filepath):
    """Migrate a skill structure file."""
    print(f"Processing {filepath.name}...")
    
    with open(filepath, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    # Verify this is a skill structure
    if data.get('type') != 'skill':
        print(f"  ⚠️  Not a skill structure, skipping")
        return 0
    
    # Check if this file has tiers
    if 'tiers' not in data:
        print(f"  ⚠️  No 'tiers' found, skipping")
        return 0
    
    changes_count = 0
    
    # Process each tier
    for tier in data['tiers']:
        if migrate_skill_structure_tier(tier):
            changes_count += 1
    
    # Write back the migrated data
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write('\n')  # Add trailing newline
    
    print(f"  ✅ Migrated {changes_count} tiers")
    return changes_count

def main():
    """Process all skill structure files in data/structures/"""
    structures_dir = Path(__file__).parent.parent / "data" / "structures"
    
    if not structures_dir.exists():
        print(f"❌ Directory not found: {structures_dir}")
        return
    
    print(f"🔍 Scanning {structures_dir}\n")
    
    # Get all skill structure files
    skill_files = sorted(structures_dir.glob("skill-*.json"))
    
    if not skill_files:
        print("❌ No skill structure files found")
        return
    
    total_tiers = 0
    total_files = 0
    
    for filepath in skill_files:
        tiers = migrate_skill_structure_file(filepath)
        total_tiers += tiers
        total_files += 1
    
    print(f"\n✨ Complete! Processed {total_files} files, migrated {total_tiers} tiers")

if __name__ == "__main__":
    main()
