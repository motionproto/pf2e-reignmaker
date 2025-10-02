#!/usr/bin/env python3
"""
Remove unused percentileMin and percentileMax fields from all incident JSON files.
"""

import json
from pathlib import Path

def remove_percentile_fields(incident_data):
    """Remove percentileMin and percentileMax from incident data."""
    fields_to_remove = ['percentileMin', 'percentileMax']
    
    for field in fields_to_remove:
        if field in incident_data:
            del incident_data[field]
    
    return incident_data

def cleanup_all_incidents():
    """Remove percentile fields from all incident JSON files."""
    
    tiers = ['minor', 'moderate', 'major']
    total_cleaned = 0
    
    for tier in tiers:
        tier_dir = Path(tier)
        
        if not tier_dir.exists():
            print(f"❌ Directory {tier}/ not found")
            continue
        
        json_files = list(tier_dir.glob('*.json'))
        print(f"\n📁 Processing {tier}/ ({len(json_files)} files)")
        
        for json_file in json_files:
            try:
                # Read original
                with open(json_file, 'r') as f:
                    incident_data = json.load(f)
                
                # Check if fields exist
                has_percentile = 'percentileMin' in incident_data or 'percentileMax' in incident_data
                
                if has_percentile:
                    # Remove fields
                    remove_percentile_fields(incident_data)
                    
                    # Write back
                    with open(json_file, 'w') as f:
                        json.dump(incident_data, f, indent=2)
                    
                    print(f"  ✅ Cleaned: {json_file.name}")
                    total_cleaned += 1
                else:
                    print(f"  ⏭️  Skipped: {json_file.name} (no percentile fields)")
                
            except Exception as e:
                print(f"  ❌ Error processing {json_file.name}: {e}")
    
    print(f"\n🎉 Successfully cleaned {total_cleaned} incident files")

if __name__ == '__main__':
    cleanup_all_incidents()
