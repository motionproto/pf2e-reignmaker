package kingdom.lite.ui.styles

object ActionStyles {
    val styles = """
        /* Action Card Styles */
        .action-card {
            background: rgba(0, 0, 0, 0.3);
            border: 1px solid rgba(139, 69, 19, 0.6);
            border-radius: 6px;
            margin-bottom: 8px;
            transition: all 0.2s ease;
        }
        
        .action-card:hover {
            background: rgba(0, 0, 0, 0.4);
            border-color: rgba(139, 69, 19, 0.8);
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        }
        
        .action-card.expanded {
            background: rgba(0, 0, 0, 0.5);
            border-color: #8B4513;
        }
        
        /* Action Header */
        .action-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px 12px;
            cursor: pointer;
            user-select: none;
        }
        
        .action-header-content {
            display: flex;
            align-items: center;
            flex: 1;
            min-width: 0;
        }
        
        .action-chevron {
            width: 20px;
            margin-right: 10px;
            color: #8B4513;
            font-size: 14px;
            transition: transform 0.2s ease;
        }
        
        .action-info {
            flex: 1;
            min-width: 0;
        }
        
        .action-title {
            font-weight: bold;
            color: #D4A574;
            font-size: 14px;
            margin-bottom: 2px;
        }
        
        .action-brief {
            color: #a0a0a0;
            font-size: 12px;
            line-height: 1.3;
            overflow: hidden;
            text-overflow: ellipsis;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
        }
        
        /* Perform Button */
        .action-perform-btn {
            background: linear-gradient(to bottom, #2a5434, #1e3a26);
            color: #9BC89E;
            border: 1px solid #3a6a44;
            border-radius: 4px;
            padding: 6px 12px;
            font-size: 12px;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.2s ease;
            white-space: nowrap;
            display: flex;
            align-items: center;
            gap: 5px;
            margin-left: 10px;
        }
        
        .action-perform-btn:hover {
            background: linear-gradient(to bottom, #3a6444, #2e4a36);
            border-color: #4a7a54;
            box-shadow: 0 0 5px rgba(155, 200, 158, 0.3);
        }
        
        .action-perform-btn:active {
            transform: scale(0.98);
        }
        
        .action-perform-btn i {
            font-size: 11px;
        }
        
        /* Action Details */
        .action-details {
            border-top: 1px solid rgba(139, 69, 19, 0.3);
            padding: 12px;
            animation: fadeIn 0.2s ease;
        }
        
        @keyframes fadeIn {
            from {
                opacity: 0;
                max-height: 0;
            }
            to {
                opacity: 1;
                max-height: 500px;
            }
        }
        
        .detail-label {
            color: #D4A574;
            font-weight: bold;
            font-size: 12px;
            margin-bottom: 6px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        /* Skills Section */
        .action-skills {
            margin-bottom: 12px;
        }
        
        .skill-list {
            display: flex;
            flex-direction: column;
            gap: 4px;
            margin-left: 10px;
        }
        
        .skill-option {
            color: #a0a0a0;
            font-size: 12px;
            display: flex;
            align-items: baseline;
        }
        
        .skill-name {
            color: #9BC89E;
            font-weight: 600;
            text-transform: capitalize;
            margin-right: 6px;
            min-width: 80px;
        }
        
        .skill-desc {
            color: #808080;
            font-style: italic;
        }
        
        /* Effects Section */
        .action-effects {
            margin-bottom: 12px;
        }
        
        .effects-list {
            display: flex;
            flex-direction: column;
            gap: 6px;
            margin-left: 10px;
        }
        
        .effect-item {
            display: flex;
            align-items: flex-start;
            font-size: 12px;
            line-height: 1.4;
        }
        
        .effect-level {
            font-weight: 600;
            margin-right: 8px;
            min-width: 120px;
            display: flex;
            align-items: center;
            gap: 4px;
        }
        
        .effect-level i {
            font-size: 10px;
        }
        
        .effect-desc {
            color: #a0a0a0;
            flex: 1;
        }
        
        .critical-success .effect-level {
            color: #4a9eff;
        }
        
        .success .effect-level {
            color: #4CAF50;
        }
        
        .failure .effect-level {
            color: #ff9800;
        }
        
        .critical-failure .effect-level {
            color: #f44336;
        }
        
        /* Proficiency Scaling */
        .proficiency-scaling {
            margin-bottom: 12px;
        }
        
        .scaling-list {
            display: flex;
            flex-wrap: wrap;
            gap: 12px;
            margin-left: 10px;
            margin-top: 6px;
        }
        
        .scaling-item {
            display: flex;
            align-items: center;
            gap: 4px;
            font-size: 12px;
            background: rgba(0, 0, 0, 0.3);
            padding: 3px 8px;
            border-radius: 3px;
            border: 1px solid rgba(139, 69, 19, 0.4);
        }
        
        .scaling-level {
            color: #D4A574;
            font-weight: 600;
        }
        
        .scaling-value {
            color: #9BC89E;
        }
        
        /* Special Section */
        .action-special {
            margin-bottom: 12px;
        }
        
        .special-text {
            color: #FFD700;
            font-size: 12px;
            margin-left: 10px;
            font-style: italic;
            line-height: 1.4;
            background: rgba(255, 215, 0, 0.05);
            padding: 6px 8px;
            border-left: 2px solid #FFD700;
            border-radius: 2px;
        }
        
        /* Cost Section */
        .action-cost {
            margin-bottom: 8px;
        }
        
        .cost-list {
            display: flex;
            gap: 12px;
            margin-left: 10px;
            margin-top: 6px;
        }
        
        .cost-item {
            display: flex;
            align-items: center;
            gap: 4px;
            font-size: 12px;
            color: #ff9800;
            font-weight: 600;
            background: rgba(255, 152, 0, 0.1);
            padding: 3px 8px;
            border-radius: 3px;
            border: 1px solid rgba(255, 152, 0, 0.3);
        }
        
        .cost-item i {
            font-size: 11px;
        }
        
        /* Action Category Headers */
        .action-category {
            margin-bottom: 16px;
        }
        
        .action-category-header {
            background: linear-gradient(to right, rgba(139, 69, 19, 0.4), transparent);
            border-left: 3px solid #8B4513;
            padding: 8px 12px;
            margin-bottom: 8px;
        }
        
        .action-category-title {
            font-size: 16px;
            font-weight: bold;
            color: #D4A574;
            margin-bottom: 2px;
        }
        
        .action-category-desc {
            font-size: 12px;
            color: #a0a0a0;
            font-style: italic;
        }
        
        .action-category-list {
            padding-left: 8px;
        }
        
        /* Responsive adjustments */
        @media (max-width: 768px) {
            .action-header {
                flex-wrap: wrap;
            }
            
            .action-perform-btn {
                margin-left: 30px;
                margin-top: 8px;
            }
            
            .effect-level {
                min-width: 100px;
            }
            
            .skill-name {
                min-width: 60px;
            }
        }
    """.trimIndent()
}
