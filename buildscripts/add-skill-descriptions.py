#!/usr/bin/env python3
"""
Add skill descriptions to ActionSkillsTable.csv and IncidentSkillsTable.csv
"""

import re
import csv
from pathlib import Path

def to_camel_case(name):
    """Convert 'Aid Another' to 'aidAnother'"""
    words = name.split()
    if not words:
        return name
    return words[0].lower() + ''.join(word.capitalize() for word in words[1:])

def to_kebab_case(name):
    """Convert 'Bandit Raids' to 'bandit-raids'"""
    return name.lower().replace(' ', '-')

def extract_skills_with_descriptions(filepath):
    """Extract skills array with descriptions from a TypeScript pipeline file"""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Find skills array
    skills_match = re.search(r'skills:\s*\[(.*?)\]', content, re.DOTALL)
    if not skills_match:
        return []
    
    skills_content = skills_match.group(1)
    
    # Extract each skill object
    skill_pattern = r"\{\s*skill:\s*['\"]([^'\"]+)['\"]\s*,\s*description:\s*['\"]([^'\"]+)['\"]\s*\}"
    skills = []
    for match in re.finditer(skill_pattern, skills_content):
        skill_name = match.group(1)
        description = match.group(2)
        skills.append(f"{skill_name} ({description})")
    
    return skills

def update_actions_csv():
    """Update ActionSkillsTable.csv with skill descriptions"""
    csv_path = 'docs/planning/ActionSkillsTable.csv'
    pipeline_dir = 'src/pipelines/actions'
    
    # Read current CSV
    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        rows = list(reader)
        fieldnames = reader.fieldnames
    
    # Build a map of all pipeline files
    pipeline_files = {}
    for ts_file in Path(pipeline_dir).rglob('*.ts'):
        if ts_file.name != 'README.md':
            pipeline_files[ts_file.stem] = ts_file
    
    print(f"Found {len(pipeline_files)} action pipeline files")
    
    # Special case mappings
    special_cases = {
        'Recruit Army': 'recruitUnit'
    }
    
    # Update each row
    updated_count = 0
    for row in rows:
        name = row['Name']
        
        # Check for special cases first
        if name in special_cases:
            camel_name = special_cases[name]
        else:
            # Convert name to camelCase to match file name
            camel_name = to_camel_case(name)
        
        if camel_name in pipeline_files:
            pipeline_file = pipeline_files[camel_name]
            skills = extract_skills_with_descriptions(pipeline_file)
            if skills:
                row['Skills'] = ', '.join(skills)
                row['Skill Count'] = str(len(skills))
                print(f"✓ Updated {name}: {len(skills)} skills")
                updated_count += 1
            else:
                print(f"✗ No skills found in {name}")
        else:
            print(f"✗ No pipeline file found for '{name}' (looking for '{camel_name}.ts')")
    
    # Write updated CSV
    with open(csv_path, 'w', encoding='utf-8', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)
    
    print(f"\n✓ Updated {csv_path} ({updated_count}/{len(rows)} rows)")

def update_incidents_csv():
    """Update IncidentSkillsTable.csv with skill descriptions"""
    csv_path = 'docs/planning/IncidentSkillsTable.csv'
    pipeline_dir = 'src/pipelines/incidents'
    
    # Read current CSV
    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        rows = list(reader)
        fieldnames = reader.fieldnames
    
    # Build a map of all pipeline files (using kebab-case stem as key)
    pipeline_files = {}
    for ts_file in Path(pipeline_dir).rglob('*.ts'):
        pipeline_files[ts_file.stem] = ts_file
    
    print(f"Found {len(pipeline_files)} incident pipeline files")
    
    # Update each row
    updated_count = 0
    for row in rows:
        name = row['Name']
        # Convert name to kebab-case to match file name
        kebab_name = to_kebab_case(name)
        
        if kebab_name in pipeline_files:
            pipeline_file = pipeline_files[kebab_name]
            skills = extract_skills_with_descriptions(pipeline_file)
            if skills:
                row['Skills'] = ', '.join(skills)
                row['Skill Count'] = str(len(skills))
                print(f"✓ Updated {name}: {len(skills)} skills")
                updated_count += 1
            else:
                print(f"✗ No skills found in {name}")
        else:
            print(f"✗ No pipeline file found for '{name}' (looking for '{kebab_name}.ts')")
    
    # Write updated CSV
    with open(csv_path, 'w', encoding='utf-8', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)
    
    print(f"\n✓ Updated {csv_path} ({updated_count}/{len(rows)} rows)")

# Update ActionSkillsTable.csv
print("=" * 60)
print("Updating ActionSkillsTable.csv...")
print("=" * 60)
update_actions_csv()

# Update IncidentSkillsTable.csv
print("\n" + "=" * 60)
print("Updating IncidentSkillsTable.csv...")
print("=" * 60)
update_incidents_csv()

print("\n" + "=" * 60)
print("Done!")
print("=" * 60)
