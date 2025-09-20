package kingdom.lite.ui

/**
 * CSS styles for the Kingdom Sheet
 * Uses semantic color palette with CSS variables for consistent theming
 */
object KingdomSheetStyles {
    /**
     * Initialize and inject CSS variables into the document
     */
    fun initialize() {
        KingdomColorPalette.inject()
    }
    
    /**
     * Get the complete styles with CSS variables
     * Combines the color palette variables with the themed styles
     */
    val styles: String
        get() = """
${KingdomColorPalette.cssVariables}

${KingdomColorPalette.getThemedStyles()}

$legacyStyles
        """.trimIndent()
    
    /**
     * Legacy styles (kept for reference during migration)
     * These will be gradually replaced with themed styles
     */
    val legacyStyles = """
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
            background: #2c2c2c;
            border-right: 1px solid #b8860b;
            padding: 0;
            overflow: hidden;
            color: #c9b37e;
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
            color: #ffd700;
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
            color: #c9b37e;
            font-size: 14px;
            margin-top: 15px;
            margin-bottom: 8px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .stat-group {
            margin-bottom: 20px;
            padding: 10px;
            background: rgba(0, 0, 0, 0.3);
            border-radius: 4px;
            border: 1px solid rgba(184, 134, 11, 0.2);
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
            color: #a89968;
            font-weight: 500;
        }
        
        .stat-value {
            color: #fff;
            font-weight: bold;
        }
        
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
            color: #ffd700;
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
            color: #ffd700;
        }
        
        /* Resource Sections */
        .resource-section {
            margin-bottom: 15px;
        }
        
        .resource-header {
            color: #ffd700;
            font-weight: bold;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 8px;
            padding-bottom: 4px;
            border-bottom: 1px solid rgba(184, 134, 11, 0.3);
        }
        
        .resource-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 8px;
            margin-top: 8px;
        }
        
        .resource-item {
            background: rgba(184, 134, 11, 0.1);
            border: 1px solid rgba(184, 134, 11, 0.2);
            border-radius: 3px;
            padding: 6px;
            text-align: center;
        }
        
        .resource-item label {
            display: block;
            font-size: 10px;
            color: #a89968;
            text-transform: uppercase;
            margin-bottom: 2px;
        }
        
        .resource-item span {
            display: block;
            font-size: 14px;
            font-weight: bold;
            color: #fff;
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
        
        /* For content that needs scrolling (non-turn content) */
        .kingdom-main > .settlements-content,
        .kingdom-main > .factions-content,
        .kingdom-main > .modifiers-content,
        .kingdom-main > .notes-content,
        .kingdom-main > .settings-content {
            overflow-y: auto;
            flex: 1;
        }
        
        /* Turn Content */
        .turn-content {
            height: 100%;
            width: 100%;
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }
        
        .phase-navigation-fixed {
            flex-shrink: 0;
            background: #3a3a3a;
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
        
        .phase-navigation {
            margin-bottom: 20px;
        }
        
        .phase-buttons {
            display: flex;
            gap: 8px;
            padding: 8px;
            background: transparent;
            border: none;
            height: 100%;
            box-sizing: border-box;
            align-items: center;
        }
        
        .phase-button {
            flex: 1;
            padding: 6px 12px;
            background: linear-gradient(to bottom, #5a5958ff, #252424ff);
            border: 1px solid #757575ff;
            border-radius: 4px;
            color: #b3b3b3ff;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s;
            text-transform: none;
            letter-spacing: 0.4px;
            font-size: 16px;
            min-height: 32px;
            line-height: 1.3;
        }
        
        .phase-button:hover {
            background: linear-gradient(to bottom, #666564ff, #3a3a3aff);
            color: #e2e2e2ff;
            transform: translateY(-0.5px);
            box-shadow: 0 1px 3px rgba(0,0,0,0.3);
            border-color: #9d9c9aff;
        }
        
        .phase-button.active {
            background: linear-gradient(to bottom, #8b0000, #5e0000);
            color: #ffffff;
            font-weight: bold;
            box-shadow: inset 0 1px 3px rgba(0,0,0,0.3);
            border-color: #8b0000;
        }
        
        /* Phase Content */
        .phase-content {
            /* Container styling moved to phase-step-container */
        }
        
        .phase-details h3 {
            display: none;
        }
        
        .phase-steps {
            line-height: 1.8;
            color: #191813;
        }
        
        .phase-steps li {
            margin-bottom: 12px;
            padding-left: 10px;
        }
        
        .phase-steps strong {
            color: #5e0000;
            font-weight: 600;
        }
        
        /* Phase Step Containers */
        .phase-step-container {
            background: white;
            border: 1px solid #d4c4a0;
            border-radius: 6px;
            padding: 15px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
            margin-bottom: 12px;
            line-height: 1.6;
            color: #191813;
        }
        
        .phase-step-container:last-child {
            margin-bottom: 0;
        }
        
        .phase-step-container strong {
            color: #5e0000;
            font-weight: 600;
            margin-right: 4px;
        }
        
        .phase-step-container h4 {
            color: #5e0000;
            margin: 0 0 8px 0;
            font-size: 16px;
            font-weight: 600;
            border-bottom: 1px solid #b8860b;
            padding-bottom: 5px;
        }
        
        .phase-step-container .category-desc {
            font-style: italic;
            color: #6b4423;
            margin: 0 0 12px 0;
            font-size: 14px;
        }
        
        .phase-step-container ul {
            margin: 0;
            padding-left: 20px;
            list-style-type: disc;
        }
        
        .phase-step-container li {
            margin-bottom: 8px;
            line-height: 1.6;
            color: #191813;
        }
        
        .phase-step-container li strong {
            color: #5e0000;
            font-weight: 600;
            margin-right: 4px;
        }
        
        .activity-info, .event-info, .loot-info {
            color: #191813;
        }
        
        .activity-info p, .event-info p, .loot-info p {
            margin-bottom: 12px;
            line-height: 1.6;
        }
        
        .activity-info ul, .loot-info ul {
            margin-left: 20px;
            line-height: 1.8;
        }
        
        .activity-info strong, .event-info strong, .loot-info strong {
            color: #5e0000;
            font-weight: 600;
        }
        
        /* Action Categories */
        .action-category {
            margin-bottom: 20px;
            padding: 15px;
            background: rgba(184, 134, 11, 0.05);
            border: 1px solid #d4c4a0;
            border-radius: 5px;
        }
        
        .action-category h4 {
            color: #5e0000;
            margin: 0 0 8px 0;
            font-size: 16px;
            font-weight: 600;
            border-bottom: 1px solid #b8860b;
            padding-bottom: 5px;
        }
        
        .action-category .category-desc {
            font-style: italic;
            color: #6b4423;
            margin: 0 0 12px 0;
            font-size: 14px;
        }
        
        .action-category ul {
            margin: 0;
            padding-left: 20px;
            list-style-type: disc;
        }
        
        .action-category li {
            margin-bottom: 8px;
            line-height: 1.6;
            color: #191813;
        }
        
        .action-category li strong {
            color: #5e0000;
            font-weight: 600;
            margin-right: 4px;
        }
        
        /* Other Content Sections */
        .settlements-content, .factions-content, 
        .modifiers-content, .notes-content, .settings-content {
            background: white;
            border: 1px solid #d4c4a0;
            border-radius: 6px;
            padding: 20px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
            margin: 10px;
            min-height: 200px;
        }
        
        .settlements-content h3, .factions-content h3,
        .modifiers-content h3, .notes-content h3, .settings-content h3 {
            color: #5e0000;
            border-bottom: 2px solid #b8860b;
            padding-bottom: 10px;
            margin-bottom: 15px;
            font-size: 20px;
        }
        
        /* Settings Content Specific Styles */
        .settings-section {
            margin-bottom: 30px;
            padding: 15px;
            background: rgba(184, 134, 11, 0.05);
            border: 1px solid #d4c4a0;
            border-radius: 5px;
        }
        
        /* Settings Divider */
        .settings-divider {
            margin: 30px 0;
            border: none;
            border-top: 2px solid #b8860b;
            opacity: 0.5;
        }
        
        /* Refresh Container */
        .refresh-container {
            text-align: center;
            margin: 15px 0;
        }
        
        .btn-refresh {
            padding: 6px 12px;
            background: linear-gradient(to bottom, #5e4433, #3e2922);
            border: 1px solid #b8860b;
            border-radius: 4px;
            color: #c9b37e;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s;
            font-size: 13px;
            margin-right: 10px;
        }
        
        .btn-refresh:hover {
            background: linear-gradient(to bottom, #b8860b, #8b6914);
            color: #fff;
            transform: translateY(-1px);
            box-shadow: 0 2px 5px rgba(0,0,0,0.3);
        }
        
        .btn-refresh i {
            margin-right: 5px;
        }
        
        .refresh-info {
            display: inline-block;
            margin-left: 10px;
            color: #6b4423;
            font-style: italic;
            font-size: 12px;
        }
        
        /* Kingdom Status Styles */
        .kingdom-status {
            margin-bottom: 25px;
        }
        
        .kingdom-info {
            padding: 15px;
            background: #fffff9;
            border: 1px solid #d4c4a0;
            border-radius: 5px;
            margin-top: 10px;
        }
        
        .kingdom-size {
            font-size: 16px;
            margin-bottom: 15px;
            color: #191813;
        }
        
        .kingdom-size strong {
            color: #5e0000;
            font-weight: 600;
        }
        
        .settlements-summary {
            font-size: 16px;
            margin-bottom: 15px;
            color: #191813;
        }
        
        .settlements-summary strong {
            color: #5e0000;
            font-weight: 600;
        }
        
        .worksites-info h5 {
            margin-top: 15px;
            margin-bottom: 10px;
            color: #5e0000;
            font-size: 14px;
            font-weight: 600;
        }
        
        .worksites-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
        }
        
        .worksites-table th {
            text-align: left;
            padding: 8px;
            border-bottom: 2px solid #b8860b;
            background: rgba(184, 134, 11, 0.1);
            color: #5e0000;
            font-weight: 600;
            font-size: 13px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .worksites-table td {
            padding: 8px;
            border-bottom: 1px solid #d4c4a0;
            color: #191813;
        }
        
        .worksites-table tbody tr:hover {
            background: rgba(184, 134, 11, 0.05);
        }
        
        .no-worksites {
            text-align: center;
            font-style: italic;
            color: #6b4423;
        }
        
        .settings-info.warning {
            padding: 15px;
            background: rgba(234, 179, 8, 0.1);
            border: 1px solid #eab308;
            border-radius: 5px;
        }
        
        .settings-info.warning p {
            margin: 5px 0;
            color: #8b6914;
        }
        
        .no-data {
            color: #8b0000;
            font-style: italic;
        }
        
        .settings-section h4 {
            color: #5e0000;
            margin: 0 0 12px 0;
            font-size: 16px;
            font-weight: 600;
            border-bottom: 1px solid #b8860b;
            padding-bottom: 5px;
        }
        
        .settings-description {
            margin-bottom: 15px;
            color: #6b4423;
            font-style: italic;
        }
        
        .settings-control {
            margin-bottom: 15px;
        }
        
        .settings-control label {
            display: inline-block;
            margin-right: 10px;
            color: #5e0000;
            font-weight: 600;
            min-width: 120px;
        }
        
        .kingdom-scene-selector {
            padding: 6px 10px;
            border: 1px solid #d4c4a0;
            border-radius: 4px;
            background: #fffff9;
            color: #191813;
            font-size: 14px;
            font-family: 'Signika', 'Palatino Linotype', serif;
            min-width: 250px;
        }
        
        .kingdom-scene-selector:focus {
            outline: none;
            border-color: #b8860b;
            box-shadow: 0 0 0 2px rgba(184, 134, 11, 0.1);
        }
        
        .settings-info {
            margin-top: 10px;
            padding: 10px;
            background: rgba(184, 134, 11, 0.1);
            border-radius: 4px;
        }
        
        .current-selection {
            color: #191813;
            margin: 0;
        }
        
        .no-selection {
            color: #8b0000;
            margin: 0;
            font-style: italic;
        }
        
        /* Notes Section */
        .notes-editor {
            width: 100%;
            height: 100%;
            min-height: 400px;
        }
        
        .notes-textarea {
            width: 100%;
            height: 400px;
            padding: 12px;
            border: 1px solid #d4c4a0;
            border-radius: 4px;
            background: #fffff9;
            color: #191813;
            font-size: 14px;
            font-family: 'Signika', 'Palatino Linotype', serif;
            resize: vertical;
            box-sizing: border-box;
        }
        
        .notes-textarea:focus {
            outline: none;
            border-color: #b8860b;
            box-shadow: 0 0 0 2px rgba(184, 134, 11, 0.1);
        }
        
        /* Buttons */
        .btn {
            padding: 8px 16px;
            background: linear-gradient(to bottom, #5e4433, #3e2922);
            border: 1px solid #b8860b;
            border-radius: 4px;
            color: #c9b37e;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            font-size: 12px;
        }
        
        .btn:hover {
            background: linear-gradient(to bottom, #b8860b, #8b6914);
            color: #fff;
            transform: translateY(-1px);
            box-shadow: 0 2px 5px rgba(0,0,0,0.3);
        }
        
        /* Turn Action Button - consistent style for all turn phase buttons */
        .turn-action-button {
            padding: 8px 16px;
            background: linear-gradient(to bottom, #5e4433, #3e2922);
            border: 1px solid #b8860b;
            border-radius: 4px;
            color: #ffd700;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.2s;
            font-size: 14px;
            text-transform: none;
            display: inline-block;
            margin-top: 8px;
        }
        
        .turn-action-button:hover {
            background: linear-gradient(to bottom, #b8860b, #8b6914);
            color: #ffffff;
            transform: translateY(-1px);
            box-shadow: 0 2px 5px rgba(0,0,0,0.3);
        }
        
        .turn-action-button:active {
            transform: translateY(0);
            box-shadow: inset 0 1px 3px rgba(0,0,0,0.3);
        }
        
        .turn-action-button i {
            margin-right: 6px;
        }
        
        /* Stat Adjustment Buttons - small +/- buttons for stats */
        .stat-adjust-button {
            padding: 2px 6px;
            background: rgba(184, 134, 11, 0.1);
            border: 1px solid rgba(184, 134, 11, 0.3);
            border-radius: 3px;
            color: #b8860b;
            font-size: 12px;
            cursor: pointer;
            transition: all 0.2s;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 22px;
            height: 22px;
        }
        
        .stat-adjust-button:hover {
            background: rgba(184, 134, 11, 0.2);
            color: #ffd700;
            border-color: #b8860b;
        }
        
        .stat-adjust-button:active {
            background: rgba(184, 134, 11, 0.3);
            transform: scale(0.95);
        }
        
        /* Kingdom Select Dropdown */
        .kingdom-select {
            padding: 3px 8px;
            background: rgba(184, 134, 11, 0.1);
            border: 1px solid rgba(184, 134, 11, 0.3);
            border-radius: 4px;
            color: #ffd700;
            font-size: 14px;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.2s;
            font-family: 'Signika', 'Palatino Linotype', serif;
            min-width: 80px;
        }
        
        .kingdom-select:hover {
            background: rgba(184, 134, 11, 0.2);
            border-color: #b8860b;
        }
        
        .kingdom-select:focus {
            outline: none;
            border-color: #ffd700;
            box-shadow: 0 0 0 2px rgba(255, 215, 0, 0.1);
        }
        
        .kingdom-select option {
            background: #2c2c2c;
            color: #c9b37e;
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
    """.trimIndent()
}
