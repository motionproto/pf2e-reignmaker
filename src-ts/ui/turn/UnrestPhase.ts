// Unrest Phase UI component for PF2e Kingdom Lite
// Auto-converted and fixed from UnrestPhase.kt

import { html } from '../html-helpers';
import { KingdomState } from '../../models/KingdomState';
import { TurnManager } from '../../models/TurnManager';
import { UnrestStyles } from '../styles/UnrestStyles';
import { IncidentManager, Incident, IncidentLevel } from '../../models/Incidents';

/**
 * Unrest Phase content for the Kingdom Sheet
 * Handles applying unrest and checking for incidents
 */
export class UnrestPhase {
  private kingdomState: KingdomState;
  private turnManager: TurnManager;
  private currentIncident: Incident | null = null;
  private lastRoll: number = 0;
  
  constructor(kingdomState: KingdomState, turnManager: TurnManager) {
    this.kingdomState = kingdomState;
    this.turnManager = turnManager;
  }
  
  render(): string {
    const currentUnrest = this.kingdomState.unrest || 0;
    const tier = IncidentManager.getUnrestTier(currentUnrest);
    const tierName = IncidentManager.getUnrestTierName(tier);
    const penalty = IncidentManager.getUnrestPenalty(currentUnrest);
    const incidentLevel = IncidentManager.getIncidentLevel(tier);
    
    // Include unrest styles
    const styles = `<style>${UnrestStyles.getStyles()}</style>`;
    
    // Set up handlers
    (window as any).rollForIncident = () => {
      this.rollForIncident();
    };
    
    (window as any).resolveIncident = (skill: string) => {
      this.resolveIncident(skill);
    };
    
    return html`
      ${styles}
      <!-- Step 1: Unrest Dashboard -->
      <div class="unrest-dashboard">
        <div class="unrest-header">
          <div class="unrest-title">
            <i class="fas fa-fire unrest-icon"></i>
            <span>Unrest Status</span>
          </div>
        </div>
        
        <div class="unrest-value-display">
          <div class="unrest-current">${currentUnrest}</div>
          <div class="unrest-tier-badge tier-${tierName.toLowerCase()}">
            ${tierName}
          </div>
        </div>
        
        ${penalty !== 0 ? html`
          <div class="unrest-penalty">
            <i class="fas fa-exclamation-triangle penalty-icon"></i>
            <span class="penalty-text">Kingdom Check Penalty:</span>
            <span class="penalty-value">${penalty}</span>
          </div>
        ` : ''}
      </div>
      
      <!-- Step 2: Incident Section -->
      ${tier > 0 && incidentLevel ? html`
        <div class="incident-section">
          <div class="incident-header">
            <div class="incident-title">
              Step 2: Check for ${this.capitalizeFirst(incidentLevel.toString().toLowerCase())} Incidents
            </div>
            <button class="roll-incident-btn" onclick="window.rollForIncident()">
              <i class="fas fa-dice-d20"></i> Roll for Incident
            </button>
          </div>
          
          <div id="incident-result-container"></div>
        </div>
      ` : html`
        <div class="no-incident">
          <i class="fas fa-dove no-incident-icon"></i>
          <div class="no-incident-text">Kingdom is Stable</div>
          <div class="no-incident-desc">No incidents occur when unrest is at this level</div>
        </div>
      `}
    `;
  }
  
  private rollForIncident(): void {
    const currentUnrest = this.kingdomState.unrest || 0;
    const tier = IncidentManager.getUnrestTier(currentUnrest);
    
    if (tier === 0) return;
    
    // Roll for incident
    this.lastRoll = Math.floor(Math.random() * 100) + 1;
    this.currentIncident = IncidentManager.rollForIncident(tier);
    
    // Display result
    const container = document.getElementById("incident-result-container");
    if (container) {
      container.innerHTML = this.renderIncidentResult();
    }
  }
  
  private renderIncidentResult(): string {
    if (this.currentIncident) {
      const incident = this.currentIncident;
      return html`
        <div class="incident-display">
          <div class="roll-result">
            <div class="roll-value rolling">${this.lastRoll}</div>
            <div class="roll-label">d100 Roll</div>
          </div>
          
          ${incident.imagePath ? html`
            <div class="incident-image-container">
              <img src="${incident.imagePath}" alt="${incident.name}" class="incident-image">
              <div class="incident-level-overlay level-${incident.level.toString().toLowerCase()}">
                ${incident.level.toString()}
              </div>
            </div>
          ` : ''}
          
          <div class="incident-info">
            <div class="incident-name">${incident.name}</div>
            <div class="incident-description">${incident.description}</div>
          </div>
          
          <div class="skill-options">
            <div class="skill-options-title">Choose Resolution Approach:</div>
            <div class="skill-option-grid">
              ${incident.skillOptions.map(option => html`
                <button class="skill-option-btn" 
                        onclick="window.resolveIncident('${option.skill}')">
                  <div class="skill-name">${option.skill}</div>
                  <div class="skill-description">${option.description}</div>
                </button>
              `).join('')}
            </div>
          </div>
          
          <div class="incident-effects">
            <div class="effect-row">
              <span class="effect-label">Success:</span>
              <span class="effect-text effect-success">${incident.successEffect}</span>
            </div>
            <div class="effect-row">
              <span class="effect-label">Failure:</span>
              <span class="effect-text effect-failure">${incident.failureEffect}</span>
            </div>
            <div class="effect-row">
              <span class="effect-label">Critical Failure:</span>
              <span class="effect-text effect-failure">${incident.criticalFailureEffect}</span>
            </div>
          </div>
        </div>
      `;
    } else {
      return html`
        <div class="no-incident">
          <div class="roll-result">
            <div class="roll-value">${this.lastRoll}</div>
            <div class="roll-label">d100 Roll</div>
          </div>
          <i class="fas fa-shield-alt no-incident-icon"></i>
          <div class="no-incident-text">No Incident!</div>
          <div class="no-incident-desc">The kingdom avoids crisis this turn</div>
        </div>
      `;
    }
  }
  
  private resolveIncident(skill: string): void {
    const incident = this.currentIncident;
    if (!incident) return;
    
    // Here we would normally trigger the skill check resolution
    // For now, we'll just display a message
    const container = document.getElementById("incident-result-container");
    if (container) {
      container.innerHTML = html`
        <div class="incident-display">
          <div class="incident-info">
            <div class="incident-name">Resolving: ${incident.name}</div>
            <div class="incident-description">Using ${skill} to resolve the incident...</div>
          </div>
          <div class="skill-options">
            <div class="skill-options-title">Ready to make a ${skill} check</div>
            <div style="text-align: center; margin-top: 20px;">
              <button class="roll-incident-btn" 
                      onclick="alert('Skill check system will be implemented next!')">
                <i class="fas fa-dice-d20"></i> Roll ${skill} Check
              </button>
            </div>
          </div>
        </div>
      `;
    }
  }
  
  private capitalizeFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}
