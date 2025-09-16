package at.posselt.pfrpg2e.kingdom.sheet

import com.foundryvtt.core.Game
import com.foundryvtt.pf2e.actor.PF2EActor
import com.foundryvtt.pf2e.actor.PF2ECharacter
import kotlinx.html.*
import kotlinx.html.js.onChangeFunction
import org.w3c.dom.HTMLSelectElement
import at.posselt.pfrpg2e.utils.t
import js.objects.recordOf

/**
 * Component for managing character selection for kingdom actions.
 * Uses each player's assigned character (user.character) for skill checks.
 */
object CharacterSelector {
    
    /**
     * Gets the current player's assigned character.
     * Uses the user.character property which is more reliable than token selection.
     */
    fun getPlayerAssignedCharacter(game: Game): PF2ECharacter? {
        // Get the assigned character ID from the current user
        val characterId = game.user.character?.id
        
        if (characterId != null) {
            // Retrieve the actual character actor
            return game.actors.get(characterId) as? PF2ECharacter
        }
        
        // Fallback: check if there's a controlled token
        val controlled = game.canvas.tokens.controlled
        return controlled
            .mapNotNull { it.actor }
            .filterIsInstance<PF2ECharacter>()
            .firstOrNull()
    }
    
    /**
     * Gets the current user's owned characters.
     * Returns all characters owned by the current user.
     */
    fun getCurrentUserCharacters(game: Game): List<PF2ECharacter> {
        val userId = game.user.id ?: return emptyList()
        
        return game.actors.contents
            .filterIsInstance<PF2ECharacter>()
            .filter { character ->
                // Check if current user has owner permission
                val ownership = character.ownership
                ownership?.get(userId) == 3 // OWNER permission level
            }
    }
    
    /**
     * Renders the character selector dropdown.
     * Shows all player-owned characters and allows selecting one as the active character.
     */
    fun TagConsumer<*>.renderCharacterSelector(
        game: Game,
        selectedCharacterId: String? = null,
        onCharacterChange: (String?) -> Unit = {}
    ) {
        div(classes = "kingdom-character-selector") {
            h3 {
                +t("kingdom.activeCharacter")
            }
            
            div(classes = "form-group") {
                label {
                    +t("kingdom.selectCharacter")
                }
                
                select(classes = "character-select") {
                    id = "kingdom-character-select"
                    
                    // Add default option
                    option {
                        value = ""
                        +t("kingdom.noCharacterSelected")
                        if (selectedCharacterId == null || selectedCharacterId.isEmpty()) {
                            selected = true
                        }
                    }
                    
                    // Get all player-owned character actors
                    val playerCharacters = game.actors.filter { actor ->
                        actor.type == "character" && 
                        actor.hasPlayerOwner == true
                    }
                    
                    // Add option for each character
                    playerCharacters.forEach { character ->
                        option {
                            character.id?.let { id ->
                                value = id
                                +character.name
                                if (id == selectedCharacterId) {
                                    selected = true
                                }
                            }
                        }
                    }
                    
                    onChangeFunction = { event ->
                        val select = event.target as? HTMLSelectElement
                        val characterId = select?.value
                        if (!characterId.isNullOrEmpty()) {
                            onCharacterChange(characterId)
                        } else {
                            onCharacterChange(null)
                        }
                    }
                }
                
                // Show selected character's skills if one is selected
                if (!selectedCharacterId.isNullOrEmpty()) {
                    // Skills display would need the PF2e actor types to be properly defined
                    // For now we just show that a character is selected
                    div(classes = "character-selected") {
                        p { 
                            +t("kingdom.characterSelected", recordOf("name" to (game.actors.get(selectedCharacterId)?.name ?: "Unknown")))
                        }
                    }
                }
            }
        }
    }
    
    // Skills rendering would need proper PF2e actor types
    // This is simplified for now
    
    /**
     * Gets the skill modifier for a specific skill from the player's assigned character.
     * Uses user.character for reliable character association.
     */
    fun getCharacterSkillModifier(
        game: Game,
        characterId: String? = null,
        skillName: String
    ): Int {
        // First try to get the player's assigned character
        val assignedChar = getPlayerAssignedCharacter(game)
        if (assignedChar != null) {
            // Would need proper skill access here
            // For now return placeholder
            return 0
        }
        
        // Fall back to provided character ID if no assigned character
        if (!characterId.isNullOrEmpty()) {
            val character = game.actors.get(characterId) as? PF2ECharacter
            // Would need proper skill access here
            return 0
        }
        
        return 0
    }
    
    /**
     * Gets a character's level for DC calculations.
     * Uses the player's assigned character for reliable association.
     */
    fun getCharacterLevel(
        game: Game,
        characterId: String? = null
    ): Int {
        // First try to get the player's assigned character
        val assignedChar = getPlayerAssignedCharacter(game)
        if (assignedChar != null) {
            return assignedChar.level
        }
        
        // Fall back to provided character ID if no assigned character
        if (!characterId.isNullOrEmpty()) {
            val character = game.actors.get(characterId) as? PF2ECharacter
            return character?.level ?: 1
        }
        
        return 1
    }
    
    /**
     * Renders a display showing which character is assigned to the current player.
     * Shows the player's assigned character or prompts to assign one.
     */
    fun TagConsumer<*>.renderAssignedCharacterDisplay(
        game: Game
    ) {
        val assignedChar = getPlayerAssignedCharacter(game)
        
        div(classes = "assigned-character-display") {
            if (assignedChar != null) {
                h4 {
                    +t("kingdom.assignedCharacter", recordOf(
                        "player" to game.user.name,
                        "character" to assignedChar.name
                    ))
                }
                p(classes = "character-info") {
                    +t("kingdom.characterLevel", recordOf("level" to assignedChar.level))
                    br()
                    small {
                        +t("kingdom.characterAssignmentNote")
                    }
                }
            } else {
                p(classes = "no-character-warning") {
                    +t("kingdom.noCharacterAssigned", recordOf(
                        "player" to game.user.name
                    ))
                }
                p(classes = "hint") {
                    +t("kingdom.assignCharacterHint")
                    br()
                    em {
                        +t("kingdom.assignCharacterInstructions")
                    }
                }
            }
        }
    }
    
    /**
     * Helper function to ensure all players have assigned characters.
     * Returns a map of player names to their assigned character names.
     */
    fun getPlayerCharacterAssignments(game: Game): Map<String, String?> {
        return game.users.contents
            .filter { !it.isGM } // Exclude GM users
            .associate { user ->
                val characterId = user.character?.id
                val characterName = if (characterId != null) {
                    (game.actors.get(characterId) as? PF2ECharacter)?.name
                } else {
                    null
                }
                user.name to characterName
            }
    }
}
