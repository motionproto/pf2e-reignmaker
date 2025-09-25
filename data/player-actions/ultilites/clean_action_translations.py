#!/usr/bin/env python3
"""
Clean old activity translations from lang/en.json before adding new action translations
"""

import json
import sys
import os

# Add the langtools directory to the path
sys.path.insert(0, '../../lang/langtools')

from lang_manager import LanguageManager

def main():
    """Clean old activity translations"""
    
    # Initialize the language manager
    manager = LanguageManager()
    
    # List of keys to remove (old activities)
    old_activity_keys = [
        "abandonHex", "arrestDisidents", "buildRoads", "claimHex", "collectTaxes",
        "continueLeadership", "createMasterpiece", "dealWithUnrest", "establishDiplomaticRelations",
        "establishWorkSite", "exploreHex", "fortifyHex", "gatherResources", 
        "hireAdventurers", "improveLifestyle", "newLeadership", "provideCare",
        "purchaseResources", "raiseFame", "recoverArmy", "recruitArmy", "repair",
        "sendDiplomaticEnvoy", "trainArmy", "tradeWithNeighbor", "upgradeSettlement"
    ]
    
    # Remove old activity translations
    activities_removed = 0
    for activity_key in old_activity_keys:
        key_pattern = f"pf2e-kingdom-lite.activities.{activity_key}"
        
        # Search for all keys starting with this pattern
        matching_keys = manager.search_keys(f"^{key_pattern}")
        
        for key in matching_keys:
            manager.delete_key(key)
            print(f"Removed: {key}")
            activities_removed += 1
    
    # Also search for any other activity-related keys we might have missed
    all_activity_keys = manager.search_keys("pf2e-kingdom-lite\\.activities\\.")
    
    for key in all_activity_keys:
        manager.delete_key(key)
        print(f"Removed additional: {key}")
        activities_removed += 1
    
    # Save the cleaned file
    manager.export()
    
    print(f"\n✅ Cleaned {activities_removed} old activity translation keys")
    print("Language file has been updated successfully")

if __name__ == "__main__":
    main()
