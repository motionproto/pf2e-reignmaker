#!/usr/bin/env python3
"""
Normalize event JSON files to standardized structure.

Changes:
- Add tier: 1 (default)
- Add endsEvent to each outcome
- Rename selector → resource
- Remove: priority, severity, type, enabled, dc fields
- Standardize duration values
- Remove escalation sections
- Simplify ifUnresolved structure
"""

import json
from pathlib import Path

def normalize_modifier(mod_data):
    """Normalize a single modifier to standard format."""
    normalized = {
        "name": mod_data.get("name", ""),
        "resource": mod_data.get("selector", mod_data.get("resource", "gold")),
        "value": mod_data.get("value", 0),
        "duration": mod_data.get("duration", "immediate")
    }
    
    # Map old turns field
    if "turns" in mod_data:
        normalized["turns"] = mod_data["turns"]
        if normalized["duration"] == "immediate":
            normalized["duration"] = "turns"
    
    return normalized

def normalize_outcome(outcome_data, default_ends_event=True):
    """Normalize an event outcome."""
    modifiers = outcome_data.get("modifiers", [])
    
    return {
        "msg": outcome_data.get("msg", ""),
        "endsEvent": default_ends_event,
        "modifiers": [normalize_modifier(m) for m in modifiers]
    }

def normalize_event(event_data):
    """Normalize a complete event."""
    normalized = {
        "id": event_data["id"],
        "name": event_data["name"],
        "description": event_data["description"],
        "tier": event_data.get("tier", 1),
        "traits": event_data.get("traits", [])
    }
    
    # Optional location
    if "location" in event_data:
        normalized["location"] = event_data["location"]
    
    # Skills (no changes needed)
    normalized["skills"] = event_data.get("skills", [])
    
    # Normalize effects
    effects = event_data.get("effects", {})
    normalized_effects = {}
    
    # Determine which outcomes should end the event
    resolved_on = event_data.get("resolvedOn", ["criticalSuccess", "success"])
    
    for outcome_level in ["criticalSuccess", "success", "failure", "criticalFailure"]:
        if outcome_level in effects:
            ends_event = outcome_level in resolved_on
            normalized_effects[outcome_level] = normalize_outcome(
                effects[outcome_level], 
                ends_event
            )
    
    normalized["effects"] = normalized_effects
    
    # Handle ifUnresolved (simplified - no escalation)
    if "ifUnresolved" in event_data:
        unresolved = event_data["ifUnresolved"]
        
        if unresolved.get("type") == "continuous":
            continuous = unresolved.get("continuous", {})
            mod_template = continuous.get("modifierTemplate", {})
            
            # Extract modifiers from effects
            ongoing_modifiers = []
            effects_data = mod_template.get("effects", {})
            for resource, value in effects_data.items():
                ongoing_modifiers.append({
                    "name": mod_template.get("name", "Ongoing Effect"),
                    "resource": resource,
                    "value": value,
                    "duration": "ongoing"
                })
            
            normalized_unresolved = {
                "name": mod_template.get("name", "Ongoing Effect"),
                "description": mod_template.get("description", ""),
                "tier": 1,
                "icon": mod_template.get("icon", "fas fa-exclamation-triangle"),
                "modifiers": ongoing_modifiers
            }
            
            # Add resolution conditions
            resolution = mod_template.get("resolution", {})
            if resolution:
                normalized_unresolved["resolvedWhen"] = {
                    "type": "skill",
                    "skillResolution": {
                        "dcAdjustment": 0  # Always level-based
                    }
                }
                
                if "onResolution" in resolution:
                    normalized_unresolved["resolvedWhen"]["skillResolution"]["onSuccess"] = {
                        "msg": resolution["onResolution"].get("successMsg", "Resolved!"),
                        "removeAllModifiers": True
                    }
                    normalized_unresolved["resolvedWhen"]["skillResolution"]["onFailure"] = {
                        "msg": resolution["onResolution"].get("failureMsg", "Failed to resolve")
                    }
            
            normalized["ifUnresolved"] = normalized_unresolved
    
    return normalized

def normalize_all_events():
    """Normalize all event JSON files."""
    events_dir = Path(".")
    json_files = list(events_dir.glob("*.json"))
    
    print(f"\n📚 Processing {len(json_files)} event files...")
    
    normalized_count = 0
    
    for json_file in json_files:
        try:
            # Read original
            with open(json_file, 'r') as f:
                event_data = json.load(f)
            
            # Normalize
            normalized = normalize_event(event_data)
            
            # Write back
            with open(json_file, 'w') as f:
                json.dump(normalized, f, indent=2)
            
            print(f"  ✅ Normalized: {json_file.name}")
            normalized_count += 1
            
        except Exception as e:
            print(f"  ❌ Error processing {json_file.name}: {e}")
    
    print(f"\n🎉 Successfully normalized {normalized_count} event files")

if __name__ == '__main__':
    normalize_all_events()
