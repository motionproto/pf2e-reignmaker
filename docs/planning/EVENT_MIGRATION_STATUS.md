# Event Migration Status - Strategic Choice Pattern

**Last Updated:** December 11, 2025

## Overview

**Progress:** 9 / 34 events migrated to Strategic Choice Pattern (26%)

**Goal:** Migrate eligible events to use the strategic choice pattern with 2-3 meaningful choices that reflect different approaches and personality alignments.

**Note:** 2 events (Demand Expansion, Demand Structure) are excluded from migration - they have sophisticated check-based mechanics that should be preserved.

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
|--------------|------|--------|------|-----------|---------|------------|--------------|
| **Critical** | ±1 | ±1d3 | ±2d3 | ±2d4 | ±2 factions (±1 each) | 1-2 destroy/award | 1-2 |
| **Success/Failure** | rare | ±1 | ±1d3 | ±1d4 | ±1 faction | 1 damage | 1 |

**Notes:**
- Fame auto-awarded on Critical Success rolls - use sparingly in events
- Keep outcomes moderate and predictable
- Avoid extreme swings (no +4 Fame, no 1d12 Gold, etc.)
- Multiple resources okay but keep totals in range
- **Faction adjustments**: Never adjust single faction by ±2. Instead, adjust 2 different factions by ±1 each

---

## Completed Events ✅

### 1. Criminal Trial ✅
- **Dimension:** Justice philosophy
- **Choices:**
  1. Show Mercy (V)
     - CS: +1 Fame, -1d3 Unrest, remove 1d3 imprisoned (pardoned)
     - S: -1 Unrest, remove 1 imprisoned (pardoned)
     - F: +1 Unrest
     - CF: +1d3 Unrest
  2. Fair Trial (P)
     - CS: +1 Fame, -1d3 Unrest
     - S: -1 Unrest
     - F: +1 Unrest
     - CF: +1d3 Unrest
  3. Harsh Punishment (R)
     - CS: -1d3 Unrest, imprison 1d3 dissidents (convert unrest to imprisoned if available, see Arrest Dissidents action) OR build/upgrade justice structure in random settlement (lowest tier possible)
     - S: -1 Unrest, imprison 1d2 dissidents (convert unrest to imprisoned if available)
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
     - CS: -1d3 Unrest, imprison 1d3 dissidents (convert unrest to imprisoned if available, see Arrest Dissidents action)
     - S: -1 Unrest
     - F: +1 Unrest
     - CF: +1d3 Unrest, damage 1 structure
  3. Manipulate Outcome (P)
     - CS: -1d3 Unrest, +1 Fame, +1d3 Gold, adjust 1 faction +1
     - S: -1 Unrest, +1 Gold
     - F: +1 Unrest, -1 Fame
     - CF: +1d3 Unrest, -1 Fame, adjust 1 faction -1
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

### 5. Plague ✅
- **Dimension:** Public health vs. economy
- **Choices:**
  1. Provide Free Treatment (V)
     - CS: +1 Fame, -1d3 Unrest
     - S: -1 Unrest
     - F: +1 Unrest, -1d3 Gold, -1d4 Food
     - CF: +1d3 Unrest, -1d3 Gold, -2d4 Food, ongoing: plague (-1d4 Food/turn for 2 turns)
  2. Quarantine Effectively (P)
     - CS: -1d3 Unrest
     - S: -1 Unrest
     - F: +1 Unrest, -1d3 Gold
     - CF: +1d3 Unrest, -2d3 Gold
  3. Lock Down Hard (R)
     - CS: -1d3 Unrest, +2d3 Gold (forfeited assets)
     - S: -1 Unrest, +1d3 Gold
     - F: +1 Unrest, damage 1 structure
     - CF: +1d3 Unrest, -1 Fame, destroy 1 structure, adjust 1 faction -1
- **Status:** Complete

### 6. Food Shortage ✅
- **Dimension:** Resource allocation during crisis
- **Choices:**
  1. Feed the People (V)
     - CS: +1 Fame, -1d3 Unrest, -1d4 Food
     - S: -1 Unrest, -1d4 Food
     - F: +1 Unrest, -2d4 Food, 1 army gains sickened
     - CF: +1d3 Unrest, -2d4 Food, 1 random army rolls morale check
  2. Controlled Rationing (P)
     - CS: -1d3 Unrest, -1d4 Food
     - S: -1 Unrest, -1d4 Food
     - F: +1 Unrest, -1d4 Food
     - CF: +1d3 Unrest, -2d4 Food
  3. Prioritize Elite (R)
     - CS: -1d4 Food, imprison 1d4 rioters (convert unrest to imprisoned)
     - S: -1d4 Food, +1 Unrest
     - F: +1d3 Unrest, -1d4 Food, damage 1 structure
     - CF: +1d3 Unrest, -1 Fame, -2d4 Food, damage 1 structure
- **Status:** Complete

### 7. Natural Disaster ✅
- **Dimension:** Crisis priority (bad vs. worse choices)
- **Choices:**
  1. Prioritize Lives (V)
     - CS: +1 Fame, -1d3 Unrest, damage 1 structure
     - S: -1 Unrest, damage 1 structure
     - F: +1 Unrest, damage 1 structure and destroy 1 worksite
     - CF: +1d3 Unrest, destroy 1 structure and 1 worksite
  2. Balanced Response (P)
     - CS: -1d3 Unrest, damage 1 structure
     - S: damage 1 structure
     - F: +1 Unrest, damage 1 structure and destroy 1 worksite
     - CF: +1d3 Unrest, damage 2 structures
  3. Save Assets (R)
     - CS: gain 2d4 choice of Lumber/Stone/Ore (salvaged), +1 Unrest
     - S: damage 1 structure, +1 Unrest
     - F: +1d3 Unrest, -1 Fame, 1 army gains enfeebled
     - CF: +1d3 Unrest, -1 Fame, damage 1 structure, 1 army gains enfeebled
- **Status:** Complete

### 8. Immigration ✅
- **Dimension:** How to handle population influx
- **Choices:**
  1. Welcome All Freely (V)
     - CS: +1 Fame, -1d3 Unrest, gain 1 new worksite
     - S: -1 Unrest, gain 1 new worksite
     - F: +1 Unrest, -1d3 Gold, gain 1 new worksite
     - CF: +1d3 Unrest, -2d3 Gold, gain 1 new worksite
  2. Controlled Integration (P)
     - CS: -1d3 Unrest, gain 2d4 new citizens, +1d3 Gold (skilled workers)
     - S: -1 Unrest, gain 1d4 new citizens
     - F: +1 Unrest, gain 1d4 new citizens
     - CF: +1d3 Unrest
  3. Exploit as Labor (R)
     - CS: +2d3 Gold, +1 Unrest, gain 2 new worksites
     - S: +1d3 Gold, +1 Unrest, gain 2 new worksites
     - F: +1d3 Unrest, -1 Fame, gain 1 new worksite
     - CF: +1d3 Unrest, -1 Fame, adjust 1 faction -1, gain 1 new worksite
- **Status:** Complete

### 9. Assassination Attempt ✅
- **Dimension:** Security vs. civil liberties
- **Choices:**
  1. Open Governance (V)
     - CS: +1 Fame, -1d3 Unrest
     - S: -1 Unrest
     - F: +1 Unrest, -1d3 Gold (medical)
     - CF: +1d3 Unrest, -2d3 Gold, lose 1 leader action
  2. Investigate Thoroughly (P)
     - CS: +1 Fame, -1d3 Unrest, imprison 1d3 conspirators (convert unrest to imprisoned if available)
     - S: -1 Unrest
     - F: +1 Unrest, -1d3 Gold
     - CF: +1d3 Unrest, -2d3 Gold
  3. Purge Conspirators (R)
     - CS: -1d3 Unrest, imprison 1d3 conspirators (convert unrest to imprisoned if available)
     - S: -1 Unrest, imprison 1d2 conspirators (convert unrest to imprisoned if available)
     - F: +1 Unrest, imprison 1d2 innocents (increase imprisoned but do not reduce unrest)
     - CF: +1d3 Unrest, -1 Fame, imprison 1d3 innocents (increase imprisoned but do not reduce unrest)
- **Status:** Complete

---

## Events Requiring Migration ❌

### Justice & Law Enforcement

#### 5. Sensational Crime ❌
- **Dimension:** Law enforcement priorities
- **Choices:**
  1. Launch investigation and bring to justice (V)
     - CS: "The criminals are caught and reformed through fair justice." +1 Fame, -1d3 Unrest, remove 1d3 imprisoned (pardoned/reformed, see Execute Prisoners action)
     - S: "The investigation succeeds and the case is solved." -1 Unrest, convert 1d3 unrest to imprisoned (see Arrest Dissidents action)
     - F: "The case goes cold despite your efforts." +1 Unrest
     - CF: "The investigation fails publicly, undermining confidence." +1d3 Unrest
  2. Increase patrols and security (P)
     - CS: "Crime is prevented through vigilant patrols and confiscated goods fill the treasury." -1d3 Unrest, +1d3 Gold (confiscated goods)
     - S: "The area is secured through increased patrols." -1 Unrest
     - F: "Resources are wasted on ineffective patrols." +1 Unrest
     - CF: "Security measures fail spectacularly." +1d3 Unrest, -1d3 Gold
  3. Make example with harsh crackdown (R)
     - CS: "Crime is eliminated through fear and mass arrests." -1d3 Unrest, imprison 1d3 dissidents (convert unrest to imprisoned if available)
     - S: "Criminals flee in the face of harsh punishment." -1 Unrest, imprison 1d2 dissidents (convert unrest to imprisoned if available)
     - F: "Innocents are caught up in the brutal crackdown." +1 Unrest
     - CF: "The brutal overreach sparks outrage." +1d3 Unrest, -1 Fame, imprison 1d3 innocents (increase imprisoned but do not reduce unrest)
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
     - S: -1 Unrest, imprison 1d2 criminals (convert unrest to imprisoned if available)
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
     - CS: -1d3 Unrest, imprison 1d3 dealers (convert unrest to imprisoned if available)
     - S: -1 Unrest, imprison 1d2 dealers (convert unrest to imprisoned if available)
     - F: +1 Unrest
     - CF: +1d3 Unrest, damage 1 structure
- **Priority:** Medium

### Conflict & Violence

#### 8. Bandit Activity ❌
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
     - CF: +1d3 Unrest, -1d3 Gold, destroy 1 worksite
  3. Hunt them down without mercy (R)
     - CS: -1d3 Unrest, +1d3 Gold (plunder), imprison 1d3 captives (convert unrest to imprisoned if available)
     - S: -1 Unrest, imprison 1d2 captives (convert unrest to imprisoned if available)
     - F: +1 Unrest
     - CF: +1d3 Unrest, -1 Fame, damage 1 structure
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
     - F: +1 Unrest, -1d3 Gold, damage 1 fortification or worksite if no fortification available
     - CF: +1d3 Unrest, -1d3 Gold, destroy 1 fortification or worksite if no fortification available
  3. Launch preemptive strike (R)
     - CS: -1d3 Unrest, +2d3 Gold (plunder), 1 army gains welltrained (see Train Army action)
     - S: -1 Unrest, +1d3 Gold
     - F: +1 Unrest, -1d3 Gold
     - CF: +1d3 Unrest, -2d3 Gold, -1 Fame, 1 army gains fatigued
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
     - CS: -1d3 Unrest, +2d3 Gold (trophy/parts), 1 army gains random equipment upgrade (see Outfit Army action)
     - S: -1 Unrest, +1d3 Gold
     - F: +1 Unrest, -1d3 Gold, damage 1 structure
     - CF: +1d3 Unrest, -2d3 Gold, 1 army gains enfeebled
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
     - CS: +1 Fame, -1d3 Unrest, adjust 2 factions +1 (select 2 different factions)
     - S: -1 Unrest, adjust 1 faction +1
     - F: +1 Unrest
     - CF: +1d3 Unrest, damage 1 structure, adjust 1 faction -1
  2. Monitor and contain their influence (P)
     - CS: -1d3 Unrest
     - S: -1 Unrest
     - F: +1 Unrest, -1d3 Gold
     - CF: +1d3 Unrest, ongoing: cult influence (+1 Unrest/turn for 2 turns)
  3. Suppress cult with force (R)
     - CS: -1d3 Unrest, imprison 1d3 cultists (convert unrest to imprisoned if available)
     - S: -1 Unrest, imprison 1d2 cultists (convert unrest to imprisoned if available)
     - F: +1 Unrest, adjust 1 faction -1
     - CF: +1d3 Unrest, -1 Fame, adjust 2 factions -1 (select 2 different factions)
- **Priority:** Medium

### Religious & Moral Events

#### 14. Pilgrimage ❌
- **Dimension:** How to handle religious influx
- **Choices:**
  1. Welcome all pilgrims freely (V)
     - CS: +1 Fame, -1d3 Unrest, +2d3 Gold (donations), adjust 2 factions +1 (select 2 different factions)
     - S: -1 Unrest, +1d3 Gold, adjust 1 faction +1
     - F: +1 Unrest, -1d3 Gold
     - CF: +1d3 Unrest, -2d3 Gold
  2. Organize and profit from pilgrimage (P)
     - CS: -1d3 Unrest, +2d3 Gold
     - S: -1 Unrest, +1d3 Gold
     - F: +1 Unrest
     - CF: +1d3 Unrest, adjust 1 faction -1
  3. Tax heavily or restrict access (R)
     - CS: +2d3 Gold, adjust 1 faction +1
     - S: +1d3 Gold
     - F: +1 Unrest, adjust 1 faction -1
     - CF: +1d3 Unrest, -1 Fame, adjust 2 factions -1 (select 2 different factions)
- **Priority:** Low

### Political & Diplomatic Events

#### 16. Diplomatic Overture ❌
- **Dimension:** Foreign relations approach
- **Choices:**
  1. Accept with generous terms (V)
     - CS: +1 Fame, +1d3 Gold (trade), adjust 2 factions +1 (select 2 different factions), choose 1 resource type to gain 1d3 per turn for 2 turns (ongoing modifier)
     - S: +1d3 Gold, adjust 1 faction +1
     - F: -1d3 Gold, adjust 1 faction -1
     - CF: -2d3 Gold, adjust 2 factions -1 (select 2 different factions)
  2. Negotiate balanced agreement (P)
     - CS: +2d3 Gold, adjust 2 factions +1 (select 2 different factions)
     - S: +1d3 Gold, adjust 1 faction +1
     - F: adjust 1 faction +1
     - CF: +1 Unrest, adjust 1 faction -1
  3. Demand favorable terms or refuse (R)
     - CS: +2d3 Gold, adjust 1 faction -1, choose 1 resource type to gain 1d3 per turn for 2 turns (ongoing modifier)
     - S: +1d3 Gold, adjust 1 faction -1, choose 1 resource type to gain 1d3 per turn for 2 turns (ongoing modifier)
     - F: -1 Fame, adjust 1 faction -1
     - CF: +1d3 Unrest, -1 Fame, adjust 2 factions -1 (select 2 different factions)
- **Priority:** Medium

#### 17. Festive Invitation ❌
- **Dimension:** How to engage with celebration
- **Choices:**
  1. Attend humbly and join festivities (V)
     - CS: +1 Fame, -1d3 Unrest, adjust 2 factions +1 (select 2 different factions)
     - S: -1 Unrest, adjust 1 faction +1
     - F: adjust 1 faction -1
     - CF: +1 Unrest, adjust 1 faction -1
  2. Attend with appropriate gifts and diplomacy (P)
     - CS: -1d3 Unrest, +1d3 Gold (gifts received), adjust 2 factions +1 (select 2 different factions)
     - S: adjust 1 faction +1
     - F: -1d3 Gold, adjust 1 faction -1
     - CF: -2d3 Gold, adjust 1 faction -1
  3. Use event to display power and military might (R)
     - CS: -1d3 Unrest, +2d3 Gold, adjust 1 faction -1 (rivals), 2 armies gain random equipment upgrade (see Outfit Army action)
     - S: +1d3 Gold, 1 army gains random equipment upgrade, adjust 1 faction -1 (rivals)
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
     - CF: +1 Unrest, adjust 1 faction -1 (celebrity's allies)
  2. Appropriate ceremony and exchange (P)
     - CS: +2d3 Gold (trade/gifts)
     - S: +1d3 Gold
     - F: -1d3 Gold
     - CF: -2d3 Gold
  3. Lavish display to impress and gain favor (R)
     - CS: +2d3 random resource (influence/deals), -1d3 Gold (costs)
     - S: -1d3 Gold, adjust 1 faction +1
     - F: +1 Unrest, -1d3 Gold
     - CF: +1d3 Unrest, -2d3 Gold, adjust 1 faction -1
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
     - CS: +2d3 Gold, adjust 1 faction +1 (nobles), gain 1 random structure
     - S: +1d3 Gold
     - F: +1 Unrest, +1d3 Gold
     - CF: +1d3 Unrest, damage 1 random structure (protests)
- **Priority:** Low

### Economic Events

#### 20. Food Surplus ❌
- **Dimension:** How to use abundance
- **Choices:**
  1. Distribute freely to poor and needy (V)
     - CS: +1 Fame, -1d3 Unrest, 1 settlement gains a structure
     - S: -1d3 Unrest
     - F: -1 Unrest
     - CF: +1d3 Unrest
  2. Store reserves and stabilize prices (P)
     - CS: -1d3 Unrest, gain 2d4 Food (stored)
     - S: gain 1d4 Food (stored)
     - F: -1d3 Gold (storage costs)
     - CF: +1 Unrest, -1d3 Gold
  3. Export for maximum profit (R)
     - CS: +2d3 Gold, adjust 1 faction +1
     - S: +1d3 Gold
     - F: +1 Unrest, +1d3 Gold
     - CF: +1d3 Unrest, -1 Fame, adjust 1 faction -1
- **Priority:** Medium

#### 22. Economic Surge ❌
- **Dimension:** How to capitalize on boom
- **Choices:**
  1. Raise wages and improve worker conditions (V)
     - CS: +1 Fame, -2d3 Unrest, +1d3 Gold
     - S: -1 Unrest, +1d3 Gold
     - F: -1d3 Gold
     - CF: +1 Unrest, -1d3 Gold
  2. Invest in infrastructure and growth (P)
     - CS: +2d3 Gold, gain 2d4 choice of Lumber/Stone/Ore
     - S: +1d3 Gold, gain 1d4 choice resource
     - F: +1d3 Gold
     - CF: +1 Unrest, -1d3 Gold
  3. Maximize taxes and profit (R)
     - CS: +2d3 Gold, -1d3 Unrest (intimidation), 1 settlement gains a structure
     - S: +2d3 Gold, +1 Unrest
     - F: +1d3 Gold, +1d3 Unrest
     - CF: +1d3 Unrest, -1 Fame, damage 1 structure (riot)
- **Priority:** Medium

#### 23. Trade Agreement ❌
- **Dimension:** Terms of trade
- **Choices:**
  1. Generous terms to build friendship (V)
     - CS: +1 Fame, +2d3 Gold (trade), adjust 2 factions +1 (select 2 different factions), choose 1 resource type to gain 1d3 per turn for 2 turns (ongoing modifier)
     - S: +1d3 Gold, adjust 1 faction +1, choose 1 resource type to gain 1d3 per turn for 1 turn (ongoing modifier)
     - F: +1d3 Gold, adjust 1 faction +1
     - CF: adjust 1 faction -1
  2. Balanced mutual benefit (P)
     - CS: +2d3 Gold, adjust 2 factions +1 (select 2 different factions), choose 1 resource type to gain 1d3 per turn for 2 turns (ongoing modifier)
     - S: +1d3 Gold, adjust 1 faction +1, choose 1 resource type to gain 1d3 per turn for 1 turn (ongoing modifier)
     - F: +1d3 Gold
     - CF: adjust 1 faction -1
  3. Extract maximum advantage (R)
     - CS: +2d3 Gold, adjust 1 faction -1, choose 1 resource type to gain 2d3 per turn for 3 turns (ongoing modifier)
     - S: +1d3 Gold, adjust 1 faction -1, choose 1 resource type to gain 1d3 per turn for 2 turns (ongoing modifier)
     - F: +1d3 Gold, -1 Fame, adjust 2 factions -1 (select 2 different factions), choose 1 resource type to gain 1d3 per turn for 1 turn
     - CF: +1 Unrest, -1 Fame, adjust 2 factions -1 (select 2 different factions)
- **Priority:** Medium

#### 24. Land Rush ❌
- **Dimension:** Expansion management
- **Choices:**
  1. Free settlement and land grants (V)
     - CS: +1 Fame, -1d3 Unrest, gain new worksite and a new structure (lowest available tier)
     - S: -1 Unrest, gain new worksite
     - F: -1d3 of a random resource
     - CF: +1 Unrest, -2d3 Gold, -1d3 of a random resource
  2. Controlled development with permits (P)
     - CS: +2d3 Gold, -1d3 Unrest, gain a new structure (lowest available tier)
     - S: +1d3 Gold, -1 Unrest
     - F: +1 Unrest
     - CF: +1d3 Unrest, -1d3 Gold (bribes)
  3. Auction to highest bidders (R)
     - CS: +2d3 Gold, gain new worksite
     - S: +1d3 Gold, gain new worksite
     - F: +1d3 Gold, +1 Unrest
     - CF: +1d3 Unrest, -1 Fame
- **Priority:** Medium

#### 25. Boomtown ❌
- **Dimension:** Rapid growth management
- **Choices:**
  1. Ensure fair housing and worker rights (V)
     - CS: +1 Fame, -1d3 Unrest, gain a new structure
     - S: -1 Unrest, +1d3 Gold
     - F: -1d3 Gold
     - CF: +1d3 Unrest
  2. Regulate growth sustainably (P)
     - CS: +2d3 Gold, gain 2d4 choice of Lumber/Stone, gain a new structure
     - S: +1d3 Gold
     - F: +1 Unrest
     - CF: +1d3 Unrest
  3. Exploit boom for maximum revenue (R)
     - CS: +2d3 Gold, gain 1d3 Gold per turn for next 2 turns (ongoing modifier)
     - S: +2d3 Gold, +1 Unrest
     - F: +1d3 Gold, +1d3 Unrest
     - CF: +1d3 Unrest, -1 Fame
- **Priority:** Medium

#### 26. Demand Expansion ✅ (Keep Current Implementation)

**⚠️ DO NOT MIGRATE - KEEP EXISTING IMPLEMENTATION**

**Why:** This event has sophisticated mechanics that would be broken by strategic choice pattern:
- Auto-selects target hex exactly 2 hexes from border (not adjacent)
- Adds "demanded" feature to hex on map
- Special hex validation (unclaimed OR enemy territory if empty)
- Map interaction with special display color
- Auto-resolution when hex is claimed (free worksite + rewards)
- Ongoing mechanics (+1 unrest per turn until hex claimed OR convinced)

**Current Implementation:** `src/pipelines/events/demand-expansion.ts`

**Skills:** diplomacy, survival, intimidation (standard check pattern)

**No changes needed** - event works correctly as check-based event with special mechanics.

- **Priority:** N/A (not migrating)

#### 27. Demand Structure ✅ (Keep Current Implementation)

**⚠️ DO NOT MIGRATE - KEEP EXISTING IMPLEMENTATION**

**Why:** This event has sophisticated mechanics that would be broken by strategic choice pattern:
- Tier progression logic (demands ONLY next tier in category progression)
- Settlement service integration (registers demands with settlement service)
- Ongoing modifier creation ("+1 Unrest per turn until built")
- Auto-resolution when structure is built (-1d4 unrest, modifier removed)
- Settlement targeting (selects random settlement and structure combination)
- Tier validation (won't demand tier 1 if you have tier 2, demands tier 3 if you have tier 2, etc.)

**Current Implementation:** `src/pipelines/events/demand-structure.ts`

**Skills:** diplomacy, intimidation, society (standard check pattern)

**No changes needed** - event works correctly as check-based event with special mechanics.

- **Priority:** N/A (not migrating)

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
     - CS: +1 Fame, -1d3 Unrest, +1d3 Gold (innovations), adjust 1 faction +1
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
     - CF: +1d3 Unrest, -1 Fame, adjust 1 faction -1
- **Priority:** Medium

#### 30. Remarkable Treasure ❌
- **Dimension:** Wealth distribution
- **Choices:**
  1. Share with all citizens (V)
     - CS: +1 Fame, -1d3 Unrest, +1d3 Gold distributed, adjust 1 faction +1
     - S: -1 Unrest, +1d3 Gold distributed
     - F: (no effect)
     - CF: +1 Unrest
  2. Add to treasury for kingdom projects (P)
     - CS: +2d3 Gold, gain 2d4 choice of Lumber/Stone/Ore
     - S: +2d3 Gold
     - F: +1 Unrest
     - CF: +1 Unrest, +1d3 Gold
  3. Keep for leadership's benefit (R)
     - CS: +2d3 Gold, every leader gets the benefit of a Claim Stipend action (see action for reference)
     - S: +2d3 Gold, +1 Unrest
     - F: +1d3 Gold, +1d3 Unrest
     - CF: +1d3 Gold, +1d3 Unrest, -1 Fame, 1 leader loses action
- **Priority:** Low

#### 31. Scholarly Discovery ❌
- **Dimension:** Knowledge and education policy
- **Choices:**
  1. Open university for all (V)
     - CS: +1 Fame, -1d3 Unrest, adjust 2 factions +1 (select 2 different factions)
     - S: -1 Unrest
     - F: -1d3 Gold
     - CF: +1 Unrest, -1d3 Gold
  2. Funded research institution (P)
     - CS: +2d3 Gold (ongoing: innovations for 2 turns)
     - S: +1d3 Gold
     - F: -1d3 Gold
     - CF: -2d3 Gold
  3. Exclusive academy for elite (R)
     - CS: +2d3 Gold (tuition), adjust 1 faction +1 (nobles)
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
     - CS: +2d3 Gold (plunder), -1d3 Unrest, 2 armies gain welltrained (see Train Army action)
     - S: +1d3 Gold, 1 army gains welltrained
     - F: +1 Unrest, -1d3 Gold
     - CF: +1d3 Unrest, -2d3 Gold
- **Priority:** Low

### Military Events

#### 36. Military Exercises ❌

**Note:** See existing implementation - this event provides army conditions (welltrained, poorly trained, enfeebled) or equipment upgrades (see Train Army and Outfit Army actions).

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
     - CS: -1d3 Unrest, adjust 2 factions -1 (select 2 neighboring factions)
     - S: -1 Unrest, adjust 1 faction -1
     - F: +1 Unrest, adjust 2 factions -1 (select 2 neighboring factions)
     - CF: +1d3 Unrest, adjust 2 factions -1 (select 2 neighboring factions), spawn enemy army
- **Priority:** Low

---

## Migration Priority Order

### Phase 1: High-Impact Moral Events ✅ COMPLETE
1. ~~Plague~~ ✅
2. ~~Food Shortage~~ ✅
3. ~~Natural Disaster~~ ✅
4. ~~Immigration~~ ✅
5. ~~Assassination Attempt~~ ✅

### Phase 2: Common Conflict Events (Priority: High)
6. Bandit Activity
7. Raiders
8. Sensational Crime
9. Notorious Heist

### Phase 3: Economic & Diplomatic (Priority: Medium)
10. Trade Agreement
11. Economic Surge
12. Diplomatic Overture
13. Food Surplus
14. Boomtown
15. Land Rush

### Phase 4: Low-Priority / Beneficial Events (Priority: Low)
16. Good Weather
17. Archaeological Find
18. Grand Tournament
19. Festive Invitation
20. Visiting Celebrity
21. Nature's Blessing

### Phase 5: Remaining Events (Priority: Medium-Low)
22. All others

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

- **Damage Structure** - Damage random structure
- **Destroy Structure** - Completely destroy structure
- **Adjust Faction** - Change faction relations (never ±2 on single faction, adjust 2 factions ±1 instead)
- **Imprison/Remove Imprisoned** - Arrest or free dissidents (see Arrest Dissidents and Execute Prisoners actions)
  - "Convert unrest to imprisoned" = reduces unrest AND adds imprisoned if capacity available
  - "Remove imprisoned" = reduces imprisoned count (parallel to Execute Prisoners action)
- **Spawn Enemy Army** - Create hostile force
- **New Citizens** - Population gains
- **Worksites** - Create or destroy worksites
- **Army Conditions** - welltrained, poorly trained, sickened, fatigued, enfeebled (see Train Army action)
- **Army Equipment** - Random equipment upgrades (see Outfit Army action)
- **Army Morale** - Morale checks
- **Leader Actions** - Claim Stipend benefits (see Claim Stipend action)
- **Structure Gains** - Random structure awards

### 3. Ongoing Effects
- **Ongoing modifiers** - Penalties/bonuses lasting 1-2 turns
- **Resource choice** - Player chooses 1 resource type, gains dice amount per turn (see Harvest Resources or Sell Resources for inline choice pattern)
- Keep duration short (1-2 turns max, 3 turns for exceptional CS outcomes)

### 4. Balance Principles
- **Fame:** Rare, only for reputation-focused events (+/-1)
- **Unrest:** -1d3 to +1d3 (core stability mechanic)
- **Gold:** 1d3 to 2d3 (moderate economy impact)
- **Resources:** 1d4 to 2d4 (infrastructure gains)
- **Faction:** +/-1 per faction, adjust 1-2 different factions
- **Structures:** Damage 1, destroy 1-2 on critical
- **Worksites:** Create/destroy 1-2
- **Imprisoned:** 1d2 to 1d4 (based on severity)

### 5. Personality-Appropriate Outcomes
Match outcome types to personality:

- **Virtuous (V)**: Fame gains (rare), Unrest reduction, community benefits, remove imprisoned (pardon/reform), new citizens, faction improvements
- **Practical (P)**: Balanced resources, infrastructure gains (Lumber/Stone/Ore), sustainable effects, ongoing bonuses
- **Ruthless (R)**: Gold gains, intimidation (Unrest reduction), imprison dissidents (convert unrest to imprisoned), faction penalties for enemies, army benefits

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
- **Reference existing actions** - When using game commands, reference existing action implementations (Arrest Dissidents, Train Army, Outfit Army, Claim Stipend, Execute Prisoners, etc.)
