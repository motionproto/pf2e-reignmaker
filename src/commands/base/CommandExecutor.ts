/**
 * CommandExecutor - Manages command execution, validation, and history
 * 
 * This class provides the infrastructure for executing commands with
 * support for undo/redo, validation, and event logging.
 */

import type { Command, CommandContext, CommandResult } from './Command';
import { CommandHistory } from './CommandHistory';
import { kingdomState as kingdomStore } from '../../stores/kingdom';

export interface ExecutionOptions {
    skipValidation?: boolean;
    skipHistory?: boolean;
    allowPartialSuccess?: boolean;
}

export interface ExecutionEvent {
    command: string;
    timestamp: Date;
    result: CommandResult;
    context: CommandContext;
}

export type ExecutionListener = (event: ExecutionEvent) => void;

export class CommandExecutor {
    private history: CommandHistory;
    private listeners: Set<ExecutionListener> = new Set();
    private isExecuting: boolean = false;
    private lastContext?: CommandContext;
    
    constructor(maxHistorySize: number = 100) {
        this.history = new CommandHistory(maxHistorySize);
    }
    
    /**
     * Execute a command with validation and history tracking
     */
    async execute<T>(
        command: Command<T>,
        context: CommandContext,
        options: ExecutionOptions = {}
    ): Promise<CommandResult<T>> {
        // Prevent nested execution
        if (this.isExecuting && !options.allowPartialSuccess) {
            return {
                success: false,
                error: 'Another command is currently executing'
            };
        }
        
        this.isExecuting = true;
        this.lastContext = context;
        
        try {
            // Validate command can be executed
            if (!options.skipValidation) {
                if (!command.canExecute(context)) {
                    return {
                        success: false,
                        error: `Command ${command.getName()} cannot be executed in current state`
                    };
                }
            }
            
            // Execute the command
            const result = await command.execute(context);
            
            // Add to history if successful and not skipped
            if (result.success && !options.skipHistory) {
                this.history.add(command);
            }
            
            // If the command was successful and modified kingdom state,
            // trigger Svelte store update to ensure reactivity
            if (result.success && context.kingdomState) {
                kingdomStore.update(state => state);
            }
            
            // Notify listeners
            this.notifyListeners({
                command: command.getName(),
                timestamp: new Date(),
                result,
                context
            });
            
            return result;
            
        } finally {
            this.isExecuting = false;
        }
    }
    
    /**
     * Execute multiple commands in sequence
     */
    async executeSequence<T>(
        commands: Command<T>[],
        context: CommandContext,
        options: ExecutionOptions = {}
    ): Promise<CommandResult<T[]>> {
        const results: T[] = [];
        const executedCommands: Command<T>[] = [];
        
        for (const command of commands) {
            const result = await this.execute(command, context, {
                ...options,
                skipHistory: true // We'll add the batch to history
            });
            
            if (!result.success) {
                // Rollback executed commands if needed
                if (!options.allowPartialSuccess) {
                    await this.rollbackCommands(executedCommands, context);
                    return {
                        success: false,
                        error: `Sequence failed at ${command.getName()}: ${result.error}`
                    };
                }
            } else {
                results.push(result.data as T);
                executedCommands.push(command);
            }
        }
        
        // Add successful sequence to history
        if (!options.skipHistory && executedCommands.length > 0) {
            executedCommands.forEach(cmd => this.history.add(cmd));
        }
        
        return {
            success: true,
            data: results
        };
    }
    
    /**
     * Undo the last command
     */
    async undo(): Promise<CommandResult> {
        const command = this.history.undo();
        
        if (!command) {
            return {
                success: false,
                error: 'Nothing to undo'
            };
        }
        
        // Re-execute with the stored context to revert
        const context = this.lastContext || this.createDefaultContext();
        const result = await command.execute(context);
        
        if (result.rollback) {
            await result.rollback();
            return {
                success: true,
                data: `Undone: ${command.getName()}`
            };
        }
        
        return {
            success: false,
            error: 'Command does not support undo'
        };
    }
    
    /**
     * Redo the last undone command
     */
    async redo(): Promise<CommandResult> {
        const command = this.history.redo();
        
        if (!command) {
            return {
                success: false,
                error: 'Nothing to redo'
            };
        }
        
        const context = this.lastContext || this.createDefaultContext();
        return await this.execute(command, context, { skipHistory: true });
    }
    
    /**
     * Clear command history
     */
    clearHistory(): void {
        this.history.clear();
    }
    
    /**
     * Get command history
     */
    getHistory(): Command[] {
        return this.history.getAll();
    }
    
    /**
     * Check if undo is available
     */
    canUndo(): boolean {
        return this.history.canUndo();
    }
    
    /**
     * Check if redo is available
     */
    canRedo(): boolean {
        return this.history.canRedo();
    }
    
    /**
     * Add an execution listener
     */
    addListener(listener: ExecutionListener): void {
        this.listeners.add(listener);
    }
    
    /**
     * Remove an execution listener
     */
    removeListener(listener: ExecutionListener): void {
        this.listeners.delete(listener);
    }
    
    /**
     * Notify all listeners of an execution event
     */
    private notifyListeners(event: ExecutionEvent): void {
        this.listeners.forEach(listener => {
            try {
                listener(event);
            } catch (error) {
                console.error('Error in execution listener:', error);
            }
        });
    }
    
    /**
     * Rollback a series of commands
     */
    private async rollbackCommands<T>(
        commands: Command<T>[],
        context: CommandContext
    ): Promise<void> {
        // Rollback in reverse order
        for (let i = commands.length - 1; i >= 0; i--) {
            const command = commands[i];
            const result = await command.execute(context);
            
            if (result.rollback) {
                try {
                    await result.rollback();
                } catch (error) {
                    console.error(`Failed to rollback ${command.getName()}:`, error);
                }
            }
        }
    }
    
    /**
     * Create a default context when none is available
     */
    private createDefaultContext(): CommandContext {
        // This would typically be provided by the application
        // but we need a fallback for undo/redo operations
        throw new Error('No context available for command execution');
    }
}

// Export singleton instance for global command execution
export const commandExecutor = new CommandExecutor();
