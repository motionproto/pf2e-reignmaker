# Action Handler Mapping: Current vs. Reignmaker-lite

## Existing Handlers Analysis

### Handlers to Keep and Update

#### Uphold Stability Category
- **CheckUnrestIncidentHandler** → Maps to "Deal with Unrest"
  - UPDATE: Add PC skills, remove kingdom skills
- **HandleEventHandler** → Maps to "Resolve a Kingdom Event"
  - UPDATE: Add PC skills based on event type
- **CheckEventHandler** → Used for event checks in Phase 3
  - KEEP: Part of turn sequence

#### Expand Borders Category
- **CreateWorksiteHandler** ✅ → Maps to "Create Worksite"
  - ALREADY UPDATED to new system

#### Urban Planning Category
- **CreateSettlementHandler** → Maps to "Establish a Settlement"
  - UPDATE: Add PC skills
- **AddSettlementHandler** → Similar to Establish Settlement
  - MERGE with CreateSettlementHandler
- **ActivateSettlementHandler** → Settlement management
  - KEEP: Utility handler
- **ViewSettlementHandler** → UI handler
  - KEEP: Utility handler
- **InspectSettlementHandler** → UI handler
  - KEEP: Utility handler

#### Economic Actions Category
- **CollectResourcesHandler** → Maps to "Collect Resources"
  - UPDATE: Add PC skills, integrate with new resource system
- **PayConsumptionHandler** → Resource management
  - UPDATE: Integrate with new resource system

#### Turn Management
- **EndTurnHandler** → Phase 6 of turn sequence
  - UPDATE: Use TurnManager
- **CheckForEventHandler** → Phase 3 of turn sequence
  - UPDATE: Use TurnManager

#### Utility/UI Handlers (Keep as-is)
- **ChangeNavHandler** - UI navigation
- **ChangeKingdomSectionNavHandler** - UI navigation
- **ScrollToHandler** - UI navigation
- **SettingsHandler** - Settings management
- **HelpHandler** - Help system
- **ShowPlayersHandler** - Player display
- **ConsumptionBreakdownHandler** - Resource display
- **KingdomSizeInfoHandler** - Information display
- **SettlementSizeInfoHandler** - Information display
- **QuickstartHandler** - Setup utility

### Handlers to Remove
- **GainFameHandler** - Fame is automatic in Phase 1
- **GainFameCriticalHandler** - Fame is automatic
- **UseFameRerollHandler** - Different fame system
- **PerformActivityHandler** - Old activity system
- **ConfigureActivitiesHandler** - Old activity system
- **ToggleContinuousHandler** - Different event system
- **AddEventHandler** - Events are random
- **DeleteEventHandler** - Events managed differently
- **ChangeEventStageHandler** - Different event system
- **RollEventHandler** - Events handled in phases
- **RollSkillCheckHandler** - Now uses PC skills
- **CreateCapitalHandler** - Capital is a settlement type
- **StructuresImportHandler** - Different structure system
- **AddGroupHandler** - Not in Reignmaker-lite
- **DeleteGroupHandler** - Not in Reignmaker-lite
- **DeleteSettlementHandler** - Not explicitly in rules

## New Handlers Needed

### Uphold Stability
- **ArrestDissidentsHandler** - NEW
- **ExecutePardonPrisonersHandler** - NEW
- **CoordinatedEffortHandler** - NEW

### Military Operations (All NEW)
- **RecruitUnitHandler**
- **OutfitArmyHandler**
- **DeployArmyHandler**
- **RecoverArmyHandler**
- **TrainArmyHandler**
- **DisbandArmyHandler**

### Expand Borders
- **ClaimHexesHandler** - NEW
- **BuildRoadsHandler** - NEW
- **SendScoutsHandler** - NEW
- **FortifyHexHandler** - NEW

### Urban Planning
- **UpgradeSettlementHandler** - NEW
- **BuildStructureHandler** - NEW
- **RepairStructureHandler** - NEW

### Foreign Affairs (All NEW)
- **EstablishDiplomaticRelationsHandler**
- **RequestEconomicAidHandler**
- **RequestMilitaryAidHandler**
- **InfiltrationHandler**
- **HireAdventurersHandler**

### Economic Actions
- **SellSurplusHandler** - NEW
- **PurchaseResourcesHandler** - NEW
- **CollectStipendHandler** - NEW

## Summary

### Statistics
- **Existing Handlers:** 41
- **To Keep (as-is or update):** 21
- **To Remove:** 20
- **New to Create:** 24

### Priority Actions
1. Remove obsolete handlers
2. Update existing handlers with PC skills
3. Create missing action handlers
4. Test integration with TurnManager and resource system
