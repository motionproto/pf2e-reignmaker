// Auto-converted from BaseStyles.kt
// TODO: Review and fix TypeScript-specific issues


/**
 * Base styles for the Kingdom Sheet application
 * Contains root styles, CSS variables, and core application styling
 */
export const BaseStyles = {
    getStyles(): string {
        return `
        /* CSS Variables for consistent colors */
        :root {
            --stat-text-color: #d4d4d8;
        }
        
        /* Application Window Styling */
        .app.kingdom-sheet {
            box-shadow: 0 0 20px rgba(0,0,0,0.8);
            border: 1px solid #000;
            border-radius: 5px;
            background: white;
        }
        
        .kingdom-sheet {
            font-family: 'Signika', 'Palatino Linotype', serif;
            color: #191813;
            background: white;
            height: 100%;
            display: flex;
            flex-direction: column;
        }
        
        .kingdom-sheet .window-header {
            background: linear-gradient(to bottom, #5e0000, #3a0000);
            border-bottom: 1px solid #b8860b;
            border-radius: 5px 5px 0 0;
            padding: 8px 12px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-shrink: 0;
        }
        
        .kingdom-sheet .window-title {
            color: #ffffff;
            margin: 0;
            font-size: 14px;
            font-weight: bold;
            text-shadow: 1px 1px 2px rgba(0,0,0,0.5);
        }
        
        .kingdom-sheet .close {
            color: #e7e7e7ff;
            text-decoration: none;
            font-size: 18px;
            line-height: 1;
            padding: 2px 6px;
            margin-left: auto;
            cursor: pointer;
            transition: color 0.2s;
        }
        
        .kingdom-sheet .close:hover {
            color: #ffffff;
        }
        
        .kingdom-sheet .window-content {
            padding: 0;
            background: white;
            overflow: hidden;
            flex: 1;
            display: flex;
            flex-direction: column;
        }
        
        /* Main Container */
        .kingdom-container {
            display: flex;
            flex-direction: column;
            height: 100%;
            background: white;
        }
        
        /* Body Layout */
        .kingdom-body {
            display: flex;
            flex: 1;
            overflow: hidden;
            min-height: 0;
        }
        
        /* Main Content Area */
        .kingdom-main {
            flex: 1;
            padding: 0;
            overflow: hidden;
            background: #f5f5f0;
            display: flex;
            flex-direction: column;
        }
        
        /* Tab Content Display Control */
        .kingdom-main .tab {
            display: none;
        }
        
        .kingdom-main .tab.active {
            display: block;
        }
        
        /* Scrollbar Styling */
        .kingdom-sidebar::-webkit-scrollbar,
        .kingdom-main::-webkit-scrollbar {
            width: 8px;
        }
        
        .kingdom-sidebar::-webkit-scrollbar-track,
        .kingdom-main::-webkit-scrollbar-track {
            background: rgba(0,0,0,0.1);
        }
        
        .kingdom-sidebar::-webkit-scrollbar-thumb {
            background: #b8860b;
            border-radius: 4px;
        }
        
        .kingdom-main::-webkit-scrollbar-thumb {
            background: #d4c4a0;
            border-radius: 4px;
        }
    `;
    }
}
