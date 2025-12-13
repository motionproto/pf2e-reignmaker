# Event Effects Reference

A complete list of all possible effects that can be applied by events.

---

## Kingdom Resources

| Effect | Format | Example | Notes |
|--------|--------|---------|-------|
| **Gain Gold** | `+X Gold` or `+XdY Gold` | `+1d3 Gold` | Added to kingdom treasury |
| **Lose Gold** | `-X Gold` or `-XdY Gold` | `-2d3 Gold` | Deducted from treasury |
| **Gain Food** | `+X Food` or `+XdY Food` | `+1d4 Food` | Added to stockpile |
| **Lose Food** | `-X Food` | `-1 Food` | Deducted from stockpile |
| **Gain Lumber** | `+X Lumber` or `+XdY Lumber` | `+2d4 Lumber` | Added to stockpile |
| **Gain Stone** | `+X Stone` | `+1d4 Stone` | Added to stockpile |
| **Gain Ore** | `+X Ore` | `+1d3 Ore` | Added to stockpile |
| **Gain Materials** | `+XdY Materials` | `+1d4 Lumber/Stone` | Random material type |
| **Ongoing Gold** | `+Ongoing Gold` | `+1 Gold/turn for 3 turns` | Uses `activeModifiers[]` |

---

## Unrest

| Effect | Format | Example | Notes |
|--------|--------|---------|-------|
| **Reduce Unrest** | `-X Unrest` or `-XdY Unrest` | `-1d3 Unrest` | Direct reduction |
| **Gain Unrest** | `+X Unrest` or `+XdY Unrest` | `+1d3 Unrest` | Direct increase |
| **Ongoing Unrest** | `+Ongoing Unrest` | `+1 Unrest/turn for 3 turns` | Uses `activeModifiers[]` |

---

## Fame / Infamy

| Effect | Format | Example | Notes |
|--------|--------|---------|-------|
| **Gain Fame** | `+X Fame` | `+1 Fame` | Increases reputation |
| **Lose Fame** | `-X Fame` | `-1 Fame` | Decreases reputation |
| **Gain Infamy** | `+X Infamy` | `+1 Infamy` | Used rarely |

---

## Prison System (Imprisoned Unrest)

| Effect | Format | Handler | Notes |
|--------|--------|---------|-------|
| **Convert Unrest** | `Convert XdY` | `ConvertUnrestToImprisonedHandler` | Reduces unrest by X, adds X to imprisoned |
| **Pardon Prisoners** | `Pardon XdY` | `ReduceImprisonedHandler` | Reduces imprisoned count (no unrest change) |
| **Release Prisoners** | `Release XdY` | `ReleaseImprisonedHandler` | Converts imprisoned back to unrest |
| **Imprison Innocents** | `+XdY innocents` | `AddImprisonedHandler` | Adds to imprisoned WITHOUT reducing unrest |

**Prison Terminology:**
- **Convert** = Make arrests (reduces unrest, creates imprisoned)
- **Pardon** = Free prisoners (reduces imprisoned, no unrest change)
- **Release** = Free prisoners who cause trouble (imprisoned → unrest)
- **Innocents** = False imprisonment (adds imprisoned without solving unrest)

---

## Structures

| Effect | Format | Handler | Notes |
|--------|--------|---------|-------|
| **Gain Structure** | `+1 Structure` | Direct addition | Adds random structure |
| **Damage Structure** | `Damage X structure(s)` | `DamageStructureHandler` | Marks structure as damaged |
| **Destroy Structure** | `Destroy X structure(s)` | `DestroyStructureHandler` | Removes structure entirely |

---

## Settlements

| Effect | Format | Handler | Notes |
|--------|--------|---------|-------|
| **Found Settlement** | `Found settlement` | `FoundSettlementHandler` | Creates new settlement |
| **Increase Settlement Level** | `+1 Level` | `IncreaseSettlementLevelHandler` | Upgrades settlement |
| **Reduce Settlement Level** | `-1 Level` | `ReduceSettlementLevelHandler` | Downgrades settlement |
| **Transfer Settlement** | `Transfer to enemy` | `TransferSettlementHandler` | Enemy takes control |

---

## Territory (Hexes)

| Effect | Format | Handler | Notes |
|--------|--------|---------|-------|
| **Claim Hex** | `Claim 1 hex` | `claimHexesExecution` | Add hex to kingdom |
| **Lose Border Hexes** | `Lose X border hexes` | `RemoveBorderHexesHandler` | Removes border hexes |
| **Enemy Seizes Hexes** | `Enemy seizes X hexes` | `SeizeHexesHandler` | Enemy faction takes hexes |
| **Create Worksite** | `Create worksite` | `createWorksiteExecution` | Adds lumber/mine/quarry |
| **Destroy Worksite** | `Destroy worksite` | `DestroyWorksiteHandler` | Removes worksite |
| **Lose Worksite** | `Lose Worksite` | `DestroyWorksiteHandler` | Same as destroy |

---

## Factions

| Effect | Format | Handler | Notes |
|--------|--------|---------|-------|
| **Faction +X** | `Faction +1` | `AdjustFactionHandler` | Improve faction attitude |
| **Faction -X** | `Faction -1` | `AdjustFactionHandler` | Damage faction attitude |
| **Specific Faction** | `{FactionName} +1` | `AdjustFactionHandler` | Named faction change |
| **Random Faction** | `Random faction -1` | `AdjustFactionHandler` | Random faction affected |

**Faction Attitude Levels:** Hostile → Unfriendly → Indifferent → Friendly → Allied

---

## Armies

| Effect | Format | Handler/Function | Notes |
|--------|--------|------------------|-------|
| **Recruit Army** | `Recruit army` | `RecruitArmyHandler` | Creates new army |
| **Disband Army** | `Disband army` | `disbandArmyExecution` | Removes army |
| **Train Army** | `Army trained` | `trainArmyExecution` | Levels up army |
| **Deploy Army** | `Deploy army` | `DeployArmyHandler` | Move army on map |
| **Equip Army** | `Army receives equipment` | `OutfitArmyHandler` | Adds armor/weapons/etc |
| **Defect Armies** | `Armies defect` | `DefectArmiesHandler` | Armies switch sides |
| **Spawn Enemy Army** | `Enemy army spawns` | `SpawnEnemyArmyHandler` | Creates hostile army |

### Army Conditions

| Condition | Effect | Notes |
|-----------|--------|-------|
| **Enfeebled X** | Weakened | Physical penalties |
| **Fatigued** | Tired | Reduced effectiveness |
| **Frightened X** | Fear | Mental penalties |
| **Sickened X** | Ill | Various penalties |
| **Clumsy X** | Impaired | Dexterity penalties |
| **Well Trained** | Bonus | +1 to saving throws |
| **Poorly Trained** | Penalty | -1 to saving throws |

---

## Actions

| Effect | Format | Handler | Notes |
|--------|--------|---------|-------|
| **Spend Action** | `Costs 1 action` | `SpendPlayerActionHandler` | Consumes player action |

---

## Ongoing Effects (Multi-Turn)

Ongoing effects use `kingdom.activeModifiers[]` and persist across turns.

```typescript
// Example: +1 Gold per turn for 3 turns
kingdom.activeModifiers.push({
  id: 'trade-bonus-uuid',
  source: 'Trade Agreement',
  sourceType: 'custom',
  effects: [{
    stat: 'goldPerTurn',
    value: 1,
    duration: 3
  }]
});
```

| Effect | Format | Notes |
|--------|--------|-------|
| **Ongoing Gold** | `+X Gold/turn for Y turns` | Regular income |
| **Ongoing Unrest** | `+X Unrest/turn for Y turns` | Recurring unrest |
| **Ongoing Resource** | `+X Resource/turn for Y turns` | Any resource |

---

## Badge Types for Display

| Badge Type | Function | Example |
|------------|----------|---------|
| **Static Value** | `valueBadge(template, icon, amount, variant)` | `valueBadge('Gain {{value}} Fame', 'fas fa-star', 1, 'positive')` |
| **Dice Roll** | `diceBadge(template, icon, formula, variant)` | `diceBadge('Reduce Unrest by {{value}}', 'fas fa-shield-alt', '1d3', 'positive')` |
| **Text Only** | `textBadge(message, icon, variant)` | `textBadge('Army becomes Well Trained', 'fas fa-star', 'positive')` |

**Variants:** `positive` (green), `negative` (red), `info` (blue), `default` (gray)

---

## Common Dice Formulas

| Size | Formula | Average | Use For |
|------|---------|---------|---------|
| Small | `1` | 1 | Minor effects |
| Small Random | `1d2` | 1.5 | Minor variable |
| Medium | `1d3` | 2 | Standard effects |
| Large | `1d4` | 2.5 | Major effects |
| Very Large | `2d3` | 4 | Critical success rewards |
| Huge | `2d4` | 5 | Major resource gains |
| Massive | `3d3` | 6 | Exceptional outcomes |

---

## Common Outcome Patterns

### Virtuous Approaches
- Best fame gains (+1 Fame on CS)
- Moderate unrest reduction
- Often costs gold (investment)
- Safest failure outcomes

### Practical Approaches
- Best gold/resource gains
- Moderate unrest effects
- Balanced risk/reward
- Sometimes faction benefits

### Ruthless Approaches
- Best unrest control (via conversion/imprisonment)
- Creates prison management burden
- Fame loss risk on failures
- Harshest critical failures (innocent imprisonment, structure damage)

