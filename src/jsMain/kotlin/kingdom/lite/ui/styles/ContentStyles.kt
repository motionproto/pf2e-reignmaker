package kingdom.lite.ui.styles

/**
 * Styles for content sections (settlements, factions, modifiers, notes, settings)
 */
object ContentStyles {
    val styles = """
        /* For content that needs scrolling (non-turn content) */
        .kingdom-main > .settlements-content,
        .kingdom-main > .factions-content,
        .kingdom-main > .modifiers-content,
        .kingdom-main > .notes-content,
        .kingdom-main > .settings-content {
            overflow-y: auto;
            flex: 1;
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
        
        .settings-info {
            margin-top: 10px;
            padding: 10px;
            background: rgba(184, 134, 11, 0.1);
            border-radius: 4px;
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
        
        .current-selection {
            color: #191813;
            margin: 0;
        }
        
        .no-selection {
            color: #8b0000;
            margin: 0;
            font-style: italic;
        }
        
        .no-data {
            color: #8b0000;
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
    """.trimIndent()
}
