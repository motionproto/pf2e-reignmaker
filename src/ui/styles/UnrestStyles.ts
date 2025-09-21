// Auto-converted from UnrestStyles.kt
// TODO: Review and fix TypeScript-specific issues


/**
 * Styles for the Unrest system and Incident displays
 */
export const UnrestStyles = {
    getStyles(): string {
        return `
        /* Unrest Dashboard */
        .unrest-dashboard {
            background: linear-gradient(to bottom, #f8f9fa, #e9ecef);
            border: 2px solid #8b0000;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 20px;
            box-shadow: 0 4px 6px rgba(139,0,0,0.1);
        }
        
        .unrest-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 20px;
            padding-bottom: 15px;
            border-bottom: 2px solid #8b0000;
        }
        
        .unrest-title {
            display: flex;
            align-items: center;
            gap: 12px;
            font-size: 24px;
            font-weight: bold;
            color: #5e0000;
        }
        
        .unrest-icon {
            font-size: 28px;
            color: #8b0000;
            filter: drop-shadow(0 2px 3px rgba(139,0,0,0.3));
        }
        
        /* Unrest Value Display */
        .unrest-value-display {
            display: flex;
            align-items: center;
            gap: 15px;
            background: white;
            padding: 12px 20px;
            border-radius: 6px;
            border: 1px solid #d4c4a0;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .unrest-current {
            font-size: 32px;
            font-weight: bold;
            color: #8b0000;
        }
        
        .unrest-tier-badge {
            padding: 6px 12px;
            border-radius: 20px;
            font-weight: bold;
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
        
        .tier-stable {
            background: linear-gradient(to bottom, #51cf66, #37b24d);
            color: white;
            border: 1px solid #2f9e44;
        }
        
        .tier-discontent {
            background: linear-gradient(to bottom, #ffd43b, #fab005);
            color: #5e0000;
            border: 1px solid #f59f00;
        }
        
        .tier-turmoil {
            background: linear-gradient(to bottom, #ff8787, #fa5252);
            color: white;
            border: 1px solid #e03131;
        }
        
        .tier-rebellion {
            background: linear-gradient(to bottom, #8b0000, #5e0000);
            color: white;
            border: 1px solid #3a0000;
            animation: pulse-danger 2s infinite;
        }
        pulse-danger {
            0% { box-shadow: 0 2px 4px rgba(139,0,0,0.2); }
            50% { box-shadow: 0 2px 8px rgba(139,0,0,0.5); }
            100% { box-shadow: 0 2px 4px rgba(139,0,0,0.2); }
        }
        
        /* Penalty Display */
        .unrest-penalty {
            background: rgba(139,0,0,0.1);
            border: 1px solid #8b0000;
            border-radius: 6px;
            padding: 8px 12px;
            margin-top: 12px;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .penalty-icon {
            color: #8b0000;
            font-size: 18px;
        }
        
        .penalty-text {
            color: #5e0000;
            font-weight: 500;
        }
        
        .penalty-value {
            font-weight: bold;
            color: #8b0000;
            font-size: 18px;
        }
        
        /* Incident Section */
        .incident-section {
            background: white;
            border: 2px solid #b8860b;
            border-radius: 8px;
            padding: 20px;
            margin-top: 20px;
            box-shadow: 0 4px 6px rgba(184,134,11,0.15);
        }
        
        .incident-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 20px;
            padding-bottom: 15px;
            border-bottom: 2px solid #b8860b;
        }
        
        .incident-title {
            font-size: 20px;
            font-weight: bold;
            color: #5e0000;
        }
        
        .roll-incident-btn {
            padding: 10px 20px;
            background: linear-gradient(to bottom, #8b0000, #5e0000);
            color: white;
            border: 1px solid #3a0000;
            border-radius: 6px;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.3s;
            font-size: 16px;
            box-shadow: 0 3px 6px rgba(139,0,0,0.3);
        }
        
        .roll-incident-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 8px rgba(139,0,0,0.4);
            background: linear-gradient(to bottom, #a00000, #700000);
        }
        
        .roll-incident-btn:active {
            transform: translateY(0);
            box-shadow: 0 2px 4px rgba(139,0,0,0.3);
        }
        
        /* Incident Display */
        .incident-display {
            background: linear-gradient(to bottom, #fffbf0, #fef6e4);
            border: 1px solid #d4c4a0;
            border-radius: 8px;
            padding: 20px;
            margin-top: 20px;
        }
        
        .incident-image-container {
            position: relative;
            width: 100%;
            max-width: 600px;
            margin: 0 auto 20px;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 4px 8px rgba(0,0,0,0.2);
        }
        
        .incident-image {
            width: 100%;
            height: auto;
            display: block;
        }
        
        .incident-level-overlay {
            position: absolute;
            top: 10px;
            right: 10px;
            padding: 8px 16px;
            border-radius: 20px;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            font-size: 14px;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        }
        
        .level-minor {
            background: rgba(255,212,59,0.95);
            color: #5e0000;
            border: 2px solid #fab005;
        }
        
        .level-moderate {
            background: rgba(255,135,135,0.95);
            color: white;
            border: 2px solid #fa5252;
        }
        
        .level-major {
            background: rgba(139,0,0,0.95);
            color: white;
            border: 2px solid #5e0000;
        }
        
        .incident-info {
            text-align: center;
            margin-bottom: 20px;
        }
        
        .incident-name {
            font-size: 28px;
            font-weight: bold;
            color: #8b0000;
            margin-bottom: 10px;
            text-shadow: 1px 1px 2px rgba(139,0,0,0.2);
        }
        
        .incident-description {
            font-size: 18px;
            color: #5e0000;
            font-style: italic;
            margin-bottom: 15px;
        }
        
        /* Skill Options */
        .skill-options {
            margin-top: 20px;
            padding: 15px;
            background: rgba(255,255,255,0.8);
            border: 1px solid #d4c4a0;
            border-radius: 6px;
        }
        
        .skill-options-title {
            font-size: 18px;
            font-weight: bold;
            color: #5e0000;
            margin-bottom: 15px;
            text-align: center;
        }
        
        .skill-option-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 12px;
        }
        
        .skill-option-btn {
            padding: 12px 16px;
            background: linear-gradient(to bottom, #f8f9fa, #e9ecef);
            border: 2px solid #b8860b;
            border-radius: 6px;
            cursor: pointer;
            transition: all 0.3s;
            text-align: left;
        }
        
        .skill-option-btn:hover {
            background: linear-gradient(to bottom, #fff, #f8f9fa);
            border-color: #8b0000;
            transform: translateY(-1px);
            box-shadow: 0 3px 6px rgba(184,134,11,0.3);
        }
        
        .skill-name {
            font-weight: bold;
            color: #8b0000;
            font-size: 16px;
            margin-bottom: 4px;
        }
        
        .skill-description {
            font-size: 14px;
            color: #5e0000;
            font-style: italic;
        }
        
        /* Effects Display */
        .incident-effects {
            margin-top: 20px;
            padding: 15px;
            background: rgba(184,134,11,0.05);
            border: 1px solid #d4c4a0;
            border-radius: 6px;
        }
        
        .effect-row {
            display: flex;
            align-items: center;
            padding: 8px 0;
            border-bottom: 1px solid rgba(184,134,11,0.2);
        }
        
        .effect-row:last-child {
            border-bottom: none;
        }
        
        .effect-label {
            font-weight: bold;
            color: #5e0000;
            margin-right: 10px;
            min-width: 120px;
        }
        
        .effect-text {
            color: #191813;
        }
        
        .effect-success {
            color: #2f9e44;
        }
        
        .effect-failure {
            color: #e03131;
        }
        
        /* No Incident Display */
        .no-incident {
            text-align: center;
            padding: 40px;
            background: linear-gradient(to bottom, #e6fcf5, #c3fae8);
            border: 2px solid #51cf66;
            border-radius: 8px;
            margin-top: 20px;
        }
        
        .no-incident-icon {
            font-size: 48px;
            color: #2f9e44;
            margin-bottom: 15px;
        }
        
        .no-incident-text {
            font-size: 20px;
            font-weight: bold;
            color: #2f9e44;
            margin-bottom: 10px;
        }
        
        .no-incident-desc {
            font-size: 16px;
            color: #087f5b;
            font-style: italic;
        }
        
        /* Roll Result Display */
        .roll-result {
            background: rgba(255,255,255,0.9);
            border: 2px solid #b8860b;
            border-radius: 6px;
            padding: 15px;
            margin-top: 15px;
            text-align: center;
        }
        
        .roll-value {
            font-size: 48px;
            font-weight: bold;
            color: #8b0000;
            margin-bottom: 10px;
            text-shadow: 2px 2px 4px rgba(139,0,0,0.2);
        }
        
        .roll-label {
            font-size: 16px;
            color: #5e0000;
            font-weight: 500;
        }
        
        /* Animation for rolling dice */
        dice-roll {
            0% { transform: rotate(0deg); }
            25% { transform: rotate(90deg); }
            50% { transform: rotate(180deg); }
            75% { transform: rotate(270deg); }
            100% { transform: rotate(360deg); }
        }
        
        .rolling {
            animation: dice-roll 0.5s ease-in-out;
        }
    `;
    }
}
