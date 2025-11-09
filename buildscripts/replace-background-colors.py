#!/usr/bin/env python3
"""
Replace hardcoded background colors with design system variables.

This script migrates from:
- Hardcoded rgba(0, 0, 0, ...) overlays → --overlay-* variables
- Hardcoded rgba(255, 255, 255, ...) hovers → --hover-* variables
- Legacy --bg-* variables → new --surface-* variables

Usage:
    python buildscripts/replace-background-colors.py [--dry-run]
"""

import re
import sys
from pathlib import Path

# Mapping of hardcoded rgba values to design system variables
OVERLAY_REPLACEMENTS = {
    r'rgba\(0,\s*0,\s*0,\s*0\.05\)': 'var(--overlay-lowest)',
    r'rgba\(0,\s*0,\s*0,\s*0\.1\)': 'var(--overlay-lower)',
    r'rgba\(0,\s*0,\s*0,\s*0\.2\)': 'var(--overlay-low)',
    r'rgba\(0,\s*0,\s*0,\s*0\.3\)': 'var(--overlay)',
    r'rgba\(0,\s*0,\s*0,\s*0\.5\)': 'var(--overlay-high)',
    r'rgba\(0,\s*0,\s*0,\s*0\.7\)': 'var(--overlay-higher)',
    r'rgba\(0,\s*0,\s*0,\s*0\.8\)': 'var(--overlay-higher)',  # Close to 0.7
    r'rgba\(0,\s*0,\s*0,\s*0\.95\)': 'var(--overlay-highest)',
}

HOVER_REPLACEMENTS = {
    r'rgba\(255,\s*255,\s*255,\s*0\.05\)': 'var(--hover-low)',
    r'rgba\(255,\s*255,\s*255,\s*0\.1\)': 'var(--hover)',
    r'rgba\(255,\s*255,\s*255,\s*0\.15\)': 'var(--hover-high)',
}

# Legacy --bg-* to new --surface-* variables
LEGACY_VAR_REPLACEMENTS = {
    r'var\(--bg-base\)': 'var(--empty)',
    r'var\(--bg-surface\)': 'var(--surface-lowest)',
    r'var\(--bg-elevated\)': 'var(--surface-lower)',
    r'var\(--bg-overlay\)': 'var(--surface-low)',
    r'var\(--bg-subtle\)': 'var(--surface)',
}

def replace_in_file(file_path: Path, dry_run: bool = False) -> tuple[int, int]:
    """
    Replace hardcoded background colors in a file.
    
    Returns:
        Tuple of (overlay_count, hover_count, legacy_count)
    """
    try:
        content = file_path.read_text(encoding='utf-8')
        original_content = content
        overlay_count = 0
        hover_count = 0
        legacy_count = 0
        
        # Replace overlay colors
        for pattern, replacement in OVERLAY_REPLACEMENTS.items():
            matches = re.findall(pattern, content)
            if matches:
                content = re.sub(pattern, replacement, content)
                overlay_count += len(matches)
        
        # Replace hover colors
        for pattern, replacement in HOVER_REPLACEMENTS.items():
            matches = re.findall(pattern, content)
            if matches:
                content = re.sub(pattern, replacement, content)
                hover_count += len(matches)
        
        # Replace legacy variables
        for pattern, replacement in LEGACY_VAR_REPLACEMENTS.items():
            matches = re.findall(pattern, content)
            if matches:
                content = re.sub(pattern, replacement, content)
                legacy_count += len(matches)
        
        # Get relative path for display
        try:
            rel_path = file_path.relative_to(Path.cwd())
        except ValueError:
            # If relative_to fails, just use the path as-is
            rel_path = file_path
        
        # Write changes if not dry run and content changed
        if not dry_run and content != original_content:
            file_path.write_text(content, encoding='utf-8')
            print(f"✓ {rel_path}")
            if overlay_count:
                print(f"  - {overlay_count} overlay replacements")
            if hover_count:
                print(f"  - {hover_count} hover replacements")
            if legacy_count:
                print(f"  - {legacy_count} legacy var replacements")
        elif dry_run and content != original_content:
            print(f"[DRY RUN] Would update {rel_path}")
            if overlay_count:
                print(f"  - {overlay_count} overlay replacements")
            if hover_count:
                print(f"  - {hover_count} hover replacements")
            if legacy_count:
                print(f"  - {legacy_count} legacy var replacements")
        
        return (overlay_count, hover_count, legacy_count)
    
    except Exception as e:
        print(f"✗ Error processing {file_path}: {e}", file=sys.stderr)
        return (0, 0, 0)

def main():
    """Main execution function."""
    dry_run = '--dry-run' in sys.argv
    
    if dry_run:
        print("🔍 DRY RUN MODE - No files will be modified\n")
    else:
        print("🚀 Starting background color replacement\n")
    
    # Target file extensions
    extensions = ['.svelte', '.css', '.ts']
    
    # Directories to process
    src_dir = Path('src')
    
    if not src_dir.exists():
        print(f"✗ Source directory not found: {src_dir}")
        sys.exit(1)
    
    # Collect all files
    files_to_process = []
    for ext in extensions:
        files_to_process.extend(src_dir.rglob(f'*{ext}'))
    
    print(f"Found {len(files_to_process)} files to process\n")
    
    # Process files
    total_overlay = 0
    total_hover = 0
    total_legacy = 0
    files_modified = 0
    
    for file_path in sorted(files_to_process):
        overlay_count, hover_count, legacy_count = replace_in_file(file_path, dry_run)
        
        if overlay_count or hover_count or legacy_count:
            files_modified += 1
            total_overlay += overlay_count
            total_hover += hover_count
            total_legacy += legacy_count
    
    # Print summary
    print("\n" + "="*60)
    print("SUMMARY")
    print("="*60)
    print(f"Files modified: {files_modified}")
    print(f"Overlay replacements: {total_overlay}")
    print(f"Hover replacements: {total_hover}")
    print(f"Legacy var replacements: {total_legacy}")
    print(f"Total replacements: {total_overlay + total_hover + total_legacy}")
    
    if dry_run:
        print("\n✓ Dry run complete. Re-run without --dry-run to apply changes.")
    else:
        print("\n✓ Background color replacement complete!")

if __name__ == '__main__':
    main()
