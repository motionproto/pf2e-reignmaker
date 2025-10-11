# Purchase Resources

**ID:** `purchase-resources`  
**Category:** Economic & Resource Actions  
**Data File:** `data/player-actions/purchase-resources.json`

---

## Current Status

### ✅ What's Working
- Basic action structure
- Skill variety (5 skills: society, diplomacy, intimidation, deception, mercantile-lore)

### ⚠️ Issues Found
None - data looks correct

### ⏳ What Needs Implementation
- Multi-step transaction UI
- Exchange rate determination (1:1 on crit, 2:1 on success)
- Resource type selection
- Quantity input with gold limit
- Game effects for purchase

---

## Implementation Notes

**Game Effects:**
```json
{
  "type": "purchaseResources",
  "exchangeRate": 1 | 2,
  "resourceType": "player-choice",
  "quantity": "player-choice"
}
```

**UI Component:** `PurchaseResourcesUI.svelte` (multi-step)
- **Step 1:** Roll to establish exchange rate
- **Step 2:** Resource type selection
- **Step 3:** Quantity input (limited by available gold)
- **Step 4:** Confirm transaction

**Outcomes:**
- **Crit Success:** 1:1 exchange rate (1 gold per resource)
- **Success:** 2:1 exchange rate (2 gold per resource)
- **Failure:** No trade available this turn
- **Crit Failure:** Lose 1d4 gold

**Special:** This is a two-phase action - first roll determines rate, then player chooses type/quantity
