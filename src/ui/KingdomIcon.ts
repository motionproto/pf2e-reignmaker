// Kingdom Icon module for PF2e Kingdom Lite
// Adds Kingdom buttons to party actors in the sidebar

declare const Hooks: any;
declare const foundry: any;

/**
 * Creates the Kingdom icon button for the party sheet
 */
function createKingdomIcon(actorId: string): HTMLElement {
    const link = document.createElement('a');
    link.classList.add('create-button');
    link.setAttribute('data-tooltip', 'Open Kingdom Sheet');
    
    const icon = document.createElement('i');
    icon.classList.add('fa-solid', 'fa-chess-rook');
    link.appendChild(icon);
    
    link.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        
        // Open the kingdom UI for this actor
        openKingdomUI(actorId);
    });
    
    return link;
}

/**
 * Opens the Kingdom UI using the new KingdomSheet
 */
export function openKingdomUI(actorId: string): void {
    console.log(`Opening Kingdom UI for actor: ${actorId}`);
    
    // Check if we should use ApplicationV2 (Foundry v10+)
    const hasApplicationV2 = typeof foundry !== 'undefined' && 
                            foundry.applications && 
                            foundry.applications.api && 
                            foundry.applications.api.ApplicationV2;
    
    if (hasApplicationV2) {
        console.log("Using Foundry ApplicationV2");
        // Import and use ApplicationV2 version
        import('./KingdomApplicationV2').then(module => {
            module.openKingdomSheetV2();
        });
    } else {
        console.log("Using custom Application implementation");
        // Fallback to our custom implementation
        import('./KingdomSheet').then(module => {
            const sheet = new module.KingdomSheet();
            sheet.render();
        });
    }
}

/**
 * Registers the hook to add Kingdom icons to party actors in the sidebar
 */
export function registerKingdomIconHook(): void {
    console.log("Registering Kingdom icon hook");
    
    // Hook into the actor directory render to add our icons
    Hooks.on("renderActorDirectory", (app: any, html: JQuery, data: any) => {
        console.log("renderActorDirectory hook triggered");
        
        // Convert jQuery to HTMLElement
        const htmlElement = html[0] as HTMLElement;
        
        // Find all party actor folders in the sidebar
        const partyFolders = htmlElement.querySelectorAll(".folder[data-party]");
        
        partyFolders.forEach((folderElement: Element) => {
            const folder = folderElement as HTMLElement;
            const actorId = folder.dataset.entryId;
            
            if (actorId) {
                console.log(`Found party actor folder with ID: ${actorId}`);
                
                // Find where to insert our icon (after the folder name)
                const folderName = folder.querySelector(".folder-name");
                if (folderName) {
                    // Insert the Kingdom icon
                    const kingdomIcon = createKingdomIcon(actorId);
                    folderName.insertAdjacentElement("afterend", kingdomIcon);
                    console.log(`Inserted Kingdom icon for actor: ${actorId}`);
                }
            }
        });
    });
}

/**
 * Initialize the Kingdom Icon module
 */
export function initKingdomIcon(): void {
    // Register the hook when Foundry is ready
    if (typeof Hooks !== 'undefined') {
        Hooks.once('ready', () => {
            registerKingdomIconHook();
        });
    }
}
