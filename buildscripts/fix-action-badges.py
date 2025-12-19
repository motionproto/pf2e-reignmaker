#!/usr/bin/env python3
"""
Fix Action Badges Script
=========================

Automatically adds missing outcome badges to broken action pipelines.
"""

import re
from pathlib import Path

ACTIONS_DIR = Path("src/pipelines/actions")

# Badge configurations for each broken action
BADGE_FIXES = {
    'arrestDissidents.ts': {
        'import': "import { textBadge } from '../../types/OutcomeBadge';",
        'badges': '''const outcomeBadges = [];
      
      if (ctx.outcome === 'criticalSuccess') {
        outcomeBadges.push(
          textBadge('Imprison dissidents and reduce unrest', 'fa-user-lock', 'positive')
        );
      } else if (ctx.outcome === 'success') {
        outcomeBadges.push(
          textBadge('Imprison dissidents', 'fa-user-lock', 'positive')
        );
      }
      // Failure and criticalFailure already have modifiers that convert to badges'''
    },
    'collectStipend.ts': {
        'import': "import { textBadge } from '../../types/OutcomeBadge';",
        'badges': '''const outcomeBadges = [];
      
      if (ctx.outcome === 'criticalSuccess') {
        outcomeBadges.push(
          textBadge('Collect stipend with bonus', 'fa-coins', 'positive')
        );
      } else if (ctx.outcome === 'success') {
        outcomeBadges.push(
          textBadge('Collect stipend from territories', 'fa-coins', 'positive')
        );
      }'''
    },
    'fortifyHex.ts': {
        'import': "import { textBadge } from '../../types/OutcomeBadge';",
        'badges': '''const outcomeBadges = [];
      
      if (ctx.outcome === 'criticalSuccess') {
        outcomeBadges.push(
          textBadge('Build or upgrade fortification', 'fa-fort-awesome', 'positive')
        );
      } else if (ctx.outcome === 'success') {
        outcomeBadges.push(
          textBadge('Build or upgrade fortification', 'fa-fort-awesome', 'positive')
        );
      }
      // Failure and criticalFailure already have modifiers that convert to badges'''
    },
    'sendScouts.ts': {
        'import': "import { textBadge } from '../../types/OutcomeBadge';",
        'badges': '''const outcomeBadges = [];
      
      if (ctx.outcome === 'criticalSuccess') {
        outcomeBadges.push(
          textBadge('Explore 2 hexes', 'fa-binoculars', 'positive')
        );
      } else if (ctx.outcome === 'success') {
        outcomeBadges.push(
          textBadge('Explore 1 hex', 'fa-binoculars', 'positive')
        );
      }'''
    },
    'upgradeSettlement.ts': {
        'import': "import { textBadge } from '../../types/OutcomeBadge';",
        'badges': '''const outcomeBadges = [];
      
      if (ctx.outcome === 'criticalSuccess') {
        outcomeBadges.push(
          textBadge('Upgrade settlement level (50% cost reduction)', 'fa-city', 'positive')
        );
      } else if (ctx.outcome === 'success') {
        outcomeBadges.push(
          textBadge('Upgrade settlement level', 'fa-city', 'positive')
        );
      }'''
    }
}

def fix_action_file(filepath: Path, config: dict) -> bool:
    """Fix a single action file."""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Check if already fixed
    if 'textBadge' in content and 'outcomeBadges.push' in content:
        print(f"✓ {filepath.name} already fixed")
        return False
    
    # Add import if not present
    if "import { textBadge }" not in content:
        # Find last import line
        import_pattern = r'(import[^;]+;)\n'
        imports = list(re.finditer(import_pattern, content))
        if imports:
            last_import_end = imports[-1].end()
            content = content[:last_import_end] + config['import'] + '\n' + content[last_import_end:]
    
    # Replace preview.calculate
    preview_pattern = r'preview:\s*\{\s*calculate:\s*(?:async\s*)?\([^)]*\)\s*(?:=>)?\s*\{[^}]*return\s*\{[^}]*outcomeBadges:\s*\[\][^}]*\};?\s*\}\s*\}'
    
    replacement = f'''preview: {{
    calculate: (ctx) => {{
      {config['badges']}
      
      return {{
        resources: [],
        outcomeBadges,
        warnings: []
      }};
    }}
  }}'''
    
    new_content = re.sub(preview_pattern, replacement, content, flags=re.DOTALL)
    
    if new_content == content:
        print(f"⚠ {filepath.name} - pattern not matched")
        return False
    
    # Write back
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(new_content)
    
    print(f"✓ Fixed {filepath.name}")
    return True

def main():
    """Main execution."""
    print("🔧 Fixing action pipeline badges...\n")
    
    fixed_count = 0
    for filename, config in BADGE_FIXES.items():
        filepath = ACTIONS_DIR / filename
        if filepath.exists():
            if fix_action_file(filepath, config):
                fixed_count += 1
        else:
            print(f"⚠ {filename} not found")
    
    print(f"\n✅ Fixed {fixed_count} action files!")

if __name__ == "__main__":
    main()
