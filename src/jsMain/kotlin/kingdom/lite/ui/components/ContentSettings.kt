package kingdom.lite.ui.components

import kingdom.lite.api.KingdomSettings
import kingdom.lite.api.Scene
import kingdom.lite.api.getKingmakerRealmData
import kingdom.lite.api.isKingmakerInstalled
import org.w3c.dom.HTMLElement
import org.w3c.dom.HTMLSelectElement

/**
 * Content Settings component for configuring kingdom game settings
 */
@JsExport
object ContentSettings : ContentComponent {
    
    override fun render(): String {
        val currentScene = KingdomSettings.getKingdomScene()
        val allScenes = KingdomSettings.getAllScenes()
        
        // Always get fresh data when rendering
        val realmData = getKingmakerRealmData()
        val hasKingmaker = isKingmakerInstalled()
        
        return buildString {
            append("""<div class="settings-content">""")
            append("""<h3>Content Settings</h3>""")
            
            // Kingdom Scene Selector - Placed first
            append("""<div class="settings-section">""")
            append("""<h4>Kingdom Map Scene</h4>""")
            append("""<div class="settings-description">""")
            append("""<p>Select the scene that represents your kingdom map. This is typically called "Stolen Lands" in the Adventure Path.</p>""")
            append("""</div>""")
            
            append("""<div class="settings-control">""")
            append("""<label for="kingdom-scene-select">Kingdom Scene:</label>""")
            append("""<select id="kingdom-scene-select" class="kingdom-scene-selector">""")
            
            // Add empty option first
            append("""<option value="">-- Select a Scene --</option>""")
            
            // Add all available scenes
            allScenes.forEach { scene ->
                val selected = if (currentScene?.id == scene.id) "selected" else ""
                append("""<option value="${scene.id}" $selected>${scene.name}</option>""")
            }
            
            append("""</select>""")
            append("""</div>""")
            
            // Show current selection info
            if (currentScene != null) {
                append("""<div class="settings-info">""")
                append("""<p class="current-selection">Currently selected: <strong>${currentScene.name}</strong></p>""")
                append("""</div>""")
            } else {
                append("""<div class="settings-info">""")
                append("""<p class="no-selection">No kingdom scene selected. Please choose a scene from the dropdown above.</p>""")
                append("""</div>""")
            }
            
            append("""</div>""") // settings-section
            
            // Add a horizontal divider
            append("""<hr class="settings-divider">""")
            
            // Info about automatic updates
            if (hasKingmaker) {
                append("""<div class="refresh-container">""")
                append("""<span class="refresh-info"><i class="fa fa-info-circle"></i> Kingdom data updates automatically when you make changes in the Kingmaker system</span>""")
                append("""</div>""")
            }
            
            // Kingdom Status Section - Display realm data from Kingmaker module
            if (hasKingmaker) {
                append("""<div class="settings-section kingdom-status">""")
                append("""<h4>Kingdom Status</h4>""")
                
                if (realmData != null) {
                    append("""<div class="kingdom-info">""")
                    append("""<p class="kingdom-size">Kingdom Size: <strong>${realmData.size} hexes</strong></p>""")
                    
                    // Display settlements if any exist
                    if (realmData.settlements.total > 0) {
                        append("""<p class="settlements-summary">Settlements: <strong>${realmData.settlements.getSummary()}</strong></p>""")
                    }
                    
                    // Display worksites
                    append("""<div class="worksites-info">""")
                    append("""<h5>Worksites & Camps:</h5>""")
                    append("""<table class="worksites-table">""")
                    append("""<thead><tr><th>Type</th><th>Quantity</th><th>Resources</th></tr></thead>""")
                    append("""<tbody>""")
                    
                    with(realmData.worksites) {
                        if (farmlands.quantity > 0) {
                            append("""<tr><td>Farmlands</td><td>${farmlands.quantity}</td><td>${farmlands.resources} food</td></tr>""")
                        }
                        if (lumberCamps.quantity > 0) {
                            append("""<tr><td>Lumber Camps</td><td>${lumberCamps.quantity}</td><td>${lumberCamps.resources} lumber</td></tr>""")
                        }
                        if (mines.quantity > 0) {
                            append("""<tr><td>Mines</td><td>${mines.quantity}</td><td>${mines.resources} ore</td></tr>""")
                        }
                        if (quarries.quantity > 0) {
                            append("""<tr><td>Quarries</td><td>${quarries.quantity}</td><td>${quarries.resources} stone</td></tr>""")
                        }
                        if (luxurySources.quantity > 0) {
                            append("""<tr><td>Luxury Sources</td><td>${luxurySources.quantity}</td><td>-</td></tr>""")
                        }
                        
                        val totalWorksites = farmlands.quantity + lumberCamps.quantity + 
                                           mines.quantity + quarries.quantity + luxurySources.quantity
                        if (totalWorksites == 0) {
                            append("""<tr><td colspan="3" class="no-worksites">No worksites established yet</td></tr>""")
                        }
                    }
                    
                    append("""</tbody>""")
                    append("""</table>""")
                    append("""</div>""")
                    append("""</div>""")
                } else {
                    append("""<div class="settings-info">""")
                    append("""<p class="no-data">No kingdom data available. Make sure you have claimed hexes in the Kingmaker system.</p>""")
                    append("""</div>""")
                }
                
                append("""</div>""") // kingdom-status section
            } else {
                append("""<div class="settings-section">""")
                append("""<div class="settings-info warning">""")
                append("""<p>⚠️ The PF2e Kingmaker module is not installed or not active.</p>""")
                append("""<p>Kingdom information will be displayed here once the module is installed.</p>""")
                append("""</div>""")
                append("""</div>""")
            }
            
            // Placeholder for future settings
            append("""<div class="settings-section">""")
            append("""<h4>Additional Settings</h4>""")
            append("""<div class="settings-description">""")
            append("""<p>More kingdom management settings will be added here in future updates.</p>""")
            append("""</div>""")
            append("""</div>""")
            
            append("""</div>""") // settings-content
        }
    }
    
    override fun attachListeners(container: HTMLElement) {
        // Attach listener to the scene selector dropdown
        val sceneSelector = container.querySelector("#kingdom-scene-select") as? HTMLSelectElement
        sceneSelector?.addEventListener("change", { event ->
            event.preventDefault()
            val selectedValue = sceneSelector.value
            
            if (selectedValue.isNotEmpty()) {
                // Save the selected scene ID
                KingdomSettings.setKingdomSceneId(selectedValue).then({ result: dynamic ->
                    println("Kingdom scene updated to: $selectedValue")
                    
                    // Update the info text
                    val scene = KingdomSettings.getAllScenes().find { it.id == selectedValue }
                    scene?.let {
                        val infoElement = container.querySelector(".current-selection, .no-selection") as? HTMLElement
                        infoElement?.innerHTML = """Currently selected: <strong>${it.name}</strong>"""
                        infoElement?.className = "current-selection"
                    }
                }, { error: dynamic ->
                    console.error("Failed to save kingdom scene:", error)
                })
            }
        })
    }
}
