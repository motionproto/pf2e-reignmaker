# Action Pipeline Reference

**Status:** Production Ready - All patterns validated

---

## 📁 Files in This Directory

| File | Purpose |
|------|---------|
| **DEBUGGING_GUIDE.md** | ⭐ Common issues & fixes from real testing |
| **TESTING_GUIDE.md** | Detailed test workflows for each action type |
| **INCIDENT_PIPELINE_AUDIT.md** | Incident pipeline architecture analysis |

**Note:** PIPELINE_PATTERNS.md moved to `../systems/core/pipeline-patterns.md`

---

## 🚀 Quick Start

### Implementing a New Action?

1. **Find your pattern** in `../systems/core/pipeline-patterns.md`
2. **Copy the structure** from a similar action in `src/pipelines/actions/`
3. **Test in Foundry** - roll, apply, verify state changes

### Debugging an Issue?

1. Check `DEBUGGING_GUIDE.md` - solutions for common issues
2. Full browser refresh (Ctrl+Shift+R) - clears 80% of problems
3. Watch browser console for pipeline step logs

---

## 🏗️ Architecture Overview

All actions, events, and incidents flow through the same 9-step pipeline:

```
Step 1: Requirements Check          [optional]
Step 2: Pre-Roll Interactions       [optional]
Step 3: Execute Roll                [always]
Step 4: Display Outcome             [always]
Step 5: Outcome Interactions        [optional]
Step 6: Wait For Apply              [always]
Step 7: Post-Apply Interactions     [optional]
Step 8: Execute Action              [always]
Step 9: Cleanup                     [always]
```

**Complete architecture:** See `docs/systems/core/pipeline-coordinator.md`

---

## 📋 Pattern Quick Reference

| Pattern | Example Actions | When to Use |
|---------|-----------------|-------------|
| No Interactions | `dealWithUnrest`, `aidAnother` | Simple modifier application |
| Pre-Roll Entity | `executeOrPardonPrisoners`, `requestEconomicAid` | Need to select settlement/faction/army before roll |
| Post-Apply Hex | `claimHexes`, `buildRoads`, `fortifyHex` | Map selection after applying |
| Post-Roll Component | `harvestResources`, `sellSurplus` | User choice affects outcome (inline UI) |
| Post-Apply Component | `disbandArmy`, `trainArmy` | Complex configuration after apply |
| Pre + Post-Apply | `buildStructure`, `establishSettlement` | Entity selection + configuration |

**Full details:** See `../systems/core/pipeline-patterns.md`

---

## 🔗 Key Files

**Documentation:**
- `docs/systems/core/pipeline-coordinator.md` - Complete architecture design

**Implementation:**
- `src/services/PipelineCoordinator.ts` - Main coordinator
- `src/pipelines/actions/*.ts` - Individual action pipelines
- `src/pipelines/shared/` - Shared helper functions

---

## ⚠️ Common Pitfalls

1. **Stale instances** - Full browser refresh before testing
2. **Wrong data location** - Pre-roll data in `ctx.metadata`, post-apply in `ctx.resolutionData`
3. **Not handling cancellation** - Always check if user cancelled before accessing data
4. **Missing await** - All `updateKingdom()` calls must be awaited

**Full solutions:** See `DEBUGGING_GUIDE.md`

---

**Last Updated:** 2025-11-30
