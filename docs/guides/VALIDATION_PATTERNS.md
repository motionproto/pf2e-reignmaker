# Validation Patterns Guide

**Best practices for writing validation functions in action pipelines**

---

## Overview

Validation functions determine whether a user selection (hex, entity, etc.) is valid. Good validators provide **specific error messages** that help users understand WHY their selection was rejected.

## The Pattern

### ✅ CORRECT: Detailed Validation Result

```typescript
export function validateMyAction(hexId: string): { valid: boolean; message?: string } {
  const kingdom = get(kingdomData);
  const hex = getHex(hexId, kingdom);
  
  // Check 1: Hex exists
  if (!hex) {
    return { valid: false, message: 'Hex not found' };
  }
  
  // Check 2: Must be claimed
  if (!isHexClaimedByPlayer(hexId, kingdom)) {
    return { valid: false, message: 'This hex must be in claimed territory' };
  }
  
  // Check 3: At maximum level
  if (hex.level >= MAX_LEVEL) {
    return { 
      valid: false, 
      message: `Already at maximum level (${hex.levelName}), cannot be upgraded further` 
    };
  }
  
  // Check 4: Insufficient resources
  const missingResources = [];
  for (const [resource, amount] of Object.entries(cost)) {
    const available = kingdom.resources[resource] || 0;
    if (available < amount) {
      const resourceName = resource.charAt(0).toUpperCase() + resource.slice(1);
      missingResources.push(`${amount - available} more ${resourceName}`);
    }
  }
  
  if (missingResources.length > 0) {
    return { 
      valid: false, 
      message: `You need at least ${missingResources.join(' and ')} to ${actionName}` 
    };
  }
  
  // All checks passed
  return { valid: true };
}
```

### ❌ WRONG: Vague Boolean Return

```typescript
export function validateMyAction(hexId: string): boolean {
  const kingdom = get(kingdomData);
  const hex = getHex(hexId, kingdom);
  
  // User gets generic "Cannot select this hex" - no idea why!
  return hex && 
         hex.claimedBy === PLAYER_KINGDOM && 
         hex.level < MAX_LEVEL && 
         hasEnoughResources(kingdom, cost);
}
```

---

## Examples from Real Actions

### Example 1: Fortify Hex (Maximum Tier)

**Bad:**
```typescript
if (currentTier >= 4) {
  return false;  // Why can't I select this?
}
```

**Good:**
```typescript
if (currentTier >= 4) {
  const currentName = fortificationData.tiers[currentTier - 1]?.name || 'Fortress';
  return { 
    valid: false, 
    message: `Already a ${currentName}, cannot be upgraded further` 
  };
}
```

### Example 2: Fortify Hex (Insufficient Resources)

**Bad:**
```typescript
if (!hasEnoughResources()) {
  return false;  // Which resource am I missing?
}
```

**Good:**
```typescript
const missingResources = [];
for (const [resource, amount] of Object.entries(tierConfig.cost)) {
  const available = kingdom.resources[resource] || 0;
  if (available < amount) {
    const resourceName = resource.charAt(0).toUpperCase() + resource.slice(1);
    missingResources.push(`${amount - available} more ${resourceName}`);
  }
}

if (missingResources.length > 0) {
  const action = currentTier === 0 ? 'build' : 'upgrade to';
  const tierName = currentTier === 0 
    ? tierConfig.name 
    : `${currentTiers[currentTier - 1].name} to ${tierConfig.name}`;
    
  return { 
    valid: false, 
    message: `You need at least ${missingResources.join(' and ')} to ${action} ${tierName}` 
  };
}
```

### Example 3: Settlement Conflict

**Bad:**
```typescript
if (hasSettlement(hexId)) {
  return false;  // Why can't I fortify a settlement?
}
```

**Good:**
```typescript
const settlement = findSettlement(hexId, kingdom);
if (settlement) {
  return { 
    valid: false, 
    message: `Cannot fortify ${settlement.name} - settlements have their own defenses` 
  };
}
```

---

## Message Writing Guidelines

### 1. Be Specific

**Bad:** "Cannot select this hex"  
**Good:** "This hex must be in claimed territory"

**Bad:** "Insufficient resources"  
**Good:** "You need at least 2 more Lumber and 1 more Stone to build Wooden Tower"

### 2. Explain WHY, Not Just WHAT

**Bad:** "Already at maximum level"  
**Good:** "Already a Fortress, cannot be upgraded further"

**Bad:** "Invalid selection"  
**Good:** "Cannot build on hexes with rivers - choose a land hex"

### 3. Suggest What's Needed

**Bad:** "Not enough resources"  
**Good:** "You need at least 5 more Lumber to build this structure"

**Bad:** "Invalid tier"  
**Good:** "Upgrade to Town (Tier 2) before building this structure"

### 4. Use Context

Include entity names, tier names, resource amounts:

```typescript
// Include settlement name
`Cannot fortify ${settlement.name} - settlements have their own defenses`

// Include tier names  
`Already a ${currentTierName}, cannot be upgraded further`

// Include exact resource deficit
`You need at least ${deficit} more ${resourceName}`
```

---

## Template

Use this template for new validators:

```typescript
/**
 * Validate if [ACTION] can be performed
 * @param [SELECTION_ID] - The [ENTITY] ID to validate
 * @returns ValidationResult - { valid: boolean, message?: string }
 */
export function validate[ACTION]([SELECTION_ID]: string): { valid: boolean; message?: string } {
  const kingdom = get(kingdomData);
  
  // Check 1: Entity exists
  const [ENTITY] = get[ENTITY]([SELECTION_ID], kingdom);
  if (![ENTITY]) {
    return { valid: false, message: '[ENTITY] not found' };
  }
  
  // Check 2: [SPECIFIC REQUIREMENT]
  if ([CONDITION]) {
    return { 
      valid: false, 
      message: '[SPECIFIC REASON WHY INVALID]' 
    };
  }
  
  // Check 3: [RESOURCE REQUIREMENTS]
  const missingResources = [];
  for (const [resource, amount] of Object.entries([COST])) {
    const available = kingdom.resources[resource] || 0;
    if (available < amount) {
      const resourceName = resource.charAt(0).toUpperCase() + resource.slice(1);
      missingResources.push(`${amount - available} more ${resourceName}`);
    }
  }
  
  if (missingResources.length > 0) {
    return { 
      valid: false, 
      message: `You need at least ${missingResources.join(' and ')} to [ACTION_NAME]` 
    };
  }
  
  // All checks passed
  return { valid: true };
}
```

---

## Return Type Contract

**Always return:**
```typescript
{ valid: boolean; message?: string }
```

**Type definition:**
```typescript
interface ValidationResult {
  valid: boolean;
  message?: string;
}
```

**HexSelectorService expects this format:**
- If `valid: false`, displays `message` to user
- If `valid: true`, allows selection (no message needed)

---

## Integration with HexSelector

The hex-selector automatically displays validation messages:

```typescript
// In pipeline
postApplyInteractions: [{
  type: 'map-selection',
  validation: (hexId: string) => {
    return validateFortifyHexForPipeline(hexId);  // Returns ValidationResult
  }
}]

// HexSelector automatically shows result.message to user when valid: false
```

**No additional code needed** - just return the detailed message!

---

## Testing Your Validators

**Good validators provide helpful guidance:**

1. **Click invalid hex** → See specific error explaining why
2. **User understands rules** → Makes better selections
3. **Fewer support questions** → Users self-discover requirements

**Test each rejection case:**
- [ ] Max level → Shows what the max is
- [ ] Missing resources → Shows exact deficit
- [ ] Territory requirement → Explains need to claim first
- [ ] Conflict → Explains what's blocking it

---

## Migration Checklist

**Updating existing validators:**

1. Change return type from `boolean` to `{ valid: boolean; message?: string }`
2. Replace `return false` with `return { valid: false, message: '...' }`
3. Replace `return true` with `return { valid: true }`
4. Add specific error messages for each failure case
5. Test in Foundry - verify messages display correctly

---

## Summary

**Good validation messages should:**
- ✅ Explain WHY selection failed
- ✅ Include specific entity/tier/resource names
- ✅ Show exact resource deficits
- ✅ Suggest what's needed to proceed
- ✅ Use clear, non-technical language

**Avoid:**
- ❌ Generic "Invalid selection" messages
- ❌ Boolean-only returns with no explanation
- ❌ Technical jargon users won't understand
- ❌ Vague "not enough resources" without amounts

**Remember:** Your error message might be the only guidance the user gets - make it count!

---

**Last Updated:** 2025-11-18  
**Reference Implementation:** `src/pipelines/shared/fortifyHexValidator.ts`
