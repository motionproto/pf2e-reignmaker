// Auto-converted and fixed from KingdomSheet.kt
// Main Kingdom Sheet Application

/**
 * Main Kingdom Sheet Application
 * Simply provides the window structure - all behavior instanceof managed by components
 */
export class KingdomSheet {
    // Components that make up the sheet
    private contentSelector: any;
    private kingdomStats: any;
    
    // Content components - each manages its own state and listeners
    private contentComponents: Map<string, any> = new Map([
        ["turn", null],
        ["settlements", null],
        ["factions", null],
        ["modifiers", null],
        ["notes", null],
        ["settings", null]
    ]);
    
    private currentContent: any = null;
    private element: HTMLElement | null = null;
    
    options: any = {
        id: "kingdom-sheet",
        title: "Kingdom Management",
        classes: ["kingdom-sheet"],
        width: 1000,
        height: 700,
        resizable: true,
        minimizable: false,
        scrollY: null
    };

    constructor() {
        // Initialize components when they're available
        this.currentContent = this.contentComponents.get("turn") || null;
    }

    async getData(): Promise<any> {
        return {};
    }

    activateListeners(html: HTMLElement): void {
        this.element = html;
        
        // Let each component handle its own listeners
        if (this.contentSelector) {
            this.contentSelector.attachListeners(html);
        }
        if (this.kingdomStats) {
            this.kingdomStats.attachListeners(html);
        }
        if (this.currentContent) {
            this.currentContent.attachListeners(html);
        }
    }

    private onContentChange(contentId: string): void {
        // Update current content
        this.currentContent = this.contentComponents.get(contentId) || null;
        
        // Re-render the main content area
        const mainArea = this.element?.querySelector(".kingdom-main") as HTMLElement | null;
        if (mainArea && this.currentContent) {
            mainArea.innerHTML = this.currentContent.render() || "";
            // Attach listeners for the new content
            const parentElement = mainArea.parentElement;
            if (parentElement) {
                this.currentContent.attachListeners(parentElement);
            }
        }
    }
    
    get template(): string {
        let result = "";
        result += `
            <div class="kingdom-container">
                <div class="kingdom-header">
                    ${this.contentSelector?.render() || ""}
                </div>
                <div class="kingdom-body">
                    <div class="kingdom-sidebar">
                        ${this.kingdomStats?.render() || ""}
                    </div>
                    <div class="kingdom-main content">
                        ${this.currentContent?.render() || ""}
                    </div>
                </div>
            </div>
        `;
        return result;
    }

    render(): string {
        return this.template;
    }
}
