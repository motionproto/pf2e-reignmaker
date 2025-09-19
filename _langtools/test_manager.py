#!/usr/bin/env python3
"""
Test script for the language manager
"""

from lang_manager import LanguageManager

# Initialize manager
manager = LanguageManager()

print("=== Testing Language Manager ===\n")

# Test getting a key
print("1. Getting an existing key:")
value = manager.get_key("pf2e-kingdom-lite.kingdom.food")
print(f"   pf2e-kingdom-lite.kingdom.food = '{value}'")

# Test setting a new key
print("\n2. Adding a new key:")
manager.set_key("pf2e-kingdom-lite.test.newKey", "This is a test value")
print("   Added: pf2e-kingdom-lite.test.newKey = 'This is a test value'")

# Test modifying an existing key
print("\n3. Modifying an existing key:")
original = manager.get_key("pf2e-kingdom-lite.kingdom.food")
manager.set_key("pf2e-kingdom-lite.kingdom.food", "Modified Food Label")
print(f"   Modified: pf2e-kingdom-lite.kingdom.food from '{original}' to 'Modified Food Label'")

# Test deleting a key
print("\n4. Deleting a key:")
manager.set_key("pf2e-kingdom-lite.test.toDelete", "Will be deleted")
manager.delete_key("pf2e-kingdom-lite.test.toDelete")
print("   Created and deleted: pf2e-kingdom-lite.test.toDelete")

# Show pending changes
print("\n5. Pending changes:")
manager.show_changes()

# Test search
print("\n6. Search for keys containing 'kingdom.food':")
results = manager.search_keys("kingdom\\.food")
for key in results[:5]:
    print(f"   - {key}")

# Test search in values
print("\n7. Search for values containing 'unrest' (first 3):")
results = manager.search_values("unrest")
for key, value in results[:3]:
    value_preview = value[:60] + "..." if len(value) > 60 else value
    print(f"   - {key}: {value_preview}")

# Show stats
print("\n8. Statistics:")
stats = manager.get_stats()
print(f"   Total keys: {stats['total_keys']}")
print(f"   Namespaces: {stats['namespaces']}")
print(f"   Pending changes:")
print(f"     Added: {stats['pending_changes']['added']}")
print(f"     Modified: {stats['pending_changes']['modified']}")
print(f"     Deleted: {stats['pending_changes']['deleted']}")

# Export to test file
print("\n9. Exporting to test file:")
success = manager.export("../en_test.json")
if success:
    print("   Export successful!")
else:
    print("   Export failed!")

print("\n=== Test Complete ===")
