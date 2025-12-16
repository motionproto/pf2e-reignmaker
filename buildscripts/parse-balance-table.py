#!/usr/bin/env python3
"""
Parse EVENT_BALANCE_TABLE.csv and generate TypeScript code for event outcomes.

This script reads the balance table and outputs the modifier structures needed
for each event's strategic choice outcomes.
"""

import csv
import re
from typing import Dict, List, Tuple

def parse_effect(effect: str) -> List[Dict]:
    """Parse an effect string into modifier objects."""
    if not effect or effect.strip() == "":
        return []
    
    modifiers = []
    parts = [p.strip() for p in effect.split(',')]
    
    for part in parts:
        if not part:
            continue
            
        # Faction adjustments
        if 'Faction +' in part or 'Faction -' in part:
            match = re.search(r'Faction ([+-])(\d+)', part)
            if match:
                sign = match.group(1)
                amount = int(match.group(2))
                value = amount if sign == '+' else -amount
                modifiers.append({
                    'type': 'faction',
                    'value': value,
                    'text': part
                })
        
        # Fame
        elif 'Fame +' in part or 'Fame -' in part or part == '+1 Fame' or part == '-1 Fame':
            match = re.search(r'([+-])?(\d+)\s*Fame', part)
            if match:
                sign = match.group(1) or '+'
                amount = int(match.group(2))
                value = amount if sign == '+' else -amount
                modifiers.append({
                    'type': 'static',
                    'resource': 'fame',
                    'value': value
                })
        
        # Unrest with dice
        elif 'd' in part and 'Unrest' in part:
            match = re.search(r'([+-])?(\d+d\d+(?:[+-]\d+)?)\s*Unrest', part)
            if match:
                sign = match.group(1) or '+'
                formula = match.group(2)
                if sign == '-':
                    formula = f'-{formula}'
                modifiers.append({
                    'type': 'dice',
                    'resource': 'unrest',
                    'formula': formula
                })
        
        # Unrest static
        elif 'Unrest' in part:
            match = re.search(r'([+-])(\d+)\s*Unrest', part)
            if match:
                sign = match.group(1)
                amount = int(match.group(2))
                value = amount if sign == '+' else -amount
                modifiers.append({
                    'type': 'static',
                    'resource': 'unrest',
                    'value': value
                })
        
        # Gold with dice
        elif 'd' in part and 'Gold' in part:
            match = re.search(r'([+-])?(\d+d\d+(?:[+-]\d+)?)\s*Gold', part)
            if match:
                sign = match.group(1) or '+'
                formula = match.group(2)
                if sign == '-':
                    formula = f'-{formula}'
                modifiers.append({
                    'type': 'dice',
                    'resource': 'gold',
                    'formula': formula
                })
        
        # Gold static
        elif 'Gold' in part:
            match = re.search(r'([+-])(\d+)\s*Gold', part)
            if match:
                sign = match.group(1)
                amount = int(match.group(2))
                value = amount if sign == '+' else -amount
                modifiers.append({
                    'type': 'static',
                    'resource': 'gold',
                    'value': value
                })
        
        # Food with dice
        elif 'd' in part and 'Food' in part:
            match = re.search(r'([+-])?(\d+d\d+(?:[+-]\d+)?)\s*Food', part)
            if match:
                sign = match.group(1) or '+'
                formula = match.group(2)
                if sign == '-':
                    formula = f'-{formula}'
                modifiers.append({
                    'type': 'dice',
                    'resource': 'food',
                    'formula': formula
                })
        
        # Food static
        elif 'Food' in part:
            match = re.search(r'([+-])(\d+)\s*Food', part)
            if match:
                sign = match.group(1)
                amount = int(match.group(2))
                value = amount if sign == '+' else -amount
                modifiers.append({
                    'type': 'static',
                    'resource': 'food',
                    'value': value
                })
        
        # Resource with dice (random resource)
        elif 'd' in part and 'Resource' in part:
            match = re.search(r'([+-])?(\d+d\d+(?:[+-]\d+)?)\s*Resource', part)
            if match:
                sign = match.group(1) or '+'
                formula = match.group(2)
                if sign == '-':
                    formula = f'-{formula}'
                modifiers.append({
                    'type': 'dice',
                    'resource': 'resource',  # Random resource
                    'formula': formula
                })
        
        # Resource static
        elif 'Resource' in part and 'Resource' not in ['Lumber', 'Stone', 'Ore']:
            match = re.search(r'([+-])(\d+)\s*Resource', part)
            if match:
                sign = match.group(1)
                amount = int(match.group(2))
                value = amount if sign == '+' else -amount
                modifiers.append({
                    'type': 'static',
                    'resource': 'resource',  # Random resource
                    'value': value
                })
        
        # Game commands
        elif 'Convert' in part:
            modifiers.append({
                'type': 'game_command',
                'command': 'convert',
                'text': part
            })
        elif 'Pardon' in part:
            modifiers.append({
                'type': 'game_command',
                'command': 'pardon',
                'text': part
            })
        elif 'Settlement +' in part or 'Settlement -' in part:
            modifiers.append({
                'type': 'game_command',
                'command': 'settlement_level',
                'text': part
            })
        elif 'Structure' in part and '+1' in part:
            modifiers.append({
                'type': 'game_command',
                'command': 'build_structure',
                'text': part
            })
        elif 'Damage' in part and 'structure' in part:
            modifiers.append({
                'type': 'game_command',
                'command': 'damage_structure',
                'text': part
            })
        elif 'Worksite' in part:
            modifiers.append({
                'type': 'game_command',
                'command': 'worksite',
                'text': part
            })
        elif 'Army' in part:
            modifiers.append({
                'type': 'game_command',
                'command': 'army',
                'text': part
            })
        elif 'Claim' in part and 'hex' in part:
            modifiers.append({
                'type': 'game_command',
                'command': 'claim_hex',
                'text': part
            })
        elif 'Fortify' in part:
            modifiers.append({
                'type': 'game_command',
                'command': 'fortify_hex',
                'text': part
            })
        elif 'Gain Action' in part or 'Lose Action' in part:
            modifiers.append({
                'type': 'game_command',
                'command': 'action',
                'text': part
            })
        elif 'innocents' in part:
            modifiers.append({
                'type': 'game_command',
                'command': 'innocents',
                'text': part
            })
        elif 'Ongoing' in part:
            modifiers.append({
                'type': 'game_command',
                'command': 'ongoing',
                'text': part
            })
    
    return modifiers

def main():
    events = {}
    current_event = None
    
    with open('../docs/planning/EVENT_BALANCE_TABLE.csv', 'r') as f:
        reader = csv.DictReader(f)
        
        for row in reader:
            name = row['Name'].strip()
            if name and name[0].isdigit():
                # New event
                event_num = name.split('.')[0]
                event_name = name.split('.')[1].strip()
                current_event = event_name
                events[current_event] = {
                    'number': event_num,
                    'description': row['Description'],
                    'approaches': {}
                }
            
            if current_event and row['Approach']:
                approach_type = row['Approach'].strip()
                approach_name = row['Approach Descriptor'].strip()
                
                events[current_event]['approaches'][approach_type] = {
                    'name': approach_name,
                    'criticalSuccess': parse_effect(row['Critical Success']),
                    'success': parse_effect(row['Success']),
                    'failure': parse_effect(row['Failure']),
                    'criticalFailure': parse_effect(row['Critical Failure'])
                }
    
    # Output summary
    print("=== EVENT BALANCE TABLE PARSED ===\n")
    for event_name, event_data in events.items():
        print(f"{event_data['number']}. {event_name}")
        print(f"   Description: {event_data['description']}")
        for approach_type in ['Virtuous', 'Practical', 'Ruthless']:
            if approach_type in event_data['approaches']:
                approach = event_data['approaches'][approach_type]
                print(f"   {approach_type}: {approach['name']}")
        print()

if __name__ == '__main__':
    main()
