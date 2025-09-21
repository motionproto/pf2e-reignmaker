# TypeScript Migration To-Do List for PF2e Kingdom Lite

## Phase 1: Setup and Infrastructure (Week 1)

### 1.1 Project Setup
- [ ] Initialize new TypeScript configuration
  - [ ] Create `tsconfig.json` with appropriate compiler options
  - [ ] Install TypeScript and required dev dependencies
  - [ ] Set up npm/yarn package.json
- [ ] Install Foundry type definitions
  - [ ] Add `@league-of-foundry-developers/foundry-vtt-types`
  - [ ] Configure types for PF2e system if available
- [ ] Set up build tooling
  - [ ] Choose between Webpack, Vite, or Rollup
  - [ ] Configure bundler for Foundry module output
  - [ ] Set up source maps for debugging
  - [ ] Configure watch mode for development

### 1.2 Parallel Development Environment
- [ ] Create `src-ts/` directory for TypeScript code
- [ ] Keep Kotlin build working during migration
- [ ] Set up dual deployment (both compiled outputs)
- [ ] Create feature flags to switch between implementations

## Phase 2: Core Foundation Migration (Week 1-2)

### 2.1 Data Models and Types
- [ ] Convert `kingdom/lite/model/` to TypeScript
  - [ ] `KingdomState.kt` → `models/KingdomState.ts`
  - [ ] `Events.kt` → `models/Events.ts`
  - [ ] `Incidents.kt` → `models/Incidents.ts`
  - [ ] `PlayerActions.kt` → `models/PlayerActions.ts`
  - [ ] `Structures.kt` → `models/Structures.ts`
  - [ ] `BuildProject.kt` → `models/BuildProject.ts`
  - [ ] `Hex.kt` → `models/Hex.ts`
  - [ ] `TurnManager.kt` → `models/TurnManager.ts`
- [ ] Create TypeScript interfaces for all data structures
- [ ] Set up JSON schema validation (if needed)

### 2.2 API Layer
- [ ] Convert Foundry API interactions
  - [ ] `api/FoundryApi.kt` → `api/foundry.ts`
  - [ ] `api/KingmakerApi.kt` → `api/kingmaker.ts`
  - [ ] Remove all `external` declarations and `asDynamic()` calls
  - [ ] Use proper Foundry type definitions
- [ ] Create type-safe wrappers for Foundry hooks
- [ ] Implement proper class extensions for Foundry classes

## Phase 3: Core Logic Migration (Week 2-3)

### 3.1 Business Logic
- [ ] Convert `kingdom/lite/fresh/` directory
  - [ ] `DataLoader.kt` → `core/DataLoader.ts`
  - [ ] `KingdomCore.kt` → `core/KingdomCore.ts`
  - [ ] `KingdomManager.kt` → `core/KingdomManager.ts`
  - [ ] `SimpleKingdomUI.kt` → `core/SimpleKingdomUI.ts`
- [ ] Ensure all game mechanics work correctly
- [ ] Add unit tests for critical logic

### 3.2 Main Entry Point
- [ ] Convert `Main.kt` → `index.ts`
- [ ] Set up proper module initialization
- [ ] Migrate hook registrations
- [ ] Ensure settings registration works

## Phase 4: UI Components Migration (Week 3-4)

### 4.1 Base UI Infrastructure
- [ ] Decide on UI approach:
  - [ ] Vanilla JS/HTML (closest to current)
  - [ ] React (if complex state management needed)
  - [ ] Svelte (lightweight, Foundry-friendly)
  - [ ] Web Components (future-proof)
- [ ] Convert base application classes
  - [ ] `ui/Application.kt` → `ui/Application.ts`
  - [ ] `ui/KingdomSheet.kt` → `ui/KingdomSheet.ts`
  - [ ] `ui/KingdomDialog.kt` → `ui/KingdomDialog.ts`

### 4.2 Components
- [ ] Convert all components in `ui/components/`
  - [ ] `ActionCard.kt` → `ui/components/ActionCard.ts`
  - [ ] `ActionListItem.kt` → `ui/components/ActionListItem.ts`
  - [ ] `ContentComponent.kt` → `ui/components/ContentComponent.ts`
  - [ ] `ContentFactions.kt` → `ui/components/ContentFactions.ts`
  - [ ] `ContentModifiers.kt` → `ui/components/ContentModifiers.ts`
  - [ ] `ContentNotes.kt` → `ui/components/ContentNotes.ts`
  - [ ] `ContentSelector.kt` → `ui/components/ContentSelector.ts`
  - [ ] `ContentSettings.kt` → `ui/components/ContentSettings.ts`
  - [ ] `ContentSettlements.kt` → `ui/components/ContentSettlements.ts`
  - [ ] `ContentTurn.kt` → `ui/components/ContentTurn.ts`
  - [ ] `KingdomStats.kt` → `ui/components/KingdomStats.ts`
  - [ ] `StructurePicker.kt` → `ui/components/StructurePicker.ts`
  - [ ] `TurnController.kt` → `ui/components/TurnController.ts`

### 4.3 Turn Phase Components
- [ ] Convert `ui/turn/` directory
  - [ ] `ActionsPhase.kt` → `ui/turn/ActionsPhase.ts`
  - [ ] `EventsPhase.kt` → `ui/turn/EventsPhase.ts`
  - [ ] `ResolutionPhase.kt` → `ui/turn/ResolutionPhase.ts`
  - [ ] `ResourcesPhase.kt` → `ui/turn/ResourcesPhase.ts`
  - [ ] `StatusPhase.kt` → `ui/turn/StatusPhase.ts`
  - [ ] `UnrestPhase.kt` → `ui/turn/UnrestPhase.ts`

## Phase 5: Styling and Assets (Week 4)

### 5.1 Styles Migration
- [ ] Convert all styles in `ui/styles/`
  - [ ] Consider moving to SCSS/CSS modules
  - [ ] `ActionStyles.kt` → `styles/actions.scss`
  - [ ] `BaseStyles.kt` → `styles/base.scss`
  - [ ] `ContentStyles.kt` → `styles/content.scss`
  - [ ] `ControlStyles.kt` → `styles/controls.scss`
  - [ ] `EventStyles.kt` → `styles/events.scss`
  - [ ] `HeaderStyles.kt` → `styles/header.scss`
  - [ ] `KingdomStatsStyles.kt` → `styles/kingdom-stats.scss`
  - [ ] `ResourceStyles.kt` → `styles/resources.scss`
  - [ ] `StructureStyles.kt` → `styles/structures.scss`
  - [ ] `TurnStyles.kt` → `styles/turn.scss`
  - [ ] `UnrestStyles.kt` → `styles/unrest.scss`

### 5.2 Asset Management
- [ ] Ensure all images load correctly
- [ ] Set up proper asset paths
- [ ] Optimize bundle size

## Phase 6: Testing and Validation (Week 5)

### 6.1 Functionality Testing
- [ ] Test all kingdom management features
- [ ] Verify turn phases work correctly
- [ ] Check resource calculations
- [ ] Validate event system
- [ ] Test structure building
- [ ] Verify settlement management

### 6.2 Integration Testing
- [ ] Test with Foundry VTT v10/v11
- [ ] Test with PF2e system
- [ ] Check compatibility with Kingmaker module
- [ ] Verify all hooks work properly
- [ ] Test data persistence

### 6.3 Performance Testing
- [ ] Check bundle size (should be much smaller)
- [ ] Measure load times
- [ ] Profile runtime performance
- [ ] Optimize where needed

## Phase 7: Cleanup and Polish (Week 5-6)

### 7.1 Code Cleanup
- [ ] Remove all Kotlin code and dependencies
- [ ] Clean up Gradle build files
- [ ] Remove `buildSrc/` directory
- [ ] Update `.gitignore`
- [ ] Remove Kotlin-specific configuration files

### 7.2 Documentation
- [ ] Update README.md with new build instructions
- [ ] Document TypeScript API
- [ ] Create migration guide for users
- [ ] Update CHANGELOG.md

### 7.3 Build Pipeline
- [ ] Set up GitHub Actions for CI/CD
- [ ] Configure automated testing
- [ ] Set up release automation
- [ ] Configure linting and formatting

## Phase 8: Foundry Best Practices Alignment (Week 6+)

### 8.1 Module Structure
- [ ] Align folder structure with Foundry conventions
- [ ] Implement proper manifest+ format if needed
- [ ] Set up proper localization structure

### 8.2 Advanced Features
- [ ] Add socket support for multiplayer sync
- [ ] Implement proper settings management
- [ ] Add keyboard shortcuts
- [ ] Implement drag-and-drop where appropriate

### 8.3 Community Integration
- [ ] Add compatibility flags
- [ ] Implement module conflicts detection
- [ ] Add telemetry/analytics (optional, with consent)
- [ ] Create module documentation site

## Migration Tips

1. **Start Small**: Begin with data models and types - they're easiest to test in isolation
2. **Maintain Backwards Compatibility**: Keep save data format the same initially
3. **Use TypeScript Strictly**: Enable strict mode from the start to maximize benefits
4. **Test Continuously**: Set up a test world and verify each migrated component
5. **Keep a Migration Log**: Document any behavior changes or gotchas

## Priority Order

If you need to deliver value quickly:
1. First: Core data models and Foundry API (biggest pain points)
2. Second: Main UI components (most visible to users)
3. Third: Polish and optimization
4. Last: Nice-to-have features and full Foundry alignment

## Estimated Timeline

- **Minimal Working Version**: 2-3 weeks (core functionality)
- **Full Feature Parity**: 4-5 weeks
- **Polished and Optimized**: 6 weeks

## Benefits of Migration

This migration will result in:
- 70-80% reduction in bundle size
- Much faster build times (seconds vs minutes)
- Easier debugging and development
- Ability to accept community contributions
- Access to the full JavaScript ecosystem

The key is to maintain a working module throughout the migration, allowing you to test and validate as you go.

## Notes

- Keep the Kotlin version running in parallel during migration
- Test each component as it's migrated
- Document any API changes or breaking changes
- Consider creating a beta branch for testing the TypeScript version
