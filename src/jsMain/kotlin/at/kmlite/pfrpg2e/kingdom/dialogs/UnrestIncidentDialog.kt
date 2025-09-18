package at.kmlite.pfrpg2e.kingdom.dialogs

import at.kmlite.pfrpg2e.kingdom.KingdomActor
import at.kmlite.pfrpg2e.kingdom.KingdomData
import at.kmlite.pfrpg2e.kingdom.data.UnrestIncident
import at.kmlite.pfrpg2e.kingdom.data.IncidentSkillOption
import at.kmlite.pfrpg2e.kingdom.data.IncidentResolutionResult
import at.kmlite.pfrpg2e.kingdom.data.getSkillOptions
import at.kmlite.pfrpg2e.kingdom.managers.UnrestIncidentManager
import at.kmlite.pfrpg2e.kingdom.sheet.CharacterSelector
import at.kmlite.pfrpg2e.data.checks.DegreeOfSuccess
import at.kmlite.pfrpg2e.utils.buildPromise
import at.kmlite.pfrpg2e.utils.postChatMessage
import at.kmlite.pfrpg2e.utils.t
import at.kmlite.pfrpg2e.kingdom.getKingdom
import com.foundryvtt.core.Game
import com.foundryvtt.core.applications.ux.TextEditor.enrichHtml
import js.objects.recordOf
import kotlin.random.Random

/**
 * Dialog for presenting unrest incidents and allowing players to choose resolution approaches.
 * Integrates with the existing KingdomCheckDialog for skill checks.
 */
suspend fun showUnrestIncidentDialog(
    game: Game,
    kingdomActor: KingdomActor,
    incident: UnrestIncident,
    manager: UnrestIncidentManager,
    onComplete: () -> Unit = {}
) = buildPromise {
    val kingdom = kingdomActor.getKingdom() ?: return@buildPromise
    val tier = manager.determineUnrestTier(kingdom.unrest)
    
    // Get the player's assigned character
    val assignedCharacter = CharacterSelector.getPlayerAssignedCharacter(game)
    val characterInfo = if (assignedCharacter != null) {
        "${assignedCharacter.name} (${game.user.name})"
    } else {
        t("kingdom.noCharacterAssigned", recordOf("player" to game.user.name))
    }
    
    // Build the message content for the incident
    val incidentMessage = buildString {
        appendLine("<div class='unrest-incident'>")
        appendLine("<h3>${incident.name}</h3>")
        appendLine("<p class='tier'>${t("kingdom.unrestTier.${tier.name}")} (${tier.penalty} penalty)</p>")
        appendLine("<p class='description'>${incident.description}</p>")
        
        // Show which character will be used
        appendLine("<div class='character-info'>")
        appendLine("<strong>${t("kingdom.resolvingAs")}:</strong> $characterInfo")
        if (assignedCharacter == null) {
            appendLine("<br><em>${t("kingdom.assignCharacterToResolve")}</em>")
        }
        appendLine("</div>")
        
        appendLine("<h4>${t("kingdom.chooseYourResponse")}</h4>")
        appendLine("<div class='skill-options'>")
        
        incident.skillOptions.forEach { option ->
            // Use the skill name directly - these are PF2e character skills
            val skillName = option.skill.capitalize()
            
            appendLine("<div class='skill-option' data-skill='${option.skill}'>")
            appendLine("<h5>$skillName</h5>")
            appendLine("<ul>")
            appendLine("<li class='success'><strong>${t("kingdom.success")}:</strong> ${option.successEffect}</li>")
            appendLine("<li class='failure'><strong>${t("kingdom.failure")}:</strong> ${option.failureEffect}</li>")
            
            option.criticalSuccessBonus?.let { 
                appendLine("<li class='critical-success'><strong>${t("kingdom.criticalSuccess")}:</strong> $it</li>")
            }
            
            option.criticalFailureExtra?.let { 
                appendLine("<li class='critical-failure'><strong>${t("kingdom.criticalFailure")}:</strong> $it</li>")
            }
            
            appendLine("</ul>")
            
            // Use PF2e inline check format with @self.level for party-level DC
            // Universal unrest penalty applies to ALL kingdom checks
            val unrestPenalty = when {
                kingdom.unrest >= 15 -> 5  // Rebellion
                kingdom.unrest >= 10 -> 2  // Turmoil
                kingdom.unrest >= 5 -> 1   // Discontent
                else -> 0                   // Stable
            }
            val dcFormula = if (unrestPenalty > 0) {
                "@self.level+${unrestPenalty}"
            } else {
                "@self.level"
            }
            
            // Create inline check with metadata for result capture
            val checkLink = enrichHtml(
                "@Check[type:${option.skill}|dc:${dcFormula}|traits:player-roll,roll-incident|" +
                "rollOptions:roll-id:${incident.id},skill:${option.skill}|name:${incident.name} - ${skillName}]"
            )
            appendLine("<div class='skill-check-link'>$checkLink</div>")
            
            appendLine("</div>")
        }
        
        appendLine("</div>")
        appendLine("</div>")
    }
    
    // Post the incident message to chat with PF2e inline checks
    postChatMessage(incidentMessage, isHtml = true)
    
    onComplete()
}

/**
 * Parses an effect string into an IncidentResolutionResult.
 * This is a simplified parser - in production, you'd want more robust parsing.
 */
private fun parseIncidentEffect(effect: String, isCriticalSuccess: Boolean): IncidentResolutionResult {
    val result = IncidentResolutionResult()
    val effectLower = effect.lowercase()
    
    // Parse unrest changes
    when {
        effectLower.contains("+2 unrest") -> return result.copy(unrestChange = 2)
        effectLower.contains("+1 unrest") -> return result.copy(unrestChange = 1)
        effectLower.contains("-1 unrest") && isCriticalSuccess -> return result.copy(unrestChange = -1)
    }
    
    // Parse gold loss (simplified - would need proper dice rolling)
    when {
        effectLower.contains("lose 4d6 gold") -> return result.copy(goldLost = Random.nextInt(4, 25))
        effectLower.contains("lose 3d4 gold") -> return result.copy(goldLost = Random.nextInt(3, 13))
        effectLower.contains("lose 2d6 gold") -> return result.copy(goldLost = Random.nextInt(2, 13))
        effectLower.contains("lose 2d4 gold") -> return result.copy(goldLost = Random.nextInt(2, 9))
        effectLower.contains("lose 1d4 gold") -> return result.copy(goldLost = Random.nextInt(1, 5))
    }
    
    // Parse food loss
    when {
        effectLower.contains("lose 2d4 food") -> return result.copy(foodLost = Random.nextInt(2, 9))
        effectLower.contains("lose 1d4 food") -> return result.copy(foodLost = Random.nextInt(1, 5))
    }
    
    // Parse fame loss
    when {
        effectLower.contains("-1 fame") || effectLower.contains("lose 1 fame") -> {
            return result.copy(fameLost = 1)
        }
        effectLower.contains("zero fame") -> {
            // Special case - set fame to 0
            return result.copy(fameLost = 999, customMessage = t("kingdom.incident.fameZeroed"))
        }
    }
    
    // Parse worksite losses
    when {
        effectLower.contains("lose 1 worksite") || effectLower.contains("lose 1 random worksite") -> {
            return result.copy(worksitesLost = 1)
        }
    }
    
    // Parse hex losses
    when {
        effectLower.contains("lose 1d3 border hexes") || effectLower.contains("lose 1d3 hexes") -> {
            return result.copy(hexesLost = Random.nextInt(1, 4))
        }
        effectLower.contains("lose 2d3 hexes") -> {
            return result.copy(hexesLost = Random.nextInt(2, 7))
        }
        effectLower.contains("lose 1 border hex") || effectLower.contains("lose 1 hex") -> {
            return result.copy(hexesLost = 1)
        }
    }
    
    // Parse structure damage
    when {
        effectLower.contains("1 structure destroyed") -> {
            return result.copy(structuresDestroyed = listOf("random"))
        }
        effectLower.contains("1 structure damaged") -> {
            return result.copy(structuresDamaged = listOf("random"))
        }
        effectLower.contains("1d3 structures damaged") -> {
            val count = Random.nextInt(1, 4)
            return result.copy(structuresDamaged = List(count) { "random" })
        }
    }
    
    // Parse diplomatic changes
    when {
        effectLower.contains("two kingdoms' attitudes worsen by 2") -> {
            return result.copy(diplomaticChanges = mapOf("random1" to -2, "random2" to -2))
        }
        effectLower.contains("one kingdom's attitude worsens by 2") -> {
            return result.copy(diplomaticChanges = mapOf("random" to -2))
        }
        effectLower.contains("two kingdoms' attitudes worsen by 1") -> {
            return result.copy(diplomaticChanges = mapOf("random1" to -1, "random2" to -1))
        }
        effectLower.contains("one kingdom's attitude worsens by 1") || 
        effectLower.contains("one neighboring kingdom's attitude worsens by 1") -> {
            return result.copy(diplomaticChanges = mapOf("random" to -1))
        }
    }
    
    // Parse army morale checks
    when {
        effectLower.contains("2 armies make morale checks") -> {
            return result.copy(armyMoraleChecks = 2)
        }
        effectLower.contains("1 army makes morale check") -> {
            return result.copy(armyMoraleChecks = 1)
        }
    }
    
    // Parse prison breaks
    when {
        effectLower.contains("all imprisoned unrest") -> {
            return result.copy(prisonBreak = true)
        }
        effectLower.contains("half imprisoned unrest") -> {
            return result.copy(prisonBreak = false) // Would need special handling
        }
    }
    
    // If no specific effect was parsed, return empty result (success with no additional effects)
    return result
}
