# Save/Load Kingdom Data Feature

## Overview

The Save/Load feature allows Game Masters to export and import kingdom data as JSON files. This provides:
- **Backup capability**: Create safety backups before major changes
- **Data portability**: Transfer kingdoms between worlds or campaigns
- **Recovery**: Restore previous states if needed

## Location

The Save/Load controls are in the **Settings Tab** (GM only).

## Usage

### Exporting Kingdom Data

1. Open the Kingdom Management window
2. Navigate to the Settings tab (gear icon)
3. Click **"Export Kingdom Data"**
4. A JSON file will be downloaded with the naming format:
   - `kingdom-{name}-{date}.json`
   - Example: `kingdom-stolen-lands-2025-11-04.json`

### Importing Kingdom Data

1. Open the Kingdom Management window
2. Navigate to the Settings tab
3. Click **"Import Kingdom Data"**
4. You'll be prompted to create a backup (recommended)
5. Select a previously exported JSON file
6. Review the confirmation dialog showing:
   - Kingdom name
   - Current turn number
   - Fame and Unrest values
7. Confirm to complete the import

## Save File Format

```json
{
  "metadata": {
    "version": "1.0.0",
    "exportDate": "2025-11-04T19:30:00.000Z",
    "kingdomName": "Stolen Lands",
    "currentTurn": 15,
    "moduleVersion": "1.0.0"
  },
  "kingdomData": {
    // Complete kingdom state
  }
}
```

## Technical Details

### Service: `SaveLoadService`

Located at `src/services/SaveLoadService.ts`

**Key Methods:**
- `exportKingdom(kingdomData)` - Downloads kingdom as JSON
- `importKingdom(file)` - Parses and validates JSON file
- `validateKingdomData(data)` - Ensures data integrity
- `createBackup(kingdomData)` - Creates timestamped backup

### Data Storage

Kingdom data is stored in Foundry's actor flags:
- Module: `pf2e-reignmaker`
- Flag: `kingdom-data`
- Location: Party Actor

### Version Compatibility

- **Save Version**: 1.0.0 (current)
- **Module Version**: Tracked in metadata
- Future versions may include migration logic for backwards compatibility

## Safety Features

1. **Validation**: Imported data is validated before being applied
2. **Confirmation**: User must confirm before overwriting current data
3. **Backup Prompt**: Optional automatic backup before importing
4. **Error Handling**: Clear error messages for invalid files

## Best Practices

1. **Regular Backups**: Export kingdom data at the end of each session
2. **Before Major Changes**: Create a backup before:
   - Importing data
   - Resetting kingdom
   - Major milestone events
3. **File Organization**: Keep exports organized by date and campaign name
4. **Test Imports**: Test imported data in a separate world first if uncertain

## Limitations

- Only available to Game Masters
- Imports replace ALL kingdom data (not selective)
- File format is tied to module version
- Large kingdoms may produce large JSON files (typically < 1 MB)

## Troubleshooting

### "Invalid JSON file" Error
- Ensure you're selecting a file exported from this module
- Check the file hasn't been corrupted or manually edited

### "Failed validation" Error
- The JSON structure is missing required fields
- Try exporting a fresh copy or use a backup

### Import Doesn't Update UI
- Refresh the Kingdom Management window
- Check the browser console for errors

## Architecture Notes

### Why Store in Actor Flags?

- Foundry's built-in synchronization across clients
- Automatic permissions handling
- Native undo/redo support
- Integration with Foundry's backup system

### Data Flow

```
Export: KingdomStore → SaveLoadService → Browser Download
Import: File Upload → SaveLoadService → Validation → KingdomActor → All Clients
```

See `.clinerules/ARCHITECTURE_SUMMARY.md` for more details on the data architecture.
