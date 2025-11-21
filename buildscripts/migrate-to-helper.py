#!/usr/bin/env python3
"""
Migrate action pipelines to use createActionPipeline helper.

Reads existing TS files and extracts custom logic, then generates
new files that import from JSON via the helper.
"""

import re
from pathlib import Path

# Files already migrated
ALREADY_MIGRATED = {'arrestDissidents.ts', 'dealWithUnrest.ts'}

def extract_custom_logic(content: str) -> dict:
    """Extract custom logic sections from existing pipeline."""
    result = {
        'requirements': None,
        'preRollInteractions': None,
        'postRollInteractions': None,
        'preview': None,
        'execute': None,
        'imports': []
    }
    
    # Check for applyPipelineModifiers import
    if 'applyPipelineModifiers' in content:
        result['imports'].append("import { applyPipelineModifiers } from '../shared/applyPipelineModifiers';")
    
    # Extract requirements function if present
    req_match = re.search(r'requirements:\s*\([^)]*\)\s*=>\s*\{[\s\S]*?\n  \},', content)
    if req_match:
        result['requirements'] = req_match.group(0)
    
    # Extract preRollInteractions if present
    pre_match = re.search(r'preRollInteractions:\s*\[[\s\S]*?\n  \],', content)
    if pre_match:
        result['preRollInteractions'] = pre_match.group(0)
    
    # Extract postRollInteractions if present  
    post_match = re.search(r'postRollInteractions:\s*\[[\s\S]*?\n  \],', content)
    if post_match:
        result['postRollInteractions'] = post_match.group(0)
    
    # Extract preview if present
    preview_match = re.search(r'preview:\s*\{[\s\S]*?\n  \}[,\n]', content)
    if preview_match:
        result['preview'] = preview_match.group(0).rstrip(',\n')
    
    # Extract execute if present
    exec_match = re.search(r'execute:\s*async\s*\([^)]*\)\s*=>\s*\{[\s\S]*?\n  \}[,\n]', content)
    if exec_match:
        result['execute'] = exec_match.group(0).rstrip(',\n')
    
    return result

def kebab_to_camel(name: str) -> str:
    """Convert kebab-case filename to camelCase action ID."""
    # Remove .ts extension
    name = name.replace('.ts', '')
    # Split by capital letters and join with hyphens
    result = re.sub('([A-Z])', r'-\1', name).lower()
    return result.lstrip('-')

def generate_migrated_file(filename: str, action_id: str, custom: dict) -> str:
    """Generate migrated pipeline file content."""
    imports = ["import { createActionPipeline } from '../shared/createActionPipeline';"]
    imports.extend(custom['imports'])
    imports_str = '\n'.join(imports)
    
    # Build overrides
    overrides = []
    
    if custom['requirements']:
        overrides.append(custom['requirements'])
    if custom['preRollInteractions']:
        overrides.append(custom['preRollInteractions'])
    if custom['postRollInteractions']:
        overrides.append(custom['postRollInteractions'])
    if custom['preview']:
        overrides.append(custom['preview'])
    if custom['execute']:
        overrides.append(custom['execute'])
    
    # Default preview if none found
    if not custom['preview']:
        overrides.append("preview: { providedByInteraction: false }")
    
    overrides_str = ',\n\n  '.join(overrides) if overrides else "preview: { providedByInteraction: false }"
    
    var_name = filename.replace('.ts', '') + 'Pipeline'
    
    return f'''/**
 * {filename.replace('.ts', '')} Action Pipeline
 * Data from: data/player-actions/{action_id}.json
 */

{imports_str}

export const {var_name} = createActionPipeline('{action_id}', {{
  {overrides_str}
}});
'''

def main():
    base_dir = Path(__file__).parent.parent
    actions_dir = base_dir / 'src' / 'pipelines' / 'actions'
    
    print("=" * 60)
    print("MIGRATING ACTION PIPELINES TO HELPER PATTERN")
    print("=" * 60)
    
    migrated = 0
    skipped = 0
    
    for ts_file in sorted(actions_dir.glob('*.ts')):
        if ts_file.name == 'README.md':
            continue
        if ts_file.name in ALREADY_MIGRATED:
            print(f"  ⏭️  Skipped: {ts_file.name} (already migrated)")
            skipped += 1
            continue
        
        try:
            content = ts_file.read_text()
            
            # Skip if already using createActionPipeline
            if 'createActionPipeline' in content:
                print(f"  ⏭️  Skipped: {ts_file.name} (already uses helper)")
                skipped += 1
                continue
            
            # Extract custom logic
            custom = extract_custom_logic(content)
            
            # Get action ID from filename
            action_id = kebab_to_camel(ts_file.name)
            
            # Generate new content
            new_content = generate_migrated_file(ts_file.name, action_id, custom)
            
            # Write file
            ts_file.write_text(new_content)
            print(f"  ✓ Migrated: {ts_file.name}")
            migrated += 1
            
        except Exception as e:
            print(f"  ✗ Error: {ts_file.name}: {e}")
    
    print("\n" + "=" * 60)
    print(f"✅ Migrated: {migrated}")
    print(f"⏭️  Skipped: {skipped}")

if __name__ == "__main__":
    main()
