package kingdom.lite.ui

import kotlinx.browser.document
import kotlinx.browser.window
import kotlinx.coroutines.GlobalScope
import kotlinx.coroutines.launch
import kotlinx.html.a
import kotlinx.html.classes
import kotlinx.html.dom.create
import kotlinx.html.i
import kotlinx.html.js.onClickFunction
import org.w3c.dom.HTMLElement
import org.w3c.dom.asList
import kotlin.js.json

external val Hooks: dynamic

/**
 * Creates the Kingdom icon button for the party sheet
 */
fun createKingdomIcon(actorId: String): HTMLElement {
    return document.create.a {
        classes = setOf("create-button")
        i {
            classes = setOf("fa-solid", "fa-chess-rook")
        }
        attributes["data-tooltip"] = "Open Kingdom Sheet"
        onClickFunction = { event ->
            event.preventDefault()
            event.stopPropagation()
            
            // Open the kingdom UI for this actor
            openKingdomUI(actorId)
        }
    }
}

/**
 * Opens the Kingdom UI using the new KingdomSheet
 */
fun openKingdomUI(actorId: String) {
    console.log("Opening Kingdom UI for actor: $actorId")
    
    // Inject styles if not already done
    injectStyles(KingdomSheetStyles.styles)
    
    // Check if we should use ApplicationV2 (Foundry v10+)
    val hasApplicationV2 = js("typeof foundry !== 'undefined' && foundry.applications && foundry.applications.api && foundry.applications.api.ApplicationV2") as? Boolean ?: false
    
    if (hasApplicationV2) {
        console.log("Using Foundry ApplicationV2")
        openKingdomSheetV2()
    } else {
        console.log("Using custom Application implementation")
        // Fallback to our custom implementation
        kotlinx.coroutines.GlobalScope.launch {
            val sheet = KingdomSheet()
            sheet.render(true)
        }
    }
}

/**
 * Registers the hook to add Kingdom icons to party actors in the sidebar
 */
fun registerKingdomIconHook() {
    console.log("Registering Kingdom icon hook")
    
    // Hook into the actor directory render to add our icons
    Hooks.on("renderActorDirectory") { app: Any, html: dynamic, data: Any ->
        console.log("renderActorDirectory hook triggered")
        
        // Cast html to HTMLElement
        val htmlElement = html as HTMLElement
        
        // Find all party actor folders in the sidebar
        htmlElement.querySelectorAll(".folder[data-party]")
            .asList()
            .filterIsInstance<HTMLElement>()
            .forEach { folderElement ->
                // Access the dataset directly through dynamic cast
                val datasetElement = folderElement.asDynamic()
                val actorId = datasetElement.dataset.entryId as String?
                
                if (actorId != null) {
                    console.log("Found party actor folder with ID: $actorId")
                    
                    // Find where to insert our icon (after the folder name)
                    val folderName = folderElement.querySelector(".folder-name") as? HTMLElement
                    if (folderName != null) {
                        // Insert the Kingdom icon
                        val kingdomIcon = createKingdomIcon(actorId)
                        folderName.insertAdjacentElement("afterend", kingdomIcon)
                        console.log("Inserted Kingdom icon for actor: $actorId")
                    }
                }
            }
        
        Unit
    }
}
