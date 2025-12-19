#!/usr/bin/env python3
"""
Comprehensive audit of all action pipelines for badge display.

Checks:
1. Static outcomes with empty modifiers AND no outcomeBadges
2. Actions that have badges in preview.calculate() but not in static outcomes
"""

import os
import re
from pathlib import Path

def extract_outcomes_section(content: str) -> str:
    """Extract the outcomes object from a pipeline file."""
    match = re.search(r'outcomes:\s*\{(.*?)^\s*\}(?:,|$)', content, re.DOTALL | re.MULTILINE)
    if match:
        return match.group(1)
    return ""

def extract_preview_section(content: str) -> str:
    """Extract the preview.calculate() section."""
    match = re.search(r'preview:\s*\{.*?calculate:.*?\{(.*?)^\s*\}', content, re.DOTALL | re.MULTILINE)
    if match:
        return match.group(1)
    return ""

def has_empty_modifiers_and_no_badges(outcome_text: str) -> bool:
    """Check if an outcome has empty modifiers and no outcomeBadges."""
    has_empty_modifiers = 'modifiers: []' in outcome_text
    has_no_badges = 'outcomeBadges' not in outcome_text
    return has_empty_modifiers and has_no_badges

def has_badges_in_preview(preview_text: str) -> bool:
    """Check if preview.calculate() returns outcomeBadges."""
    return 'outcomeBadges' in preview_text and 'textBadge' in preview_text

def audit_action_file(filepath: Path) -> dict:
    """Audit a single action file."""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    outcomes_section = extract_outcomes_section(content)
    preview_section = extract_preview_section(content)
    
    if not outcomes_section:
        return None
    
    # Extract individual outcomes
    crit_success_match = re.search(r'criticalSuccess:\s*\{(.*?)\n\s*\}', outcomes_section, re.DOTALL)
    success_match = re.search(r'(?<!critical)success:\s*\{(.*?)\n\s*\}', outcomes_section, re.DOTALL)
    
    result = {
        'file': filepath.name,
        'criticalSuccess_needs_badges': False,
        'success_needs_badges': False,
        'has_preview_badges': has_badges_in_preview(preview_section)
    }
    
    if crit_success_match:
        result['criticalSuccess_needs_badges'] = has_empty_modifiers_and_no_badges(crit_success_match.group(1))
    
    if success_match:
        result['success_needs_badges'] = has_empty_modifiers_and_no_badges(success_match.group(1))
    
    # Only return if at least one success outcome needs badges
    if result['criticalSuccess_needs_badges'] or result['success_needs_badges']:
        return result
    
    return None

def main():
    actions_dir = Path(__file__).parent.parent / 'src' / 'pipelines' / 'actions'
    
    print("🔍 Comprehensive Badge Audit\n")
    print("=" * 80)
    
    needs_badges = []
    has_preview_only = []
    
    for filepath in sorted(actions_dir.glob('*.ts')):
        if filepath.name == 'README.md':
            continue
        
        result = audit_action_file(filepath)
        if result:
            needs_badges.append(result)
            if result['has_preview_badges']:
                has_preview_only.append(result)
    
    if needs_badges:
        print(f"\n❌ Found {len(needs_badges)} actions with missing static outcome badges:\n")
        for action in needs_badges:
            missing = []
            if action['criticalSuccess_needs_badges']:
                missing.append('criticalSuccess')
            if action['success_needs_badges']:
                missing.append('success')
            
            preview_note = " (has preview badges)" if action['has_preview_badges'] else ""
            print(f"  • {action['file']:40s} Missing: {', '.join(missing)}{preview_note}")
        
        if has_preview_only:
            print(f"\n⚠️  {len(has_preview_only)} of these have badges in preview.calculate() but not static outcomes:")
            for action in has_preview_only:
                print(f"  • {action['file']}")
    else:
        print("\n✅ All actions have outcome badges in static outcomes!")
    
    print(f"\n📊 Summary: {len(needs_badges)} / {len(list(actions_dir.glob('*.ts'))) - 1} actions need static badges")

if __name__ == '__main__':
    main()
