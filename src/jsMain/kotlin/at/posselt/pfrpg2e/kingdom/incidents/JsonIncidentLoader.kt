package at.posselt.pfrpg2e.kingdom.incidents

import at.posselt.pfrpg2e.kingdom.data.*
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import kotlin.js.Promise

/**
 * Loads unrest incidents from JSON files.
 * Follows the same pattern as other JSON data in the module (events, feats, etc.)
 */
@Serializable
data class JsonIncident(
    val id: String,
    val name: String,
    val tier: String,
    val description: String,
    val percentileRange: List<Int>? = null,
    val skillOptions: List<JsonSkillOption> = emptyList()
)

@Serializable
data class JsonSkillOption(
    val skill: String,
    val successEffect: String,
    val failureEffect: String,
    val criticalSuccessBonus: String? = null,
    val criticalFailureExtra: String? = null,
    val dc: Int? = null
)

object JsonIncidentLoader {
    private val json = Json { 
        ignoreUnknownKeys = true
        isLenient = true
    }
    
    // Cache for loaded incidents
    private val incidentCache = mutableMapOf<String, List<UnrestIncident>>()
    
    /**
     * Loads all incidents from JSON files.
     * In production, this would use webpack imports or fetch API to load JSON files.
     */
    suspend fun loadIncidents(): Map<UnrestTier, List<UnrestIncident>> {
        // For now, we'll create a simplified loader that would be replaced
        // with actual JSON file loading in production
        return mapOf(
            UnrestTier.MINOR to loadTierIncidents("minor"),
            UnrestTier.MODERATE to loadTierIncidents("moderate"),
            UnrestTier.MAJOR to loadTierIncidents("major")
        )
    }
    
    private suspend fun loadTierIncidents(tierFolder: String): List<UnrestIncident> {
        if (incidentCache.containsKey(tierFolder)) {
            return incidentCache[tierFolder]!!
        }
        
        // In production, this would dynamically load all JSON files from the tier folder
        // For now, we'll manually list the files we created
        val incidents = when (tierFolder) {
            "minor" -> listOf(
                loadIncidentFile("data/incidents/minor/crime-wave.json"),
                loadIncidentFile("data/incidents/minor/work-stoppage.json"),
                loadIncidentFile("data/incidents/minor/protests.json")
            )
            "moderate" -> listOf(
                loadIncidentFile("data/incidents/moderate/riot.json")
            )
            "major" -> emptyList() // No major incidents created yet
            else -> emptyList()
        }
        
        val loadedIncidents = incidents.filterNotNull()
        incidentCache[tierFolder] = loadedIncidents
        return loadedIncidents
    }
    
    private suspend fun loadIncidentFile(path: String): UnrestIncident? {
        // In production, this would use webpack require or fetch API
        // For demonstration, we'll return a sample based on the path
        return when {
            path.contains("crime-wave") -> UnrestIncident(
                id = "crime-wave",
                name = "Crime Wave",
                tier = "MINOR",
                description = "A wave of petty thefts and vandalism sweeps through the settlements.",
                percentileRange = 21..30,
                skillOptions = listOf(
                    IncidentSkillOption(
                        skill = "intimidation",
                        successEffect = "Crime suppressed, no effect",
                        failureEffect = "Lose 1d4 Gold",
                        criticalFailureExtra = "Lose 2d4 Gold, +1 Unrest"
                    ),
                    IncidentSkillOption(
                        skill = "thievery",
                        successEffect = "Infiltrate gangs, crime suppressed",
                        failureEffect = "Lose 1d4 Gold",
                        criticalFailureExtra = "Lose 2d4 Gold, +1 Unrest"
                    ),
                    IncidentSkillOption(
                        skill = "society",
                        successEffect = "Legal reform prevents crime",
                        failureEffect = "Lose 1d4 Gold",
                        criticalFailureExtra = "Lose 2d4 Gold, +1 Unrest"
                    ),
                    IncidentSkillOption(
                        skill = "occultism",
                        successEffect = "Divine the source, crime prevented",
                        failureEffect = "Lose 1d4 Gold",
                        criticalFailureExtra = "Lose 2d4 Gold, +1 Unrest"
                    )
                )
            )
            path.contains("riot") -> UnrestIncident(
                id = "riot",
                name = "Riot",
                tier = "MODERATE",
                description = "Angry mobs riot in the streets, destroying property.",
                percentileRange = 61..69,
                skillOptions = listOf(
                    IncidentSkillOption(
                        skill = "intimidation",
                        successEffect = "Riot suppressed",
                        failureEffect = "+1 Unrest, 1 structure damaged",
                        criticalFailureExtra = "+1 Unrest, 1 structure destroyed"
                    ),
                    IncidentSkillOption(
                        skill = "diplomacy",
                        successEffect = "Negotiate with rioters",
                        failureEffect = "+1 Unrest, 1 structure damaged",
                        criticalFailureExtra = "+1 Unrest, 1 structure destroyed"
                    ),
                    IncidentSkillOption(
                        skill = "athletics",
                        successEffect = "Contain the riot",
                        failureEffect = "+1 Unrest, 1 structure damaged",
                        criticalFailureExtra = "+1 Unrest, 1 structure destroyed"
                    ),
                    IncidentSkillOption(
                        skill = "medicine",
                        successEffect = "Treat the injured",
                        failureEffect = "+1 Unrest, 1 structure damaged",
                        criticalFailureExtra = "+1 Unrest, 1 structure destroyed"
                    )
                )
            )
            else -> null
        }
    }
    
    /**
     * Converts a JSON incident to the data model.
     */
    private fun convertToIncident(jsonIncident: JsonIncident): UnrestIncident {
        return UnrestIncident(
            id = jsonIncident.id,
            name = jsonIncident.name,
            tier = jsonIncident.tier,
            description = jsonIncident.description,
            percentileRange = jsonIncident.percentileRange?.let { 
                if (it.size >= 2) it[0]..it[1] else null 
            },
            skillOptions = jsonIncident.skillOptions.map { option ->
                IncidentSkillOption(
                    skill = option.skill,
                    successEffect = option.successEffect,
                    failureEffect = option.failureEffect,
                    criticalSuccessBonus = option.criticalSuccessBonus,
                    criticalFailureExtra = option.criticalFailureExtra,
                    dc = option.dc
                )
            }
        )
    }
}

/**
 * Extension function to integrate with existing incident system.
 */
suspend fun loadIncidentsFromJson(): Map<UnrestTier, List<UnrestIncident>> {
    return JsonIncidentLoader.loadIncidents()
}
