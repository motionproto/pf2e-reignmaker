package at.posselt.pfrpg2e.kingdom.incidents

import at.posselt.pfrpg2e.kingdom.data.*

/**
 * Unrest incident system using PF2e CHARACTER skills.
 * Based on Reignmaker-lite, where players use their characters' skills
 * to resolve incidents, not kingdom skills.
 * This class provides the interface to the complete incident tables.
 */
object UnrestIncidents {
    
    /**
     * Gets a specific incident by ID for testing or direct access.
     */
    fun getIncidentById(id: String): UnrestIncident? {
        val allIncidents = listOf(
            UnrestIncidentTables.discontentIncidents,
            UnrestIncidentTables.turmoilIncidents,
            UnrestIncidentTables.rebellionIncidents
        ).flatten()
        
        return allIncidents.find { it.id == id }
    }
    
    /**
     * Gets a sample incident for testing based on tier.
     * Returns the first non-"No Incident" incident from each tier.
     */
    fun getSampleIncident(tier: UnrestTier): UnrestIncident? {
        val incidents = UnrestIncidentTables.getIncidentsForTier(tier)
        // Skip "No Incident" entries for sample
        return incidents.find { !it.id.contains("no-incident") }
    }
    
    /**
     * Rolls for an incident using the complete percentile tables.
     * Returns null if no incident occurs or if tier is STABLE.
     */
    fun rollForIncident(tier: UnrestTier): UnrestIncident? {
        return UnrestIncidentTables.rollIncident(tier)
    }
    
    /**
     * Gets all possible incidents for a given tier.
     * Useful for UI display or debugging.
     */
    fun getAllIncidentsForTier(tier: UnrestTier): List<UnrestIncident> {
        return UnrestIncidentTables.getIncidentsForTier(tier)
    }
    
    /**
     * Checks if an incident would occur for a given tier without actually rolling.
     * Returns the percentage chance of an incident occurring.
     */
    fun getIncidentChance(tier: UnrestTier): Int {
        return when (tier) {
            UnrestTier.STABLE -> 0
            UnrestTier.DISCONTENT -> 80  // 21-100 = 80% chance
            UnrestTier.TURMOIL -> 85     // 16-100 = 85% chance  
            UnrestTier.REBELLION -> 90   // 11-100 = 90% chance
        }
    }
}
