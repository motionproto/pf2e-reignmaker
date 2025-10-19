# Structures Data Model - Hierarchical Approach

## Overview
The structures data system uses a **hierarchical format** in source files and combined JSON, with **runtime flattening** in the StructuresService. This preserves the original data structure while providing convenient flat arrays to components.

## Architecture

### 1. Source Files (data/structures/*.json)
Each file contains a **family** of 4 related structures (tiers 1-4):
```json
{
  "type": "support",
  "family": "Diplomacy",
  "description": "International relations and alliances",
  "skills": ["Society", "Diplomacy"],
  "tiers": [
    {
      "id": "envoys-office",
      "name": "Envoy's Office",
      "cost": { "stone": 2 },
      "modifiers": [...]
    },
    {
      "id": "embassy",
      "name": "Embassy",
      "cost": { "lumber": 2, "stone": 2 },
      "modifiers": [...]
    },
    ...
  ]
}
```

### 2. Build Script (buildscripts/combine-structures.py)
**Preserves the hierarchical structure** - does NOT flatten:
```python
# Minimal transformation
data['category'] = derive_category_from_filename(filename)
families.append(data)

# Output: dist/structures.json
{
  "families": [
    { "type": "...", "family": "...", "category": "...", "tiers": [...] },
    ...
  ]
}
```

**Key principle:** Only adds the `category` field (derived from filename). All other metadata remains in the original structure.

### 3. Combined Output (dist/structures.json)
Hierarchical format with families array:
```json
{
  "families": [
    {
      "type": "support",
      "family": "Diplomacy",
      "category": "diplomacy",
      "description": "...",
      "tiers": [...]
    }
  ]
}
```

### 4. StructuresService (Runtime)
**Flattens on load** and derives metadata from family context:

```typescript
// Load hierarchical data
for (const family of data.families) {
  let previousStructureId = null;
  
  for (let tierIndex = 0; tierIndex < family.tiers.length; tierIndex++) {
    const structureData = family.tiers[tierIndex];
    
    // Derive metadata from family context
    structureData.type = family.type;
    structureData.category = family.category;
    structureData.tier = tierIndex + 1;
    structureData.upgradeFrom = previousStructureId;
    structureData.traits = [
      'building',
      `${family.type}-structure`,
      `tier-${tierIndex + 1}`
    ];
    
    // Parse and store
    const structure = parseStructureFromJSON(structureData);
    this.structures.set(structure.id, structure);
    
    previousStructureId = structure.id;
  }
}
```

**Result:** Internal `Map<string, Structure>` with complete metadata, derived at runtime.

### 5. Component API
Components access flat arrays via service methods:
```typescript
// All return Structure[] with complete metadata
structuresService.getAllStructures()
structuresService.getStructuresByCategory(category)
structuresService.getStructuresByType()  // {skill: [], support: []}
```

## Data Flow

```
Source Files (hierarchical)
    ↓
Build Script (preserves hierarchy, adds category)
    ↓
dist/structures.json (hierarchical)
    ↓
StructuresService.initializeStructures() (derives metadata, flattens)
    ↓
Internal Map<id, Structure> (flat, complete metadata)
    ↓
getAllStructures() → Structure[] (flat arrays)
    ↓
Components (consume flat arrays)
```

## Metadata Derivation

All metadata is derived at **runtime** from the hierarchical structure:

| Field | Source | Derivation |
|-------|--------|------------|
| `type` | Family | Direct from `family.type` |
| `category` | Build script | Filename → kebab-case |
| `tier` | Position | Array index (0-3 → 1-4) |
| `upgradeFrom` | Sequence | Previous structure ID in array |
| `traits` | Computed | Generated from type + tier |

**No metadata duplication in JSON files.**

## Key Benefits

1. **Source data stays pure** - No build-time metadata injection
2. **Single source of truth** - Metadata derived from structure, not duplicated
3. **Clear separation** - Storage (hierarchical) vs API (flat)
4. **Easy maintenance** - Update source files, rebuild, done
5. **Type safety** - TypeScript interfaces enforce structure

## Files Changed

### Build System
- ✅ `buildscripts/combine-structures.py` - Preserve hierarchy, add category
- ✅ `dist/structures.json` - Hierarchical families format

### Runtime System  
- ✅ `src/models/Structure.ts` - Updated StructureFamily interface
- ✅ `src/services/structures/index.ts` - Runtime flattening and metadata derivation

### Components
- ✅ `src/view/kingdom/components/structures/StructureCard.svelte` - Handle missing constructionCost

No other component changes needed - they continue using flat Structure[] arrays.

## Verification

```bash
# Rebuild structures.json
python3 buildscripts/combine-structures.py

# Expected output
✅ Successfully combined 17 structure families
Total structures: 68
  skill: 36 structures
  support: 32 structures
```

## Future Work

This approach makes it easy to:
- Add new structure families (just add JSON file)
- Modify existing structures (edit source file, rebuild)
- Add new metadata fields (derive in StructuresService)
- Support alternative data formats (change service loader only)

The hierarchical format is the **single source of truth**, and all derived views flow from it.
