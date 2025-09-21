// Auto-converted from KingdomStatsStyles.kt
// TODO: Review and fix TypeScript-specific issues


/**
 * Styles for the Kingdom Stats sidebar component
 */
export const KingdomStatsStyles = {
    getStyles(): string {
        return `
        /* Sidebar */
        .kingdom-sidebar {
            width: 320px;
            background: #2c2c2c;
            border-right: 1px solid #b8860b;
            padding: 0;
            overflow: hidden;
            color: var(--stat-text-color);
            display: flex;
            flex-direction: column;
        }
        
        /* Kingdom Stats Container */
        .kingdom-stats-container {
            flex: 1;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            min-height: 0;
        }
        
        /* Kingdom Name Header - matches phase buttons height */
        .kingdom-name-header {
            flex-shrink: 0;
            background: #3a3a3a;
            padding: 8px;
            border-bottom: 1px solid #252424;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
            height: 48px;
            box-sizing: border-box;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .kingdom-name-header h3 {
            color: var(--stat-text-color);
            margin: 0;
            font-size: 16px;
            text-transform: uppercase;
            letter-spacing: 1px;
            font-weight: bold;
        }
        
        /* Kingdom Stats Scrollable Content */
        .kingdom-stats-scrollable {
            flex: 1;
            overflow-y: auto;
            min-height: 0;
        }
        
        .kingdom-stats-content {
            padding: 15px;
        }
        
        .kingdom-stats h4 {
            color: var(--stat-text-color);
            font-size: 14px;
            margin: 0;
            padding: 8px 10px;
            background: rgba(255, 255, 255, 0.03);
            letter-spacing: 0.5px;
            border-radius: 4px 4px 0 0;
        }
        
        /* Stat group header with light background */
        .stat-group-header {
            background-color: #3c3c3cff;
            padding: 8px 12px;
            margin: 0 0 10px 0;
            border-radius: 4px 4px 0 0;
            color: #dadadaff;
            font-weight: bold;
            letter-spacing: 0.5px;
            font-size: 16px;
        }
        
        .stat-group {
            margin-bottom: 20px;
            padding: 0;
            background: rgba(0, 0, 0, 0.3);
            border-radius: 4px;
            border: 1px solid rgba(204, 204, 204, 0.3);
            overflow: hidden;
        }
        
        .stat-group > div:not(.resource-section, (
            padding: 10px;
        ))
        
        .stat-group .resource-section {
            padding: 0 10px 10px 10px;
        }
        
        .stat-item {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
            padding: 4px 0;
            border-bottom: 1px solid rgba(184, 134, 11, 0.1);
        }
        
        .stat-item:last-child {
            border-bottom: none;
            margin-bottom: 0;
        }
        
        .stat-item label {
            color: #9ca3af;
            font-weight: 500;
        }
        
        .stat-value {
            color: var(--stat-text-color);
            font-weight: bold;
        }
        
        /* Resource Sections */
        .resource-section {
            margin-bottom: 15px;
        }
        
        .resource-header {
            color: var(--stat-text-color);
            font-weight: bold;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 8px;
            padding-bottom: 4px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .resource-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 8px;
            margin-top: 8px;
        }
        
        .resource-item {
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 3px;
            padding: 6px;
            text-align: center;
        }
        
        .resource-item label {
            display: block;
            font-size: 10px;
            color: #9ca3af;
            text-transform: uppercase;
            margin-bottom: 2px;
        }
        
        .resource-item span {
            display: block;
            font-size: 14px;
            font-weight: bold;
            color: var(--stat-text-color);
        }
        
        /* Ability Scores (if used) */
        .ability-scores {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 10px;
            text-align: center;
        }
        
        .ability {
            background: rgba(184, 134, 11, 0.1);
            border: 1px solid rgba(184, 134, 11, 0.3);
            border-radius: 4px;
            padding: 8px;
        }
        
        .ability label {
            display: block;
            font-size: 11px;
            color: #a89968;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 4px;
        }
        
        .ability-value {
            font-size: 18px;
            font-weight: bold;
            color: var(--stat-text-color);
        }
        
        /* Fame Boxes */
        .fame-boxes {
            display: inline-flex;
            gap: 5px;
        }
        
        .fame-boxes i {
            color: #b8860b;
            font-size: 14px;
        }
        
        .fame-boxes i.fa-check-square {
            color: var(--stat-text-color);
        }
    `;
    }
}
