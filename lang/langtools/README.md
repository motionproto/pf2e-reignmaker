# Language Tools

A set of tools for efficiently managing large translation JSON files without loading the entire file into memory.

## Installation

For CLI tools only:
- Python 3.6+

For web interface:
```bash
pip install flask flask-cors
```

## Tools

### 1. build_index.py

Builds an index of all keys in the language file for fast lookups.

```bash
python build_index.py
```

This creates `lang_index.json` containing:
- All key paths with approximate line numbers
- Namespace hierarchy
- Statistics about the file

### 2. lang_manager.py

The main tool for working with language files. Provides CRUD operations and search capabilities.

## Usage

### Build the index first
```bash
python build_index.py
```

### Get a key value
```bash
python lang_manager.py get "pf2e-kingdom-lite.kingdom.food"
```

### Set/Update a key
```bash
python lang_manager.py set "pf2e-kingdom-lite.kingdom.newKey" "New translation text"
```

### Delete a key
```bash
python lang_manager.py delete "pf2e-kingdom-lite.deprecated.oldKey"
```

### Search for keys
```bash
# Search key names
python lang_manager.py search "kingdom.*event"

# Search in values
python lang_manager.py search --values "unrest"
```

### List all keys in a namespace
```bash
python lang_manager.py list "pf2e-kingdom-lite.kingdom"
```

### Show statistics
```bash
python lang_manager.py stats
```

### Show pending changes
```bash
python lang_manager.py changes
```

### Export changes
```bash
# Save to original file
python lang_manager.py export

# Save to different file
python lang_manager.py export --output ../en_updated.json
```

## Features

- **Efficient**: Works with large JSON files without loading everything into memory
- **Safe**: Creates backups before saving changes
- **Flexible**: Search by key patterns or value content
- **Batch operations**: Make multiple changes before exporting
- **Change tracking**: Review changes before applying them

## Workflow Example

1. Build the index (only needed once or when file structure changes significantly):
   ```bash
   python build_index.py
   ```

2. Make multiple changes:
   ```bash
   python lang_manager.py set "pf2e-kingdom-lite.ui.newButton" "Click Me"
   python lang_manager.py set "pf2e-kingdom-lite.ui.newTooltip" "This is a tooltip"
   python lang_manager.py delete "pf2e-kingdom-lite.deprecated.oldFeature"
   ```

3. Review changes:
   ```bash
   python lang_manager.py changes
   ```

4. Export when ready:
   ```bash
   python lang_manager.py export
   ```

## Web Interface

### Starting the Web Interface

```bash
python web_interface.py
```

Then open http://localhost:8080 in your browser.

### Features

- **Interactive Tree View**: Browse the JSON structure hierarchically
- **Multiple View Modes**: Tree, View, Form, Code, Text, and Preview modes
- **Search Functionality**: Search keys or values with regex support
- **Live Editing**: Make changes directly in the browser
- **Save & Export**: Save changes to temporary file or export to original
- **Expand/Collapse**: Quickly expand or collapse all nodes
- **Statistics Display**: View total keys and namespaces
- **Selection Mode**: Select multiple keys/branches for bulk operations
- **Delete Keys/Branches**: Delete selected keys or entire branches from the hierarchy
- **Copy Key Path**: Click the 📋 button next to any key to copy its full path

### Web Interface Workflow

1. Start the server:
   ```bash
   cd lang/langtools
   python web_interface.py
   # Or use the convenience script:
   ./start_web.sh
   ```

2. Open http://localhost:8080 in your browser

3. Browse and edit translations in the tree view

4. Use search to find specific keys or values

5. **To copy a key path (for sharing with AI assistant):**
   - Right-click on any key in the tree view
   - Select "📋 Copy Key Path" from the context menu
   - The full path is copied to clipboard (e.g., `pf2e-kingdom-lite.kingdom.food`)
   - Share this path with the AI assistant for targeted updates

6. **To delete keys/branches:**
   - Click "Selection Mode" button
   - Click on keys/branches to select them (they'll be highlighted)
   - Click "Delete Selected" button
   - Confirm the deletion

7. Save changes to temporary file (creates `en_edited.json`)

8. Export to original file when ready

## Advanced Usage

### Using from Python

```python
from lang_manager import LanguageManager

# Initialize
manager = LanguageManager()

# Get a value
value = manager.get_key("pf2e-kingdom-lite.kingdom.food")

# Set a value
manager.set_key("pf2e-kingdom-lite.kingdom.newKey", "New value")

# Search
keys = manager.search_keys("kingdom.*")
values = manager.search_values("unrest")

# Export
manager.export()
```

## Notes

- The tool maintains a cache of recently accessed keys for performance
- Changes are kept in memory until exported
- A backup (.bak) file is created when saving
- The index file should be regenerated if the JSON structure changes significantly
