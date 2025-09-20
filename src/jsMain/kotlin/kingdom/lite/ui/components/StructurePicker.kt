package kingdom.lite.ui.components

import kingdom.lite.model.*
import kingdom.lite.ui.styles.StructureStyles

/**
 * Component for displaying a structure picker dialog
 * Allows the player to choose which structure to build in a settlement
 */
class StructurePicker(
    private val settlement: Settlement,
    private val kingdomState: KingdomState
) {
    /**
     * Render the structure picker as a modal dialog
     */
    fun render(): String = buildString {
        append("""
            <div class="structure-picker-overlay" id="structure-picker-${settlement.name}">
                <div class="structure-picker-dialog">
                    <div class="structure-picker-header">
                        <h3>Build Structure in ${settlement.name}</h3>
                        <button class="close-button" onclick="closeStructurePicker('${settlement.name}')">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    
                    <div class="structure-picker-resources">
                        <div class="available-resources">
                            <span>Available Resources:</span>
                            ${renderAvailableResources()}
                        </div>
                    </div>
                    
                    <div class="structure-picker-tabs">
                        ${renderCategoryTabs()}
                    </div>
                    
                    <div class="structure-picker-content">
                        ${renderStructureCategories()}
                    </div>
                </div>
            </div>
            
            <style>
                ${StructureStyles.getStyles()}
            </style>
            
            <script>
                ${getPickerScript()}
            </script>
        """)
    }
    
    private fun renderAvailableResources(): String = buildString {
        val resources = kingdomState.resources
        append("""
            <span class="resource-badge">
                <i class="fas fa-tree"></i> ${resources["lumber"] ?: 0} Lumber
            </span>
            <span class="resource-badge">
                <i class="fas fa-cube"></i> ${resources["stone"] ?: 0} Stone
            </span>
            <span class="resource-badge">
                <i class="fas fa-gem"></i> ${resources["ore"] ?: 0} Ore
            </span>
            <span class="resource-badge">
                <i class="fas fa-coins"></i> ${resources["gold"] ?: 0} Gold
            </span>
        """)
    }
    
    private fun renderCategoryTabs(): String = buildString {
        val categories = listOf(
            StructureCategory.CRIME_INTRIGUE to "fas fa-mask",
            StructureCategory.CIVIC_GOVERNANCE to "fas fa-landmark",
            StructureCategory.MILITARY_TRAINING to "fas fa-dumbbell",
            StructureCategory.CRAFTING_TRADE to "fas fa-hammer",
            StructureCategory.KNOWLEDGE_MAGIC to "fas fa-book",
            StructureCategory.FAITH_NATURE to "fas fa-praying-hands",
            StructureCategory.MEDICINE_HEALING to "fas fa-heart",
            StructureCategory.PERFORMANCE_CULTURE to "fas fa-theater-masks",
            StructureCategory.EXPLORATION_WILDERNESS to "fas fa-compass",
            StructureCategory.FOOD_STORAGE to "fas fa-warehouse",
            StructureCategory.FORTIFICATIONS to "fas fa-shield-alt",
            StructureCategory.LOGISTICS to "fas fa-campground",
            StructureCategory.COMMERCE to "fas fa-store",
            StructureCategory.CULTURE to "fas fa-palette",
            StructureCategory.REVENUE to "fas fa-coins",
            StructureCategory.JUSTICE to "fas fa-gavel",
            StructureCategory.DIPLOMACY to "fas fa-handshake"
        )
        
        append("""<div class="category-tabs">""")
        
        categories.forEachIndexed { index, (category, icon) ->
            val isActive = if (index == 0) "active" else ""
            append("""
                <button class="category-tab $isActive" 
                        onclick="selectStructureCategory('${category.name}')"
                        data-category="${category.name}"
                        title="${category.displayName}">
                    <i class="$icon"></i>
                </button>
            """)
        }
        
        append("""</div>""")
    }
    
    private fun renderStructureCategories(): String = buildString {
        StructureCategory.values().forEach { category ->
            val structures = StructuresData.getStructuresByCategory(category)
            val buildableStructures = StructuresData.getBuildableStructures(
                settlement, 
                settlement.structureIds
            ).filter { it.category == category }
            
            val displayStyle = if (category == StructureCategory.CRIME_INTRIGUE) {
                "block" // Show first category by default
            } else {
                "none"
            }
            
            append("""
                <div class="structure-category-content" 
                     data-category="${category.name}"
                     style="display: $displayStyle;">
                    <h4>${category.displayName}</h4>
                    <div class="structures-grid">
                        ${renderStructuresInCategory(buildableStructures, category)}
                    </div>
                </div>
            """)
        }
    }
    
    private fun renderStructuresInCategory(
        buildableStructures: List<Structure>, 
        category: StructureCategory
    ): String = buildString {
        if (buildableStructures.isEmpty()) {
            append("""
                <div class="no-structures-message">
                    <p>No ${category.displayName} structures available to build.</p>
                    <small>You may need to upgrade existing structures or advance your settlement tier.</small>
                </div>
            """)
            return@buildString
        }
        
        buildableStructures.forEach { structure ->
            val canAfford = canAffordStructure(structure)
            val disabledClass = if (!canAfford) "disabled" else ""
            
            append("""
                <div class="structure-card $disabledClass" 
                     data-structure-id="${structure.id}">
                    <div class="structure-header">
                        <span class="structure-name">${structure.name}</span>
                        <span class="structure-tier">Tier ${structure.tier}</span>
                    </div>
                    
                    <div class="structure-description">
                        ${structure.description}
                    </div>
                    
                    <div class="structure-cost">
                        <span class="cost-label">Cost:</span>
                        ${renderStructureCost(structure)}
                    </div>
                    
                    <div class="structure-effects">
                        ${renderStructureEffects(structure)}
                    </div>
                    
                    ${if (structure.upgradesFrom != null) {
                        """<div class="structure-upgrade">
                            <i class="fas fa-level-up-alt"></i>
                            Upgrades from: ${getStructureName(structure.upgradesFrom)}
                        </div>"""
                    } else ""}
                    
                    ${if (structure.special != null) {
                        """<div class="structure-special">
                            <i class="fas fa-star"></i>
                            ${structure.special}
                        </div>"""
                    } else ""}
                    
                    <button class="build-button" 
                            onclick="buildStructure('${settlement.name}', '${structure.id}')"
                            ${if (!canAfford) "disabled" else ""}>
                        ${if (canAfford) "Build" else "Insufficient Resources"}
                    </button>
                </div>
            """)
        }
    }
    
    private fun renderStructureCost(structure: Structure): String = buildString {
        structure.cost.forEach { (resource, amount) ->
            val hasResource = (kingdomState.resources[resource] ?: 0) >= amount
            val className = if (hasResource) "has-resource" else "lacking-resource"
            
            append("""
                <span class="cost-item $className">
                    $amount ${resource.capitalize()}
                </span>
            """)
        }
    }
    
    private fun renderStructureEffects(structure: Structure): String = buildString {
        structure.effects.forEach { effect ->
            append("""
                <div class="effect-item">
                    <i class="fas fa-star"></i> ${effect.description}
                </div>
            """)
        }
        
        if (structure.skillsSupported.isNotEmpty()) {
            append("""
                <div class="effect-item">
                    <i class="fas fa-dice-d20"></i> 
                    Skills: ${structure.skillsSupported.joinToString(", ") { it.displayName }}
                </div>
            """)
        }
    }
    
    private fun canAffordStructure(structure: Structure): Boolean {
        return structure.cost.all { (resource, amount) ->
            (kingdomState.resources[resource] ?: 0) >= amount
        }
    }
    
    private fun getStructureName(structureId: String): String {
        return StructuresData.getStructureById(structureId)?.name ?: structureId
    }
    
    private fun getPickerScript(): String = """
        window.closeStructurePicker = function(settlementName) {
            const picker = document.getElementById('structure-picker-' + settlementName);
            if (picker) {
                picker.style.display = 'none';
            }
        };
        
        window.selectStructureCategory = function(categoryName) {
            // Update tab active states
            document.querySelectorAll('.category-tab').forEach(tab => {
                if (tab.dataset.category === categoryName) {
                    tab.classList.add('active');
                } else {
                    tab.classList.remove('active');
                }
            });
            
            // Show/hide category content
            document.querySelectorAll('.structure-category-content').forEach(content => {
                if (content.dataset.category === categoryName) {
                    content.style.display = 'block';
                } else {
                    content.style.display = 'none';
                }
            });
        };
        
        window.buildStructure = function(settlementName, structureId) {
            console.log('Building structure:', structureId, 'in', settlementName);
            
            // TODO: Connect to actual game logic to add to build queue
            // For now, show confirmation
            const structure = document.querySelector('[data-structure-id="' + structureId + '"] .structure-name');
            if (structure) {
                alert('Adding ' + structure.textContent + ' to build queue in ' + settlementName);
                closeStructurePicker(settlementName);
            }
        };
    """
}
