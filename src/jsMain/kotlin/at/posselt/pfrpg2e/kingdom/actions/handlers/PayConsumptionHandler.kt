package at.posselt.pfrpg2e.kingdom.actions.handlers

import at.posselt.pfrpg2e.kingdom.actions.BaseKingdomAction
import at.posselt.pfrpg2e.kingdom.actions.KingdomActionCategory
import at.posselt.pfrpg2e.kingdom.sheet.KingdomSheet
import at.posselt.pfrpg2e.kingdom.KingdomActor
import at.posselt.pfrpg2e.kingdom.getKingdom
import at.posselt.pfrpg2e.kingdom.setKingdom
import at.posselt.pfrpg2e.kingdom.getAllSettlements
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
class PayConsumptionHandler : BaseKingdomAction() {
    override val actionId = "pay-consumption"
    override val actionName = "Pay Consumption"
    override val requiresGmApproval = false
    override val category = KingdomActionCategory.ECONOMIC_ACTIONS // UPKEEP_ACTIONS doesn't exist, using ECONOMIC_ACTIONS
    
    // No skill check required - automatic action
    override val applicableSkills = emptyList<at.posselt.pfrpg2e.kingdom.actions.PCSkill>()
    override val baseDC = 0
    
    override suspend fun handle(
        event: PointerEvent,
        target: HTMLElement,
        sheet: KingdomSheet,
        game: Game,
        actor: KingdomActor
    ) {
        val kingdom = actor.getKingdom() ?: return
        
        // Calculate food consumption based on settlement levels
        val settlements = kingdom.getAllSettlements(game)
        val consumption = settlements.allSettlements.sumOf { settlement ->
            val level = settlement.occupiedBlocks
            when {
                level >= 20 -> 12 // Metropolis
                level >= 10 -> 8  // City
                level >= 5 -> 4   // Town
                else -> 1         // Village
            }
        }
        
        // Add army consumption if any
        val armyConsumption = kingdom.consumption.armies
        val totalConsumption = consumption + armyConsumption
        
        // Try to pay consumption with food first
        val foodAvailable = kingdom.commodities.now.food
        var foodUsed = minOf(foodAvailable, totalConsumption)
        var goldUsed = 0
        
        if (foodUsed < totalConsumption) {
            // Not enough food, use gold to supplement at 1:1 ratio
            val goldNeeded = totalConsumption - foodUsed
            val goldAvailable = kingdom.gold.treasury
            goldUsed = minOf(goldAvailable, goldNeeded)
        }
        
        // Apply the consumption payment
        kingdom.commodities.now.food = (kingdom.commodities.now.food - foodUsed).coerceAtLeast(0)
        kingdom.gold.treasury = (kingdom.gold.treasury - goldUsed).coerceAtLeast(0)
        
        // Check if consumption was fully paid
        val totalPaid = foodUsed + goldUsed
        if (totalPaid < totalConsumption) {
            val shortfall = totalConsumption - totalPaid
            // Increase unrest due to unpaid consumption
            kingdom.unrest = kingdom.unrest + 1
            ui.notifications.warn("Unable to fully pay consumption! Short by $shortfall. Unrest increased by 1.")
        } else {
            ui.notifications.info("Consumption paid: $foodUsed Food${if (goldUsed > 0) " and $goldUsed Gold" else ""}")
        }
        
        // Save the updated kingdom
        actor.setKingdom(kingdom)
        sheet.render()
    }
    
    override fun getPlayerSkillsDescription(): String? {
        return "Pay Consumption: This is an automatic phase action that doesn't require a skill check. " +
               "Consumption is paid with Food resources, with Gold able to supplement at a 1:1 ratio."
    }
}
