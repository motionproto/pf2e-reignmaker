package at.posselt.pfrpg2e.kingdom.sheet.renderers

import at.posselt.pfrpg2e.kingdom.data.RawConstructionProject
import at.posselt.pfrpg2e.kingdom.data.completionPercentage
import at.posselt.pfrpg2e.kingdom.data.remainingCost
import at.posselt.pfrpg2e.utils.t
import kotlinx.js.JsPlainObject

/**
 * Context for displaying construction queue in the UI
 */
@JsPlainObject
external interface ConstructionQueueContext {
    val projects: Array<ConstructionProjectContext>
    val hasProjects: Boolean
}

@JsPlainObject
external interface ConstructionProjectContext {
    val structureName: String
    val settlementName: String
    val tier: Int
    val completionPercentage: Int
    val turnsActive: Int
    val remainingLumber: Int
    val remainingStone: Int
    val remainingOre: Int
    val remainingGold: Int
    val index: Int
}

/**
 * Renderer for construction queue display in the Kingdom UI.
 * Handles display of ongoing construction projects using the new resource system.
 */
class ConstructionQueueRenderer {
    
    /**
     * Creates context for construction queue display
     */
    fun createQueueContext(
        projects: Array<RawConstructionProject>,
        settlementNames: Map<String, String>
    ): ConstructionQueueContext {
        val projectContexts = projects.mapIndexed { index, project ->
            val remaining = project.remainingCost()
            ConstructionProjectContext(
                structureName = project.structureName,
                settlementName = settlementNames[project.settlementId] ?: t("kingdom.unknownSettlement"),
                tier = project.tier,
                completionPercentage = project.completionPercentage(),
                turnsActive = project.turnsActive,
                remainingLumber = remaining.lumber,
                remainingStone = remaining.stone,
                remainingOre = remaining.ore,
                remainingGold = remaining.gold,
                index = index
            )
        }.toTypedArray()
        
        return ConstructionQueueContext(
            projects = projectContexts,
            hasProjects = projectContexts.isNotEmpty()
        )
    }
    
    /**
     * Generates HTML for the construction queue display
     */
    fun generateQueueHtml(context: ConstructionQueueContext): String {
        if (!context.hasProjects) {
            return """
                <div class="km-construction-queue">
                    <h3 class="km-section-header">${t("kingdom.constructionQueue")}</h3>
                    <div class="km-construction-empty">
                        ${t("kingdom.noActiveConstruction")}
                    </div>
                </div>
            """.trimIndent()
        }
        
        val projectsHtml = context.projects.joinToString("\n") { project ->
            generateProjectHtml(project)
        }
        
        return """
            <div class="km-construction-queue">
                <h3 class="km-section-header">
                    ${t("kingdom.constructionQueue")}
                    <span class="km-queue-count">(${context.projects.size})</span>
                </h3>
                <div class="km-construction-projects">
                    $projectsHtml
                </div>
            </div>
        """.trimIndent()
    }
    
    /**
     * Generates HTML for an individual construction project
     */
    private fun generateProjectHtml(project: ConstructionProjectContext): String {
        val progressBarClass = when {
            project.completionPercentage >= 90 -> "km-progress-almost-done"
            project.completionPercentage >= 50 -> "km-progress-halfway"
            else -> "km-progress-started"
        }
        
        val resourcesNeeded = buildList {
            if (project.remainingLumber > 0) add("🪵${project.remainingLumber}")
            if (project.remainingStone > 0) add("🪨${project.remainingStone}")
            if (project.remainingOre > 0) add("⚒️${project.remainingOre}")
            if (project.remainingGold > 0) add("💰${project.remainingGold}")
        }.joinToString(" ")
        
        return """
            <div class="km-construction-project" data-index="${project.index}">
                <div class="km-project-header">
                    <span class="km-project-name">
                        ${project.structureName} 
                        <span class="km-project-tier">(${t("kingdom.tier")} ${project.tier})</span>
                    </span>
                    <span class="km-project-location">${project.settlementName}</span>
                </div>
                <div class="km-project-progress">
                    <div class="km-progress-bar">
                        <div class="km-progress-fill $progressBarClass" style="width: ${project.completionPercentage}%">
                            <span class="km-progress-text">${project.completionPercentage}%</span>
                        </div>
                    </div>
                </div>
                <div class="km-project-details">
                    <span class="km-project-turns">
                        ${t("kingdom.turnsActive")}: ${project.turnsActive}
                    </span>
                    ${if (resourcesNeeded.isNotBlank()) {
                        """<span class="km-project-resources">
                            ${t("kingdom.resourcesNeeded")}: $resourcesNeeded
                        </span>"""
                    } else {
                        """<span class="km-project-complete">
                            ${t("kingdom.readyToComplete")}
                        </span>"""
                    }}
                </div>
                <div class="km-project-actions">
                    <button class="km-button km-button-small" data-action="prioritize-construction" data-index="${project.index}">
                        ${t("kingdom.prioritize")}
                    </button>
                    <button class="km-button km-button-small km-button-danger" data-action="cancel-construction" data-index="${project.index}">
                        ${t("kingdom.cancel")}
                    </button>
                </div>
            </div>
        """.trimIndent()
    }
    
    /**
     * Generates a compact summary of the construction queue for the Turn sidebar
     */
    fun generateQueueSummary(context: ConstructionQueueContext): String {
        if (!context.hasProjects) {
            return ""
        }
        
        val activeCount = context.projects.size
        val nearComplete = context.projects.count { it.completionPercentage >= 90 }
        
        return """
            <div class="km-construction-summary">
                <span class="km-summary-icon">🏗️</span>
                <span class="km-summary-text">
                    ${t("kingdom.constructionActive", mapOf("count" to activeCount))}
                    ${if (nearComplete > 0) {
                        " (${t("kingdom.nearCompletion", mapOf("count" to nearComplete))})"
                    } else ""}
                </span>
            </div>
        """.trimIndent()
    }
    
    /**
     * Generates tooltip for construction project
     */
    fun generateProjectTooltip(project: ConstructionProjectContext): String {
        val resourcesList = buildList {
            if (project.remainingLumber > 0) add("Lumber: ${project.remainingLumber}")
            if (project.remainingStone > 0) add("Stone: ${project.remainingStone}")
            if (project.remainingOre > 0) add("Ore: ${project.remainingOre}")
            if (project.remainingGold > 0) add("Gold: ${project.remainingGold}")
        }
        
        return """
            ${project.structureName} (Tier ${project.tier})
            Location: ${project.settlementName}
            Progress: ${project.completionPercentage}%
            Turns Active: ${project.turnsActive}
            ${if (resourcesList.isNotEmpty()) {
                "Resources Needed:\n${resourcesList.joinToString("\n")}"
            } else {
                "Ready to complete!"
            }}
        """.trimIndent()
    }
}
