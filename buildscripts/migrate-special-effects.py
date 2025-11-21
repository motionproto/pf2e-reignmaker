#!/usr/bin/env python3
"""
Migrate specialEffects to outcomeBadges in pipeline files.
Converts SpecialEffect objects to use textBadge helper.
"""

import os
import re

PIPELINES_DIR = "src/pipelines/actions"

def migrate_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()
    
    original = content
    
    # Add import for textBadge if file uses specialEffects
    if 'specialEffects' in content and 'textBadge' not in content:
        # Find import section and add textBadge import
        if "from '../../types/OutcomeBadge'" in content:
            content = content.replace(
                "from '../../types/OutcomeBadge'",
                "from '../../types/OutcomeBadge'"
            )
        else:
            # Add new import after other imports
            import_match = re.search(r"(import .+ from '.+';)\n\n", content)
            if import_match:
                content = content[:import_match.end()] + "import { textBadge } from '../../types/OutcomeBadge';\n" + content[import_match.end():]
            else:
                # Add at top after first import block
                content = re.sub(
                    r"(import [^;]+;\n)(\n)",
                    r"\1import { textBadge } from '../../types/OutcomeBadge';\n\2",
                    content,
                    count=1
                )
    
    # Replace specialEffects variable declarations with outcomeBadges
    content = re.sub(r'\bconst specialEffects\b', 'const outcomeBadges', content)
    content = re.sub(r'\blet specialEffects\b', 'let outcomeBadges', content)
    
    # Replace specialEffects: [] with outcomeBadges: []
    content = re.sub(r'\bspecialEffects:\s*\[\]', 'outcomeBadges: []', content)
    
    # Replace specialEffects array returns
    content = re.sub(r'\breturn\s*\{\s*resources,\s*specialEffects,', 'return { resources, outcomeBadges,', content)
    content = re.sub(r'\breturn\s*\{\s*resources:\s*\[\],\s*specialEffects,', 'return { resources: [], outcomeBadges,', content)
    
    # Replace specialEffects property access
    content = re.sub(r'preview\.specialEffects', 'preview.outcomeBadges', content)
    
    # Replace specialEffects.push({ type: ... }) with outcomeBadges.push(textBadge(...))
    # Pattern: specialEffects.push({ type: 'xxx', message: 'yyy', variant: 'zzz' })
    def replace_push(match):
        obj_content = match.group(1)
        # Extract message
        msg_match = re.search(r"message:\s*[`'\"]([^`'\"]+)[`'\"]|message:\s*(`[^`]+`)", obj_content)
        if not msg_match:
            msg_match = re.search(r"message:\s*(.+?)(?:,|\})", obj_content)
        
        # Extract icon
        icon_match = re.search(r"icon:\s*['\"]([^'\"]+)['\"]", obj_content)
        
        # Extract variant
        variant_match = re.search(r"variant:\s*['\"]([^'\"]+)['\"]", obj_content)
        
        if msg_match:
            msg = msg_match.group(1) or msg_match.group(2) or msg_match.group(0).split('message:')[1].strip().rstrip(',}')
            icon = icon_match.group(1) if icon_match else 'fa-info-circle'
            variant = variant_match.group(1) if variant_match else 'neutral'
            
            # Check if message is a template literal or variable
            if '`' in (msg_match.group(0) or ''):
                msg = msg_match.group(2) if msg_match.group(2) else f"`{msg}`"
            elif not msg.startswith("'") and not msg.startswith('"') and not msg.startswith('`'):
                # It's a variable or expression
                msg = msg.strip().rstrip(',')
            else:
                msg = f"'{msg}'"
            
            return f"outcomeBadges.push(textBadge({msg}, '{icon}', '{variant}'))"
        return match.group(0)
    
    # More specific replacement for push statements
    content = re.sub(
        r'specialEffects\.push\(\{([^}]+)\}\)',
        replace_push,
        content
    )
    
    # Also handle outcomeBadges.push with old format (after variable rename)
    content = re.sub(
        r'outcomeBadges\.push\(\{\s*type:\s*[\'"][^\'\"]+[\'"].*?message:\s*([^,}]+).*?variant:\s*[\'"]([^\'\"]+)[\'"].*?\}\)',
        lambda m: f"outcomeBadges.push(textBadge({m.group(1).strip()}, 'fa-info-circle', '{m.group(2)}'))",
        content,
        flags=re.DOTALL
    )
    
    if content != original:
        with open(filepath, 'w') as f:
            f.write(content)
        return True
    return False

def main():
    files = [f for f in os.listdir(PIPELINES_DIR) if f.endswith('.ts')]
    modified = []
    
    for filename in files:
        filepath = os.path.join(PIPELINES_DIR, filename)
        if migrate_file(filepath):
            modified.append(filename)
            print(f"✅ Modified: {filename}")
    
    print(f"\n📊 Modified {len(modified)} files")

if __name__ == "__main__":
    main()
