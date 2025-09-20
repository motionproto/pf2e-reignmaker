package kingdom.lite.ui

/**
 * Semantic color palette for the Kingdom Sheet application.
 * Defines CSS custom properties (variables) for consistent theming.
 */
object KingdomColorPalette {
    
    /**
     * CSS custom properties definitions to be injected into the document
     */
    val cssVariables = """
        @import url('https://fonts.googleapis.com/css2?family=Eczar:wght@400;600;700&display=swap');
        
        :root {
            /* ===== Base Colors ===== */
            /* Primary brand colors (deep red theme) */
            --color-primary: #5e0000;
            --color-primary-light: #8b0000;
            --color-primary-dark: #3a0000;
            --color-primary-gradient: linear-gradient(to bottom, #5e0000, #3a0000);
            --color-primary-gradient-hover: linear-gradient(to bottom, #8b0000, #5e0000);
            
            /* Gold accent colors */
            --color-accent: #b8860b;
            --color-accent-light: #ffd700;
            --color-accent-dark: #8b6914;
            --color-accent-text: #c9b37e;
            --color-accent-muted: #a89968;
            
            /* ===== Neutral Colors ===== */
            /* Background colors */
            --color-background: #f5f5f0;
            --color-background-white: #ffffff;
            --color-background-light: #fffff9;
            --color-background-parchment: #f0e6d2;
            --color-surface: #faf8f3;
            --color-surface-alt: #e8dcc0;
            
            /* Dark theme backgrounds */
            --color-dark-bg: #2c2c2c;
            --color-dark-bg-alt: #3a3a3a;
            --color-dark-surface: rgba(0, 0, 0, 0.3);
            
            /* ===== Text Colors ===== */
            --color-text-primary: #191813;
            --color-text-secondary: #4a4a4a;
            --color-text-muted: #6c6c6c;
            --color-text-emphasis: #6b4423;
            --color-text-light: #ffffff;
            --color-text-on-dark: #c9b37e;
            --color-text-on-dark-muted: #b3b3b3;
            --color-text-on-accent: #fecb21;
            
            /* ===== Border Colors ===== */
            --color-border: #d4c4a0;
            --color-border-light: rgba(184, 134, 11, 0.1);
            --color-border-medium: rgba(184, 134, 11, 0.2);
            --color-border-strong: rgba(184, 134, 11, 0.3);
            --color-border-accent: #b8860b;
            --color-border-dark: #757575;
            --color-border-hover: #9d9c9a;
            
            /* ===== Button States ===== */
            --color-button-gradient: linear-gradient(to bottom, #5a5958, #252424);
            --color-button-gradient-hover: linear-gradient(to bottom, #666564, #3a3a3a);
            --color-button-gradient-active: linear-gradient(to bottom, #8b0000, #5e0000);
            --color-button-text: #b3b3b3;
            --color-button-text-hover: #e2e2e2;
            --color-button-text-active: #ffffff;
            --color-button-border: #757575;
            
            /* ===== State Colors ===== */
            --color-success: #2d5016;
            --color-warning: #8b6914;
            --color-danger: #8b0000;
            --color-info: #1e4d6b;
            
            /* ===== Interactive States ===== */
            --color-hover-overlay: rgba(0, 0, 0, 0.05);
            --color-hover-dark: rgba(0, 0, 0, 0.1);
            --color-active-overlay: rgba(0, 0, 0, 0.2);
            --color-focus-ring: rgba(184, 134, 11, 0.1);
            --color-selected-bg: rgba(184, 134, 11, 0.05);
            
            /* ===== Shadows ===== */
            --shadow-small: 0 1px 3px rgba(0, 0, 0, 0.3);
            --shadow-medium: 0 2px 5px rgba(0, 0, 0, 0.1);
            --shadow-large: 0 0 20px rgba(0, 0, 0, 0.8);
            --shadow-inset: inset 0 1px 3px rgba(0, 0, 0, 0.3);
            --shadow-text: 1px 1px 2px rgba(0, 0, 0, 0.5);
            
            /* ===== Spacing ===== */
            --spacing-xs: 4px;
            --spacing-sm: 8px;
            --spacing-md: 12px;
            --spacing-lg: 16px;
            --spacing-xl: 20px;
            --spacing-2xl: 24px;
            
            /* ===== Border Radius ===== */
            --radius-sm: 3px;
            --radius-md: 4px;
            --radius-lg: 5px;
            --radius-xl: 6px;
            
            /* ===== Typography ===== */
            --font-primary: 'Signika', 'Palatino Linotype', serif;
            --font-size-xs: 10px;
            --font-size-sm: 11px;
            --font-size-base: 14px;
            --font-size-md: 16px;
            --font-size-lg: 18px;
            --font-size-xl: 20px;
            
            /* ===== Z-Index Layers ===== */
            --z-base: 0;
            --z-dropdown: 100;
            --z-sticky: 10;
            --z-modal: 1000;
            --z-tooltip: 1100;
        }
    """.trimIndent()
    
    /**
     * Inject the CSS variables into the document head
     */
    fun inject() {
        // This would be called when initializing the sheet
        val style = js("document.createElement('style')")
        style.textContent = cssVariables
        js("document.head.appendChild(style)")
    }
    
    /**
     * Updated styles using CSS variables
     */
    fun getThemedStyles(): String = """
        /* Application Window Styling */
        .app.kingdom-sheet {
            box-shadow: var(--shadow-large);
            border: 1px solid #000;
            border-radius: var(--radius-lg);
            background: var(--color-background-white);
        }
        
        .kingdom-sheet {
            font-family: var(--font-primary);
            color: var(--color-text-primary);
            background: var(--color-background-white);
            height: 100%;
            display: flex;
            flex-direction: column;
        }
        
        .kingdom-sheet .window-header {
            background: var(--color-primary-gradient);
            border-bottom: 1px solid var(--color-accent);
            border-radius: var(--radius-lg) var(--radius-lg) 0 0;
            padding: var(--spacing-sm) var(--spacing-md);
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-shrink: 0;
        }
        
        .kingdom-sheet .window-title {
            color: var(--color-text-light);
            margin: 0;
            font-size: var(--font-size-base);
            font-weight: bold;
            text-shadow: var(--shadow-text);
        }
        
        .kingdom-sheet .close {
            color: #e7e7e7;
            text-decoration: none;
            font-size: var(--font-size-lg);
            line-height: 1;
            padding: 2px 6px;
            margin-left: auto;
            cursor: pointer;
            transition: color 0.2s;
        }
        
        .kingdom-sheet .close:hover {
            color: var(--color-text-light);
        }
        
        .kingdom-sheet .window-content {
            padding: 0;
            background: var(--color-background-white);
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
            background: var(--color-background-white);
        }
        
        /* Header with Content Selector */
        .kingdom-header {
            background: var(--color-primary-gradient);
            border-bottom: 2px solid var(--color-accent);
            box-shadow: var(--shadow-medium);
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
            background: var(--color-dark-bg-alt);
        }
        
        .content-button {
            flex: 0 1 auto;
            display: block;
            padding: 10px var(--spacing-xl);
            background: var(--color-button-gradient);
            border: 1px solid var(--color-button-border);
            color: var(--color-button-text);
            font-size: var(--font-size-xl);
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
            background: var(--color-button-gradient-hover);
            color: var(--color-button-text-hover);
            transform: translateY(-0.5px);
            box-shadow: var(--shadow-small);
            border-color: var(--color-border-hover);
        }
        
        .content-button.active {
            background: var(--color-button-gradient-active);
            color: var(--color-text-on-accent);
            font-weight: bold;
            box-shadow: var(--shadow-inset);
            border-color: var(--color-primary-light);
        }
        
        /* Body Layout */
        .kingdom-body {
            display: flex;
            flex: 1;
            overflow: hidden;
            min-height: 0;
        }
        
        /* Sidebar */
        .kingdom-sidebar {
            width: 320px;
            background: var(--color-dark-bg);
            border-right: 1px solid var(--color-accent);
            padding: 0;
            overflow: hidden;
            color: var(--color-text-on-dark);
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
            background: var(--color-dark-bg-alt);
            padding: var(--spacing-sm);
            border-bottom: 1px solid #252424;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
            height: 48px;
            box-sizing: border-box;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .kingdom-name-header h3 {
            color: var(--color-accent-light);
            margin: 0;
            font-size: var(--font-size-md);
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
            padding: var(--spacing-lg);
        }
        
        .kingdom-stats h4 {
            color: var(--color-text-on-dark);
            font-size: var(--font-size-base);
            margin-top: var(--spacing-lg);
            margin-bottom: var(--spacing-sm);
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .stat-group {
            margin-bottom: var(--spacing-xl);
            padding: 10px;
            background: var(--color-dark-surface);
            border-radius: var(--radius-md);
            border: 1px solid var(--color-border-medium);
        }
        
        .stat-item {
            display: flex;
            justify-content: space-between;
            margin-bottom: var(--spacing-sm);
            padding: var(--spacing-xs) 0;
            border-bottom: 1px solid var(--color-border-light);
        }
        
        .stat-item:last-child {
            border-bottom: none;
            margin-bottom: 0;
        }
        
        .stat-item label {
            color: var(--color-accent-muted);
            font-weight: 500;
        }
        
        .stat-value {
            color: var(--color-text-light);
            font-weight: bold;
        }
        
        .ability-scores {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 10px;
            text-align: center;
        }
        
        .ability {
            background: var(--color-border-light);
            border: 1px solid var(--color-border-strong);
            border-radius: var(--radius-md);
            padding: var(--spacing-sm);
        }
        
        .ability label {
            display: block;
            font-size: var(--font-size-sm);
            color: var(--color-accent-muted);
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: var(--spacing-xs);
        }
        
        .ability-value {
            font-size: var(--font-size-lg);
            font-weight: bold;
            color: var(--color-accent-light);
        }
        
        /* Main Content Area */
        .kingdom-main {
            flex: 1;
            padding: 0;
            overflow: hidden;
            background: var(--color-background);
            display: flex;
            flex-direction: column;
        }
        
        /* Turn Content */
        .turn-content {
            height: 100%;
            width: 100%;
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }
        
        /* Phase Navigation */
        .phase-navigation-fixed {
            flex-shrink: 0;
            background: var(--color-dark-bg-alt);
            padding: 0;
            border-bottom: 1px solid #252424;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
            height: 48px;
            box-sizing: border-box;
        }
        
        .phase-content-scrollable {
            flex: 1;
            overflow-y: auto;
            padding: 10px;
            padding-top: 15px;
            min-height: 0;
        }
        
        .phase-buttons {
            display: flex;
            gap: var(--spacing-sm);
            padding: var(--spacing-sm);
            background: transparent;
            border: none;
            height: 100%;
            box-sizing: border-box;
            align-items: center;
        }
        
        .phase-button {
            flex: 1;
            padding: 6px var(--spacing-md);
            background: var(--color-button-gradient);
            border: 1px solid var(--color-button-border);
            border-radius: var(--radius-md);
            color: var(--color-button-text);
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s;
            text-transform: none;
            letter-spacing: 0.4px;
            font-size: var(--font-size-md);
            min-height: 32px;
            line-height: 1.3;
        }
        
        .phase-button:hover {
            background: var(--color-button-gradient-hover);
            color: var(--color-button-text-hover);
            transform: translateY(-0.5px);
            box-shadow: var(--shadow-small);
            border-color: var(--color-border-hover);
        }
        
        .phase-button.active {
            background: var(--color-button-gradient-active);
            color: var(--color-text-light);
            font-weight: bold;
            box-shadow: var(--shadow-inset);
            border-color: var(--color-primary-light);
        }
        
        /* Phase Step Containers */
        .phase-step-container {
            background: var(--color-background-white);
            border: 1px solid var(--color-border);
            border-radius: var(--radius-xl);
            padding: var(--spacing-lg);
            box-shadow: var(--shadow-medium);
            margin-bottom: var(--spacing-md);
            line-height: 1.6;
            color: var(--color-text-primary);
        }
        
        .phase-step-container h4 {
            color: var(--color-primary);
            margin: 0 0 var(--spacing-sm) 0;
            font-size: var(--font-size-md);
            font-weight: 600;
            border-bottom: 1px solid var(--color-accent);
            padding-bottom: var(--spacing-xs);
        }
        
        .phase-step-container strong {
            color: var(--color-primary);
            font-weight: 600;
            margin-right: var(--spacing-xs);
        }
        
        /* Other Content Sections */
        .settlements-content, .factions-content, 
        .modifiers-content, .notes-content, .settings-content {
            background: var(--color-background-white);
            border: 1px solid var(--color-border);
            border-radius: var(--radius-xl);
            padding: var(--spacing-xl);
            box-shadow: var(--shadow-medium);
            margin: 10px;
            min-height: 200px;
        }
        
        .settlements-content h3, .factions-content h3,
        .modifiers-content h3, .notes-content h3, .settings-content h3 {
            color: var(--color-primary);
            border-bottom: 2px solid var(--color-accent);
            padding-bottom: 10px;
            margin-bottom: var(--spacing-lg);
            font-size: var(--font-size-xl);
        }
        
        /* Notes Section */
        .notes-textarea {
            width: 100%;
            height: 400px;
            padding: var(--spacing-md);
            border: 1px solid var(--color-border);
            border-radius: var(--radius-md);
            background: var(--color-background-light);
            color: var(--color-text-primary);
            font-size: var(--font-size-base);
            font-family: var(--font-primary);
            resize: vertical;
            box-sizing: border-box;
        }
        
        .notes-textarea:focus {
            outline: none;
            border-color: var(--color-accent);
            box-shadow: 0 0 0 2px var(--color-focus-ring);
        }
        
        /* Scrollbar Styling */
        .kingdom-stats-scrollable::-webkit-scrollbar,
        .phase-content-scrollable::-webkit-scrollbar {
            width: 8px;
        }
        
        .kingdom-stats-scrollable::-webkit-scrollbar-track,
        .phase-content-scrollable::-webkit-scrollbar-track {
            background: var(--color-hover-dark);
        }
        
        .kingdom-stats-scrollable::-webkit-scrollbar-thumb {
            background: var(--color-accent);
            border-radius: var(--radius-md);
        }
        
        .phase-content-scrollable::-webkit-scrollbar-thumb {
            background: var(--color-border);
            border-radius: var(--radius-md);
        }
    """.trimIndent()
}
