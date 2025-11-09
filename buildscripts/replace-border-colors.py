#!/usr/bin/env python3
"""
Replace hardcoded border colors with design system variables.
Maps RGBA/HSLA values to the closest matching CSS variable.
"""

import re
import os
from pathlib import Path
from typing import Dict, List, Tuple

# Color mappings: (pattern, replacement_var, description)
BORDER_REPLACEMENTS = [
    # Neutral borders (white/gray) - ordered by opacity/darkness
    (r'rgba?\(255,\s*255,\s*255,\s*0\.05\)', 'var(--border-faint)', 'White 5%'),
    (r'rgba?\(255,\s*255,\s*255,\s*0\.0?5\)', 'var(--border-faint)', 'White 5% variant'),
    (r'rgba?\(255,\s*255,\s*255,\s*0\.1\)', 'var(--border-subtle)', 'White 10%'),
    (r'rgba?\(255,\s*255,\s*255,\s*0\.10\)', 'var(--border-subtle)', 'White 10% variant'),
    (r'rgba?\(255,\s*255,\s*255,\s*0\.2\)', 'var(--border-default)', 'White 20%'),
    (r'rgba?\(255,\s*255,\s*255,\s*0\.20\)', 'var(--border-default)', 'White 20% variant'),
    (r'rgba?\(255,\s*255,\s*255,\s*0\.3\)', 'var(--border-medium)', 'White 30%'),
    (r'rgba?\(255,\s*255,\s*255,\s*0\.30\)', 'var(--border-medium)', 'White 30% variant'),
    (r'rgba?\(255,\s*255,\s*255,\s*0\.4\)', 'var(--border-strong)', 'White 40%'),
    (r'rgba?\(255,\s*255,\s*255,\s*0\.40\)', 'var(--border-strong)', 'White 40% variant'),
    (r'rgba?\(255,\s*255,\s*255,\s*0\.5\)', 'var(--border-strong)', 'White 50%'),
    (r'rgba?\(255,\s*255,\s*255,\s*0\.50\)', 'var(--border-strong)', 'White 50% variant'),
    (r'rgba?\(255,\s*255,\s*255,\s*0\.6\)', 'var(--border-strong)', 'White 60%'),
    (r'rgba?\(255,\s*255,\s*255,\s*0\.60\)', 'var(--border-strong)', 'White 60% variant'),
    
    # Gray borders
    (r'rgba?\(128,\s*128,\s*128,\s*0\.3\)', 'var(--border-default)', 'Gray 30%'),
    (r'rgba?\(128,\s*128,\s*128,\s*0\.30\)', 'var(--border-default)', 'Gray 30% variant'),
    (r'rgba?\(128,\s*128,\s*128,\s*0\.4\)', 'var(--border-medium)', 'Gray 40%'),
    (r'rgba?\(128,\s*128,\s*128,\s*0\.40\)', 'var(--border-medium)', 'Gray 40% variant'),
    (r'rgba?\(128,\s*128,\s*128,\s*0\.5\)', 'var(--border-medium)', 'Gray 50%'),
    (r'rgba?\(128,\s*128,\s*128,\s*0\.50\)', 'var(--border-medium)', 'Gray 50% variant'),
    (r'rgba?\(128,\s*128,\s*128,\s*0\.6\)', 'var(--border-strong)', 'Gray 60%'),
    (r'rgba?\(120,\s*120,\s*120,\s*0\.2\)', 'var(--border-default)', 'Gray 120 20%'),
    (r'rgba?\(120,\s*120,\s*120,\s*0\.3\)', 'var(--border-default)', 'Gray 120 30%'),
    (r'rgba?\(100,\s*116,\s*139,\s*0\.1\)', 'var(--border-subtle)', 'Slate gray 10%'),
    (r'rgba?\(100,\s*116,\s*139,\s*0\.2\)', 'var(--border-default)', 'Slate gray 20%'),
    (r'rgba?\(100,\s*116,\s*139,\s*0\.3\)', 'var(--border-default)', 'Slate gray 30%'),
    (r'rgba?\(100,\s*116,\s*139,\s*0\.4\)', 'var(--border-medium)', 'Slate gray 40%'),
    (r'rgba?\(100,\s*116,\s*139,\s*0\.5\)', 'var(--border-medium)', 'Slate gray 50%'),
    
    # Primary borders (crimson/red)
    (r'rgba?\(139,\s*0,\s*0,\s*0\.3\)', 'var(--border-primary-faint)', 'Maroon 30%'),
    (r'rgba?\(139,\s*0,\s*0,\s*0\.4\)', 'var(--border-primary-subtle)', 'Maroon 40%'),
    (r'rgba?\(239,\s*68,\s*68,\s*0\.15\)', 'var(--border-primary-faint)', 'Red 15%'),
    (r'rgba?\(239,\s*68,\s*68,\s*0\.3\)', 'var(--border-primary-subtle)', 'Red 30%'),
    (r'rgba?\(239,\s*68,\s*68,\s*0\.4\)', 'var(--border-primary)', 'Red 40%'),
    (r'rgba?\(239,\s*68,\s*68,\s*0\.5\)', 'var(--border-primary-medium)', 'Red 50%'),
    (r'rgba?\(239,\s*68,\s*68,\s*0\.6\)', 'var(--border-primary-medium)', 'Red 60%'),
    (r'rgba?\(220,\s*53,\s*69,\s*0\.3\)', 'var(--border-primary-subtle)', 'Red 220 30%'),
    (r'rgba?\(255,\s*107,\s*107,\s*0\.3\)', 'var(--border-primary-medium)', 'Light red 30%'),
    
    # Accent borders (amber/orange/yellow)
    (r'rgba?\(251,\s*191,\s*36,\s*0\.1\)', 'var(--border-accent-faint)', 'Amber 10%'),
    (r'rgba?\(251,\s*191,\s*36,\s*0\.15\)', 'var(--border-accent-faint)', 'Amber 15%'),
    (r'rgba?\(251,\s*191,\s*36,\s*0\.2\)', 'var(--border-accent-subtle)', 'Amber 20%'),
    (r'rgba?\(251,\s*191,\s*36,\s*0\.3\)', 'var(--border-accent-subtle)', 'Amber 30%'),
    (r'rgba?\(251,\s*191,\s*36,\s*0\.4\)', 'var(--border-accent)', 'Amber 40%'),
    (r'rgba?\(251,\s*191,\s*36,\s*0\.5\)', 'var(--border-accent-medium)', 'Amber 50%'),
    (r'rgba?\(245,\s*158,\s*11,\s*0\.1\)', 'var(--border-accent-faint)', 'Orange 10%'),
    (r'rgba?\(245,\s*158,\s*11,\s*0\.15\)', 'var(--border-accent-faint)', 'Orange 15%'),
    (r'rgba?\(245,\s*158,\s*11,\s*0\.3\)', 'var(--border-accent-subtle)', 'Orange 30%'),
    (r'rgba?\(245,\s*158,\s*11,\s*0\.4\)', 'var(--border-accent)', 'Orange 40%'),
    (r'rgba?\(255,\s*191,\s*0,\s*0\.3\)', 'var(--border-accent-subtle)', 'Gold 30%'),
    (r'rgba?\(234,\s*179,\s*8,\s*0\.15\)', 'var(--border-accent-faint)', 'Yellow 15%'),
    (r'rgba?\(234,\s*179,\s*8,\s*0\.3\)', 'var(--border-accent-subtle)', 'Yellow 30%'),
    (r'rgba?\(251,\s*146,\s*60,\s*0\.05\)', 'var(--border-accent-faint)', 'Orange 5%'),
    (r'rgba?\(251,\s*146,\s*60,\s*0\.4\)', 'var(--border-accent)', 'Orange 40%'),
    (r'rgba?\(249,\s*115,\s*22,\s*0\.1\)', 'var(--border-accent-faint)', 'Orange 249 10%'),
    (r'rgba?\(249,\s*115,\s*22,\s*0\.15\)', 'var(--border-accent-faint)', 'Orange 249 15%'),
    (r'rgba?\(249,\s*115,\s*22,\s*0\.2\)', 'var(--border-accent-subtle)', 'Orange 249 20%'),
    (r'rgba?\(249,\s*115,\s*22,\s*0\.3\)', 'var(--border-accent-subtle)', 'Orange 249 30%'),
    (r'rgba?\(249,\s*115,\s*22,\s*0\.35\)', 'var(--border-accent-subtle)', 'Orange 249 35%'),
    (r'rgba?\(249,\s*115,\s*22,\s*0\.5\)', 'var(--border-accent-medium)', 'Orange 249 50%'),
    
    # Info borders (blue)
    (r'rgba?\(59,\s*130,\s*246,\s*0\.1\)', 'var(--border-info-faint)', 'Blue 10%'),
    (r'rgba?\(59,\s*130,\s*246,\s*0\.15\)', 'var(--border-info-faint)', 'Blue 15%'),
    (r'rgba?\(59,\s*130,\s*246,\s*0\.2\)', 'var(--border-info-subtle)', 'Blue 20%'),
    (r'rgba?\(59,\s*130,\s*246,\s*0\.25\)', 'var(--border-info-subtle)', 'Blue 25%'),
    (r'rgba?\(59,\s*130,\s*246,\s*0\.3\)', 'var(--border-info-subtle)', 'Blue 30%'),
    (r'rgba?\(59,\s*130,\s*246,\s*0\.4\)', 'var(--border-info)', 'Blue 40%'),
    (r'rgba?\(96,\s*165,\s*250,\s*0\.15\)', 'var(--border-info-faint)', 'Light blue 15%'),
    (r'rgba?\(96,\s*165,\s*250,\s*0\.3\)', 'var(--border-info-subtle)', 'Light blue 30%'),
    (r'rgba?\(96,\s*165,\s*250,\s*0\.5\)', 'var(--border-info-medium)', 'Light blue 50%'),
    (r'rgba?\(96,\s*165,\s*250,\s*0\.7\)', 'var(--border-info-strong)', 'Light blue 70%'),
    (r'rgba?\(100,\s*149,\s*237,\s*0\.2\)', 'var(--border-info-subtle)', 'Cornflower 20%'),
    (r'rgba?\(100,\s*149,\s*237,\s*0\.4\)', 'var(--border-info)', 'Cornflower 40%'),
    (r'rgba?\(100,\s*149,\s*237,\s*0\.6\)', 'var(--border-info-medium)', 'Cornflower 60%'),
    (r'rgba?\(100,\s*200,\s*255,\s*0\.1\)', 'var(--border-info-faint)', 'Sky blue 10%'),
    (r'rgba?\(100,\s*200,\s*255,\s*0\.3\)', 'var(--border-info-subtle)', 'Sky blue 30%'),
    (r'rgba?\(100,\s*100,\s*255,\s*0\.15\)', 'var(--border-info-faint)', 'Blue 100 15%'),
    (r'rgba?\(100,\s*100,\s*255,\s*0\.25\)', 'var(--border-info-subtle)', 'Blue 100 25%'),
    (r'rgba?\(100,\s*100,\s*255,\s*0\.4\)', 'var(--border-info)', 'Blue 100 40%'),
    (r'rgba?\(100,\s*100,\s*255,\s*0\.6\)', 'var(--border-info-medium)', 'Blue 100 60%'),
    
    # Success borders (green)
    (r'rgba?\(34,\s*197,\s*94,\s*0\.1\)', 'var(--border-success-faint)', 'Green 10%'),
    (r'rgba?\(34,\s*197,\s*94,\s*0\.15\)', 'var(--border-success-faint)', 'Green 15%'),
    (r'rgba?\(34,\s*197,\s*94,\s*0\.3\)', 'var(--border-success-subtle)', 'Green 30%'),
    (r'rgba?\(34,\s*197,\s*94,\s*0\.35\)', 'var(--border-success-subtle)', 'Green 35%'),
    (r'rgba?\(34,\s*197,\s*94,\s*0\.4\)', 'var(--border-success)', 'Green 40%'),
    (r'rgba?\(34,\s*197,\s*94,\s*0\.5\)', 'var(--border-success-medium)', 'Green 50%'),
    (r'rgba?\(0,\s*255,\s*0,\s*0\.15\)', 'var(--border-success-faint)', 'Pure green 15%'),
    (r'rgba?\(0,\s*255,\s*0,\s*0\.4\)', 'var(--border-success)', 'Pure green 40%'),
    
    # Special borders (purple)
    (r'rgba?\(139,\s*92,\s*246,\s*0\.1\)', 'var(--border-special-faint)', 'Purple 10%'),
    (r'rgba?\(139,\s*92,\s*246,\s*0\.15\)', 'var(--border-special-faint)', 'Purple 15%'),
    (r'rgba?\(139,\s*92,\s*246,\s*0\.2\)', 'var(--border-special-subtle)', 'Purple 20%'),
    (r'rgba?\(139,\s*92,\s*246,\s*0\.25\)', 'var(--border-special-subtle)', 'Purple 25%'),
    (r'rgba?\(139,\s*92,\s*246,\s*0\.3\)', 'var(--border-special-subtle)', 'Purple 30%'),
    (r'rgba?\(139,\s*92,\s*246,\s*0\.5\)', 'var(--border-special-medium)', 'Purple 50%'),
    (r'rgba?\(128,\s*0,\s*128,\s*0\.3\)', 'var(--border-special-subtle)', 'Purple 128 30%'),
    (r'rgba?\(150,\s*80,\s*255,\s*0\.1\)', 'var(--border-special-faint)', 'Purple 150 10%'),
    (r'rgba?\(150,\s*80,\s*255,\s*0\.5\)', 'var(--border-special-medium)', 'Purple 150 50%'),
]

def replace_border_colors(content: str) -> Tuple[str, List[str]]:
    """Replace hardcoded border colors with design system variables."""
    changes = []
    
    for pattern, replacement, description in BORDER_REPLACEMENTS:
        # Look for border property with this color
        border_pattern = rf'(border(?:-[a-z]+)?:\s*(?:[^;]*\s)?){pattern}'
        
        def replacer(match):
            changes.append(f"  {description}: {pattern} → {replacement}")
            return match.group(1) + replacement
        
        content, count = re.subn(border_pattern, replacer, content, flags=re.IGNORECASE)
    
    return content, changes

def process_file(filepath: Path) -> bool:
    """Process a single file and replace border colors."""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        new_content, changes = replace_border_colors(content)
        
        if changes:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(new_content)
            # Use string representation for cross-platform compatibility
            rel_path = str(filepath).replace(str(Path.cwd()) + os.sep, '')
            print(f"\n✅ Updated: {rel_path}")
            for change in changes:
                print(change)
            return True
        
        return False
    except Exception as e:
        rel_path = str(filepath).replace(str(Path.cwd()) + os.sep, '')
        print(f"\n❌ Error processing {rel_path}: {e}")
        return False

def main():
    """Main function to process all files."""
    src_dir = Path('src')
    
    # Find all .svelte and .css files
    files_to_process = []
    files_to_process.extend(src_dir.rglob('*.svelte'))
    files_to_process.extend(src_dir.rglob('*.css'))
    
    print(f"Found {len(files_to_process)} files to process...")
    
    updated_count = 0
    for filepath in sorted(files_to_process):
        if process_file(filepath):
            updated_count += 1
    
    print(f"\n{'='*60}")
    print(f"✅ Replacement complete!")
    print(f"Updated {updated_count} files")
    print(f"{'='*60}")

if __name__ == '__main__':
    main()
