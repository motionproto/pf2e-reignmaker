package at.posselt.pfrpg2e.kingdom.rolls

import at.posselt.pfrpg2e.kingdom.KingdomData
import at.posselt.pfrpg2e.data.kingdom.KingdomSkill

/**
 * Represents a structure option in the bonus selector
 */
data class StructureOption(
    val settlementName: String,
    val structureName: String,
    val structureId: String,
    val bonusValue: Int,
    val bonusSkill: String?,
    val isEnabled: Boolean,
    val isDamaged: Boolean,
    val displayText: String
) {
    companion object {
        val None = StructureOption(
            settlementName = "",
            structureName = "None",
            structureId = "none",
            bonusValue = 0,
            bonusSkill = null,
            isEnabled = true,
            isDamaged = false,
            displayText = "None (No structure bonus)"
        )
    }
}

/**
 * Service for managing structure bonuses in kingdom skill checks
 */
class StructureBonusService {
    
    /**
     * Get all applicable structures for a given skill
     * Only shows structures that provide bonuses for the specified skill
     * Damaged structures are shown but disabled
     */
    fun getApplicableStructures(
        skill: String,
        kingdom: KingdomData
    ): List<StructureOption> {
        val options = mutableListOf<StructureOption>()
        
        // Add "None" option first (default)
        options.add(StructureOption.None)
        
        // Process each settlement from raw data
        // Note: We would need to convert raw settlements to full Settlement objects
        // For now, using a simplified approach
        // TODO: Get parsed settlements from KingdomData.getAllSettlements()
        
        return options
    }
    
    /**
     * Placeholder for getting structures from settlements
     * TODO: Implement when settlement parsing is integrated
     */
    private fun getStructuresForSkill(
        settlementName: String,
        skill: String
    ): List<StructureOption> {
        // TODO: Get actual structures from settlement
        return emptyList()
    }
    
    /**
     * Map skills to structure traits and return bonus value
     */
    private fun getStructureBonusFromTraits(structureTraits: List<String>, skill: String): Int? {
        // Map skills to structure traits
        val bonusMap = mapOf(
            "intimidation" to listOf("garrison", "guard-tower", "watchtower"),
            "politics" to listOf("courthouse", "palace", "town-hall"),
            "trade" to listOf("market", "marketplace", "bazaar"),
            "industry" to listOf("mill", "workshop", "factory"),
            "arts" to listOf("tavern", "theater", "museum"),
            "scholarship" to listOf("library", "academy", "university"),
            "folklore" to listOf("temple", "shrine", "cathedral"),
            "warfare" to listOf("garrison", "barracks", "fortress"),
            "engineering" to listOf("workshop", "smithy", "foundry"),
            "exploration" to listOf("watchtower", "lighthouse", "observatory"),
            "boating" to listOf("harbor", "port", "shipyard"),
            "agriculture" to listOf("farm", "granary", "mill"),
            "magic" to listOf("mage-tower", "arcane-academy", "wizard-college"),
            "defense" to listOf("wall", "fortress", "keep"),
            "wilderness" to listOf("ranger-lodge", "druid-grove", "hunter-lodge"),
            "intrigue" to listOf("thieves-guild", "spy-network", "black-market"),
            "statecraft" to listOf("palace", "throne-room", "embassy")
        )
        
        val relevantTraits = bonusMap[skill.lowercase()] ?: emptyList()
        val lowerTraits = structureTraits.map { it.lowercase() }
        
        // Check if structure has any relevant traits
        for (trait in lowerTraits) {
            if (relevantTraits.any { it in trait }) {
                // Most structures provide +1, some special ones provide +2
                return if (trait.contains("palace") || trait.contains("cathedral") || trait.contains("fortress")) {
                    2
                } else {
                    1
                }
            }
        }
        
        return null
    }
    
    /**
     * Build display text for a structure option
     */
    private fun buildDisplayText(
        settlementName: String,
        structureName: String,
        skill: String,
        bonus: Int,
        isDamaged: Boolean
    ): String {
        val status = if (isDamaged) " [Damaged]" else ""
        return "$settlementName → $structureName (+$bonus $skill)$status"
    }
    
    /**
     * Validate that a structure can provide a bonus for a skill
     */
    fun validateStructureBonus(
        structureId: String,
        skill: String,
        kingdom: KingdomData
    ): BonusValidation {
        if (structureId == "none") {
            return BonusValidation.Valid(0, "No structure bonus")
        }
        
        // TODO: Implement validation when settlement parsing is integrated
        return BonusValidation.Invalid("Structure validation not yet implemented")
    }
}

/**
 * Result of structure bonus validation
 */
sealed class BonusValidation {
    data class Valid(val bonus: Int, val message: String) : BonusValidation()
    data class Invalid(val message: String) : BonusValidation()
}

/**
 * Create a dropdown selector HTML for structure bonuses
 */
fun createStructureBonusSelector(
    skill: String,
    kingdom: KingdomData
): String {
    val service = StructureBonusService()
    val options = service.getApplicableStructures(skill, kingdom)
    
    return buildString {
        appendLine("<div class='structure-bonus-selector'>")
        appendLine("<label for='structure-bonus'>Structure Bonus:</label>")
        appendLine("<select id='structure-bonus' name='structure-bonus'>")
        
        options.forEach { option ->
            val disabled = if (option.isEnabled) "" else " disabled"
            val selected = if (option.structureId == "none") " selected" else ""
            val dataAttrs = "data-bonus='${option.bonusValue}' data-structure-id='${option.structureId}'"
            
            appendLine(
                "<option value='${option.structureId}'$disabled$selected $dataAttrs>" +
                "${option.displayText}</option>"
            )
        }
        
        appendLine("</select>")
        appendLine("</div>")
    }
}
