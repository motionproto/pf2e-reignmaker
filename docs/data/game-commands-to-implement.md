# Game Commands To Implement

This file tracks game commands that need to be created as part of the pipeline migration for incidents/events.

---

## destroyWorksite

**Purpose**: Randomly select and completely destroy worksite(s)

**Parameters**:
- `count` (number or dice formula, default: 1): Number of worksites to destroy
  - Can be a static number: `1`, `2`, `3`
  - Can be a dice formula: `1d3`, `2d4`, etc.
  - Dice will be rolled at execution time

**Used By**: 
- Bandit Activity (incident) - Critical Failure: `destroyWorksite(1)`
- Infrastructure Damage (incident) - Critical Failure: `destroyWorksite(1)`
- Emigration Threat (incident) - Failure: `destroyWorksite(1)`, Critical Failure: `destroyWorksite("1d3")`
- Mass Exodus (incident) - Failure: `destroyWorksite(1)`, Critical Failure: `destroyWorksite(1)` + `damageStructure(1)`
- [Add others as discovered]

**Behavior**:
1. Roll dice if count is a formula (e.g., "1d3" → rolls to 2)
2. Get all worksites in kingdom territory
3. Randomly select `count` worksites (without replacement)
4. For each selected worksite:
   - Remove worksite from hex
   - Clear all construction progress
   - Update income calculations
   - Log destruction to kingdom activity feed
5. Display summary of all destroyed worksites

**Edge Cases**:
- No worksites exist: Show message "No worksites to destroy" and skip
- Multiple worksites on same hex: Each worksite is separate target

**Data Required**:
- Read: Kingdom hexes, worksite data
- Write: Remove worksite from hex data, trigger income recalculation

**UI Feedback**:
- Show which worksite was destroyed
- Show location (hex coordinates)
- Show impact on resources/income

**Implementation Priority**: High (needed for Bandit Activity incident)

**Related Commands**:
- `damageStructure` - Partial damage vs complete destruction (should accept count parameter)
- `removeStructure` - Generic structure removal (worksites are structures)

---

## consumePlayerAction (or markActionUsed)

**Purpose**: Mark a randomly selected leader's Kingdom action as already used for the current turn

**Parameters**:
- None (random selection) OR
- `playerId` (optional): Specific player to target

**Used By**: 
- Assassination Attempt (incident) - Critical Failure: Randomly select one leader
- Noble Conspiracy (incident) - Critical Failure: Randomly select one leader
- [Add others as discovered]

**Behavior**:
1. Get list of all leaders/player characters with Kingdom actions
2. Randomly select one (or use specified playerId)
3. Mark their action as consumed for current turn in actionLog
4. Update action tracker UI to show as used
5. Log to kingdom activity feed: "[Leader Name]'s action consumed by Assassination Attempt"

**Edge Cases**:
- Leader already used their action: No effect (already consumed)
- No leaders available: Show message and skip
- Leader has no Kingdom action this turn: Skip to next random leader

**Data Required**:
- Read: actionLog, leadership roster
- Write: actionLog entry marking action as consumed

**UI Feedback**:
- Show which leader lost their action
- Action tracker updates immediately
- Action system already handles preventing duplicate actions and showing warnings

**Implementation Priority**: High (needed for Assassination Attempt incident)

**Implementation Notes**:
- Should be trivial - just add entry to actionLog for selected leader
- Existing action system handles all validation and UI updates

**Related Commands**:
- `restorePlayerAction` - Undo effect (for critical success outcomes?)
- `grantBonusAction` - Opposite effect (extra action)

---

## downgradeSettlement

**Purpose**: Reduce a settlement's level by 1 (e.g., Town → Village, City → Town)

**Parameters**:
- `settlementId` (optional): Specific settlement to target, or random if not specified
- `levels` (number, default: 1): Number of levels to downgrade

**Used By**: 
- Settlement Crisis (incident) - Critical Failure: Downgrade 1 level + damage structures
- [Add others as discovered]

**Behavior**:
1. Select target settlement (random or specified)
2. Check current settlement level
3. Downgrade by specified levels (min: Village level, can't go below)
4. Update settlement capacity limits based on new level
5. Check if current structures exceed new capacity
6. Log to kingdom activity feed

**Edge Cases**:
- Already at Village level: Show message "Cannot downgrade Village further" and skip
- No settlements exist: Show message and skip
- Structures exceed new capacity: Warn but allow (require manual structure removal)

**Data Required**:
- Read: Settlement data, settlement levels
- Write: Settlement level, recalculate capacities

**UI Feedback**:
- Show which settlement was downgraded
- Show old level → new level
- Warn if structures now exceed capacity
- Update settlement display immediately

**Implementation Priority**: High (needed for Settlement Crisis incident)

**Related Commands**:
- `upgradeSettlement` - Opposite effect
- `destroySettlement` - Complete removal

---

## removeHexes (or raidBorderHexes)

**Purpose**: Remove hexes from kingdom territory (typically border hexes)

**Parameters**:
- `count` (number or dice formula, default: 1): Number of hexes to remove
- `borderOnly` (boolean, default: true): Only select border hexes

**Used By**: 
- Border Raid (incident) - Removes border hexes from kingdom
- [Add others as discovered]

**Behavior**:
1. Roll dice if count is a formula
2. Get all border hexes (hexes adjacent to unclaimed territory)
3. Randomly select `count` border hexes
4. Show hex picker UI (read-only mode):
   - Display kingdom map
   - Highlight selected hexes in red
   - Show "OK" button to confirm (NOT to choose)
   - This gives visual feedback of what will be lost
5. On confirmation, remove hexes from kingdom territory
6. Update territory calculations
7. Check if any structures/worksites were on removed hexes (warn/remove)
8. Log to kingdom activity feed

**Edge Cases**:
- No border hexes available: Show message "No border hexes to raid" and skip
- Count exceeds available border hexes: Remove all border hexes, warn
- Structures on removed hexes: Automatically remove structures, show warning
- Worksites on removed hexes: Automatically remove, show warning

**Data Required**:
- Read: Kingdom hexes, border detection
- Write: Remove hexes from kingdom data, update territory count

**UI Feedback**:
- Interactive hex map showing selected hexes (red highlights)
- Summary of affected structures/worksites
- Confirmation button (not a choice, just acknowledgment)
- Updated territory count after removal

**Implementation Priority**: Medium-High (needed for Border Raid incident)

**Technical Notes**:
- Reuse existing hex picker component but in "view-only" mode
- System pre-selects hexes, player just confirms
- Need border hex detection algorithm

**Related Commands**:
- `claimHexes` - Opposite effect (expand territory)
- `abandonHex` - Single hex removal (player choice)

---

## transferHexesToFaction

**Purpose**: Transfer ownership of hexes from kingdom to a faction

**Parameters**:
- `factionId` (string): Target faction to receive hexes (e.g., "rebels")
- `count` (number or dice formula): Number of hexes to transfer
- `restrictions` (object):
  - `adjacent` (boolean, default: true): Hexes must be adjacent to each other
  - `noSettlements` (boolean, default: true): Exclude hexes with settlements
  - `borderOnly` (boolean, default: false): Only select border hexes

**Used By**: 
- Guerrilla Movement (incident) - Failure: 1d3 hexes, Critical Failure: 2d6+3 hexes to Rebels
- [Add others as discovered]

**Behavior**:
1. Roll dice if count is a formula
2. Get eligible hexes based on restrictions:
   - Filter out settlement hexes if `noSettlements: true`
   - Find connected groups if `adjacent: true`
3. Randomly select `count` hexes meeting restrictions
4. Transfer hex ownership from kingdom to faction
5. Update territory counts for both kingdom and faction
6. Show hex picker UI (view-only) with transferred hexes highlighted
7. Log to kingdom activity feed

**Edge Cases**:
- No eligible hexes: Show message and skip
- Count exceeds available hexes: Transfer all eligible hexes, warn
- Adjacent requirement can't be met: Relax to "mostly adjacent" or skip
- Faction doesn't exist: Create faction first, then transfer

**Data Required**:
- Read: Kingdom hexes, faction data, settlement locations
- Write: Hex ownership, territory counts, faction data

**UI Feedback**:
- Show hex map with transferred hexes highlighted
- Display faction name gaining control
- Updated territory count
- Warning if hexes contain structures/worksites

**Implementation Priority**: Medium (needed for Guerrilla Movement)

**Related Commands**:
- `removeHexes` - Complete removal vs transfer
- `reclaimHexes` - Take back faction-controlled hexes

---

## spawnFactionArmy

**Purpose**: Create an army controlled by a faction (enemy/rebel army)

**Parameters**:
- `factionId` (string): Faction that controls the army
- `armyType` (string): Type of army (e.g., "infantry", "cavalry")
- `location` (optional): Hex coordinates or "faction_territory" for random placement
- `name` (string, optional): Custom army name

**Used By**: 
- Guerrilla Movement (incident) - Critical Failure: Spawn Rebel infantry army
- [Add others as discovered]

**Behavior**:
1. Verify faction exists (create if needed)
2. Create army actor with specified type (Infantry)
3. Set army as controlled by faction (not player kingdom)
4. Place army in specified location or random faction hex
5. Set default stats based on army type
6. Add to combat tracker if applicable
7. Log to kingdom activity feed: "Rebel army has formed!"

**Edge Cases**:
- Faction doesn't exist: Create faction first
- No valid location: Place in faction's first controlled hex
- Army name conflict: Auto-generate unique name

**Data Required**:
- Read: Faction data, hex ownership, army templates
- Write: Create army actor, link to faction

**UI Feedback**:
- Show army token on map
- Alert: "[Faction] army has appeared!"
- Add to threats/military tracking
- Update military overview

**Implementation Priority**: Medium (needed for Guerrilla Movement critical failure)

**Technical Notes**:
- Reuse army creation system, but set faction ownership
- Army should NOT be controllable by players
- May need special AI/automated behavior for faction armies

**Related Commands**:
- `spawnPlayerArmy` - Create kingdom army
- `destroyArmy` - Remove army
- `transferArmyControl` - Change army ownership

---

## modifyFactionAttitude

**Purpose**: Change faction relationship/attitude levels

**Parameters**:
- `count` (number or dice formula): Number of factions to affect
- `change` (number): Attitude level change (negative = worsen, positive = improve)
  - -1 = Drop one level (e.g., Friendly → Neutral)
  - +1 = Improve one level (e.g., Neutral → Friendly)
- `factionIds` (array, optional): Specific factions to target, or random if not specified

**Used By**: 
- International Scandal (incident) - Critical Failure: 1d4 factions lose 1 attitude level
- [Add others as discovered]

**Behavior**:
1. Roll dice if count is a formula (e.g., 1d4 → 3 factions)
2. Select target factions:
   - Use specified factionIds if provided
   - Otherwise randomly select from all factions
3. For each faction, adjust attitude level by `change`
4. Respect attitude bounds (can't go below Hostile or above Allied)
5. Update faction relationship data
6. Log each faction attitude change to kingdom activity feed

**Edge Cases**:
- Faction already at minimum (Hostile): Show message, no change
- Faction already at maximum (Allied): Show message, no change
- No factions exist: Show message and skip
- Count exceeds available factions: Affect all factions

**Data Required**:
- Read: Faction data, current attitude levels
- Write: Updated faction attitude levels

**UI Feedback**:
- Show each affected faction with old → new attitude
- Update faction relationship display
- Alert if faction becomes Hostile
- Update diplomacy/faction overview

**Implementation Priority**: Medium (needed for International Scandal)

**Attitude Levels** (typical progression):
- Allied (best)
- Friendly
- Neutral
- Unfriendly
- Hostile (worst)

**Related Commands**:
- `setFactionAttitude` - Set specific attitude level (not relative change)
- `improveFactionRelations` - Positive version (quest rewards, etc.)

---

## performMoraleCheck

**Purpose**: Force army(ies) to perform morale check (supplies, desertion, loyalty test)

**Parameters**:
- `count` (number, default: 1): Number of armies to affect
- `armyIds` (array, optional): Specific armies to test, or random if not specified
- `reason` (string): Reason for morale check (e.g., "Mass Desertion", "Low Supplies")

**Used By**: 
- Mass Desertion Threat (incident) - Failure: 1 army, Critical Failure: 2 armies
- Upkeep Phase - Supply shortage triggers
- [Add others as discovered]

**Behavior**:
1. Select target armies (random or specified)
2. For each army, initiate morale check:
   - **DC**: Level-based DC for army's level
   - **Skills Available**: Diplomacy (rallying loyalty) OR Intimidation (enforcing discipline)
   - Player chooses which skill to use
3. Resolve check based on outcome:
   - **Critical Success**: Army rallies, remains intact (no penalties)
   - **Success**: Army remains intact, +1 Unrest
   - **Failure**: Army disbands (desertion/dispersal), +1 Unrest
   - **Critical Failure**: Army disbands (mutiny/defection), +2 Unrest
4. If army disbands, remove army actor
5. Apply Unrest penalties to kingdom
6. Log results to kingdom activity feed

**Edge Cases**:
- No armies exist: Show message "No armies to check morale" and skip
- Count exceeds available armies: Check all armies
- Army already has condition affecting morale: Apply circumstance modifiers

**Data Required**:
- Read: Army data, army levels, kingdom skills
- Write: Remove disbanded armies, add Unrest

**UI Feedback**:
- Show morale check card for each army (similar to incident check)
- Display army name, level, DC
- Show skill choice (Diplomacy or Intimidation)
- Roll result and outcome
- Animate army removal if disbanded
- Update Unrest counter

**Implementation Priority**: High (needed for Mass Desertion + Upkeep phase)

**Technical Notes**:
- This is essentially a check card with specific outcomes
- Reuse pipeline check system with morale-specific results
- Can be triggered from multiple sources (incidents, upkeep, events)
- Should support batch processing (multiple armies at once)

**Related Commands**:
- `disbandArmy` - Manual army dismissal
- `boostMorale` - Temporary morale bonus (quest rewards, etc.)

---

## releaseImprisonedUnrest

**Purpose**: Convert Imprisoned Unrest back to normal Unrest (prison break, damaged justice structures)

**Parameters**:
- `amount` (number or "all", default: "all"): How much Imprisoned Unrest to release
- `reason` (string): Reason for release (e.g., "Prison Break", "Justice Structure Destroyed")

**Used By**: 
- Prison Breaks (incident) - Failure and Critical Failure: Release all
- Any incident/event that damages Justice structures
- [Add others as discovered]

**Behavior**:
1. Get current Imprisoned Unrest value
2. Determine amount to release:
   - "all": Release all Imprisoned Unrest
   - number: Release specified amount (capped at current value)
3. Reduce Imprisoned Unrest by amount
4. Increase normal Unrest by same amount
5. Check if new Unrest level triggers incidents
6. Log to kingdom activity feed: "Prison break releases X Unrest!"

**Edge Cases**:
- No Imprisoned Unrest: Show message "No imprisoned unrest to release" and skip
- Amount exceeds available: Release all available

**Data Required**:
- Read: imprisonedUnrest value
- Write: imprisonedUnrest (reduce), unrest (increase)

**UI Feedback**:
- Show Imprisoned Unrest → Normal Unrest conversion
- Animate Unrest meter increase
- Warning if Unrest crosses incident threshold
- Update both Unrest and Imprisoned Unrest displays

**Implementation Priority**: High (needed for Prison Breaks incident)

**Technical Notes**:
- Imprisoned Unrest is tracked separately from normal Unrest
- Normal Unrest triggers incidents, Imprisoned Unrest does not
- Justice structures provide Imprisoned Unrest capacity
- This mechanic makes Justice structures strategically important

**Related Commands**:
- `imprisonUnrest` - Opposite effect (reduce normal Unrest, increase Imprisoned)
- `addUnrest` - Standard Unrest increase

---

## transferSettlementToFaction

**Purpose**: Transfer complete ownership of a settlement (and optionally adjacent hexes) to a faction

**Parameters**:
- `settlementId` (string or "random_non_capital"): Target settlement to transfer
- `factionId` (string): Faction to receive settlement (e.g., "rebels")
- `includeAdjacentHexes` (boolean, default: true): Also transfer all adjacent hexes
- `reason` (string): Reason for transfer (e.g., "Secession", "Conquest")

**Used By**: 
- Secession Crisis (incident) - Critical Failure: Settlement secedes to Rebels
- [Add others as discovered]

**Behavior**:
1. Select target settlement (random non-capital if specified)
2. Verify faction exists (create "Rebels" if needed)
3. Transfer settlement ownership:
   - Settlement now belongs to faction
   - All structures remain intact (faction's infrastructure)
   - Population remains (faction's citizens)
   - Resources/economy now belong to faction
4. If `includeAdjacentHexes`, transfer all adjacent hexes to faction
5. Remove settlement from kingdom's settlement list
6. Add settlement to faction's territory
7. Update territory counts for both parties
8. Settlement becomes faction's capital/stronghold
9. Show UI notification of secession
10. Log dramatic event to kingdom activity feed

**Edge Cases**:
- Capital selected: Skip to next settlement (cannot transfer capital)
- Only one settlement exists (is capital): Show message and skip
- Faction doesn't exist: Create faction automatically
- Settlement has unique structures: Transfer them (they keep benefits for faction)

**Data Required**:
- Read: Settlement data, hex ownership, structures
- Write: Settlement ownership, hex ownership, faction data, kingdom territory

**UI Feedback**:
- Major alert: "[Settlement Name] has seceded!"
- Show settlement + adjacent hexes highlighted on map
- Display new faction control
- Updated territory/settlement counts
- Warning about lost infrastructure/income
- Faction relationship set to Hostile

**Implementation Priority**: High (needed for Secession Crisis critical failure)

**Technical Notes**:
- This is the most severe territorial loss possible
- Creates a functional enemy "mini-kingdom" 
- Faction inherits everything: structures, economy, population
- Much worse than just losing hexes (Border Raid) or having rebels in territory (Guerrilla Movement)
- Rebels now have a capital, infrastructure, and legitimate claim

**Related Commands**:
- `transferHexesToFaction` - Hexes only (no settlement) 
- `reclaimSettlement` - Take back seceded settlement (military/diplomatic action)
- `destroySettlement` - Complete destruction vs transfer

---

---

---

---

## Template for New Commands

### [commandName]

**Purpose**: 

**Used By**: 

**Behavior**:

**Edge Cases**:

**Data Required**:

**UI Feedback**:

**Implementation Priority**:

**Related Commands**:

---

