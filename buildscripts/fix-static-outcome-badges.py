#!/usr/bin/env python3
"""
Fix Static Outcome Badges Script
==================================

Adds outcome badges to static outcomes objects in action pipelines.
"""

import re
from pathlib import Path

ACTIONS_DIR = Path("src/pipelines/actions")

# Badge configurations for each action that needs fixing
FIXES = {
    'fortifyHex.ts': {
        'criticalSuccess': "textBadge('Build or upgrade fortification', 'fa-fort-awesome', 'positive')",
        'success': "textBadge('Build or upgrade fortification', 'fa-fort-awesome', 'positive')"
    },
    'arrestDissidents.ts': {
        'criticalSuccess': "textBadge('Imprison dissidents and reduce unrest', 'fa-user-lock', 'positive')",
        'success': "textBadge('Imprison dissidents', 'fa-user-lock', 'positive')"
    },
    'sendScouts.ts': {
        'criticalSuccess': "textBadge('Explore 2 hexes', 'fa-binoculars', 'positive')",
        'success': "textBadge('Explore 1 hex', 'fa-binoculars', 'positive')"
    }
}

def fix_action_file(filepath: Path, badges: dict) -> bool:
    """Fix a single action file by adding outcome badges."""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    modified = False
    
    for outcome, badge_code in badges.items():
        # Pattern to find outcome without outcomeBadges
        pattern = rf'{outcome}:\s*\{{\s*description:\s*["\']([^"\']+)["\'],\s*modifiers:\s*\[([^\]]*)\]\s*\}}'
        
        def replace_outcome(match):
            nonlocal modified
            description = match.group(1)
            modifiers = match.group(2).strip()
            modified = True
            
            return f"""{outcome}: {{
      description: '{description}',
      modifiers: [{modifiers}],
      outcomeBadges: [
        {badge_code}
      ]
    }}"""
        
        content = re.sub(pattern, replace_outcome, content, flags=re.DOTALL)
    
    if modified:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"✓ Fixed {filepath.name}")
        return True
    else:
        print(f"⚠ {filepath.name} - no changes needed or pattern not matched")
        return False

def main():
    """Main execution."""
    print("🔧 Fixing static outcome badges...\n")
    
    fixed_count = 0
    for filename, badges in FIXES.items():
        filepath = ACTIONS_DIR / filename
        if filepath.exists():
            if fix_action_file(filepath, badges):
                fixed_count += 1
        else:
            print(f"⚠ {filename} not found")
    
    print(f"\n✅ Fixed {fixed_count} action files!")

if __name__ == "__main__":
    main()
