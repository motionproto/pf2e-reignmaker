package kingdom.lite.ui

import kotlinx.browser.document
import kotlinx.browser.window
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
 * Opens the Kingdom UI stub page using DialogV2
 */
fun openKingdomUI(actorId: String) {
    console.log("Opening Kingdom UI for actor: $actorId")
    
    // Create dialog content
    val dialogContent = """
        <div style="padding: 20px;">
            <h2 style="text-align: center; margin-bottom: 20px;">Kingdom Management</h2>
            <p style="text-align: center; margin-bottom: 10px;">
                <strong>Party Actor ID:</strong> $actorId
            </p>
            <p style="color: #666; text-align: center; margin-top: 20px;">
                This is a placeholder for the Kingdom Management interface.
            </p>
            <p style="color: #999; text-align: center; margin-top: 10px; font-size: 0.9em;">
                Full functionality will be implemented soon.
            </p>
        </div>
    """.trimIndent()
    
    // Use DialogV2.prompt which is a static method that creates a simple dialog
    // Access it through window.foundry.applications.api.DialogV2
    val foundry = window.asDynamic().foundry
    if (foundry != undefined && 
        foundry.applications != undefined && 
        foundry.applications.api != undefined && 
        foundry.applications.api.DialogV2 != undefined) {
        
        val DialogV2 = foundry.applications.api.DialogV2
        
        // Create a simple prompt dialog and handle the promise with dynamic approach
        val promise = DialogV2.prompt(json(
            "window" to json(
                "title" to "Kingdom Management",
                "icon" to "fa-solid fa-chess-rook"
            ),
            "content" to dialogContent,
            "ok" to json(
                "label" to "Close",
                "icon" to "fa-solid fa-times"
            ),
            "rejectClose" to false,
            "modal" to false
        ))
        
        // Handle promise using dynamic calls
        promise.then { _: Any? ->
            console.log("Kingdom dialog closed")
        }
        promise.catch { error: Any ->
            console.error("Error with Kingdom dialog:", error)
        }
    } else {
        // Fallback to ui.notifications if DialogV2 is not available
        val ui = window.asDynamic().ui
        if (ui != undefined && ui.notifications != undefined) {
            ui.notifications.info("Kingdom Management UI is being developed. Party Actor ID: $actorId")
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
