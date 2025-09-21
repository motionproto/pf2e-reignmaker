// Auto-converted and fixed from ResourceStyles.kt
// CSS styles for the Resources Phase dashboard

/**
 * CSS styles for the Resources Phase dashboard
 */
export const ResourceStyles = {
    getStyles(): string {
        return `
        /* Main container for resources phase - Simple stacked flexbox */
        .resources-phase-container {
            display: flex;
            flex-direction: column;
            height: 100%;
            max-height: 100%;
            overflow: hidden; /* Prevent parent from scrolling */
            position: relative;
        }
        
        /* Resource Dashboard - Fixed height at top */
        .resource-dashboard-wrapper {
            flex: 0 0 auto; /* Don't grow or shrink */
            background: #f9f9f9;
            border-bottom: 2px solid #e0e0e0;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            position: relative;
            z-index: 10;
        }
        
        .resource-dashboard {
            display: flex;
            gap: 10px;
            justify-content: center;
            padding: 12px 20px;
            background: #f9f9f9;
        }
        
        /* Scrollable area for resource steps */
        .resource-steps-scroll {
            flex: 1 1 auto;
            overflow-y: auto; /* Auto scrollbar when needed */
            overflow-x: hidden;
            padding: 20px;
            background: #fafafa;
            min-height: 0; /* Important for flexbox overflow to work */
            position: relative;
        }
        
        /* Custom scrollbar styling */
        .resource-steps-scroll::-webkit-scrollbar {
            width: 8px;
        }
        
        .resource-steps-scroll::-webkit-scrollbar-track {
            background: #f1f1f1;
            border-radius: 4px;
        }
        
        .resource-steps-scroll::-webkit-scrollbar-thumb {
            background: #888;
            border-radius: 4px;
        }
        
        .resource-steps-scroll::-webkit-scrollbar-thumb:hover {
            background: #555;
        }
        
        .resource-card {
            text-align: center;
            padding: 10px 12px;
            background: white;
            border-radius: 6px;
            min-width: 85px;
            transition: transform 0.2s, box-shadow 0.2s;
            border: 1px solid #e0e0e0;
        }
        
        .resource-card:hover {
            transform: translateY(-1px);
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        
        .resource-icon {
            font-size: 24px;
            display: block;
            margin-bottom: 5px;
        }
        
        .resource-value {
            font-size: 24px;
            font-weight: bold;
            margin: 5px 0 3px 0;
        }
        
        .resource-label {
            font-size: 12px;
            color: #666;
            text-transform: uppercase;
            letter-spacing: 1px;
            font-weight: 600;
        }
        
        /* Resource changes */
        .resource-change {
            font-size: 14px;
            margin-top: 5px;
            font-weight: 600;
        }
        
        .resource-change.positive {
            color: #22c55e;
        }
        
        .resource-change.negative {
            color: #ef4444;
        }
        
        /* Shortage warnings */
        .resource-card.shortage {
            background: #fee2e2;
            border: 2px solid #ef4444;
        }
        
        .resource-card.shortage .resource-value {
            color: #dc2626;
        }
        
        /* Build Queue Styles */
        .build-queue-container {
            padding: 20px;
            background: #f9f9f9;
            border-radius: 8px;
            margin: 15px 0;
        }
        
        .build-project-card {
            background: white;
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 15px;
            border: 1px solid #e0e0e0;
        }
        
        .build-project-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
        }
        
        .build-project-name {
            font-weight: bold;
            font-size: 16px;
        }
        
        .build-project-tier {
            background: #6366f1;
            color: white;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 12px;
        }
        
        .progress-bar-container {
            background: #e5e7eb;
            border-radius: 4px;
            height: 24px;
            margin: 10px 0;
            overflow: hidden;
            position: relative;
        }
        
        .progress-bar-fill {
            background: linear-gradient(90deg, #3b82f6, #6366f1);
            height: 100%;
            transition: width 0.3s ease;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .progress-bar-text {
            position: absolute;
            width: 100%;
            text-align: center;
            line-height: 24px;
            font-size: 12px;
            font-weight: 600;
            color: #374151;
            mix-blend-mode: difference;
        }
        
        .resource-allocation {
            display: flex;
            gap: 15px;
            margin-top: 10px;
            flex-wrap: wrap;
        }
        
        .allocation-control {
            display: flex;
            align-items: center;
            gap: 8px;
            background: #f3f4f6;
            padding: 5px 10px;
            border-radius: 6px;
        }
        
        .allocation-button {
            width: 24px;
            height: 24px;
            border-radius: 50%;
            border: none;
            background: #6366f1;
            color: white;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            transition: background 0.2s;
        }
        
        .allocation-button:hover:not(:disabled) {
            background: #4f46e5;
        }
        
        .allocation-button:disabled {
            background: #d1d5db;
            cursor: not-allowed;
        }
        
        .allocation-value {
            min-width: 20px;
            text-align: center;
            font-weight: 600;
        }
        
        /* Phase step indicators */
        .phase-step-complete {
            position: absolute;
            top: 10px;
            right: 10px;
            color: #22c55e;
            font-size: 24px;
        }
        
        .production-summary {
            background: #fef3c7;
            border: 1px solid #fcd34d;
            border-radius: 6px;
            padding: 10px 15px;
            margin-bottom: 15px;
        }
        
        .production-summary-title {
            font-weight: bold;
            color: #92400e;
            margin-bottom: 8px;
        }
        
        .worksite-list {
            list-style: none;
            padding: 0;
            margin: 10px 0;
        }
        
        .worksite-item {
            display: flex;
            justify-content: space-between;
            padding: 5px 0;
            border-bottom: 1px solid #e5e7eb;
        }
        
        .worksite-item:last-child {
            border-bottom: none;
        }
        
        .consumption-warning {
            background: #fee2e2;
            border: 1px solid #ef4444;
            border-radius: 6px;
            padding: 10px 15px;
            margin: 10px 0;
            color: #991b1b;
        }
        
        .consumption-warning i {
            margin-right: 8px;
        }
        
        /* Army support display */
        .army-support-display {
            display: flex;
            gap: 20px;
            justify-content: center;
            margin: 15px 0;
        }
        
        .support-status {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 10px 20px;
            background: white;
            border-radius: 8px;
            border: 1px solid #e5e7eb;
        }
        
        .support-status.good {
            border-color: #22c55e;
            background: #f0fdf4;
        }
        
        .support-status.warning {
            border-color: #f59e0b;
            background: #fef3c7;
        }
        
        .support-status.danger {
            border-color: #ef4444;
            background: #fee2e2;
        }
        
        .army-icon {
            font-size: 32px;
            color: #4682B4;
        }
        `;
    }
};
