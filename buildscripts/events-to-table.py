#!/usr/bin/env python3
"""
Transform EVENT_BALANCE_REFERENCE.md into a flat table format.
Output: CSV file with columns: Name, Approach, CS, S, F, CF, Description, Status
"""

import re
import csv
from pathlib import Path
from typing import List, Dict, Optional

def parse_event_block(lines: List[str]) -> Optional[Dict]:
    """Parse a single event block from the markdown."""
    if not lines:
        return None
    
    # First line should be like: ## 1. Criminal Trial ✅
    header_match = re.match(r'^## (\d+)\. (.+?) (✅|⏳|❌)?\s*$', lines[0])
    if not header_match:
        return None
    
    number = header_match.group(1)
    name = header_match.group(2).strip()
    status_emoji = header_match.group(3) or ''
    
    # Map emoji to status text
    status_map = {'✅': 'Tested', '⏳': 'Migrated', '❌': 'Not Migrated'}
    status = status_map.get(status_emoji, 'Unknown')
    
    # Find description (italic line after header)
    description = ''
    for line in lines[1:5]:
        if line.startswith('*') and line.endswith('*'):
            description = line.strip('*').strip()
            break
    
    # Find the outcome table
    table_started = False
    headers = []
    approaches = {}
    
    for i, line in enumerate(lines):
        if '|' not in line:
            continue
        
        cells = [c.strip() for c in line.split('|')]
        cells = [c for c in cells if c]  # Remove empty cells from edges
        
        if not cells:
            continue
        
        # Skip separator lines
        if all(c.startswith('-') or c.startswith(':') for c in cells):
            continue
        
        # Header row detection - only match 'Outcome' exactly as first cell
        first_cell_clean = cells[0].replace('**', '').strip()
        if first_cell_clean == 'Outcome':
            # Format: | Outcome | Virtuous (...) | Practical (...) | Ruthless (...) |
            headers = cells[1:]  # Skip 'Outcome' column
            table_started = True
            continue
        
        if table_started and cells:
            outcome_type = cells[0].replace('**', '').strip()
            
            # Map outcome names
            outcome_map = {
                'Critical Success': 'criticalSuccess',
                'Success': 'success', 
                'Failure': 'failure',
                'Critical Failure': 'criticalFailure'
            }
            
            outcome_key = outcome_map.get(outcome_type)
            if outcome_key and len(cells) > 1:
                for j, approach_header in enumerate(headers):
                    if j + 1 < len(cells):
                        # Extract approach name (before parentheses)
                        approach_match = re.match(r'^(\w+)', approach_header)
                        approach = approach_match.group(1).lower() if approach_match else f'approach_{j}'
                        
                        if approach not in approaches:
                            approaches[approach] = {
                                'label': approach_header,
                                'criticalSuccess': '',
                                'success': '',
                                'failure': '',
                                'criticalFailure': ''
                            }
                        
                        approaches[approach][outcome_key] = cells[j + 1]
    
    if not approaches:
        return None
    
    return {
        'number': number,
        'name': name,
        'description': description,
        'status': status,
        'approaches': approaches
    }


def main():
    # Paths
    script_dir = Path(__file__).parent
    input_file = script_dir.parent / 'docs' / 'planning' / 'EVENT_BALANCE_REFERENCE.md'
    output_file = script_dir.parent / 'docs' / 'planning' / 'EVENT_BALANCE_TABLE.csv'
    
    if not input_file.exists():
        print(f"Error: Input file not found: {input_file}")
        return
    
    # Read the markdown
    content = input_file.read_text()
    
    # Split into event blocks (each starts with ## followed by a number)
    event_blocks = re.split(r'(?=^## \d+\.)', content, flags=re.MULTILINE)
    
    events = []
    for block in event_blocks:
        block_lines = block.strip().split('\n')
        event = parse_event_block(block_lines)
        if event:
            events.append(event)
    
    # Write CSV
    with open(output_file, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        
        # Header row
        writer.writerow(['Name', 'Approach', 'Critical Success', 'Success', 'Failure', 'Critical Failure', 'Description', 'Status'])
        
        for event in events:
            first_approach = True
            for approach_key in ['virtuous', 'practical', 'ruthless']:
                if approach_key not in event['approaches']:
                    continue
                
                approach = event['approaches'][approach_key]
                
                # Only show name/description/status on first row
                if first_approach:
                    name = f"{event['number']}. {event['name']}"
                    desc = event['description']
                    status = event['status']
                    first_approach = False
                else:
                    name = ''
                    desc = ''
                    status = ''
                
                writer.writerow([
                    name,
                    approach['label'],
                    approach['criticalSuccess'],
                    approach['success'],
                    approach['failure'],
                    approach['criticalFailure'],
                    desc,
                    status
                ])
    
    print(f"✅ Generated: {output_file}")
    print(f"   Processed {len(events)} events")


if __name__ == '__main__':
    main()

