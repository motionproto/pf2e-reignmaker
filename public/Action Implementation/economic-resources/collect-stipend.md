# Collect Stipend

**ID:** `collect-stipend`  
**Category:** Economic & Resource Actions  
**Data File:** `data/player-actions/collect-stipend.json`

---

## Current Status

### ✅ What's Working
- Basic action structure
- Skill variety (7 skills: intimidation, deception, diplomacy, society, performance, acrobatics, thievery)

### ⚠️ Issues Found
None - data looks correct

### ⏳ What Needs Implementation
- Settlement selection (must have Counting House T2+)
- Income table lookup (settlement level + taxation tier)
- Personal gold distribution
- Game effects for stipend collection

---

## Implementation Notes

**Game Effects:**
```json
{
  "type": "collectStipend",
  "targetSettlement": "settlement-id",
  "baseAmount": "calculated",
  "outcomeModifier": "double" | "full" | "half" | "none"
}
```

**Income Calculation:**
Based on settlement level AND highest taxation tier structure:
- T2 (Counting House): Base amounts
- T3 (Tax Collector): 2x base
- T4 (Revenue Service): 4x base

**UI Component:** Settlement selection + income display

**Outcomes:**
- **Crit Success:** Double the listed amount
- **Success:** Gain listed amount
- **Failure:** Half amount, +1 unrest
- **Crit Failure:** Nothing, +1d4 unrest

**Requirements:** Settlement with Counting House T2+ structure
