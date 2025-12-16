#!/usr/bin/env python3
"""
Fix missing closing braces in outcomeBadges sections.
The sync script removed the closing } after criticalFailure arrays.
"""

import os
import re

def fix_file(filepath):
    """Fix missing closing braces in a single file."""
    with open(filepath, 'r') as f:
        content = f.read()
    
    original = content
    
    # Pattern: find criticalFailure arrays that are missing the closing brace
    # Look for: criticalFailure: [...] followed by } or { (next approach) without a closing }
    pattern = r'(criticalFailure: \[[^\]]*\])\s*\n(\s+)(\}|\{)'
    
    def replacer(match):
        array_part = match.group(1)
        indent = match.group(2)
        next_char = match.group(3)
        
        # Check if we need to add closing brace
        # If next char is { (start of next approach), we need }
        if next_char == '{':
            return f"{array_part}\n{indent}}}\n{indent}{next_char}"
        else:
            # Already has closing brace
            return match.group(0)
    
    content = re.sub(pattern, replacer, content)
    
    if content != original:
        with open(filepath, 'w') as f:
            f.write(content)
        return True
    return False

def main():
    events_dir = '../src/pipelines/events'
    fixed_count = 0
    
    for filename in os.listdir(events_dir):
        if filename.endswith('.ts'):
            filepath = os.path.join(events_dir, filename)
            if fix_file(filepath):
                print(f"✅ Fixed {filename}")
                fixed_count += 1
    
    print(f"\n✅ Fixed {fixed_count} files")

if __name__ == '__main__':
    main()
