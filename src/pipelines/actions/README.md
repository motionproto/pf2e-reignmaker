# Action Definitions (Pipelines)

This folder contains **action definitions** - the actual game content that defines what each player action does.

## Purpose

This is the "game content" layer - each file defines one player action using the standardized 9-step pipeline pattern.

## What Lives Here

26 action pipeline files (one per action):
- `arrestDissidents.ts`
- `buildRoads.ts`
- `buildStructure.ts`
- `claimHexes.ts`
- `collectStipend.ts`
- `createWorksite.ts`
- `dealWithUnrest.ts`
- `deployArmy.ts`
- `diplomaticMission.ts`
- `disbandArmy.ts`
- `establishSettlement.ts`
- `executeOrPardonPrisoners.ts`
- `fortifyHex.ts`
- `harvestResources.ts`
- `infiltration.ts`
- `outfitArmy.ts`
- `purchaseResources.ts`
- `recoverArmy.ts`
- `recruitUnit.ts`
- `repairStructure.ts`
- `requestEconomicAid.ts`
- `requestMilitaryAid.ts`
- `sellSurplus.ts`
- `sendScouts.ts`
- `trainArmy.ts`
- `upgradeSettlement.ts`

## Pipeline Pattern (9 Steps)

Each action follows this structure:

```typescript
export const examplePipeline: CheckPipeline = {
  id: 'example-action',
  name: 'Example Action',
  
  // Step 1: Requirements Check (optional)
  requirements: (kingdom) => ({ met: true }),
  
  // Step 2: Pre-Roll Interactions (optional)
  preRollInteractions: [/* entity selections */],
  
  // Step 3: Execute Roll (always)
  skills: [{ skill: 'politics', description: 'convince the council' }],
  
  // Step 5: Outcome Interactions (optional)
  preview: { calculate: async (ctx) => ({ resources: [], outcomeBadges: [] }) },
  
  // Step 7: Post-Apply Interactions (optional)
  postApplyInteractions: [/* custom components */],
  
  // Step 8: Execute Action (always)
  execute: async (ctx) => {
    // Apply state changes
    await updateKingdom(kingdom => { /* changes */ });
    return { success: true };
  }
};
```

## Architecture

```
Action Pipelines (this folder) = WHAT each action does
Action Infrastructure (src/controllers/actions/) = HOW to run actions
```

Think of it like:
- **This folder** = JavaScript code (the content)
- **Controllers folder** = JavaScript engine (the runtime)

## Step Responsibilities

- **Step 4**: Display Outcome (OutcomePreviewService) - handled by infrastructure
- **Step 5**: Outcome Interactions (UnifiedCheckHandler) - defined in pipeline
- **Step 6**: Wait For Apply (Promise pattern) - handled by infrastructure
- **Step 7**: Post-Apply Interactions (UnifiedCheckHandler) - defined in pipeline
- **Step 8**: Execute Action (UnifiedCheckHandler) - defined in pipeline
- **Step 9**: Cleanup - handled by infrastructure

## See Also

- `src/services/PipelineCoordinator.ts` - Orchestrates the 9-step flow
- `src/pipelines/PipelineRegistry.ts` - Registers all pipelines
- `.clinerules/ARCHITECTURE_SUMMARY.md` - Section 8: Pipeline Architecture
