// Auto-converted and fixed from StructureStyles.kt
// Styles for structure-related UI components

/**
 * Styles for structure-related UI components
 */
export const StructureStyles = {
    getStyles(): string {
        return `
        /* Structure Picker Overlay */
        .structure-picker-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
        }
        
        /* Structure Picker Dialog */
        .structure-picker-dialog {
            background: var(--pf2e-bg-dark);
            border: 2px solid var(--pf2e-border);
            border-radius: 12px;
            width: 90%;
            max-width: 1200px;
            max-height: 90vh;
            display: flex;
            flex-direction: column;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
        }
        
        /* Header */
        .structure-picker-header {
            padding: 1rem 1.5rem;
            border-bottom: 2px solid var(--pf2e-border);
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: linear-gradient(135deg, var(--pf2e-primary), var(--pf2e-accent));
        }
        
        .structure-picker-header h3 {
            margin: 0;
            color: white;
            font-size: 1.5rem;
            text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
        }
        
        .close-button {
            background: rgba(255, 255, 255, 0.2);
            border: 1px solid rgba(255, 255, 255, 0.3);
            border-radius: 6px;
            color: white;
            padding: 0.5rem 0.75rem;
            cursor: pointer;
            transition: all 0.3s ease;
        }
        
        .close-button:hover {
            background: rgba(255, 255, 255, 0.3);
            transform: scale(1.1);
        }
        
        /* Resources Display */
        .structure-picker-resources {
            padding: 1rem 1.5rem;
            background: var(--pf2e-bg-medium);
            border-bottom: 1px solid var(--pf2e-border);
        }
        
        .available-resources {
            display: flex;
            align-items: center;
            gap: 1rem;
            flex-wrap: wrap;
        }
        
        .available-resources > span:first-child {
            color: var(--pf2e-text-light);
            font-weight: 500;
        }
        
        .resource-badge {
            padding: 0.25rem 0.75rem;
            background: var(--pf2e-bg-dark);
            border: 1px solid var(--pf2e-border);
            border-radius: 20px;
            display: flex;
            align-items: center;
            gap: 0.5rem;
            color: var(--pf2e-text);
        }
        
        .resource-badge i {
            color: var(--pf2e-accent);
        }
        
        /* Category Tabs */
        .structure-picker-tabs {
            padding: 0.5rem 1rem;
            background: var(--pf2e-bg-medium);
            border-bottom: 2px solid var(--pf2e-border);
        }
        
        .category-tabs {
            display: flex;
            gap: 0.5rem;
            overflow-x: auto;
            padding-bottom: 0.5rem;
        }
        
        .category-tab {
            min-width: 40px;
            height: 40px;
            border-radius: 8px;
            border: 1px solid var(--pf2e-border);
            background: var(--pf2e-bg-dark);
            color: var(--pf2e-text);
            cursor: pointer;
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .category-tab:hover {
            background: var(--pf2e-bg-light);
            transform: translateY(-2px);
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
        }
        
        .category-tab.active {
            background: var(--pf2e-primary);
            color: white;
            border-color: var(--pf2e-primary);
        }
        
        /* Content Area */
        .structure-picker-content {
            flex: 1;
            overflow-y: auto;
            padding: 1.5rem;
        }
        
        .structure-category-content h4 {
            color: var(--pf2e-accent);
            margin-bottom: 1rem;
            font-size: 1.2rem;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        
        /* Structures Grid */
        .structures-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 1rem;
        }
        
        /* Structure Card */
        .structure-card {
            background: var(--pf2e-bg-medium);
            border: 1px solid var(--pf2e-border);
            border-radius: 8px;
            padding: 1rem;
            transition: all 0.3s ease;
        }
        
        .structure-card:hover:not(.disabled) {
            background: var(--pf2e-bg-light);
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
            transform: translateY(-2px);
        }
        
        .structure-card.disabled {
            opacity: 0.6;
            filter: grayscale(50%);
        }
        
        .structure-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 0.5rem;
        }
        
        .structure-name {
            color: var(--pf2e-primary);
            font-weight: bold;
            font-size: 1.1rem;
        }
        
        .structure-tier {
            background: var(--pf2e-accent);
            color: white;
            padding: 0.25rem 0.5rem;
            border-radius: 4px;
            font-size: 0.8rem;
            font-weight: 500;
        }
        
        .structure-description {
            color: var(--pf2e-text-light);
            font-size: 0.9rem;
            margin-bottom: 0.75rem;
            line-height: 1.4;
        }
        
        /* Structure Cost */
        .structure-cost {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            margin-bottom: 0.75rem;
            flex-wrap: wrap;
        }
        
        .cost-label {
            color: var(--pf2e-text);
            font-weight: 500;
        }
        
        .cost-item {
            padding: 0.2rem 0.5rem;
            border-radius: 4px;
            font-size: 0.85rem;
        }
        
        .cost-item.has-resource {
            background: rgba(76, 175, 80, 0.2);
            border: 1px solid #4CAF50;
            color: #4CAF50;
        }
        
        .cost-item.lacking-resource {
            background: rgba(244, 67, 54, 0.2);
            border: 1px solid #f44336;
            color: #f44336;
        }
        
        /* Structure Effects */
        .structure-effects {
            margin-bottom: 0.75rem;
        }
        
        .effect-item {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            margin-bottom: 0.25rem;
            color: var(--pf2e-text-light);
            font-size: 0.85rem;
        }
        
        .effect-item i {
            color: var(--pf2e-accent);
            font-size: 0.75rem;
        }
        
        /* Structure Upgrade */
        .structure-upgrade {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.5rem;
            background: rgba(33, 150, 243, 0.1);
            border: 1px solid #2196F3;
            border-radius: 4px;
            margin-bottom: 0.75rem;
            color: #2196F3;
            font-size: 0.85rem;
        }
        
        .structure-upgrade i {
            font-size: 0.9rem;
        }
        
        /* Structure Special */
        .structure-special {
            display: flex;
            align-items: flex-start;
            gap: 0.5rem;
            padding: 0.5rem;
            background: rgba(255, 193, 7, 0.1);
            border: 1px solid #FFC107;
            border-radius: 4px;
            margin-bottom: 0.75rem;
            color: #FFC107;
            font-size: 0.85rem;
            line-height: 1.4;
        }
        
        .structure-special i {
            font-size: 0.9rem;
            margin-top: 2px;
        }
        
        /* Build Button */
        .build-button {
            width: 100%;
            padding: 0.75rem;
            background: var(--pf2e-primary);
            color: white;
            border: none;
            border-radius: 6px;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.3s ease;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        
        .build-button:hover:not(:disabled) {
            background: var(--pf2e-primary-dark);
            transform: translateY(-1px);
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
        }
        
        .build-button:disabled {
            background: var(--pf2e-bg-dark);
            color: var(--pf2e-text-light);
            cursor: not-allowed;
            opacity: 0.6;
        }
        
        /* No Structures Message */
        .no-structures-message {
            text-align: center;
            padding: 2rem;
            color: var(--pf2e-text-light);
        }
        
        .no-structures-message p {
            margin: 0 0 0.5rem 0;
            font-size: 1.1rem;
        }
        
        .no-structures-message small {
            font-size: 0.9rem;
            opacity: 0.8;
        }
        
        /* Build Queue Display */
        .build-queue {
            background: var(--pf2e-bg-medium);
            border: 1px solid var(--pf2e-border);
            border-radius: 8px;
            padding: 1rem;
            margin-top: 1rem;
        }
        
        .build-queue-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 0.75rem;
        }
        
        .build-queue-title {
            color: var(--pf2e-primary);
            font-weight: bold;
            font-size: 1.1rem;
        }
        
        .build-queue-item {
            background: var(--pf2e-bg-dark);
            border: 1px solid var(--pf2e-border);
            border-radius: 6px;
            padding: 0.75rem;
            margin-bottom: 0.5rem;
        }
        
        .build-queue-item-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 0.5rem;
        }
        
        .build-queue-item-name {
            color: var(--pf2e-text);
            font-weight: 500;
        }
        
        .build-queue-item-settlement {
            color: var(--pf2e-text-light);
            font-size: 0.85rem;
        }
        
        .build-progress {
            height: 20px;
            background: var(--pf2e-bg-medium);
            border: 1px solid var(--pf2e-border);
            border-radius: 10px;
            overflow: hidden;
            position: relative;
        }
        
        .build-progress-bar {
            height: 100%;
            background: linear-gradient(90deg, var(--pf2e-primary), var(--pf2e-accent));
            transition: width 0.3s ease;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .build-progress-text {
            color: white;
            font-size: 0.75rem;
            font-weight: bold;
            text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
            position: absolute;
            width: 100%;
            text-align: center;
            line-height: 20px;
        }
        
        .build-queue-resources {
            display: flex;
            gap: 0.5rem;
            margin-top: 0.5rem;
            flex-wrap: wrap;
        }
        
        .build-queue-resource {
            padding: 0.2rem 0.5rem;
            background: var(--pf2e-bg-medium);
            border: 1px solid var(--pf2e-border);
            border-radius: 4px;
            font-size: 0.8rem;
            display: flex;
            align-items: center;
            gap: 0.25rem;
        }
        
        .build-queue-resource.completed {
            background: rgba(76, 175, 80, 0.2);
            border-color: #4CAF50;
            color: #4CAF50;
        }
        
        .build-queue-resource.pending {
            background: rgba(255, 193, 7, 0.2);
            border-color: #FFC107;
            color: #FFC107;
        }
        
        .build-queue-resource.needed {
            opacity: 0.6;
        }
        `;
    }
};
