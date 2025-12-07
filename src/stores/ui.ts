import { writable } from 'svelte/store';
import type { Settlement } from '../models/Settlement';

// UI State for navigation and display
export interface UIState {
    selectedTab: 'turn' | 'setup' | 'territory' | 'settlements' | 'armies' | 'structures' | 'factions' | 'modifiers' | 'notes' | 'simulation';
    isPhasePanelExpanded: boolean;
    isResourcePanelExpanded: boolean;
    isSaving: boolean;
    isLoading: boolean;
    errorMessage: string | null;
    successMessage: string | null;
}

// Structure selection state
export interface StructureSelectionState {
    selectedStructureId: string | null;
    selectedCategory: string | null;
    viewMode: 'view' | 'select' | 'preview';
    targetSettlement: Settlement | null;
    searchQuery: string;
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

// Structure selection store and helpers
export const structureSelection = writable<StructureSelectionState>({
    selectedStructureId: null,
    selectedCategory: null,
    viewMode: 'view',
    targetSettlement: null,
    searchQuery: ''
});

export function setStructureViewMode(mode: 'view' | 'select' | 'preview') {
    structureSelection.update(state => ({
        ...state,
        viewMode: mode
    }));
}

export function selectStructure(structureId: string | null) {
    structureSelection.update(state => ({
        ...state,
        selectedStructureId: structureId
    }));
}

export function setTargetSettlement(settlement: Settlement | null) {
    structureSelection.update(state => ({
        ...state,
        targetSettlement: settlement
    }));
}

export function setStructureCategory(category: string | null) {
    structureSelection.update(state => ({
        ...state,
        selectedCategory: category
    }));
}

export function setStructureSearchQuery(query: string) {
    structureSelection.update(state => ({
        ...state,
        searchQuery: query
    }));
}

export function resetStructureSelection() {
    structureSelection.set({
        selectedStructureId: null,
        selectedCategory: null,
        viewMode: 'view',
        targetSettlement: null,
        searchQuery: ''
    });
}
