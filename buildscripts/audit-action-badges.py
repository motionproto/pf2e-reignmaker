#!/usr/bin/env python3
"""
Audit Action Badges Script
===========================

Systematically identifies all action pipeline files with missing outcome badges.

This script parses TypeScript action files and checks if their preview.calculate()
implementations return empty outcomeBadges arrays for success outcomes.

Output:
- List of broken actions (missing badges)
- List of working actions (has badges)
- Detailed report for each action
"""

import os
import re
from pathlib import Path
from typing import Dict, List, Set, Tuple

# Paths
ACTIONS_DIR = Path("src/pipelines/actions")
OUTPUT_FILE = Path("buildscripts/action-badges-audit.txt")

# Patterns
PREVIEW_PATTERN = r'preview:\s*\{[^}]*calculate:\s*(?:async\s*)?\([^)]*\)\s*(?:=>)?\s*\{'
OUTCOME_BADGES_PATTERN = r'outcomeBadges:\s*\[([^\]]*)\]'
TEXT_BADGE_PATTERN = r'textBadge\('
OUTCOME_CHECK_PATTERN = r'if\s*\(\s*ctx\.outcome\s*===\s*["\'](\w+)["\']\s*\)'

def parse_action_file(filepath: Path) -> Dict:
    """Parse an action file and extract badge information."""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    result = {
        'filename': filepath.name,
        'has_preview': False,
        'has_calculate': False,
        'outcomes_with_badges': set(),
        'returns_empty_badges': False,
        'preview_content': '',
        'status': 'unknown'
    }
    
    # Check if file has preview.calculate
    preview_match = re.search(PREVIEW_PATTERN, content, re.DOTALL)
    if not preview_match:
        result['status'] = 'no_preview'
        return result
    
    result['has_preview'] = True
    result['has_calculate'] = True
    
    # Extract preview.calculate content (simplified - get up to next top-level closing brace)
    start = preview_match.end()
    # Find the matching closing brace for preview.calculate
    brace_count = 1
    i = start
    while i < len(content) and brace_count > 0:
        if content[i] == '{':
            brace_count += 1
        elif content[i] == '}':
            brace_count -= 1
        i += 1
    
    preview_content = content[start:i-1]
    result['preview_content'] = preview_content
    
    # Check for outcome-specific badge generation
    outcome_checks = re.findall(OUTCOME_CHECK_PATTERN, preview_content)
    result['outcomes_with_badges'] = set(outcome_checks)
    
    # Check for textBadge calls
    has_text_badge = bool(re.search(TEXT_BADGE_PATTERN, preview_content))
    
    # Check for empty outcomeBadges: []
    outcome_badges_matches = re.findall(OUTCOME_BADGES_PATTERN, preview_content)
    
    # Heuristic: If we return outcomeBadges: [] with nothing inside, it's empty
    has_empty_return = any(match.strip() == '' for match in outcome_badges_matches)
    
    # Determine status
    if has_text_badge and outcome_checks:
        result['status'] = 'working'
    elif has_empty_return and not has_text_badge:
        result['status'] = 'broken'
        result['returns_empty_badges'] = True
    elif not outcome_checks and not has_text_badge:
        result['status'] = 'broken'
        result['returns_empty_badges'] = True
    else:
        result['status'] = 'partial'
    
    return result

def audit_all_actions() -> Tuple[List[Dict], List[Dict], List[Dict]]:
    """Audit all action files."""
    working = []
    broken = []
    partial = []
    
    for filepath in sorted(ACTIONS_DIR.glob("*.ts")):
        if filepath.name == "README.md":
            continue
        
        result = parse_action_file(filepath)
        
        if result['status'] == 'working':
            working.append(result)
        elif result['status'] == 'broken':
            broken.append(result)
        elif result['status'] == 'partial':
            partial.append(result)
    
    return working, broken, partial

def generate_report(working: List[Dict], broken: List[Dict], partial: List[Dict]) -> str:
    """Generate a detailed report."""
    report = []
    report.append("=" * 80)
    report.append("ACTION BADGES AUDIT REPORT")
    report.append("=" * 80)
    report.append("")
    
    # Summary
    total = len(working) + len(broken) + len(partial)
    report.append(f"SUMMARY:")
    report.append(f"  Total Actions: {total}")
    report.append(f"  ✅ Working (has badges): {len(working)}")
    report.append(f"  ❌ Broken (missing badges): {len(broken)}")
    report.append(f"  ⚠️  Partial (unclear status): {len(partial)}")
    report.append("")
    report.append("=" * 80)
    report.append("")
    
    # Broken actions (priority)
    if broken:
        report.append("❌ BROKEN ACTIONS (NEED FIXING)")
        report.append("-" * 80)
        for action in broken:
            report.append(f"\n📄 {action['filename']}")
            report.append(f"   Status: Missing outcome badges")
            if action['outcomes_with_badges']:
                report.append(f"   Outcomes checked: {', '.join(action['outcomes_with_badges'])}")
            else:
                report.append(f"   Outcomes checked: None (returns empty array)")
            report.append(f"   Returns empty badges: {action['returns_empty_badges']}")
        report.append("")
        report.append("=" * 80)
        report.append("")
    
    # Partial actions (may need review)
    if partial:
        report.append("⚠️  PARTIAL ACTIONS (REVIEW NEEDED)")
        report.append("-" * 80)
        for action in partial:
            report.append(f"\n📄 {action['filename']}")
            report.append(f"   Outcomes checked: {', '.join(action['outcomes_with_badges']) if action['outcomes_with_badges'] else 'None'}")
        report.append("")
        report.append("=" * 80)
        report.append("")
    
    # Working actions (reference)
    if working:
        report.append("✅ WORKING ACTIONS (REFERENCE)")
        report.append("-" * 80)
        for action in working:
            report.append(f"  • {action['filename']}")
            if action['outcomes_with_badges']:
                report.append(f"    Handles: {', '.join(sorted(action['outcomes_with_badges']))}")
        report.append("")
        report.append("=" * 80)
        report.append("")
    
    # Quick fix list
    if broken:
        report.append("QUICK FIX LIST")
        report.append("-" * 80)
        report.append("Actions that need badges added to preview.calculate():")
        report.append("")
        for action in broken:
            report.append(f"  - {action['filename']}")
        report.append("")
    
    return "\n".join(report)

def main():
    """Main execution."""
    print("🔍 Auditing action pipeline badges...")
    print(f"📁 Scanning: {ACTIONS_DIR}")
    print("")
    
    working, broken, partial = audit_all_actions()
    
    report = generate_report(working, broken, partial)
    
    # Write to file
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        f.write(report)
    
    # Print to console
    print(report)
    print(f"📝 Full report saved to: {OUTPUT_FILE}")
    print("")
    
    # Exit with error code if broken actions found
    if broken:
        print(f"⚠️  Found {len(broken)} broken actions that need fixing!")
        return 1
    else:
        print("✅ All actions have outcome badges!")
        return 0

if __name__ == "__main__":
    exit(main())
