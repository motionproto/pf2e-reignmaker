package kingdom.lite.ui.styles

/**
 * Styles for Kingdom Events Phase
 * Provides styling for event cards, skill checks, and results display
 */
object EventStyles {
    fun inject() {
        val style = """
            /* Event Phase Container */
            .event-phase-container {
                padding: 1rem;
                max-width: 800px;
                margin: 0 auto;
            }
            
            /* Stability Check Section */
            .stability-check-section {
                background: var(--pf2e-color-surface);
                border: 1px solid var(--pf2e-color-border);
                border-radius: 8px;
                padding: 1.5rem;
                text-align: center;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            }
            
            .stability-check-section h3 {
                color: var(--pf2e-color-primary);
                font-size: 1.5rem;
                margin-bottom: 1rem;
            }
            
            .event-description {
                font-size: 1rem;
                color: var(--pf2e-color-text);
                margin-bottom: 1.5rem;
                line-height: 1.6;
            }
            
            .dc-info {
                display: flex;
                justify-content: center;
                align-items: center;
                gap: 0.5rem;
                margin-bottom: 1.5rem;
                font-size: 1.2rem;
            }
            
            .dc-label {
                font-weight: 600;
                color: var(--pf2e-color-text-muted);
            }
            
            .dc-value {
                font-weight: bold;
                font-size: 1.4rem;
                color: var(--pf2e-color-primary);
                padding: 0.25rem 0.75rem;
                background: var(--pf2e-color-bg-light);
                border: 2px solid var(--pf2e-color-primary);
                border-radius: 4px;
            }
            
            .event-check-btn {
                padding: 0.75rem 2rem;
                font-size: 1.1rem;
                background: var(--pf2e-color-primary);
                color: white;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                transition: all 0.3s ease;
                display: inline-flex;
                align-items: center;
                gap: 0.5rem;
            }
            
            .event-check-btn:hover {
                background: var(--pf2e-color-primary-dark);
                transform: translateY(-1px);
                box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
            }
            
            /* Check Result Display */
            .check-result-display {
                margin-top: 1.5rem;
                min-height: 60px;
            }
            
            .roll-result {
                padding: 1rem;
                border-radius: 6px;
                font-size: 1.1rem;
                animation: slideIn 0.5s ease-out;
            }
            
            .roll-result.success {
                background: var(--pf2e-color-success-bg);
                border: 2px solid var(--pf2e-color-success);
                color: var(--pf2e-color-success-dark);
            }
            
            .roll-result.failure {
                background: var(--pf2e-color-warning-bg);
                border: 2px solid var(--pf2e-color-warning);
                color: var(--pf2e-color-warning-dark);
            }
            
            /* Event Card */
            .event-card {
                background: var(--pf2e-color-surface);
                border: 2px solid var(--pf2e-color-border);
                border-radius: 12px;
                overflow: hidden;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                animation: fadeIn 0.5s ease-out;
            }
            
            .event-header {
                background: linear-gradient(135deg, var(--pf2e-color-primary), var(--pf2e-color-primary-dark));
                color: white;
                padding: 1.5rem;
                position: relative;
            }
            
            .event-title {
                font-size: 1.8rem;
                margin: 0 0 0.5rem 0;
                text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
            }
            
            .event-traits {
                display: flex;
                gap: 0.5rem;
                flex-wrap: wrap;
            }
            
            .event-trait {
                padding: 0.25rem 0.75rem;
                background: rgba(255, 255, 255, 0.2);
                border: 1px solid rgba(255, 255, 255, 0.4);
                border-radius: 12px;
                font-size: 0.85rem;
                text-transform: uppercase;
                font-weight: 600;
                backdrop-filter: blur(10px);
            }
            
            .event-trait.beneficial {
                background: var(--pf2e-color-success);
                border-color: var(--pf2e-color-success-dark);
                color: white;
            }
            
            .event-trait.dangerous {
                background: var(--pf2e-color-danger);
                border-color: var(--pf2e-color-danger-dark);
                color: white;
            }
            
            .event-trait.continuous {
                background: var(--pf2e-color-warning);
                border-color: var(--pf2e-color-warning-dark);
                color: white;
            }
            
            /* Event Image */
            .event-image-container {
                width: 100%;
                height: 200px;
                overflow: hidden;
                background: var(--pf2e-color-bg-dark);
                border-top: 1px solid var(--pf2e-color-border);
                border-bottom: 1px solid var(--pf2e-color-border);
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .event-image {
                width: 100%;
                height: 100%;
                object-fit: cover;
                filter: brightness(0.95);
            }
            
            /* Event Body */
            .event-body {
                padding: 1.5rem;
            }
            
            .event-special {
                background: var(--pf2e-color-info-bg);
                border-left: 4px solid var(--pf2e-color-info);
                color: var(--pf2e-color-info-dark);
                padding: 0.75rem 1rem;
                margin: 1rem 0;
                border-radius: 4px;
                font-size: 0.9rem;
                font-style: italic;
            }
            
            .event-special i {
                margin-right: 0.5rem;
                color: var(--pf2e-color-info);
            }
            
            /* Event Resolution */
            .event-resolution {
                margin-top: 1.5rem;
                padding-top: 1.5rem;
                border-top: 2px dashed var(--pf2e-color-border);
            }
            
            .event-resolution h4 {
                color: var(--pf2e-color-primary);
                margin-bottom: 1rem;
                font-size: 1.2rem;
            }
            
            .skill-options {
                display: flex;
                flex-wrap: wrap;
                gap: 0.75rem;
                justify-content: center;
            }
            
            .skill-btn {
                flex: 1 1 calc(33% - 0.5rem);
                min-width: 120px;
                padding: 0.75rem 1rem;
                background: var(--pf2e-color-bg-light);
                border: 2px solid var(--pf2e-color-primary);
                border-radius: 6px;
                color: var(--pf2e-color-primary);
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s ease;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 0.5rem;
            }
            
            .skill-btn:hover {
                background: var(--pf2e-color-primary);
                color: white;
                transform: translateY(-2px);
                box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
            }
            
            .skill-btn i {
                font-size: 1.1rem;
            }
            
            /* Event Result Display */
            .event-result-display {
                margin-top: 1.5rem;
            }
            
            .resolution-result {
                background: var(--pf2e-color-bg-light);
                border: 2px solid var(--pf2e-color-border);
                border-radius: 8px;
                padding: 1.5rem;
                animation: slideIn 0.5s ease-out;
            }
            
            .roll-display {
                font-size: 1rem;
                color: var(--pf2e-color-text-muted);
                margin-bottom: 1rem;
                padding: 0.5rem;
                background: white;
                border-radius: 4px;
                font-family: var(--font-mono);
            }
            
            .outcome-message {
                font-size: 1.1rem;
                font-weight: 600;
                padding: 1rem;
                margin-bottom: 1rem;
                border-radius: 6px;
            }
            
            .outcome-message.success {
                background: var(--pf2e-color-success-bg);
                color: var(--pf2e-color-success-dark);
                border: 1px solid var(--pf2e-color-success);
            }
            
            .outcome-message.failure {
                background: var(--pf2e-color-danger-bg);
                color: var(--pf2e-color-danger-dark);
                border: 1px solid var(--pf2e-color-danger);
            }
            
            .outcome-effects {
                font-size: 1rem;
                color: var(--pf2e-color-text);
                padding: 0.75rem;
                background: white;
                border: 1px solid var(--pf2e-color-border);
                border-radius: 4px;
                margin-bottom: 1rem;
                text-align: center;
                font-weight: 600;
            }
            
            /* Continuous Events Section */
            .continuous-events-section {
                margin-top: 2rem;
                padding: 1rem;
                background: var(--pf2e-color-warning-bg);
                border: 2px solid var(--pf2e-color-warning);
                border-radius: 8px;
            }
            
            .continuous-events-section h4 {
                color: var(--pf2e-color-warning-dark);
                margin-bottom: 1rem;
                font-size: 1.1rem;
                text-transform: uppercase;
                letter-spacing: 1px;
            }
            
            .continuous-events-list {
                display: flex;
                flex-direction: column;
                gap: 0.5rem;
            }
            
            .continuous-event-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 0.5rem 1rem;
                background: white;
                border: 1px solid var(--pf2e-color-warning);
                border-radius: 4px;
            }
            
            .continuous-event-item .event-name {
                font-weight: 600;
                color: var(--pf2e-color-text);
            }
            
            /* Animations */
            @keyframes fadeIn {
                from {
                    opacity: 0;
                    transform: scale(0.95);
                }
                to {
                    opacity: 1;
                    transform: scale(1);
                }
            }
            
            @keyframes slideIn {
                from {
                    opacity: 0;
                    transform: translateY(-10px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
            
            /* Button States */
            .btn-primary {
                padding: 0.75rem 1.5rem;
                background: var(--pf2e-color-primary);
                color: white;
                border: none;
                border-radius: 6px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s ease;
            }
            
            .btn-primary:hover {
                background: var(--pf2e-color-primary-dark);
                transform: translateY(-1px);
                box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
            }
            
            .btn-primary:disabled {
                background: var(--pf2e-color-bg-dark);
                color: var(--pf2e-color-text-muted);
                cursor: not-allowed;
                transform: none;
                box-shadow: none;
            }
        """
        
        // Inject the styles into the document
        val styleElement = kotlinx.browser.document.createElement("style")
        styleElement.textContent = style
        kotlinx.browser.document.head?.appendChild(styleElement)
    }
}
