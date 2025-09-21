// Settings content component for PF2e Kingdom Lite
// Manages kingdom settings and configuration

import { ContentComponent } from './ContentComponent';

/**
 * Settings content component
 * Manages kingdom settings and configuration options
 */
export class ContentSettings implements ContentComponent {
    render(): string {
        return `
            <div class="settings-content">
                <h3>Kingdom Settings</h3>
                <div class="settings-group">
                    <label>
                        <input type="checkbox" id="auto-save" checked>
                        Auto-save kingdom data
                    </label>
                </div>
                <div class="settings-group">
                    <label>
                        <input type="checkbox" id="show-hints" checked>
                        Show gameplay hints
                    </label>
                </div>
                <div class="settings-group">
                    <label>
                        <input type="checkbox" id="show-notifications" checked>
                        Show notifications
                    </label>
                </div>
                <div class="settings-group">
                    <button class="reset-kingdom">Reset Kingdom</button>
                    <button class="export-data">Export Data</button>
                    <button class="import-data">Import Data</button>
                </div>
            </div>
        `;
    }
    
    attachListeners(container: HTMLElement): void {
        // Auto-save checkbox
        const autoSave = container.querySelector('#auto-save') as HTMLInputElement | null;
        if (autoSave) {
            autoSave.addEventListener('change', (event) => {
                const checked = (event.target as HTMLInputElement).checked;
                console.log('Auto-save:', checked);
                // TODO: Implement auto-save toggle
            });
        }
        
        // Show hints checkbox
        const showHints = container.querySelector('#show-hints') as HTMLInputElement | null;
        if (showHints) {
            showHints.addEventListener('change', (event) => {
                const checked = (event.target as HTMLInputElement).checked;
                console.log('Show hints:', checked);
                // TODO: Implement hints toggle
            });
        }
        
        // Show notifications checkbox
        const showNotifications = container.querySelector('#show-notifications') as HTMLInputElement | null;
        if (showNotifications) {
            showNotifications.addEventListener('change', (event) => {
                const checked = (event.target as HTMLInputElement).checked;
                console.log('Show notifications:', checked);
                // TODO: Implement notifications toggle
            });
        }
        
        // Reset kingdom button
        const resetButton = container.querySelector('.reset-kingdom') as HTMLButtonElement | null;
        if (resetButton) {
            resetButton.addEventListener('click', () => {
                if (confirm('Are you sure you want to reset your kingdom? This cannot be undone.')) {
                    console.log('Resetting kingdom...');
                    // TODO: Implement kingdom reset
                }
            });
        }
        
        // Export data button
        const exportButton = container.querySelector('.export-data') as HTMLButtonElement | null;
        if (exportButton) {
            exportButton.addEventListener('click', () => {
                console.log('Exporting kingdom data...');
                // TODO: Implement data export
            });
        }
        
        // Import data button
        const importButton = container.querySelector('.import-data') as HTMLButtonElement | null;
        if (importButton) {
            importButton.addEventListener('click', () => {
                console.log('Importing kingdom data...');
                // TODO: Implement data import
            });
        }
    }
}
