// Kingdom Stats styles for the sidebar component

export class KingdomStatsStyles {
  static getStyles(): string {
    return `
      /* Kingdom Stats Container */
      .kingdom-stats-container {
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        background-color: #f5f5f5;
        border-radius: 4px;
        overflow: hidden;
      }
      
      /* Kingdom Name Header */
      .kingdom-name-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 16px;
        background-color: #2c3e50;
        border-bottom: 2px solid #34495e;
        min-height: 60px;
      }
      
      .kingdom-name-header h3 {
        margin: 0;
        color: #ecf0f1;
        font-size: 20px;
        font-weight: 600;
        flex: 1;
        font-family: 'Modesto Condensed', 'Eczar', serif;
      }
      
      .kingdom-name-header input {
        flex: 1;
        font-size: 20px;
        font-weight: 600;
        background-color: transparent;
        border: 1px solid #ecf0f1;
        color: #ecf0f1;
        padding: 4px 8px;
        border-radius: 4px;
        outline: none;
        font-family: 'Modesto Condensed', 'Eczar', serif;
      }
      
      #kingdom-edit-btn {
        cursor: pointer;
        padding: 6px 8px;
        border-radius: 4px;
        display: flex;
        align-items: center;
        transition: background-color 0.2s;
        color: #ecf0f1;
        font-size: 14px;
      }
      
      #kingdom-edit-btn:hover {
        background-color: rgba(255, 255, 255, 0.1);
      }
      
      /* Scrollable Content Area */
      .kingdom-stats-scrollable {
        flex: 1;
        overflow-y: auto;
        padding: 16px;
      }
      
      .kingdom-stats-content {
        display: flex;
        flex-direction: column;
        gap: 20px;
      }
      
      /* Stat Groups */
      .stat-group {
        background: white;
        border-radius: 8px;
        padding: 16px;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      }
      
      .stat-group-header {
        margin: 0 0 16px 0;
        padding-bottom: 8px;
        border-bottom: 2px solid #3498db;
        color: #2c3e50;
        font-size: 16px;
        font-weight: 600;
        font-family: 'Modesto Condensed', serif;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      
      /* Ability Scores Grid */
      .ability-scores-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 12px;
      }
      
      .ability-score-container {
        background: #f8f9fa;
        border-radius: 6px;
        padding: 12px;
        border: 1px solid #e9ecef;
        transition: transform 0.2s, box-shadow 0.2s;
      }
      
      .ability-score-container:hover {
        transform: translateY(-2px);
        box-shadow: 0 3px 8px rgba(0, 0, 0, 0.15);
      }
      
      .ability-score-label {
        font-size: 13px;
        font-weight: 600;
        color: #6c757d;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin-bottom: 8px;
      }
      
      .ability-score-value-box {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      
      .ability-score-value {
        font-size: 28px;
        font-weight: bold;
        color: #2c3e50;
        min-width: 40px;
      }
      
      .ability-score-modifier {
        font-size: 18px;
        font-weight: 600;
        padding: 4px 8px;
        border-radius: 4px;
        background: #e9ecef;
        min-width: 35px;
        text-align: center;
      }
      
      .ability-score-modifier.positive {
        color: #27ae60;
        background: #d4edda;
      }
      
      .ability-score-modifier.negative {
        color: #e74c3c;
        background: #f8d7da;
      }
      
      /* Stat Items */
      .stat-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 0;
        border-bottom: 1px solid #f0f0f0;
      }
      
      .stat-item:last-child {
        border-bottom: none;
      }
      
      .stat-item label {
        font-size: 14px;
        color: #6c757d;
        font-weight: 500;
      }
      
      .stat-value {
        font-size: 16px;
        font-weight: 600;
        color: #2c3e50;
      }
      
      /* Resource Grid */
      .resource-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 8px;
        margin-top: 12px;
        padding-top: 12px;
        border-top: 1px solid #f0f0f0;
      }
      
      .resource-item {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 8px;
        background: #f8f9fa;
        border-radius: 4px;
      }
      
      .resource-item label {
        font-size: 12px;
        color: #6c757d;
        margin-bottom: 4px;
      }
      
      .resource-item span {
        font-size: 16px;
        font-weight: 600;
        color: #2c3e50;
      }
      
      /* War Status */
      .at-war {
        color: #e74c3c !important;
        font-weight: bold;
      }
      
      /* Custom Scrollbar */
      .kingdom-stats-scrollable::-webkit-scrollbar {
        width: 8px;
      }
      
      .kingdom-stats-scrollable::-webkit-scrollbar-track {
        background: #f1f1f1;
      }
      
      .kingdom-stats-scrollable::-webkit-scrollbar-thumb {
        background: #888;
        border-radius: 4px;
      }
      
      .kingdom-stats-scrollable::-webkit-scrollbar-thumb:hover {
        background: #555;
      }
      
      /* Responsive adjustments */
      @media (max-width: 400px) {
        .ability-scores-grid {
          grid-template-columns: 1fr;
        }
        
        .resource-grid {
          grid-template-columns: 1fr;
        }
      }
    `;
  }
}
