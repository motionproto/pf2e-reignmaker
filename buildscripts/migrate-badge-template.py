#!/usr/bin/env python3
"""
Migrate OutcomeBadge from prefix/suffix format to template format.
Converts: { prefix: 'Received', value: ..., suffix: 'gold' }
To:       { template: 'Received {{value}} gold', value: ... }
"""

import os
import re

FILES = [
    "src/services/gameCommands/GameCommandHandler.ts",
    "src/services/gameCommands/handlers/RequestMilitaryAidHandler.ts",
    "src/services/gameCommands/handlers/OutfitArmyHandler.ts",
    "src/services/commands/settlements/foundSettlement.ts",
    "src/services/commands/resources/playerRewards.ts",
    "src/services/commands/armies/armyCommands.ts",
    "src/services/commands/factions/attitudeCommands.ts",
    "src/services/GameCommandsResolver.ts",
]

def migrate_file(filepath):
    if not os.path.exists(filepath):
        print(f"⚠️ Skipped (not found): {filepath}")
        return False
        
    with open(filepath, 'r') as f:
        content = f.read()
    
    original = content
    
    # Pattern: prefix: 'xxx', value: {...}, suffix: 'yyy'
    # Convert to: template: 'xxx {{value}} yyy', value: {...}
    
    # Match badge objects with prefix/suffix
    def convert_badge(match):
        obj = match.group(0)
        
        # Extract prefix
        prefix_match = re.search(r"prefix:\s*['\"`]([^'\"`]*)['\"`]", obj)
        prefix = prefix_match.group(1) if prefix_match else ''
        
        # Extract suffix  
        suffix_match = re.search(r"suffix:\s*['\"`]([^'\"`]*)['\"`]", obj)
        suffix = suffix_match.group(1) if suffix_match else ''
        
        # Build template
        parts = []
        if prefix:
            parts.append(prefix)
        parts.append('{{value}}')
        if suffix:
            parts.append(suffix)
        template = ' '.join(parts)
        
        # Remove prefix and suffix lines
        obj = re.sub(r",?\s*prefix:\s*['\"`][^'\"`]*['\"`],?", '', obj)
        obj = re.sub(r",?\s*suffix:\s*['\"`][^'\"`]*['\"`],?", '', obj)
        
        # Add template after icon
        obj = re.sub(
            r"(icon:\s*['\"`][^'\"`]*['\"`])",
            f"\\1,\n          template: '{template}'",
            obj
        )
        
        # Clean up any double commas
        obj = re.sub(r',\s*,', ',', obj)
        obj = re.sub(r',\s*\}', ' }', obj)
        
        return obj
    
    # Find badge objects containing prefix:
    content = re.sub(
        r'\{\s*icon:[^}]+prefix:[^}]+\}',
        convert_badge,
        content,
        flags=re.DOTALL
    )
    
    if content != original:
        with open(filepath, 'w') as f:
            f.write(content)
        return True
    return False

def main():
    modified = []
    for filepath in FILES:
        if migrate_file(filepath):
            modified.append(filepath)
            print(f"✅ Modified: {filepath}")
    
    print(f"\n📊 Modified {len(modified)} files")

if __name__ == "__main__":
    main()
