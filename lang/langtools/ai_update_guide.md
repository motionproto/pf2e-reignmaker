# AI Assistant Guide for Updating String Tables

This document explains how an AI assistant can efficiently update the language string table using the CLI tools.

## Quick Reference Commands

### 1. Search Operations
```bash
# Find keys by pattern
python3 lang_manager.py search "kingdom.*unrest"

# Search in values
python3 lang_manager.py search --values "unrest"

# List all keys in a namespace
python3 lang_manager.py list "pf2e-kingdom-lite.kingdom"
```

### 2. Read Operations
```bash
# Get a specific value
python3 lang_manager.py get "pf2e-kingdom-lite.kingdom.food"
```

### 3. Update Operations
```bash
# Add or update a key
python3 lang_manager.py set "pf2e-kingdom-lite.kingdom.newFeature" "New Feature Text"

# Delete a key
python3 lang_manager.py delete "pf2e-kingdom-lite.deprecated.oldKey"
```

### 4. Review & Export
```bash
# Show pending changes
python3 lang_manager.py changes

# Export to original file
python3 lang_manager.py export
```

## Example AI Workflow

### Adding New Event Strings
```bash
# Add a new event
python3 lang_manager.py set "pf2e-kingdom-lite.events.newEvent.name" "Mysterious Visitors"
python3 lang_manager.py set "pf2e-kingdom-lite.events.newEvent.description" "Strange travelers arrive..."
python3 lang_manager.py set "pf2e-kingdom-lite.events.newEvent.success" "You successfully..."
python3 lang_manager.py set "pf2e-kingdom-lite.events.newEvent.failure" "Unfortunately..."
```

### Updating Activity Messages
```bash
# Update unrest-related messages
python3 lang_manager.py set "pf2e-kingdom-lite.activities.quell-unrest.success.msg" "<p>You reduce Unrest by 1d4 points.</p>"
```

### Batch Updates for New Features
```bash
# Add multiple related keys for a new feature
python3 lang_manager.py set "pf2e-kingdom-lite.kingdom.incidents.minor.title" "Minor Incident"
python3 lang_manager.py set "pf2e-kingdom-lite.kingdom.incidents.minor.description" "A small problem has occurred"
python3 lang_manager.py set "pf2e-kingdom-lite.kingdom.incidents.moderate.title" "Moderate Incident"
python3 lang_manager.py set "pf2e-kingdom-lite.kingdom.incidents.major.title" "Major Incident"
```

## AI Assistant Instructions

When asked to update the string table, the AI should:

1. **First, search for existing keys** to understand the naming pattern:
   ```bash
   python3 lang_manager.py search "pattern.*"
   ```

2. **Check existing values** to maintain consistency:
   ```bash
   python3 lang_manager.py get "existing.key"
   ```

3. **Make updates** following the established patterns:
   ```bash
   python3 lang_manager.py set "key" "value"
   ```

4. **Review changes** before committing:
   ```bash
   python3 lang_manager.py changes
   ```

5. **Export** when all changes are complete:
   ```bash
   python3 lang_manager.py export
   ```

## Common Update Patterns

### Adding Activity Results
```bash
# Pattern: activities.[activity-name].[result].[msg|modifiers]
python3 lang_manager.py set "pf2e-kingdom-lite.activities.new-activity.criticalSuccess.msg" "<p>Critical success message</p>"
python3 lang_manager.py set "pf2e-kingdom-lite.activities.new-activity.success.msg" "<p>Success message</p>"
python3 lang_manager.py set "pf2e-kingdom-lite.activities.new-activity.failure.msg" "<p>Failure message</p>"
python3 lang_manager.py set "pf2e-kingdom-lite.activities.new-activity.criticalFailure.msg" "<p>Critical failure message</p>"
```

### Adding UI Elements
```bash
# Pattern: ui.[element].[property]
python3 lang_manager.py set "pf2e-kingdom-lite.ui.buttons.newButton" "Click Me"
python3 lang_manager.py set "pf2e-kingdom-lite.ui.tooltips.newTooltip" "This button does X"
python3 lang_manager.py set "pf2e-kingdom-lite.ui.labels.newLabel" "New Feature:"
```

### Adding Kingdom Features
```bash
# Pattern: kingdom.[feature].[property]
python3 lang_manager.py set "pf2e-kingdom-lite.kingdom.features.newFeature.name" "Feature Name"
python3 lang_manager.py set "pf2e-kingdom-lite.kingdom.features.newFeature.description" "What this feature does"
```

## Advantages of This Approach

1. **No Memory Issues**: The tool doesn't load the entire 400KB file
2. **Precise Updates**: Target exactly the keys that need changing
3. **Batch Operations**: Queue multiple changes before saving
4. **Change Tracking**: Review all pending changes before committing
5. **Pattern Matching**: Use regex to find and update related keys
6. **Consistency**: Easily check existing patterns before adding new keys

## Example: Complete Feature Addition

Here's how the AI would add a complete new incident type:

```bash
# 1. Check existing incident patterns
cd lang/langtools
python3 lang_manager.py search "incidents\\.minor\\." | head -5

# 2. Add new incident following the pattern
python3 lang_manager.py set "pf2e-kingdom-lite.incidents.minor.bandit-raid.name" "Bandit Raid"
python3 lang_manager.py set "pf2e-kingdom-lite.incidents.minor.bandit-raid.description" "A small group of bandits is causing trouble"
python3 lang_manager.py set "pf2e-kingdom-lite.incidents.minor.bandit-raid.resolution" "Send guards to deal with the bandits"

# 3. Review changes
python3 lang_manager.py changes

# 4. Export if everything looks good
python3 lang_manager.py export
```

This approach allows the AI to make precise, trackable updates to the string table without the complexity of editing a 6,000-line JSON file directly.
