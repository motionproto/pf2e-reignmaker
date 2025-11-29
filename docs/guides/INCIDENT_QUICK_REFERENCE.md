# Incident Migration Quick Reference Card

**Quick lookup for common patterns during incident migration.**

---

## 🎯 Pattern Decision Tree

```
Does incident have...?
├─ Only static modifiers → Pattern 1 (15 min)
├─ Dice modifiers + manual effects → Pattern 2 (30 min)
├─ Game commands (no custom UI) → Pattern 3 (30-45 min)
├─ Player choice needed → Pattern 4 (1-2 hrs)
└─ Multiple game commands + complex logic → Pattern 5 (2-3 hrs)
```

---

## 📋 Template: Pattern 1 (Simple)

**Use for:** Crime Wave, Rising Tensions, Protests

```typescript
import { createIncidentPipeline } from '../shared/createIncidentPipeline';
import { applyPipelineModifiers } from '../shared/applyPipelineModifiers';

export const [NAME]Pipeline = createIncidentPipeline('[ID]', {
  requirements: () => ({ met: true }),

  preview: {
    calculate: (ctx) => {
      const resources = [];
      
      if (ctx.outcome === 'failure') {
        resources.push({ resource: 'unrest', value: 1 });
      }
      // ... other outcomes
      
      return { resources, outcomeBadges: [], warnings: [] };
    }
  },

  execute: async (ctx) => {
    await applyPipelineModifiers([NAME]Pipeline, ctx.outcome);
    return { success: true };
  }
});
```

---

## 🎲 Template: Pattern 2 (Dice)

**Use for:** Bandit Activity, any incident with dice rolls

```typescript
export const [NAME]Pipeline = createIncidentPipeline('[ID]', {
  requirements: () => ({ met: true }),

  preview: {
    calculate: (ctx) => {
      const outcomeBadges = [];
      
      if (ctx.outcome === 'criticalFailure') {
        outcomeBadges.push({
          icon: 'fa-coins',
          prefix: 'Lose',
          value: { type: 'dice', formula: '2d4' },
          suffix: 'Gold',
          variant: 'negative'
        });
      }
      
      return { resources: [], outcomeBadges, warnings: [] };
    }
  },

  execute: async (ctx) => {
    await applyPipelineModifiers([NAME]Pipeline, ctx.outcome);
    return { success: true };
  }
});
```

---

## ⚙️ Template: Pattern 3 (Game Commands)

**Use for:** Border Raid, Disease Outbreak

```typescript
import { executeGameCommands } from '../shared/GameCommandHelpers';

export const [NAME]Pipeline = createIncidentPipeline('[ID]', {
  requirements: () => ({ met: true }),

  preview: {
    calculate: (ctx) => ({
      resources: [],
      outcomeBadges: [],
      warnings: ctx.outcome === 'criticalFailure' 
        ? ['Settlement will be damaged'] 
        : []
    })
  },

  execute: async (ctx) => {
    // Apply modifiers first
    await applyPipelineModifiers([NAME]Pipeline, ctx.outcome);
    
    // Then execute game commands
    const outcome = ctx.outcomeLookup?.[ctx.outcome];
    if (outcome?.gameCommands) {
      await executeGameCommands(outcome.gameCommands);
    }
    
    return { success: true };
  }
});
```

---

## 🎨 Template: Pattern 4 (Custom Component)

**Use for:** Production Strike, Trade Embargo

```typescript
export const [NAME]Pipeline = createIncidentPipeline('[ID]', {
  requirements: () => ({ met: true }),

  postRollInteractions: [
    {
      type: 'configuration',
      id: '[componentId]',
      component: '[ComponentName]',
      condition: (ctx) => ctx.outcome === 'failure' || ctx.outcome === 'criticalFailure'
    }
  ],

  preview: {
    calculate: (ctx) => ({
      resources: [],
      outcomeBadges: [],
      warnings: ['Choose which resource to lose']
    })
  },

  execute: async (ctx) => {
    const customData = ctx.resolutionData?.customComponentData;
    const { selectedResource, amount } = customData || {};
    
    if (!selectedResource) {
      return { success: false, error: 'No selection made' };
    }
    
    await applyResourceChanges([
      { resource: selectedResource, amount: -amount }
    ], '[ID]');
    
    return { success: true };
  }
});
```

---

## 🔧 Common Snippets

### Preview with Resources
```typescript
preview: {
  calculate: (ctx) => {
    const resources = [];
    
    if (ctx.outcome === 'failure') {
      resources.push({ resource: 'unrest', value: 1 });
    }
    if (ctx.outcome === 'criticalFailure') {
      resources.push({ resource: 'unrest', value: 2 });
    }
    
    return { resources, outcomeBadges: [], warnings: [] };
  }
}
```

### Preview with Dice Badge
```typescript
preview: {
  calculate: (ctx) => {
    const outcomeBadges = [];
    
    if (ctx.outcome === 'criticalFailure') {
      outcomeBadges.push({
        icon: 'fa-coins',
        prefix: 'Lose',
        value: { type: 'dice', formula: '2d4' },
        suffix: 'Gold',
        variant: 'negative'
      });
    }
    
    return { resources: [], outcomeBadges, warnings: [] };
  }
}
```

### Execute with Game Commands
```typescript
execute: async (ctx) => {
  // Apply modifiers
  await applyPipelineModifiers(pipeline, ctx.outcome);
  
  // Execute game commands
  if (ctx.outcome === 'criticalFailure') {
    await executeGameCommands([
      { type: 'damageStructure', count: 1 },
      { type: 'removeBorderHexes', count: 2 }
    ]);
  }
  
  return { success: true };
}
```

### Custom Component Event
```svelte
<script>
  import { createEventDispatcher } from 'svelte';
  
  const dispatch = createEventDispatcher();
  
  function handleSelect(resource: string, amount: number) {
    dispatch('resolution', {
      isResolved: true,
      metadata: { selectedResource: resource, amount },
      modifiers: [
        { type: 'static', resource, value: -amount }
      ]
    });
  }
</script>
```

---

## 🚨 Common Errors

### ❌ Missing specialEffects Array
```typescript
// WRONG
preview: {
  calculate: (ctx) => ({
    resources: [{ resource: 'unrest', value: 1 }]
  })
}

// CORRECT
preview: {
  calculate: (ctx) => ({
    resources: [{ resource: 'unrest', value: 1 }],
    outcomeBadges: [],  // Required!
    warnings: []
  })
}
```

### ❌ Wrong Component Event
```typescript
// WRONG
dispatch('selection', { selectedResource: 'food' });

// CORRECT
dispatch('resolution', {
  isResolved: true,
  metadata: { selectedResource: 'food' },
  modifiers: []
});
```

### ❌ Wrong Interaction Timing
```typescript
// WRONG - shows as dialog after Apply
postApplyInteractions: [...]

// CORRECT - shows inline before Apply
postRollInteractions: [...]
```

### ❌ Double Applying Modifiers
```typescript
// WRONG - applies twice!
execute: async (ctx) => {
  await applyPipelineModifiers(pipeline, ctx.outcome);  // ← Once
  await updateKingdom(k => k.unrest += 1);  // ← Twice!
}

// CORRECT - only apply once
execute: async (ctx) => {
  await applyPipelineModifiers(pipeline, ctx.outcome);
  return { success: true };
}
```

---

## 📦 Import Cheatsheet

```typescript
// Always needed
import { createIncidentPipeline } from '../shared/createIncidentPipeline';
import { applyPipelineModifiers } from '../shared/applyPipelineModifiers';

// For game commands
import { executeGameCommands } from '../shared/GameCommandHelpers';

// For custom resource changes
import { applyResourceChanges } from '../shared/InlineActionHelpers';

// For kingdom data access
import { getKingdomData } from '../../stores/KingdomStore';
```

---

## 📝 Testing One-Liner

```javascript
// In browser console
const { UnifiedCheckHandler } = await import('./src/controllers/shared/UnifiedCheckHandler');
const handler = new UnifiedCheckHandler();
await handler.executeCheck('crime-wave', 'incident', { outcome: 'criticalFailure' });
```

---

## 🎯 Icons Reference

```typescript
// Common resource icons
'fa-coins'       // Gold
'fa-apple-alt'   // Food
'fa-tree'        // Lumber
'fa-cube'        // Stone
'fa-gem'         // Ore
'fa-fist-raised' // Unrest
'fa-star'        // Fame
'fa-map'         // Hexes
'fa-home'        // Settlement
'fa-shield-alt'  // Army
```

---

## 🔗 Quick Links

- [Full Migration Guide](./INCIDENT_MIGRATION_GUIDE.md)
- [Custom UI Guide](./CUSTOM_UI_ACTION_GUIDE.md)
- [Pipeline Coordinator](../systems/pipeline-coordinator.md)
- [Game Commands System](../systems/game-commands-system.md)

---

**Time estimates:**
- Pattern 1 (Simple): ~15 minutes
- Pattern 2 (Dice): ~30 minutes
- Pattern 3 (Commands): ~30-45 minutes
- Pattern 4 (Custom): ~1-2 hours
- Pattern 5 (Complex): ~2-3 hours

**Remember:** Always include `outcomeBadges: []` in preview.calculate!

