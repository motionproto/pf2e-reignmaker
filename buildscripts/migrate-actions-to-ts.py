#!/usr/bin/env python3
"""
Migrate action JSON data into TypeScript pipeline files.
This script reads the JSON data and the existing TypeScript file,
then generates a new TypeScript file with embedded data.
"""

import json
import os
import re
from pathlib import Path

# Map JSON filenames to TS export names
FILE_MAP = {
    'aid-another.json': ('aidAnother.ts', 'aidAnotherPipeline'),
    'arrest-dissidents.json': ('arrestDissidents.ts', 'arrestDissidentsPipeline'),
    'build-roads.json': ('buildRoads.ts', 'buildRoadsPipeline'),
    'build-structure.json': ('buildStructure.ts', 'buildStructurePipeline'),
    'claim-hexes.json': ('claimHexes.ts', 'claimHexesPipeline'),
    'collect-stipend.json': ('collectStipend.ts', 'collectStipendPipeline'),
    'create-worksite.json': ('createWorksite.ts', 'createWorksitePipeline'),
    'deal-with-unrest.json': ('dealWithUnrest.ts', 'dealWithUnrestPipeline'),
    'deploy-army.json': ('deployArmy.ts', 'deployArmyPipeline'),
    'diplomatic-mission.json': ('diplomaticMission.ts', 'establishDiplomaticRelationsPipeline'),
    'disband-army.json': ('disbandArmy.ts', 'disbandArmyPipeline'),
    'establish-settlement.json': ('establishSettlement.ts', 'establishSettlementPipeline'),
    'execute-or-pardon-prisoners.json': ('executeOrPardonPrisoners.ts', 'executeOrPardonPrisonersPipeline'),
    'fortify-hex.json': ('fortifyHex.ts', 'fortifyHexPipeline'),
    'harvest-resources.json': ('harvestResources.ts', 'harvestResourcesPipeline'),
    'infiltration.json': ('infiltration.ts', 'infiltrationPipeline'),
    'outfit-army.json': ('outfitArmy.ts', 'outfitArmyPipeline'),
    'purchase-resources.json': ('purchaseResources.ts', 'purchaseResourcesPipeline'),
    'recruit-unit.json': ('recruitUnit.ts', 'recruitUnitPipeline'),
    'repair-structure.json': ('repairStructure.ts', 'repairStructurePipeline'),
    'request-economic-aid.json': ('requestEconomicAid.ts', 'requestEconomicAidPipeline'),
    'request-military-aid.json': ('requestMilitaryAid.ts', 'requestMilitaryAidPipeline'),
    'sell-surplus.json': ('sellSurplus.ts', 'sellSurplusPipeline'),
    'send-scouts.json': ('sendScouts.ts', 'sendScoutsPipeline'),
    'tend-wounded.json': ('tendWounded.ts', 'tendWoundedPipeline'),
    'train-army.json': ('trainArmy.ts', 'trainArmyPipeline'),
    'upgrade-settlement.json': ('upgradeSettlement.ts', 'upgradeSettlementPipeline'),
}

def escape_ts_string(s):
    """Escape a string for TypeScript."""
    if not s:
        return ''
    return s.replace('\\', '\\\\').replace("'", "\\'").replace('\n', '\\n')

def format_skills(skills):
    """Format skills array for TypeScript."""
    if not skills:
        return '[]'
    
    lines = []
    for skill in skills:
        skill_name = skill.get('skill', '')
        desc = escape_ts_string(skill.get('description', ''))
        lines.append(f"    {{ skill: '{skill_name}', description: '{desc}' }}")
    
    return '[\n' + ',\n'.join(lines) + '\n  ]'

def format_modifiers(modifiers):
    """Format modifiers array for TypeScript."""
    if not modifiers:
        return '[]'
    
    lines = []
    for mod in modifiers:
        parts = []
        if 'type' in mod:
            parts.append(f"type: '{mod['type']}'")
        if 'resource' in mod:
            parts.append(f"resource: '{mod['resource']}'")
        if 'value' in mod:
            parts.append(f"value: {mod['value']}")
        if 'formula' in mod:
            parts.append(f"formula: '{mod['formula']}'")
        if 'negative' in mod:
            parts.append(f"negative: {'true' if mod['negative'] else 'false'}")
        if 'duration' in mod:
            parts.append(f"duration: '{mod['duration']}'")
        
        lines.append('{ ' + ', '.join(parts) + ' }')
    
    return '[\n        ' + ',\n        '.join(lines) + '\n      ]'

def format_manual_effects(effects):
    """Format manual effects array for TypeScript."""
    if not effects:
        return None
    
    escaped = [f"'{escape_ts_string(e)}'" for e in effects]
    return '[' + ', '.join(escaped) + ']'

def format_outcome(outcome_data):
    """Format a single outcome for TypeScript."""
    if not outcome_data:
        return None
    
    desc = escape_ts_string(outcome_data.get('description', ''))
    modifiers = format_modifiers(outcome_data.get('modifiers', []))
    
    parts = [
        f"description: '{desc}'",
        f"modifiers: {modifiers}"
    ]
    
    if outcome_data.get('manualEffects'):
        manual = format_manual_effects(outcome_data['manualEffects'])
        parts.append(f"manualEffects: {manual}")
    
    if outcome_data.get('gameCommands'):
        # Just use empty array for now - game commands are handled in execute
        pass
    
    return '{\n      ' + ',\n      '.join(parts) + '\n    }'

def format_cost(cost):
    """Format cost object for TypeScript."""
    if not cost:
        return None
    
    parts = [f"{k}: {v}" for k, v in cost.items()]
    return '{ ' + ', '.join(parts) + ' }'

def generate_base_data(json_data):
    """Generate the base data section of the pipeline."""
    lines = []
    
    # ID
    lines.append(f"  id: '{json_data['id']}',")
    
    # Name
    lines.append(f"  name: '{escape_ts_string(json_data['name'])}',")
    
    # Description
    lines.append(f"  description: '{escape_ts_string(json_data['description'])}',")
    
    # Brief (optional)
    if json_data.get('brief'):
        lines.append(f"  brief: '{escape_ts_string(json_data['brief'])}',")
    
    # Category
    lines.append(f"  category: '{json_data['category']}',")
    
    # Check type
    lines.append("  checkType: 'action',")
    
    # Cost (optional)
    if json_data.get('cost'):
        cost = format_cost(json_data['cost'])
        lines.append(f"  cost: {cost},")
    
    # Special (optional)
    if json_data.get('special'):
        lines.append(f"  special: '{escape_ts_string(json_data['special'])}',")
    
    # Skills
    skills = format_skills(json_data.get('skills', []))
    lines.append(f"  skills: {skills},")
    
    # Outcomes
    lines.append("")
    lines.append("  outcomes: {")
    
    outcomes = json_data.get('outcomes', {})
    outcome_lines = []
    
    for outcome_type in ['criticalSuccess', 'success', 'failure', 'criticalFailure']:
        if outcome_type in outcomes:
            formatted = format_outcome(outcomes[outcome_type])
            if formatted:
                outcome_lines.append(f"    {outcome_type}: {formatted}")
    
    lines.append(',\n'.join(outcome_lines))
    lines.append("  },")
    
    return '\n'.join(lines)

def main():
    script_dir = Path(__file__).parent
    project_root = script_dir.parent
    json_dir = project_root / 'archived-implementations' / 'data-json' / 'player-actions'
    ts_dir = project_root / 'src' / 'pipelines' / 'actions'
    
    print("=" * 60)
    print("ACTION DATA MIGRATION REPORT")
    print("=" * 60)
    
    for json_file, (ts_file, export_name) in FILE_MAP.items():
        json_path = json_dir / json_file
        ts_path = ts_dir / ts_file
        
        if not json_path.exists():
            print(f"⚠️  JSON not found: {json_file}")
            continue
        
        if not ts_path.exists():
            print(f"⚠️  TS not found: {ts_file}")
            continue
        
        # Load JSON
        with open(json_path, 'r') as f:
            json_data = json.load(f)
        
        # Load existing TS
        with open(ts_path, 'r') as f:
            ts_content = f.read()
        
        # Check if already migrated (doesn't use createActionPipeline)
        if 'createActionPipeline' not in ts_content:
            print(f"✅ Already migrated: {ts_file}")
            continue
        
        print(f"\n📋 {json_file} -> {ts_file}")
        print(f"   ID: {json_data['id']}")
        print(f"   Name: {json_data['name']}")
        print(f"   Skills: {len(json_data.get('skills', []))}")
        
        # Generate base data
        base_data = generate_base_data(json_data)
        print(f"\n   === BASE DATA ===")
        print(base_data[:500] + "..." if len(base_data) > 500 else base_data)

if __name__ == '__main__':
    main()

