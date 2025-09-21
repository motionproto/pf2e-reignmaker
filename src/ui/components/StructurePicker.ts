// Structure Picker UI component for PF2e Kingdom Lite
// Auto-converted and fixed from StructurePicker.kt

import { html } from '../html-helpers';
import { KingdomState, Settlement } from '../../models/KingdomState';
import { Structure, StructuresData, StructureCategory } from '../../models/Structures';
import { StructureStyles } from '../styles/StructureStyles';

/**
 * Component for displaying a structure picker dialog
 * Allows the player to choose which structure to build in a settlement
 */
export class StructurePicker {
  private settlement: Settlement;
  private kingdomState: KingdomState;
  
  constructor(settlement: Settlement, kingdomState: KingdomState) {
    this.settlement = settlement;
    this.kingdomState = kingdomState;
  }
  
  /**
   * Render the structure picker as a modal dialog
   */
  render(): string {
    const styles = `<style>${StructureStyles.getStyles()}</style>`;
    
    return html`
      <div class="structure-picker-overlay" id="structure-picker-${this.settlement.name}">
        <div class="structure-picker-dialog">
          <div class="structure-picker-header">
            <h3>Build Structure in ${this.settlement.name}</h3>
            <button class="close-button" onclick="window.closeStructurePicker('${this.settlement.name}')">
              <i class="fas fa-times"></i>
            </button>
          </div>
          
          <div class="structure-picker-resources">
            <div class="available-resources">
              <span>Available Resources:</span>
              ${this.renderAvailableResources()}
            </div>
          </div>
          
          <div class="structure-picker-tabs">
            ${this.renderCategoryTabs()}
          </div>
          
          <div class="structure-picker-content">
            ${this.renderStructureCategories()}
          </div>
        </div>
      </div>
      
      ${styles}
      
      <script>
        ${this.getPickerScript()}
      </script>
    `;
  }
  
  private renderAvailableResources(): string {
    const resources = this.kingdomState.resources;
    
    return html`
      <span class="resource-badge">
        <i class="fas fa-tree"></i> ${resources.get('lumber') || 0} Lumber
      </span>
      <span class="resource-badge">
        <i class="fas fa-cube"></i> ${resources.get('stone') || 0} Stone
      </span>
      <span class="resource-badge">
        <i class="fas fa-gem"></i> ${resources.get('ore') || 0} Ore
      </span>
      <span class="resource-badge">
        <i class="fas fa-coins"></i> ${resources.get('gold') || 0} Gold
      </span>
    `;
  }
  
  private renderCategoryTabs(): string {
    const categories: Array<[StructureCategory, string]> = [
      [StructureCategory.CRIME_INTRIGUE, "fas fa-mask"],
      [StructureCategory.CIVIC_GOVERNANCE, "fas fa-landmark"],
      [StructureCategory.MILITARY_TRAINING, "fas fa-dumbbell"],
      [StructureCategory.CRAFTING_TRADE, "fas fa-hammer"],
      [StructureCategory.KNOWLEDGE_MAGIC, "fas fa-book"],
      [StructureCategory.FAITH_NATURE, "fas fa-praying-hands"],
      [StructureCategory.MEDICINE_HEALING, "fas fa-heart"],
      [StructureCategory.PERFORMANCE_CULTURE, "fas fa-theater-masks"],
      [StructureCategory.EXPLORATION_WILDERNESS, "fas fa-compass"],
      [StructureCategory.FOOD_STORAGE, "fas fa-warehouse"],
      [StructureCategory.FORTIFICATIONS, "fas fa-shield-alt"],
      [StructureCategory.LOGISTICS, "fas fa-campground"],
      [StructureCategory.COMMERCE, "fas fa-store"],
      [StructureCategory.CULTURE, "fas fa-palette"],
      [StructureCategory.REVENUE, "fas fa-coins"],
      [StructureCategory.JUSTICE, "fas fa-gavel"],
      [StructureCategory.DIPLOMACY, "fas fa-handshake"]
    ];
    
    const tabs = categories.map(([category, icon], index) => {
      const isActive = index === 0 ? "active" : "";
      const categoryName = this.getCategoryName(category);
      
      return html`
        <button class="category-tab ${isActive}" 
                onclick="window.selectStructureCategory('${category}')"
                data-category="${category}"
                title="${categoryName}">
          <i class="${icon}"></i>
        </button>
      `;
    }).join('');
    
    return html`<div class="category-tabs">${tabs}</div>`;
  }
  
  private renderStructureCategories(): string {
    const allCategories = Object.values(StructureCategory) as StructureCategory[];
    
    return allCategories.map(category => {
      const structures = StructuresData.getStructuresByCategory(category);
      // Create a compatible settlement object for StructuresData
      const settlementForStructures = {
        id: this.settlement.name, // Use name as id
        name: this.settlement.name,
        size: (this.settlement as any).size || (this.settlement as any).level || 1
      };
      const buildableStructures = StructuresData.getBuildableStructures(
        settlementForStructures as any, 
        this.settlement.structureIds || []
      ).filter(s => s.category === category);
      
      const displayStyle = category === StructureCategory.CRIME_INTRIGUE 
        ? "block"  // Show first category by default
        : "none";
      
      return html`
        <div class="structure-category-content" 
             data-category="${category}"
             style="display: ${displayStyle};">
          <h4>${this.getCategoryName(category)}</h4>
          <div class="structures-grid">
            ${this.renderStructuresInCategory(buildableStructures, category)}
          </div>
        </div>
      `;
    }).join('');
  }
  
  private renderStructuresInCategory(
    buildableStructures: Structure[], 
    category: StructureCategory
  ): string {
    if (buildableStructures.length === 0) {
      return html`
        <div class="no-structures-message">
          <p>No ${this.getCategoryName(category)} structures available to build.</p>
          <small>You may need to upgrade existing structures or advance your settlement tier.</small>
        </div>
      `;
    }
    
    return buildableStructures.map(structure => {
      const canAfford = this.canAffordStructure(structure);
      const disabledClass = !canAfford ? "disabled" : "";
      
      return html`
        <div class="structure-card ${disabledClass}" 
             data-structure-id="${structure.id}">
          <div class="structure-header">
            <span class="structure-name">${structure.name}</span>
            <span class="structure-tier">Tier ${structure.tier}</span>
          </div>
          
          <div class="structure-description">
            ${structure.description}
          </div>
          
          <div class="structure-cost">
            <span class="cost-label">Cost:</span>
            ${this.renderStructureCost(structure)}
          </div>
          
          <div class="structure-effects">
            ${this.renderStructureEffects(structure)}
          </div>
          
          ${structure.upgradesFrom ? html`
            <div class="structure-upgrade">
              <i class="fas fa-level-up-alt"></i>
              Upgrades from: ${this.getStructureName(structure.upgradesFrom)}
            </div>
          ` : ''}
          
          ${structure.special ? html`
            <div class="structure-special">
              <i class="fas fa-star"></i>
              ${structure.special}
            </div>
          ` : ''}
          
          <button class="build-button" 
                  onclick="window.buildStructure('${this.settlement.name}', '${structure.id}')"
                  ${!canAfford ? 'disabled' : ''}>
            ${canAfford ? 'Build' : 'Insufficient Resources'}
          </button>
        </div>
      `;
    }).join('');
  }
  
  private renderStructureCost(structure: Structure): string {
    const costItems: string[] = [];
    
    structure.cost.forEach((amount, resource) => {
      const hasResource = (this.kingdomState.resources.get(resource) || 0) >= amount;
      const className = hasResource ? "has-resource" : "lacking-resource";
      
      costItems.push(html`
        <span class="cost-item ${className}">
          ${amount} ${resource.charAt(0).toUpperCase() + resource.slice(1)}
        </span>
      `);
    });
    
    return costItems.join('');
  }
  
  private renderStructureEffects(structure: Structure): string {
    const effects: string[] = [];
    
    if (structure.effects) {
      structure.effects.forEach(effect => {
        effects.push(html`
          <div class="effect-item">
            <i class="fas fa-star"></i> ${effect.description}
          </div>
        `);
      });
    }
    
    if (structure.skillsSupported && structure.skillsSupported.length > 0) {
      const skillNames = structure.skillsSupported
        .map(skill => this.getSkillDisplayName(skill))
        .join(', ');
      
      effects.push(html`
        <div class="effect-item">
          <i class="fas fa-dice-d20"></i> 
          Skills: ${skillNames}
        </div>
      `);
    }
    
    return effects.join('');
  }
  
  private canAffordStructure(structure: Structure): boolean {
    let canAfford = true;
    structure.cost.forEach((amount, resource) => {
      if ((this.kingdomState.resources.get(resource) || 0) < amount) {
        canAfford = false;
      }
    });
    return canAfford;
  }
  
  private getStructureName(structureId: string): string {
    const structure = StructuresData.getStructureById(structureId);
    return structure ? structure.name : structureId;
  }
  
  private getCategoryName(category: StructureCategory): string {
    const categoryNames: Record<StructureCategory, string> = {
      [StructureCategory.CRIME_INTRIGUE]: "Crime & Intrigue",
      [StructureCategory.CIVIC_GOVERNANCE]: "Civic & Governance",
      [StructureCategory.MILITARY_TRAINING]: "Military & Training",
      [StructureCategory.CRAFTING_TRADE]: "Crafting & Trade",
      [StructureCategory.KNOWLEDGE_MAGIC]: "Knowledge & Magic",
      [StructureCategory.FAITH_NATURE]: "Faith & Nature",
      [StructureCategory.MEDICINE_HEALING]: "Medicine & Healing",
      [StructureCategory.PERFORMANCE_CULTURE]: "Performance & Culture",
      [StructureCategory.EXPLORATION_WILDERNESS]: "Exploration & Wilderness",
      [StructureCategory.FOOD_STORAGE]: "Food & Storage",
      [StructureCategory.FORTIFICATIONS]: "Fortifications",
      [StructureCategory.LOGISTICS]: "Logistics",
      [StructureCategory.COMMERCE]: "Commerce",
      [StructureCategory.CULTURE]: "Culture",
      [StructureCategory.REVENUE]: "Revenue",
      [StructureCategory.JUSTICE]: "Justice",
      [StructureCategory.DIPLOMACY]: "Diplomacy"
    };
    
    return categoryNames[category] || category;
  }
  
  private getSkillDisplayName(skill: string): string {
    // Convert skill codes to display names
    const skillMap: Record<string, string> = {
      'intimidation': 'Intimidation',
      'diplomacy': 'Diplomacy',
      'society': 'Society',
      'crafting': 'Crafting',
      'stealth': 'Stealth',
      'medicine': 'Medicine',
      'performance': 'Performance',
      'nature': 'Nature',
      'religion': 'Religion',
      'arcana': 'Arcana',
      'occultism': 'Occultism',
      'athletics': 'Athletics',
      'survival': 'Survival',
      'thievery': 'Thievery',
      'deception': 'Deception'
    };
    
    return skillMap[skill] || skill;
  }
  
  private getPickerScript(): string {
    return `
      window.closeStructurePicker = function(settlementName) {
        const picker = document.getElementById('structure-picker-' + settlementName);
        if (picker) {
          picker.style.display = 'none';
        }
      };
      
      window.selectStructureCategory = function(categoryName) {
        // Update tab active states
        document.querySelectorAll('.category-tab').forEach(tab => {
          if (tab.dataset.category === categoryName) {
            tab.classList.add('active');
          } else {
            tab.classList.remove('active');
          }
        });
        
        // Show/hide category content
        document.querySelectorAll('.structure-category-content').forEach(content => {
          if (content.dataset.category === categoryName) {
            content.style.display = 'block';
          } else {
            content.style.display = 'none';
          }
        });
      };
      
      window.buildStructure = function(settlementName, structureId) {
        console.log('Building structure:', structureId, 'in', settlementName);
        
        // TODO: Connect to actual game logic to add to build queue
        // For now, show confirmation
        const structure = document.querySelector('[data-structure-id="' + structureId + '"] .structure-name');
        if (structure) {
          alert('Adding ' + structure.textContent + ' to build queue in ' + settlementName);
          closeStructurePicker(settlementName);
        }
      };
    `;
  }
}
