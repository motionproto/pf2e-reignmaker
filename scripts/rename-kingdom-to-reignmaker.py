#!/usr/bin/env python3
"""
Script to rename all references from pf2e-reignmaker to pf2e-reignmaker
"""
import json
import os
import re
from pathlib import Path

def update_json_file(filepath):
    """Update a single JSON file by replacing kingdom-lite with reignmaker"""
    with open(filepath, 'r') as f:
        content = f.read()
    
    # Replace all occurrences
    updated_content = content.replace('pf2e-reignmaker', 'pf2e-reignmaker')
    
    # Only write if there were changes
    if content != updated_content:
        with open(filepath, 'w') as f:
            f.write(updated_content)
        return True
    return False

def update_python_file(filepath):
    """Update a single Python file by replacing kingdom-lite with reignmaker"""
    with open(filepath, 'r') as f:
        content = f.read()
    
    # Replace all occurrences
    updated_content = content.replace('pf2e-reignmaker', 'pf2e-reignmaker')
    updated_content = updated_content.replace('pf2e_reignmaker', 'pf2e_reignmaker')
    updated_content = updated_content.replace('__pf2e_reignmaker_', '__pf2e_reignmaker_')
    
    # Only write if there were changes
    if content != updated_content:
        with open(filepath, 'w') as f:
            f.write(updated_content)
        return True
    return False

def update_javascript_file(filepath):
    """Update a single JavaScript file by replacing kingdom-lite with reignmaker"""
    with open(filepath, 'r') as f:
        content = f.read()
    
    # Replace all occurrences
    updated_content = content.replace('pf2e-reignmaker', 'pf2e-reignmaker')
    updated_content = updated_content.replace('pf2e_reignmaker', 'pf2e_reignmaker')
    updated_content = updated_content.replace('__pf2e_reignmaker_', '__pf2e_reignmaker_')
    updated_content = updated_content.replace("game?.modules?.get('pf2e-reignmaker')", "game?.modules?.get('pf2e-reignmaker')")
    
    # Only write if there were changes
    if content != updated_content:
        with open(filepath, 'w') as f:
            f.write(updated_content)
        return True
    return False

def update_shell_script(filepath):
    """Update a single shell script file by replacing kingdom-lite with reignmaker"""
    with open(filepath, 'r') as f:
        content = f.read()
    
    # Replace all occurrences
    updated_content = content.replace('pf2e-reignmaker', 'pf2e-reignmaker')
    
    # Only write if there were changes
    if content != updated_content:
        with open(filepath, 'w') as f:
            f.write(updated_content)
        return True
    return False

def main():
    """Main function to update all files"""
    project_root = Path('.')
    
    updated_files = []
    
    # Update JSON files in data directory
    print("Updating JSON files...")
    for json_file in project_root.glob('data/**/*.json'):
        if update_json_file(json_file):
            updated_files.append(str(json_file))
            print(f"  Updated: {json_file}")
    
    # Update Python files
    print("\nUpdating Python files...")
    for py_file in project_root.glob('data/**/*.py'):
        if update_python_file(py_file):
            updated_files.append(str(py_file))
            print(f"  Updated: {py_file}")
    
    for py_file in project_root.glob('scripts/*.py'):
        if update_python_file(py_file):
            updated_files.append(str(py_file))
            print(f"  Updated: {py_file}")
    
    # Update JavaScript files
    print("\nUpdating JavaScript files...")
    js_files = [
        'test-manual-sync.js',
        'test-enhanced-structures.js',
        'test-kingmaker-data.js',
        'test-production-calculation.js',
        'test-territory-sync.js'
    ]
    
    for js_file in js_files:
        filepath = project_root / js_file
        if filepath.exists():
            if update_javascript_file(filepath):
                updated_files.append(str(filepath))
                print(f"  Updated: {filepath}")
    
    # Update shell scripts
    print("\\nUpdating shell scripts...")
    for sh_file in project_root.glob('data/**/*.sh'):
        if update_shell_script(sh_file):
            updated_files.append(str(sh_file))
            print(f"  Updated: {sh_file}")
    
    # Update language files
    print("\\nUpdating language files...")
    lang_file = project_root / 'lang' / 'en.json'
    if lang_file.exists():
        if update_json_file(lang_file):
            updated_files.append(str(lang_file))
            print(f"  Updated: {lang_file}")
    
    # Update deployment scripts
    print("\\nUpdating deployment scripts...")
    deploy_scripts = ['scripts/setup-dev.js', 'scripts/deploy.js']
    for script in deploy_scripts:
        filepath = project_root / script
        if filepath.exists():
            if update_javascript_file(filepath):
                updated_files.append(str(filepath))
                print(f"  Updated: {filepath}")
    
    # Update package-lock.json
    print("\\nUpdating package-lock.json...")
    package_lock = project_root / 'package-lock.json'
    if package_lock.exists():
        if update_json_file(package_lock):
            updated_files.append(str(package_lock))
            print(f"  Updated: {package_lock}")
    
    # Update token-map.json
    print("\\nUpdating token-map.json...")
    token_map = project_root / 'token-map.json'
    if token_map.exists():
        if update_json_file(token_map):
            updated_files.append(str(token_map))
            print(f"  Updated: {token_map}")
    
    # Update README.md  
    print("\\nUpdating README.md...")
    readme_file = project_root / 'README.md'
    if readme_file.exists():
        with open(readme_file, 'r') as f:
            content = f.read()
        updated_content = content.replace('pf2e-reignmaker', 'pf2e-reignmaker')
        if content != updated_content:
            with open(readme_file, 'w') as f:
                f.write(updated_content)
            updated_files.append(str(readme_file))
            print(f"  Updated: {readme_file}")
    
    print(f"\n{'='*50}")
    print(f"Total files updated: {len(updated_files)}")
    
    if updated_files:
        print("\nFiles that were updated:")
        for f in sorted(updated_files):
            print(f"  - {f}")
    else:
        print("No files needed updating.")

if __name__ == "__main__":
    main()
