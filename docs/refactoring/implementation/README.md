# Phase 1 Implementation Files

**Ready-to-use TypeScript files for the Unified Check Resolution System**

---

## Quick Start

### Step 1: Copy Type Files

Copy these files to `src/types/`:

```bash
cp docs/refactoring/implementation/types/CheckPipeline.ts src/types/
cp docs/refactoring/implementation/types/CheckContext.ts src/types/
cp docs/refactoring/implementation/types/PreviewData.ts src/types/
```

### Step 2: Copy Service File

Copy this file to `src/services/`:

```bash
cp docs/refactoring/implementation/services/UnifiedCheckHandler.ts src/services/
```

### Step 3: Test Compilation

```bash
npm run build
```

All files should compile without errors.

---

## Files Overview

### Type Files (~200 lines total)

**CheckPipeline.ts** - Core pipeline configuration types
- `CheckPipeline` - Complete action/event/incident definition
- `CheckType` - 'action' | 'event' | 'incident'
- `Interaction` - Pre/post-roll interaction configs
- `Outcome` - Outcome definitions with modifiers

**CheckContext.ts** - Runtime data structures
- `CheckContext` - Single object passed through pipeline
- `ResolutionData` - Post-roll interaction results
- `CheckMetadata` - Pre-roll interaction results

**PreviewData.ts** - Preview calculation results
- `PreviewData` - Structured preview data
- `SpecialEffect` - Formatted preview badges
- `ResourceChange` - Resource modifications
- `EntityOperation` - Entity create/modify/delete

### Service File (~400 lines)

**UnifiedCheckHandler.ts** - Main orchestrator
- `registerCheck()` - Register pipeline configs
- `executePreRollInteractions()` - Handle pre-roll dialogs
- `executeSkillCheck()` - Execute PF2e roll
- `calculatePreview()` - Calculate outcome preview
- `executeCheck()` - Apply state changes

**TODO markers indicate delegation points** to existing systems.

---

## Integration Points

The handler integrates with existing systems at these points:

### 1. Dialog Systems (Pre-Roll)
```typescript
// TODO in executeEntitySelection()
// Delegate to:
// - SettlementSelectionDialog
// - FactionSelectionDialog
// - ArmySelectionDialog
// - StructureSelectionDialog
```

### 2. Roll Execution (Skill Check)
```typescript
// TODO in executeSkillCheck()
// Delegate to ActionExecutionHelpers.executeActionRoll()
```

### 3. Map Interaction (Pre-Roll)
```typescript
// TODO in executeMapSelection()
// Delegate to HexSelectorService
```

### 4. State Updates (Execution)
```typescript
// TODO in applyResourceChanges()
// Delegate to GameCommandsService or updateKingdom()
```

### 5. Game Commands (Execution)
```typescript
// TODO in executeGameCommands()
// Delegate to game command functions
```

---

## Example Usage

### Register an Action

```typescript
import { unifiedCheckHandler } from './services/UnifiedCheckHandler';

unifiedCheckHandler.registerCheck('deal-with-unrest', {
  id: 'deal-with-unrest',
  name: 'Deal with Unrest',
  description: 'Reduce kingdom unrest',
  checkType: 'action',
  category: 'uphold-stability',
  
  skills: [
    { skill: 'diplomacy', description: 'diplomatic engagement' }
  ],
  
  outcomes: {
    success: {
      description: 'The People Listen',
      modifiers: [
        { type: 'static', resource: 'unrest', value: -2, duration: 'immediate' }
      ]
    }
  },
  
  preview: {
    calculate: (context) => ({
      resources: [{ resource: 'unrest', value: -2 }],
      entities: [],
      specialEffects: [],
      warnings: []
    }),
    format: (preview) => [
      { type: 'resource', message: 'Will reduce unrest by 2', variant: 'positive' }
    ]
  }
});
```

### Use in Controller

```typescript
import { unifiedCheckHandler } from '../services/UnifiedCheckHandler';

export async function createActionPhaseController() {
  return {
    async executeAction(actionId: string, skill: string) {
      // Check for pre-roll interactions
      if (unifiedCheckHandler.needsPreRollInteraction(actionId)) {
        const metadata = await unifiedCheckHandler.executePreRollInteractions(
          actionId,
          kingdom
        );
      }
      
      // Execute skill check
      const instanceId = await unifiedCheckHandler.executeSkillCheck(
        actionId,
        skill,
        metadata
      );
      
      // Post-roll handling happens in OutcomeDisplay component
    }
  };
}
```

---

## Testing

### Unit Test Example

```typescript
import { UnifiedCheckHandler } from './services/UnifiedCheckHandler';

describe('UnifiedCheckHandler', () => {
  let handler: UnifiedCheckHandler;
  
  beforeEach(() => {
    handler = new UnifiedCheckHandler();
  });
  
  test('registers a check pipeline', () => {
    const pipeline = {
      id: 'test-action',
      name: 'Test Action',
      description: 'Test',
      checkType: 'action' as const,
      skills: [{ skill: 'diplomacy', description: 'test' }],
      outcomes: {},
      preview: {}
    };
    
    handler.registerCheck('test-action', pipeline);
    
    expect(handler.getCheck('test-action')).toEqual(pipeline);
  });
  
  test('detects pre-roll interactions', () => {
    const pipeline = {
      id: 'test',
      name: 'Test',
      description: 'Test',
      checkType: 'action' as const,
      skills: [{ skill: 'diplomacy', description: 'test' }],
      preRollInteractions: [
        { type: 'entity-selection' as const, entityType: 'settlement' as const }
      ],
      outcomes: {},
      preview: {}
    };
    
    handler.registerCheck('test', pipeline);
    
    expect(handler.needsPreRollInteraction('test')).toBe(true);
  });
});
```

---

## Implementation Progress

### Phase 1: Foundation
- [x] Create type files
- [x] Create handler service
- [ ] Implement TODO delegation points
- [ ] Write unit tests
- [ ] Test with 1 simple action

### Phase 2: Game Commands
- [ ] Extract game command functions
- [ ] Implement delegation in handler
- [ ] Test all commands

### Phase 3: Action Conversions
- [ ] Convert all 26 actions to pipelines
- [ ] Test each conversion
- [ ] Remove old implementations

---

## Notes

- All import paths assume standard `src/` structure
- Files use ES6 module syntax (not CommonJS)
- All types are fully defined (no `any` except where necessary)
- TODO comments mark incomplete delegation points
- Ready for immediate use with ~20% implementation remaining
