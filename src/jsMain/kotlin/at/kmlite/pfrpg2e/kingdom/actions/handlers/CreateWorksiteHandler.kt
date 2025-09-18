package at.kmlite.pfrpg2e.kingdom.actions.handlers

import at.kmlite.pfrpg2e.kingdom.KingdomActor
import at.kmlite.pfrpg2e.kingdom.actions.*
import at.kmlite.pfrpg2e.kingdom.sheet.KingdomSheet
import at.kmlite.pfrpg2e.kingdom.getKingdom
import at.kmlite.pfrpg2e.kingdom.setKingdom
import at.kmlite.pfrpg2e.kingdom.managers.WorksiteManager
import com.foundryvtt.core.Game
import org.w3c.dom.HTMLElement
import org.w3c.dom.pointerevents.PointerEvent
import at.kmlite.pfrpg2e.utils.postChatMessage

/**
 * Handler for creating worksites on hexes.
 * Part of the "Expand Borders" category.
 * Uses PC skills instead of kingdom skills.
 */
class CreateWorksiteHandler(
    private val worksiteManager: WorksiteManager
) : BaseKingdomAction() {
    
    override val actionId = "create-worksite"
    override val actionName = "Create Worksite"
    override val category = KingdomActionCategory.EXPAND_BORDERS
    override val oncePerTurn = false
    override val capitalBonus = true
    
    // PC skills that can be used to establish a worksite
    override val applicableSkills = listOf(
        PCSkill.SURVIVAL,      // Understanding the land
        PCSkill.NATURE,        // Working with terrain
        PCSkill.CRAFTING,      // Building infrastructure
        PCSkill.SOCIETY        // Organizing workers
    )
    
    override val baseDC = 15  // Base DC for establishing a worksite
    
    override suspend fun handle(
        event: PointerEvent,
        target: HTMLElement,
        sheet: KingdomSheet,
        game: Game,
        actor: KingdomActor
    ) {
        val kingdom = actor.getKingdom() ?: return
        
        // Get hex information from the event target
        val hexId = target.dataset["hexId"] ?: run {
            postChatMessage("No hex selected for worksite creation")
            return
        }
        
        val terrain = target.dataset["terrain"] ?: run {
            postChatMessage("Cannot determine hex terrain")
            return
        }
        
        // Check if hex already has a worksite
        if (worksiteManager.hexHasWorksite(kingdom.worksites, hexId)) {
            postChatMessage("This hex already has a worksite")
            return
        }
        
        // Get available worksite types for this terrain
        val availableWorksites = worksiteManager.getAvailableWorksitesForTerrain(terrain)
        if (availableWorksites.isEmpty()) {
            postChatMessage("No worksites can be built on $terrain terrain")
            return
        }
        
        // For now, select the first available type
        // In a full implementation, this would show a dialog for the player to choose
        val selectedType = availableWorksites.first()
        
        // Create the worksite
        val result = worksiteManager.createWorksite(
            hexId = hexId,
            terrain = terrain,
            worksiteType = selectedType.type,
            specialTrait = null // Could be determined by critical success
        )
        
        if (!result.success) {
            postChatMessage("Failed to create worksite: ${result.error}")
            return
        }
        
        // Add worksite to kingdom
        val updatedWorksites = worksiteManager.addWorksite(
            kingdom.worksites,
            result.worksite!!
        )
        
        kingdom.worksites = updatedWorksites
        
        // Save kingdom
        actor.setKingdom(kingdom)
        
        // Announce success
        val production = worksiteManager.previewProduction(terrain, selectedType.type)
        val productionText = buildString {
            if (production?.food ?: 0 > 0) append("Food: ${production!!.food} ")
            if (production?.lumber ?: 0 > 0) append("Lumber: ${production!!.lumber} ")
            if (production?.stone ?: 0 > 0) append("Stone: ${production!!.stone} ")
            if (production?.ore ?: 0 > 0) append("Ore: ${production!!.ore} ")
        }
        
        postChatMessage("""
            <h3>Worksite Created!</h3>
            <p><strong>${selectedType.displayName}</strong> established on hex $hexId</p>
            <p><em>${selectedType.description}</em></p>
            <p>Production per turn: $productionText</p>
        """.trimIndent())
        
        // Refresh sheet
        sheet.render()
    }
    
    override fun validate(actor: KingdomActor): Boolean {
        val kingdom = actor.getKingdom() ?: return false
        
        // Must be in action phase
        val currentPhase = kingdom.currentTurnPhase
        if (currentPhase != null && currentPhase != "phase5-actions") {
            return false
        }
        
        return true
    }
}
