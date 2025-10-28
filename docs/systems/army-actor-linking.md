# Army/NPC Actor Linking System

## Overview

The Army/NPC Actor Linking system allows armies in the Reignmaker kingdom management system to be linked to NPC actors in Foundry VTT. This provides a seamless integration between kingdom-level army management and character-level NPC stat tracking.

## Features

### 1. Link Existing Actors
- Link any existing NPC actor to an army
- Validation prevents duplicate links
- Automatic name/level synchronization
- Actor metadata tracking via flags

### 2. Unlink Actors
- Unlink an actor from an army without deleting either
- Actor can be reused or deleted later
- Army record persists independently

### 3. Disband Army Options
When disbanding an army, users can choose:
- **Delete Army & Actor**: Removes both (default behavior)
- **Delete Army, Keep Actor**: Unlinks and keeps the NPC actor for reuse

### 4. Bidirectional Protection
When deleting an NPC actor that's linked to an army, users are prompted:
- **Unlink & Delete Actor**: Keep the army, remove the actor
- **Delete Army Too**: Remove both army and actor
- **Cancel**: Abort the deletion

## Architecture

### Service Layer (`src/services/army/`)

#### `linkExistingActor(armyId, actorId)`
Links an existing NPC actor to an army.

**Validations:**
- Actor must exist and be type "npc"
- Actor must not already be linked to another army
- Army must exist

**Actions:**
- Adds `army-metadata` flag to actor
- Updates army record with `actorId`
- Syncs name and level from army to actor

#### `unlinkActor(armyId)`
Unlinks an actor from an army without deleting either.

**Actions:**
- Removes `army-metadata` flag from actor
- Clears `actorId` from army record
- Both army and actor persist

#### `disbandArmy(armyId, deleteActor = true)`
Disbands an army with optional actor deletion.

**Parameters:**
- `armyId`: The army to disband
- `deleteActor`: Whether to delete the linked actor (default: true)

**Actions:**
- Removes army from kingdom records
- Frees settlement support slot if assigned
- If `deleteActor` is true: Deletes the linked NPC actor
- If `deleteActor` is false: Unlinks actor (keeps it)

### UI Layer (`src/view/kingdom/tabs/ArmiesTab.svelte`)

#### NPC Actor Column
Displays the linking status and actions:

**Unlinked State:**
- Shows "Not linked" with link icon
- Click link icon to open actor search
- Autosuggest dropdown filters NPC actors

**Linked State:**
- Shows "Open Sheet" button (opens actor sheet)
- Shows unlink icon button (unlinks without deleting)

**Linking Mode:**
- Search input with autosuggest
- Filters NPC actors in real-time
- Click actor name to link
- Cancel button to exit linking mode

#### Actions Column
- Disband button opens `DisbandArmyDialog`

### Dialog Components

#### `DisbandArmyDialog.svelte`
Enhanced dialog for disbanding armies with actor options.

**Features:**
- Shows army details (name, level, support status)
- Displays consequences (settlement slots freed, etc.)
- If linked actor exists:
  - Checkbox: "Also delete the linked NPC actor" (default: checked)
  - Dynamic hint based on checkbox state
- Warning message about action being irreversible

**Events:**
- `confirm`: Emits `{ deleteActor: boolean }`
- `cancel`: Closes dialog

### Hooks (`src/hooks/armyActorHooks.ts`)

#### `preDeleteActor` Hook
Intercepts NPC actor deletion attempts for linked actors.

**Dialog Options:**
1. **Unlink & Delete Actor (Keep Army)**: Unlinks actor, allows deletion
2. **Delete Army Too**: Deletes army, then allows actor deletion
3. **Cancel**: Prevents deletion

#### `deleteActor` Hook
Cleans up kingdom data after actor deletion (fallback safety).

**Actions:**
- Removes army from kingdom records
- Clears army from settlement support lists
- Shows notification about cleanup

## Data Model

### Army Record
```typescript
interface Army {
  id: string;
  name: string;
  level: number;
  actorId?: string;  // Linked NPC actor ID
  supportedBySettlementId?: string;
  turnsUnsupported: number;
  isSupported: boolean;
}
```

### Actor Flags
```typescript
actor.setFlag('pf2e-reignmaker', 'army-metadata', {
  armyId: string;
  linkedAt: number;  // Timestamp
});
```

## User Workflows

### Workflow 1: Link Existing Actor
1. Navigate to Armies tab
2. Find army without linked actor
3. Click link icon in NPC Actor column
4. Type to search for NPC actor
5. Click actor name to link
6. Success notification shown
7. "Open Sheet" button appears

### Workflow 2: Unlink Actor
1. Find army with linked actor
2. Click unlink icon (orange unlink symbol)
3. Actor is unlinked from army
4. Both army and actor persist
5. Success notification shown
6. UI shows "Not linked" state

### Workflow 3: Disband Army (Keep Actor)
1. Click disband button in Actions column
2. Dialog opens with army details
3. Uncheck "Also delete the linked NPC actor"
4. Click "Disband Army"
5. Army removed, actor kept and unlinked
6. Success notification shown

### Workflow 4: Disband Army (Delete Actor)
1. Click disband button in Actions column
2. Dialog opens with army details
3. Keep "Also delete the linked NPC actor" checked
4. Click "Disband Army"
5. Both army and actor deleted
6. Success notification shown

### Workflow 5: Delete Linked Actor
1. Try to delete NPC actor in Foundry
2. Dialog appears with options
3. Choose "Unlink & Delete Actor (Keep Army)"
4. Actor deleted, army persists
5. Army shows "Not linked" state

## Technical Notes

### Validation Rules
- Only NPC actors can be linked to armies
- One actor can only be linked to one army
- Linking syncs name and level from army to actor
- Actor metadata flag tracks the link

### Synchronization
- Name changes in army sync to linked actor
- Level changes in army sync to linked actor
- Actor changes do NOT sync back to army (one-way)

### Safety Features
- Pre-delete hooks prevent accidental data loss
- Fallback cleanup in post-delete hook
- User confirmation dialogs for destructive actions
- Clear visual indicators of link status

### Error Handling
- Service layer throws descriptive errors
- UI catches errors and shows notifications
- Logger tracks all operations
- Validation prevents invalid states

## Future Enhancements

Possible future improvements:
- Two-way sync (actor → army)
- Batch linking operations
- Import armies from actors
- Actor template selection
- Link history tracking
- Advanced actor filtering

## Related Files

**Service Layer:**
- `src/services/army/index.ts` - Main service interface
- `src/services/army/handlers.ts` - Handler implementations

**UI Components:**
- `src/view/kingdom/tabs/ArmiesTab.svelte` - Main armies UI
- `src/view/kingdom/components/DisbandArmyDialog.svelte` - Disband dialog

**Hooks:**
- `src/hooks/armyActorHooks.ts` - Actor deletion protection

**Models:**
- `src/models/Army.ts` - Army data structure
