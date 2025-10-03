#!/usr/bin/env python3
"""
Add structured gameEffects to player action JSON files.

Converts description-based game mechanics into structured gameEffects
while preserving resource modifiers.
"""

import json
from pathlib import Path
from typing import Dict, List, Any

def analyze_description(description: str, action_id: str, outcome: str) -> List[Dict[str, Any]]:
    """Analyze description to generate appropriate gameEffects."""
    desc_lower = description.lower()
    effects = []
    
    # Territory expansion
    if 'claim' in desc_lower and 'hex' in desc_lower:
        if 'proficiency' in desc_lower or 'trained' in desc_lower:
            effect = {
                "type": "claimHexes",
                "count": "proficiency-scaled",
                "scaling": {
                    "trained": 1,
                    "expert": 1,
                    "master": 2,
                    "legendary": 3
                }
            }
            if '+1 extra' in desc_lower or 'bonus' in desc_lower:
                effect["bonus"] = 1
            effects.append(effect)
        elif 'targeted' in desc_lower or 'specific' in desc_lower:
            effects.append({
                "type": "claimHexes",
                "count": 1
            })
    
    # Road building
    if 'build' in desc_lower and 'road' in desc_lower:
        effects.append({
            "type": "buildRoads",
            "hexCount": "standard"
        })
    
    # Fortify hex
    if 'fortif' in desc_lower and 'hex' in desc_lower:
        effects.append({
            "type": "fortifyHex",
            "targetHex": "selected"
        })
    
    # Settlements
    if 'found' in desc_lower and 'settlement' in desc_lower:
        effects.append({
            "type": "foundSettlement",
            "tier": "village"
        })
    
    if 'upgrade' in desc_lower and 'settlement' in desc_lower:
        effect = {"type": "upgradeSettlement"}
        if '+1 structure' in desc_lower:
            effect["structureBonus"] = 1
        effects.append(effect)
    
    # Structures
    if 'build' in desc_lower and 'structure' in desc_lower:
        count = 1
        if '2 structure' in desc_lower:
            count = 2
        effect = {
            "type": "buildStructure",
            "count": count
        }
        if 'half cost' in desc_lower or '50%' in desc_lower:
            effect["costReduction"] = 50
        effects.append(effect)
    
    if 'repair' in desc_lower and 'structure' in desc_lower:
        effects.append({
            "type": "repairStructure",
            "targetStructure": "damaged"
        })
    
    # Worksites
    if action_id == 'create-worksite':
        effect = {
            "type": "createWorksite",
            "worksiteType": "farm"  # Default, user selects
        }
        if outcome == 'criticalSuccess':
            effect["immediateResource"] = True
        effects.append(effect)
    
    # Military operations
    if 'recruit' in desc_lower and 'army' in desc_lower:
        effects.append({
            "type": "recruitArmy",
            "level": "kingdom-level"
        })
    
    if 'train' in desc_lower and 'army' in desc_lower:
        effects.append({
            "type": "trainArmy",
            "levelIncrease": 1
        })
    
    if 'deploy' in desc_lower and 'army' in desc_lower:
        effects.append({
            "type": "deployArmy",
            "targetArmy": "selected"
        })
    
    if 'outfit' in desc_lower and 'army' in desc_lower:
        effects.append({
            "type": "outfitArmy",
            "targetArmy": "selected"
        })
    
    if 'recover' in desc_lower and 'army' in desc_lower:
        effects.append({
            "type": "recoverArmy",
            "targetArmy": "selected"
        })
    
    if 'disband' in desc_lower and 'army' in desc_lower:
        effects.append({
            "type": "disbandArmy",
            "targetArmy": "selected"
        })
    
    # Diplomatic
    if 'establish' in desc_lower and 'diplomatic' in desc_lower:
        effects.append({
            "type": "establishDiplomaticRelations",
            "targetNation": "selected"
        })
    
    if 'economic aid' in desc_lower:
        effects.append({
            "type": "requestEconomicAid",
            "resourceType": "gold"
        })
    
    if 'military aid' in desc_lower:
        effects.append({
            "type": "requestMilitaryAid"
        })
    
    if 'infiltrat' in desc_lower:
        effects.append({
            "type": "infiltration",
            "targetNation": "selected"
        })
    
    if 'scout' in desc_lower:
        effects.append({
            "type": "sendScouts",
            "purpose": "exploration"
        })
    
    # Event resolution
    if action_id == 'resolve-event':
        effects.append({
            "type": "resolveEvent"
        })
    
    if action_id == 'hire-adventurers':
        if 'resolve' in desc_lower and 'event' in desc_lower:
            effects.append({
                "type": "hireAdventurers",
                "mode": "resolve-event"
            })
        elif 'bonus' in desc_lower or '+2' in desc_lower:
            effects.append({
                "type": "hireAdventurers",
                "mode": "bonus-to-event",
                "bonus": 2
            })
    
    # Aid/Support
    if action_id == 'aid-another':
        value_match = {
            "trained": 2,
            "expert": 2,
            "master": 3,
            "legendary": 4
        }
        
        if 'proficiency' in desc_lower:
            effect = {
                "type": "aidBonus",
                "target": "other-pc",
                "bonusType": "proficiency-scaled",
                "value": value_match
            }
            if outcome == 'criticalSuccess':
                effect["allowReroll"] = True
            effects.append(effect)
        elif '+1' in desc_lower or '-1' in desc_lower:
            value = 1 if '+1' in desc_lower else -1
            effects.append({
                "type": "aidBonus",
                "target": "other-pc",
                "bonusType": "circumstance",
                "value": value
            })
    
    # Unrest management
    if 'arrest' in desc_lower and 'dissident' in desc_lower:
        effects.append({
            "type": "arrestDissidents",
            "unrestToImprison": "dice",
            "dice": "1d4"
        })
    
    if 'execute' in desc_lower and 'prisoner' in desc_lower:
        effect = {"type": "executePrisoners"}
        if 'all' in desc_lower:
            effect["removeAllImprisoned"] = True
        else:
            effect["removeAmount"] = "dice"
            effect["dice"] = "1d4"
        effects.append(effect)
    
    if 'pardon' in desc_lower and 'prisoner' in desc_lower:
        effect = {"type": "pardonPrisoners"}
        if 'all' in desc_lower:
            effect["removeAllImprisoned"] = True
        else:
            effect["removeAmount"] = "dice"
            effect["dice"] = "1d4"
        effects.append(effect)
    
    return effects

def add_game_effects_to_action(filepath: Path) -> None:
    """Add gameEffects to a single action file."""
    print(f"Processing: {filepath.name}")
    
    with open(filepath, 'r') as f:
        data = json.load(f)
    
    action_id = data.get('id', '')
    modified = False
    
    # Skip if already has gameEffects in any outcome
    if 'effects' in data:
        has_effects = any(
            'gameEffects' in data['effects'].get(outcome, {})
            for outcome in ['criticalSuccess', 'success', 'failure', 'criticalFailure']
        )
        if has_effects:
            print(f"  ✓ Already has gameEffects: {filepath.name}")
            return
    
    # Process effects
    if 'effects' in data:
        for outcome in ['criticalSuccess', 'success', 'failure', 'criticalFailure']:
            if outcome in data['effects']:
                effect = data['effects'][outcome]
                description = effect.get('description', '')
                
                # Generate gameEffects
                game_effects = analyze_description(description, action_id, outcome)
                
                # Add to effect
                effect['gameEffects'] = game_effects
                modified = True
    
    # Write back
    if modified:
        with open(filepath, 'w') as f:
            json.dump(data, f, indent=2)
        print(f"  ✓ Updated: {filepath.name}")
    else:
        print(f"  - No changes: {filepath.name}")

def main():
    """Process all action files."""
    actions_dir = Path(__file__).parent.parent / "data" / "player-actions"
    
    print("=" * 60)
    print("ADDING GAME EFFECTS TO PLAYER ACTIONS")
    print("=" * 60)
    print()
    
    action_files = [f for f in actions_dir.glob("*.json") if f.is_file()]
    
    print(f"Found {len(action_files)} action files to process\n")
    
    for filepath in sorted(action_files):
        add_game_effects_to_action(filepath)
    
    print()
    print("=" * 60)
    print("MIGRATION COMPLETE")
    print("=" * 60)
    print(f"Processed {len(action_files)} files")
    print("\nAll actions now have structured gameEffects!")

if __name__ == "__main__":
    main()
