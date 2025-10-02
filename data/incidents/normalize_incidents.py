#!/usr/bin/env python3
"""
Normalize incident JSON files to match events structure.
Removes duplicated effects from skillOptions and moves them to top-level effects.
"""

import json
import os
from pathlib import Path

def normalize_incident(incident_data):
    """
    Convert incident from skillOptions format to events format.
    
    Old format:
      skillOptions: [{skill, description, successEffect, failureEffect, criticalFailureEffect}]
    
    New format:
      skills: [{skill, description}]
      effects: {success: {msg}, failure: {msg}, criticalFailure: {msg}}
    """
    
    # Extract skill options
    skill_options = incident_data.get('skillOptions', [])
    
    if not skill_options:
        print(f"⚠️  Warning: {incident_data['id']} has no skillOptions")
        return incident_data
    
    # Extract effects from first skill (they're all the same)
    first_skill = skill_options[0]
    
    # Build normalized structure
    normalized = {
        'id': incident_data['id'],
        'name': incident_data['name'],
        'tier': incident_data['tier'],
        'description': incident_data['description'],
        'percentileMin': incident_data['percentileMin'],
        'percentileMax': incident_data['percentileMax'],
        'skills': [],
        'effects': {}
    }
    
    # Extract just skill + description
    for skill_option in skill_options:
        normalized['skills'].append({
            'skill': skill_option['skill'],
            'description': skill_option['description']
        })
    
    # Build effects structure
    if 'successEffect' in first_skill:
        normalized['effects']['success'] = {
            'msg': first_skill['successEffect'],
            'modifiers': []
        }
    
    if 'failureEffect' in first_skill:
        normalized['effects']['failure'] = {
            'msg': first_skill['failureEffect'],
            'modifiers': []
        }
    
    if 'criticalFailureEffect' in first_skill:
        normalized['effects']['criticalFailure'] = {
            'msg': first_skill['criticalFailureEffect'],
            'modifiers': []
        }
    
    return normalized


def normalize_all_incidents():
    """Normalize all incident JSON files in minor/, moderate/, major/ folders"""
    
    tiers = ['minor', 'moderate', 'major']
    total_normalized = 0
    
    for tier in tiers:
        tier_dir = Path(tier)
        
        if not tier_dir.exists():
            print(f"❌ Directory {tier}/ not found")
            continue
        
        # Get all JSON files
        json_files = list(tier_dir.glob('*.json'))
        
        print(f"\n📁 Processing {tier}/ ({len(json_files)} files)")
        
        for json_file in json_files:
            try:
                # Read original
                with open(json_file, 'r') as f:
                    incident_data = json.load(f)
                
                # Normalize
                normalized = normalize_incident(incident_data)
                
                # Write back
                with open(json_file, 'w') as f:
                    json.dump(normalized, f, indent=2)
                
                print(f"  ✅ Normalized: {json_file.name}")
                total_normalized += 1
                
            except Exception as e:
                print(f"  ❌ Error processing {json_file.name}: {e}")
    
    print(f"\n🎉 Successfully normalized {total_normalized} incident files")


if __name__ == '__main__':
    # Run from data/incidents/ directory
    normalize_all_incidents()
