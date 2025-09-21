// Kingdom ApplicationV2 for PF2e Kingdom Lite
// Foundry VTT ApplicationV2 wrapper

import { ContentSelector } from './components/ContentSelector';
import { KingdomStats } from './components/KingdomStats';
import { ContentTurn } from './components/ContentTurn';
import { ContentSettlements } from './components/ContentSettlements';
import { ContentFactions } from './components/ContentFactions';
import { ContentModifiers } from './components/ContentModifiers';
import { ContentNotes } from './components/ContentNotes';
import { ContentSettings } from './components/ContentSettings';
import { ContentComponent } from './components/ContentComponent';

/**
 * External declaration for Foundry's ApplicationV2 class
 */
declare abstract class ApplicationV2 {
    open(options?: any): void;
    render(force?: boolean): any;
    close(options?: any): any;
    setPosition(position?: any): any;
}

/**
 * Creates a Foundry ApplicationV2-based Kingdom Sheet
 */
export function createKingdomApplicationV2(): any {
    // Simply use fallback to our custom implementation for now
    // The ApplicationV2 approach needs more complex JavaScript bridge
    console.log("Using custom Application implementation (ApplicationV2 bridge needs refinement)");
    return null;
}

/**
 * Initialize the Kingdom Sheet HTML template
 */
export function initializeKingdomTemplate(): string {
    // Create the template HTML
    const contentSelector = new ContentSelector((contentId) => {
        switchContent(contentId);
    });
    
    const template = `
        <div class="kingdom-container">
            <div class="kingdom-header">
                ${contentSelector.render()}
            </div>
            <div class="kingdom-body">
                <div class="kingdom-sidebar">
                    <!-- Kingdom stats will be rendered here -->
                </div>
                <div class="kingdom-main content">
                    ${new ContentTurn().render()}
                </div>
            </div>
        </div>
    `;
    
    // Store it globally for the ApplicationV2 to use
    (window as any).kingdomSheetV2Template = template;
    
    return template;
}

/**
 * Setup callbacks for the ApplicationV2
 */
export function setupKingdomCallbacks(): void {
    // Store components
    const contentSelector = new ContentSelector((contentId) => {
        switchContent(contentId);
    });
    
    const contentComponents = new Map<string, ContentComponent>([
        ["turn", new ContentTurn()],
        ["settlements", new ContentSettlements()],
        ["factions", new ContentFactions()],
        ["modifiers", new ContentModifiers()],
        ["notes", new ContentNotes()],
        ["settings", new ContentSettings()]
    ]);
    
    let currentContent: ContentComponent | null = contentComponents.get("turn") || null;
    
    // Setup render callback
    (window as any).onKingdomSheetRendered = (element: HTMLElement) => {
        console.log("Kingdom sheet rendered, element:", element);
        
        // Update the template with current content
        const mainArea = element.querySelector(".kingdom-main");
        if (mainArea) {
            mainArea.innerHTML = currentContent?.render() || "";
        }
    };
    
    // Setup listeners callback
    (window as any).activateKingdomListeners = (html: HTMLElement) => {
        const htmlElement = html as HTMLElement;
        
        console.log("Activating Kingdom listeners");
        
        // Attach component listeners
        contentSelector.attachListeners(htmlElement);
        // KingdomStats would be attached here if instantiated
        if (currentContent?.attachListeners) {
            currentContent.attachListeners(htmlElement);
        }
        
        // Setup content switching
        const buttons = htmlElement.querySelectorAll(".content-selector button");
        buttons.forEach((button) => {
            button.addEventListener('click', (event: Event) => {
                const target = event.target as HTMLElement;
                const contentId = target.getAttribute("data-content") || "turn";
                
                // Switch content
                currentContent = contentComponents.get(contentId) || null;
                
                // Update main area
                const mainArea = htmlElement.querySelector(".kingdom-main") as HTMLElement | null;
                if (mainArea) {
                    mainArea.innerHTML = currentContent?.render() || "";
                    if (currentContent?.attachListeners) {
                        currentContent.attachListeners(htmlElement);
                    }
                }
            });
        });
    };
    
    (window as any).switchContent = (contentId: string) => {
        currentContent = contentComponents.get(contentId) || null;
        
        const sheet = (window as any).currentKingdomSheet;
        if (sheet?.element) {
            const mainArea = sheet.element.querySelector(".kingdom-main");
            if (mainArea) {
                mainArea.innerHTML = currentContent?.render() || "";
                if (currentContent?.attachListeners) {
                    currentContent.attachListeners(sheet.element as HTMLElement);
                }
            }
        }
    };
}

/**
 * Open the Kingdom Sheet using ApplicationV2
 */
export function openKingdomSheetV2(): void {
    console.log("Opening Kingdom Sheet V2 - falling back to custom implementation");
    
    // For now, fall back to our custom implementation
    // The ApplicationV2 approach would require a more complex JS bridge
    import('./KingdomSheet').then(({ KingdomSheet }) => {
        const sheet = new KingdomSheet();
        sheet.render();
    });
}

/**
 * Helper to switch content in the sheet
 */
function switchContent(contentId: string): void {
    if ((window as any).switchContent) {
        (window as any).switchContent(contentId);
    }
}
