// Resources Phase UI component for PF2e Kingdom Lite
// Auto-converted and fixed from ResourcesPhase.kt

import { html } from '../html-helpers';
import { KingdomState, BuildProject } from '../../models/KingdomState';
import { TurnManager } from '../../models/TurnManager';
import { ResourceStyles } from '../styles/ResourceStyles';

/**
 * Resources Phase content for the Kingdom Sheet
 * Handles resource collection, consumption, military support, and build queue
 */
export class ResourcesPhase {
  private kingdomState: KingdomState;
  private turnManager: TurnManager;
  
  constructor(kingdomState: KingdomState, turnManager: TurnManager) {
    this.kingdomState = kingdomState;
    this.turnManager = turnManager;
  }
  
  render(): string {
    const production = this.kingdomState.calculateProduction();
    
    // Include resource styles
    const styles = `<style>${ResourceStyles.getStyles()}</style>`;
    
    return html`
      ${styles}
      <div class="resources-phase-container">
        <!-- Part 1: Resource Display at the Top -->
        ${this.renderResourceDisplay()}
        
        <!-- Part 2: Resource Steps Underneath -->
        ${this.renderResourceSteps()}
      </div>
    `;
  }
  
  /**
   * Part 1: Render the resource display at the top
   */
  private renderResourceDisplay(): string {
    return this.renderResourceDashboard();
  }
  
  /**
   * Part 2: Render all resource steps in a scrollable container
   */
  private renderResourceSteps(): string {
    return html`
      <div class="resource-steps-scroll">
        ${this.renderStep1CollectResources()}
        ${this.renderStep2FoodConsumption()}
        ${this.renderStep3MilitarySupport()}
        ${this.renderStep4BuildQueue()}
      </div>
    `;
  }
  
  /**
   * Render the resource dashboard (non-sticky)
   */
  private renderResourceDashboard(): string {
    return html`
      <div class="resource-dashboard-wrapper">
        <div class="resource-dashboard">
          ${this.renderCompactResourceCard('food', this.kingdomState.resources.get('food') || 0)}
          ${this.renderCompactResourceCard('lumber', this.kingdomState.resources.get('lumber') || 0)}
          ${this.renderCompactResourceCard('stone', this.kingdomState.resources.get('stone') || 0)}
          ${this.renderCompactResourceCard('ore', this.kingdomState.resources.get('ore') || 0)}
          ${this.renderCompactResourceCard('gold', this.kingdomState.resources.get('gold') || 0)}
        </div>
      </div>
    `;
  }
  
  /**
   * Render a compact resource card for the sticky dashboard
   */
  private renderCompactResourceCard(resource: string, value: number): string {
    let icon = '';
    let color = '';
    
    switch (resource) {
      case 'food': icon = 'fa-wheat-awn'; color = '#8B4513'; break;
      case 'lumber': icon = 'fa-tree'; color = '#228B22'; break;
      case 'stone': icon = 'fa-cube'; color = '#708090'; break;
      case 'ore': icon = 'fa-mountain'; color = '#4B0082'; break;
      case 'gold': icon = 'fa-coins'; color = '#FFD700'; break;
      default: icon = 'fa-question'; color = '#666666';
    }
    
    return html`
      <div class="resource-card">
        <i class="fas ${icon} resource-icon" style="color: ${color};"></i>
        <div class="resource-value">${value}</div>
        <div class="resource-label">${resource.charAt(0).toUpperCase() + resource.slice(1)}</div>
      </div>
    `;
  }
  
  /**
   * Step 1: Collect Resources
   */
  private renderStep1CollectResources(): string {
    const isCompleted = this.kingdomState.isPhaseStepCompleted('resources_collect');
    const production = this.kingdomState.calculateProduction();
    const hasWorksites = this.kingdomState.hexes.some(hex => hex.worksite !== null);
    
    let productionSummary = '';
    if (production.size > 0 || hasWorksites) {
      const productionText = production.size > 0 
        ? Array.from(production.entries())
            .map(([key, value]) => `+${value} ${key.charAt(0).toUpperCase() + key.slice(1)}`)
            .join(' | ')
        : 'No Production';
      
      let worksiteDetails = '';
      if (hasWorksites) {
        const worksiteList = this.kingdomState.hexes
          .filter(hex => hex.worksite !== null)
          .map(hex => {
            const prod = hex.getProduction();
            const prodText = prod.size > 0
              ? Array.from(prod.entries())
                  .map(([k, v]) => `${v} ${k.charAt(0).toUpperCase() + k.slice(1)}`)
                  .join(', ')
              : 'No production';
            return html`
              <li class="worksite-item">
                <span>${hex.name || `Hex ${hex.id}`} (${hex.terrain})</span>
                <span>${prodText}</span>
              </li>
            `;
          }).join('');
        
        worksiteDetails = html`
          <details style="margin-top: 10px;">
            <summary style="cursor: pointer; color: #666; font-size: 14px;">View Worksite Details</summary>
            <ul class="worksite-list" style="margin-top: 10px;">
              ${worksiteList}
            </ul>
          </details>
        `;
      }
      
      productionSummary = html`
        <div class="production-summary" style="margin: 15px 0; padding: 15px; background: linear-gradient(135deg, #f5f5f5 0%, #e5e5e5 100%); border-radius: 8px; border: 1px solid #d1d1d1;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
            <div class="production-summary-title" style="font-weight: bold; font-size: 16px;">Expected Income This Turn:</div>
            <div style="font-weight: bold; color: #22c55e;">${productionText}</div>
          </div>
          ${worksiteDetails}
        </div>
      `;
    } else {
      productionSummary = html`
        <div style="margin: 15px 0; padding: 15px; background: #f9f9f9; border-radius: 8px; border: 1px solid #e5e5e5; text-align: center; color: #666; font-style: italic;">
          No worksites currently producing resources
        </div>
      `;
    }
    
    const button = isCompleted
      ? html`
        <button class="turn-action-button" disabled style="opacity: 0.5;">
          <i class="fas fa-check"></i> Resources Collected
        </button>
      `
      : html`
        <button class="turn-action-button" onclick="window.executeResourceStep1()">
          <i class="fas fa-hand-holding-usd"></i> Collect Resources
        </button>
      `;
    
    return html`
      <div class="phase-step-container" style="position: relative;">
        ${isCompleted ? '<i class="fas fa-check-circle phase-step-complete"></i>' : ''}
        <strong>Step 1: Collect Resources and Revenue</strong>
        
        ${productionSummary}
        
        ${isCompleted ? '<div style="margin-top: 10px; color: #666; font-style: italic; text-align: center;">Resources have been collected for this turn.</div>' : ''}
        
        ${button}
      </div>
    `;
  }
  
  /**
   * Step 2: Food Consumption
   */
  private renderStep2FoodConsumption(): string {
    const isCompleted = this.kingdomState.isPhaseStepCompleted('resources_consumption');
    const totalFoodNeeded = this.kingdomState.getTotalFoodConsumption();
    const currentFood = this.kingdomState.resources.get('food') || 0;
    const shortage = Math.max(0, totalFoodNeeded - currentFood);
    
    const [settlementFood, armyFood] = this.kingdomState.getFoodConsumptionBreakdown();
    
    const warning = shortage > 0 && !isCompleted
      ? html`
        <div class="consumption-warning">
          <i class="fas fa-exclamation-triangle"></i>
          <strong>Warning:</strong> Food shortage of ${shortage} will cause +${shortage} Unrest!
        </div>
      `
      : '';
    
    const button = isCompleted
      ? html`
        <button class="turn-action-button" disabled style="opacity: 0.5;">
          <i class="fas fa-check"></i> Consumption Paid
        </button>
      `
      : html`
        <button class="turn-action-button" onclick="window.executeResourceStep2()">
          <i class="fas fa-utensils"></i> Pay Food Consumption
        </button>
      `;
    
    return html`
      <div class="phase-step-container" style="position: relative;">
        ${isCompleted ? '<i class="fas fa-check-circle phase-step-complete"></i>' : ''}
        <strong>Step 2: Food Consumption</strong>
        
        <div style="margin: 10px 0;">
          <div style="display: flex; justify-content: space-around; flex-wrap: wrap; gap: 20px;">
            <div style="text-align: center;">
              <i class="fas fa-home" style="font-size: 32px; color: #8B4513;"></i>
              <div style="font-size: 20px; font-weight: bold; margin: 2px 0;">${settlementFood}</div>
              <div style="font-size: 11px; color: #666;">Settlement Consumption</div>
            </div>
            
            <div style="text-align: center;">
              <i class="fas fa-shield-alt" style="font-size: 32px; color: #4682B4;"></i>
              <div style="font-size: 20px; font-weight: bold; margin: 2px 0;">${armyFood}</div>
              <div style="font-size: 11px; color: #666;">Army Consumption</div>
            </div>
            
            <div style="text-align: center;">
              <i class="fas fa-wheat-awn" style="font-size: 32px; color: ${shortage > 0 ? '#ef4444' : '#22c55e'};"></i>
              <div style="font-size: 20px; font-weight: bold; margin: 2px 0; color: ${shortage > 0 ? '#ef4444' : '#22c55e'};">
                ${currentFood} / ${totalFoodNeeded}
              </div>
              <div style="font-size: 11px; color: #666;">Available / Required</div>
            </div>
          </div>
          
          ${warning}
        </div>
        
        ${button}
      </div>
    `;
  }
  
  /**
   * Step 3: Military Support
   */
  private renderStep3MilitarySupport(): string {
    const isCompleted = this.kingdomState.isPhaseStepCompleted('resources_military');
    const totalSupport = this.kingdomState.getTotalArmySupport();
    const armyCount = this.kingdomState.armies.length;
    const unsupportedCount = Math.max(0, armyCount - totalSupport);
    
    let statusClass = 'good';
    if (unsupportedCount > 0) {
      statusClass = 'danger';
    } else if (armyCount === totalSupport) {
      statusClass = 'warning';
    }
    
    const unsupportedDisplay = unsupportedCount > 0
      ? html`
        <div class="support-status danger">
          <i class="fas fa-exclamation-triangle" style="font-size: 32px; color: #ef4444;"></i>
          <div>
            <div style="font-size: 18px; font-weight: bold; color: #ef4444;">${unsupportedCount}</div>
            <div style="font-size: 12px; color: #666;">Unsupported</div>
          </div>
        </div>
      `
      : '';
    
    const warning = unsupportedCount > 0 && !isCompleted
      ? html`
        <div class="consumption-warning">
          <i class="fas fa-exclamation-triangle"></i>
          <strong>Warning:</strong> ${unsupportedCount} unsupported ${unsupportedCount === 1 ? 'army' : 'armies'} will require morale checks!
        </div>
      `
      : armyCount === 0
      ? html`
        <div style="margin-top: 10px; color: #666; font-style: italic; text-align: center;">No armies currently fielded</div>
      `
      : '';
    
    const button = isCompleted
      ? html`
        <button class="turn-action-button" disabled style="opacity: 0.5;">
          <i class="fas fa-check"></i> Support Processed
        </button>
      `
      : html`
        <button class="turn-action-button" onclick="window.executeResourceStep3()">
          <i class="fas fa-flag"></i> Process Military Support
        </button>
      `;
    
    return html`
      <div class="phase-step-container" style="position: relative;">
        ${isCompleted ? '<i class="fas fa-check-circle phase-step-complete"></i>' : ''}
        <strong>Step 3: Military Support</strong>
        
        <div class="army-support-display">
          <div class="support-status ${statusClass}">
            <i class="fas fa-shield-alt army-icon"></i>
            <div>
              <div style="font-size: 18px; font-weight: bold;">${armyCount} / ${totalSupport}</div>
              <div style="font-size: 12px; color: #666;">Armies / Capacity</div>
            </div>
          </div>
          
          ${unsupportedDisplay}
        </div>
        
        ${warning}
        
        ${button}
      </div>
    `;
  }
  
  /**
   * Step 4: Build Queue
   */
  private renderStep4BuildQueue(): string {
    const isCompleted = this.kingdomState.isPhaseStepCompleted('resources_build');
    
    let buildQueueContent = '';
    if (this.kingdomState.buildQueue.length > 0) {
      const availableResources = ['lumber', 'stone', 'ore']
        .map(r => `${this.kingdomState.resources.get(r) || 0} ${r.charAt(0).toUpperCase() + r.slice(1)}`)
        .join(', ');
      
      const projects = this.kingdomState.buildQueue
        .map(project => this.renderBuildProject(project, isCompleted))
        .join('');
      
      buildQueueContent = html`
        <div class="build-queue-container">
          <div style="margin-bottom: 15px; font-weight: bold;">
            Available Resources: ${availableResources}
          </div>
          ${projects}
        </div>
      `;
    } else {
      buildQueueContent = html`
        <div style="margin-top: 10px; color: #666; font-style: italic; text-align: center;">No construction projects in queue</div>
      `;
    }
    
    let button = '';
    if (!isCompleted && this.kingdomState.buildQueue.length > 0) {
      button = html`
        <button class="turn-action-button" onclick="window.executeResourceStep4()">
          <i class="fas fa-hammer"></i> Apply to Construction
        </button>
      `;
    } else if (isCompleted) {
      button = html`
        <button class="turn-action-button" disabled style="opacity: 0.5;">
          <i class="fas fa-check"></i> Resources Applied
        </button>
      `;
    }
    
    return html`
      <div class="phase-step-container" style="position: relative;">
        ${isCompleted ? '<i class="fas fa-check-circle phase-step-complete"></i>' : ''}
        <strong>Step 4: Process Build Queue</strong>
        
        ${buildQueueContent}
        
        ${button}
      </div>
    `;
  }
  
  /**
   * Render a build project card
   */
  private renderBuildProject(project: BuildProject, isCompleted: boolean): string {
    const percentage = project.progress;
    const remaining: string[] = [];
    
    project.remainingCost.forEach((amount, resource) => {
      if (amount > 0) {
        remaining.push(`${amount} ${resource}`);
      }
    });
    
    const remainingText = remaining.length > 0 
      ? `Needs: ${remaining.join(', ')}`
      : 'Complete!';
    
    let allocationControls = '';
    if (!isCompleted && remaining.length > 0) {
      const controls: string[] = [];
      project.remainingCost.forEach((_, resource) => {
        const available = this.kingdomState.resources.get(resource) || 0;
        const icon = this.getResourceIcon(resource);
        const color = this.getResourceColor(resource);
        controls.push(html`
          <div class="allocation-control">
            <i class="fas ${icon}" style="color: ${color};"></i>
            <button class="allocation-button" onclick="window.adjustAllocation('${project.structureId}', '${resource}', -1)">−</button>
            <span class="allocation-value">0</span>
            <button class="allocation-button" onclick="window.adjustAllocation('${project.structureId}', '${resource}', 1)">+</button>
          </div>
        `);
      });
      
      allocationControls = html`
        <div class="resource-allocation">
          ${controls.join('')}
        </div>
      `;
    }
    
    return html`
      <div class="build-project-card">
        <div class="build-project-header">
          <span class="build-project-name">${project.settlementName}</span>
          <span class="build-project-tier">Building</span>
        </div>
        
        <div class="progress-bar-container">
          <div class="progress-bar-fill" style="width: ${percentage}%;">
            <span class="progress-bar-text">${percentage}%</span>
          </div>
        </div>
        
        <div style="font-size: 14px; color: #666; margin-top: 5px;">
          ${remainingText}
        </div>
        
        ${allocationControls}
      </div>
    `;
  }
  
  private getResourceIcon(resource: string): string {
    switch (resource) {
      case 'lumber': return 'fa-tree';
      case 'stone': return 'fa-cube';
      case 'ore': return 'fa-mountain';
      default: return 'fa-question';
    }
  }
  
  private getResourceColor(resource: string): string {
    switch (resource) {
      case 'lumber': return '#228B22';
      case 'stone': return '#708090';
      case 'ore': return '#4B0082';
      default: return '#666666';
    }
  }
}
