// Development entry point for hot reloading without Foundry
import './styles/variables.css';
import './styles/typography.css';
import KingdomAppShell from './view/kingdom/KingdomAppShell.svelte';
import { KingdomState } from './models/KingdomState';

// Mock Foundry game object for development
const mockGame = {
    user: {
        isGM: true,
        name: 'Development User',
        id: 'dev-user-001'
    },
    users: {
        contents: [
            { id: 'dev-user-001', name: 'Development User', isGM: true }
        ]
    },
    settings: {
        get: (module: string, key: string) => {
            console.log(`Mock settings.get: ${module}.${key}`);
            // Return some default values for known settings
            if (key === 'kingdomData') {
                return localStorage.getItem('dev-kingdom-data') || null;
            }
            return null;
        },
        set: async (module: string, key: string, value: any) => {
            console.log(`Mock settings.set: ${module}.${key}`, value);
            if (key === 'kingdomData') {
                localStorage.setItem('dev-kingdom-data', JSON.stringify(value));
            }
            return Promise.resolve();
        }
    },
    i18n: {
        localize: (key: string) => {
            // Return the key as fallback, but could load from lang files
            return key;
        },
        format: (key: string, data: any) => {
            // Simple format implementation
            let result = key;
            if (data) {
                Object.entries(data).forEach(([k, v]) => {
                    result = result.replace(`{${k}}`, String(v));
                });
            }
            return result;
        },
        has: (key: string) => false
    },
    modules: {
        get: (moduleId: string) => ({
            active: true,
            id: moduleId
        })
    }
};

// Set mock game globally (Foundry modules expect this)
(window as any).game = mockGame;
(window as any).Game = mockGame;

// Also mock other Foundry globals that might be referenced
(window as any).ui = {
    notifications: {
        info: (msg: string) => console.log('INFO:', msg),
        warn: (msg: string) => console.warn('WARN:', msg),
        error: (msg: string) => console.error('ERROR:', msg),
    }
};

(window as any).CONFIG = {
    debug: {
        hooks: false
    }
};

// Mock Hooks for Foundry event system
(window as any).Hooks = {
    call: (hook: string, ...args: any[]) => {
        console.log(`Hook called: ${hook}`, args);
        return true;
    },
    callAll: (hook: string, ...args: any[]) => {
        console.log(`Hook callAll: ${hook}`, args);
        return true;
    },
    on: (hook: string, callback: Function) => {
        console.log(`Hook registered: ${hook}`);
        return 1;
    },
    once: (hook: string, callback: Function) => {
        console.log(`Hook once registered: ${hook}`);
        return 1;
    },
    off: (hook: string, id: number) => {
        console.log(`Hook removed: ${hook}`, id);
    }
};

// Create mock kingdom state for development
// Try to load from localStorage first
let savedState = localStorage.getItem('dev-kingdom-data');
let initialState: any;

if (savedState) {
    try {
        initialState = JSON.parse(savedState);
        console.log('Loaded kingdom state from localStorage');
    } catch (e) {
        console.error('Failed to parse saved state', e);
        initialState = null;
    }
}

// If no saved state, use defaults
if (!initialState) {
    initialState = {
        name: "Development Kingdom",
        size: 10,
        level: 1,
        unrest: 0,
        ruin: 0,
        xp: 0,
        fame: 0,
        culture: 5,
        economy: 5,
        loyalty: 5,
        stability: 5,
        currentTurn: 1,
        resourcePoints: 50,
        resourceDice: 4,
        maxUnrest: 20,
        availableActivities: 3,
        bonusActivities: 0,
        activeSettlements: [],
        activeStructures: [],
        activeLeaders: [],
        turnPhase: 'upkeep',
        notes: "Development environment - Changes are saved to browser localStorage"
    };
}

const mockKingdomState = new KingdomState(initialState);

// Save state changes to localStorage
const originalUpdate = mockKingdomState.update.bind(mockKingdomState);
mockKingdomState.update = function(changes: Partial<KingdomState>) {
    const result = originalUpdate(changes);
    localStorage.setItem('dev-kingdom-data', JSON.stringify(this));
    console.log('Kingdom state saved to localStorage');
    return result;
};

// Mount the app
const app = new KingdomAppShell({
    target: document.getElementById('app')!,
    props: {
        kingdom: mockKingdomState
    }
});

// Clear loading indicator
const loadingEl = document.querySelector('.loading');
if (loadingEl) {
    loadingEl.remove();
}

// Enable hot module replacement
if (import.meta.hot) {
    import.meta.hot.accept();
    import.meta.hot.dispose(() => {
        app.$destroy();
    });
}

// Add some dev tools to window for debugging
(window as any).devTools = {
    kingdom: mockKingdomState,
    app: app,
    clearState: () => {
        localStorage.removeItem('dev-kingdom-data');
        console.log('State cleared. Reload to reset.');
    },
    exportState: () => {
        const state = localStorage.getItem('dev-kingdom-data');
        console.log('Current state:', state ? JSON.parse(state) : 'No saved state');
        return state;
    }
};

console.log('%cDevelopment Mode', 'color: #4a90e2; font-size: 16px; font-weight: bold');
console.log('Kingdom UI loaded with mock data');
console.log('Use window.devTools for debugging:');
console.log('  - devTools.kingdom: Access kingdom state');
console.log('  - devTools.clearState(): Clear saved state');
console.log('  - devTools.exportState(): Export current state');

export default app;
