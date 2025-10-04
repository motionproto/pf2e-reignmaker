#!/usr/bin/env python3
"""
Update imports to use event-helpers.ts instead of events.ts for helper functions.
"""

import re
from pathlib import Path

def fix_imports(filepath: Path) -> bool:
    """Fix imports in a single file."""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original = content
        
        # Replace imports of helper functions from events.ts
        # Pattern: import { getEventDisplayName } from '../../types/events';
        # Replace with: import { getEventDisplayName } from '../../types/event-helpers';
        
        # Handle getEventDisplayName
        content = re.sub(
            r"import\s+{\s*getEventDisplayName\s*}\s+from\s+['\"]([^'\"]*)/types/events['\"];?",
            r"import { getEventDisplayName } from '\1/types/event-helpers';",
            content
        )
        
        # Handle getIncidentDisplayName
        content = re.sub(
            r"import\s+{\s*getIncidentDisplayName\s*}\s+from\s+['\"]([^'\"]*)/types/events['\"];?",
            r"import { getIncidentDisplayName } from '\1/types/event-helpers';",
            content
        )
        
        # Handle combined imports (both helpers)
        content = re.sub(
            r"import\s+{\s*getEventDisplayName\s*,\s*getIncidentDisplayName\s*}\s+from\s+['\"]([^'\"]*)/types/events['\"];?",
            r"import { getEventDisplayName, getIncidentDisplayName } from '\1/types/event-helpers';",
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
    print("Fixing helper function imports")
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
    print("\nReplaced imports:")
    print("  - from '../../types/events' → from '../../types/event-helpers'")

if __name__ == '__main__':
    main()
