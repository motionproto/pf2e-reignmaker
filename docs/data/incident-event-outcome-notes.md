# Incident & Event Outcome Clarifications

**Purpose**: Clarifications and notes for incident/event outcomes to be incorporated during pipeline migration.

**Status**: Pre-migration notes (for reference during pipeline implementation)

---

## Incidents (30 Total)

### 1. Bandit Activity
**ID**: `bandit-activity` | **Tier**: Minor

**Notes**:
- **Critical Failure**: Create `destroyWorksite` game command - randomly destroys one worksite completely

---

### 2. Corruption Scandal
**ID**: `corruption-scandal` | **Tier**: Minor

**Notes**:
- 

---

### 3. Crime Wave
**ID**: `crime-wave` | **Tier**: Minor

**Notes**:
- 

---

### 4. Diplomatic Incident
**ID**: `diplomatic-incident` | **Tier**: Minor

**Notes**:
- **Failure**: Change "kingdoms" to "factions"
- **Critical Failure**: Change "kingdoms" to "factions", roll 1d4+1 to determine number of factions (2-5)

---

### 5. Emigration Threat
**ID**: `emigration-threat` | **Tier**: Minor

**Notes**:
- **Failure**: Destroy 1 worksite using `destroyWorksite(count: 1)`
- **Critical Failure**: Destroy 1d3 worksites using `destroyWorksite(count: 1d3)`
- Game command should accept a count parameter (can be a number or dice formula) 

---

### 6. Protests
**ID**: `protests` | **Tier**: Minor

**Notes**:
- 

---

### 7. Rising Tensions
**ID**: `rising-tensions` | **Tier**: Minor

**Notes**:
- 

---

### 8. Work Stoppage
**ID**: `work-stoppage` | **Tier**: Minor

**Notes**:
- 

---

### 9. Assassination Attempt
**ID**: `assassination-attempt` | **Tier**: Moderate

**Notes**:
- **Critical Failure**: Randomly select one leader/player character and mark their Kingdom action as already used for this turn
  - Need new game command: `consumePlayerAction` or `markActionUsed`
  - Should show as used in action tracker
  - Should warn player if they try to take an action
  - Effect lasts for remainder of current turn only

---

### 10. Diplomatic Crisis
**ID**: `diplomatic-crisis` | **Tier**: Moderate

**Notes**:
- Change "kingdoms" to "factions" throughout all outcomes
- **Critical Failure**: Roll 1d4+1 to determine number of factions that turn against you (2-5 factions)

---

### 11. Disease Outbreak
**ID**: `disease-outbreak` | **Tier**: Moderate

**Notes**:
- Remove player choice - automatically select randomly
- **Outcome**: Randomly find a Medicine or Faith structure and mark it as damaged
- Use existing `damageStructure` game command (should already exist)
- Filter: Only Medicine or Faith type structures
- If no eligible structures exist, skip effect

---

### 12. Infrastructure Damage
**ID**: `infrastructure-damage` | **Tier**: Moderate

**Notes**:
- Remove player choice - automatically select randomly
- **Failure**: Randomly damage 1 structure using `damageStructure(1)`
- **Critical Failure**: Randomly damage 1d3 structures using `damageStructure("1d3")`
- Should accept count parameter like `destroyWorksite` does

---

### 13. Mass Exodus
**ID**: `mass-exodus` | **Tier**: Moderate

**Notes**:
- Remove all player choices - use random selection
- **Failure**: Destroy 1 random worksite using `destroyWorksite(1)`
- **Critical Failure**: Destroy 1 random worksite AND damage 1 random structure
  - Use `destroyWorksite(1)` + `damageStructure(1)`

---

### 14. Production Strike
**ID**: `production-strike` | **Tier**: Moderate

**Notes**:
- **Failure**: Lose 1d4 of a resource (player chooses which resource)
- **Critical Failure**: Lose 2d4 of a resource (player chooses which resource)
- Need choice modifier or interaction to select resource type
- Dice amount varies by outcome severity

---

### 15. Riot
**ID**: `riot` | **Tier**: Moderate

**Notes**:
- Remove all player choices - use random selection
- **Failure**: Damage 1 random structure using `damageStructure(1)`
- **Critical Failure**: Destroy 1 random structure using `destroyStructure(1)`
  - ✅ `destroyStructure` command already exists!
  - Already handles multi-tier logic: destroys top tier, damages next tier down
  - Single-tier structures are completely removed

---

### 16. Settlement Crisis
**ID**: `settlement-crisis` | **Tier**: Moderate

**Notes**:
- **Failure**: Damage 1 random structure using `damageStructure(1)`
- **Critical Failure**: Settlement loses 1 level AND damage 1d3 structures
  - Need `downgradeSettlement` game command (reduce settlement level by 1)
  - Use `damageStructure("1d3")` for multiple structures
  - Both effects apply together

---

### 17. Tax Revolt
**ID**: `tax-revolt` | **Tier**: Moderate

**Notes**:
- 

---

### 18. Trade Embargo
**ID**: `trade-embargo` | **Tier**: Moderate

**Notes**:
- Fix undefined value in current data
- **Failure**: Lose 1d4 of a resource (player chooses which resource)
- **Critical Failure**: Lose 2d4 of a resource (player chooses which resource)
- Same pattern as Production Strike #14

---

### 19. Border Raid
**ID**: `border-raid` | **Tier**: Major

**Notes**:
- Remove player choice of which hex
- Need new game command: `removeHexes` or `raidBorderHexes`
- **UI Pattern**: Show hex picker interface (view-only, non-interactive)
  - Randomly select border hexes (marked in red)
  - Player clicks "OK" to confirm (not to choose)
  - Visual feedback of what will be lost
- **Behavior**: System automatically selects random border hexes
- **Failure**: Remove 1 border hex
- **Critical Failure**: Remove 1d3 border hexes (or other amount - check current values)

---

### 20. Economic Crash
**ID**: `economic-crash` | **Tier**: Major

**Notes**:
- **Critical Failure**: Destroy the highest tier commerce structure
  - ✅ This effect already exists - just use `destroyStructure` with category filter
  - Target: Commerce category structures only
  - Prioritize highest tier (e.g., destroy Marketplace III before Marketplace II)
  - Current description is accurate, just needs proper game command implementation

---

### 21. Guerrilla Movement
**ID**: `guerrilla-movement` | **Tier**: Major

**Notes**:
- Create new faction: "Rebels"
- **Failure**: Rebels gain control of 1d3 adjacent hexes
  - Hexes must be adjacent to each other
  - Cannot contain settlements
  - Transfer hex ownership to Rebels faction
- **Critical Failure**: Rebels gain 2d6+3 hexes (5-15 hexes) AND spawn an army
  - Same hex restrictions (adjacent, no settlements)
  - Spawn Rebel army (Infantry type)
  - Army is led by/controlled by Rebels faction
  - Army should appear in affected territory
- Need game commands:
  - `transferHexesToFaction(faction, count, restrictions)` - Transfer hex ownership
  - `spawnFactionArmy(faction, armyType, location)` - Create army for faction

---

### 22. International Crisis
**ID**: `international-crisis` | **Tier**: Major

**Notes**:
- 

---

### 23. International Scandal
**ID**: `international-scandal` | **Tier**: Major

**Notes**:
- **Critical Failure**: Simplify complex fame rules
  - Lose 1 Fame (flat penalty, remove complex calculation)
  - Roll 1d4 to determine number of factions affected (1-4 factions)
  - Each affected faction loses 1 attitude level (e.g., Friendly → Neutral, Neutral → Unfriendly)
  - Need game command: `modifyFactionAttitude(factionIds, change)` - Adjust faction relationship levels

---

### 24. Mass Desertion Threat
**ID**: `mass-desertion-threat` | **Tier**: Major

**Notes**:
- Triggers morale check system (also used in Upkeep phase)
- Need generic `performMoraleCheck(armies)` game command
- **Morale Check** (from Military.md):
  - DC: Level-based DC for army's level
  - Skill: Kingdom rolls Diplomacy (rally) or Intimidation (discipline)
  - Results:
    - Critical Success: Army rallies, no desertion
    - Success: Army intact, +1 Unrest
    - Failure: Army disbands, +1 Unrest
    - Critical Failure: Army disbands/mutiny, +2 Unrest
- **Failure**: 1 army performs morale check + damage 1 military structure
  - Use `performMoraleCheck(1)` + `damageStructure(1, category: "military")`
- **Critical Failure**: 2 armies perform morale check + destroy 1 military structure
  - Use `performMoraleCheck(2)` + `destroyStructure(1, category: "military")`

---

### 25. Noble Conspiracy
**ID**: `noble-conspiracy` | **Tier**: Major

**Notes**:
- **Critical Failure**: Multiple effects
  - Consume one player action using `consumePlayerAction(random: true)`
  - Same mechanic as Assassination Attempt #9
  - Randomly select one leader and mark their action as used
  - Plus any other existing penalties in critical failure

---

### 26. Prison Breaks
**ID**: `prison-breaks` | **Tier**: Major

**Notes**:
- Target specific structure: Kingdom's largest prison (Justice category structure)
- Select highest-tier Justice structure anywhere in kingdom
- **Failure**: Largest prison is damaged using `damageStructure(target: "largest_justice")`
  - Release all Imprisoned Unrest, convert to normal Unrest
- **Critical Failure**: Largest prison is destroyed using `destroyStructure(target: "largest_justice")`
  - Release all Imprisoned Unrest, convert to normal Unrest
- **Imprisoned Unrest mechanics**:
  - Imprisoned Unrest is stored separately (doesn't count toward incident triggers)
  - When prison damaged/destroyed, convert Imprisoned → Normal Unrest
  - Increases active Unrest, can trigger incidents
- Need targeting parameter for structure commands: `largest_justice` or similar

---

### 27. Religious Schism
**ID**: `religious-schism` | **Tier**: Major

**Notes**:
- **Critical Failure**: Destroy highest tier religious structure
  - ✅ Use existing `destroyStructure(category: "religious", target: "highest_tier")`
  - Targets Faith/Religious category structures
  - Selects and destroys the highest tier one in kingdom
  - Current description may be wordy but effect is straightforward

---

### 28. Secession Crisis
**ID**: `secession-crisis` | **Tier**: Major

**Notes**:
- Remove player choice - randomly select settlement (excluding capital)
- **Failure**: Target one non-capital settlement
  - Destroy 1 random structure in that settlement
  - Settlement loses 1 level (downgrade)
  - Use `destroyStructure(1, settlement: target)` + `downgradeSettlement(target, 1)`
- **Critical Failure**: Full secession - creates independent rebel kingdom!
  - Create/use "Rebels" faction (same as Guerrilla Movement #21)
  - Transfer entire settlement to Rebels faction
  - Give Rebels all hexes adjacent to seceded settlement
  - Settlement becomes rebel capital/stronghold
  - Settlement structures, population, etc. now belong to Rebels
  - Creates autonomous enemy kingdom within your borders
  - Need game command: `transferSettlementToFaction(settlementId, factionId, includeAdjacentHexes: true)`
- **Major difference from #21**: 
  - #21 gives Rebels empty hexes + army
  - #28 gives Rebels a full functioning settlement + territory
  - Much more dangerous - they have infrastructure and economy

---

### 29. Settlement Collapse
**ID**: `settlement-collapse` | **Tier**: Major

**Notes**:
- Remove player choice - randomly select one settlement
- **Failure**: 1d3 structures in that settlement are damaged
  - Use `damageStructure("1d3", settlement: target)`
  - All damage concentrated in one settlement
- **Critical Failure**: Much worse - settlement loses 1 level AND 1d3 structures destroyed
  - Use `downgradeSettlement(target, 1)` + `destroyStructure("1d3", settlement: target)`
  - Combination of structural destruction + settlement degradation
  - Could lose multiple high-tier structures
  - Settlement capacity reduced, may now exceed limits

---

### 30. Trade War
**ID**: `trade-war` | **Tier**: Major

**Notes**:
- Fix undefined value in current data
- **Failure**: Lose 2d4 of a resource (player chooses which resource)
- **Critical Failure**: Lose 4d4 of a resource (player chooses which resource)
- Pattern similar to Production Strike #14 and Trade Embargo #18, but higher amounts (Major tier)
- Player strategic choice on which resource to sacrifice

---

## Events

### Archaeological Find
**ID**: `archaeological-find`
**Tier**: Event

#### Outcomes:
- **Critical Success**: 
- **Success**: 
- **Failure**: 
- **Critical Failure**: 

**Notes**:
- 

---

### Visiting Celebrity
**ID**: `visiting-celebrity`
**Tier**: Event

#### Outcomes:
- **Critical Success**: 
- **Success**: 
- **Failure**: 
- **Critical Failure**: 

**Notes**:
- 

---

<!-- Add more events as you review them -->

---

## Implementation Checklist

When migrating to pipeline:
- [ ] Review all outcome descriptions for clarity
- [ ] Ensure modifiers are accurate
- [ ] Add any missing manual effects
- [ ] Verify skill options make sense
- [ ] Check that difficulty/tier is appropriate
- [ ] Test each outcome in-game

---

## Notes Format

For each incident/event, include:
- **Clarity issues**: Where descriptions are confusing
- **Balance concerns**: Outcomes that seem too harsh/lenient
- **Missing details**: What should be clarified
- **Mechanical notes**: Special rules or edge cases
- **Flavor suggestions**: Additional narrative details

