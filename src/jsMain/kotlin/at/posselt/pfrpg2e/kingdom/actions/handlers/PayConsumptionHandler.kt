package at.posselt.pfrpg2e.kingdom.actions.handlers

import at.posselt.pfrpg2e.kingdom.actions.PlayerSkillActionHandler
import at.posselt.pfrpg2e.kingdom.sheet.KingdomSheet
import at.posselt.pfrpg2e.kingdom.KingdomActor
import at.posselt.pfrpg2e.kingdom.getKingdom
import at.posselt.pfrpg2e.kingdom.managers.ResourceManager
import com.foundryvtt.core.Game
import com.foundryvtt.core.ui
import org.w3c.dom.HTMLElement
import org.w3c.dom.pointerevents.PointerEvent

/**
 * Handler for paying consumption during upkeep phase.
 * This is part of the turn sequence in Phase 2 (Upkeep).
 * 
 * In Reignmaker-lite, consumption is paid in Food resources.
 * Gold can be spent to supplement Food at a 1:1 ratio.
 */
class PayConsumptionHandler(
    private val resourceManager: ResourceManager
) : PlayerSkillActionHandler {
    override val actionId = "pay-consumption"
    override val actionName = "Pay Consumption"
    override val requiresGmApproval = false
    
    override suspend fun handle(
        event: PointerEvent,
        target: HTMLElement,
        sheet: KingdomSheet,
        game: Game,
        actor: KingdomActor
    ) {
        val kingdom = actor.getKingdom() ?: return
        
        // Calculate consumption (based on kingdom size)
        val consumption = resourceManager.calculateConsumption(kingdom)
        
        // Try to pay consumption with food first
        val foodAvailable = kingdom.resources?.food ?: 0
        var foodUsed = minOf(foodAvailable, consumption)
        var goldUsed = 0
        
        if (foodUsed < consumption) {
            // Not enough food, use gold to supplement
            val goldNeeded = consumption - foodUsed
            val goldAvailable = kingdom.gold?.amount ?: 0
            goldUsed = minOf(goldAvailable, goldNeeded)
        }
        
        // Apply the consumption payment
        if (foodUsed > 0) {
            resourceManager.consumeFood(actor, foodUsed)
        }
        if (goldUsed > 0) {
            resourceManager.spendGold(actor, goldUsed)
        }
        
        // Check if consumption was fully paid
        val totalPaid = foodUsed + goldUsed
        if (totalPaid < consumption) {
            val shortfall = consumption - totalPaid
            ui.notifications.warn("Unable to fully pay consumption! Short by $shortfall. Unrest will increase.")
            // TODO: Increase unrest due to unpaid consumption
        } else {
            ui.notifications.info("Consumption paid: $foodUsed Food${if (goldUsed > 0) " and $goldUsed Gold" else ""}")
        }
        
        sheet.render()
    }
    
    override fun getPlayerSkillsDescription(): String? {
        return "Pay Consumption: This is an automatic phase action that doesn't require a skill check. " +
               "Consumption is paid with Food resources, with Gold able to supplement at a 1:1 ratio."
    }
}
