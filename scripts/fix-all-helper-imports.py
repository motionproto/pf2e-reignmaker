#!/usr/bin/env python3
"""
Update all imports to use relative paths to event-helpers.ts
"""

import re
from pathlib import Path

def fix_imports(filepath: Path) -> bool:
    """Fix imports in a single file."""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original = content
        
        # Determine the relative path from this file to src/types/event-helpers
        # Count how many levels deep we are
        relative_to_src = filepath.relative_to(Path('src'))
        depth = len(relative_to_src.parts) - 1  # -1 for the file itself
        
        # Build relative path
        prefix = '../' * depth if depth > 0 else './'
        new_path = f"{prefix}types/event-helpers"
        
        # Replace all imports that reference event-helpers
        # Match various formats: '../../types/event-helpers', '@types/event-helpers', etc.
        content = re.sub(
            r"from\s+['\"]([^'\"]*types/event-helpers)['\"]",
            f"from '{new_path}'",
            content
        )
        
        if content != original:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            return True
        
        return False
        
    except Exception as e:
        print(f"✗ Error processing {filepath}: {e}")
        return False

def main():
    print("=" * 80)
    print("Fixing event-helpers imports to use relative paths")
    print("=" * 80)
    
    # Find all TypeScript files
    ts_files = list(Path('src').rglob('*.ts'))
    
    print(f"\nFound {len(ts_files)} TypeScript files\n")
    
    changed_count = 0
    
    for filepath in ts_files:
        if fix_imports(filepath):
            changed_count += 1
            print(f"✓ Fixed: {filepath}")
    
    print("\n" + "=" * 80)
    print(f"Complete: {changed_count} files updated")
    print("=" * 80)

if __name__ == '__main__':
    main()
