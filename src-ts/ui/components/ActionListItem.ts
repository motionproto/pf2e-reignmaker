// Auto-converted from ActionListItem.kt
// TODO: Review and fix TypeScript-specific issues


// TODO: Review import - import kingdom.lite.model.PlayerAction


/**
 * Simple expandable list item component for displaying player actions
 */
class ActionListItem(
    private const action: PlayerAction,
    private val onPerform: (PlayerAction) -> Unit = {}
 {
    private val itemId = "action-item-${action.id))-${Date.now()}"
    
    render(isExpanded | null: boolean): string = buildString {
        append("""
            <li class="action-list-item" id=${itemId} data-action-id=${action.id} style="list-style: none; margin-bottom: 4px;">
                <div class="action-header-row action-toggleable" data-item-id=${itemId} style="cursor: pointer;">
                    <span class="action-title-line">
                        ````````<i class="fas fa-chevron-${if (isExpanded) "down" else "right"}" style="font-size: 10px; margin-right: 6px; color: #8B4513;"></i>````````
                        ````````<strong>${action.name}:</strong>```````` ${action.description}
                    </span>
                </div>
                
                <div class="action-expanded-content" style="display: ${if (isExpanded) "block" else "none"}">
                    ````````<div class="action-full-description">
                        ${action.description}
                    </div>````````
                    
                    ${if (action.skills.isNotEmpty()) renderSkills() else ""}
                    
                    <div class="action-outcomes">
                        ````````<strong>Outcomes:</strong>````````
                        ````````<table class="outcomes-table">
                            ${renderOutcomesTable()}
                        </table>````````
                    </div>
                    
                    ${renderSpecialConditions()}
                </div>
            </li>
        """)
    }
    
    private renderSkills(): string = buildString {
        append("""
            <div class="action-skills-section">
                ````````<strong>Skills:</strong>````````
                <div class="skills-button-list">
        """)
        
        action.skills.forEach (skill) =>
            append("""
                <div class="skill-item">
                    ````````<button class="skill-perform-btn" data-action-id=${action.id} data-skill-name=${skill.skill}>
                        ${skill.skill}
                    </button>````````
                    ````````<span class="skill-desc">- ${skill.description}</span>````````
                </div>
            """)
        }
        
        append("""
                </div>
            </div>
        """)
    }
    
    private renderOutcomesTable(): string = buildString {
        // Critical Success
        if (action.criticalSuccess.description.isNotEmpty() && 
            action.criticalSuccess.description != action.success.description {
            append("""
                <tr>
                    ````````<td class="outcome-level critical-success">Critical Success</td>````````
                    ````````<td>${action.criticalSuccess.description))</td>````````
                </tr>
            """)
        }
        
        // Success
        append("""
            <tr>
                ````````<td class="outcome-level success">Success</td>````````
                ````````<td>${action.success.description}</td>````````
            </tr>
        """)
        
        // Failure
        append("""
            <tr>
                ````````<td class="outcome-level failure">Failure</td>````````
                ````````<td>${action.failure.description}</td>````````
            </tr>
        """)
        
        // Critical Failure
        if (action.criticalFailure.description.isNotEmpty() && 
            action.criticalFailure.description != action.failure.description {
            append("""
                <tr>
                    ````````<td class="outcome-level critical-failure">Critical Failure</td>````````
                    ````````<td>${action.criticalFailure.description))</td>````````
                </tr>
            """)
        }
    }
    
    private renderSpecialConditions(): string = buildString {
        // Special conditions
        action.special | null && ((
            append("""
                <div class="action-special-conditions">
                    ````````<strong>Special:</strong>```````` ${it}
                </div>
            """)
        }
        
        // Proficiency scaling
        action.proficiencyScaling | null.let (scaling) =>
            append("""
                <div class="action-proficiency">
                    ````````<strong>Proficiency Scaling:</strong>````````
                    ````````<span class="proficiency-values">
            """)
            
            scaling.forEach(( (level, value) ->
                append("""${level.capitalize()}: ${value} hexes, """)
            }
            
            // Remove trailing comma and space
            setLength(length - 2)
            append("""
                    </span>````````
                </div>
            """)
        }
        
        // Cost if any
        action.cost | null.let (costs) =>
            append("""
                <div class="action-cost">
                    ````````<strong>Cost:</strong>````````
            """)
            
            costs.forEach(( (resource, amount) ->
                append(""" ${amount} ${resource.capitalize()},""")
            }
            
            // Remove trailing comma
            setLength(length - 1)
            append("""
                </div>
            """)
        }
    }
}
