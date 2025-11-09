#!/usr/bin/env python3
"""
Convert px/em values in Svelte files to CSS variables or rem units.

Usage:
    python buildscripts/convert-to-rem.py [--dry-run]
"""

import re
import os
import sys
from pathlib import Path
from typing import Dict, Tuple, Optional

# Conversion maps
FONT_SIZE_MAP = {
    '0.75rem': 'var(--font-xs)',
    '0.875rem': 'var(--font-sm)',
    '1rem': 'var(--font-md)',
    '1.125rem': 'var(--font-lg)',
    '1.25rem': 'var(--font-xl)',
    '1.375rem': 'var(--font-2xl)',
    '1.625rem': 'var(--font-3xl)',
    '2rem': 'var(--font-4xl)',
    '2.5rem': 'var(--font-5xl)',
    '3rem': 'var(--font-6xl)',
    # Common px values
    '12px': 'var(--font-xs)',
    '14px': 'var(--font-sm)',
    '16px': 'var(--font-md)',
    '18px': 'var(--font-lg)',
    '20px': 'var(--font-xl)',
    '22px': 'var(--font-2xl)',
    '26px': 'var(--font-3xl)',
    '32px': 'var(--font-4xl)',
    '40px': 'var(--font-5xl)',
    '48px': 'var(--font-6xl)',
    '56px': 'var(--font-6xl)',  # Map 56px to closest
}

SPACING_MAP = {
    '0.125rem': 'var(--space-2)',
    '0.25rem': 'var(--space-4)',
    '0.375rem': 'var(--space-6)',
    '0.5rem': 'var(--space-8)',
    '0.625rem': 'var(--space-10)',
    '0.75rem': 'var(--space-12)',
    '1rem': 'var(--space-16)',
    '1.25rem': 'var(--space-20)',
    '1.5rem': 'var(--space-24)',
    # Common px values
    '2px': 'var(--space-2)',
    '4px': 'var(--space-4)',
    '6px': 'var(--space-6)',
    '8px': 'var(--space-8)',
    '10px': 'var(--space-10)',
    '12px': 'var(--space-12)',
    '16px': 'var(--space-16)',
    '20px': 'var(--space-20)',
    '24px': 'var(--space-24)',
}

RADIUS_MAP = {
    '0.125rem': 'var(--radius-sm)',
    '0.25rem': 'var(--radius-md)',
    '0.375rem': 'var(--radius-lg)',
    '0.5rem': 'var(--radius-xl)',
    '0.625rem': 'var(--radius-2xl)',
    '0.75rem': 'var(--radius-3xl)',
    '1.25rem': 'var(--radius-full)',
    # Common px values
    '2px': 'var(--radius-sm)',
    '4px': 'var(--radius-md)',
    '6px': 'var(--radius-lg)',
    '8px': 'var(--radius-xl)',
    '10px': 'var(--radius-2xl)',
    '12px': 'var(--radius-3xl)',
    '20px': 'var(--radius-full)',
}

def px_to_rem(px_value: str) -> str:
    """Convert px value to rem (divide by 16)."""
    try:
        num = float(px_value.replace('px', ''))
        rem = num / 16
        return f'{rem:.4f}rem'.rstrip('0').rstrip('.')
    except ValueError:
        return px_value

def em_to_rem(em_value: str) -> str:
    """Convert em value to rem (1:1 conversion in most cases)."""
    try:
        num = float(em_value.replace('em', ''))
        return f'{num:.4f}rem'.rstrip('0').rstrip('.')
    except ValueError:
        return em_value

def should_use_font_var(property_name: str) -> bool:
    """Check if property should use font variable."""
    return property_name in ['font-size']

def should_use_spacing_var(property_name: str) -> bool:
    """Check if property should use spacing variable."""
    return property_name in ['gap', 'padding', 'margin', 'padding-top', 'padding-bottom', 
                             'padding-left', 'padding-right', 'margin-top', 'margin-bottom',
                             'margin-left', 'margin-right']

def should_use_radius_var(property_name: str) -> bool:
    """Check if property should use radius variable."""
    return property_name in ['border-radius']

def find_closest_variable(value_rem: str, var_map: Dict[str, str]) -> str:
    """Find the closest CSS variable to a given rem value."""
    try:
        target = float(value_rem.replace('rem', ''))
        
        # Find closest match
        closest_var = None
        min_diff = float('inf')
        
        for key, css_var in var_map.items():
            if 'rem' in key:
                key_value = float(key.replace('rem', ''))
                diff = abs(target - key_value)
                if diff < min_diff:
                    min_diff = diff
                    closest_var = css_var
        
        return closest_var if closest_var else value_rem
    except:
        return value_rem

def convert_value(value: str, property_name: str) -> str:
    """Convert a CSS value based on property type."""
    # Already using CSS variable
    if 'var(--' in value:
        return value
    
    # Handle rem values directly (already in rem format)
    if 'rem' in value:
        rem_value = value
    # Convert px/em to rem first
    elif 'px' in value:
        rem_value = px_to_rem(value)
    elif 'em' in value:
        rem_value = em_to_rem(value)
    else:
        return value
    
    # Try to map to CSS variable (with rounding to nearest)
    if should_use_font_var(property_name):
        # Try exact match first, then round to nearest
        exact = FONT_SIZE_MAP.get(rem_value)
        return exact if exact else find_closest_variable(rem_value, FONT_SIZE_MAP)
    elif should_use_spacing_var(property_name):
        # Try exact match first, then round to nearest
        exact = SPACING_MAP.get(rem_value)
        return exact if exact else find_closest_variable(rem_value, SPACING_MAP)
    elif should_use_radius_var(property_name):
        # Try exact match first, then round to nearest
        exact = RADIUS_MAP.get(rem_value)
        return exact if exact else find_closest_variable(rem_value, RADIUS_MAP)
    
    return rem_value

def convert_style_block(style_content: str) -> Tuple[str, int]:
    """Convert all px/em values in a style block."""
    changes = 0
    
    # Pattern to match CSS property: value pairs
    # Matches: property-name: value;
    pattern = r'([\w-]+):\s*([^;]+);'
    
    def replacer(match):
        nonlocal changes
        prop = match.group(1)
        value = match.group(2).strip()
        
        # Skip if already using variable or no measurement units
        if 'var(--' in value or ('px' not in value and 'em' not in value and 'rem' not in value):
            return match.group(0)
        
        # Handle multiple values (e.g., "10px 20px")
        values = value.split()
        converted_values = []
        
        for v in values:
            if 'px' in v or 'em' in v or 'rem' in v:
                # Extract just the measurement part
                measure_match = re.search(r'(\d+(?:\.\d+)?(?:px|em|rem))', v)
                if measure_match:
                    original = measure_match.group(1)
                    converted = convert_value(original, prop)
                    if converted != original:
                        changes += 1
                    converted_values.append(v.replace(original, converted))
                else:
                    converted_values.append(v)
            else:
                converted_values.append(v)
        
        return f'{prop}: {" ".join(converted_values)};'
    
    converted = re.sub(pattern, replacer, style_content)
    return converted, changes

def process_file(filepath: Path, dry_run: bool = False) -> Tuple[bool, int]:
    """Process a single Svelte file."""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Find style blocks
        style_pattern = r'(<style[^>]*>)(.*?)(</style>)'
        
        total_changes = 0
        
        def style_replacer(match):
            nonlocal total_changes
            opening = match.group(1)
            style_content = match.group(2)
            closing = match.group(3)
            
            converted, changes = convert_style_block(style_content)
            total_changes += changes
            
            return opening + converted + closing
        
        new_content = re.sub(style_pattern, style_replacer, content, flags=re.DOTALL)
        
        if total_changes > 0:
            if not dry_run:
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(new_content)
            return True, total_changes
        
        return False, 0
        
    except Exception as e:
        print(f"Error processing {filepath}: {e}", file=sys.stderr)
        return False, 0

def main():
    dry_run = '--dry-run' in sys.argv
    
    # Find all Svelte files
    src_dir = Path('src/view')
    svelte_files = list(src_dir.rglob('*.svelte'))
    
    print(f"Found {len(svelte_files)} Svelte files")
    print(f"Mode: {'DRY RUN' if dry_run else 'LIVE'}")
    print("=" * 60)
    
    total_files_changed = 0
    total_changes = 0
    
    for filepath in sorted(svelte_files):
        changed, changes = process_file(filepath, dry_run)
        if changed:
            total_files_changed += 1
            total_changes += changes
            # filepath is already relative to project root
            print(f"{'[DRY RUN] ' if dry_run else ''}Converted {filepath}: {changes} changes")
    
    print("=" * 60)
    print(f"Summary:")
    print(f"  Files changed: {total_files_changed}/{len(svelte_files)}")
    print(f"  Total conversions: {total_changes}")
    
    if dry_run:
        print("\nRun without --dry-run to apply changes")

if __name__ == '__main__':
    main()
