package kingdom.lite.ui

/**
 * CSS styles for the Kingdom Sheet
 * Matches the Pathfinder 2e aesthetic with dark theme and gold accents
 */
object KingdomSheetStyles {
    val styles = """
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
            color: #c9b37e;
            text-decoration: none;
            font-size: 18px;
            line-height: 1;
            padding: 2px 6px;
            margin-left: auto;
            cursor: pointer;
            transition: color 0.2s;
        }
        
        .kingdom-sheet .close:hover {
            color: #ffd700;
        }
        
        .kingdom-sheet .window-content {
            padding: 0;
            background: white;
            overflow: hidden;
            flex: 1;
        }
        
        /* Main Container */
        .kingdom-container {
            display: flex;
            flex-direction: column;
            height: 100%;
            background: white;
        }
        
        /* Header with Tabs */
        .kingdom-header {
            background: linear-gradient(to bottom, #5e0000, #3a0000);
            border-bottom: 2px solid #b8860b;
            box-shadow: 0 2px 5px rgba(0,0,0,0.3);
        }
        
        .kingdom-tabs {
            display: flex;
            padding: 0;
            margin: 0;
            height: 40px;
        }
        
        .kingdom-tab {
            flex: 0 0 auto;
            padding: 10px 20px;
            background: transparent;
            border: none;
            border-right: 1px solid rgba(184, 134, 11, 0.3);
            color: #c9b37e;
            font-size: 16px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .kingdom-tab:hover {
            background: rgba(184, 134, 11, 0.1);
            color: #fff;
        }
        
        .kingdom-tab.active {
            background: linear-gradient(to bottom, rgba(184, 134, 11, 0.2), transparent);
            color: #ffd700;
            border-bottom: 2px solid #b8860b;
            font-weight: bold;
        }
        
        /* Body Layout */
        .kingdom-body {
            display: flex;
            flex: 1;
            overflow: hidden;
        }
        
        /* Sidebar */
        .kingdom-sidebar {
            width: 320px;
            background: #2c2c2c;
            border-right: 1px solid #b8860b;
            padding: 15px;
            overflow-y: auto;
            color: #c9b37e;
        }
        
        .kingdom-stats h3 {
            color: #ffd700;
            border-bottom: 1px solid #b8860b;
            padding-bottom: 8px;
            margin-bottom: 12px;
            font-size: 16px;
            text-transform: uppercase;
            letter-spacing: 1px;
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
            overflow-y: auto;
            background: #f5f5f0;
        }
        
        /* Turn Content */
        .turn-content {
            height: 100%;
            display: flex;
            flex-direction: column;
        }
        
        .phase-navigation-fixed {
            flex-shrink: 0;
            position: sticky;
            top: 0;
            z-index: 10;
            background: #3a3a3a;
            padding: 0;
        }
        
        .phase-content-scrollable {
            flex: 1;
            overflow-y: auto;
            padding: 10px;
            padding-top: 15px;
        }
        
        .phase-navigation {
            margin-bottom: 20px;
        }
        
        .phase-buttons {
            display: flex;
            gap: 8px;
            padding: 8px;
            background: #3a3a3a;
            border: none;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
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
        .structures-content, .events-content {
            background: white;
            border: 1px solid #d4c4a0;
            border-radius: 6px;
            padding: 20px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        }
        
        .settlements-content h3, .factions-content h3,
        .structures-content h3, .events-content h3 {
            color: #5e0000;
            border-bottom: 2px solid #b8860b;
            padding-bottom: 10px;
            margin-bottom: 15px;
            font-size: 20px;
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
