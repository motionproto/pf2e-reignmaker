import { writable } from 'svelte/store';

// UI State for navigation and display
export interface UIState {
    selectedTab: 'turn' | 'settlements' | 'factions' | 'modifiers' | 'notes';
    isPhasePanelExpanded: boolean;
    isResourcePanelExpanded: boolean;
    isSaving: boolean;
    isLoading: boolean;
    errorMessage: string | null;
    successMessage: string | null;
}

const initialUIState: UIState = {
    selectedTab: 'turn',
    isPhasePanelExpanded: true,
    isResourcePanelExpanded: true,
    isSaving: false,
    isLoading: false,
    errorMessage: null,
    successMessage: null
};

// Main UI state store
export const uiState = writable<UIState>(initialUIState);

// Actions to modify UI state
export function setSelectedTab(tab: UIState['selectedTab']) {
    uiState.update(state => ({
        ...state,
        selectedTab: tab
    }));
}

export function togglePhasePanel() {
    uiState.update(state => ({
        ...state,
        isPhasePanelExpanded: !state.isPhasePanelExpanded
    }));
}

export function toggleResourcePanel() {
    uiState.update(state => ({
        ...state,
        isResourcePanelExpanded: !state.isResourcePanelExpanded
    }));
}

export function setLoading(isLoading: boolean) {
    uiState.update(state => ({
        ...state,
        isLoading
    }));
}

export function setSaving(isSaving: boolean) {
    uiState.update(state => ({
        ...state,
        isSaving
    }));
}

export function showError(message: string) {
    uiState.update(state => ({
        ...state,
        errorMessage: message,
        successMessage: null
    }));
    
    // Clear error after 5 seconds
    setTimeout(() => {
        uiState.update(state => ({
            ...state,
            errorMessage: null
        }));
    }, 5000);
}

export function showSuccess(message: string) {
    uiState.update(state => ({
        ...state,
        successMessage: message,
        errorMessage: null
    }));
    
    // Clear success message after 3 seconds
    setTimeout(() => {
        uiState.update(state => ({
            ...state,
            successMessage: null
        }));
    }, 3000);
}

export function clearMessages() {
    uiState.update(state => ({
        ...state,
        errorMessage: null,
        successMessage: null
    }));
}

export function resetUIState() {
    uiState.set(initialUIState);
}
