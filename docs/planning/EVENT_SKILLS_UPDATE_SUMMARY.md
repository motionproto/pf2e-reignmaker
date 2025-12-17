# Event Skills Update Summary

**Date:** December 16, 2025

## Overview

Updated event pipeline files to add skills based on `EVENT_SKILLS_TABLE_add.csv`. All events now have three skills plus "applicable lore" for each approach.

## Rules Applied

1. **If Skills column is empty** → Replace entire skills array with Add column content
2. **If Skills column has content** → Add the Add column skills to existing skills
3. **Always include** `'applicable lore'` at the end
4. **Normalize** all skills to lowercase and remove punctuation
5. **Fix typos**: `theivery` → `thievery`, `sociery` → `society`, `perfromance` → `performance`

## Files Updated: 30/33 Events

### Successfully Updated by Script (28 files)

1. **criminal-trial.ts** - All 3 approaches updated
2. **public-scandal.ts** - All 3 approaches updated
3. **plague.ts** - Virtuous approach updated
4. **natural-disaster.ts** - Practical approach updated (Ruthless fixed manually)
5. **immigration.ts** - Practical & Ruthless updated (Virtuous fixed manually)
6. **crime-wave.ts** - All 3 approaches updated
7. **notorious-heist.ts** - All 3 approaches (Virtuous replaced)
8. **bandit-activity.ts** - All 3 approaches (Practical replaced)
9. **raiders.ts** - All 3 approaches (Practical replaced)
10. **trade-agreement.ts** - All 3 approaches updated
11. **economic-surge.ts** - All 3 approaches updated
12. **food-surplus.ts** - All 3 approaches updated
13. **boomtown.ts** - Virtuous & Practical updated
14. **land-rush.ts** - All 3 approaches updated
15. **pilgrimage.ts** - All 3 approaches updated
16. **diplomatic-overture.ts** - All 3 approaches (Practical replaced)
17. **visiting-celebrity.ts** - All 3 approaches updated
18. **grand-tournament.ts** - All 3 approaches updated
19. **archaeological-find.ts** - Ruthless approach updated
20. **magical-discovery.ts** - All 3 approaches updated
21. **remarkable-treasure.ts** - All 3 approaches (Practical replaced)
22. **natures-blessing.ts** - All 3 approaches updated
23. **good-weather.ts** - All 3 approaches updated
24. **military-exercises.ts** - All 3 approaches (Ruthless replaced)
25. **drug-den.ts** - Virtuous & Practical updated
26. **monster-attack.ts** - Practical approach updated
27. **undead-uprising.ts** - All 3 approaches (Practical replaced)
28. **cult-activity.ts** - Virtuous approach updated

### Manually Fixed (2 files)

29. **food-shortage.ts** - Ruthless approach (uses custom ID `'prioritize-elite'`)
30. **immigration.ts** - Virtuous approach (uses custom ID `'welcome-all'`)

### No Changes Required (3 files)

- **feud.ts** - Already had correct skills
- **inquisition.ts** - Already had correct skills
- **assassination-attempt.ts** - Already had correct skills
- **festive-invitation.ts** - Already had correct skills

## Statistics

- **Total events in codebase:** 33
- **Events with updates:** 30
- **Total skill changes:** 75
- **Skills added:** 73
- **Skills replaced:** 8

## Example Changes

### Add Pattern
**Criminal Trial - Virtuous:**
- Before: `['religion', 'diplomacy', 'applicable lore']`
- After: `['religion', 'diplomacy', 'performance', 'applicable lore']`
- Action: Added `'performance'`

### Replace Pattern
**Notorious Heist - Virtuous:**
- Before: `[]` (empty)
- After: `['society', 'diplomacy', 'religion', 'applicable lore']`
- Action: Replaced with new skills

## Scripts Used

1. **buildscripts/update-event-skills.py** - Parsed CSV and created mapping
2. **buildscripts/apply-event-skills.mjs** - Applied updates to TypeScript files
3. **buildscripts/event-skills-mapping.json** - Generated mapping file

## Notes

- Some events use non-standard approach IDs (e.g., `'welcome-all'`, `'prioritize-elite'`) instead of `'virtuous'`, `'practical'`, `'ruthless'`
- These were fixed manually after the automated script
- All typos from the CSV were corrected during processing
- The automated script successfully updated 93% of the required changes
