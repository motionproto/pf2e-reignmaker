# Event Migration Status - Strategic Choice Pattern

**Last Updated:** December 10, 2025

## Overview

**Progress:** 4 / 37 events migrated to Strategic Choice Pattern (11%)

**Goal:** Migrate all events to use the strategic choice pattern with 2-3 meaningful choices that reflect different approaches and personality alignments.

**Design Principles:**
- Minimum 2 choices (differentiates events from incidents)
- Maximum 3 choices
- Most common: 1 Virtuous + 1 Practical + 1 Ruthless
- Each choice belongs to ONLY ONE personality category (V, P, or R)
- Each choice should feel meaningfully different
- Outcome badges defined per choice option
- **Use diverse levers**: Resources, dice rolls, game commands, ongoing effects
- **Moderate, consistent ranges**: Avoid wild swings in outcomes

**Outcome Notation:**
- CS: Critical Success
- S: Success
- F: Failure
- CF: Critical Failure

**Balance Guidelines:**

| Outcome Level | Fame | Unrest | Gold | Resources | Faction | Structures | Worksites |
|--------------|------|--------|------|-----------|---------|------------|-----------|
| **Critical** | ±1 | ±1d3 | ±2d3 | ±2d4 | ±2 | 1-2 destroy/award | 1-2 |
| **Success/Failure** | rare | ±1 | ±1d3 | ±1d4 | ±1 | 1 damage | 1 |

**Notes:**
- Fame auto-awarded on Critical Success rolls - use sparingly in events
- Keep outcomes moderate and predictable
- Avoid extreme swings (no +4 Fame, no 1d12 Gold, etc.)
- Multiple resources okay but keep totals in range

---

## Completed Events ✅

### 1. Criminal Trial ✅
- **Dimension:** Justice philosophy
- **Choices:**
  1. Show Mercy (V)
     - CS: +1 Fame, -1d3 Unrest, remove 1d3 imprisoned
     - S: -1 Unrest, remove 1 imprisoned
     - F: +1 Unrest
     - CF: +1d3 Unrest
  2. Fair Trial (P)
     - CS: +1 Fame, -1d3 Unrest
     - S: -1 Unrest
     - F: +1 Unrest
     - CF: +1d3 Unrest
  3. Harsh Punishment (R)
     - CS: -1d3 Unrest, imprison 1d4 dissidents (convert unrest to imprisoned, if available) or build/upgrade a justice structure in a random settlement - (lowest tier possible)
     - S: -1 Unrest, imprison 1d2 dissidents
     - F: +1 Unrest
     - CF: +1d3 Unrest, -1 Fame
- **Status:** Complete, needs rebalancing to new ranges

### 2. Feud ✅
- **Dimension:** Conflict resolution approach
- **Choices:**
  1. Mediate Peacefully (V)
     - CS: -1d3 Unrest, +1 Fame
     - S: -1 Unrest
     - F: +1 Unrest
     - CF: +1d3 Unrest
  2. Force Compliance (R)
     - CS: -1 Unrest, imprison 1d3 dissidents (convert unrest to imprisoned if available)
     - S: -1 Unrest
     - F: +1 Unrest
     - CF: +1d3 Unrest, damage 1 structure
  3. Manipulate Outcome (P)
     - CS: -1d3 Unrest, +1 Fame, 1d3 gold, +1 attitude with random faction
     - S: -1 Unrest, 1 gold
     - F: +1 Unrest, -1 Fame
     - CF: +1d3 Unrest, -1 Fame, -1 attitude with random faction
- **Status:** Complete, needs rebalancing

### 3. Inquisition ✅
- **Dimension:** Religious authority and tolerance
- **Choices:**
  1. Protect the Accused (V)
  2. Stay Neutral (P)
  3. Support Inquisitors (R)
- **Status:** Complete, needs rebalancing

### 4. Public Scandal ✅
- **Dimension:** Crisis management and transparency
- **Choices:**
  1. Transparent Investigation (V)
  2. Scapegoat Official (P)
  3. Cover It Up (R)
- **Status:** Complete, needs rebalancing

---

## Events Requiring Migration ❌

### Justice & Law Enforcement

#### 5. Sensational Crime ❌
- **Dimension:** Law enforcement priorities
- **Choices:**
  1. Launch investigation and bring to justice (V)
     - CS: "The criminals are caught and reformed through fair justice." +1 Fame, -1d3 Unrest, remove 1d3 imprisoned (reformed)
     - S: "The investigation succeeds and the case is solved." -1 Unrest, convert 1d3 unrest to imprisoned
     - F: "The case goes cold despite your efforts." +1 Unrest
     - CF: "The investigation fails publicly, undermining confidence." +1d3 Unrest
  2. Increase patrols and security (P)
     - CS: "Crime is prevented through vigilant patrols and confiscated goods fill the treasury." -1d3 Unrest, +1d3 Gold (confiscated goods)
     - S: "The area is secured through increased patrols." -1 Unrest
     - F: "Resources are wasted on ineffective patrols." +1 Unrest
     - CF: "Security measures fail spectacularly." +1d3 Unrest, -1d3 Gold
  3. Make example with harsh crackdown (R)
     - CS: "Crime is eliminated through fear and mass arrests." -1d3 Unrest, imprison 1d4 dissidents(convert unrest to imprisoned if available)
     - S: "Criminals flee in the face of harsh punishment." -1 Unrest, imprison 1 dissidents (convert unrest to imprisoned if available)
     - F: "Innocents are caught up in the brutal crackdown." +1 Unrest
     - CF: "The brutal overreach sparks outrage." +1d3 Unrest, -1 Fame, imprison 1d3 innocents (increase umprisoned but do not reduce unrest)
- **Priority:** High

#### 6. Notorious Heist ❌
- **Dimension:** Response to major theft
- **Choices:**
  1. Track down and recover stolen goods (V)
     - CS: +1 Fame, +2d3 Gold (recovered)
     - S: +1d3 Gold (recovered)
     - F: -1d3 Gold (trail goes cold)
     - CF: -2d3 Gold (insurance costs and publicity)
  2. Increase treasury security (P)
     - CS: -1d3 Unrest
     - S: -1 Unrest
     - F: +1 Unrest, -1d3 Gold (security costs)
     - CF: +1d3 Unrest, -2d3 Gold
  3. Terrorize underworld with brutal response (R)
     - CS: -1d3 Unrest, imprison 1d3 criminals (convert unrest to imprisoned if available)
     - S: -1 Unrest, imprison 1 criminals (convert unrest to imprisoned if available)
     - F: +1 Unrest
     - CF: +1d3 Unrest, -1 Fame, damage 1 structure (riot)
- **Priority:** High

#### 7. Drug Den ❌
- **Dimension:** Vice and public health policy
- **Choices:**
  1. Offer rehabilitation and treatment (V)
     - CS: +1 Fame, -1d3 Unrest
     - S: -1 Unrest
     - F: -1d3 Gold (treatment costs)
     - CF: -2d3 Gold, +1d3 Unrest
  2. Regulate and tax the trade (P)
     - CS: +2d3 Gold (ongoing: 2 turns)
     - S: +1d3 Gold (ongoing: 1 turn)
     - F: +1 Unrest
     - CF: +1d3 Unrest, -1 Fame
  3. Crush operation with force (R)
     - CS: -1d3 Unrest, imprison 1d3 dealers(convert unrest to imprisoned if available)
     - S: -1 Unrest, imprison 1 dealers (convert unrest to imprisoned if available)
     - F: +1 Unrest
     - CF: +1d3 Unrest, damage 1 structure
- **Priority:** Medium

### Conflict & Violence

#### 8. Assassination Attempt ❌
- **Dimension:** Security vs. civil liberties
- **Choices:**
  1. Protect leader but maintain open governance (V)
     - CS: +1 Fame, -1d3 Unrest
     - S: -1 Unrest
     - F: +1 Unrest, -1d3 Gold (medical)
     - CF: +1d3 Unrest, -2d3 Gold, lose 1 leader action
  2. Investigate thoroughly, increase security (P)
     - CS: +1 Fame, -1d3 Unrest, imprison 1d3 conspirators(convert unrest to imprisoned if available)
     - S: -1 Unrest
     - F: +1 Unrest, -1d3 Gold
     - CF: +1d3 Unrest, -2d3 Gold
  3. Purge suspected conspirators (R)
     - CS: -1d3 Unrest, imprison 2d3 conspirators (convert unrest to imprisoned if available)
     - S: -1 Unrest, imprison 1d3 suspected (convert unrest to imprisoned if available)
     - F: +1 Unrest, imprison 1d2 innocents
     - CF: +1d3 Unrest, -1 Fame, imprison 1d4 innocents (increase imprisoned if available, do not reduce unrest)
- **Priority:** High

#### 9. Bandit Activity ❌
- **Dimension:** Law enforcement approach
- **Choices:**
  1. Negotiate safe passage and employment (V)
     - CS: +1 Fame, -1d3 Unrest, +1 new worksite
     - S: -1 Unrest
     - F: -1d3 Gold (bandits demand payment)
     - CF: -2d3 Gold, +1d3 Unrest
  2. Drive them off with militia (P)
     - CS: -1d3 Unrest, +2d3 Gold (recovered goods)
     - S: -1 Unrest, +1d3 Gold
     - F: +1 Unrest, -1d3 Gold
     - CF: +1d3 Unrest, -1d3 Gold, worksite destroyed
  3. Hunt them down without mercy (R)
     - CS: -1d3 Unrest, +1d3 Gold (plunder), imprison 1d4 captives (convert unrest to imprisoned if available)
     - S: -1 Unrest, imprison 1d2 captives (convert unrest to imprisoned if available)
     - F: +1 Unrest
     - CF: +1d3 Unrest, -1 Fame, structure damaged
- **Priority:** High

#### 10. Raiders ❌
- **Dimension:** Border defense strategy
- **Choices:**
  1. Negotiate peace treaty (V)
     - CS: +1 Fame, -1d3 Unrest, +2d3 Gold (trade goods)
     - S: -1 Unrest, +1d3 Gold
     - F: +1 Unrest, -1d3 Gold (failed gifts)
     - CF: +1d3 Unrest, -2d3 Gold (tribute demanded)
  2. Fortify borders and prepare defenses (P)
     - CS: -1d3 Unrest, gain 2d4 Lumber
     - S: -1 Unrest, gain 1d4 Lumber
     - F: +1 Unrest, -1d3 Gold, (damage one fortification or worksite if none available (fortification damage should be like a structure)
     - CF: +1d3 Unrest, -1d3 Gold, (destroy one fortification or worksite if none available (fortification desctruction should be like a structure)
  3. Launch preemptive strike (R)
     - CS: -1d3 Unrest, +2d3 Gold (plunder), one army gains welltrined
     - S: -1 Unrest, +1d3 Gold
     - F: +1 Unrest, -1d3 Gold
     - CF: +1d3 Unrest, -2d3 Gold, -1 Fame, one army is fatigued
- **Priority:** High

#### 11. Monster Attack ❌
- **Dimension:** Threat response approach
- **Choices:**
  1. Try to relocate creature peacefully (V)
     - CS: +1 Fame, -1d3 Unrest, gain 1d4 Food (nature's bounty)
     - S: -1 Unrest
     - F: +1 Unrest, -1d3 Gold
     - CF: +1d3 Unrest, damage 1 structure
  2. Hire professional hunters (P)
     - CS: -1d3 Unrest, +2d3 Gold (monster parts)
     - S: -1 Unrest, +1d3 Gold
     - F: +1 Unrest, -1d3 Gold
     - CF: +1d3 Unrest, -2d3 Gold, damage 1 structure
  3. Mobilize army to destroy it (R)
     - CS: -1d3 Unrest, +2d3 Gold (trophy/parts), one army gains a random equipment upgrade (like outfit army)
     - S: -1 Unrest, +1d3 Gold
     - F: +1 Unrest, -1d3 Golddamage 1 structure
     - CF: +1d3 Unrest, -2d3 Gold, one army is enfeebled
- **Priority:** Medium

#### 12. Undead Uprising ❌
- **Dimension:** Supernatural crisis response
- **Choices:**
  1. Consecrate land and lay spirits to rest (V)
     - CS: +1 Fame, -1d3 Unrest, gain 1d4 Food (blessed harvest)
     - S: -1 Unrest
     - F: +1 Unrest, -1d3 Gold (clergy fees)
     - CF: +1d3 Unrest, damage 1 structure
  2. Hire clerics and seal the area (P)
     - CS: -1d3 Unrest, gain 1d4 Lumber (boundary markers)
     - S: -1 Unrest
     - F: +1 Unrest, -1d3 Gold
     - CF: +1d3 Unrest, -2d3 Gold
  3. Burn everything and salt the earth (R)
     - CS: -1d3 Unrest, imprison 1d4 necromancers
     - S: -1 Unrest
     - F: +1 Unrest, damage 1 structure
     - CF: +1d3 Unrest, damage 1d2 structures, -1 Fame
- **Priority:** Medium

#### 13. Cult Activity ❌
- **Dimension:** Religious freedom vs. public safety
- **Choices:**
  1. Investigate but respect religious freedom (V)
     - CS: +1 Fame, -1d3 Unrest, adjust 2 factions attitide by +1 
     - S: -1 Unrest, adjust faction +1
     - F: +1 Unrest
     - CF: +1d3 Unrest, damage 1 structure, adjust faction -1
  2. Monitor and contain their influence (P)
     - CS: -1d3 Unrest
     - S: -1 Unrest
     - F: +1 Unrest, -1d3 Gold
     - CF: +1d3 Unrest, ongoing: cult influence (+1 Unrest/turn for 2 turns)
  3. Suppress cult with force (R)
     - CS: -1d3 Unrest, imprison 2d4 cultists
     - S: -1 Unrest, imprison 1d4 cultists
     - F: +1 Unrest, adjust 1 faction -1 attitude
     - CF: +1d3 Unrest, -1 Fame, adjust 2 factions -1 attitude
- **Priority:** Medium

### Religious & Moral Events

#### 14. Pilgrimage ❌
- **Dimension:** How to handle religious influx
- **Choices:**
  1. Welcome all pilgrims freely (V)
     - CS: +1 Fame, -1d3 Unrest, +2d3 Gold (donations), adjust 2 factions +1 attitide
     - S: -1 Unrest, +1d3 Gold, adjust 1 faction +1
     - F: +1 Unrest, -1d3 Gold
     - CF: +1d3 Unrest, -2d3 Gold
  2. Organize and profit from pilgrimage (P)
     - CS: -1d3 Unrest, +2d3 Gold
     - S: -1 Unrest, +1d3 Gold
     - F: +1 Unrest
     - CF: +1d3 Unrest, adjust faction -1
  3. Tax heavily or restrict access (R)
     - CS: +2d3 Gold, adjust faction+1
     - S: +1d3 Gold
     - F: +1 Unrest, adjust faction -1
     - CF: +1d3 Unrest, -1 Fame, adjust 2 faction -1
- **Priority:** Low

#### 15. Plague ❌
- **Dimension:** Public health vs. economy
- **Choices:**
  1. Provide free treatment for all (V)
     - CS: +1 Fame, -1d3 Unrest
     - S: -1 Unrest
     - F: +1 Unrest, -1d3 Gold, -1d4 food
     - CF: +1d3 Unrest, -1d3 Gold, -2d4 food, ongoing: plague (-1d4 food/turn for 2 turns)
  2. Quarantine effectively, compensate losses (P)
     - CS: -1d3 Unrest
     - S: -1 Unrest
     - F: +1 Unrest, -1d3 Gold
     - CF: +1d3 Unrest, -2d3 Gold
  3. Lock down hard, burn infected areas (R)
     - CS: -1d3 Unrest, +2d3 gold (forfeited assets)
     - S: -1 Unrest, +1d3 gold
     - F: +1 Unrest, damage 1 structure
     - CF: +1d3 Unrest, -1 Fame, destroy 1 structure, 1 faction -1 attitude
- **Priority:** High

### Political & Diplomatic Events

#### 16. Diplomatic Overture ❌
- **Dimension:** Foreign relations approach
- **Choices:**
  1. Accept with generous terms (V)
     - CS: +1 Fame, +1d3 Gold (trade), adjust 2 factions +1 attitide,  choose 1d3 resource to gain ongoing for 2 turns (shows as special modifier)
     - S: +1Gold, adjust faction +1
     - F: -1d3 Gold, adjust faction -1
     - CF: -2d3 Gold, adjust 2 factions -1
  2. Negotiate balanced agreement (P)
     - CS: +2d3 Gold, adjust 2 factions +1 attitide
     - S: +1d3 Gold, adjust faction +1
     - F: adjust faction +1
     - CF: +1 Unrest, adjust faction -1
  3. Demand favorable terms or refuse (R)
     - CS: +2d3 Gold, adjust faction -1, choose 1d3 resource to gain ongoing for 2 turns (shows as special modifier)
     - S: +1d3 Gold, adjust faction -1 choose 1d3 resource to gain ongoing for 2 turns (shows as special modifier)
     - F: -1 Fame, adjust faction -1
     - CF: +1d3 Unrest, -1 Fame, adjust 2 factions -1
- **Priority:** Medium

#### 17. Festive Invitation ❌
- **Dimension:** How to engage with celebration
- **Choices:**
  1. Attend humbly and join festivities (V)
     - CS: +1 Fame, -1d3 Unrest, adjust 2 factions +1
     - S: -1 Unrest, adjust faction +1
     - F: adjust faction -1
     - CF: +1 Unrest, adjust faction -1
  2. Attend with appropriate gifts and diplomacy (P)
     - CS: -1d3 Unrest, +1d3 Gold (gifts received), adjust 2 factions +1
     - S: adjust faction +1
     - F: -1d3 Gold, adjust faction -1
     - CF: -2d3 Gold, adjust faction -1
  3. Use event to display power and military might (R)
     - CS: -1d3 Unrest, +2d3 Gold, adjust faction -1 (rivals), 2 armies gains random outfit bonus 
     - S: 1d3 Gold, 1 army gains random outfit bonus, adjust faction -1 (rivals)
     - F: +1 Unrest, -1d3 Gold
     - CF: +1d3 Unrest, -2d3 Gold, 1 army gains enfeebled
- **Priority:** Low

#### 18. Visiting Celebrity ❌
- **Dimension:** How to host important guest
- **Choices:**
  1. Simple hospitality, focus on person (V)
     - CS: +1 Fame, -1d3 Unrest, +1d3 Gold (donation)
     - S: -1 Unrest
     - F: (no effect)
     - CF: +1 Unrest, adjust faction -1 (celebrity's allies)
  2. Appropriate ceremony and exchange (P)
     - CS: +2d3 Gold (trade/gifts)
     - S: +1d3 Gold
     - F: -1d3 Gold
     - CF: -2d3 Gold
  3. Lavish display to impress and gain favor (R)
     - CS: +2d3 random resource (influence/deals), -1d3 Gold (costs)
     - S: -1d3 Gold, +1 faction atitude
     - F: +1 Unrest, -1d3 Gold
     - CF: +1d3 Unrest, -2d3 Gold, -1 faction attitude
- **Priority:** Low

#### 19. Grand Tournament ❌
- **Dimension:** How to capitalize on event
- **Choices:**
  1. Free celebration for all citizens (V)
     - CS: +1 Fame, -1d3 Unrest, -1d3 Gold, gain 1 random structure
     - S: -1 Unrest, -1d3 Gold
     - F: -1d3 Gold
     - CF: +1 Unrest, -2d3 Gold
  2. Organized event with entry fees (P)
     - CS: -1d3 Unrest, +2d3 Gold, gain 1 random structure
     - S: +1d3 Gold
     - F: +1d3 Gold
     - CF: +1 Unrest
  3. Exclusive noble affair with high stakes (R)
     - CS: +2d3 Gold, adjust faction +1 (nobles), gain 1 random structure
     - S: +1d3 Gold
     - F: +1 Unrest, +1d3 Gold
     - CF: +1d3 Unrest, damage 1 random structure (protests)
- **Priority:** Low

### Economic Events

#### 20. Food Shortage ❌
- **Dimension:** Resource allocation during crisis
- **Choices:**
  1. Feed the people, distribute aid freely draining military supplies  (V)
     - CS: +1 Fame, -1d3 Unrest, -1d4 Food
     - S: -1 Unrest, -1d4 Food
     - F: +1 Unrest, -2d4 Food, one army becomes sickened
     - CF: +1d3 Unrest, -2d4 Food, one random army rolls a morale check
  2. Controlled rationing, fair compensation (P)
     - CS: -1d3 Unrest, -1d4 Food, 
     - S: -1 Unrest, -1d4 Food
     - F: +1 Unrest, -1d4 Food
     - CF: +1d3 Unrest, -2d4 Food
  3. Prioritize elite and military, let poor suffer (R)
     - CS: -1d4 Food, imprison 1d4 rioters (convert unrest to imprisoned)
     - S: -1d4 Food, +1 Unrest
     - F: +1d3 Unrest, -1d4 Food, damage 1 structure
     - CF: +1d3 Unrest, -1 Fame, -2d4 Food, damage 1 structure
- **Priority:** High

#### 21. Food Surplus ❌
- **Dimension:** How to use abundance
- **Choices:**
  1. Distribute freely to poor and needy (V)
     - CS: +1 Fame, -1d3 Unrest, one settlement gains a structure
     - S: -1d3 Unrest
     - F: -1 Unrest
     - CF: +1d3 Unrest
  2. Store reserves and stabilize prices (P)
     - CS: -1d3 Unrest, gain 2d4 Food (stored)
     - S: gain 1d4 Food (stored)
     - F: -1d3 Gold (storage costs)
     - CF: +1 Unrest, -1d3 Gold
  3. Export for maximum profit (R)
     - CS: +2d3 Gold, +1 faction attitude
     - S: +1d3 Gold
     - F: +1 Unrest, +1d3 Gold
     - CF: +1d3 Unrest, -1 Fame, -1 faction attitude
- **Priority:** Medium

#### 22. Economic Surge ❌
- **Dimension:** How to capitalize on boom
- **Choices:**
  1. Raise wages and improve worker conditions (V)
     - CS: +1 Fame, -2d3 Unrest, +1d3 Gold, 
     - S: -1 Unrest, +1d3 Gold
     - F: -1d3 Gold
     - CF: +1 Unrest, -1d3 Gold
  2. Invest in infrastructure and growth (P)
     - CS: +2d3 Gold, gain 2d4 choice of Lumber/Stone/Ore
     - S: +1d3 Gold, gain 1d4 choice resource
     - F: +1d3 Gold
     - CF: +1 Unrest, -1d3 Gold
  3. Maximize taxes and profit (R)
     - CS: +2d3 Gold, -1d3 Unrest (intimidation), one settlement gains a structure
     - S: +2d3 Gold, +1 Unrest
     - F: +1d3 Gold, +1d3 Unrest
     - CF: +1d3 Unrest, -1 Fame, damage 1 structure (riot)
- **Priority:** Medium

#### 23. Trade Agreement ❌
- **Dimension:** Terms of trade
- **Choices:**
  1. Generous terms to build friendship (V)
     - CS: +1 Fame, +2d3 Gold (trade), adjust 2 factions +1,  choose 1d3 resource to gain ongoing for 2 turns (shows as special modifier)
     - S: +1d3 Gold, adjust faction +1, choose 1d3 resource 
     - F: +1d3 Gold, adjust faction +1
     - CF: adjust faction -1
  2. Balanced mutual benefit (P)
     - CS: +2d3 Gold, adjust faction +2,  choose 1d3 resource to gain ongoing for 2 turns (shows as special modifier)
     - S: +1d3 Gold, adjust faction +1,  choose 1d3 resource 
     - F: +1d3 Gold
     - CF: adjust faction -1
  3. Extract maximum advantage (R)
     - CS: +2d3 Gold, adjust faction -1, choose 2d3 resource to gain ongoing for 3 turns (shows as special modifier)
     - S: +1d3 Gold, adjust faction -1, choose 1d3 resource to gain ongoing for 2 turns (shows as special modifier)
     - F: +1d3 Gold, -1 Fame, adjust 2 faction -1, choose 1d3 resource
     - CF: +1 Unrest, -1 Fame, adjust 2 faction -1
- **Priority:** Medium

#### 24. Land Rush ❌
- **Dimension:** Expansion management
- **Choices:**
  1. Free settlement and land grants (V)
     - CS: +1 Fame, -1d3 Unrest, gain new worsksite and a new structure (lowest available tier)
     - S: -1 Unrest, gain new worsksite
     - F: -1d3 of a random resource
     - CF: +1 Unrest, -2d3 Gold, -1d3 of a random resource
  2. Controlled development with permits (P)
     - CS: +2d3 Gold, -1d3 Unrest, gain a new structure (lowest available tier)
     - S: +1d3 Gold, -1 Unrest
     - F: +1 Unrest
     - CF: +1d3 Unrest, -1d3 Gold (bribes)
  3. Auction to highest bidders (R)
     - CS: +2d3 Gold, gain new worsksite
     - S: +1d3 Gold, gain new worsksite
     - F: +1d3 Gold, +1 Unrest
     - CF: +1d3 Unrest, -1 Fame
- **Priority:** Medium

#### 25. Boomtown ❌
- **Dimension:** Rapid growth management
- **Choices:**
  1. Ensure fair housing and worker rights (V)
     - CS: +1 Fame, -1d3 Unrest, gain anew structure
     - S: -1 Unrest, +1d3 Gold
     - F: -1d3 Gold
     - CF: +1d3 Unrest
  2. Regulate growth sustainably (P)
     - CS: +2d3 Gold, gain 2d4 choice of Lumber/Stone, gain a new structure
     - S: +1d3 Gold
     - F: +1 Unrest
     - CF: +1d3 Unrest
  3. Exploit boom for maximum revenue (R)
     - CS: +2d3 Gold, and 1d3 gold for next 2 turns (as modifier)
     - S: +2d3 Gold, +1 Unrest
     - F: +1d3 Gold, +1d3 Unrest
     - CF: +1d3 Unrest, -1 Fame
- **Priority:** Medium

#### 26. Demand Expansion ❌ -- demand HEX has special UI and Hex Display - end contitions for claiming the desired hex provide a fixed rewqard no matter what approach was taken. look at the existing implementation
- **Dimension:** How to handle growth pressure
- **Choices:**
  1. Expand thoughtfully, preserve character (V)
     - CS: +1 Fame, -1d3 Unrest,
     - S: -1 Unrest,
     - F: +1 Unrest, 
     - CF: +1d3 Unrest,
  2. Measured expansion with planning (P)
     - CS: +1d3 Gold, gain 1d4 Lumber,
     - S: +1d3 Gold,
     - F: +1 Unrest, 
     - CF: +1d3 Unrest
  3. Rapid exploitation of demand (R)
     - CS: +2d3 Gold
     - S: +1d3 Gold, +1 Unrest
     - F: +1d3 Gold, +1d3 Unrest
     - CF: +1d3 Unrest, -1 Fame
- **Priority:** Low

#### 27. Demand Structure ❌ -- demand Structure has special UI and Display,  end contitions for building the desired Structure provide a fixed rewqard no matter what approach was taken. look at the existing implementation
- **Dimension:** Building priorities
- **Choices:**
  1. Build what citizens need most (V)
     - CS: +1 Fame, -1d3 Unrest
     - S: -1 Unrest
     - F: -1d3 Gold,
     - CF: +1 Unrest,
  2. Build what benefits kingdom overall (P)
     - CS: +1d3 Gold, gain 1d4 choice of Lumber/Stone
     - S: +1d3 Gold,
     - F: +1 Unrest, 
     - CF: +1d3 Unrest, 
  3. Build what generates most revenue (R)
     - CS: +2d3 Gold, gain 1d4 choice resource
     - S: +1d3 Gold
     - F: +1 Unrest
     - CF: +1d3 Unrest, -1 Fame
- **Priority:** Low

### Discovery & Opportunity Events

#### 28. Archaeological Find ❌
- **Dimension:** How to handle discovery
- **Choices:**
  1. Preserve as cultural heritage, free access (V)
     - CS: +1 Fame, -1d3 Unrest, +1d3 Gold (tourism)
     - S: -1 Unrest
     - F: -1d3 Gold (maintenance)
     - CF: +1 Unrest, -1d3 Gold
  2. Scholarly study and museum (P)
     - CS: +2d3 Gold (ongoing: tourism for 2 turns)
     - S: +1d3 Gold
     - F: -1d3 Gold
     - CF: -2d3 Gold
  3. Sell artifacts for profit (R)
     - CS: +2d3 Gold
     - S: +1d3 Gold
     - F: +1d3 Gold, -1 Fame
     - CF: +1 Unrest, -1 Fame, +1d3 Gold
- **Priority:** Low

#### 29. Magical Discovery ❌
- **Dimension:** Magic regulation and access
- **Choices:**
  1. Share knowledge freely (V)
     - CS: +1 Fame, -1d3 Unrest, +1d3 Gold (innovations), + 1 faction attitude 
     - S: -1 Unrest, +1d3 Gold
     - F: +1 Unrest
     - CF: +1d3 Unrest, damage 1 structure
  2. Controlled study and regulation (P)
     - CS: +2d3 Gold (ongoing: research for 2 turns)
     - S: +1d3 Gold
     - F: +1 Unrest
     - CF: +1d3 Unrest
  3. Monopolize for kingdom advantage (R)
     - CS: +2d3 Gold
     - S: +1d3 Gold
     - F: +1 Unrest, -1 Fame
     - CF: +1d3 Unrest, -1 Fame, -1 faction attitude 
- **Priority:** Medium

#### 30. Remarkable Treasure ❌
- **Dimension:** Wealth distribution
- **Choices:**
  1. Share with all citizens (V)
     - CS: +1 Fame, -1d3 Unrest, +1d3 Gold distributed, + 1 faction attitude 
     - S: -1 Unrest, +1d3 Gold distributed
     - F: (no effect)
     - CF: +1 Unrest
  2. Add to treasury for kingdom projects (P)
     - CS: +2d3 Gold, gain 2d4 choice of Lumber/Stone/Ore
     - S: +2d3 Gold
     - F: +1 Unrest
     - CF: +1 Unrest, +1d3 Gold
  3. Keep for leadership's benefit (R)
     - CS: +2d3 Gold, every leader get the benefit of a claim stipend action.
     - S: +2d3 Gold, +1 Unrest
     - F: +1d3 Gold, +1d3 Unrest
     - CF: +1d3 Gold, +1d3 Unrest, -1 Fame, 1 leader loses action
- **Priority:** Low

#### 31. Scholarly Discovery ❌
- **Dimension:** Knowledge and education policy
- **Choices:**
  1. Open university for all (V)
     - CS: +1 Fame, -1d3 Unrest, gain +1 attitide with 2 factions
     - S: -1 Unrest
     - F: -1d3 Gold
     - CF: +1 Unrest, -1d3 Gold
  2. Funded research institution (P)
     - CS: +2d3 Gold (ongoing: innovations for 2 turns)
     - S: +1d3 Gold
     - F: -1d3 Gold
     - CF: -2d3 Gold
  3. Exclusive academy for elite (R)
     - CS: +2d3 Gold (tuition), adjust faction +1 (nobles)
     - S: +1d3 Gold
     - F: +1d3 Gold, +1 Unrest
     - CF: +1d3 Unrest, -1 Fame
- **Priority:** Low

#### 32. Nature's Blessing ❌
- **Dimension:** How to respond to bountiful nature
- **Choices:**
  1. Preserve and protect natural wonder (V)
     - CS: +1 Fame, -1d3 Unrest, gain 2d4 Food, gain 1d4 Lumber
     - S: -1 Unrest, gain 1d4 Food
     - F: gain 1d4 Food
     - CF: +1 Unrest
  2. Harvest sustainably (P)
     - CS: gain 2d4 Food, +2d3 Gold, gain 2d4 Lumber
     - S: gain 1d4 Food, +1d3 Gold, gain 1d4 Lumber
     - F: gain 1d4 Food
     - CF: +1 Unrest
  3. Exploit fully while it lasts (R)
     - CS: gain 2d4 Food, +2d3 Gold, gain 2d4 Lumber
     - S: gain 2d4 Food, +1d3 Gold, gain 1d4 Lumber
     - F: gain 1d4 Food, +1 Unrest
     - CF: +1d3 Unrest, -1 Fame
- **Priority:** Low

#### 33. Good Weather ❌
- **Dimension:** How to capitalize on favorable conditions
- **Choices:**
  1. Declare holidays and celebrate (V)
     - CS: +1 Fame, -1d3 Unrest, gain 1d4 new citizens
     - S: -1 Unrest
     - F: +1 Unrest
     - CF: +1d3 Unrest
  2. Work hard to gather extra resources (P)
     - CS: gain 2d4 Food, +2d3 Gold, gain 2d4 choice of Lumber/Stone
     - S: gain 1d4 Food, +1d3 Gold, gain 1d4 choice resource
     - F: +1 Unrest
     - CF: +1d3 Unrest, -1d3 Gold
  3. Marshal troops for military exercises (R)
     - CS: +2d3 Gold (plunder), -1d3 Unrest, 2 armies gains welltrained	
     - S: +1d3 Gold, 1 army gains welltrained	
     - F: +1 Unrest, -1d3 Gold
     - CF: +1d3 Unrest, -2d3 Gold
- **Priority:** Low

### Disaster & Crisis Events

#### 34. Natural Disaster ❌
- **Dimension:** Crisis priority (bad vs. worse choices)
- **Choices:**
  1. Prioritize saving lives over property (V)
     - CS: +1 Fame, -1d3 Unrest, damage 1 structure 
     - S: -1 Unrest, damage 1 structure
     - F: +1 Unrest, damage 1 structure and destroy a worksite
     - CF: +1d3 Unrest, destroy 1 structures and 1 worksite
  2. Balanced evacuation and damage control (P)
     - CS: -1d3 Unrest, damage 1 structure
     - S: damage 1 structure 
     - F: +1 Unrest, damage 1 structure and destroy 1 worksite
     - CF: +1d3 Unrest, damage 2 structures
  3. Deploy troops to save valuable structures and assets (R)
     - CS: gain 2d4 choice of Lumber/Stone/Ore (salvaged), +1 Unrest
     - S: damage 1 structure, +1 Unrest
     - F: +1d3 Unrest, -1 Fame, 1 army is enfeebled
     - CF: +1d3 Unrest, -1 Fame, damage 1 structure, 1 army is enfeebled
- **Priority:** High

#### 35. Local Disaster ❌ -- REMOVE duplicate of 34
- **Dimension:** Disaster response priorities
- **Choices:**
  1. All resources to affected area (V)
     - CS: +1 Fame, -1d3 Unrest, -2d3 Gold
     - S: -1 Unrest, -1d3 Gold
     - F: +1 Unrest, -2d3 Gold
     - CF: +1d3 Unrest, -2d3 Gold
  2. Measured aid while maintaining stability (P)
     - CS: -1d3 Unrest, -1d3 Gold
     - S: -1 Unrest, -1d3 Gold
     - F: +1 Unrest, -1d3 Gold
     - CF: +1d3 Unrest, -2d3 Gold
  3. Minimal aid to preserve kingdom resources (R)
     - CS: -1d3 Gold, gain 1d4 choice resources (withheld aid)
     - S: -1d3 Gold, +1 Unrest
     - F: +1d3 Unrest, -1 Fame
     - CF: +1d3 Unrest, -1 Fame, damage 1 structure (affected area)
- **Priority:** Medium

#### 36. Immigration ❌
- **Dimension:** How to handle population influx
- **Choices:**
  1. Welcome all refugees freely (V)
     - CS: +1 Fame, -1d3 Unrest, gain 1 new worksite
     - S: -1 Unrest, gain 1 new worksite
     - F: +1 Unrest, -1d3 Gold, gain 1 new worksite
     - CF: +1d3 Unrest, -2d3 Gold, gain 1 new worksite
  2. Controlled integration with vetting (P)
     - CS: -1d3 Unrest, gain 2d4 new citizens, +1d3 Gold (skilled workers)
     - S: -1 Unrest, gain 1d4 new citizens
     - F: +1 Unrest, gain 1d4 new citizens
     - CF: +1d3 Unrest
  3. Relocate and exploit as cheap labor (R)
     - CS: +2d3 Gold, +1 Unrest, gain 2 new worksites
     - S: +1d3 Gold, +1 Unrest, gain 2 new worksites
     - F: +1d3 Unrest, -1 Fame, gain 1 new worksite
     - CF: +1d3 Unrest, -1 Fame, adjust 1 faction -1, gain 1 new worksite
- **Priority:** High

### Military Events

#### 37. Military Exercises ❌ -- look at the existing this should provide either outfit army, well trained bonus, poorly trained penalty, or enfeebled condition
- **Dimension:** Military preparedness approach
- **Choices:**
  1. Defensive training, minimize disruption (V)
     - CS: -1d3 Unrest, ongoing: defense bonus (+1 for 2 turns)
     - S: -1 Unrest, ongoing: defense bonus (+1 for 1 turn)
     - F: (no effect)
     - CF: +1 Unrest, -1d3 Gold (medical)
  2. Professional exercises with planning (P)
     - CS: -1d3 Unrest, ongoing: military bonus (+1 for 2 turns)
     - S: -1 Unrest, ongoing: military bonus (+1 for 1 turn)
     - F: -1d3 Gold
     - CF: +1 Unrest, -2d3 Gold
  3. Aggressive drills to intimidate neighbors (R)
     - CS: -1d3 Unrest, adjust faction -2 (neighbors)
     - S: -1 Unrest, adjust faction -1
     - F: +1 Unrest, adjust faction -2
     - CF: +1d3 Unrest, adjust faction -2, spawn enemy army
- **Priority:** Low

---

## Recommended Mergers

These events share similar themes and could be combined to reduce total count and create richer, more varied events:

1. **"Criminal Activity"** - merge: sensational-crime, notorious-heist, drug-den
   - Creates a comprehensive crime event with varied illegal activities

2. **"Raiders & Bandits"** - merge: bandit-activity, raiders
   - Both are armed groups threatening territory

3. **"Supernatural Threats"** - merge: monster-attack, undead-uprising, cult-activity
   - All deal with supernatural/unusual threats

4. **"Natural Bounty"** - merge: good-weather, natures-blessing, food-surplus
   - All are beneficial natural events

5. **"Economic Boom"** - merge: economic-surge, boomtown, land-rush
   - All deal with rapid economic growth

6. **"Discovery"** - merge: magical-discovery, scholarly-discovery
   - Both are intellectual/magical discoveries

7. **"Disaster"** - merge: natural-disaster, local-disaster
   - Both are environmental crises

**Potential reduction:** 37 → ~28 events after mergers

---

## Migration Priority Order

### Phase 1: High-Impact Moral Events (Priority: High)
1. Plague
2. Food Shortage
3. Natural Disaster
4. Immigration
5. Assassination Attempt

### Phase 2: Common Conflict Events (Priority: High)
6. Bandit Activity
7. Raiders
8. Sensational Crime
9. Notorious Heist

### Phase 3: Economic & Diplomatic (Priority: Medium)
10. Trade Agreement
11. Economic Surge / Boomtown / Land Rush (decide on merger)
12. Diplomatic Overture
13. Food Surplus

### Phase 4: Low-Priority / Beneficial Events (Priority: Low)
14. Good Weather
15. Archaeological Find
16. Grand Tournament
17. Festive Invitation
18. Visiting Celebrity
19. Nature's Blessing

### Phase 5: Remaining Events (Priority: Medium-Low)
20. All others

---

## Available Outcome Levers

Events can use a wide variety of outcome mechanisms beyond basic resource changes:

### 1. Basic Resources
- **Gold, Food, Lumber, Stone, Ore** - Kingdom economy
- **Fame** - Kingdom reputation (use sparingly, auto-awarded on CS)
- **Unrest** - Kingdom stability
- **Imprisoned** - Arrested dissidents
- Can use static values or dice rolls (1d3, 1d4, 2d3, 2d4)

### 2. Game Commands (Complex Effects)
Available through the game command system:

- **Damage Structure** - Damage random structure (e.g., fire, raid)
- **Destroy Structure** - Completely destroy structure (e.g., plague, disaster)
- **Adjust Faction** - Change faction relations
- **Imprison/Release** - Arrest or free dissidents
- **Spawn Enemy Army** - Create hostile force
- **New Citizens** - Population gains
- **Worksites** - Create or destroy worksites

### 3. Ongoing Effects
- **Ongoing modifiers** - Penalties/bonuses lasting 1-2 turns
- Keep duration short (1-2 turns max)

### 4. Balance Principles
- **Fame:** Rare, only for reputation-focused events (+/-1)
- **Unrest:** -1d3 to +1d3 (core stability mechanic)
- **Gold:** 1d3 to 2d3 (moderate economy impact)
- **Resources:** 1d4 to 2d4 (infrastructure gains)
- **Faction:** +/-1 to +/-2 (relationship changes)
- **Structures:** Damage 1, destroy 1-2 on critical
- **Imprisoned:** 1d2 to 2d4 (based on severity)

### 5. Personality-Appropriate Outcomes
Match outcome types to personality:

- **Virtuous (V)**: Fame gains (rare), Unrest reduction, community benefits, releases imprisoned, attracts new citizens, faction improvements
- **Practical (P)**: Balanced resources, infrastructure gains (Lumber/Stone/Ore), sustainable effects, ongoing bonuses
- **Ruthless (R)**: Gold gains, intimidation (Unrest reduction), imprison dissidents, faction penalties for enemies

---

## Implementation Notes

- **Outcome badges** must be defined in `strategicChoice.options[].outcomeBadges`, not in preview function
- **Preview function** should read from selected option and calculate modifiers
- **Execute function** should apply modifiers stored by preview
- **Personality values** typically 1-5, with 3 being moderate expression
- Each choice belongs to ONLY ONE personality category (V, P, or R)
- Outcome notation: CS (Critical Success), S (Success), F (Failure), CF (Critical Failure)
- **Use moderate, consistent ranges** - Avoid wild swings in outcomes
- **Fame is rare** - Auto-awarded on CS, only add explicit Fame for reputation-focused events
- **Keep totals balanced** - Multiple resources okay but stay within overall ranges
