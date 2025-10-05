#!/usr/bin/env python3
"""
Add traits field to event and incident JSON files based on Kingdom_Events.md
"""

import json
import os
import re
from pathlib import Path

# Map event names to traits based on Kingdom_Events.md
EVENT_TRAITS = {
    "archaeological-find": ["beneficial"],
    "assassination-attempt": ["dangerous"],
    "bandit-activity": ["dangerous", "ongoing"],
    "boomtown": ["beneficial", "ongoing"],
    "cult-activity": ["dangerous", "ongoing"],
    "demand-expansion": ["dangerous", "ongoing"],
    "demand-structure": ["dangerous", "ongoing"],
    "diplomatic-overture": ["beneficial"],
    "drug-den": ["dangerous", "ongoing"],
    "economic-surge": ["beneficial", "ongoing"],
    "festive-invitation": ["beneficial"],
    "feud": ["dangerous", "ongoing"],
    "food-shortage": ["dangerous", "ongoing"],
    "food-surplus": ["beneficial"],
    "good-weather": ["beneficial", "ongoing"],
    "grand-tournament": ["beneficial"],
    "immigration": ["beneficial"],
    "inquisition": ["dangerous", "ongoing"],
    "justice-prevails": ["beneficial"],
    "land-rush": ["dangerous"],
    "local-disaster": ["dangerous"],
    "magical-discovery": ["beneficial"],
    "military-exercises": ["beneficial"],
    "monster-attack": ["dangerous"],
    "natural-disaster": ["dangerous"],
    "natures-blessing": ["beneficial"],
    "notorious-heist": ["dangerous"],
    "pilgrimage": ["beneficial"],
    "plague": ["dangerous", "ongoing"],
    "public-scandal": ["dangerous"],
    "raiders": ["dangerous", "ongoing"],
    "remarkable-treasure": ["beneficial"],
    "scholarly-discovery": ["beneficial"],
    "sensational-crime": ["dangerous"],
    "trade-agreement": ["beneficial"],
    "undead-uprising": ["dangerous", "ongoing"],
    "visiting-celebrity": ["beneficial"],
}

def add_traits_to_events():
    """Add traits field to all event JSON files"""
    events_dir = Path("data/events")
    
    if not events_dir.exists():
        print(f"❌ Events directory not found: {events_dir}")
        return
    
    count = 0
    for event_file in events_dir.glob("*.json"):
        event_id = event_file.stem
        
        # Skip if we don't have trait info
        if event_id not in EVENT_TRAITS:
            print(f"⚠️  No trait info for: {event_id}")
            continue
        
        # Read current JSON
        with open(event_file, 'r') as f:
            data = json.load(f)
        
        # Add or update traits
        traits = EVENT_TRAITS[event_id]
        data["traits"] = traits
        
        # Write back with nice formatting
        with open(event_file, 'w') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
            f.write('\n')  # Add trailing newline
        
        print(f"✅ {event_id}: {traits}")
        count += 1
    
    print(f"\n✨ Updated {count} event files")

def add_traits_to_incidents():
    """Add traits field to all incident JSON files - all are dangerous"""
    incidents_dir = Path("data/incidents")
    
    if not incidents_dir.exists():
        print(f"❌ Incidents directory not found: {incidents_dir}")
        return
    
    count = 0
    for tier_dir in ["minor", "moderate", "major"]:
        tier_path = incidents_dir / tier_dir
        if not tier_path.exists():
            continue
        
        for incident_file in tier_path.glob("*.json"):
            # Read current JSON
            with open(incident_file, 'r') as f:
                data = json.load(f)
            
            # All incidents are dangerous
            data["traits"] = ["dangerous"]
            
            # Write back with nice formatting
            with open(incident_file, 'w') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
                f.write('\n')  # Add trailing newline
            
            print(f"✅ {tier_dir}/{incident_file.stem}: [\"dangerous\"]")
            count += 1
    
    print(f"\n✨ Updated {count} incident files")

if __name__ == "__main__":
    print("🔧 Adding traits to event and incident JSON files...\n")
    
    add_traits_to_events()
    print()
    add_traits_to_incidents()
    
    print("\n✅ Done! Run 'npm run combine-data' to rebuild combined JSON")
