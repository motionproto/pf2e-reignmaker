# pf2e-kingdom-lite Removal Checklist

This document tracks the transformation from pf2e-kingmaker-tools to pf2e-kingdom-lite by removing camping and weather functionality.

## Phase 1: Setup Development Environment
- [ ] Install JDK 21 on macOS
  ```bash
  brew install --cask temurin@21
  ```
- [ ] Verify Node.js installation
  ```bash
  node --version
  ```
- [ ] Verify/Install Yarn
  ```bash
  brew install yarn
  yarn --version
  ```
- [ ] Set up project with dummy translations
  ```bash
  ./gradlew createDummyTranslations
  ```

## Phase 2: Remove Camping Functionality

### Directories to Delete
- [ ] `src/jsMain/kotlin/at/posselt/pfrpg2e/camping/`
- [ ] `data/camping-activities/`
- [ ] `data/recipes/`
- [ ] `src/jsMain/resources/applications/camping/`
- [ ] `img/camping/`
- [ ] `packs/kingmaker-tools-camping-effects/`
- [ ] `packs/kingmaker-tools-meal-effects/`

### Files to Delete
- [ ] `src/jsMain/kotlin/at/posselt/pfrpg2e/macros/CreateFood.kt`
- [ ] `src/jsMain/kotlin/at/posselt/pfrpg2e/macros/Subsist.kt`
- [ ] `src/jsMain/kotlin/at/posselt/pfrpg2e/actions/handlers/AddHuntAndGatherResultHandler.kt`
- [ ] `src/jsMain/kotlin/at/posselt/pfrpg2e/actions/handlers/ApplyMealEffectsHandler.kt`
- [ ] `src/jsMain/kotlin/at/posselt/pfrpg2e/actions/handlers/ClearMealEffectsHandler.kt`
- [ ] `src/jsMain/kotlin/at/posselt/pfrpg2e/actions/handlers/GainProvisionsHandler.kt`
- [ ] `src/jsMain/kotlin/at/posselt/pfrpg2e/actions/handlers/LearnSpecialRecipeHandler.kt`
- [ ] `src/jsMain/kotlin/at/posselt/pfrpg2e/actions/handlers/OpenCampingSheetHandler.kt`
- [ ] `src/jsMain/kotlin/at/posselt/pfrpg2e/actions/handlers/SyncActivitiesHandler.kt`

### Chat Message Templates to Delete
- [ ] `src/jsMain/resources/chatmessages/add-hunt-and-gather.hbs`
- [ ] `src/jsMain/resources/chatmessages/apply-meal-result.hbs`
- [ ] `src/jsMain/resources/chatmessages/consume-food.hbs`
- [ ] `src/jsMain/resources/chatmessages/discover-special-meal.hbs`
- [ ] `src/jsMain/resources/chatmessages/hunt-and-gather.hbs`
- [ ] `src/jsMain/resources/chatmessages/not-enough-food.hbs`
- [ ] `src/jsMain/resources/chatmessages/random-camping-encounter.hbs`
- [ ] `src/jsMain/resources/chatmessages/subsist.hbs`

## Phase 3: Remove Weather Functionality

### Directories to Delete
- [ ] `src/jsMain/kotlin/at/posselt/pfrpg2e/weather/`
- [ ] `packs/kingmaker-tools-weather-effects/`

### Files to Delete
- [ ] `src/jsMain/kotlin/at/posselt/pfrpg2e/settings/ClimateConfiguration.kt`
- [ ] `src/jsMain/kotlin/at/posselt/pfrpg2e/macros/SceneWeatherSettings.kt`
- [ ] `src/jsMain/kotlin/at/posselt/pfrpg2e/macros/SetWeather.kt`
- [ ] `src/jsMain/kotlin/at/posselt/pfrpg2e/macros/ToggleSheltered.kt`
- [ ] `src/jsMain/kotlin/at/posselt/pfrpg2e/macros/ToggleWeather.kt`

### Templates to Delete
- [ ] `src/jsMain/resources/applications/settings/configure-climate.hbs`

## Phase 4: Main.kt Modifications

### Remove Imports
- [ ] Remove camping-related imports
- [ ] Remove weather-related imports
- [ ] Remove food/meal/recipe imports

### Remove from ActionDispatcher handlers list
- [ ] `AddHuntAndGatherResultHandler()`
- [ ] `OpenCampingSheetHandler(game = game)`
- [ ] `SyncActivitiesHandler(game = game)`
- [ ] `ClearMealEffectsHandler()`
- [ ] `LearnSpecialRecipeHandler()`
- [ ] `ApplyMealEffectsHandler(game = game)`
- [ ] `GainProvisionsHandler()`

### Remove Hook Registrations
- [ ] `registerWeatherHooks(game)`
- [ ] `registerMealDiffingHooks()`
- [ ] `registerActivityDiffingHooks(game, actionDispatcher)`
- [ ] `bindCampingChatEventListeners(game, actionDispatcher)`

### Remove Template Partials
- [ ] `"campingTile" to "applications/camping/camping-tile.hbs"`
- [ ] `"recipeTile" to "applications/camping/recipe-tile.hbs"`
- [ ] `"foodCost" to "components/food-cost/food-cost.hbs"`

### Remove from ToolsMacros
- [ ] `toggleWeatherMacro`
- [ ] `toggleShelteredMacro`
- [ ] `setCurrentWeatherMacro`
- [ ] `sceneWeatherSettingsMacro`
- [ ] `rollKingmakerWeatherMacro`
- [ ] `subsistMacro`
- [ ] `createFoodMacro`
- [ ] Remove camping case from `openSheet`

## Phase 5: build.gradle.kts Modifications

### Update Version
- [ ] Change version to `0.0.1`

### Remove Validation Tasks
- [ ] Remove `validateRecipes` task
- [ ] Remove `validateCampingActivities` task

### Remove from check task dependencies
- [ ] `"validateRecipes"`
- [ ] `"validateCampingActivities"`

### Update package task
- [ ] Remove references to deleted directories

## Phase 6: module.json Updates

### Basic Info
- [ ] Change `"id"` to `"pf2e-kingdom-lite"`
- [ ] Change `"title"` to `"pf2e Kingdom-lite"`
- [ ] Change `"version"` to `"0.0.1"`
- [ ] Update `"description"` to focus on kingdom management only
- [ ] Update `"url"` to new repository URL
- [ ] Update `"manifest"` URL
- [ ] Update `"download"` URL

### Remove Packs
- [ ] Remove `kingmaker-tools-meal-effects` pack
- [ ] Remove `kingmaker-tools-camping-effects` pack
- [ ] Remove `kingmaker-tools-weather-effects` pack
- [ ] Remove `kingmaker-tools-random-encounters` pack (if camping-related)

### Update packFolders
- [ ] Remove references to deleted packs

## Phase 7: Clean Up Remaining References

### Search and Remove References
- [ ] Search for `camping` in all .kt files
- [ ] Search for `weather` in all .kt files
- [ ] Search for `meal` in all .kt files
- [ ] Search for `recipe` in all .kt files
- [ ] Search for `provisions` in all .kt files
- [ ] Search for `food` in all .kt files
- [ ] Search for `hunt` in all .kt files
- [ ] Search for `shelter` in all .kt files
- [ ] Search for `climate` in all .kt files

### Update Settings Registration
- [ ] Remove camping settings
- [ ] Remove weather settings
- [ ] Remove meal/food settings

### Clean Localization
- [ ] Remove camping-related translation keys from `lang/en.json`
- [ ] Remove weather-related translation keys from `lang/en.json`

## Phase 8: Documentation Updates

### README.md
- [ ] Update title to pf2e Kingdom-lite
- [ ] Remove camping section
- [ ] Remove weather section
- [ ] Update feature list
- [ ] Update screenshots section
- [ ] Update installation instructions
- [ ] Update development setup for simplified module

### Remove Unnecessary Docs
- [ ] Review and update `docs/house-rules.md`
- [ ] Remove camping/weather related documentation

## Phase 9: Final Build and Verification

### Build Steps
- [ ] Run `./gradlew clean`
- [ ] Run `./gradlew assemble`
- [ ] Check for compilation errors
- [ ] Fix any broken imports or references

### Testing Checklist
- [ ] Module loads in Foundry without errors
- [ ] Kingdom sheet opens correctly
- [ ] Kingdom activities work
- [ ] Kingdom events work
- [ ] Settlement management works
- [ ] Structure placement works
- [ ] No console errors related to missing camping/weather
- [ ] All kingdom macros still function

## Verification Searches

Run these searches to ensure complete removal:
```bash
# Find any remaining camping references
grep -r "camping" src/ --include="*.kt"
grep -r "Camping" src/ --include="*.kt"

# Find any remaining weather references
grep -r "weather" src/ --include="*.kt"
grep -r "Weather" src/ --include="*.kt"

# Find any remaining meal/food references
grep -r "meal" src/ --include="*.kt"
grep -r "food" src/ --include="*.kt"
grep -r "recipe" src/ --include="*.kt"
grep -r "provision" src/ --include="*.kt"

# Check for orphaned imports
grep -r "import.*camping" src/
grep -r "import.*weather" src/
grep -r "import.*meal" src/
grep -r "import.*recipe" src/
```

## Notes
- Keep all kingdom functionality intact
- Preserve existing PF2e system dependencies
- Maintain compatibility with Foundry v13
- Document any complex removals or edge cases below

### Edge Cases and Complex Removals
<!-- Add notes here as you encounter them -->
