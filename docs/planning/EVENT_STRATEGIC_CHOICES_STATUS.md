# Event Strategic Choices - Implementation Status

## Summary

After reviewing the event pipeline implementations and the EVENT_BALANCE_TABLE.csv, here's the current status of strategic choice implementation across all events.

## Completed Actions

1. ✅ **Removed scholarly-discovery.ts** - Event removed as requested
2. ✅ **Resolved naming conflict** - Renamed incident `crime-wave` to `criminal-activity` to avoid conflict with the `crime-wave` event
3. ✅ **Updated PipelineRegistry** - Removed scholarly-discovery and updated criminal-activity references

## Strategic Choice Implementation Status

### Events WITH Strategic Choices (32 events) ✅

All of these events have the full `strategicChoice` configuration with 3 approaches (Virtuous, Practical, Ruthless):

1. Archaeological Find
2. Assassination Attempt
3. Bandit Activity
4. Boomtown
5. Crime Wave
6. Criminal Trial
7. Cult Activity
8. Diplomatic Overture
9. Drug Den
10. Economic Surge
11. Festive Invitation
12. Feud
13. Food Shortage
14. Food Surplus
15. Good Weather
16. Grand Tournament
17. Immigration
18. Inquisition
19. Land Rush
20. Magical Discovery
21. Monster Attack
22. Natural Disaster
23. Nature's Blessing
24. Notorious Heist
25. Pilgrimage
26. Plague
27. Public Scandal
28. Raiders
29. Remarkable Treasure
30. Trade Agreement
31. Undead Uprising
32. Visiting Celebrity

### Events WITHOUT Strategic Choices (4 events)

#### Excluded by Design (2 events) ❌
These events should NOT have strategic choices as per your requirements:

1. **Demand Expansion** (`demand-expansion.ts`)
   - Reason: Automatic hex selection mechanic
   - Uses post-apply interaction for hex selection
   - No strategic choice needed

2. **Demand Structure** (`demand-structure.ts`)
   - Reason: Automatic structure requirement mechanic
   - Uses post-apply interaction for structure selection
   - No strategic choice needed

#### Need Strategic Choices Added (2 events) 📝

3. **Military Exercises** (`military-exercises.ts`)
   - Currently: Simple skill check with army condition outcomes
   - Balance Table Row: #30 - Has 3 approaches defined
   - Approaches:
     - Virtuous: "Defensive Drills" (Fortify Hex, Fame +1)
     - Practical: "Equipment Focus" (Army equip x2, +1 Gold)
     - Ruthless: "Aggressive Training" (Army Well Trained, Fame +1, +1 Gold)
   - **Status**: Needs strategic choice implementation

4. **Local Disaster** (`local-disaster.ts`)
   - Currently: Simple skill check with structure damage outcomes
   - **Status**: NOT in balance table - appears to be a legacy/deprecated event
   - **Recommendation**: Either remove or add to balance table with strategic choices

## Implementation Pattern

All events with strategic choices follow this consistent pattern:

```typescript
strategicChoice: {
  label: 'How will you handle [situation]?',
  required: true,
  options: [
    {
      id: 'virtuous',
      label: '[Approach Name]',
      description: '[Description]',
      icon: 'fas fa-[icon]',
      skills: ['skill1', 'skill2'],
      personality: { virtuous: 3 },
      outcomeDescriptions: { /* 4 outcomes */ },
      outcomeBadges: { /* 4 outcome badge arrays */ }
    },
    {
      id: 'practical',
      // ... same structure
    },
    {
      id: 'ruthless',
      // ... same structure
    }
  ]
}
```

## Next Steps

### Option 1: Complete Implementation (Military Exercises)
Add strategic choices to Military Exercises based on EVENT_BALANCE_TABLE.csv row #30:
- Implement 3 approaches with appropriate skills
- Add outcome descriptions and badges
- Update preview/execute functions to handle approach-specific logic

### Option 2: Handle Local Disaster
Decide whether to:
- Remove local-disaster.ts (if deprecated)
- Add it to EVENT_BALANCE_TABLE.csv with strategic choices
- Keep it as-is (simple event without strategic choices)

## Files Modified

1. **Removed**: `/Users/mark/Documents/repos/pf2e-reignmaker/src/pipelines/events/scholarly-discovery.ts`
2. **Renamed**: `/Users/mark/Documents/repos/pf2e-reignmaker/src/pipelines/incidents/minor/crime-wave.ts` → `criminal-activity.ts`
3. **Updated**: `/Users/mark/Documents/repos/pf2e-reignmaker/src/pipelines/PipelineRegistry.ts`
4. **Created**: `/Users/mark/Documents/repos/pf2e-reignmaker/docs/planning/STRATEGIC_CHOICES_IMPLEMENTATION.md`
5. **Created**: This status document

## Event Count Summary

- **Total Events**: 36 (after removing scholarly-discovery)
- **With Strategic Choices**: 32 (89%)
- **Excluded by Design**: 2 (demand-expansion, demand-structure)
- **Need Implementation**: 1 (military-exercises)
- **Uncertain Status**: 1 (local-disaster)

## Conclusion

The strategic choice system is **almost complete** across all events. Only Military Exercises needs strategic choices added to match the balance table. The demand events are correctly excluded as they use special hex/structure selection mechanics instead of strategic choices.
