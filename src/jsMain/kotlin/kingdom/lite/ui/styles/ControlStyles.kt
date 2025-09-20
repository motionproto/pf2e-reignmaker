package kingdom.lite.ui.styles

/**
 * Styles for buttons, dropdowns, and other interactive controls
 */
object ControlStyles {
    val styles = """
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
        
        /* Refresh Button */
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
        
        /* Turn Action Button - consistent style for all turn phase buttons */
        .turn-action-button {
            padding: 8px 16px;
            background: linear-gradient(to bottom, #5e4433, #3e2922);
            border: 1px solid #b8860b;
            border-radius: 4px;
            color: var(--stat-text-color);
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
            padding: 0;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 3px;
            color: var(--stat-text-color);
            font-size: 12px;
            cursor: pointer;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 22px;
            height: 22px;
            line-height: 1;
        }
        
        .stat-adjust-button i {
            display: block;
            margin: 0;
            padding: 0;
            line-height: 1;
        }
        
        .stat-adjust-button:hover {
            background: rgba(255, 255, 255, 0.1);
            border-color: var(--stat-text-color);
        }
        
        .stat-adjust-button:active {
            background: rgba(255, 255, 255, 0.15);
            transform: scale(0.95);
        }
        
        /* Kingdom Select Dropdown */
        .kingdom-select {
            padding: 3px 8px;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 4px;
            color: var(--stat-text-color);
            font-size: 14px;
            font-weight: normal;
            cursor: pointer;
            transition: all 0.2s;
            font-family: 'Signika', 'Palatino Linotype', serif;
            min-width: 80px;
        }
        
        .kingdom-select:hover {
            background: rgba(255, 255, 255, 0.1);
            border-color: var(--stat-text-color);
        }
        
        .kingdom-select:focus {
            outline: none;
            border-color: var(--stat-text-color);
            box-shadow: 0 0 0 2px rgba(212, 212, 216, 0.1);
        }
        
        .kingdom-select option {
            background: #2c2c2c;
            color: var(--stat-text-color);
        }
        
        /* Kingdom Scene Selector */
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
    """.trimIndent()
}
