package at.posselt.pfrpg2e.kingdom.actions.handlers

import at.posselt.pfrpg2e.kingdom.actions.BaseKingdomAction
import at.posselt.pfrpg2e.kingdom.actions.KingdomActionCategory
import at.posselt.pfrpg2e.kingdom.actions.PCSkill
import at.posselt.pfrpg2e.kingdom.sheet.KingdomSheet
import at.posselt.pfrpg2e.kingdom.KingdomActor
import at.posselt.pfrpg2e.kingdom.getKingdom
import at.posselt.pfrpg2e.kingdom.managers.ConstructionManager
import com.foundryvtt.core.Game
import com.foundryvtt.core.ui
import org.w3c.dom.HTMLElement
import org.w3c.dom.pointerevents.PointerEvent

/**
 * Handler for building structures in settlements.
 * Maps to "Build Structure" action in Reignmaker-lite.
 * 
 * Uses Crafting, Engineering (Lore), or Society checks to construct buildings.
 * Structures are now built using the construction queue system.
 */
class BuildStructureHandler(
    private val constructionManager: ConstructionManager
) : BaseKingdomAction() {
    override val actionId = "build-structure"
    override val actionName = "Build Structure"
    override val requiresGmApproval = false
    
    // Urban Planning category
    override val category = KingdomActionCategory.URBAN_PLANNING
    
    // Can be resolved with Crafting, Lore (Engineering), or Society
    override val applicableSkills = listOf(
        PCSkill.CRAFTING,
        PCSkill.LORE, // Engineering Lore
        PCSkill.SOCIETY
    )
    
    // Base DC for building structures
    override val baseDC = 15
    
    override suspend fun handle(
        event: PointerEvent,
        target: HTMLElement,
        sheet: KingdomSheet,
        game: Game,
        actor: KingdomActor
    ) {
        val kingdom = actor.getKingdom() ?: return
        
        // TODO: Implement structure selection and building
        ui.notifications.info("Build Structure action triggered - implementation pending")
        
        // This would typically:
        // 1. Show structure selection dialog
        // 2. Check resource requirements
        // 3. Show skill check dialog with Crafting/Lore/Society options
        // 4. Roll the check with capital bonus if applicable
        // 5. Apply results:
        //    - Critical Success: Structure built with bonus or discount
        //    - Success: Structure built normally
        //    - Failure: Resources spent but structure not built
        //    - Critical Failure: Resources lost and possible damage
        // 6. Add to construction queue or complete immediately
        
        sheet.render()
    }
    
    override fun getPlayerSkillsDescription(): String? {
        return "Build Structure: Use ${applicableSkills.joinToString(", ") { it.displayName }} " +
               "to construct buildings in your settlements. Crafting represents physical construction, " +
               "Engineering Lore represents technical knowledge, and Society represents organizing workers."
    }
}
