package kingdom.lite.ui

/**
 * CSS styles for the Kingdom Sheet
 * Matches the Pathfinder 2e aesthetic with dark theme and gold accents
 */
object KingdomSheetStyles {
    val styles = """
        .kingdom-sheet {
            font-family: 'Signika', 'Palatino Linotype', serif;
            color: #191813;
        }
        
        .kingdom-sheet .window-content {
            padding: 0;
            background: #f5f5f0;
        }
        
        /* Main Container */
        .kingdom-container {
            display: flex;
            flex-direction: column;
            height: 100%;
            background: linear-gradient(to bottom, #f5f5f0, #ebe8e0);
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
            font-size: 14px;
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
            padding: 20px;
            overflow-y: auto;
            background: #f5f5f0;
        }
        
        /* Turn Content */
        .turn-content {
            height: 100%;
            display: flex;
            flex-direction: column;
        }
        
        .phase-navigation {
            margin-bottom: 20px;
        }
        
        .phase-buttons {
            display: flex;
            gap: 10px;
            padding: 10px;
            background: linear-gradient(to bottom, #3a0000, #2c0000);
            border-radius: 6px;
            border: 1px solid #b8860b;
        }
        
        .phase-button {
            flex: 1;
            padding: 10px 15px;
            background: linear-gradient(to bottom, #5e4433, #3e2922);
            border: 1px solid #b8860b;
            border-radius: 4px;
            color: #c9b37e;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            font-size: 13px;
        }
        
        .phase-button:hover {
            background: linear-gradient(to bottom, #6e5443, #4e3932);
            color: #ffd700;
            transform: translateY(-1px);
            box-shadow: 0 2px 5px rgba(0,0,0,0.3);
        }
        
        .phase-button.active {
            background: linear-gradient(to bottom, #b8860b, #8b6914);
            color: #fff;
            font-weight: bold;
            box-shadow: inset 0 2px 4px rgba(0,0,0,0.3);
        }
        
        /* Phase Content */
        .phase-content {
            flex: 1;
            background: white;
            border: 1px solid #d4c4a0;
            border-radius: 6px;
            padding: 20px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        }
        
        .phase-details h3 {
            color: #5e0000;
            border-bottom: 2px solid #b8860b;
            padding-bottom: 10px;
            margin-bottom: 15px;
            font-size: 20px;
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
