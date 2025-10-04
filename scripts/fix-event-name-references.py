#!/usr/bin/env python3
"""
Fix references to event.name and incident.name in TypeScript files.
Replace with getEventDisplayName(event) or getIncidentDisplayName(incident).
"""

import re
import sys
from pathlib import Path

def fix_event_name_references(content: str) -> tuple[str, bool]:
    """Fix event.name references."""
    changed = False
    
    # Check if file already imports the helper
    has_event_import = 'getEventDisplayName' in content
    has_incident_import = 'getIncidentDisplayName' in content
    
    # Replace event.name with getEventDisplayName(event)
    if 'event.name' in content:
        content = re.sub(r'\bevent\.name\b', 'getEventDisplayName(event)', content)
        changed = True
        
        # Add import if not present
        if not has_event_import:
            # Find existing import from events.ts
            import_pattern = r"(import\s+(?:type\s+)?{[^}]+})\s+from\s+['\"]([^'\"]*events)['\"]"
            match = re.search(import_pattern, content)
            
            if match:
                # Add to existing import
                imports = match.group(1)
                if 'getEventDisplayName' not in imports:
                    # Add to import list
                    imports = imports.rstrip('}') + ', getEventDisplayName }'
                    content = content.replace(match.group(0), f"{imports} from '{match.group(2)}'")
            else:
                # Add new import at the top
                first_import = re.search(r'^import\s+', content, re.MULTILINE)
                if first_import:
                    insert_pos = first_import.start()
                    content = content[:insert_pos] + "import { getEventDisplayName } from '../../types/events';\n" + content[insert_pos:]
    
    # Replace incident.name with getIncidentDisplayName(incident)
    if 'incident.name' in content:
        content = re.sub(r'\bincident\.name\b', 'getIncidentDisplayName(incident)', content)
        changed = True
        
        # Add import if not present
        if not has_incident_import:
            # Find existing import from incidents.ts
            import_pattern = r"(import\s+(?:type\s+)?{[^}]+})\s+from\s+['\"]([^'\"]*incidents)['\"]"
            match = re.search(import_pattern, content)
            
            if match:
                # Add to existing import
                imports = match.group(1)
                if 'getIncidentDisplayName' not in imports:
                    imports = imports.rstrip('}') + ', getIncidentDisplayName }'
                    content = content.replace(match.group(0), f"{imports} from '{match.group(2)}'")
            else:
                # Add new import at the top
                first_import = re.search(r'^import\s+', content, re.MULTILINE)
                if first_import:
                    insert_pos = first_import.start()
                    content = content[:insert_pos] + "import { getIncidentDisplayName } from '../../types/incidents';\n" + content[insert_pos:]
    
    return content, changed

def process_file(filepath: Path) -> bool:
    """Process a single TypeScript file."""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        fixed_content, changed = fix_event_name_references(content)
        
        if changed:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(fixed_content)
            return True
        
        return False
        
    except Exception as e:
        print(f"✗ Error processing {filepath}: {e}")
        return False

def main():
    print("=" * 80)
    print("Fixing event.name and incident.name references")
    print("=" * 80)
    
    # Find all TypeScript files in src/
    ts_files = list(Path('src').rglob('*.ts'))
    
    print(f"\nFound {len(ts_files)} TypeScript files\n")
    
    changed_count = 0
    
    for filepath in ts_files:
        if process_file(filepath):
            changed_count += 1
            print(f"✓ Fixed: {filepath}")
    
    print("\n" + "=" * 80)
    print(f"Complete: {changed_count} files updated")
    print("=" * 80)
    print("\nReplaced:")
    print("  - event.name → getEventDisplayName(event)")
    print("  - incident.name → getIncidentDisplayName(incident)")

if __name__ == '__main__':
    main()
