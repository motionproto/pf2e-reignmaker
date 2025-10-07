# Action Implementation Roadmap

This document tracks the implementation of game effects for all player actions, organized by complexity tier and recommended implementation order.

**Legend:**
- ✅ **Implemented** - Game effect fully working
- ⏳ **Partial** - Some functionality exists (e.g., Build Structure has dialog but needs integration)
- ❌ **Not Implemented** - Only resource modifiers work, game effects missing

---

## Tier 1: Pure Data Changes (Easiest - Start Here)

These actions only modify kingdom data structures without requiring UI extensions or complex systems.

### Military - Basic Operations
- [x] **Recruit Unit** *(Recommended First)* ✅ **IMPLEMENTED**
  - Effect: Add army to `kingdom.armies[]` at party level
  - Dependencies: None
  - Notes: Critical success reduces unrest, critical failure increases it
  - Implementation: `GameEffectsResolver.recruitArmy()` + integrated in `ActionResolver`
  
- [ ] **Disband Army**
  - Effect: Remove army from `kingdom.armies[]`, refund resources
  - Dependencies: None
  - Notes: Returns some gold based on army value

### Settlements - Basic Operations
- [ ] **Establish Settlement** *(Recommended Second)*
  - Effect: Add village (Level 1) to `kingdom.settlements[]`
  - Dependencies: None
  - Notes: Critical success grants +1 free structure slot

---

## Tier 2: UI Selection Required (Moderate Complexity)

These actions need additional UI dialogs or selection interfaces.

### Territory Expansion
- [ ] **Claim Hexes** *(Build after Tier 1)*
  - Effect: Add hexes to `kingdom.hexes[]` (proficiency-scaled: 1-4 hexes)
  - Dependencies: **Hex selection UI** (choose adjacent hexes)
  - Notes: Critical success adds +1 bonus hex

- [ ] **Build Roads**
  - Effect: Mark hexes as connected by roads
  - Dependencies: **Hex selection UI** (choose path between hexes)
  - Notes: Critical success adds +1 bonus hex of roads

- [ ] **Fortify Hex**
  - Effect: Mark hex as fortified (defense bonus)
  - Dependencies: **Hex selection UI** (choose owned hex)
  - Notes: Defensive benefits during warfare

### Resource Extraction
- [ ] **Create Worksite**
  - Effect: Add worksite to hex (farm/mine/quarry/lumbermill)
  - Dependencies: **Hex selection UI** + **worksite type selector**
  - Notes: Critical success grants immediate resource of chosen type

### Construction & Urban Planning
- ⏳ **Build Structure** *(Already has dialog, needs integration)*
  - Effect: Queue construction project, add to `kingdom.buildQueue[]`
  - Dependencies: **BuildStructureDialog** (exists) + cost reduction on crit success
  - Notes: Critical success = 50% cost reduction

- [ ] **Repair Structure**
  - Effect: Restore damaged structure to full functionality
  - Dependencies: **Structure selection UI** (choose damaged structure)
  - Notes: Removes "damaged" status from structure

---

## Tier 3: Complex Systems (Hardest - Build Last)

These actions require new systems or significant architectural work.

### Settlements - Advanced Operations
- [ ] **Upgrade Settlement**
  - Effect: Increase settlement tier (village→town→city→metropolis)
  - Dependencies: **Settlement selector** + level/structure prerequisite checking
  - Notes: Critical success grants +1 free structure; complex tier validation
  - Prerequisites:
    - Village → Town: Level 2+ and 2+ Structures
    - Town → City: Level 5+ and 4+ Structures
    - City → Metropolis: Level 10+ and 6+ Structures

### Military - Advanced Operations
- [ ] **Train Army**
  - Effect: Increase army level (max: party level)
  - Dependencies: **Army selector** + level progression system
  - Notes: Critical success promotes to party level immediately

- [ ] **Deploy Army**
  - Effect: Move army to different hex/settlement
  - Dependencies: **Army selector** + **hex/settlement target selector**
  - Notes: May require warfare system integration

- [ ] **Outfit Army**
  - Effect: Improve army equipment/stats
  - Dependencies: **Army selector** + equipment/upgrade system
  - Notes: Permanent stat improvements

- [ ] **Recover Army**
  - Effect: Restore army hit points/condition
  - Dependencies: **Army selector** + army health system
  - Notes: Removes damage, restores combat readiness

### Diplomatic & Special Operations
- [ ] **Establish Diplomatic Relations**
  - Effect: Create diplomatic relationship with foreign nation
  - Dependencies: **Diplomacy system** + nation/faction data
  - Notes: Requires diplomatic reputation tracking

- [ ] **Request Economic Aid**
  - Effect: Receive resources from allied nation
  - Dependencies: **Diplomacy system** + relationship status
  - Notes: Based on diplomatic standing

- [ ] **Request Military Aid**
  - Effect: Receive military support from allied nation
  - Dependencies: **Diplomacy system** + temporary army system
  - Notes: Provides temporary military units

- [ ] **Infiltration**
  - Effect: Gather intelligence on target nation
  - Dependencies: **Espionage system** + target selector
  - Notes: May reveal hidden information or provide bonuses

- [ ] **Send Scouts**
  - Effect: Explore/reveal map areas or gather intelligence
  - Dependencies: **Exploration system** or **intelligence system**
  - Notes: May auto-reveal hexes or provide info bonuses

- [ ] **Arrest Dissidents**
  - Effect: Convert regular unrest to imprisoned unrest
  - Dependencies: **Justice structure** capacity checking
  - Notes: Already has GameEffectsService method `convertToImprisonedUnrest()`

- [ ] **Execute or Pardon Prisoners**
  - Effect: Remove imprisoned unrest (execute = +unrest, pardon = +fame)
  - Dependencies: None (pure data change, but categorized here due to complexity)
  - Notes: Critical outcomes affect fame/unrest differently

- [ ] **Hire Adventurers**
  - Effect: Auto-resolve event or provide bonus to event check
  - Dependencies: **Event system integration**
  - Notes: Interacts with Events phase

---

## Tier 4: Resource-Only Actions (Already Working)

These actions only have resource modifiers and no game effects. They already work through `GameEffectsService`.

- ✅ **Collect Stipend** - Gain gold based on leadership roles
- ✅ **Deal with Unrest** - Reduce unrest through civic actions
- ✅ **Harvest Resources** - Collect resources from worksites (may need worksite production calculation)
- ✅ **Purchase Resources** - Convert gold to other resources
- ✅ **Sell Surplus** - Convert resources to gold

---

## Implementation Strategy

### Phase 1: Foundation (Tier 1)
1. ✅ Create `GameEffectsResolver` service
2. Implement **Recruit Unit** (army creation)
3. Implement **Establish Settlement** (settlement creation)
4. Implement **Disband Army** (army removal)

### Phase 2: UI Extensions (Tier 2)
5. Build **Hex Selection UI** component
6. Implement **Claim Hexes** (territory expansion)
7. Implement **Build Roads** (infrastructure)
8. Implement **Create Worksite** (resource extraction)
9. Integrate **Build Structure** dialog with cost reduction

### Phase 3: Advanced Systems (Tier 3)
10. Implement **Upgrade Settlement** (settlement progression)
11. Implement **Train Army** (army progression)
12. Build **Diplomacy System** foundation
13. Implement diplomatic actions (Establish Relations, Request Aid)
14. Implement remaining military operations (Deploy, Outfit, Recover)
15. Implement special operations (Infiltration, Scouts)
16. Implement unrest management (Arrest Dissidents, Execute/Pardon)

### Phase 4: Polish & Integration
17. Add **Hire Adventurers** (event integration)
18. Test all actions end-to-end
19. Add validation and error handling
20. Document patterns and best practices

---

## Service Architecture

### GameEffectsResolver Structure
```typescript
// src/services/GameEffectsResolver.ts
export async function createGameEffectsResolver() {
  return {
    // Territory
    claimHexes(count, hexes): Promise<ResolveResult>
    buildRoads(hexes): Promise<ResolveResult>
    fortifyHex(hexId): Promise<ResolveResult>
    
    // Settlements
    foundSettlement(hexId, name): Promise<ResolveResult>
    upgradeSettlement(settlementId): Promise<ResolveResult>
    
    // Construction
    buildStructure(settlementId, structureId, costReduction?): Promise<ResolveResult>
    repairStructure(structureId): Promise<ResolveResult>
    createWorksite(hexId, worksiteType): Promise<ResolveResult>
    
    // Military
    recruitArmy(level): Promise<ResolveResult>
    trainArmy(armyId, levelIncrease): Promise<ResolveResult>
    deployArmy(armyId, targetHexId): Promise<ResolveResult>
    outfitArmy(armyId, equipmentUpgrades): Promise<ResolveResult>
    recoverArmy(armyId): Promise<ResolveResult>
    disbandArmy(armyId): Promise<ResolveResult>
    
    // Diplomatic
    establishDiplomaticRelations(nationId): Promise<ResolveResult>
    requestEconomicAid(nationId): Promise<ResolveResult>
    requestMilitaryAid(nationId): Promise<ResolveResult>
    
    // Special
    infiltration(targetNationId): Promise<ResolveResult>
    sendScouts(purpose): Promise<ResolveResult>
    arrestDissidents(): Promise<ResolveResult>
    executePrisoners(): Promise<ResolveResult>
    pardonPrisoners(): Promise<ResolveResult>
    hireAdventurers(eventId?): Promise<ResolveResult>
  };
}

interface ResolveResult {
  success: boolean;
  error?: string;
  data?: any; // Action-specific return data
}
```

### Integration Points
- **ActionPhaseController.executeAction()** calls `GameEffectsResolver` after resource modifiers
- **UI Components** call resolver methods with user selections
- All changes route through `updateKingdom()` → `KingdomActor`

---

## Next Steps

1. **Choose starting action** - Recommend **Recruit Unit** for first implementation
2. **Create GameEffectsResolver service** - Following the architecture above
3. **Implement chosen action** - Test end-to-end
4. **Iterate** - Move through tiers systematically

---

**Last Updated:** 2025-10-07
