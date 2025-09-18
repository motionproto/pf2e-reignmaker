package at.posselt.pfrpg2e.kingdom.actions.handlers

import at.posselt.pfrpg2e.kingdom.actions.BaseKingdomAction
import at.posselt.pfrpg2e.kingdom.actions.KingdomActionCategory
import at.posselt.pfrpg2e.kingdom.actions.PCSkill
import at.posselt.pfrpg2e.kingdom.sheet.KingdomSheet
import at.posselt.pfrpg2e.kingdom.KingdomActor
import at.posselt.pfrpg2e.kingdom.getKingdom
import at.posselt.pfrpg2e.kingdom.setKingdom
import at.posselt.pfrpg2e.kingdom.managers.WorksiteManager
import at.posselt.pfrpg2e.kingdom.data.RawResourceYield
import com.foundryvtt.core.Game
import com.foundryvtt.core.ui
import org.w3c.dom.HTMLElement
import org.w3c.dom.pointerevents.PointerEvent

/**
 * Handler for collecting resources from worksites.
 * Maps to "Collect Resources" action in Reignmaker-lite.
 * 
 * Uses Crafting, Society, or Survival checks to gather resources.
 * Resources are now tracked separately (Food, Ore, Stone, Lumber, Luxuries)
 * and provide bonuses to different kingdom aspects.
 */
class CollectResourcesHandler(
    private val worksiteManager: WorksiteManager
) : BaseKingdomAction() {
    override val actionId = "collect-resources"
    override val actionName = "Collect Resources"
    override val requiresGmApproval = false
    
    // Economic Actions category
    override val category = KingdomActionCategory.ECONOMIC_ACTIONS
    
    // Can be resolved with Crafting, Society, or Survival
    override val applicableSkills = listOf(
        PCSkill.CRAFTING,
        PCSkill.SOCIETY,
        PCSkill.SURVIVAL
    )
    
    // Base DC for collecting resources
    override val baseDC = 15
    
    override suspend fun handle(
        event: PointerEvent,
        target: HTMLElement,
        sheet: KingdomSheet,
        game: Game,
        actor: KingdomActor
    ) {
        val kingdom = actor.getKingdom() ?: return
        
        // Calculate production from worksites
        val collectedResources = worksiteManager.calculateTotalProduction(kingdom.worksites)
        
        // Add resources to the kingdom
        kingdom.commodities.now.food += collectedResources.food
        kingdom.commodities.now.lumber += collectedResources.lumber
        kingdom.commodities.now.stone += collectedResources.stone
        kingdom.commodities.now.ore += collectedResources.ore
        
        // Save the updated kingdom
        actor.setKingdom(kingdom)
        
        // Show notification of what was collected
        val message = buildString {
            append("Resources collected: ")
            val resourceList = mutableListOf<String>()
            if (collectedResources.food > 0) resourceList.add("${collectedResources.food} Food")
            if (collectedResources.ore > 0) resourceList.add("${collectedResources.ore} Ore")
            if (collectedResources.stone > 0) resourceList.add("${collectedResources.stone} Stone")
            if (collectedResources.lumber > 0) resourceList.add("${collectedResources.lumber} Lumber")
            // Luxuries removed in Reignmaker-lite
            
            if (resourceList.isEmpty()) {
                append("No resources collected this turn.")
            } else {
                append(resourceList.joinToString(", "))
            }
        }
        
        ui.notifications.info(message)
        sheet.render()
    }
    
    override fun getPlayerSkillsDescription(): String? {
        return "Collect Resources: Use ${applicableSkills.joinToString(", ") { it.displayName }} " +
               "to gather resources from your worksites. Crafting represents efficient production, " +
               "Society represents trade and distribution, and Survival represents resource extraction."
    }
}
