#!/usr/bin/env python3
"""
Generate TypeScript badge update code from EVENT_BALANCE_TABLE.csv

This script parses the CSV and generates the exact outcomeBadges arrays
that should be in each event file, WITHOUT modifying files directly.
Output can be reviewed before manual application.
"""

import csv
import json
import re
from pathlib import Path

# Map CSV effect strings to badge generation code
def parse_effect_to_badge(effect_str):
    """Convert CSV effect string to TypeScript badge code"""
    effect_str = effect_str.strip()
    
    # Faction adjustments
    if effect_str.startswith('Faction +'):
        count = int(effect_str.split('+')[1])
        if count == 1:
            return "textBadge('Adjust 1 faction +1', 'fas fa-users', 'positive')"
        else:
            return f"textBadge('Adjust {count} factions +1', 'fas fa-users', 'positive')"
    elif effect_str.startswith('Faction -'):
        count = int(effect_str.split('-')[1])
        if count == 1:
            return "textBadge('Adjust 1 faction -1', 'fas fa-users-slash', 'negative')"
        else:
            return f"textBadge('Adjust {count} factions -1', 'fas fa-users-slash', 'negative')"
    
    # Unrest (dice)
    if match := re.match(r'[-+](\d+)d(\d+)(?:\+(\d+))?\s+Unrest', effect_str):
        sign = '-' if effect_str.startswith('-') else '+'
        dice = f"{match.group(1)}d{match.group(2)}"
        if match.group(3):
            dice += f"+{match.group(3)}"
        if sign == '-':
            return f"diceBadge('Reduce Unrest by {{{{value}}}}', 'fas fa-shield-alt', '{dice}', 'positive')"
        else:
            return f"diceBadge('Gain {{{{value}}}} Unrest', 'fas fa-exclamation-triangle', '{dice}', 'negative')"
    
    # Unrest (static)
    if match := re.match(r'[-+](\d+)\s+Unrest', effect_str):
        value = int(match.group(1))
        if effect_str.startswith('-'):
            return f"valueBadge('Reduce Unrest by {{{{value}}}}', 'fas fa-shield-alt', {value}, 'positive')"
        else:
            return f"valueBadge('Gain {{{{value}}}} Unrest', 'fas fa-exclamation-triangle', {value}, 'negative')"
    
    # Gold (dice)
    if match := re.match(r'[-+](\d+)d(\d+)(?:\+(\d+))?\s+Gold', effect_str):
        sign = '-' if effect_str.startswith('-') else '+'
        dice = f"{match.group(1)}d{match.group(2)}"
        if match.group(3):
            dice += f"+{match.group(3)}"
        if sign == '-':
            return f"diceBadge('Lose {{{{value}}}} Gold', 'fas fa-coins', '{dice}', 'negative')"
        else:
            return f"diceBadge('Gain {{{{value}}}} Gold', 'fas fa-coins', '{dice}', 'positive')"
    
    # Gold (static)
    if match := re.match(r'[-+](\d+)\s+Gold', effect_str):
        value = int(match.group(1))
        if effect_str.startswith('-'):
            return f"valueBadge('Lose {{{{value}}}} Gold', 'fas fa-coins', {value}, 'negative')"
        else:
            return f"valueBadge('Gain {{{{value}}}} Gold', 'fas fa-coins', {value}, 'positive')"
    
    # Fame
    if match := re.match(r'[-+](\d+)\s+Fame', effect_str):
        value = int(match.group(1))
        if effect_str.startswith('-'):
            return f"valueBadge('Lose {{{{value}}}} Fame', 'fas fa-star', {value}, 'negative')"
        else:
            return f"valueBadge('Gain {{{{value}}}} Fame', 'fas fa-star', {value}, 'positive')"
    
    # Food (dice)
    if match := re.match(r'[-+](\d+)d(\d+)(?:\+(\d+))?\s+Food', effect_str):
        sign = '-' if effect_str.startswith('-') else '+'
        dice = f"{match.group(1)}d{match.group(2)}"
        if match.group(3):
            dice += f"+{match.group(3)}"
        if sign == '-':
            return f"diceBadge('Lose {{{{value}}}} Food', 'fas fa-drumstick-bite', '{dice}', 'negative')"
        else:
            return f"diceBadge('Gain {{{{value}}}} Food', 'fas fa-drumstick-bite', '{dice}', 'positive')"
    
    # Food (static)
    if match := re.match(r'[-+](\d+)\s+Food', effect_str):
        value = int(match.group(1))
        if effect_str.startswith('-'):
            return f"valueBadge('Lose {{{{value}}}} Food', 'fas fa-drumstick-bite', {value}, 'negative')"
        else:
            return f"valueBadge('Gain {{{{value}}}} Food', 'fas fa-drumstick-bite', {value}, 'positive')"
    
    # Resources (generic)
    if 'Resource' in effect_str:
        if match := re.match(r'[-+](\d+)d(\d+)\s+Resource', effect_str):
            sign = '-' if effect_str.startswith('-') else '+'
            dice = f"{match.group(1)}d{match.group(2)}"
            if sign == '-':
                return f"diceBadge('Lose {{{{value}}}} random resource', 'fas fa-box', '{dice}', 'negative')"
            else:
                return f"diceBadge('Gain {{{{value}}}} random resource', 'fas fa-box', '{dice}', 'positive')"
        elif match := re.match(r'[-+](\d+)\s+Resource', effect_str):
            value = int(match.group(1))
            if effect_str.startswith('-'):
                return f"valueBadge('Lose {{{{value}}}} random resource', 'fas fa-box', {value}, 'negative')"
            else:
                return f"valueBadge('Gain {{{{value}}}} random resource', 'fas fa-box', {value}, 'positive')"
    
    # Structures
    if 'Damage 1 structure' in effect_str:
        return "textBadge('1 structure damaged', 'fas fa-house-crack', 'negative')"
    if 'Lose Worksite' in effect_str or 'Lose 1 Worksite' in effect_str:
        return "textBadge('Lose 1 worksite', 'fas fa-industry', 'negative')"
    if '+1 Worksite' in effect_str:
        return "textBadge('Gain 1 worksite', 'fas fa-industry', 'positive')"
    if '+1 Structure' in effect_str:
        return "textBadge('Gain 1 structure', 'fas fa-building', 'positive')"
    if 'Settlement +1 Level' in effect_str:
        return "textBadge('1 settlement gains level', 'fas fa-city', 'positive')"
    if 'Settlement -1 Level' in effect_str:
        return "textBadge('1 settlement loses level', 'fas fa-city', 'negative')"
    
    # Army effects
    if 'Army Well Trained' in effect_str:
        return "textBadge('Random army becomes Well Trained (+1 saves)', 'fas fa-star', 'positive')"
    if 'Army fatigued' in effect_str:
        return "textBadge('Random army becomes Fatigued', 'fas fa-tired', 'negative')"
    if 'Army enfeebled' in effect_str:
        return "textBadge('Random army becomes Enfeebled', 'fas fa-exclamation-triangle', 'negative')"
    if 'Army equip' in effect_str:
        # Count occurrences
        count = effect_str.count('Army equip')
        if count == 1:
            return "textBadge('1 army receives equipment', 'fas fa-shield', 'positive')"
        else:
            return f"textBadge('{count} armies receive equipment', 'fas fa-shield', 'positive')"
    
    # Convert/Imprison
    if match := re.match(r'Convert (\d+)d(\d+)', effect_str):
        dice = f"{match.group(1)}d{match.group(2)}"
        return f"diceBadge('Imprison {{{{value}}}} dissidents', 'fas fa-user-lock', '{dice}', 'positive')"
    elif match := re.match(r'Convert (\d+)', effect_str):
        value = int(match.group(1))
        return f"valueBadge('Imprison {{{{value}}}} dissidents', 'fas fa-user-lock', {value}, 'positive')"
    
    # Pardon
    if match := re.match(r'Pardon (\d+)d(\d+)', effect_str):
        dice = f"{match.group(1)}d{match.group(2)}"
        return f"diceBadge('Pardon {{{{value}}}} prisoners', 'fas fa-dove', '{dice}', 'positive')"
    elif match := re.match(r'Pardon (\d+)', effect_str):
        value = int(match.group(1))
        return f"valueBadge('Pardon {{{{value}}}} prisoners', 'fas fa-dove', {value}, 'positive')"
    
    # Innocents
    if match := re.match(r'[-+](\d+)d(\d+)\s+innocents', effect_str):
        dice = f"{match.group(1)}d{match.group(2)}"
        return f"diceBadge('{{{{value}}}} innocents harmed', 'fas fa-user-injured', '{dice}', 'negative')"
    elif match := re.match(r'[-+](\d+)\s+innocents?', effect_str):
        value = int(match.group(1))
        return f"valueBadge('{{{{value}}}} innocents harmed', 'fas fa-user-injured', {value}, 'negative')"
    
    # Hex operations
    if 'Claim 1 hex' in effect_str:
        count = effect_str.count('Claim 1 hex')
        if count == 1:
            return "textBadge('Claim 1 hex', 'fas fa-map', 'positive')"
        else:
            return f"textBadge('Claim {count} hexes', 'fas fa-map', 'positive')"
    if 'Lose 1 hex' in effect_str:
        return "textBadge('Lose 1 hex', 'fas fa-map', 'negative')"
    if 'Fortify Hex' in effect_str:
        return "textBadge('Fortify 1 hex', 'fas fa-fort-awesome', 'positive')"
    
    # Special effects
    if 'Gain Action' in effect_str:
        return "textBadge('Gain 1 kingdom action', 'fas fa-plus-circle', 'positive')"
    if 'Lose Action' in effect_str:
        return "textBadge('Lose 1 kingdom action', 'fas fa-minus-circle', 'negative')"
    
    # If we can't parse it, return a comment
    return f"// TODO: Parse '{effect_str}'"


def parse_csv_row(row):
    """Parse a single CSV row into structured data"""
    effects = {}
    for outcome in ['Critical Success', 'Success', 'Failure', 'Critical Failure']:
        effect_text = row[outcome]
        if not effect_text or effect_text.strip() == '':
            effects[outcome] = []
            continue
        
        # Split by comma and parse each effect
        parts = [p.strip() for p in effect_text.split(',')]
        badges = []
        for part in parts:
            if part:
                badge = parse_effect_to_badge(part)
                badges.append(badge)
        effects[outcome] = badges
    
    return {
        'name': row['Name'],
        'approach': row['Approach'],
        'descriptor': row['Approach Descriptor'],
        'effects': effects
    }


def main():
    csv_path = Path(__file__).parent.parent / 'docs' / 'planning' / 'EVENT_BALANCE_TABLE.csv'
    
    with open(csv_path, 'r') as f:
        reader = csv.DictReader(f)
        events = {}
        current_event = None
        
        for row in reader:
            if row['Name'].strip():
                # New event
                event_num = row['Name'].split('.')[0].strip()
                event_name = row['Name'].split('.', 1)[1].strip() if '.' in row['Name'] else row['Name']
                current_event = event_name
                events[current_event] = []
            
            if current_event:
                approach_data = parse_csv_row(row)
                events[current_event].append(approach_data)
    
    # Output JSON for review
    output_path = Path(__file__).parent / 'badge-updates.json'
    with open(output_path, 'w') as f:
        json.dump(events, f, indent=2)
    
    print(f"Generated badge updates in {output_path}")
    print(f"Processed {len(events)} events")
    
    # Also generate a human-readable summary
    summary_path = Path(__file__).parent / 'badge-updates-summary.txt'
    with open(summary_path, 'w') as f:
        for event_name, approaches in events.items():
            f.write(f"\n{'='*80}\n")
            f.write(f"EVENT: {event_name}\n")
            f.write(f"{'='*80}\n")
            for approach in approaches:
                f.write(f"\n  {approach['approach']}: {approach['descriptor']}\n")
                for outcome, badges in approach['effects'].items():
                    if badges:
                        f.write(f"    {outcome}:\n")
                        for badge in badges:
                            f.write(f"      {badge}\n")
    
    print(f"Generated summary in {summary_path}")


if __name__ == '__main__':
    main()
