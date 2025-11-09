#!/usr/bin/env python3
"""
Replace hardcoded colored background colors with design system variables.

This script migrates colored rgba values to semantic surface variables:
- rgba(239, 68, 68, ...) → --surface-primary-*
- rgba(34, 197, 94, ...) → --surface-success-*
- rgba(251, 191, 36, ...) → --surface-accent-* (default, may need manual review for warnings)
- rgba(59, 130, 246, ...) → --surface-info-*
- rgba(147, 112, 219, ...) → --surface-special-*

Usage:
    python buildscripts/replace-colored-surfaces.py [--dry-run]
"""

import re
import sys
from pathlib import Path

# Colored surface replacements (ordered by opacity for precedence)
COLORED_SURFACE_REPLACEMENTS = {
    # Primary (Red/Crimson) - 239, 68, 68
    r'rgba\(239,\s*68,\s*68,\s*0\.03\)': 'var(--surface-primary-lower)',  # Round to 0.05
    r'rgba\(239,\s*68,\s*68,\s*0\.05\)': 'var(--surface-primary-lower)',
    r'rgba\(239,\s*68,\s*68,\s*0\.1\)': 'var(--surface-primary-low)',
    r'rgba\(239,\s*68,\s*68,\s*0\.15\)': 'var(--surface-primary)',
    r'rgba\(239,\s*68,\s*68,\s*0\.2\)': 'var(--surface-primary-high)',
    r'rgba\(239,\s*68,\s*68,\s*0\.25\)': 'var(--surface-primary-high)',  # Round to 0.2
    r'rgba\(239,\s*68,\s*68,\s*0\.3\)': 'var(--surface-primary-higher)',
    
    # Success (Green) - 34, 197, 94
    r'rgba\(34,\s*197,\s*94,\s*0\.03\)': 'var(--surface-success-lower)',  # Round to 0.05
    r'rgba\(34,\s*197,\s*94,\s*0\.05\)': 'var(--surface-success-lower)',
    r'rgba\(34,\s*197,\s*94,\s*0\.1\)': 'var(--surface-success-low)',
    r'rgba\(34,\s*197,\s*94,\s*0\.15\)': 'var(--surface-success)',
    r'rgba\(34,\s*197,\s*94,\s*0\.2\)': 'var(--surface-success-high)',
    r'rgba\(34,\s*197,\s*94,\s*0\.3\)': 'var(--surface-success-higher)',
    
    # Accent/Warning (Amber) - 251, 191, 36
    # Note: Mapped to accent by default. Review usage for semantic warnings.
    r'rgba\(251,\s*191,\s*36,\s*0\.05\)': 'var(--surface-accent-lower)',
    r'rgba\(251,\s*191,\s*36,\s*0\.1\)': 'var(--surface-accent-low)',
    r'rgba\(251,\s*191,\s*36,\s*0\.15\)': 'var(--surface-accent)',
    r'rgba\(251,\s*191,\s*36,\s*0\.2\)': 'var(--surface-accent-high)',
    r'rgba\(251,\s*191,\s*36,\s*0\.3\)': 'var(--surface-accent-higher)',
    
    # Accent/Warning (Amber alternative) - 245, 158, 11
    r'rgba\(245,\s*158,\s*11,\s*0\.05\)': 'var(--surface-accent-lower)',
    r'rgba\(245,\s*158,\s*11,\s*0\.1\)': 'var(--surface-accent-low)',
    r'rgba\(245,\s*158,\s*11,\s*0\.15\)': 'var(--surface-accent)',
    r'rgba\(245,\s*158,\s*11,\s*0\.2\)': 'var(--surface-accent-high)',
    r'rgba\(245,\s*158,\s*11,\s*0\.25\)': 'var(--surface-accent-high)',  # Round to 0.2
    r'rgba\(245,\s*158,\s*11,\s*0\.3\)': 'var(--surface-accent-higher)',
    
    # Info (Blue) - 59, 130, 246
    r'rgba\(59,\s*130,\s*246,\s*0\.05\)': 'var(--surface-info-lower)',
    r'rgba\(59,\s*130,\s*246,\s*0\.1\)': 'var(--surface-info-low)',
    r'rgba\(59,\s*130,\s*246,\s*0\.15\)': 'var(--surface-info)',
    r'rgba\(59,\s*130,\s*246,\s*0\.2\)': 'var(--surface-info-high)',
    r'rgba\(59,\s*130,\s*246,\s*0\.25\)': 'var(--surface-info-high)',  # Round to 0.2
    r'rgba\(59,\s*130,\s*246,\s*0\.3\)': 'var(--surface-info-higher)',
    
    # Info (Blue alternative) - 100, 149, 237
    r'rgba\(100,\s*149,\s*237,\s*0\.05\)': 'var(--surface-info-lower)',
    r'rgba\(100,\s*149,\s*237,\s*0\.1\)': 'var(--surface-info-low)',
    r'rgba\(100,\s*149,\s*237,\s*0\.15\)': 'var(--surface-info)',
    r'rgba\(100,\s*149,\s*237,\s*0\.2\)': 'var(--surface-info-high)',
    r'rgba\(100,\s*149,\s*237,\s*0\.3\)': 'var(--surface-info-higher)',
    
    # Special (Purple) - 147, 112, 219
    r'rgba\(147,\s*112,\s*219,\s*0\.05\)': 'var(--surface-special-lower)',
    r'rgba\(147,\s*112,\s*219,\s*0\.1\)': 'var(--surface-special-low)',
    r'rgba\(147,\s*112,\s*219,\s*0\.15\)': 'var(--surface-special)',
    r'rgba\(147,\s*112,\s*219,\s*0\.2\)': 'var(--surface-special-high)',
    r'rgba\(147,\s*112,\s*219,\s*0\.3\)': 'var(--surface-special-higher)',
}

def replace_in_file(file_path: Path, dry_run: bool = False) -> int:
    """
    Replace hardcoded colored backgrounds in a file.
    
    Returns:
        Count of replacements made
    """
    try:
        content = file_path.read_text(encoding='utf-8')
        original_content = content
        replacement_count = 0
        
        # Replace colored surfaces
        for pattern, replacement in COLORED_SURFACE_REPLACEMENTS.items():
            matches = re.findall(pattern, content)
            if matches:
                content = re.sub(pattern, replacement, content)
                replacement_count += len(matches)
        
        # Get relative path for display
        try:
            rel_path = file_path.relative_to(Path.cwd())
        except ValueError:
            rel_path = file_path
        
        # Write changes if not dry run and content changed
        if not dry_run and content != original_content:
            file_path.write_text(content, encoding='utf-8')
            print(f"✓ {rel_path}")
            print(f"  - {replacement_count} colored surface replacements")
        elif dry_run and content != original_content:
            print(f"[DRY RUN] Would update {rel_path}")
            print(f"  - {replacement_count} colored surface replacements")
        
        return replacement_count
    
    except Exception as e:
        print(f"✗ Error processing {file_path}: {e}", file=sys.stderr)
        return 0

def main():
    """Main execution function."""
    dry_run = '--dry-run' in sys.argv
    
    if dry_run:
        print("🔍 DRY RUN MODE - No files will be modified\n")
    else:
        print("🎨 Starting colored surface replacement\n")
    
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
    total_replacements = 0
    files_modified = 0
    
    for file_path in sorted(files_to_process):
        count = replace_in_file(file_path, dry_run)
        
        if count:
            files_modified += 1
            total_replacements += count
    
    # Print summary
    print("\n" + "="*60)
    print("SUMMARY")
    print("="*60)
    print(f"Files modified: {files_modified}")
    print(f"Colored surface replacements: {total_replacements}")
    
    if dry_run:
        print("\n✓ Dry run complete. Re-run without --dry-run to apply changes.")
        print("\n⚠️  NOTE: Amber colors mapped to --surface-accent-* by default.")
        print("   Review usage for semantic warnings and change to --surface-warning-* if needed.")
    else:
        print("\n✓ Colored surface replacement complete!")
        print("\n⚠️  IMPORTANT: Review amber backgrounds for semantic meaning:")
        print("   - Highlights/emphasis should use --surface-accent-*")
        print("   - Warnings/cautions should use --surface-warning-*")

if __name__ == '__main__':
    main()
