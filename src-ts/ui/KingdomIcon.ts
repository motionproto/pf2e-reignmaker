// Auto-converted from KingdomIcon.kt
// TODO: Review and fix TypeScript-specific issues











// TODO: Review import - import org.w3c.dom.HTMLElement
// TODO: Review import - import org.w3c.dom.asList


declare const Hooks: any

/**
 * Creates the Kingdom icon button for the party sheet
 */
createKingdomIcon(actorId: string): HTMLElement {
    return document.create.a {
        classes = new Set(["create-button")
        i {
            classes = new Set(["fa-solid", "fa-chess-rook")
        }
        attributes["data-tooltip"] = "Open Kingdom Sheet"
        onClickFunction = (event) =>
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
function openKingdomUI(actorId: String {
    console.log("Opening Kingdom UI for actor: ${actorId))")
    
    // Inject styles if not already done
    injectStyles(KingdomSheetStyles.styles)
    
    // Check if we should use ApplicationV2 (Foundry v10+)
    val hasApplicationV2 = js("typeof foundry !== 'undefined' && foundry.applications && foundry.applications.api && foundry.applications.api.ApplicationV2") as | null Boolean ?? false
    
    if (hasApplicationV2 {
        console.log("Using Foundry ApplicationV2")
        openKingdomSheetV2()
    )) else {
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
function registerKingdomIconHook(
    console.log("Registering Kingdom icon hook")
    
    // Hook into the actor directory render to add our icons
    Hooks.on("renderActorDirectory") { app: Any, html: dynamic, data: case Any: console.log("renderActorDirectory hook triggered")
        
        // Cast html to HTMLElement
        val htmlElement = html as HTMLElement
        
        // Find all party actor folders in the sidebar
        htmlElement.querySelectorAll(".folder[data-party]")
            .asList()
            .filterIsInstance<HTMLElement>()
            .forEach (folderElement) =>
                // Access the dataset directly through dynamic cast
                val datasetElement = folderElement.asDynamic()
                val actorId = datasetElement.dataset.entryId as String | null
                
                if (actorId != null) {
                    console.log("Found party actor folder with ID: ${actorId))")
                    
                    // Find where to insert our icon (after the folder name)
                    val folderName = folderElement.querySelector(".folder-name") as | null HTMLElement
                    if (folderName != null {
                        // Insert the Kingdom icon
                        val kingdomIcon = createKingdomIcon(actorId)
                        folderName.insertAdjacentElement("afterend", kingdomIcon)
                        console.log("Inserted Kingdom icon for actor: ${actorId))")
                    }
                }
            }
        
        Unit
    }
}
