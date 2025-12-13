# Final 9 Events - Implementation Notes

## Events with existing sophisticated implementations that need strategic choice wrapper:

### 1. Pilgrimage (pilgrimage.ts)
**Current:** Already has faction adjustment mechanics
**Needs:** Add strategic choice for Welcome All/Organize & Profit/Tax Heavily approaches
**Status:** Has working faction selection, just needs choice layer

### 2. Diplomatic Overture (diplomatic-overture.ts)
**Current:** Already has faction adjustment mechanics  
**Needs:** Add strategic choice for Generous Terms/Balanced Agreement/Demand Favorable approaches
**Status:** Has working faction selection, just needs choice layer with ongoing resource modifiers

### 3. Festive Invitation (festive-invitation.ts)
**Current:** Already has faction adjustment mechanics
**Needs:** Add strategic choice for Attend Humbly/Appropriate Gifts/Display Power approaches
**Status:** Has working faction selection, just needs choice layer with army equipment

### 4. Visiting Celebrity (visiting-celebrity.ts)
**Current:** Simple check-based with gold/fame/unrest
**Needs:** Add strategic choice for Simple Hospitality/Appropriate Ceremony/Lavish Display
**Status:** Simple conversion needed

### 5. Grand Tournament (grand-tournament.ts)
**Current:** Uses choice modifier system
**Needs:** Add strategic choice for Free Celebration/Organized Event/Exclusive Affair
**Status:** Simple conversion, gain structure on some outcomes

### 6. Archaeological Find (archaeological-find.ts)
**Current:** Uses choice modifier system
**Needs:** Add strategic choice for Preserve Heritage/Scholarly Study/Sell Artifacts
**Status:** Simple conversion with ongoing tourism modifier

### 7. Magical Discovery (magical-discovery.ts)
**Current:** Already has sophisticated faction + worksite destruction mechanics
**Needs:** Add strategic choice for Share Knowledge/Controlled Study/Monopolize
**Status:** Complex, preserve existing logic, add choice wrapper

### 8. Scholarly Discovery (scholarly-discovery.ts)
**Current:** Already has faction adjustment mechanics
**Needs:** Add strategic choice for Open University/Funded Institution/Exclusive Academy  
**Status:** Has working faction selection, just needs choice layer with ongoing modifiers

### 9. Military Exercises (military-exercises.ts)
**Current:** Already has sophisticated army equipment and condition mechanics
**Needs:** Add strategic choice for Defensive Training/Professional Exercises/Aggressive Drills
**Status:** Complex, preserve existing army logic, add choice wrapper with ongoing bonuses

## Summary
- 5 events have complete faction mechanics, just need strategic choice wrapper
- 2 events are simple and need straightforward conversion
- 2 events have complex mechanics that must be preserved

All follow the Virtuous/Practical/Ruthless pattern per specs.


