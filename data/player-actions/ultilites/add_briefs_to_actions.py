#!/usr/bin/env python3
"""Add brief descriptions to all player action JSON files."""

import json
import os

# Mapping of action IDs to their brief descriptions
BRIEF_DESCRIPTIONS = {
    # Uphold Stability
    "coordinated-effort": "Aid another PC's Kingdom Action",
    "arrest-dissidents": "Convert current unrest to imprisoned unrest",
    "execute-or-pardon-prisoners": "Deal with imprisoned unrest through justice",
    "deal-with-unrest": "Directly reduce unrest by 1-3 based on success",
    
    # Military Operations
    "recruit-unit": "Raise new troops for your armies",
    "outfit-army": "Equip troops with armor, weapons, runes, or equipment",
    "deploy-army": "Move troops to strategic positions",
    "recover-army": "Heal and restore damaged units",
    "train-army": "Improve unit levels up to party level",
    "disband-army": "Decommission troops and return soldiers home",
    
    # Expand Borders
    "claim-hexes": "Add new territory to your kingdom",
    "build-roads": "Connect your territory with infrastructure",
    "send-scouts": "Learn about unexplored hexes",
    "fortify-hex": "Strengthen defensive positions",
    
    # Urban Planning
    "establish-settlement": "Found a new village",
    "upgrade-settlement": "Advance tiers (requires both level and structure prerequisites)",
    "build-structure": "Add markets, temples, barracks, and other structures",
    "repair-structure": "Fix damaged buildings to restore functionality",
    
    # Foreign Affairs
    "establish-diplomatic-relations": "Form alliances with other nations",
    "request-economic-aid": "Ask allies for resources or gold",
    "request-military-aid": "Call for allied troops in battle",
    "infiltration": "Gather intelligence through espionage",
    "hire-adventurers": "Pay gold to resolve events (2 Gold cost)",
    
    # Economic Actions
    "sell-surplus": "Trade 2 resources for gold",
    "purchase-resources": "Spend 2 gold for resources",
    "create-worksite": "Establish farms, mines, quarries, or lumber camps",
    "collect-resources": "Gather from hexes with or without worksites",
    "collect-stipend": "Extract personal income (requires Counting House)",
}

def update_json_file(filepath):
    """Update a single JSON file with brief description."""
    try:
        # Read the existing JSON
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        # Get the action ID from the data
        action_id = data.get('id')
        
        if not action_id:
            print(f"Warning: No ID found in {filepath}")
            return False
        
        # Check if we have a brief description for this action
        if action_id not in BRIEF_DESCRIPTIONS:
            print(f"Warning: No brief description for action '{action_id}'")
            return False
        
        # Add the brief description
        brief = BRIEF_DESCRIPTIONS[action_id]
        
        # Insert brief after category and before description
        # We need to maintain order for readability
        ordered_data = {}
        for key in ['id', 'name', 'category']:
            if key in data:
                ordered_data[key] = data[key]
        
        # Add brief
        ordered_data['brief'] = brief
        
        # Add remaining fields
        for key in data:
            if key not in ordered_data:
                ordered_data[key] = data[key]
        
        # Write the updated JSON
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(ordered_data, f, indent=2, ensure_ascii=False)
        
        print(f"✓ Updated {os.path.basename(filepath)}: {brief}")
        return True
        
    except Exception as e:
        print(f"Error updating {filepath}: {e}")
        return False

def main():
    """Update all player action JSON files."""
    # Get the directory where this script is located
    script_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Count successes
    updated = 0
    failed = 0
    
    # Process all JSON files in the directory
    for filename in os.listdir(script_dir):
        if filename.endswith('.json'):
            filepath = os.path.join(script_dir, filename)
            if update_json_file(filepath):
                updated += 1
            else:
                failed += 1
    
    print(f"\n{'='*50}")
    print(f"Summary: Updated {updated} files, {failed} failures")
    
    # Also check if we missed any actions
    json_files = [f.replace('.json', '') for f in os.listdir(script_dir) if f.endswith('.json')]
    missing = set(BRIEF_DESCRIPTIONS.keys()) - set(json_files)
    if missing:
        print(f"Warning: These actions have briefs but no JSON files: {missing}")

if __name__ == "__main__":
    main()
