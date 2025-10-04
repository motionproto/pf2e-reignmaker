#!/usr/bin/env python3
"""
Comprehensive cleanup of source event and incident files in data/ directory:
1. Remove top-level 'name' field
2. Remove event-specific fields (traits, location, ifUnresolved, etc.)
3. Add 'tier' field if missing
4. Unify modifier format (selector→resource, remove enabled, consolidate turns)
5. Remove modifier 'name' fields
6. Strip game effects from messages (keep flavor only)
"""

import json
import re
import sys
import os
from pathlib import Path

# Flavor mappings for incidents (when message is only effects)
INCIDENT_FLAVOR = {
    'crime-wave': {
        'success': 'Crime suppressed',
        'failure': 'Crime wave hits',
        'criticalFailure': 'Major crime wave'
    },
    'bandit-activity': {
        'success': 'Bandits deterred',
        'failure': 'Bandit raids',
        'criticalFailure': 'Major bandit raids'
    },
    # Add more as needed
}

def extract_flavor_text(msg, event_id=None, outcome_type=None):
    """Extract only the flavor text, removing all game effect placeholders."""
    if not msg:
        return msg
    
    # Check if this is a string table reference
    if msg.startswith('pf2e-reignmaker.'):
        if event_id and outcome_type and event_id in INCIDENT_FLAVOR:
            if outcome_type in INCIDENT_FLAVOR[event_id]:
                return INCIDENT_FLAVOR[event_id][outcome_type]
        return "Event outcome"
    
    # Split on semicolon (flavor; effects)
    if ';' in msg:
        parts = msg.split(';')
        flavor = parts[0].strip()
        # Remove **event ends** markers
        flavor = re.sub(r'\*\*.*?\*\*', '', flavor).strip()
        return flavor
    
    # Split on colon (flavor: effects)
    if ':' in msg:
        parts = msg.split(':')
        flavor = parts[0].strip()
        flavor = re.sub(r'\*\*.*?\*\*', '', flavor).strip()
        return flavor
    
    # Check if message is ONLY effects
    if msg.startswith(('Lose', '+', '-', 'Gain')) or '{' in msg:
        if event_id and outcome_type and event_id in INCIDENT_FLAVOR:
            if outcome_type in INCIDENT_FLAVOR[event_id]:
                return INCIDENT_FLAVOR[event_id][outcome_type]
    
    # Remove all effect patterns like "+{gold}", "-, -{unrest}", etc.
    flavor = re.sub(r'[,;]?\s*[+-]?\s*\{[^}]+\}', '', msg)
    
    # Remove **markers**
    flavor = re.sub(r'\*\*.*?\*\*', '', flavor).strip()
    
    # Clean up multiple spaces and trailing/leading punctuation
    flavor = re.sub(r'\s+', ' ', flavor).strip()
    flavor = re.sub(r'[,;]+$', '', flavor).strip()
    
    # If we stripped everything, use flavor mapping or generic message
    if not flavor or len(flavor) < 3:
        if event_id and outcome_type and event_id in INCIDENT_FLAVOR:
            if outcome_type in INCIDENT_FLAVOR[event_id]:
                return INCIDENT_FLAVOR[event_id][outcome_type]
        return "Outcome"
    
    return flavor

def unify_modifier(modifier):
    """Convert a modifier to the unified format."""
    unified = {}
    
    # Resource: use 'resource' (rename from 'selector' if needed)
    if 'selector' in modifier:
        unified['resource'] = modifier['selector']
    elif 'resource' in modifier:
        unified['resource'] = modifier['resource']
    
    # Value: keep as-is
    if 'value' in modifier:
        unified['value'] = modifier['value']
    
    # Type: keep if it exists (for events)
    if 'type' in modifier:
        unified['type'] = modifier['type']
    
    # Duration: consolidate turns into duration
    if 'turns' in modifier:
        unified['duration'] = modifier['turns']
    elif 'duration' in modifier:
        unified['duration'] = modifier['duration']
    
    # Remove: enabled, name, selector (renamed to resource)
    
    return unified

def clean_outcome(outcome, event_id=None, outcome_type=None):
    """Clean an outcome object."""
    if not outcome or 'msg' not in outcome:
        return outcome
    
    # Clean message
    outcome['msg'] = extract_flavor_text(outcome['msg'], event_id, outcome_type)
    
    # Unify modifiers if present
    if 'modifiers' in outcome and outcome['modifiers']:
        outcome['modifiers'] = [unify_modifier(m) for m in outcome['modifiers']]
    
    return outcome

def simplify_event(event):
    """Simplify an event/incident to unified format."""
    event_id = event.get('id', None)
    simplified = {}
    
    # Core fields
    if 'id' in event:
        simplified['id'] = event['id']
    
    # Add tier (events use 'event', incidents use 'minor'/'moderate'/'major')
    if 'tier' in event:
        # Already has tier (probably an incident)
        simplified['tier'] = event['tier']
    else:
        # Event - mark as 'event'
        simplified['tier'] = 'event'
    
    if 'description' in event:
        simplified['description'] = event['description']
    
    # Skills array
    if 'skills' in event:
        simplified['skills'] = event['skills']
    
    # Effects - clean each outcome
    if 'effects' in event:
        effects = event['effects']
        cleaned_effects = {}
        
        for outcome_type in ['criticalSuccess', 'success', 'failure', 'criticalFailure']:
            if outcome_type in effects:
                cleaned_effects[outcome_type] = clean_outcome(
                    effects[outcome_type], 
                    event_id, 
                    outcome_type
                )
        
        simplified['effects'] = cleaned_effects
    
    # Remove these fields:
    # - name (redundant with id)
    # - traits, location, modifier, resolvedOn, ifUnresolved, special (event-specific)
    
    return simplified

def process_file(filepath):
    """Process a single JSON file."""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        # Simplify the event/incident
        simplified = simplify_event(data)
        
        # Write back
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(simplified, f, indent=2, ensure_ascii=False)
        
        return True
        
    except Exception as e:
        print(f"✗ Error processing {filepath}: {e}")
        import traceback
        traceback.print_exc()
        return False

def find_json_files(directory):
    """Recursively find all .json files in a directory."""
    path = Path(directory)
    return list(path.rglob('*.json'))

if __name__ == '__main__':
    print("=" * 80)
    print("Comprehensive cleanup of source event and incident files")
    print("=" * 80)
    
    # Find all event and incident files
    event_files = find_json_files('data/events')
    incident_files = find_json_files('data/incidents')
    
    all_files = event_files + incident_files
    
    print(f"\nFound {len(event_files)} event files")
    print(f"Found {len(incident_files)} incident files")
    print(f"Total: {len(all_files)} files to process\n")
    
    success_count = 0
    failed_files = []
    
    for filepath in all_files:
        print(f"Processing {filepath}...")
        if process_file(filepath):
            success_count += 1
        else:
            failed_files.append(filepath)
    
    print("\n" + "=" * 80)
    print(f"Complete: {success_count}/{len(all_files)} files processed successfully")
    if failed_files:
        print(f"\nFailed files:")
        for f in failed_files:
            print(f"  - {f}")
    print("=" * 80)
    print("\nChanges made to each file:")
    print("  ✅ Removed 'name' field")
    print("  ✅ Removed event-specific fields (traits, location, ifUnresolved, etc.)")
    print("  ✅ Unified modifier format (resource, value, duration)")
    print("  ✅ Stripped game effects from messages (flavor only)")
    print("  ✅ Added 'tier' field where missing")
