// Turn content component for PF2e Kingdom Lite
// Auto-converted and fixed from ContentTurn.kt

import { html } from '../html-helpers';
import { KingdomState, TurnPhase, Settlement, BuildProject } from '../../models/KingdomState';
import { Hex, Worksite, WorksiteType } from '../../models/Hex';
import { TurnManager } from '../../models/TurnManager';

// Import phase components - these will be defined later
declare class StatusPhase {
  constructor(kingdomState: KingdomState, turnManager: TurnManager);
  render(): string;
}
declare class UnrestPhase {
  constructor(kingdomState: KingdomState, turnManager: TurnManager);
  render(): string;
}
declare class EventsPhase {
  constructor(kingdomState: KingdomState, turnManager: TurnManager);
  render(): string;
}
declare class ActionsPhase {
  constructor(kingdomState: KingdomState);
  render(): string;
}

import { ResourcesPhase } from '../turn/ResourcesPhase';

/**
 * Turn content component
 * Self-contained component that manages the turn phase navigation and content display
 */
export class ContentTurn {
  private activePhase = "status";
  private elementId = `turn-content-${Date.now()}`;
  private kingdomState: KingdomState;
  private turnManager: TurnManager;
  
  constructor() {
    // Try to use existing kingdom state first
    const existingState = (window as any).currentKingdomState as KingdomState | null;
    
    if (existingState) {
      this.kingdomState = existingState;
    } else {
      // Create new kingdom state
      const hexList: Hex[] = [];
      const settlementList: Settlement[] = [];
      
      // Load real data from the PF2e Kingmaker module if available
      const realmData = this.getKingmakerRealmData();
      if (realmData) {
        console.log("Loading kingdom data from PF2e Kingmaker...");
        console.log(`Total hexes claimed: ${realmData.size}`);
        console.log(`Farmlands: ${realmData.worksites.farmlands.quantity}`);
        console.log(`Lumber Camps: ${realmData.worksites.lumberCamps.quantity}`);
        console.log(`Mines: ${realmData.worksites.mines.quantity}`);
        console.log(`Quarries: ${realmData.worksites.quarries.quantity}`);
        
        // Track worksite counts
        const worksiteCounts = new Map([
          ["farmlands", realmData.worksites.farmlands.quantity],
          ["lumberCamps", realmData.worksites.lumberCamps.quantity],
          ["quarries", realmData.worksites.quarries.quantity],
          ["mines", realmData.worksites.mines.quantity],
          ["bogMines", 0],
          ["huntingCamps", 0]
        ]);
        
        // Create hexes with worksites based on the worksite data
        let hexId = 0;
        
        // Add farmlands (they're usually on Plains, but could be on Hills/Swamp)
        for (let i = 0; i < realmData.worksites.farmlands.quantity; i++) {
          hexList.push(new Hex(
            `hex${++hexId}`,
            "Plains", // Default to Plains for 2 food production
            new Worksite(WorksiteType.FARMSTEAD),
            false,
            `Farmland ${i + 1}`
          ));
        }
        
        // Add lumber camps (Forest terrain)
        for (let i = 0; i < realmData.worksites.lumberCamps.quantity; i++) {
          hexList.push(new Hex(
            `hex${++hexId}`,
            "Forest",
            new Worksite(WorksiteType.LOGGING_CAMP),
            false,
            `Lumber Camp ${i + 1}`
          ));
        }
        
        // Add mines (Mountains terrain)
        for (let i = 0; i < realmData.worksites.mines.quantity; i++) {
          hexList.push(new Hex(
            `hex${++hexId}`,
            "Mountains",
            new Worksite(WorksiteType.MINE),
            false,
            `Mine ${i + 1}`
          ));
        }
        
        // Add quarries (Hills terrain)
        for (let i = 0; i < realmData.worksites.quarries.quantity; i++) {
          hexList.push(new Hex(
            `hex${++hexId}`,
            "Hills",
            new Worksite(WorksiteType.QUARRY),
            false,
            `Quarry ${i + 1}`
          ));
        }
        
        // Add settlements from the realm data
        for (let i = 0; i < realmData.settlements.villages; i++) {
          settlementList.push({
            name: `Village ${i + 1}`,
            structureIds: [],
            tier: 1,
            connectedByRoads: false
          } as unknown as Settlement);
        }
        
        for (let i = 0; i < realmData.settlements.towns; i++) {
          settlementList.push({
            name: `Town ${i + 1}`,
            structureIds: [],
            tier: 2,
            connectedByRoads: false
          } as unknown as Settlement);
        }
        
        for (let i = 0; i < realmData.settlements.cities; i++) {
          settlementList.push({
            name: `City ${i + 1}`,
            structureIds: [],
            tier: 3,
            connectedByRoads: false
          } as unknown as Settlement);
        }
        
        for (let i = 0; i < realmData.settlements.metropolises; i++) {
          settlementList.push({
            name: `Metropolis ${i + 1}`,
            structureIds: [],
            tier: 4,
            connectedByRoads: false
          } as unknown as Settlement);
        }
        
        console.log(`Created ${hexList.length} hexes with worksites`);
        console.log(`Created ${settlementList.length} settlements`);
      }
      
      // Create kingdom state with real or empty data
      this.kingdomState = new KingdomState();
      this.kingdomState.settlements = settlementList;
      this.kingdomState.resources = new Map([
        ["food", 0],
        ["lumber", 0],
        ["stone", 0],
        ["ore", 0],
        ["gold", 0]
      ]);
      this.kingdomState.hexes = hexList;
      this.kingdomState.armies = [];
      this.kingdomState.buildQueue = [];
      this.kingdomState.isAtWar = window.localStorage.getItem("kingdomWarStatus") === "war";
      this.kingdomState.size = realmData?.size || hexList.length;
      
      // Update worksite counts if we have realm data
      if (realmData) {
        this.kingdomState.worksiteCount.set("farmlands", realmData.worksites.farmlands.quantity);
        this.kingdomState.worksiteCount.set("lumberCamps", realmData.worksites.lumberCamps.quantity);
        this.kingdomState.worksiteCount.set("quarries", realmData.worksites.quarries.quantity);
        this.kingdomState.worksiteCount.set("mines", realmData.worksites.mines.quantity);
      }
    }
    
    this.turnManager = new TurnManager(this.kingdomState);
  }
  
  render(): string {
    return html`
      <div class="turn-content" data-content-id="${this.elementId}">
        <div class="phase-navigation-fixed">
          ${this.renderPhaseButtons()}
        </div>
        <div class="phase-content-scrollable">
          <div class="phase-content" id="phase-content-${this.elementId}">
            ${this.renderPhaseContent()}
          </div>
        </div>
      </div>
    `;
  }
  
  attachListeners(container: HTMLElement): void {
    // Attach phase button listeners within this component's scope
    const turnContent = container.querySelector(`[data-content-id='${this.elementId}']`);
    if (!turnContent) return;
    
    const phaseButtons = turnContent.querySelectorAll(".phase-button");
    phaseButtons.forEach(button => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        const phase = (button as HTMLElement).dataset.phase;
        if (phase) {
          this.setActivePhase(phase);
          this.updatePhaseContent(turnContent as HTMLElement);
        }
      });
    });
    
    // Store global references for phase mechanics
    (window as any).currentKingdomState = this.kingdomState;
    (window as any).currentTurnManager = this.turnManager;
    
    // Setup Phase I execution handler
    (window as any).executePhaseI = () => {
      this.turnManager.executeCurrentPhase();
      // Refresh the display
      const contentArea = turnContent.querySelector(`#phase-content-${this.elementId}`) as HTMLElement | null;
      if (contentArea && this.activePhase === "status") {
        const statusPhase = new StatusPhase(this.kingdomState, this.turnManager);
        contentArea.innerHTML = statusPhase.render();
      }
      // Update KingdomStats sidebar
      this.updateKingdomStatsDisplay();
      
      // Update fame button states in KingdomStats
      const fameDecreaseBtn = document.querySelector("#fame-decrease-btn") as HTMLElement | null;
      const fameIncreaseBtn = document.querySelector("#fame-increase-btn") as HTMLElement | null;
      
      if (this.kingdomState.fame <= 0) {
        if (fameDecreaseBtn) {
          fameDecreaseBtn.setAttribute("disabled", "true");
          fameDecreaseBtn.style.opacity = "0.5";
          fameDecreaseBtn.style.cursor = "not-allowed";
        }
      } else {
        if (fameDecreaseBtn) {
          fameDecreaseBtn.removeAttribute("disabled");
          fameDecreaseBtn.style.opacity = "1";
          fameDecreaseBtn.style.cursor = "pointer";
        }
      }
      
      if (this.kingdomState.fame >= 3) {
        if (fameIncreaseBtn) {
          fameIncreaseBtn.setAttribute("disabled", "true");
          fameIncreaseBtn.style.opacity = "0.5";
          fameIncreaseBtn.style.cursor = "not-allowed";
        }
      } else {
        if (fameIncreaseBtn) {
          fameIncreaseBtn.removeAttribute("disabled");
          fameIncreaseBtn.style.opacity = "1";
          fameIncreaseBtn.style.cursor = "pointer";
        }
      }
      
      // Update resource summary in turn controller header
      const resourceSummary = document.querySelector(".resource-summary");
      if (resourceSummary) {
        const fameSpan = resourceSummary.querySelector(".resource-item:first-child");
        if (fameSpan) {
          fameSpan.innerHTML = html`<i class="fas fa-star"></i> Fame: ${this.kingdomState.fame}`;
        }
      }
      
      // Also trigger TurnController's update callback if it exists
      const updateTurnControllerCallback = (window as any).updateTurnControllerDisplay;
      if (updateTurnControllerCallback) {
        updateTurnControllerCallback();
      }
    };
    
    // Setup update function for KingdomStats
    (window as any).updateKingdomStats = () => {
      this.updateKingdomStatsDisplay();
    };
    
    // Setup Resource Phase Step handlers
    (window as any).executeResourceStep1 = () => {
      this.turnManager.executeResourcesStep1();
      this.updateResourcePhaseDisplay(turnContent as HTMLElement);
    };
    
    (window as any).executeResourceStep2 = () => {
      this.turnManager.executeResourcesStep2();
      this.updateResourcePhaseDisplay(turnContent as HTMLElement);
      this.updateKingdomStatsDisplay();
    };
    
    (window as any).executeResourceStep3 = () => {
      this.turnManager.executeResourcesStep3();
      this.updateResourcePhaseDisplay(turnContent as HTMLElement);
      this.updateKingdomStatsDisplay();
    };
    
    (window as any).executeResourceStep4 = () => {
      this.turnManager.executeResourcesStep4();
      this.updateResourcePhaseDisplay(turnContent as HTMLElement);
      this.updateKingdomStatsDisplay();
    };
    
    // Setup resource allocation adjustment handler
    (window as any).adjustAllocation = (projectId: string, resource: string, delta: number) => {
      const project = this.kingdomState.buildQueue.find(p => p.structureId === projectId);
      if (project) {
        // Use cast to work with optional properties
        const projectAny = project as any;
        const current = projectAny.pendingAllocation?.get(resource) || 0;
        const available = this.kingdomState.resources.get(resource) || 0;
        const remaining = project.remainingCost.get(resource) || 0;
        
        // Calculate total pending for this resource across all projects
        let totalPending = 0;
        this.kingdomState.buildQueue.forEach(p => {
          const pAny = p as any;
          if (p.structureId === projectId) {
            totalPending += current;
          } else {
            totalPending += pAny.pendingAllocation?.get(resource) || 0;
          }
        });
        
        const newValue = current + delta;
        
        // Ensure we don't exceed available resources or needed amount
        if (newValue >= 0 && (totalPending + delta) <= available && newValue <= remaining) {
          if (!projectAny.pendingAllocation) {
            projectAny.pendingAllocation = new Map();
          }
          projectAny.pendingAllocation.set(resource, newValue);
          this.updateResourcePhaseDisplay(turnContent as HTMLElement);
        }
      }
    };
  }
  
  private updateResourcePhaseDisplay(container: HTMLElement): void {
    if (this.activePhase === "resources") {
      const contentArea = container.querySelector(`#phase-content-${this.elementId}`) as HTMLElement | null;
      if (contentArea) {
        const resourcesPhase = new ResourcesPhase(this.kingdomState, this.turnManager);
        contentArea.innerHTML = resourcesPhase.render();
      }
    }
  }
  
  private setActivePhase(phase: string): void {
    // Map string phase names to TurnPhase enum values
    let turnPhase: TurnPhase;
    switch (phase) {
      case "status": turnPhase = TurnPhase.PHASE_I; break;
      case "resources": turnPhase = TurnPhase.PHASE_II; break;
      case "unrest": turnPhase = TurnPhase.PHASE_III; break;
      case "events": turnPhase = TurnPhase.PHASE_IV; break;
      case "actions": turnPhase = TurnPhase.PHASE_V; break;
      case "resolution": turnPhase = TurnPhase.PHASE_VI; break;
      default: return;
    }
    
    // Only allow phase change if we're currently in Phase I (Status phase)
    if (this.kingdomState.currentPhase === TurnPhase.PHASE_I) {
      this.kingdomState.currentPhase = turnPhase;
      this.turnManager.skipToPhase(turnPhase);
    }
    
    this.activePhase = phase;
  }
  
  getActivePhase(): string {
    return this.activePhase;
  }
  
  private updatePhaseContent(container: HTMLElement): void {
    // Update button states
    const buttons = container.querySelectorAll(".phase-button");
    buttons.forEach(btn => {
      const btnPhase = (btn as HTMLElement).dataset.phase;
      if (btnPhase === this.activePhase) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    });
    
    // Update content
    const contentArea = container.querySelector(`#phase-content-${this.elementId}`) as HTMLElement | null;
    if (contentArea) {
      contentArea.innerHTML = this.renderPhaseContent();
    }
  }
  
  private renderPhaseButtons(): string {
    const phases = [
      ["status", "Status"],
      ["resources", "Resources"],
      ["unrest", "Unrest"],
      ["events", "Events"],
      ["actions", "Actions"],
      ["resolution", "Resolution"]
    ];
    
    const buttons = phases.map(([id, label]) => {
      const activeClass = id === this.activePhase ? "active" : "";
      return html`
        <button class="phase-button ${activeClass}" data-phase="${id}">
          ${label}
        </button>
      `;
    }).join('');
    
    return html`<div class="phase-buttons">${buttons}</div>`;
  }
  
  private renderPhaseContent(): string {
    switch (this.activePhase) {
      case "status": 
        const statusPhase = new StatusPhase(this.kingdomState, this.turnManager);
        return statusPhase.render();
      case "resources": 
        const resourcesPhase = new ResourcesPhase(this.kingdomState, this.turnManager);
        return resourcesPhase.render();
      case "unrest": 
        const unrestPhase = new UnrestPhase(this.kingdomState, this.turnManager);
        return unrestPhase.render();
      case "events": 
        const eventsPhase = new EventsPhase(this.kingdomState, this.turnManager);
        return eventsPhase.render();
      case "actions": 
        if (typeof ActionsPhase !== 'undefined') {
          const actionsPhase = new ActionsPhase(this.kingdomState);
          return actionsPhase.render();
        }
        return html`<div>Actions phase - Player actions</div>`;
      case "resolution": 
        return html`<div>Resolution phase - End of turn cleanup</div>`;
      default: 
        return html`<div>Select a phase</div>`;
    }
  }
  
  private updateKingdomStatsDisplay(): void {
    // Update specific values in the KingdomStats sidebar without re-rendering everything
    const fameElement = document.getElementById("kingdom-fame-value");
    if (fameElement) fameElement.textContent = this.kingdomState.fame.toString();
    
    const goldElement = document.getElementById("kingdom-gold-value");
    if (goldElement) goldElement.textContent = (this.kingdomState.resources.get("gold") || 0).toString();
    
    const unrestElement = document.getElementById("kingdom-unrest-value");
    if (unrestElement) unrestElement.textContent = this.kingdomState.unrest.toString();
    
    const foodElement = document.getElementById("kingdom-food-value");
    if (foodElement) foodElement.textContent = (this.kingdomState.resources.get("food") || 0).toString();
    
    const lumberElement = document.getElementById("kingdom-lumber-value");
    if (lumberElement) lumberElement.textContent = (this.kingdomState.resources.get("lumber") || 0).toString();
    
    const stoneElement = document.getElementById("kingdom-stone-value");
    if (stoneElement) stoneElement.textContent = (this.kingdomState.resources.get("stone") || 0).toString();
    
    const oreElement = document.getElementById("kingdom-ore-value");
    if (oreElement) oreElement.textContent = (this.kingdomState.resources.get("ore") || 0).toString();
  }
  
  private getKingmakerRealmData(): any {
    // This would interface with the actual PF2e Kingmaker module
    // For now, return mock data or null
    return null;
  }
}
