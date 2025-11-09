#!/usr/bin/env python3
"""
Fix CSS syntax errors from automated pixel-to-rem conversion.

This script fixes common CSS errors:
1. Invalid `.var(` syntax → `var(`
2. Invalid hover syntax `:hover: not(` → `:hover:not(`
3. Excessive decimal places in rem values (e.g., 0.2500rem → 0.25rem)

Usage:
  python buildscripts/fix-css-var-syntax.py
"""

import os
import re
from pathlib import Path

def fix_var_syntax(content):
    """Fix .var( -> var( in CSS"""
    # Pattern: .var( with optional whitespace before
    pattern = r'\.var\s*\('
    fixed = re.sub(pattern, 'var(', content)
    
    changes = content != fixed
    return fixed, changes

def fix_hover_syntax(content):
    """Fix :hover: not( -> :hover:not( in CSS"""
    # Pattern: &:hover: not( or similar with extra space/colon
    # Also handles cases where opening brace is on same line
    patterns = [
        # Standard case: :hover: not(
        (r':hover:\s+not\(', ':hover:not('),
        (r':focus:\s+not\(', ':focus:not('),
        (r':active:\s+not\(', ':active:not('),
        # Case with opening brace on same line: :hover:not(.foo):not(.bar) {
        # Need to add newline + proper indentation
        (r'(:hover:not\([^)]+\)(?::not\([^)]+\))*)\s*\{\s*([^}]+?)\s*;', r'\1 {\n      \2;'),
    ]
    
    fixed = content
    for pattern, replacement in patterns:
        fixed = re.sub(pattern, replacement, fixed)
    
    changes = content != fixed
    return fixed, changes

def fix_excessive_decimals(content):
    """Fix excessive decimal places in rem values (e.g., 0.2500rem -> 0.25rem)"""
    # Pattern: number with 3+ trailing zeros followed by rem
    # Examples: 25.0000rem -> 25rem, 0.2500rem -> 0.25rem, 18.7500rem -> 18.75rem
    
    def simplify_decimal(match):
        value = float(match.group(1))
        # If it's a whole number, don't include decimals
        if value == int(value):
            return f'{int(value)}rem'
        # Otherwise, use minimal decimal places (removes trailing zeros)
        return f'{value:g}rem'
    
    pattern = r'(\d+\.\d+)rem'
    fixed = re.sub(pattern, simplify_decimal, content)
    
    changes = content != fixed
    return fixed, changes

def process_file(filepath):
    """Process a single .svelte file"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original = content
        
        # Apply all fixes
        content, var_changes = fix_var_syntax(content)
        content, hover_changes = fix_hover_syntax(content)
        content, decimal_changes = fix_excessive_decimals(content)
        
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
    print("Fixing CSS syntax errors (.var, :hover:, excessive decimals)...\n")
    
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

if __name__ == '__main__':
    main()
