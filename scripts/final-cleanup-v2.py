#!/usr/bin/env python3
"""
Final cleanup of events and incidents:
1. Strip all game effects from messages, keeping ONLY flavor text
2. For messages that are ONLY effects (e.g., "Lose 1d4 Gold to raids"), 
   replace with simple flavor text
3. Fix any string table references
"""

import json
import re
import sys

# Mapping of incident IDs to simple flavor messages (when source only has effects)
INCIDENT_FLAVOR = {
    # Minor incidents
    'crime-wave': {
        'success': 'Crime suppressed',
        'failure': 'Crime wave hits',
        'criticalFailure': 'Major crime wave'
    },
    'work-stoppage': {
        'success': 'Workers return',
        'failure': 'Work stoppage',
        'criticalFailure': 'Major work stoppage'
    },
    'emigration-threat': {
        'success': 'Population stays',
        'failure': 'Emigration occurs',
        'criticalFailure': 'Mass emigration'
    },
    'protests': {
        'success': 'Peaceful resolution',
        'failure': 'Protest damage',
        'criticalFailure': 'Major protest damage'
    },
    'corruption-scandal': {
        'success': 'Scandal contained',
        'failure': 'Corruption discovered',
        'criticalFailure': 'Major corruption exposed'
    },
    'rising-tensions': {
        'success': 'Tensions ease',
        'failure': 'Tensions rise',
        'criticalFailure': 'Major unrest'
    },
    'bandit-activity': {
        'success': 'Bandits deterred',
        'failure': 'Bandit raids',
        'criticalFailure': 'Major bandit raids'
    },
    'minor-diplomatic-incident': {
        'success': 'Relations maintained',
        'failure': 'Diplomatic incident',
        'criticalFailure': 'Major diplomatic incident'
    },
    # Add more as needed
}

def extract_flavor_text(msg, event_id=None, outcome_type=None):
    """Extract only the flavor text, removing all game effect placeholders."""
    if not msg:
        return msg
    
    # Check if this is a string table reference
    if msg.startswith('pf2e-reignmaker.'):
        # Use flavor mapping if available
        if event_id and outcome_type and event_id in INCIDENT_FLAVOR:
            if outcome_type in INCIDENT_FLAVOR[event_id]:
                return INCIDENT_FLAVOR[event_id][outcome_type]
        return "Event outcome"
    
    # Split on semicolon (flavor; effects)
    if ';' in msg:
        parts = msg.split(';')
        flavor = parts[0].strip()
        return flavor
    
    # Split on colon (flavor: effects)
    if ':' in msg:
        parts = msg.split(':')
        flavor = parts[0].strip()
        return flavor
    
    # Check if message is ONLY effects (starts with "Lose", "+", "-", etc.)
    # Use flavor mapping if available
    if msg.startswith(('Lose', '+', '-', 'Gain')) or '{' in msg:
        if event_id and outcome_type and event_id in INCIDENT_FLAVOR:
            if outcome_type in INCIDENT_FLAVOR[event_id]:
                return INCIDENT_FLAVOR[event_id][outcome_type]
    
    # Remove all effect patterns like "+{gold}", "-, -{unrest}", etc.
    # Pattern: optional comma/semicolon, optional +/-, {resource}
    flavor = re.sub(r'[,;]?\s*[+-]?\s*\{[^}]+\}', '', msg)
    
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

def clean_outcome(outcome, event_id=None, outcome_type=None):
    """Clean an outcome object."""
    if not outcome or 'msg' not in outcome:
        return outcome
    
    outcome['msg'] = extract_flavor_text(outcome['msg'], event_id, outcome_type)
    return outcome

def process_effects(effects, event_id=None):
    """Process all effects in an effects object."""
    if not effects:
        return effects
    
    for outcome_type in ['criticalSuccess', 'success', 'failure', 'criticalFailure']:
        if outcome_type in effects:
            effects[outcome_type] = clean_outcome(effects[outcome_type], event_id, outcome_type)
    
    return effects

def process_event(event):
    """Process a single event/incident."""
    event_id = event.get('id', None)
    if 'effects' in event:
        event['effects'] = process_effects(event['effects'], event_id)
    return event

def process_file(filepath):
    """Clean messages in a JSON file."""
    print(f"\nProcessing {filepath}...")
    
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        # Count before
        before_examples = collect_message_examples(data, 3)
        
        # Process each event/incident
        for item in data:
            process_event(item)
        
        # Count after
        after_examples = collect_message_examples(data, 3)
        
        # Write back
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=4, ensure_ascii=False)
        
        print(f"✓ Cleaned messages in {filepath}")
        print(f"\n  Before:")
        for ex in before_examples:
            print(f"    - \"{ex}\"")
        print(f"\n  After:")
        for ex in after_examples:
            print(f"    - \"{ex}\"")
        
    except Exception as e:
        print(f"✗ Error processing {filepath}: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    return True

def collect_message_examples(data, count):
    """Collect a few message examples."""
    examples = []
    
    def collect(obj):
        if len(examples) >= count:
            return
        
        if isinstance(obj, dict):
            if 'msg' in obj:
                examples.append(obj['msg'])
            for value in obj.values():
                collect(value)
        elif isinstance(obj, list):
            for item in obj:
                collect(item)
    
    collect(data)
    return examples[:count]

if __name__ == '__main__':
    files = [
        'dist/events.json',
        'dist/incidents.json',
    ]
    
    if len(sys.argv) > 1:
        files = sys.argv[1:]
    
    print("=" * 80)
    print("Final cleanup: Strip game effects from messages (v2)")
    print("=" * 80)
    
    success_count = 0
    for filepath in files:
        if process_file(filepath):
            success_count += 1
    
    print("\n" + "=" * 80)
    print(f"Complete: {success_count}/{len(files)} files processed successfully")
    print("=" * 80)
    print("\nMessages now contain ONLY flavor text.")
    print("Game effects are auto-generated from modifiers at runtime.")
