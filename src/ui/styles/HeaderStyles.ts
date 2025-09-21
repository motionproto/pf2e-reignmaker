// Auto-converted from HeaderStyles.kt
// TODO: Review and fix TypeScript-specific issues


/**
 * Styles for the Kingdom Sheet header and content selector
 */
export const HeaderStyles = {
    getStyles(): string {
        return `
        /* Header with Content Selector */
        .kingdom-header {
            background: linear-gradient(to bottom, #5e0000, #3a0000);
            border-bottom: 2px solid #b8860b;
            box-shadow: 0 2px 5px rgba(0,0,0,0.3);
            min-height: 40px;
            overflow: visible;
        }
        
        .content-selector {
            display: flex;
            flex-direction: row;
            flex-wrap: nowrap;
            margin: 0;
            width: 100%;
            overflow: visible;
            align-items: stretch;
            justify-content: flex-start;
            background: #3a3a3a;
        }
        
        .content-button {
            flex: 0 1 auto;
            display: block;
            padding: 10px 20px;
            background: linear-gradient(to bottom, #5a5958ff, #252424ff);
            border: 1px solid #757575ff;
            color: #b3b3b3ff;
            font-size: 20px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s;
            letter-spacing: 0.5px;
            white-space: nowrap;
            height: 40px;
            line-height: 20px;
            min-width: auto;
        }
        
        .content-button:hover {
            background: linear-gradient(to bottom, #666564ff, #3a3a3aff);
            color: #e2e2e2ff;
            transform: translateY(-0.5px);
            box-shadow: 0 1px 3px rgba(0,0,0,0.3);
            border-color: #9d9c9aff;
        }
        
        .content-button.active {
            background: linear-gradient(to bottom, #8b0000, #5e0000);
            color: #fecb21ff;
            font-weight: bold;
            box-shadow: inset 0 1px 3px rgba(0,0,0,0.3);
            border-color: #8b0000;
        }
        
        /* Gear button positioning and styling */
        .content-button.gear-button {
            margin-left: auto;
            padding-left: 20px;
            padding-right: 20px;
            font-size: 18px;
            min-width: auto;
            width: auto;
            max-width: 100px;
        }
        
        .content-button.gear-button i {
            display: inline-block;
            transition: transform 0.3s ease;
        }
        
        .content-button.gear-button:hover i {
            transform: rotate(90deg);
        }
        
        .content-button.gear-button.active {
            color: #fecb21ff;
        }
        
        .content-button.gear-button.active i {
            transform: rotate(180deg);
        }
    `;
    }
}
