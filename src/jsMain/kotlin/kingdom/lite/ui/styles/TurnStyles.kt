package kingdom.lite.ui.styles

/**
 * Styles for the Turn Controller and Phase components
 */
object TurnStyles {
    val styles = """
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
    """.trimIndent()
}
