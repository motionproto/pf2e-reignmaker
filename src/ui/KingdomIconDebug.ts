// Debug version of Kingdom Icon to diagnose why it's not appearing

import { KingdomApp } from '../view/kingdom/KingdomApp';

export function debugKingdomIcon(): void {
    console.log("🏰 Kingdom Icon Debug - Starting diagnostics");
    
    // Check if Hooks is available
    if (typeof Hooks === 'undefined') {
        console.error("🏰 Hooks is not defined!");
        return;
    }
    
    // Add multiple hooks to catch different render events
    const hooks = [
        'renderActorDirectory',
        'renderSidebarTab', 
        'renderActorSheet',
        'ready'
    ];
    
    hooks.forEach(hookName => {
        Hooks.on(hookName, (...args: any[]) => {
            console.log(`🏰 Hook fired: ${hookName}`, args);
            
            if (hookName === 'renderActorDirectory') {
                tryAddKingdomIcons(args[1]);
            }
        });
    });
    
    // Also try on ready
    Hooks.once('ready', () => {
        console.log("🏰 Ready hook - Checking for party actors");
        
        // Log all actors
        // @ts-ignore
        if (game?.actors) {
            // @ts-ignore
            const actors = game.actors.contents;
            console.log("🏰 All actors:", actors);
            
            const partyActors = actors.filter((a: any) => a.type === 'party');
            console.log("🏰 Party actors found:", partyActors);
            
            // Try to find the actor directory
            setTimeout(() => {
                const actorDir = document.querySelector('#actors');
                console.log("🏰 Actor directory element:", actorDir);
                
                if (actorDir) {
                    // Look for all possible selectors
                    const selectors = [
                        '.folder[data-party]',
                        '.directory-item[data-actor-id]',
                        '.actor.directory-item',
                        '.entity-link[data-type="Actor"]',
                        '.folder-header',
                        'li[data-entry-id]'
                    ];
                    
                    selectors.forEach(selector => {
                        const elements = actorDir.querySelectorAll(selector);
                        if (elements.length > 0) {
                            console.log(`🏰 Found elements with selector '${selector}':`, elements);
                        }
                    });
                    
                    // Try to manually add icons to party actors
                    partyActors.forEach((actor: any) => {
                        const actorElement = actorDir.querySelector(`[data-entry-id="${actor.id}"]`);
                        if (actorElement) {
                            console.log(`🏰 Found element for party actor ${actor.name}:`, actorElement);
                            addKingdomIconToElement(actorElement as HTMLElement, actor.id);
                        } else {
                            console.log(`🏰 Could not find element for party actor ${actor.name} with id ${actor.id}`);
                        }
                    });
                }
            }, 1000); // Wait a bit for DOM to settle
        }
    });
}

function tryAddKingdomIcons(html: JQuery | HTMLElement): void {
    console.log("🏰 tryAddKingdomIcons called with:", html);
    
    const htmlElement = html instanceof HTMLElement ? html : html.get(0);
    if (!htmlElement) {
        console.log("🏰 No HTML element found");
        return;
    }
    
    // Try multiple selectors
    const selectors = [
        '.folder[data-party]',
        '[data-folder-id]',
        '.directory-item',
        'li[data-entry-id]'
    ];
    
    selectors.forEach(selector => {
        const elements = htmlElement.querySelectorAll(selector);
        if (elements.length > 0) {
            console.log(`🏰 Found ${elements.length} elements with selector '${selector}'`);
            
            elements.forEach(elem => {
                // Check if this is a party actor
                // @ts-ignore
                const actorId = elem.dataset.entryId || elem.dataset.actorId;
                if (actorId) {
                    // @ts-ignore
                    const actor = game.actors?.get(actorId);
                    if (actor && actor.type === 'party') {
                        console.log(`🏰 Found party actor element for ${actor.name}`);
                        addKingdomIconToElement(elem as HTMLElement, actorId);
                    }
                }
            });
        }
    });
}

function addKingdomIconToElement(element: HTMLElement, actorId: string): void {
    // Check if icon already exists
    if (element.querySelector('.kingdom-icon-debug')) {
        console.log("🏰 Icon already exists for", actorId);
        return;
    }
    
    // Find where to insert the icon
    const insertTargets = [
        '.folder-name',
        '.entity-name', 
        '.document-name',
        'h4',
        'h3'
    ];
    
    let inserted = false;
    for (const target of insertTargets) {
        const targetElement = element.querySelector(target);
        if (targetElement && !inserted) {
            console.log(`🏰 Inserting icon after '${target}' for actor ${actorId}`);
            
            const icon = createKingdomIconElement(actorId);
            targetElement.insertAdjacentElement('afterend', icon);
            inserted = true;
            break;
        }
    }
    
    if (!inserted) {
        // Fallback: append to the element itself
        console.log(`🏰 Fallback: Appending icon to element for actor ${actorId}`);
        const icon = createKingdomIconElement(actorId);
        element.appendChild(icon);
    }
}

function createKingdomIconElement(actorId: string): HTMLElement {
    const link = document.createElement('a');
    link.classList.add('kingdom-icon-debug');
    link.style.cssText = 'margin-left: 8px; color: #4a90e2; cursor: pointer;';
    link.setAttribute('data-tooltip', 'ReignMaker');
    link.title = 'ReignMaker';
    
    const icon = document.createElement('i');
    icon.classList.add('fa-solid', 'fa-chess-rook');
    link.appendChild(icon);
    
    link.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        
        console.log(`🏰 Kingdom icon clicked for actor ${actorId}`);
        
        try {
            const app = new KingdomApp({ actorId });
            app.render(true, { focus: true });
            console.log('🏰 KingdomApp opened successfully');
        } catch (error) {
            console.error("🏰 Error opening KingdomApp:", error);
            // @ts-ignore
            ui.notifications?.error("Failed to open Kingdom UI: " + error);
        }
    });
    
    return link;
}

// Export the debug function
export function initKingdomIconDebug(): void {
    console.log("🏰 Initializing Kingdom Icon Debug Mode");
    debugKingdomIcon();
}
