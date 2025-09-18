package at.kmlite.pfrpg2e.kingdom.modifiers.penalties

import at.kmlite.pfrpg2e.data.kingdom.settlements.Settlement
import at.kmlite.pfrpg2e.kingdom.modifiers.Modifier
import at.kmlite.pfrpg2e.kingdom.modifiers.ModifierType

fun createSecondaryTerritoryPenalty(currentSettlement: Settlement): Modifier? =
    if(currentSettlement.isSecondaryTerritory) {
        Modifier(
            type = ModifierType.CIRCUMSTANCE,
            value = -4,
            id = "secondary-territory",
            name = "modifiers.penalties.secondaryTerritory",
        )
    } else {
        null
    }