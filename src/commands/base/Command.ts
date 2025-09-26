/**
 * Command Pattern Base Classes
 * 
 * These classes implement the command pattern for state mutations,
 * providing validation, execution, and rollback capabilities.
 */

import type { KingdomState } from '../../models/KingdomState';

/**
 * Result of command execution
 */
export interface CommandResult<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    rollback?: () => void | Promise<void>;
}

/**
 * Context for command execution
 */
export interface CommandContext {
    kingdomState: KingdomState;
    currentTurn: number;
    currentPhase: string;
    actorId?: string;
}

/**
 * Abstract base class for all commands
 */
export abstract class Command<T = any> {
    protected context?: CommandContext;
    protected executedAt?: Date;
    
    /**
     * Get command name for logging/debugging
     */
    abstract getName(): string;
    
    /**
     * Get human-readable description
     */
    abstract getDescription(): string;
    
    /**
     * Check if command can be executed in current state
     */
    abstract canExecute(context: CommandContext): boolean;
    
    /**
     * Execute the command
     */
    abstract execute(context: CommandContext): CommandResult<T> | Promise<CommandResult<T>>;
    
    /**
     * Validate command parameters
     */
    protected abstract validate(): string | null;
    
    /**
     * Store context for potential rollback
     */
    protected setContext(context: CommandContext): void {
        this.context = context;
        this.executedAt = new Date();
    }
    
    /**
     * Get stored context
     */
    protected getContext(): CommandContext | undefined {
        return this.context;
    }
}

/**
 * Composite command that executes multiple commands
 */
export class CompositeCommand extends Command<any[]> {
    protected commands: Command[] = [];
    protected executedCommands: Command[] = [];
    
    constructor(commands: Command[]) {
        super();
        this.commands = commands;
    }
    
    getName(): string {
        return 'CompositeCommand';
    }
    
    getDescription(): string {
        return `Execute ${this.commands.length} commands`;
    }
    
    canExecute(context: CommandContext): boolean {
        return this.commands.every(cmd => cmd.canExecute(context));
    }
    
    async execute(context: CommandContext): Promise<CommandResult<any[]>> {
        this.setContext(context);
        const results: any[] = [];
        this.executedCommands = [];
        
        for (const command of this.commands) {
            const result = await command.execute(context);
            
            if (!result.success) {
                // Rollback all executed commands
                await this.rollbackExecuted();
                return {
                    success: false,
                    error: `Command ${command.getName()} failed: ${result.error}`
                };
            }
            
            results.push(result.data);
            this.executedCommands.push(command);
        }
        
        return {
            success: true,
            data: results,
            rollback: async () => await this.rollbackExecuted()
        };
    }
    
    protected validate(): string | null {
        if (this.commands.length === 0) {
            return 'No commands to execute';
        }
        return null;
    }
    
    private async rollbackExecuted(): Promise<void> {
        // Rollback in reverse order
        for (let i = this.executedCommands.length - 1; i >= 0; i--) {
            const command = this.executedCommands[i];
            const context = command.getContext();
            if (context) {
                const result = await command.execute(context);
                if (result.rollback) {
                    await result.rollback();
                }
            }
        }
        this.executedCommands = [];
    }
}

/**
 * Macro command that records and replays a series of commands
 */
export class MacroCommand extends CompositeCommand {
    private name: string;
    
    constructor(name: string, commands: Command[] = []) {
        super(commands);
        this.name = name;
    }
    
    getName(): string {
        return `Macro: ${this.name}`;
    }
    
    getDescription(): string {
        return `Replay macro '${this.name}' with ${this.commands.length} commands`;
    }
    
    addCommand(command: Command): void {
        this.commands.push(command);
    }
    
    clearCommands(): void {
        this.commands = [];
        this.executedCommands = [];
    }
}
