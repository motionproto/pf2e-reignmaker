/**
 * PhaseExecutor Interface - Shared contract for all phase controllers
 * Ensures consistent behavior across all six kingdom turn phases
 */

export interface PhaseResult {
    success: boolean;
    completed: boolean;
    changes: Map<string, number>;
    messages: string[];
    error?: string;
}

export interface PhaseStatus {
    canExecute: boolean;
    completed: boolean;
    requiredSteps: string[];
    completedSteps: string[];
    blockers: string[];
}

/**
 * Common interface that all phase controllers must implement
 * This ensures consistent orchestration through TurnManager
 */
export interface PhaseExecutor {
    /**
     * Check if this phase can be executed
     */
    canExecute(): boolean;
    
    /**
     * Execute the phase logic
     */
    execute(): Promise<PhaseResult>;
    
    /**
     * Validate that phase is complete and can advance
     */
    validate(): boolean;
    
    /**
     * Get current phase status
     */
    getStatus(): PhaseStatus;
    
    /**
     * Get list of required steps for this phase
     */
    getRequiredSteps(): string[];
    
    /**
     * Mark a specific step as completed
     */
    markStepCompleted(stepId: string): Promise<void>;
    
    /**
     * Reset phase state for new execution
     */
    reset(): void;
}
