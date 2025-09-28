#!/usr/bin/env python3
"""Replace compound typography variables with simple font variables"""

import os
import re
from pathlib import Path

# Define all the replacements
replacements = {
    # Font size replacements
    r'var\(--type-heading-1-size\)': 'var(--font-3xl)',
    r'var\(--type-heading-2-size\)': 'var(--font-2xl)',
    r'var\(--type-heading-3-size\)': 'var(--font-xl)',
    r'var\(--type-body-size\)': 'var(--font-md)',
    r'var\(--type-small-size\)': 'var(--font-sm)',
    r'var\(--type-label-size\)': 'var(--font-xs)',
    r'var\(--type-badge-size\)': 'var(--font-xs)',
    r'var\(--type-button-size\)': 'var(--font-md)',
    
    # Font weight replacements
    r'var\(--type-weight-normal\)': 'var(--font-weight-normal)',
    r'var\(--type-weight-medium\)': 'var(--font-weight-medium)',
    r'var\(--type-weight-semibold\)': 'var(--font-weight-semibold)',
    r'var\(--type-weight-bold\)': 'var(--font-weight-bold)',
    
    # Line height replacements - remove the var() wrapper, use direct values
    r'var\(--type-heading-1-line\)': '1.3',
    r'var\(--type-heading-2-line\)': '1.3', 
    r'var\(--type-heading-3-line\)': '1.4',
    r'var\(--type-body-line\)': '1.5',
    r'var\(--type-label-line\)': '1.4',
    r'var\(--type-badge-line\)': '1.2',
    r'var\(--type-button-line\)': '1.2',
    
    # Weight replacements (for standalone usage)
    r'var\(--type-heading-1-weight\)': 'var(--font-weight-semibold)',
    r'var\(--type-heading-2-weight\)': 'var(--font-weight-semibold)',
    r'var\(--type-heading-3-weight\)': 'var(--font-weight-semibold)',
    r'var\(--type-label-weight\)': 'var(--font-weight-medium)',
    r'var\(--type-badge-weight\)': 'var(--font-weight-medium)',
    r'var\(--type-button-weight\)': 'var(--font-weight-medium)',
    
    # Letter spacing replacements - use direct values
    r'var\(--type-label-spacing\)': '0.025em',
    r'var\(--type-badge-spacing\)': '0.05em',
    r'var\(--type-button-spacing\)': '0.025em',
    
    # Line height utility replacements
    r'var\(--type-leading-tight\)': '1.2',
    r'var\(--type-leading-snug\)': '1.3',
    r'var\(--type-leading-normal\)': '1.4',
    r'var\(--type-leading-relaxed\)': '1.5',
}

def replace_in_file(filepath, replacements):
    """Replace all patterns in a single file"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original_content = content
        changes_made = []
        
        for pattern, replacement in replacements.items():
            new_content = re.sub(pattern, replacement, content)
            if new_content != content:
                count = len(re.findall(pattern, content))
                changes_made.append(f"  - {pattern} -> {replacement} ({count} occurrences)")
                content = new_content
        
        if content != original_content:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            return changes_made
        return []
    except Exception as e:
        print(f"Error processing {filepath}: {e}")
        return []

def main():
    # Find all .svelte and .ts files in src directory
    src_dir = Path('src')
    files_to_process = list(src_dir.glob('**/*.svelte')) + list(src_dir.glob('**/*.ts'))
    
    print(f"Found {len(files_to_process)} files to process")
    print("-" * 50)
    
    total_changes = 0
    files_modified = []
    
    for filepath in files_to_process:
        changes = replace_in_file(filepath, replacements)
        if changes:
            files_modified.append(str(filepath))
            total_changes += len(changes)
            print(f"\n✓ Modified: {filepath}")
            for change in changes:
                print(change)
    
    print("\n" + "=" * 50)
    print(f"Summary: Modified {len(files_modified)} files with {total_changes} replacements")
    
    if files_modified:
        print("\nFiles modified:")
        for f in sorted(files_modified):
            print(f"  - {f}")

if __name__ == '__main__':
    main()
