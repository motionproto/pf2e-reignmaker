#!/usr/bin/env python3
"""
Convert border and outline rem values back to pixels.

Borders and outlines should use pixel values for consistency and precision,
not rem values. This script converts rem values back to pixels.

Common conversions (16px base):
- 0.0625rem = 1px
- 0.125rem = 2px
- 0.1875rem = 3px
- 0.25rem = 4px

Usage:
  python buildscripts/fix-border-pixels.py
"""

import os
import re
from pathlib import Path

def rem_to_px(rem_value):
    """Convert rem value to pixels (assuming 16px base)"""
    rem = float(rem_value)
    px = rem * 16
    
    # Round to nearest integer for clean pixel values
    px_int = round(px)
    
    # For very common values, ensure exact conversion
    common_conversions = {
        0.0625: 1,
        0.125: 2,
        0.1875: 3,
        0.25: 4,
        0.3125: 5,
        0.5: 8,
    }
    
    if rem in common_conversions:
        return common_conversions[rem]
    
    return px_int

def fix_border_outline_values(content):
    """
    Convert border and outline rem values to pixels.
    
    Handles patterns like:
    - border: 1rem solid ...
    - border-top: 0.0625rem solid ...
    - border-width: 0.125rem
    - outline: 2rem solid ...
    - outline-width: 0.25rem
    """
    
    # Pattern to match border/outline properties with rem values
    # Matches: border, border-top, border-bottom, border-left, border-right, 
    #          border-width, outline, outline-width, etc.
    pattern = r'((?:border|outline)(?:-(?:top|bottom|left|right|width|inline|block|inline-start|inline-end|block-start|block-end))?)\s*:\s*([^;]+);'
    
    def replace_rem_in_declaration(match):
        property_name = match.group(1)
        value = match.group(2)
        
        # Find all rem values in this declaration
        rem_pattern = r'(\d+\.?\d*)rem'
        
        def replace_rem(rem_match):
            rem_value = rem_match.group(1)
            px_value = rem_to_px(rem_value)
            return f'{px_value}px'
        
        # Replace all rem values with px in this declaration
        new_value = re.sub(rem_pattern, replace_rem, value)
        
        # Only return if something changed
        if new_value != value:
            return f'{property_name}: {new_value};'
        return match.group(0)
    
    fixed = re.sub(pattern, replace_rem_in_declaration, content)
    
    changes = content != fixed
    return fixed, changes

def process_file(filepath):
    """Process a single .svelte file"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original = content
        
        # Fix border and outline values
        content, changes = fix_border_outline_values(content)
        
        if content != original:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            return True
        
        return False
    except Exception as e:
        print(f"Error processing {filepath}: {e}")
        return False

def main():
    """Process all .svelte files in src directory"""
    src_dir = Path('src')
    
    if not src_dir.exists():
        print("Error: src directory not found")
        return
    
    # Find all .svelte files
    svelte_files = list(src_dir.rglob('*.svelte'))
    
    print(f"Found {len(svelte_files)} .svelte files")
    print("Converting border/outline rem values to pixels...\n")
    
    fixed_count = 0
    fixed_files = []
    
    for filepath in svelte_files:
        if process_file(filepath):
            fixed_count += 1
            fixed_files.append(filepath)
            print(f"✓ Fixed: {filepath}")
    
    print(f"\n{'='*60}")
    print(f"Summary: Fixed {fixed_count} files")
    print(f"{'='*60}")
    
    if fixed_files:
        print("\nFixed files:")
        for f in fixed_files:
            print(f"  - {f}")
    else:
        print("\nNo files needed fixing - all borders/outlines already use pixels!")

if __name__ == '__main__':
    main()
