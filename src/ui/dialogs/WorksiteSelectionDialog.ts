/**
 * WorksiteSelectionDialog - Promise-based dialog for selecting worksite types
 * 
 * Used for auto-resolution of demand-expansion events when target hex is claimed.
 * Shows valid worksite types for the hex and allows user to pick one (or skip).
 */

import { getValidWorksiteTypes, WORKSITE_TYPES, type WorksiteType } from '../../pipelines/shared/worksiteValidator';
import { getKingdomData } from '../../stores/KingdomStore';
import { logger } from '../../utils/Logger';

interface WorksiteSelectionOptions {
  hexId: string;
  title: string;
  description: string;
}

/**
 * Get hex terrain for display
 */
function getHexTerrain(hexId: string): string | null {
  const kingdom = getKingdomData();
  const hex = kingdom.hexes?.find((h: any) => h.id === hexId);
  return hex?.terrain || null;
}

/**
 * Get icon for worksite type
 */
function getTypeIcon(type: WorksiteType): string {
  switch (type) {
    case 'Farmstead': return 'fa-wheat-awn';
    case 'Logging Camp': return 'fa-tree';
    case 'Mine': return 'fa-mountain';
    case 'Quarry': return 'fa-cube';
    default: return 'fa-industry';
  }
}

/**
 * Calculate revenue for a worksite type based on terrain
 */
function getWorksiteRevenue(type: WorksiteType, terrain: string | null): string {
  if (!terrain) return '';
  
  const normalizedTerrain = terrain.toLowerCase();
  
  switch (type) {
    case 'Farmstead':
      return normalizedTerrain === 'plains' ? '+2 Food' : '+1 Food';
    case 'Logging Camp':
      return normalizedTerrain === 'forest' ? '+2 Lumber' : '';
    case 'Quarry':
      return (normalizedTerrain === 'hills' || normalizedTerrain === 'mountains') ? '+1 Stone' : '';
    case 'Mine':
      return (normalizedTerrain === 'mountains' || normalizedTerrain === 'swamp') ? '+1 Ore' : '';
    default:
      return '';
  }
}

export const WorksiteSelectionDialog = {
  /**
   * Show worksite selection dialog
   * 
   * @param options - Dialog options
   * @returns Selected worksite type or null if cancelled/skipped
   */
  async show(options: WorksiteSelectionOptions): Promise<WorksiteType | null> {
    const { hexId, title, description } = options;
    
    const validTypes = getValidWorksiteTypes(hexId);
    const terrain = getHexTerrain(hexId);
    
    if (validTypes.length === 0) {
      logger.warn(`[WorksiteSelectionDialog] No valid worksite types for hex ${hexId}`);
      const ui = (globalThis as any).ui;
      ui?.notifications?.warn('No valid worksite types available for this hex terrain.');
      return null;
    }
    
    return new Promise<WorksiteType | null>((resolve) => {
      const Dialog = (globalThis as any).Dialog;
      
      // Build worksite options HTML
      const optionsHtml = validTypes.map(type => {
        const icon = getTypeIcon(type);
        const revenue = getWorksiteRevenue(type, terrain);
        return `
          <div class="worksite-option" data-type="${type}" style="
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px 16px;
            margin-bottom: 8px;
            background: var(--surface-low, rgba(0,0,0,0.2));
            border: 2px solid transparent;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.2s ease;
          ">
            <i class="fas ${icon}" style="font-size: 24px; color: #D2691E; width: 32px; text-align: center;"></i>
            <div style="flex: 1;">
              <div style="font-weight: 600; font-size: 16px; color: #fff;">${type}</div>
              ${revenue ? `<div style="font-size: 13px; color: #999; margin-top: 2px;">${revenue}</div>` : ''}
            </div>
          </div>
        `;
      }).join('');
      
      const content = `
        <div style="padding: 12px 0;">
          <p style="margin: 0 0 16px 0; color: #ccc;">${description}</p>
          <div style="
            background: rgba(210, 105, 30, 0.1);
            border: 1px solid rgba(210, 105, 30, 0.3);
            border-radius: 6px;
            padding: 12px;
            margin-bottom: 16px;
          ">
            <div style="font-size: 13px; color: #999; margin-bottom: 4px;">Target Hex</div>
            <div style="font-family: monospace; font-size: 18px; color: #D2691E;">
              ${hexId} <span style="font-size: 14px; color: #999;">${terrain ? `[${terrain}]` : ''}</span>
            </div>
          </div>
          <div id="worksite-options-container">
            ${optionsHtml}
          </div>
        </div>
      `;
      
      const dialog = new Dialog({
        title,
        content,
        buttons: {
          skip: {
            icon: '<i class="fas fa-forward"></i>',
            label: 'Skip Worksite',
            callback: () => resolve(null)
          }
        },
        default: 'skip',
        close: () => resolve(null),
        render: (html: any) => {
          // Add click handlers to options
          const container = html.find('#worksite-options-container')[0];
          if (container) {
            const options = container.querySelectorAll('.worksite-option');
            options.forEach((option: HTMLElement) => {
              option.addEventListener('mouseenter', () => {
                option.style.borderColor = '#D2691E';
                option.style.background = 'rgba(210, 105, 30, 0.15)';
              });
              option.addEventListener('mouseleave', () => {
                option.style.borderColor = 'transparent';
                option.style.background = 'var(--surface-low, rgba(0,0,0,0.2))';
              });
              option.addEventListener('click', () => {
                const type = option.dataset.type as WorksiteType;
                dialog.close();
                resolve(type);
              });
            });
          }
        }
      }, { width: 400 });
      
      dialog.render(true);
    });
  }
};


