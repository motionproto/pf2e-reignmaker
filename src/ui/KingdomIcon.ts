// Kingdom Icon module for PF2e Kingdom Lite
// Adds Kingdom buttons to party actors in the sidebar

// Import PF2e types
/// <reference path="../types/pf2e-types.d.ts" />

// Import KingdomApp directly instead of dynamic import
import { KingdomApp } from '../view/kingdom/KingdomApp';

/**
 * Creates the Kingdom icon button for the party sheet
 */
export function createKingdomIcon(actorId: string): HTMLElement {
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
 * Opens the Kingdom UI using the new Svelte KingdomApp
 */
export function openKingdomUI(actorId: string): void {
    console.log(`PF2e Kingdom Lite | Opening Kingdom UI for actor: ${actorId}`);
    console.log('PF2e Kingdom Lite | Using TyphonJS SvelteApp');
    
    try {
        const app = new KingdomApp({ actorId });
        console.log('PF2e Kingdom Lite | Created KingdomApp instance:', app);
        app.render(true, { focus: true });
        console.log('PF2e Kingdom Lite | KingdomApp rendered');
    } catch (error) {
        console.error("PF2e Kingdom Lite | Failed to create KingdomApp:", error);
        // @ts-ignore
        ui.notifications?.error("Failed to open Kingdom management UI");
    }
}

/**
 * Registers the hook to add Kingdom icons to party actors in the sidebar
 */
export function registerKingdomIconHook(): void {
    console.log("Registering Kingdom icon hook");
    
    // Hook into the actor directory render to add our icons
    Hooks.on("renderActorDirectory", (app: ActorDirectory, html: JQuery | HTMLElement, data: any) => {
        console.log("renderActorDirectory hook triggered", html);
        
        // Convert jQuery to HTMLElement if needed
        const htmlElement = html instanceof HTMLElement ? html : html.get(0);
        
        if (!htmlElement) {
            console.log("No HTML element found in renderActorDirectory");
            return;
        }
        
        // Find party folders - exactly as the legacy code does it
        const partyFolders = htmlElement.querySelectorAll(".folder[data-party]");
        console.log("Found party folders:", partyFolders);
        
        partyFolders.forEach((folderElement: Element) => {
            const folder = folderElement as HTMLElement;
            const actorId = folder.dataset.entryId;
            
            if (actorId) {
                console.log(`Found party actor folder with ID: ${actorId}`);
                
                // Find where to insert our icon (after the folder name)
                const folderName = folder.querySelector(".folder-name");
                if (folderName && !folder.querySelector('.fa-chess-rook')) {
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
    // Register hooks immediately - this is called from index.ts before the ready hook
    console.log("Initializing Kingdom Icon module");
    
    if (typeof Hooks !== 'undefined') {
        // Register the hook to add icons when the actor directory is rendered
        registerKingdomIconHook();
    }
}
