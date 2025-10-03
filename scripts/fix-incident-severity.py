#!/usr/bin/env python3
"""
Remove redundant severity field from incidents (tier already captures this)
"""
import json
from pathlib import Path

def fix_incident_severity():
    incidents_path = Path('dist/incidents.json')
    
    with open(incidents_path, 'r', encoding='utf-8') as f:
        incidents = json.load(f)
    
    # Remove severity field and normalize tier to lowercase
    removed_count = 0
    for incident in incidents:
        if 'severity' in incident:
            del incident['severity']
            removed_count += 1
        
        # Also normalize tier to lowercase (MINOR -> minor)
        if 'tier' in incident and isinstance(incident['tier'], str):
            incident['tier'] = incident['tier'].lower()
    
    # Write back with nice formatting
    with open(incidents_path, 'w', encoding='utf-8') as f:
        json.dump(incidents, f, indent=4, ensure_ascii=False)
    
    print(f"✅ Removed 'severity' from {removed_count} incidents")
    print(f"✅ Normalized tier values to lowercase for {len(incidents)} incidents")

if __name__ == '__main__':
    fix_incident_severity()
