# Test Plan for Incident Skill Rolls

## Changes Made

### 1. Enhanced SkillTag Component
The SkillTag component (`src/view/kingdom/components/SkillTag.svelte`) has been enhanced to handle direct skill checks:

**New Props Added:**
- `checkType: 'action' | 'incident' | 'event' | null` - Type of check being performed
- `checkName: string` - Name of the check (e.g., incident name)
- `checkId: string` - Unique identifier for the check
- `checkEffects: any` - Effects object with outcomes
- `onRollComplete: ((outcome: string) => void) | null` - Callback for roll completion

**Key Features:**
- Maintains backward compatibility with ActionCard (dispatches 'execute' event for actions)
- Directly performs skill checks for incidents/events using `performKingdomSkillCheck`
- Shows loading state during rolls
- Handles all error cases

### 2. Updated UnrestPhase Component
The UnrestPhase component (`src/view/kingdom/turnPhases/UnrestPhase.svelte`) now uses SkillTag components:

**Changes:**
- Replaced raw button elements with SkillTag components
- Added roll result handler initialization
- Added incident resolution tracking (`incidentResolved`, `rollOutcome`)
- Added visual resolution banner that shows outcome
- Properly passes incident data to SkillTag props

**Visual Improvements:**
- Skills displayed as proper tags with consistent styling
- Resolution banner shows outcome with color coding
- Loading spinners during skill rolls
- Disabled state after resolution

## Testing Instructions

### Test 1: Incident Skill Rolls
1. Navigate to the Unrest phase
2. Ensure kingdom has unrest > 0 (to trigger incident checks)
3. Click "Roll for Incident" button
4. When an incident appears, verify:
   - Skill options display as styled SkillTag components
   - Each skill shows name and description
5. Click any skill option and verify:
   - Character selection dialog appears (if no character assigned)
   - Skill roll is triggered in Foundry VTT
   - Loading spinner shows on the selected skill
   - Other skills become disabled during roll
6. After roll completes, verify:
   - Resolution banner appears showing the outcome
   - Banner is color-coded (green for success, orange for failure, red for critical failure)
   - All skill buttons are disabled
   - Incident is marked as checked

### Test 2: Action Card Backward Compatibility
1. Navigate to the Actions phase
2. Expand any action card
3. Click a skill tag to perform the action
4. Verify:
   - Skill roll triggers normally
   - No regression in functionality
   - Loading states work correctly
   - Resolution display works as before

### Test 3: Visual States
Verify SkillTag components show proper states:
- **Normal**: Default gray background, white text
- **Hover**: Slight lift, amber text color
- **Loading**: Spinning dice icon, reduced opacity
- **Selected**: Amber background (when skill is selected)
- **Disabled**: Reduced opacity, no hover effects

### Test 4: Edge Cases
1. **No Character Assigned**: Verify character selection dialog appears
2. **Multiple Incidents**: Roll for multiple incidents in sequence
3. **No Incident**: When roll results in no incident, verify proper display

## Code Quality Checklist

✅ **TypeScript Types**: All new props properly typed
✅ **Event System**: Existing 'execute' event preserved for backward compatibility
✅ **Error Handling**: Try-catch blocks for async operations
✅ **Loading States**: Proper loading indicators during async operations
✅ **Consistent Styling**: Uses existing CSS variables and design patterns
✅ **Reusability**: Component can be used for actions, incidents, and events
✅ **Maintainability**: Clear separation of concerns, well-commented code

## Benefits of This Implementation

1. **Consistency**: Same SkillTag component used everywhere for skill interactions
2. **Functionality**: Incident skill buttons now properly trigger Foundry rolls
3. **User Experience**: Clear visual feedback at every stage
4. **Maintainability**: Single source of truth for skill button logic
5. **Extensibility**: Easy to add event skill checks in the future

## Files Modified

1. `src/view/kingdom/components/SkillTag.svelte` - Enhanced with direct roll capability
2. `src/view/kingdom/turnPhases/UnrestPhase.svelte` - Updated to use SkillTag components

## No Breaking Changes

The implementation maintains full backward compatibility:
- ActionCard continues to work without modifications
- Existing 'execute' event dispatch is preserved
- No changes required to existing code that uses SkillTag
