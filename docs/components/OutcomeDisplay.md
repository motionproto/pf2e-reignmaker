# OutcomeDisplay Component Architecture

**Location:** `src/view/kingdom/components/OutcomeDisplay/OutcomeDisplay.svelte`

**Purpose:** Universal outcome renderer for Actions, Events, and Incidents

---

## Automatic Component Inference Rules

This component automatically selects UI components based on modifier types. No need to specify components explicitly in pipelines - they're inferred!

**Modifier Type → Component Rendered**

| Modifier Type | Component | Behavior |
|--------------|-----------|----------|
| `{ type: 'dice', ... }` | DiceRoller.svelte | Interactive dice rolling |
| `{ type: 'choice', ... }` | ChoiceButtons.svelte or ResourceSelector.svelte | User selection |
| `{ type: 'static', ... }` | OutcomeBadges.svelte | Display only, no interaction |

---

## Custom Component Override

For unique UI needs, pipelines can specify a custom component:

### In Pipeline's preview.calculate()

```typescript
return {
  resources: [...],
  specialEffects: [...],
  customComponent: {
    name: 'MyUniqueComponent',  // Must be registered in COMPONENT_REGISTRY
    props: { ...data }
  }
};
```

### Example Usage

```typescript
// In executeOrPardonPrisoners.ts
preview: {
  calculate: async (ctx) => ({
    customComponent: {
      name: 'ExecuteOrPardonSelector',
      props: { imprisonedUnrest: getTotalImprisoned(ctx.kingdom) }
    }
  })
}

// Custom component provides resolution data
dispatch('resolution', {
  isResolved: true,
  metadata: { decision: 'execute' },
  modifiers: [{ resource: 'unrest', value: -3 }]
});

// Pipeline consumes the result in execute()
execute: async (ctx) => {
  const decision = ctx.resolutionData?.customComponentData?.decision;
}
```

---

## Component Registration

To add a new custom component:

1. Create component in: `src/view/kingdom/components/OutcomeDisplay/components/`
2. Register in `COMPONENT_REGISTRY` in OutcomeDisplay.svelte
3. Use in pipeline via `customComponent.name`

---

## Architecture Benefits

- ✅ **DRY:** ~87 pipelines share the same components
- ✅ **Maintainability:** One bug fix improves all actions
- ✅ **Flexibility:** Custom components available when needed
- ✅ **Clean separation:** Pipelines stay data-focused, no UI concerns

---

## Related Files

- **Modifier detection:** `src/services/resolution/DiceRollingService.ts`
- **Pipeline types:** `src/types/CheckPipeline.ts`
- **Custom component example:** `src/pipelines/actions/executeOrPardonPrisoners.ts`
