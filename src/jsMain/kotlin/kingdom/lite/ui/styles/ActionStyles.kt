package kingdom.lite.ui.styles

object ActionStyles {
    val styles = """
        /* Action List Styles */
        .actions-phase-content ul {
            list-style: none;
            padding: 0;
            margin: 0;
        }
        
        .action-list-item {
            margin-bottom: 2px;
            list-style: none;
        }
        
        /* Action Header Row */
        .action-header-row {
            display: flex;
            align-items: center;
            padding: 2px 0;
            gap: 8px;
        }
        
        .action-title-line {
            flex: 1;
            font-size: 12px;
            color: #e0e0e0;
            line-height: 1.4;
            cursor: pointer;
            user-select: none;
            padding: 2px 4px;
            border-radius: 3px;
            transition: background 0.2s ease;
        }
        
        .action-title-line:hover {
            background: rgba(139, 69, 19, 0.1);
        }
        
        .action-title-line strong {
            color: #D4A574;
            font-weight: bold;
        }
        
        /* Perform Button */
        .action-perform-btn {
            background: linear-gradient(to bottom, #2a5434, #1e3a26);
            color: #9BC89E;
            border: 1px solid #3a6a44;
            border-radius: 4px;
            padding: 3px 10px;
            font-size: 11px;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.2s ease;
            white-space: nowrap;
        }
        
        .action-perform-btn:hover {
            background: linear-gradient(to bottom, #3a6444, #2e4a36);
            border-color: #4a7a54;
            box-shadow: 0 0 5px rgba(155, 200, 158, 0.3);
        }
        
        .action-perform-btn:active {
            transform: scale(0.98);
        }
        
        /* Expanded Content */
        .action-expanded-content {
            margin-left: 22px;
            margin-top: 8px;
            margin-bottom: 8px;
            padding-left: 16px;
            border-left: 2px solid rgba(139, 69, 19, 0.3);
            animation: fadeIn 0.2s ease;
        }
        
        @keyframes fadeIn {
            from {
                opacity: 0;
                max-height: 0;
            }
            to {
                opacity: 1;
                max-height: 1000px;
            }
        }
        
        .action-full-description {
            font-size: 12px;
            color: #a0a0a0;
            line-height: 1.5;
            margin-bottom: 12px;
            font-style: italic;
        }
        
        /* Skills Section */
        .action-skills-section {
            margin-bottom: 12px;
        }
        
        .action-skills-section strong {
            color: #D4A574;
            font-size: 12px;
            display: block;
            margin-bottom: 4px;
        }
        
        .skills-list {
            margin: 4px 0 0 16px;
            padding: 0;
            list-style: none;
        }
        
        .skills-list li {
            font-size: 12px;
            color: #a0a0a0;
            margin-bottom: 2px;
        }
        
        .skill-name {
            color: #9BC89E;
            font-weight: 600;
            text-transform: capitalize;
        }
        
        /* Outcomes Table */
        .action-outcomes {
            margin-bottom: 12px;
        }
        
        .action-outcomes strong {
            color: #D4A574;
            font-size: 12px;
            display: block;
            margin-bottom: 6px;
        }
        
        .outcomes-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
            margin-left: 16px;
            max-width: calc(100% - 16px);
        }
        
        .outcomes-table tr {
            border-bottom: 1px solid rgba(139, 69, 19, 0.2);
        }
        
        .outcomes-table tr:last-child {
            border-bottom: none;
        }
        
        .outcomes-table td {
            padding: 4px 8px;
            vertical-align: top;
        }
        
        .outcome-level {
            font-weight: 600;
            width: 120px;
            white-space: nowrap;
        }
        
        .outcome-level.critical-success {
            color: #4a9eff;
        }
        
        .outcome-level.success {
            color: #4CAF50;
        }
        
        .outcome-level.failure {
            color: #ff9800;
        }
        
        .outcome-level.critical-failure {
            color: #f44336;
        }
        
        /* Special Conditions */
        .action-special-conditions,
        .action-proficiency,
        .action-cost {
            margin-bottom: 8px;
            font-size: 12px;
            color: #a0a0a0;
        }
        
        .action-special-conditions strong,
        .action-proficiency strong,
        .action-cost strong {
            color: #D4A574;
            margin-right: 6px;
        }
        
        .action-special-conditions {
            color: #FFD700;
            font-style: italic;
        }
        
        .proficiency-values {
            color: #9BC89E;
        }
    """.trimIndent()
}
