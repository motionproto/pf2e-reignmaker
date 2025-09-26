#!/usr/bin/env python3
"""
Add ifUnresolved field to all event JSON files based on their behavior patterns.
"""

import json
from pathlib import Path

# Define the behavior patterns for each event
EVENT_BEHAVIORS = {
    # Continuous events (become modifiers)
    "bandit-activity": "continuous",
    "cult-activity": "continuous",
    "demand-structure": "continuous",
    "demand-expansion": "continuous",
    "drug-den": "continuous",
    "feud": "continuous",
    "food-shortage": "continuous",
    "inquisition": "continuous",
    "plague": "continuous",
    "raiders": "continuous",
    "undead-uprising": "continuous",
    
    # Auto-resolve events
    "assassination-attempt": "autoResolve",
    "local-disaster": "autoResolve",
    "natural-disaster": "autoResolve",
    "public-scandal": "autoResolve",
    "monster-attack": "autoResolve",
    
    # Expiring events (opportunity lost)
    "archaeological-find": "expires",
    "boomtown": "expires",
    "diplomatic-overture": "expires",
    "economic-surge": "expires",
    "festive-invitation": "expires",
    "food-surplus": "expires",
    "good-weather": "expires",
    "grand-tournament": "expires",
    "immigration": "expires",
    "justice-prevails": "expires",
    "land-rush": "expires",
    "magical-discovery": "expires",
    "military-exercises": "expires",
    "natures-blessing": "expires",
    "notorious-heist": "expires",
    "pilgrimage": "expires",
    "remarkable-treasure": "expires",
    "scholarly-discovery": "expires",
    "sensational-crime": "expires",
    "trade-agreement": "expires",
    "visiting-celebrity": "expires"
}

def create_continuous_unresolved(event_id, event_data):
    """Create ifUnresolved for continuous events."""
    # Get failure effects from the event data if available
    failure_effects = {}
    if "stages" in event_data and len(event_data["stages"]) > 0:
        failure = event_data["stages"][0].get("failure", {})
        for modifier in failure.get("modifiers", []):
            selector = modifier.get("selector")
            value = modifier.get("value", 0)
            if selector == "unrest":
                failure_effects["unrest"] = value
            elif selector == "gold":
                failure_effects["gold"] = value
            elif selector == "resources":
                failure_effects["resources"] = value
            elif selector == "food":
                failure_effects["food"] = value
    
    # Default effects if none found
    if not failure_effects:
        failure_effects = {"unrest": 1}
    
    # Get skills from event
    skills = []
    if "stages" in event_data and len(event_data["stages"]) > 0:
        skills = event_data["stages"][0].get("skills", [])
    
    return {
        "type": "continuous",
        "continuous": {
            "becomesModifier": True,
            "modifierTemplate": {
                "name": f"pf2e-reignmaker.events.{event_id}.unresolved.name",
                "description": f"pf2e-reignmaker.events.{event_id}.unresolved.description",
                "duration": "until-resolved",
                "severity": "dangerous",
                "effects": failure_effects,
                "resolution": {
                    "skills": skills
                }
            }
        }
    }

def create_autoresolve_unresolved(event_id, event_data):
    """Create ifUnresolved for auto-resolving events."""
    transforms_to = None
    if event_id == "assassination-attempt":
        transforms_to = "security-crisis"
    elif event_id == "monster-attack":
        transforms_to = "monster-lair-nearby"
    elif event_id == "local-disaster":
        transforms_to = "disaster-recovery"
    elif event_id == "natural-disaster":
        transforms_to = "relief-efforts"
    elif event_id == "public-scandal":
        transforms_to = "ongoing-scandal"
    
    result = {
        "type": "autoResolve",
        "autoResolve": {
            "outcome": "failure",
            "message": f"pf2e-reignmaker.events.{event_id}.unresolved.msg"
        }
    }
    
    if transforms_to:
        result["transforms"] = {
            "newEventId": transforms_to,
            "message": f"pf2e-reignmaker.events.{event_id}.unresolved.transforms"
        }
    
    return result

def create_expires_unresolved(event_id, event_data):
    """Create ifUnresolved for expiring events."""
    # Some events have special expiration effects
    special_expirations = {
        "archaeological-find": {
            "effects": {"resources": 1},
            "turnsUntilTransform": 3,
            "transformsTo": "cursed-excavation"
        },
        "food-surplus": {
            "turnsUntilSpoilage": 2,
            "spoilageEffect": {"unrest": 1}
        },
        "immigration": {
            "turnsUntilTension": 2,
            "tensionEffect": {"unrest": 1}
        },
        "remarkable-treasure": {
            "turnsUntilDispute": 2,
            "disputeEffect": {"unrest": 1}
        },
        "sensational-crime": {
            "transformsTo": "crime-wave"
        },
        "justice-prevails": {
            "transformsTo": "miscarriage-of-justice"
        }
    }
    
    result = {
        "type": "expires",
        "expires": {
            "message": f"pf2e-reignmaker.events.{event_id}.unresolved.expires"
        }
    }
    
    if event_id in special_expirations:
        result["expires"].update(special_expirations[event_id])
    
    return result

def process_event_file(file_path):
    """Process a single event JSON file."""
    event_id = file_path.stem
    
    # Read the existing data
    try:
        with open(file_path, 'r') as f:
            event_data = json.load(f)
    except Exception as e:
        print(f"  ✗ Error reading {file_path.name}: {e}")
        return False
    
    # Check if already has ifUnresolved
    if "ifUnresolved" in event_data:
        print(f"  ⏭ Skipping {event_id} (already has ifUnresolved)")
        return True
    
    # Determine behavior type
    if event_id not in EVENT_BEHAVIORS:
        print(f"  ⚠ Warning: {event_id} not in behavior mapping, skipping")
        return False
    
    behavior_type = EVENT_BEHAVIORS[event_id]
    
    # Create appropriate ifUnresolved structure
    if behavior_type == "continuous":
        event_data["ifUnresolved"] = create_continuous_unresolved(event_id, event_data)
    elif behavior_type == "autoResolve":
        event_data["ifUnresolved"] = create_autoresolve_unresolved(event_id, event_data)
    elif behavior_type == "expires":
        event_data["ifUnresolved"] = create_expires_unresolved(event_id, event_data)
    
    # Write back the updated data
    try:
        with open(file_path, 'w') as f:
            json.dump(event_data, f, indent=2)
        print(f"  ✓ Updated {event_id} with {behavior_type} behavior")
        return True
    except Exception as e:
        print(f"  ✗ Error writing {file_path.name}: {e}")
        return False

def main():
    """Process all event files."""
    events_dir = Path(__file__).parent.parent / "data" / "events"
    
    print("=" * 60)
    print("ADDING UNRESOLVED BEHAVIOR TO EVENTS")
    print("=" * 60)
    
    # Get all event JSON files
    event_files = sorted(events_dir.glob("*.json"))
    
    print(f"\nFound {len(event_files)} event files")
    print(f"Processing...\n")
    
    success_count = 0
    for file_path in event_files:
        if process_event_file(file_path):
            success_count += 1
    
    print("\n" + "=" * 60)
    print(f"✅ Successfully updated {success_count}/{len(event_files)} event files")
    
    # Run combine script to update dist/events.json
    print("\nRunning combine-data.py to update dist/events.json...")
    import subprocess
    result = subprocess.run(
        ["python3", str(Path(__file__).parent / "combine-data.py")],
        capture_output=True,
        text=True
    )
    if result.returncode == 0:
        print("✅ dist/events.json updated successfully")
    else:
        print(f"⚠️ Error updating dist/events.json: {result.stderr}")

if __name__ == "__main__":
    main()
