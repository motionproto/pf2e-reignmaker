#!/usr/bin/env python3
"""
Audit all action pipelines for missing outcome badges.

Identifies actions where success/criticalSuccess outcomes have:
1. Empty modifiers arrays (no auto-converted badges)
2. No outcomeBadges arrays (no custom badges)

These actions will show NO badges in the "Possible Outcomes" section.
"""

import os
import re
from pathlib import Path

def extract_outcomes_section(content: str) -> str:
    """Extract the outcomes object from a pipeline file."""
    match = re.search(r'outcomes:\s*\{(.*?)\n\s*\}(?:,|\s*$)', content, re.DOTALL)
    if match:
        return match.group(1)
    return ""

def has_empty_outcome(outcome_text: str) -> bool:
    """Check if an outcome has both empty modifiers and no outcomeBadges."""
    # Check for empty modifiers array
    has_empty_modifiers = 'modifiers: []' in outcome_text
    # Check for no outcomeBadges
    has_no_badges = 'outcomeBadges' not in outcome_text
    return has_empty_modifiers and has_no_badges

def audit_action_file(filepath: Path) -> dict:
    """Audit a single action file for missing badges."""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    outcomes_section = extract_outcomes_section(content)
    if not outcomes_section:
        return None
    
    # Split outcomes into individual outcomes
    crit_success_match = re.search(r'criticalSuccess:\s*\{(.*?)\}(?:,|\s*(?:success|failure|criticalFailure):)', outcomes_section, re.DOTALL)
    success_match = re.search(r'(?<!critical)success:\s*\{(.*?)\}(?:,|\s*(?:failure|criticalFailure):)', outcomes_section, re.DOTALL)
    
    result = {
        'file': filepath.name,
        'criticalSuccess_empty': False,
        'success_empty': False
    }
    
    if crit_success_match:
        result['criticalSuccess_empty'] = has_empty_outcome(crit_success_match.group(1))
    
    if success_match:
        result['success_empty'] = has_empty_outcome(success_match.group(1))
    
    # Only return if at least one success outcome is empty
    if result['criticalSuccess_empty'] or result['success_empty']:
        return result
    
    return None

def main():
    actions_dir = Path(__file__).parent.parent / 'src' / 'pipelines' / 'actions'
    
    print("🔍 Auditing action pipelines for missing outcome badges...\n")
    
    empty_actions = []
    
    for filepath in sorted(actions_dir.glob('*.ts')):
        if filepath.name == 'README.md':
            continue
        
        result = audit_action_file(filepath)
        if result:
            empty_actions.append(result)
    
    if empty_actions:
        print(f"❌ Found {len(empty_actions)} actions with missing badges:\n")
        for action in empty_actions:
            badges = []
            if action['criticalSuccess_empty']:
                badges.append('criticalSuccess')
            if action['success_empty']:
                badges.append('success')
            print(f"  • {action['file']:40s} Missing: {', '.join(badges)}")
    else:
        print("✅ All actions have outcome badges!")
    
    print(f"\n📊 Summary: {len(empty_actions)} / {len(list(actions_dir.glob('*.ts'))) - 1} actions need badges")

if __name__ == '__main__':
    main()
