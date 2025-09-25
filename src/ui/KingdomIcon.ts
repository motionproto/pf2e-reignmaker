// Kingdom Icon module for PF2e ReignMaker
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
    console.log(`PF2e ReignMaker | Opening Kingdom UI for actor: ${actorId}`);
    console.log('PF2e ReignMaker | Using TyphonJS SvelteApp');
    
    try {
        const app = new KingdomApp({ actorId } as any);
        console.log('PF2e ReignMaker | Created KingdomApp instance:', app);
        app.render(true, { focus: true });
        console.log('PF2e ReignMaker | KingdomApp rendered');
    } catch (error) {
        console.error("PF2e ReignMaker | Failed to create KingdomApp:", error);
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
    Hooks.on("renderActorDirectory", (app: any, html: any, data: any) => {
        console.log("renderActorDirectory hook triggered", html);
        
        // Convert jQuery to HTMLElement if needed
        const htmlElement = html instanceof HTMLElement ? html : html.get(0);
        
        if (!htmlElement) {
            console.log("No HTML element found in renderActorDirectory");
            return;
        }
        
        // Try multiple selectors for party actors (for compatibility with different PF2E versions)
        const partySelectors = [
            ".folder[data-party]",
            "[data-folder-id] .directory-item[data-actor-type='party']",
            ".directory-item[data-document-id]"
        ];
        
        let foundPartyActors = false;
        
        for (const selector of partySelectors) {
            const elements = htmlElement.querySelectorAll(selector);
            
            if (elements.length > 0) {
                elements.forEach((element: Element) => {
                    const elem = element as HTMLElement;
                    const actorId = elem.dataset.entryId || elem.dataset.documentId || elem.dataset.actorId;
                    
                    if (actorId) {
                        // @ts-ignore
                        const actor = game.actors?.get(actorId);
                        
                        if (actor && actor.type === 'party') {
                            foundPartyActors = true;
                            console.log(`Found party actor with ID: ${actorId}`);
                            
                            // Find where to insert our icon
                            const nameElement = elem.querySelector(".document-name, .entity-name, .folder-name");
                            
                            if (nameElement && !elem.querySelector('.fa-chess-rook')) {
                                // Insert the Kingdom icon
                                const kingdomIcon = createKingdomIcon(actorId);
                                nameElement.insertAdjacentElement("afterend", kingdomIcon);
                                console.log(`Inserted Kingdom icon for actor: ${actorId}`);
                            }
                        }
                    }
                });
            }
        }
        
        if (!foundPartyActors) {
            console.log("No party actors found. Checking all actors...");
            
            // Fallback: check all actors for party type
            // @ts-ignore
            const partyActors = game.actors?.filter((a: any) => a.type === 'party');
            if (partyActors && partyActors.length > 0) {
                console.log(`Found ${partyActors.length} party actors in game.actors`);
                
                partyActors.forEach((actor: any) => {
                    // Try to find the element for this actor
                    const actorElem = htmlElement.querySelector(
                        `[data-entry-id="${actor.id}"], [data-document-id="${actor.id}"], [data-actor-id="${actor.id}"]`
                    );
                    
                    if (actorElem) {
                        const nameElement = actorElem.querySelector(".document-name, .entity-name");
                        
                        if (nameElement && !actorElem.querySelector('.fa-chess-rook')) {
                            const kingdomIcon = createKingdomIcon(actor.id);
                            nameElement.insertAdjacentElement("afterend", kingdomIcon);
                            console.log(`Inserted Kingdom icon for actor: ${actor.id}`);
                        }
                    }
                });
            }
        }
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
