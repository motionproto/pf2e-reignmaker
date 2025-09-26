/**
 * CommandHistory - Manages command history for undo/redo operations
 * 
 * This class maintains a history of executed commands and provides
 * undo/redo functionality with configurable size limits.
 */

import type { Command } from './Command';

export class CommandHistory {
    private history: Command[] = [];
    private currentIndex: number = -1;
    private maxSize: number;
    
    constructor(maxSize: number = 100) {
        this.maxSize = maxSize;
    }
    
    /**
     * Add a command to the history
     */
    add(command: Command): void {
        // Remove any commands after the current index (for redo)
        if (this.currentIndex < this.history.length - 1) {
            this.history = this.history.slice(0, this.currentIndex + 1);
        }
        
        // Add the new command
        this.history.push(command);
        this.currentIndex++;
        
        // Enforce size limit
        if (this.history.length > this.maxSize) {
            const overflow = this.history.length - this.maxSize;
            this.history = this.history.slice(overflow);
            this.currentIndex = Math.max(0, this.currentIndex - overflow);
        }
    }
    
    /**
     * Get the last command and move the pointer back
     */
    undo(): Command | null {
        if (this.currentIndex < 0) {
            return null;
        }
        
        const command = this.history[this.currentIndex];
        this.currentIndex--;
        return command;
    }
    
    /**
     * Get the next command and move the pointer forward
     */
    redo(): Command | null {
        if (this.currentIndex >= this.history.length - 1) {
            return null;
        }
        
        this.currentIndex++;
        return this.history[this.currentIndex];
    }
    
    /**
     * Clear all history
     */
    clear(): void {
        this.history = [];
        this.currentIndex = -1;
    }
    
    /**
     * Get all commands in history
     */
    getAll(): Command[] {
        return [...this.history];
    }
    
    /**
     * Get the current command
     */
    getCurrent(): Command | null {
        if (this.currentIndex < 0 || this.currentIndex >= this.history.length) {
            return null;
        }
        return this.history[this.currentIndex];
    }
    
    /**
     * Check if undo is available
     */
    canUndo(): boolean {
        return this.currentIndex >= 0;
    }
    
    /**
     * Check if redo is available
     */
    canRedo(): boolean {
        return this.currentIndex < this.history.length - 1;
    }
    
    /**
     * Get the size of the history
     */
    size(): number {
        return this.history.length;
    }
    
    /**
     * Get the current position in history
     */
    getPosition(): number {
        return this.currentIndex;
    }
    
    /**
     * Get history statistics
     */
    getStats(): {
        size: number;
        position: number;
        canUndo: boolean;
        canRedo: boolean;
        maxSize: number;
    } {
        return {
            size: this.history.length,
            position: this.currentIndex,
            canUndo: this.canUndo(),
            canRedo: this.canRedo(),
            maxSize: this.maxSize
        };
    }
    
    /**
     * Get a slice of history
     */
    getRange(start: number, end?: number): Command[] {
        return this.history.slice(start, end);
    }
    
    /**
     * Move to a specific position in history
     */
    moveTo(index: number): Command | null {
        if (index < 0 || index >= this.history.length) {
            return null;
        }
        
        this.currentIndex = index;
        return this.history[index];
    }
}
