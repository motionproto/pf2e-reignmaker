#!/usr/bin/env python3
"""
Final cleanup of events and incidents:
1. Strip all game effects from messages (e.g., "+{gold}, -{unrest}" → just flavor text)
2. Fix any string table references (e.g., "pf2e-reignmaker.events.raiders.stage-0.failure.msg")
3. Ensure all messages are plain flavor text only
"""

import json
import re
import sys

def extract_flavor_text(msg):
    """Extract only the flavor text, removing all game effect placeholders."""
    if not msg:
        return msg
    
    # Check if this is a string table reference
    if msg.startswith('pf2e-reignmaker.'):
        # This is a string table reference we don't use - return a simple placeholder
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
    
    # Remove all effect patterns like "+{gold}", "-, -{unrest}", etc.
    # Pattern: optional comma/semicolon, optional +/-, {resource}
    flavor = re.sub(r'[,;]?\s*[+-]?\s*\{[^}]+\}', '', msg)
    
    # Clean up multiple spaces and trailing/leading punctuation
    flavor = re.sub(r'\s+', ' ', flavor).strip()
    flavor = re.sub(r'[,;]+$', '', flavor).strip()
    
    return flavor

def clean_outcome(outcome):
    """Clean an outcome object."""
    if not outcome or 'msg' not in outcome:
        return outcome
    
    outcome['msg'] = extract_flavor_text(outcome['msg'])
    return outcome

def process_effects(effects):
    """Process all effects in an effects object."""
    if not effects:
        return effects
    
    for outcome_type in ['criticalSuccess', 'success', 'failure', 'criticalFailure']:
        if outcome_type in effects:
            effects[outcome_type] = clean_outcome(effects[outcome_type])
    
    return effects

def process_data(data):
    """Recursively process all data."""
    if isinstance(data, dict):
        if 'effects' in data:
            data['effects'] = process_effects(data['effects'])
        
        for value in data.values():
            process_data(value)
    
    elif isinstance(data, list):
        for item in data:
            process_data(item)

def process_file(filepath):
    """Clean messages in a JSON file."""
    print(f"\nProcessing {filepath}...")
    
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        # Count before
        before_examples = collect_message_examples(data, 3)
        
        # Process
        process_data(data)
        
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
    print("Final cleanup: Strip game effects from messages")
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
