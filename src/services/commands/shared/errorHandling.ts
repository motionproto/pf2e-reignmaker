/**
 * Shared error handling utilities for game commands
 */

import type { ResolveResult } from '../types';

/**
 * Create error result (ResolveResult pattern)
 * 
 * @param error - Error message or Error object
 * @returns ResolveResult with error
 */
export function createErrorResult(error: string | Error): ResolveResult {
  return {
    success: false,
    error: error instanceof Error ? error.message : error
  };
}

/**
 * Create success result (ResolveResult pattern)
 * 
 * @param message - Success message
 * @param data - Optional additional data
 * @returns ResolveResult with success
 */
export function createSuccessResult(message: string, data?: any): ResolveResult {
  return { 
    success: true, 
    data: { message, ...data } 
  };
}
