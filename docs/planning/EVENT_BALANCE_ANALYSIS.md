# Event Balance Analysis

## Key System Rule
**Fame is automatically awarded for every Critical Success roll.** This is built into the system.

When "+1 Fame" appears explicitly in a CS outcome, it's a **bonus Fame** on top of the automatic one, giving **+2 Fame total**. This is used sparingly as a significant reward.

### Fame = Reputation (Not Just "Good" Fame)
Fame represents reputation broadly - the mechanical benefit is a reroll. "Is it better to be feared or loved?" applies here:
- **Virtuous Fame**: Beloved, respected, trusted by the people
- **Practical Fame**: Known for competence, reliability, getting results
- **Ruthless Fame**: Feared, powerful, a kingdom not to be crossed

Bonus Fame can be awarded to ANY approach when the outcome establishes the kingdom's reputation in a memorable way.

---

## Effect Value Reference

| Effect | Value/Unit | Notes |
|--------|------------|-------|
| **RESOURCES** | | |
| Gold | 1.0 | Baseline currency |
| Food | 0.8 | Less flexible than gold |
| Lumber/Stone/Ore | 0.7 | Materials, less liquid |
| Ongoing Gold | 3.0 | Multi-turn benefit (~1/turn × 3 turns) |
| | | |
| **UNREST & FAME** | | |
| Unrest -1 | 1.5 | Reducing unrest is valuable |
| Unrest +1 | -1.5 | Gaining unrest is bad |
| Fame +1 | 2.0 | Bonus Fame (auto Fame on all CS) |
| Fame -1 | -2.0 | Reputation loss hurts |
| Ongoing Unrest | -4.0 | Multi-turn penalty (~1/turn × 3 turns) |
| | | |
| **PRISON SYSTEM** | | |
| Convert 1d3 | 3.0 | Avg 2 unrest→imprisoned |
| Pardon 1d3 | 1.5 | Frees prison space |
| Innocents 1d3 | -3.0 | Prison burden, no benefit |
| | | |
| **FACTIONS** | | |
| Faction +1 | 1.5 | Relationship improvement |
| Faction -1 | -1.5 | Relationship damage |
| Faction -2 | -3.0 | Major diplomatic incident |
| | | |
| **STRUCTURES** | | |
| Structure Damage | -8.0 | ~4-8 gold to repair |
| Structure Destroyed | -15.0 | Total loss + rebuild cost |
| Structure +1 | 8.0 | Free structure (Grand Tournament) |
| | | |
| **TERRITORY** | | |
| Worksite +1 | 5.0 | Ongoing resource benefit |
| Worksite Lost | -5.0 | Lose ongoing benefit |
| Hex Claimed | 6.0 | Territory expansion |
| Hex Lost | -6.0 | Territory contraction |
| Hex Seized by Faction | -8.0 | Territory + creates hostile faction |
| Fortify Hex | 6.0 | Defensive improvement |
| | | |
| **SETTLEMENTS** | | |
| Settlement +1 Level | 10.0 | Major growth (tier progression) |
| Settlement -1 Level | -10.0 | Major decline (tier regression) |
| | | |
| **ARMIES** | | |
| Army Equip | 4.0 | Gear upgrade |
| Army Well Trained | 3.0 | Condition bonus |
| Army Enfeebled | -3.0 | Temporary weakness |
| Army Healed | 3.0 | Restore HP/remove conditions |
| Recruit Allied Army | 12.0 | Free army (major reward) |
| Army Defects | -15.0 | Lose army to enemy (devastating) |
| Spawn Enemy Army | -10.0 | Creates new threat |
| | | |
| **ACTIONS** | | |
| Gain Action | 8.0 | Extra leader action this turn |
| Lose Action | -8.0 | Random leader loses action |

### Dice Averages
| Dice | Average |
|------|---------|
| 1d2 | 1.5 |
| 1d3 | 2.0 |
| 1d4 | 2.5 |
| 2d3 | 4.0 |
| 2d4 | 5.0 |
| 3d3 | 6.0 |

---

## Special Effects Incidence

| Effect Type | Count (CS/S) | Count (F/CF) | Notes |
|-------------|--------------|--------------|-------|
| Fame +1 (bonus) | 31 | 0 | Currently mostly Virtuous; could expand to all approaches |
| Fame -1 | 0 | 18 | Only on CF, mostly Ruthless |
| Structure Damage | 0 | 14 | Only on CF |
| Convert (arrest) | 12 | 0 | Only on CS/S, Ruthless paths |
| Innocents | 0 | 6 | Only on F/CF, Ruthless paths |
| Faction +1 | 4 | 0 | Only on CS/S |
| Faction -1/-2 | 0 | 5 | Only on F/CF |
| Worksite +1 | 1 | 0 | Rare (Bandit only) |
| Worksite Lost | 0 | 1 | Rare (Bandit only) |
| Hex Claimed | 6 | 0 | Land Rush only (all approaches) |
| Army Equip | 2 | 0 | Rare |
| Army Enfeebled | 0 | 3 | Rare |
| Ongoing Gold | 2 | 0 | Drug Den only |
| Ongoing Unrest | 0 | 1 | Cult Activity only |
| Structure +1 | 3 | 0 | Grand Tournament only |

---

## Current Swing Patterns

### Virtuous (Conservative)
- **Typical CS**: +1 Fame (bonus), -1d3 Unrest (+ auto Fame) → Value: ~5 (+2 Fame = 4, -1d3 Unrest = 3, but Fame is earned anyway so bonus = +2)
- **Typical Success**: -1 Unrest → Value: ~1.5
- **Typical Failure**: +1 Unrest → Value: -1.5
- **Typical CF**: +1d3 Unrest → Value: -3
- **Total Swing**: ~8 points (still relatively narrow)

### Practical (Balanced)
- **Typical CS**: -1d3 Unrest, +1d3-2d3 Gold (+ auto Fame) → Value: ~5-7
- **Typical Success**: -1 Unrest, +1d3 Gold → Value: ~3.5
- **Typical Failure**: +1 Unrest or -1d3 Gold → Value: -2 to -3
- **Typical CF**: +1d3 Unrest, -1d3 Gold → Value: -5
- **Total Swing**: ~10-12 points

### Ruthless (High Variance)
- **Typical CS**: -1d3 Unrest, Convert 1d3 or +2d3 Gold (+ auto Fame) → Value: ~6-7
- **Typical Success**: -1 Unrest, Convert 1d2 → Value: ~4
- **Typical Failure**: +1 Unrest, sometimes +innocents → Value: -3 to -5
- **Typical CF**: +1d3 Unrest, -1 Fame, often special effect → Value: -8 to -12
- **Total Swing**: ~15-20 points

---

## Balance Issues Identified

### 1. Flat Virtuous Pattern
**Events**: Many (1-9, 21, 22, 27, 31)
**Issue**: CS = "+1 Fame (bonus), -1d3 Unrest" / CF = "+1d3 Unrest" is too uniform across events
**Recommendation**: Add event-specific bonuses (gold, resources, faction, special effects) to differentiate events

### 2. "No Effect" on Failure
**Events**: 14, 15, 21, 22, 26, 28, 30
**Issue**: Failure = "No effect" feels anticlimactic
**Recommendation**: Add mild negative (-1 Gold, +1 Unrest) for drama

### 3. Military Exercises is Broken
**Event**: 30
**Issue**: All 3 approaches have IDENTICAL outcomes - defeats purpose of choice
**Recommendation**: Differentiate approaches:
- Virtuous: Training focus (Well Trained condition)
- Practical: Equipment focus (gear upgrades)  
- Ruthless: Aggressive drills (risk of injury, but bigger gains)

### 4. Ruthless Gold Too High
**Events**: 14-18 (economic events)
**Issue**: Ruthless CS: +3d3 Gold (avg 6) vs Practical CS: +2d3 (avg 4)
**Problem**: Makes "greed is always best" optimal strategy
**Recommendation**: Cap at 2d3-2d4, add more risk to balance

### 5. Success = CS-Light
**Events**: Many
**Issue**: Success is often just CS without the bonus, feels flat
**Recommendation**: Consider small secondary effect to differentiate

### 6. Ongoing Effects Underutilized
**Events**: Only 31 (Drug Den), 34 (Cult Activity)
**Issue**: Multi-turn effects add depth but are rarely used
**Recommendation**: Add more ongoing rewards/penalties to create lasting consequences

### 7. Bonus Fame Too Concentrated
**Events**: Currently 31 explicit "+1 Fame" entries, almost all Virtuous
**Issue**: Fame = reputation, can be earned through fear OR love
**Recommendation**: Add bonus Fame to memorable Ruthless/Practical CS outcomes:
- Ruthless: "Your swift, brutal response becomes legendary" (+1 Fame)
- Practical: "Your efficient handling becomes a model for other kingdoms" (+1 Fame)

### 8. Immigration Uses Invalid "Labor" Effect
**Event**: 8 (Immigration)
**Issue**: Outcomes list "+1d3 Labor", "+1d2 Labor", "+1 Labor" but Labor is not a tracked resource
**Recommendation**: Replace with valid effects based on scale:
- CS: `+1 Worksite` (refugees establish a permanent work camp)
- S: `+1d3 Resources` (one-time contribution from refugee skills)
- Or use combination of Gold + reduced Unrest

---

## Swing Recommendations

### Current State
The swing feels **too narrow for Virtuous** (safe but boring) and **adequate for Ruthless** (risky but rewarding). Practical is in a good middle ground.

### Proposed Target Ranges

| Approach | CS Target | Success Target | Failure Target | CF Target | Total Swing |
|----------|-----------|----------------|----------------|-----------|-------------|
| Virtuous | +4 to +6 | +1 to +3 | -1 to -2 | -4 to -6 | **10-12 pts** |
| Practical | +5 to +8 | +2 to +4 | -2 to -3 | -5 to -8 | **12-16 pts** |
| Ruthless | +6 to +10 | +3 to +5 | -3 to -5 | -8 to -14 | **16-24 pts** |

*Note: Values exclude auto-Fame on CS which applies to all approaches*

### Approach Differentiation Guidelines

| Approach | Primary Rewards | Primary Risks | Unique Effects |
|----------|-----------------|---------------|----------------|
| **Virtuous** | Faction, Pardon, low Unrest | Mild resource loss | Diplomatic bonuses |
| **Practical** | Gold, Resources, Worksites | Moderate all-around | Economic focus |
| **Ruthless** | Convert, Army buffs, high Gold | Fame loss, Structure damage, Innocents | Power/control effects |

---

## Action Economy Analysis

### Action Value Calculation

Actions are the fundamental currency of kingdom turns. Each leader can take one action per turn, and actions enable:
- Resource generation (Sell Surplus, Harvest Resources)
- Territory expansion (Claim Hexes, Build Roads)
- Problem solving (Deal with Unrest, Resolve Events)
- Strategic positioning (Military operations, Diplomatic relations)

**Valuation Methodology:**

1. **Baseline Action Value**: Average value of a standard kingdom action
   - Resource actions: ~2-5 gold equivalent (Sell Surplus, Harvest)
   - Territory actions: ~5-8 value (Claim Hexes, Build Roads)
   - Problem-solving: ~3-6 value (Deal with Unrest)
   - **Average action value: ~6-8 points**

2. **Opportunity Cost**: Losing an action means:
   - Cannot address urgent problems (unrest, events)
   - Missed resource generation
   - Delayed strategic goals
   - **Penalty multiplier: 1.0-1.2x** (higher if kingdom is in crisis)

3. **Timing Impact**: Actions are more valuable when:
   - High unrest needs addressing
   - Events are pending
   - Resources are critically low
   - Territory expansion is time-sensitive

**Recommended Values:**
- **Gain Action**: +8 points (bonus action = extra opportunity)
- **Lose Action**: -8 points (lost opportunity + disruption)

**Usage Guidelines:**
- **Gain Action** should be rare (CS only, special events)
- **Lose Action** appropriate for CF on high-stakes events
- Consider faction/character-specific action loss for narrative impact

### Current Action Effect Usage

| Event/Incident | Outcome | Effect | Notes |
|----------------|---------|--------|-------|
| Remarkable Treasure | Ruthless CF | Lose Action | Greed costs leadership time |
| Assassination Attempt | Ruthless CF | Lose Action | Leader distracted by paranoia |
| Assassin Attack (incident) | Always | Lose Action | Leader targeted, must recover |
| Noble Conspiracy (incident) | Always | Lose Action | Leader dealing with conspiracy |

**Pattern**: Currently only used for **Lose Action** on CF or incidents. **Gain Action** is not yet implemented in any events.

### Potential Use Cases

**Gain Action (Bonus Action):**
- **Diplomatic CS**: Allied nation sends advisor (+1 action for turn)
- **Economic Surge CS**: Efficient systems free up leadership time
- **Scholarly Discovery CS**: Innovation streamlines governance
- **Good Weather CS**: Favorable conditions accelerate work

**Lose Action (Action Loss):**
- **Assassination Attempt CF**: Leader paranoid, distracted
- **Scandal CF**: Leader dealing with fallout
- **Conspiracy CF**: Leader investigating betrayal
- **Plague CF**: Leader ill or quarantined

---

## Underutilized Effects (Now Integrated)

These handlers exist in the codebase but are rarely used in events. **All effects are now integrated into the balance editor** and available for use:

| Effect | Value | Handler | Current Usage | Potential Events |
|--------|-------|---------|---------------|------------------|
| **Settlement +1 Level** | +10 | `IncreaseSettlementLevelHandler` | Never in events | Immigration CS, Boomtown CS |
| **Settlement -1 Level** | -10 | `ReduceSettlementLevelHandler` | Incidents only | Plague CF, Disaster CF, Raid CF |
| **Hex Seized by Faction** | -8 | `SeizeHexesHandler` | Incidents only | Ruthless CF (rebel uprising) |
| **Lose Border Hexes** | -6 | `RemoveBorderHexesHandler` | Incidents only | Raider CF, Diplomatic failure |
| **Fortify Hex** | +6 | `fortifyHexExecution` | Actions only | Military Exercises CS |
| **Recruit Allied Army** | +12 | `RequestMilitaryAidHandler` | Actions only | Diplomatic CS, Festival CS |
| **Armies Defect** | -15 | `DefectArmiesHandler` | Incidents only | Ruthless CF on army events |
| **Spawn Enemy Army** | -10 | `SpawnEnemyArmyHandler` | Incidents only | Monster CF, Raider CF |
| **Heal Army** | +3 | `tendWoundedExecution` | Actions only | Good Weather CS (recovery) |
| **Gain Action** | +8 | Not yet implemented | **Never used** | Diplomatic CS, Economic CS, Scholarly CS |
| **Lose Action** | -8 | `SpendPlayerActionHandler` | 4 events/incidents | Scandal CF, Plague CF, Conspiracy CF |

**Integration Status:**
- ✅ All effects added to balance-editor.html
- ✅ Values documented and consistent
- ✅ Available in dropdown menu for event design
- ✅ CSV export/import supported
- ⚠️ Gain Action handler needs implementation

---

## Priority Fixes

1. **Fix Immigration**: Replace invalid "Labor" effects with Worksite/Resources
2. **Fix Military Exercises**: Make the 3 approaches meaningfully different
3. **Eliminate "No effect"**: Replace with mild consequences on all Failures  
4. **Diversify CS Rewards**: Add event-specific bonuses beyond just Fame + unrest reduction
5. **Balance Ruthless Gold**: Reduce max gold on economic events, increase risk/special effects
6. **Add More Ongoing Effects**: Create lasting consequences beyond single-turn impacts
7. **Distribute Bonus Fame**: Add "+1 Fame" to select Ruthless/Practical CS where reputation is earned through fear or competence
8. **✅ Integrate All Effects**: All underutilized effects now in balance editor (COMPLETED)
9. **Use Integrated Effects**: Add settlement level changes, hex seizures, army recruitment, action effects to appropriate events
10. **Implement Gain Action Handler**: Create `GrantPlayerActionHandler` to enable bonus action rewards

