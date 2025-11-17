#!/usr/bin/env python3
"""
Generate TypeScript pipeline files for all events and incidents.

Reads JSON data from data/events/ and data/incidents/ and generates
corresponding TypeScript pipeline files in src/pipelines/events/ and
src/pipelines/incidents/.
"""

import json
from pathlib import Path
from typing import List, Dict, Any

def format_skill_list(skills: List[Dict[str, str]]) -> str:
    """Format skills array for TypeScript."""
    if not skills:
        return "[]"
    
    lines = ["["]
    for skill in skills:
        lines.append(f"    {{ skill: '{skill['skill']}', description: '{skill['description']}' }},")
    lines.append("  ]")
    return "\n  ".join(lines)

def format_modifier(modifier: Dict[str, Any]) -> str:
    """Format a single modifier for TypeScript."""
    mod_type = modifier.get('type', 'static')
    
    if mod_type == 'static':
        resource = modifier.get('resource', '')
        value = modifier.get('value', 0)
        duration = modifier.get('duration', 'immediate')
        return f"{{ type: 'static', resource: '{resource}', value: {value}, duration: '{duration}' }}"
    
    elif mod_type == 'dice':
        resource = modifier.get('resource', '')
        formula = modifier.get('formula', '1d4')
        negative = modifier.get('negative', False)
        duration = modifier.get('duration', 'immediate')
        neg_str = ', negative: true' if negative else ''
        return f"{{ type: 'dice', resource: '{resource}', formula: '{formula}'{neg_str}, duration: '{duration}' }}"
    
    elif mod_type == 'choice':
        resources = modifier.get('resources', [])
        value = modifier.get('value', 1)
        negative = modifier.get('negative', False)
        duration = modifier.get('duration', 'immediate')
        resources_str = json.dumps(resources)
        neg_str = 'true' if negative else 'false'
        return f"{{ type: 'choice', resources: {resources_str}, value: {value}, negative: {neg_str}, duration: '{duration}' }}"
    
    else:
        # Fallback: use JSON serialization to ensure proper JavaScript types
        return json.dumps(modifier)

def format_modifiers(modifiers: List[Dict[str, Any]]) -> str:
    """Format modifiers array for TypeScript."""
    if not modifiers:
        return "[]"
    
    if len(modifiers) == 1:
        return f"[\n        {format_modifier(modifiers[0])}\n      ]"
    
    lines = ["["]
    for modifier in modifiers:
        lines.append(f"        {format_modifier(modifier)},")
    lines.append("      ]")
    return "\n".join(lines)

def escape_string(s: str) -> str:
    """Escape string for TypeScript."""
    return s.replace("'", "\\'").replace('\n', '\\n')

def generate_event_pipeline(event_data: Dict[str, Any]) -> str:
    """Generate TypeScript pipeline code for an event."""
    event_id = event_data['id']
    name = event_data['name']
    description = escape_string(event_data.get('description', ''))
    tier = event_data.get('tier', 1)
    skills = event_data.get('skills', [])
    effects = event_data.get('effects', {})
    
    # Convert PascalCase to camelCase for variable name
    var_name = ''.join(word.capitalize() for word in event_id.split('-')) + 'Pipeline'
    var_name = var_name[0].lower() + var_name[1:]
    
    # Build outcomes
    outcomes_lines = []
    for outcome_key in ['criticalSuccess', 'success', 'failure', 'criticalFailure']:
        if outcome_key in effects:
            outcome_data = effects[outcome_key]
            msg = escape_string(outcome_data.get('msg', ''))
            modifiers = outcome_data.get('modifiers', [])
            manual_effects = outcome_data.get('manualEffects', [])
            
            outcomes_lines.append(f"    {outcome_key}: {{")
            outcomes_lines.append(f"      description: '{msg}',")
            modifiers_str = format_modifiers(modifiers)
            if manual_effects:
                outcomes_lines.append(f"      modifiers: {modifiers_str},")
                manual_str = json.dumps(manual_effects)
                outcomes_lines.append(f"      manualEffects: {manual_str}")
            else:
                outcomes_lines.append(f"      modifiers: {modifiers_str}")
            outcomes_lines.append("    },")
    
    outcomes_str = "\n".join(outcomes_lines)
    
    template = f"""/**
 * {name} Event Pipeline
 *
 * Generated from data/events/{event_id}.json
 */

import type {{ CheckPipeline }} from '../../types/CheckPipeline';
import {{ applyPipelineModifiers }} from '../shared/applyPipelineModifiers';

export const {var_name}: CheckPipeline = {{
  id: '{event_id}',
  name: '{name}',
  description: '{description}',
  checkType: 'event',
  tier: {tier},

  skills: {format_skill_list(skills)},

  outcomes: {{
{outcomes_str}
  }},

  preview: {{
    providedByInteraction: false
  }},

  execute: async (ctx) => {{
    // Apply modifiers from outcome
    await applyPipelineModifiers({var_name}, ctx.outcome);
    return {{ success: true }};
  }}
}};
"""
    return template

def generate_incident_pipeline(incident_data: Dict[str, Any], severity: str) -> str:
    """Generate TypeScript pipeline code for an incident."""
    incident_id = incident_data['id']
    name = incident_data['name']
    description = escape_string(incident_data.get('description', ''))
    tier = incident_data.get('tier', severity)
    skills = incident_data.get('skills', [])
    effects = incident_data.get('effects', {})
    
    # Convert PascalCase to camelCase for variable name
    var_name = ''.join(word.capitalize() for word in incident_id.split('-')) + 'Pipeline'
    var_name = var_name[0].lower() + var_name[1:]
    
    # Build outcomes
    outcomes_lines = []
    for outcome_key in ['criticalSuccess', 'success', 'failure', 'criticalFailure']:
        if outcome_key in effects:
            outcome_data = effects[outcome_key]
            msg = escape_string(outcome_data.get('msg', ''))
            modifiers = outcome_data.get('modifiers', [])
            manual_effects = outcome_data.get('manualEffects', [])
            
            outcomes_lines.append(f"    {outcome_key}: {{")
            outcomes_lines.append(f"      description: '{msg}',")
            modifiers_str = format_modifiers(modifiers)
            if manual_effects:
                outcomes_lines.append(f"      modifiers: {modifiers_str},")
                manual_str = json.dumps(manual_effects)
                outcomes_lines.append(f"      manualEffects: {manual_str}")
            else:
                outcomes_lines.append(f"      modifiers: {modifiers_str}")
            outcomes_lines.append("    },")
    
    outcomes_str = "\n".join(outcomes_lines)
    
    template = f"""/**
 * {name} Incident Pipeline
 *
 * Generated from data/incidents/{severity}/{incident_id}.json
 */

import type {{ CheckPipeline }} from '../../../types/CheckPipeline';
import {{ applyPipelineModifiers }} from '../../shared/applyPipelineModifiers';

export const {var_name}: CheckPipeline = {{
  id: '{incident_id}',
  name: '{name}',
  description: '{description}',
  checkType: 'incident',
  tier: '{tier}',

  skills: {format_skill_list(skills)},

  outcomes: {{
{outcomes_str}
  }},

  preview: {{
    providedByInteraction: false
  }},

  execute: async (ctx) => {{
    // Apply modifiers from outcome
    await applyPipelineModifiers({var_name}, ctx.outcome);
    return {{ success: true }};
  }}
}};
"""
    return template

def main():
    """Generate all event and incident pipeline files."""
    base_dir = Path(__file__).parent.parent
    
    print("=" * 60)
    print("GENERATING EVENT/INCIDENT PIPELINE FILES")
    print("=" * 60)
    
    # Generate event pipelines
    events_data_dir = base_dir / "data" / "events"
    events_output_dir = base_dir / "src" / "pipelines" / "events"
    events_output_dir.mkdir(parents=True, exist_ok=True)
    
    print("\n📚 Generating Event Pipelines...")
    event_files = sorted(events_data_dir.glob("*.json"))
    event_count = 0
    
    for json_file in event_files:
        try:
            with open(json_file, 'r') as f:
                event_data = json.load(f)
            
            # Generate TypeScript file
            ts_content = generate_event_pipeline(event_data)
            output_file = events_output_dir / f"{event_data['id']}.ts"
            
            with open(output_file, 'w') as f:
                f.write(ts_content)
            
            print(f"  ✓ Generated: {output_file.name}")
            event_count += 1
        except Exception as e:
            print(f"  ✗ Error processing {json_file.name}: {e}")
    
    print(f"✅ Generated {event_count} event pipelines")
    
    # Generate incident pipelines
    incidents_base_dir = base_dir / "data" / "incidents"
    incidents_output_dir = base_dir / "src" / "pipelines" / "incidents"
    
    print("\n⚠️  Generating Incident Pipelines...")
    incident_count = 0
    
    for severity in ["minor", "moderate", "major"]:
        severity_dir = incidents_base_dir / severity
        if not severity_dir.exists():
            continue
        
        # Create output directory
        severity_output_dir = incidents_output_dir / severity
        severity_output_dir.mkdir(parents=True, exist_ok=True)
        
        print(f"\n  {severity.capitalize()} incidents:")
        incident_files = sorted(severity_dir.glob("*.json"))
        
        for json_file in incident_files:
            try:
                with open(json_file, 'r') as f:
                    incident_data = json.load(f)
                
                # Generate TypeScript file
                ts_content = generate_incident_pipeline(incident_data, severity)
                output_file = severity_output_dir / f"{incident_data['id']}.ts"
                
                with open(output_file, 'w') as f:
                    f.write(ts_content)
                
                print(f"    ✓ Generated: {output_file.name}")
                incident_count += 1
            except Exception as e:
                print(f"    ✗ Error processing {json_file.name}: {e}")
    
    print(f"\n✅ Generated {incident_count} incident pipelines")
    
    # Summary
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    print(f"✅ Event pipelines: {event_count} files")
    print(f"✅ Incident pipelines: {incident_count} files")
    print(f"✅ Total: {event_count + incident_count} pipeline files generated")
    print(f"\nOutput directories:")
    print(f"  - {events_output_dir}")
    print(f"  - {incidents_output_dir}")

if __name__ == "__main__":
    main()
