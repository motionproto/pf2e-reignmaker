#!/usr/bin/env python3
"""
Combine all individual JSON files for events, incidents, and player actions
into their respective monolithic dist/ files.
"""

import json
from pathlib import Path

def combine_events():
    """Combine all event JSON files into dist/events.json."""
    events_dir = Path(__file__).parent.parent / "data" / "events"
    output_file = Path(__file__).parent.parent / "dist" / "events.json"
    
    all_events = []
    event_files = sorted(events_dir.glob("*.json"))
    
    print("\n📚 Processing Events...")
    print(f"Reading event files from: {events_dir}")
    
    for json_file in event_files:
        # Skip combined files or python scripts
        if json_file.name in ["events.json", "all_events.json"]:
            continue
            
        try:
            with open(json_file, 'r') as f:
                event_data = json.load(f)
                all_events.append(event_data)
                print(f"  ✓ Loaded: {json_file.name}")
        except Exception as e:
            print(f"  ✗ Error loading {json_file.name}: {e}")
    
    # Sort events alphabetically by id for consistency
    all_events.sort(key=lambda x: x.get('id', ''))
    
    # Write combined file
    output_file.parent.mkdir(exist_ok=True)
    with open(output_file, 'w') as f:
        json.dump(all_events, f, indent=4)
    
    print(f"✅ Successfully combined {len(all_events)} events")
    print(f"📁 Output written to: {output_file}")
    
    return all_events

def combine_incidents():
    """Combine all incident JSON files into dist/incidents.json, organized by severity."""
    incidents_base_dir = Path(__file__).parent.parent / "data" / "incidents"
    output_file = Path(__file__).parent.parent / "dist" / "incidents.json"
    
    all_incidents = []
    
    print("\n⚠️  Processing Incidents...")
    print(f"Reading incident files from: {incidents_base_dir}")
    
    # Process incidents by severity level (major, moderate, minor)
    severity_order = ["minor", "moderate", "major"]
    
    for severity in severity_order:
        severity_dir = incidents_base_dir / severity
        if severity_dir.exists():
            incident_files = sorted(severity_dir.glob("*.json"))
            print(f"\n  {severity.capitalize()} incidents:")
            
            for json_file in incident_files:
                try:
                    with open(json_file, 'r') as f:
                        incident_data = json.load(f)
                        # Note: We use 'tier' field, not 'severity' (severity is redundant)
                        all_incidents.append(incident_data)
                        print(f"    ✓ Loaded: {json_file.name}")
                except Exception as e:
                    print(f"    ✗ Error loading {json_file.name}: {e}")
    
    # Sort incidents by tier (minor first, then moderate, then major) and then by id
    # Normalize tier from MINOR/MODERATE/MAJOR to lowercase
    tier_priority = {"minor": 0, "moderate": 1, "major": 2}
    all_incidents.sort(key=lambda x: (
        tier_priority.get(x.get('tier', 'MINOR').lower(), 0),
        x.get('id', '')
    ))
    
    # Write combined file
    output_file.parent.mkdir(exist_ok=True)
    with open(output_file, 'w') as f:
        json.dump(all_incidents, f, indent=4)
    
    # Summary by tier
    tier_counts = {}
    for incident in all_incidents:
        tier = incident.get('tier', 'UNKNOWN').lower()
        tier_counts[tier] = tier_counts.get(tier, 0) + 1
    
    print(f"\n✅ Successfully combined {len(all_incidents)} incidents")
    print(f"📁 Output written to: {output_file}")
    print("\nIncidents by tier:")
    for tier in severity_order:  # Still use severity_order for directory structure
        if tier in tier_counts:
            print(f"  {tier}: {tier_counts[tier]} incidents")
    
    return all_incidents

def combine_factions():
    """Combine all faction JSON files into dist/factions.json."""
    factions_dir = Path(__file__).parent.parent / "data" / "factions"
    output_file = Path(__file__).parent.parent / "dist" / "factions.json"
    
    all_factions = []
    faction_files = sorted(factions_dir.glob("*.json"))
    
    print("\n🤝 Processing Factions...")
    print(f"Reading faction files from: {factions_dir}")
    
    for json_file in faction_files:
        # Skip combined files
        if json_file.name in ["factions.json", "all_factions.json"]:
            continue
            
        try:
            with open(json_file, 'r') as f:
                faction_data = json.load(f)
                # If it's a single faction object, wrap in array
                if isinstance(faction_data, dict):
                    all_factions.append(faction_data)
                # If it's already an array, extend
                elif isinstance(faction_data, list):
                    all_factions.extend(faction_data)
                print(f"  ✓ Loaded: {json_file.name}")
        except Exception as e:
            print(f"  ✗ Error loading {json_file.name}: {e}")
    
    # Sort factions by id for consistency
    all_factions.sort(key=lambda x: x.get('id', ''))
    
    # Write combined file
    output_file.parent.mkdir(exist_ok=True)
    with open(output_file, 'w') as f:
        json.dump(all_factions, f, indent=4)
    
    print(f"✅ Successfully combined {len(all_factions)} factions")
    print(f"📁 Output written to: {output_file}")
    
    return all_factions

def combine_player_actions():
    """Combine all player action JSON files into dist/player-actions.json, organized by category."""
    actions_dir = Path(__file__).parent.parent / "data" / "player-actions"
    output_file = Path(__file__).parent.parent / "dist" / "player-actions.json"
    
    all_actions = []
    action_files = sorted(actions_dir.glob("*.json"))
    
    print("\n🎮 Processing Player Actions...")
    print(f"Reading action files from: {actions_dir}")
    
    for json_file in action_files:
        # Skip combined files
        if json_file.name in ["player-actions.json", "all_actions.json"]:
            continue
            
        try:
            with open(json_file, 'r') as f:
                action_data = json.load(f)
                all_actions.append(action_data)
                print(f"  ✓ Loaded: {json_file.name}")
        except Exception as e:
            print(f"  ✗ Error loading {json_file.name}: {e}")
    
    # Categorize actions based on their category field if present, or infer from content
    def get_action_category(action):
        """Determine category based on action category field or id."""
        # First check if category is already defined
        if 'category' in action:
            return action['category']
            
        # Otherwise infer from action id
        action_id = action.get('id', '').lower()
        
        # Define category mappings based on the actual categories found
        if any(x in action_id for x in ['arrest', 'execute', 'pardon']):
            return 'uphold-stability'
        elif any(x in action_id for x in ['deal-with-unrest', 'coordinated']):
            return 'uphold-stability'
        elif any(x in action_id for x in ['recruit', 'outfit', 'deploy', 'train', 'recover', 'disband']):
            return 'military-operations'
        elif any(x in action_id for x in ['claim', 'build-roads', 'send-scouts', 'fortify', 'worksite']):
            return 'expand-borders'
        elif any(x in action_id for x in ['establish-settlement', 'upgrade', 'build-structure', 'repair']):
            return 'urban-planning'
        elif any(x in action_id for x in ['diplomatic', 'infiltration', 'request', 'hire']):
            return 'foreign-affairs'
        elif any(x in action_id for x in ['sell', 'purchase', 'collect-resources', 'stipend']):
            return 'economic-resources'
        else:
            return 'general'
    
    # Add category to each action
    for action in all_actions:
        if 'category' not in action:
            action['category'] = get_action_category(action)
    
    # Sort actions by category and then by id
    all_actions.sort(key=lambda x: (x.get('category', ''), x.get('id', '')))
    
    # Write combined file
    output_file.parent.mkdir(exist_ok=True)
    with open(output_file, 'w') as f:
        json.dump(all_actions, f, indent=4)
    
    # Summary
    category_counts = {}
    for action in all_actions:
        category = action.get('category', 'unknown')
        category_counts[category] = category_counts.get(category, 0) + 1
    
    print(f"\n✅ Successfully combined {len(all_actions)} player actions")
    print(f"📁 Output written to: {output_file}")
    print("\nActions by category:")
    for category in sorted(category_counts.keys()):
        print(f"  {category}: {category_counts[category]} actions")
    
    return all_actions

def main():
    """Run all combination processes."""
    print("=" * 60)
    print("COMBINING ALL KINGDOM DATA FILES")
    print("=" * 60)
    
    # Process each type
    events = combine_events()
    incidents = combine_incidents()
    factions = combine_factions()
    actions = combine_player_actions()
    
    # Final summary
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    print(f"✅ Events: {len(events)} files combined")
    print(f"✅ Incidents: {len(incidents)} files combined")
    print(f"✅ Factions: {len(factions)} files combined")
    print(f"✅ Player Actions: {len(actions)} files combined")
    print("\nAll monolithic JSON files have been created in dist/")
    
    # Also update structures if the script exists
    structures_script = Path(__file__).parent / "combine-structures.py"
    if structures_script.exists():
        print("\n" + "=" * 60)
        print("UPDATING STRUCTURES")
        print("=" * 60)
        import subprocess
        result = subprocess.run(
            ["python3", str(structures_script)],
            capture_output=True,
            text=True
        )
        if result.returncode == 0:
            print("✅ Structures also updated successfully")
        else:
            print(f"⚠️  Error updating structures: {result.stderr}")

if __name__ == "__main__":
    main()
