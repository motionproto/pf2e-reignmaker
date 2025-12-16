#!/usr/bin/env python3
"""
Sync event pipelines with EVENT_BALANCE_TABLE.csv

This script updates:
1. Approach labels (from "Approach Descriptor" column)
2. OutcomeBadges arrays (from outcome columns)

All events use standard IDs: virtuous, practical, ruthless
"""

import json
import re
import os
from typing import Dict, List

def format_badge_array(badges: List[str], indent: int = 10) -> str:
    """Format a badge array with proper indentation."""
    if not badges:
        return "[]"
    
    indent_str = " " * indent
    lines = ["["]
    for badge in badges:
        if badge.startswith("//"):
            lines.append(f"{indent_str}  {badge}")
        else:
            lines.append(f"{indent_str}  {badge},")
    lines.append(f"{indent_str}]")
    return "\n".join(lines)

def update_approach_label(content: str, approach_id: str, new_label: str) -> tuple[str, bool]:
    """Update the label for a specific approach."""
    # Pattern to find: id: 'virtuous', label: '...',
    pattern = rf"(id: '{approach_id}',\s*label: ')[^']*(')"
    match = re.search(pattern, content)
    
    if match:
        old_text = match.group(0)
        new_text = f"id: '{approach_id}',\n        label: '{new_label}',"
        content = content.replace(old_text, new_text, 1)
        return content, True
    return content, False

def update_outcome_badges(content: str, approach_id: str, outcome: str, badges: List[str]) -> tuple[str, bool]:
    """Update outcome badges for a specific approach and outcome."""
    # Find the approach section
    approach_pattern = rf"id: '{approach_id}'[\s\S]*?outcomeBadges: \{{"
    approach_match = re.search(approach_pattern, content)
    
    if not approach_match:
        return content, False
    
    approach_start = approach_match.start()
    
    # Find end of this approach (next approach or end of options array)
    next_pattern = r"(\},\s*\{[\s\n]*id: '(?:virtuous|practical|ruthless)'|\}[\s\n]*\][\s\n]*\})"
    next_match = re.search(next_pattern, content[approach_start + 100:])
    
    if next_match:
        approach_end = approach_start + 100 + next_match.start()
    else:
        approach_end = len(content)
    
    approach_section = content[approach_start:approach_end]
    
    # Find the specific outcome within this approach
    outcome_pattern = rf"{outcome}:\s*\[[\s\S]*?\](?=,?\s*(?:success:|failure:|criticalFailure:|\}}))"
    outcome_match = re.search(outcome_pattern, approach_section)
    
    if not outcome_match:
        return content, False
    
    old_outcome = outcome_match.group(0)
    new_badges = format_badge_array(badges, indent=10)
    
    # Preserve comma
    has_comma = ',' in old_outcome.split(']')[1] if ']' in old_outcome else False
    new_outcome = f"{outcome}: {new_badges}" + ("," if has_comma else "")
    
    new_approach_section = approach_section.replace(old_outcome, new_outcome, 1)
    content = content[:approach_start] + new_approach_section + content[approach_end:]
    
    return content, True

def sync_event_file(event_name: str, event_data: Dict, base_path: str) -> Dict:
    """Sync a single event file with balance table data."""
    file_path = os.path.join(base_path, f"src/pipelines/events/{event_data['file']}.ts")
    
    result = {
        'labels_updated': 0,
        'badges_updated': 0,
        'errors': []
    }
    
    if not os.path.exists(file_path):
        result['errors'].append(f"File not found: {file_path}")
        return result
    
    with open(file_path, 'r') as f:
        content = f.read()
    
    if 'strategicChoice:' not in content:
        result['errors'].append("No strategicChoice found")
        return result
    
    original_content = content
    
    # Update each approach
    for approach_type in ['Virtuous', 'Practical', 'Ruthless']:
        if approach_type not in event_data['approaches']:
            continue
        
        approach = event_data['approaches'][approach_type]
        approach_id = approach_type.lower()
        
        # Update label
        new_label = approach['name']
        content, updated = update_approach_label(content, approach_id, new_label)
        if updated:
            result['labels_updated'] += 1
        
        # Update outcome badges
        for outcome in ['criticalSuccess', 'success', 'failure', 'criticalFailure']:
            outcome_data = approach[outcome]
            badges = outcome_data['badges']
            
            content, updated = update_outcome_badges(content, approach_id, outcome, badges)
            if updated:
                result['badges_updated'] += 1
    
    # Write back if changes were made
    if content != original_content:
        with open(file_path, 'w') as f:
            f.write(content)
    
    return result

def main():
    # Load parsed balance table
    with open('../docs/planning/balance-table-parsed.json', 'r') as f:
        events = json.load(f)
    
    base_path = '..'
    
    print("=== SYNCING EVENT PIPELINES WITH BALANCE TABLE ===\n")
    
    total_labels = 0
    total_badges = 0
    total_errors = 0
    processed = 0
    
    for event_name in sorted(events.keys(), key=lambda x: int(events[x]['number'])):
        event_data = events[event_name]
        
        if event_name == 'Scholarly Discovery':
            print(f"{event_data['number']}. {event_name} - SKIPPED (removed)")
            continue
        
        print(f"{event_data['number']}. {event_name}")
        
        try:
            result = sync_event_file(event_name, event_data, base_path)
            
            if result['errors']:
                for error in result['errors']:
                    print(f"  ❌ {error}")
                total_errors += 1
            else:
                if result['labels_updated'] > 0:
                    print(f"  ✅ Updated {result['labels_updated']} approach labels")
                if result['badges_updated'] > 0:
                    print(f"  ✅ Updated {result['badges_updated']} outcome badge arrays")
                
                total_labels += result['labels_updated']
                total_badges += result['badges_updated']
                processed += 1
                
                if result['labels_updated'] == 0 and result['badges_updated'] == 0:
                    print(f"  ℹ️  Already in sync")
        
        except Exception as e:
            print(f"  ❌ Error: {e}")
            total_errors += 1
        
        print()
    
    print("=" * 80)
    print(f"\n📊 Summary:")
    print(f"   Events processed: {processed}")
    print(f"   Approach labels updated: {total_labels}")
    print(f"   Outcome badges updated: {total_badges}")
    print(f"   Errors: {total_errors}")
    print(f"\n✅ All events synced with balance table!")

if __name__ == '__main__':
    main()
