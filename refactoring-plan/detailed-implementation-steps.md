# Detailed Implementation Steps for Reignmaker-lite Features

## Phase 1: New Features (Weeks 1-2)

### Week 1: Fame System Implementation

#### Step 1.1: Create Fame Data Model
**File**: `src/jsMain/kotlin/at/posselt/pfrpg2e/kingdom/data/FameData.kt`
```kotlin
package at.posselt.pfrpg2e.kingdom.data

@Serializable
data class FameData(
    val current: Int = 0,
    val maximum: Int = 10,
    val usedForRerolls: MutableList<String> = mutableListOf(),
    val gainedFromCriticals: Int = 0
)
```

#### Step 1.2: Create Fame Manager
**File**: `src/jsMain/kotlin/at/posselt/pfrpg2e/kingdom/managers/FameManager.kt`
```kotlin
package at.posselt.pfrpg2e.kingdom.managers

import at.posselt.pfrpg2e.actor.KingdomActor
import at.posselt.pfrpg2e.kingdom.data.FameData

class FameManager {
    suspend fun startTurn(actor: KingdomActor) {
        val kingdom = actor.getKingdom() ?: return
        
        // Auto-gain 1 fame at turn start
        actor.update {
            recordOf(
                "system.fame" to FameData(
                    current = 1,
                    maximum = 10,
                    usedForRerolls = mutableListOf(),
                    gainedFromCriticals = 0
                )
            )
        }
    }
    
    suspend fun useForReroll(
        actor: KingdomActor, 
        checkId: String
    ): Boolean {
        val kingdom = actor.getKingdom() ?: return false
        val fame = kingdom.fame ?: FameData()
        
        if (fame.current > 0 && checkId !in fame.usedForRerolls) {
            actor.update {
                recordOf(
                    "system.fame.current" to (fame.current - 1),
                    "system.fame.usedForRerolls" to fame.usedForRerolls.plus(checkId)
                )
            }
            return true
        }
        return false
    }
    
    suspend fun gainFromCritical(actor: KingdomActor) {
        val kingdom = actor.getKingdom() ?: return
        val fame = kingdom.fame ?: FameData()
        
        actor.update {
            recordOf(
                "system.fame.current" to (fame.current + 1).coerceAtMost(fame.maximum),
                "system.fame.gainedFromCriticals" to (fame.gainedFromCriticals + 1)
            )
        }
    }
    
    suspend fun endTurn(actor: KingdomActor) {
        // Fame doesn't carry over
        actor.update {
            recordOf("system.fame" to null)
        }
    }
}
```

#### Step 1.3: Add Fame UI Component
**File**: `src/jsMain/kotlin/at/posselt/pfrpg2e/kingdom/sheet/FameComponent.kt`
```kotlin
package at.posselt.pfrpg2e.kingdom.sheet

import at.posselt.pfrpg2e.kingdom.data.FameData
import kotlinx.html.*
import kotlinx.html.dom.create
import org.w3c.dom.HTMLElement
import kotlinx.browser.document

class FameComponent {
    fun render(fame: FameData?): HTMLElement {
        val currentFame = fame ?: FameData(current = 1)
        
        return document.create.div {
            classes = setOf("fame-tracker")
            
            div {
                classes = setOf("fame-header")
                h3 { +"Fame Points" }
                span {
                    classes = setOf("fame-current")
                    +"${currentFame.current} / ${currentFame.maximum}"
                }
            }
            
            div {
                classes = setOf("fame-points-display")
                repeat(currentFame.current) {
                    span {
                        classes = setOf("fame-star")
                        attributes["title"] = "Click to use for reroll"
                        +"\uD83C\uDF1F" // Star emoji
                    }
                }
                repeat(currentFame.maximum - currentFame.current) {
                    span {
                        classes = setOf("fame-star", "empty")
                        +"\u2606" // Empty star
                    }
                }
            }
            
            if (currentFame.usedForRerolls.isNotEmpty()) {
                div {
                    classes = setOf("fame-used")
                    small {
                        +"Used for: ${currentFame.usedForRerolls.joinToString(", ")}"
                    }
                }
            }
        }
    }
}
```

#### Step 1.4: Integrate Fame into Turn Phases
**Add to**: `src/jsMain/kotlin/at/posselt/pfrpg2e/kingdom/sheet/KingdomSheet.kt`
```kotlin
// Add to imports
import at.posselt.pfrpg2e.kingdom.managers.FameManager
import at.posselt.pfrpg2e.kingdom.sheet.FameComponent

// Add to class properties
private val fameManager = FameManager()
private val fameComponent = FameComponent()

// Add to turn start action handler (in the giant switch statement)
"start-turn" -> buildPromise {
    // Existing turn start logic...
    
    // Add fame auto-gain
    fameManager.startTurn(actor)
    
    // Existing code...
}

// Add fame display to _preparePartContext
override fun _preparePartContext(): Promise<KingdomSheetContext> = buildPromise {
    // ... existing code ...
    
    val fameContext = kingdom.fame?.let { fame ->
        mapOf(
            "current" to fame.current,
            "maximum" to fame.maximum,
            "display" to fameComponent.render(fame).outerHTML
        )
    }
    
    // Add to context
    context["fame"] = fameContext
    
    // ... rest of existing code ...
}
```

### Week 2: Unrest Incident System

#### Step 2.1: Create Incident Data Models
**File**: `src/jsMain/kotlin/at/posselt/pfrpg2e/kingdom/data/UnrestIncidentData.kt`
```kotlin
package at.posselt.pfrpg2e.kingdom.data

import at.posselt.pfrpg2e.kingdom.KingdomSkill

enum class UnrestTier(
    val range: IntRange,
    val penalty: Int,
    val description: String
) {
    STABLE(0..2, 0, "The kingdom is stable"),
    DISCONTENT(3..5, -1, "Minor discontent spreads"),
    TURMOIL(6..8, -2, "Significant turmoil affects the kingdom"),
    REBELLION(9..Int.MAX_VALUE, -3, "Open rebellion threatens the realm")
}

@Serializable
data class UnrestIncident(
    val id: String,
    val name: String,
    val tier: String, // UnrestTier name
    val description: String,
    val skillOptions: List<IncidentSkillOption>
)

@Serializable
data class IncidentSkillOption(
    val skill: String, // KingdomSkill name
    val dc: Int? = null, // null means use level-based DC
    val successEffect: String,
    val failureEffect: String,
    val criticalSuccessBonus: String? = null,
    val criticalFailureExtra: String? = null
)

@Serializable
data class PassiveUnrestSources(
    val fromWar: Int = 0,
    val fromTerritory: Int = 0,
    val fromMetropolises: Int = 0,
    val total: Int = 0
)
```

#### Step 2.2: Create Incident Tables
**File**: `src/jsMain/kotlin/at/posselt/pfrpg2e/kingdom/incidents/IncidentTables.kt`
```kotlin
package at.posselt.pfrpg2e.kingdom.incidents

import at.posselt.pfrpg2e.kingdom.data.*
import kotlin.random.Random

object IncidentTables {
    // Minor Incidents (Tier 1: Discontent)
    val minorIncidents = listOf(
        UnrestIncident(
            id = "petty-crime",
            name = "Petty Crime Wave",
            tier = "DISCONTENT",
            description = "A wave of petty thefts and vandalism sweeps through the settlements.",
            skillOptions = listOf(
                IncidentSkillOption(
                    skill = "INTRIGUE",
                    successEffect = "Crime ring dismantled",
                    failureEffect = "Crime continues, +1 Unrest",
                    criticalSuccessBonus = "Recover stolen goods, +1 RP"
                ),
                IncidentSkillOption(
                    skill = "DEFENSE",
                    successEffect = "Criminals arrested",
                    failureEffect = "Guards overwhelmed, +1 Unrest"
                )
            )
        ),
        UnrestIncident(
            id = "labor-dispute",
            name = "Labor Dispute",
            tier = "DISCONTENT",
            description = "Workers in a key industry threaten to strike.",
            skillOptions = listOf(
                IncidentSkillOption(
                    skill = "POLITICS",
                    successEffect = "Negotiation successful",
                    failureEffect = "Strike begins, -2 resource production next turn"
                ),
                IncidentSkillOption(
                    skill = "TRADE",
                    successEffect = "Economic compromise reached",
                    failureEffect = "Trade disrupted, +1 Unrest"
                )
            )
        )
        // Add more incidents...
    )
    
    // Moderate Incidents (Tier 2: Turmoil)
    val moderateIncidents = listOf(
        UnrestIncident(
            id = "food-riot",
            name = "Food Riot",
            tier = "TURMOIL",
            description = "Hungry citizens riot over food shortages.",
            skillOptions = listOf(
                IncidentSkillOption(
                    skill = "AGRICULTURE",
                    successEffect = "Emergency food distributed",
                    failureEffect = "Riots spread, +2 Unrest",
                    criticalFailureExtra = "Granary burned, lose stored food"
                ),
                IncidentSkillOption(
                    skill = "WARFARE",
                    successEffect = "Riot suppressed",
                    failureEffect = "Violence escalates, +1 Unrest, 1 building damaged"
                )
            )
        )
        // Add more incidents...
    )
    
    // Major Incidents (Tier 3: Rebellion)
    val majorIncidents = listOf(
        UnrestIncident(
            id = "noble-coup",
            name = "Noble Coup Attempt",
            tier = "REBELLION",
            description = "Disaffected nobles attempt to seize power!",
            skillOptions = listOf(
                IncidentSkillOption(
                    skill = "INTRIGUE",
                    successEffect = "Coup exposed and prevented",
                    failureEffect = "Coup partially successful, lose 1 settlement",
                    criticalSuccessBonus = "Conspirators reveal more plots, prevent next incident"
                ),
                IncidentSkillOption(
                    skill = "WARFARE",
                    successEffect = "Coup crushed militarily",
                    failureEffect = "Civil war begins, +3 Unrest, must fight battle"
                )
            )
        )
        // Add more incidents...
    )
    
    fun rollForIncident(tier: UnrestTier): UnrestIncident? {
        val roll = Random.nextInt(100)
        
        return when(tier) {
            UnrestTier.STABLE -> null
            UnrestTier.DISCONTENT -> {
                if (roll < 20) null // 20% no incident
                else minorIncidents.random()
            }
            UnrestTier.TURMOIL -> {
                if (roll < 15) null // 15% no incident
                else moderateIncidents.random()
            }
            UnrestTier.REBELLION -> {
                if (roll < 10) null // 10% no incident
                else majorIncidents.random()
            }
        }
    }
}
```

#### Step 2.3: Create Unrest Incident Manager
**File**: `src/jsMain/kotlin/at/posselt/pfrpg2e/kingdom/managers/UnrestIncidentManager.kt`
```kotlin
package at.posselt.pfrpg2e.kingdom.managers

import at.posselt.pfrpg2e.actor.KingdomActor
import at.posselt.pfrpg2e.kingdom.data.*
import at.posselt.pfrpg2e.kingdom.incidents.IncidentTables

class UnrestIncidentManager {
    
    fun calculatePassiveUnrest(
        atWar: Boolean,
        hexCount: Int,
        metropolisCount: Int
    ): PassiveUnrestSources {
        val fromWar = if (atWar) 1 else 0
        val fromTerritory = when {
            hexCount >= 32 -> 4
            hexCount >= 24 -> 3
            hexCount >= 16 -> 2
            hexCount >= 8 -> 1
            else -> 0
        }
        val fromMetropolises = metropolisCount
        
        return PassiveUnrestSources(
            fromWar = fromWar,
            fromTerritory = fromTerritory,
            fromMetropolises = fromMetropolises,
            total = fromWar + fromTerritory + fromMetropolises
        )
    }
    
    fun determineUnrestTier(unrest: Int): UnrestTier {
        return UnrestTier.values().find { unrest in it.range }
            ?: UnrestTier.STABLE
    }
    
    suspend fun checkForIncident(
        actor: KingdomActor,
        unrest: Int
    ): UnrestIncident? {
        val tier = determineUnrestTier(unrest)
        
        if (tier == UnrestTier.STABLE) {
            return null
        }
        
        return IncidentTables.rollForIncident(tier)
    }
    
    suspend fun applyPassiveUnrest(
        actor: KingdomActor,
        passiveSources: PassiveUnrestSources
    ) {
        if (passiveSources.total > 0) {
            val kingdom = actor.getKingdom() ?: return
            val newUnrest = (kingdom.unrest + passiveSources.total).coerceAtLeast(0)
            
            actor.update {
                recordOf("system.unrest" to newUnrest)
            }
            
            // Log the sources
            console.log("""
                Passive Unrest Added: ${passiveSources.total}
                - From War: ${passiveSources.fromWar}
                - From Territory Size: ${passiveSources.fromTerritory}  
                - From Metropolises: ${passiveSources.fromMetropolises}
            """.trimIndent())
        }
    }
}
```

#### Step 2.4: Create Incident Resolution Dialog
**File**: `src/jsMain/kotlin/at/posselt/pfrpg2e/kingdom/dialogs/IncidentDialog.kt`
```kotlin
package at.posselt.pfrpg2e.kingdom.dialogs

import at.posselt.pfrpg2e.kingdom.data.UnrestIncident
import at.posselt.pfrpg2e.kingdom.data.IncidentSkillOption
import com.foundryvtt.core.applications.api.DialogV2
import kotlinx.html.*
import kotlinx.html.dom.create
import kotlinx.browser.document

class IncidentDialog(
    private val incident: UnrestIncident,
    private val onResolve: (IncidentSkillOption) -> Unit
) {
    fun show() {
        val content = document.create.div {
            classes = setOf("incident-dialog")
            
            h3 { 
                classes = setOf("incident-title")
                +incident.name 
            }
            
            p { 
                classes = setOf("incident-description")
                +incident.description 
            }
            
            div {
                classes = setOf("incident-options")
                h4 { +"Choose your response:" }
                
                incident.skillOptions.forEach { option ->
                    div {
                        classes = setOf("incident-option")
                        
                        button {
                            classes = setOf("skill-button")
                            attributes["data-skill"] = option.skill
                            
                            +"Use ${option.skill}"
                        }
                        
                        div {
                            classes = setOf("option-effects")
                            p {
                                classes = setOf("success")
                                +"Success: ${option.successEffect}"
                            }
                            p {
                                classes = setOf("failure")
                                +"Failure: ${option.failureEffect}"
                            }
                        }
                    }
                }
            }
        }
        
        DialogV2.prompt({
            window {
                title = "Unrest Incident!"
                content = content.outerHTML
            }
            buttons = incident.skillOptions.map { option ->
                {
                    label = "Use ${option.skill}"
                    callback = { onResolve(option) }
                }
            }
        })
    }
}
```

## Phase 2: Refactoring (Weeks 3-4)

### Week 3-4: Extract Action Handlers

#### Step 3.1: Create Action Handler Interface
**File**: `src/jsMain/kotlin/at/posselt/pfrpg2e/kingdom/actions/ActionHandler.kt`
```kotlin
package at.posselt.pfrpg2e.kingdom.actions

import at.posselt.pfrpg2e.kingdom.sheet.KingdomSheet
import org.w3c.dom.HTMLElement
import org.w3c.dom.events.PointerEvent
import kotlin.js.Promise

interface ActionHandler {
    val actionId: String
    suspend fun handle(
        event: PointerEvent,
        target: HTMLElement,
        sheet: KingdomSheet
    ): Unit
}
```

#### Step 3.2: Create Action Registry
**File**: `src/jsMain/kotlin/at/posselt/pfrpg2e/kingdom/actions/ActionRegistry.kt`
```kotlin
package at.posselt.pfrpg2e.kingdom.actions

import at.posselt.pfrpg2e.kingdom.sheet.KingdomSheet
import org.w3c.dom.HTMLElement
import org.w3c.dom.events.PointerEvent

class ActionRegistry {
    private val handlers = mutableMapOf<String, ActionHandler>()
    
    fun register(handler: ActionHandler) {
        handlers[handler.actionId] = handler
    }
    
    fun registerAll(vararg handlers: ActionHandler) {
        handlers.forEach { register(it) }
    }
    
    suspend fun handle(
        actionId: String,
        event: PointerEvent,
        target: HTMLElement,
        sheet: KingdomSheet
    ): Boolean {
        val handler = handlers[actionId] ?: return false
        handler.handle(event, target, sheet)
        return true
    }
    
    fun hasHandler(actionId: String): Boolean {
        return actionId in handlers
    }
}
```

#### Step 3.3: Example Action Handler Extraction
**File**: `src/jsMain/kotlin/at/posselt/pfrpg2e/kingdom/actions/handlers/GainXpHandler.kt`
```kotlin
package at.posselt.pfrpg2e.kingdom.actions.handlers

import at.posselt.pfrpg2e.kingdom.actions.ActionHandler
import at.posselt.pfrpg2e.kingdom.sheet.KingdomSheet
import at.posselt.pfrpg2e.utils.buildPromise
import org.w3c.dom.HTMLElement
import org.w3c.dom.events.PointerEvent

class GainXpHandler : ActionHandler {
    override val actionId = "gain-xp"
    
    override suspend fun handle(
        event: PointerEvent,
        target: HTMLElement,
        sheet: KingdomSheet
    ) {
        val xpAmount = target.dataset["xp"]?.toIntOrNull() ?: return
        val kingdom = sheet.actor.getKingdom() ?: return
        
        sheet.actor.gainXp(xpAmount)
        sheet.render()
    }
}
```

#### Step 3.4: Wire Registry to KingdomSheet
**File**: `src/jsMain/kotlin/at/posselt/pfrpg2e/kingdom/sheet/KingdomSheet.kt`
```kotlin
// Add to imports
import at.posselt.pfrpg2e.kingdom.actions.ActionRegistry
import at.posselt.pfrpg2e.kingdom.actions.handlers.*

// Add to class
private val actionRegistry = ActionRegistry().apply {
    // Register all handlers
    registerAll(
        GainXpHandler(),
        LevelUpHandler(),
        EndTurnHandler(),
        // ... add all 100+ handlers
    )
}

// Modify _onClickAction
override fun _onClickAction(event: PointerEvent, target: HTMLElement) {
    val actionId = target.dataset["action"] ?: return
    
    // Try new registry first (with feature flag)
    if (settings.getEnableRefactoredActions()) {
        buildPromise {
            if (actionRegistry.handle(actionId, event, target, this)) {
                return@buildPromise
            }
            // Fall through to old system if not handled
        }
    }
    
    // Keep existing switch statement as fallback
    when (actionId) {
        // ... existing 100+ cases remain for now
    }
}
```

## Phase 3: Diplomatic Relations (Weeks 5-6)

### Week 5-6: Diplomatic System

[Similar detailed structure for diplomatic relations implementation]

## Testing Strategy

### Unit Tests for Each Component
- Fame system tests
- Incident system tests  
- Action handler tests
- Integration tests

### Feature Flags for Safe Rollout
```kotlin
// In settings
var enableFameSystem = false
var enableUnrestIncidents = false
var enableRefactoredActions = false
var enableDiplomaticRelations = false
```

## Migration Checklist

### Week 1
- [ ] Create Fame data model
- [ ] Implement FameManager
- [ ] Add Fame UI component
- [ ] Integrate with turn phases
- [ ] Test Fame system

### Week 2
- [ ] Create Incident data models
- [ ] Build incident tables
- [ ] Implement UnrestIncidentManager
- [ ] Create incident dialog
- [ ] Test incident system

### Week 3-4
- [ ] Create ActionHandler interface
- [ ] Build ActionRegistry
- [ ] Extract first 25 handlers
- [ ] Extract next 25 handlers
- [ ] Extract remaining handlers
- [ ] Test all handlers

### Week 5-6
- [ ] Design diplomatic data models
- [ ] Implement diplomatic manager
- [ ] Create diplomatic UI
- [ ] Test diplomatic system

### Week 7
- [ ] Integration testing
- [ ] Performance testing
- [ ] Bug fixes
- [ ] Documentation

## Success Criteria

1. All new features working as specified
2. No regression in existing functionality
3. Kingmaker integration preserved
4. Performance maintained
5. Clean, maintainable code

---

This detailed plan provides specific code examples and step-by-step implementation instructions while preserving the valuable Kingmaker integration.
