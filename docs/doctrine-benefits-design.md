# Doctrine Benefits System Design

## Overview

This document defines the doctrine benefits system for ReignMaker.

**Core Principle: Use Actual PF2e Feats**
- We grant real PF2e feats from the compendium to actors (army NPCs or player characters)
- The PF2e system handles all mechanical effects automatically
- No custom feat implementations needed - just feat selection/granting logic

**Hybrid Unlock System:**
- **Any-Doctrine Feats**: Available if *any* doctrine reaches the tier threshold
- **Dominant-Only Feats**: Require doctrine to be dominant AND at tier

**Implementation Priority:**
1. Army Feats (via Training Action)
2. Leader Feats (granted at Absolute tier)
3. Unique Structures
4. Unique Army Types

---

## 1. Army Feats (Actual PF2e Feats)

### Acquisition: Training Action + Doctrine Unlock

- **Training Action**: Kingdom action that grants a feat to an army (costs resources/time)
- **Doctrine Unlock**: Reaching doctrine tiers unlocks which feats can be trained

| Doctrine Tier | Feat Tier Unlocked |
|---------------|-------------------|
| Minor (20 pts) | Tier 1 feats |
| Moderate (40 pts) | Tier 2 feats |
| Major (80 pts) | Tier 3 feats |
| Absolute (160 pts) | Tier 4 feats |

### Feat Slot System

| Army Level | Feat Slots |
|------------|------------|
| 1-4 | 1 |
| 5-9 | 2 |
| 10-14 | 3 |
| 15+ | 4 |

---

## 2. Feat Lists by Doctrine

### IDEALIST (Protection, Healing, Inspiration) - 15 Feats

#### Tier 1 Feats (Minor - 20 pts)
| Feat | Level | Source | Key Mechanic |
|------|-------|--------|--------------|
| Shield Block | 1 | General | Reaction: Reduce damage by shield Hardness |
| Toughness | 1 | General | +HP/level, recovery check DC = 9 |
| Battle Medicine | 1 | Skill (Medicine) | Heal in combat, 1 action |
| Diehard | 1 | General | Dying increases at 5 instead of 4 |

#### Tier 2 Feats (Moderate - 40 pts)
| Feat | Level | Source | Key Mechanic |
|------|-------|--------|--------------|
| Continual Recovery | 2 | Skill (Medicine) | Treat Wounds cooldown reduced to 10 min |
| Ward Medic | 2 | Skill (Medicine) | Treat multiple creatures at once |
| Bon Mot | 1 | Skill (Diplomacy) | Witty quip debuffs enemy Will/Perception |
| Marshal Dedication | 2 | Archetype | 15-ft aura: +1 fear saves |

#### Tier 3 Feats (Major - 80 pts) - Dominant Only
| Feat | Level | Source | Key Mechanic |
|------|-------|--------|--------------|
| Inspiring Marshal Stance | 4 | Marshal | 15-ft aura: +1 attack & mental saves |
| Aura of Courage | 4 | Champion | Reduce frightened for self & allies in aura |
| Shield Warden | 6 | Fighter/Champion | Shield Block protects adjacent allies |
| Sentinel Dedication | 2 | Archetype | Heavy armor proficiency |

#### Tier 4 Feats (Absolute - 160 pts) - Dominant Only
| Feat | Level | Source | Key Mechanic |
|------|-------|--------|--------------|
| Champion Dedication | 2 | Archetype | Divine cause, devotion abilities |
| Lay on Hands | - | Champion Focus | Devotion spell: reliable divine healing |
| Group Coercion | 4 | Skill (Diplomacy) | Make Impression on multiple creatures |

---

### PRACTICAL (Efficiency, Tactics, Terrain) - 15 Feats

#### Tier 1 Feats (Minor - 20 pts)
| Feat | Level | Source | Key Mechanic |
|------|-------|--------|--------------|
| Fleet | 1 | General | +5 feet Speed |
| Combat Climber | 1 | Skill (Athletics) | Not flat-footed climbing, one-hand climb |
| Incredible Initiative | 1 | General | +2 circumstance to initiative |
| Specialty Crafting | 1 | Skill (Crafting) | +2 to Craft specialty items |
| Cat Fall | 1 | Skill (Acrobatics) | Treat falls as 10-50 feet shorter |
| Streetwise | 1 | Skill (Society) | Use Society for Gather Information |

#### Tier 2 Feats (Moderate - 40 pts)
| Feat | Level | Source | Key Mechanic |
|------|-------|--------|--------------|
| Titan Wrestler | 1 | Skill (Athletics) | Grapple creatures 2 sizes larger |
| Assurance | 1 | Skill (varies) | Take 10 + proficiency (no roll) |
| Canny Acumen | 1 | General | Expert in save or Perception |
| Quick Repair | 1 | Skill (Crafting) | Repair items in 1 minute |

#### Tier 3 Feats (Major - 80 pts) - Dominant Only
| Feat | Level | Source | Key Mechanic |
|------|-------|--------|--------------|
| Magical Crafting | 2 | Skill (Crafting) | Craft magic items |
| Powerful Leap | 2 | Skill (Athletics) | Jump farther and higher |
| Wall Jump | 7 | Skill (Athletics) | Jump off walls during climb |

#### Tier 4 Feats (Absolute - 160 pts) - Dominant Only
| Feat | Level | Source | Key Mechanic |
|------|-------|--------|--------------|
| Inventor | 7 | Skill (Crafting) | Invent new formulas without examples |
| Legendary Professional | 15 | Skill (varies) | Legendary-tier professional income |

---

### RUTHLESS (Fear, Intimidation, Aggression) - 15 Feats

#### Tier 1 Feats (Minor - 20 pts)
| Feat | Level | Source | Key Mechanic |
|------|-------|--------|--------------|
| Intimidating Glare | 1 | Skill (Intimidation) | Demoralize without speaking |
| Titan Wrestler | 1 | Skill (Athletics) | Grapple creatures 2 sizes larger |
| Coercion | 1 | Skill (Intimidation) | Use Intimidation for Requests |
| Cat Fall | 1 | Skill (Acrobatics) | Reduce fall damage (ambush from heights) |

#### Tier 2 Feats (Moderate - 40 pts)
| Feat | Level | Source | Key Mechanic |
|------|-------|--------|--------------|
| Intimidating Prowess | 2 | Skill (Intimidation) | +1/+2 bonus when physically menacing |
| Lasting Coercion | 2 | Skill (Intimidation) | Coerced targets comply longer |
| Marshal Dedication | 2 | Archetype | 15-ft aura: +1 fear saves |
| Reactive Strike | 1 | Fighter | Reaction attack when enemies trigger |

#### Tier 3 Feats (Major - 80 pts) - Dominant Only
| Feat | Level | Source | Key Mechanic |
|------|-------|--------|--------------|
| Dread Marshal Stance | 4 | Marshal | Aura: +dmg dice, crits = Frightened 1 |
| Battle Cry | 7 | Skill (Intimidation) | Free Demoralize on initiative (Master) |
| Terrified Retreat | 7 | Skill (Intimidation) | Frightened 3+ enemies must flee |
| Swift Sneak | 7 | Skill (Stealth) | Move full Speed while Sneaking |
| Aggressive Block | 2 | Fighter | Shield Block + Shove enemy |

#### Tier 4 Feats (Absolute - 160 pts) - Dominant Only
| Feat | Level | Source | Key Mechanic |
|------|-------|--------|--------------|
| Scare to Death | 15 | Skill (Intimidation) | Will save or Frightened 2 / death |
| Disruptive Stance | 10 | Fighter | Reactive Strike on concentrate actions |

---

## 3. Leader Feats (Actual PF2e Feats)

### Acquisition: Absolute Tier + Dominant + Player Choice

When a doctrine reaches **Absolute tier (160 pts) AND is dominant**, the player chooses one feat from that doctrine's list to grant to a kingdom leader (player character).

### Idealist Leader Feats (Choose 1 at Absolute)

| Feat Name | PF2e Level | Thematic Fit |
|-----------|------------|--------------|
| **Group Impression** | 1 | Influence masses |
| **Glad-Hand** | 2 | Instant rapport |
| **Evangelize** | 4 | Spread ideology |
| **Legendary Negotiation** | 15 | Negotiate with hostile |

### Practical Leader Feats (Choose 1 at Absolute)

| Feat Name | PF2e Level | Thematic Fit |
|-----------|------------|--------------|
| **Magical Crafting** | 2 | Create magic items |
| **Inventor** | 7 | Prototype equipment |
| **Unified Theory** | 15 | Arcana for all magic |
| **Legendary Professional** | 15 | Master of trade |

### Ruthless Leader Feats (Choose 1 at Absolute)

| Feat Name | PF2e Level | Thematic Fit |
|-----------|------------|--------------|
| **Intimidating Glare** | 1 | Wordless menace |
| **Lasting Coercion** | 2 | Extended compliance |
| **Terrified Retreat** | 7 | Break enemy will |
| **Scare to Death** | 15 | Lethal intimidation |

---

## 4. Unique Structure Categories

### Structure Unlock: Tier-Based (Any Doctrine)

Structures unlock when their associated doctrine reaches the tier threshold.
However, **Tier 4 structures require doctrine to be dominant**.

---

### Idealist: Sanctuaries

Theme: Healing, morale, spiritual protection

| Tier | Structure | Cost | Effects |
|------|-----------|------|---------|
| 1 | **Shrine** | 10 lumber, 5 stone | +1 Religion; Heal 1 wounded unit per turn |
| 2 | **Chapel** | 20 lumber, 15 stone, 5 gold | +2 Religion; Settlement immune to fear events |
| 3 | **Temple** | 40 lumber, 30 stone, 20 gold | +3 Religion; Armies heal 10% HP between battles |
| 4 (D) | **Cathedral** | 80 lumber, 60 stone, 50 gold | +3 Religion/Medicine; Armies recruited here start with 1 Idealist feat |

### Practical: Academies

Theme: Knowledge, research, efficiency

| Tier | Structure | Cost | Effects |
|------|-----------|------|---------|
| 1 | **Study** | 15 lumber, 5 gold | +1 Lore; Research actions take -1 turn |
| 2 | **Library** | 30 lumber, 10 stone, 15 gold | +2 Arcana/Society; Can copy spell scrolls |
| 3 | **College** | 50 lumber, 25 stone, 40 gold | +3 Arcana; Army training costs -50% |
| 4 (D) | **Grand Academy** | 80 lumber, 50 stone, 80 gold | +3 to two skills of choice; Leaders gain bonus skill feat |

### Ruthless: Dominions

Theme: Control, punishment, fear

| Tier | Structure | Cost | Effects |
|------|-----------|------|---------|
| 1 | **Stocks** | 10 lumber | +1 Intimidation; Public punishment (trade 1 prisoner for -1 unrest) |
| 2 | **Dungeon** | 20 stone, 10 ore | +2 Intimidation; Interrogate prisoners for intel (+1 to next event DC) |
| 3 | **Arena** | 40 stone, 20 ore, 20 gold | +2 Intimidation/Athletics; Convert 1 unrest to 1 fame (1/turn) |
| 4 (D) | **Colosseum** | 80 stone, 40 ore, 60 gold | +3 Intimidation; Armies can train here for free; Gladiatorial games (-2 unrest/turn) |

---

## 5. Unique Army Types

### Unlock: Major Tier (80 pts) + Dominant

Unique army types require the doctrine to be at Major tier AND dominant.

---

### Idealist: Crusaders

**Theme:** Holy warriors, defensive specialists, morale anchors

| Stat | Value |
|------|-------|
| Type | Heavy Infantry |
| Base HP | Level × 12 (vs standard × 10) |
| AC Bonus | +1 |
| Damage | Standard |

**Innate Abilities:**
- **Fearless**: Immune to Frightened condition
- **Retributive Strike**: When adjacent ally is hit, can reaction attack the attacker
- **Lay on Hands**: Once per battle, heal self or adjacent ally for 20% HP

**Restrictions:**
- Cannot use "No Quarter" or similar ruthless tactics
- Must protect civilian settlements (cannot raze)

---

### Practical: War Engineers

**Theme:** Siege specialists, battlefield control, support

| Stat | Value |
|------|-------|
| Type | Support |
| Base HP | Level × 8 |
| AC Bonus | 0 |
| Damage | Low vs units, High vs structures |

**Innate Abilities:**
- **Siege Expertise**: +4 damage against structures/fortifications
- **Field Fortifications**: Can create temporary cover (+2 AC) for allied armies (takes 1 round)
- **Sapper**: Ignore enemy fortification bonuses

**Restrictions:**
- -2 to attack rolls against non-structure targets
- Cannot initiate charges

---

### Ruthless: Reavers

**Theme:** Fast raiders, high damage, resource acquisition

| Stat | Value |
|------|-------|
| Type | Light Cavalry |
| Base HP | Level × 8 |
| AC Bonus | -1 (glass cannon) |
| Damage | +2 |

**Innate Abilities:**
- **Pillage**: After winning battle, gain 1d4 resources (player choice)
- **Brutal Charge**: +3 damage on first attack when charging
- **Hit and Run**: Can attack and move in same turn

**Restrictions:**
- Cannot take prisoners (all defeated enemies are killed)
- -2 to defensive saves
- Causes +1 unrest in conquered territories

---

## 6. Implementation Notes

### Core Approach: PF2e Compendium Integration

Since we're using actual PF2e feats, the implementation is straightforward:

1. **Define feat mappings** - Which compendium feats unlock at which doctrine/tier
2. **Create Training Action** - Pipeline action that grants feats to army NPC actors
3. **Create Leader Grant** - Milestone trigger that grants feats to player characters
4. **Build Selection UI** - Show available feats based on current doctrine state

### Data Structures

```typescript
// Doctrine Feat Mapping (simple - just references compendium IDs)
interface DoctrineFeatConfig {
  compendiumId: string;      // e.g., "Compendium.pf2e.feats-srd.jM72TjJ965jocBV8"
  name: string;              // Display name for UI
  tier: 1 | 2 | 3 | 4;
  doctrine: DoctrineType;
  requiresDominant: boolean;
  armyTypeRestriction?: ArmyType[];  // Optional: e.g., only infantry
  levelRequirement?: number;          // Optional: army level requirement
}

// Leader feat is same structure, just for player characters
interface LeaderFeatConfig extends DoctrineFeatConfig {
  pf2eLevel: number;  // For display purposes
}
```

### Granting Feats to Actors

```typescript
// Use Foundry's built-in item creation from compendium
async function grantFeatToActor(actor: Actor, compendiumId: string): Promise<void> {
  const feat = await fromUuid(compendiumId);
  if (feat) {
    await actor.createEmbeddedDocuments('Item', [feat.toObject()]);
  }
}
```

### Files to Create/Modify

**New Files:**
- `src/constants/doctrineFeatMappings.ts` - Compendium ID mappings for all feats
- `src/pipelines/actions/trainArmy.ts` - Training action (may already exist, add feat granting)
- `src/services/doctrine/DoctrineFeatService.ts` - Logic for checking available feats

**Modified Files:**
- `src/services/doctrine/DoctrineService.ts` - Add `getAvailableArmyFeats()` and `getAvailableLeaderFeats()`
- `src/view/kingdom/tabs/ArmiesTab.svelte` - Add feat display on army cards
- Milestone system - Trigger leader feat selection at Absolute tier

### Training Action Flow

1. Player selects "Train Army" action
2. System checks:
   - Army's current feat count vs max slots
   - Kingdom's doctrine tiers
   - Which feats are already on the army
3. Shows available feats (filtered by above)
4. Player selects feat
5. Skill check (success required?)
6. On success: `grantFeatToActor(armyActor, selectedFeatId)`

### Leader Feat Flow

1. Doctrine reaches Absolute tier + is dominant
2. Milestone triggers → show feat selection dialog
3. Player chooses from doctrine's leader feat list
4. `grantFeatToActor(leaderActor, selectedFeatId)`
5. Record milestone so it doesn't trigger again

---

## 7. Design Decisions (Resolved)

| Question | Decision |
|----------|----------|
| Feat Training UI | Dedicated "Training Action" in kingdom actions |
| Leader Feat Selection | Player chooses from list when Absolute tier reached |
| Army Restrictions | Strong restrictions (behavioral limits) for unique armies |
| Combat Integration | Full integration - PF2e system handles feat mechanics |
| Prerequisites | IGNORE for army training (doctrine tier gates access) |

---

## 8. Sources

- [Shield Block](https://2e.aonprd.com/Feats.aspx?ID=839)
- [Battle Medicine](https://2e.aonprd.com/Feats.aspx?ID=760)
- [Marshal Archetype](https://2e.aonprd.com/Archetypes.aspx?ID=66)
- [Sentinel Dedication](https://2e.aonprd.com/Feats.aspx?ID=2062)
- [Intimidation Feats](https://2e.aonprd.com/Feats.aspx?Traits=144&Skill=Intimidation)
- [Crafting Feats](https://2e.aonprd.com/Feats.aspx?Traits=144&Skill=Crafting)
- [Athletics Feats](https://2e.aonprd.com/Feats.aspx?Traits=144&Skill=Athletics)

---

## 9. Next Steps

1. **Get Exact Compendium IDs** - Load feats in Foundry and extract UUIDs
2. **Check NPC Compatibility** - Verify army NPCs can receive these feats
3. **Build Training Action** - Create pipeline action for feat selection/granting
4. **Test Feat Effects** - Verify PF2e system applies feat effects correctly to NPCs
