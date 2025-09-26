/**
 * Formatter Services
 * 
 * This module exports formatting services that handle the presentation
 * logic for game data. These formatters provide consistent display
 * formatting across the application, separate from business logic.
 */

export { StateChangeFormatter, stateChangeFormatter } from './StateChangeFormatter';
export type { ChangeType, FormattedStateChange } from './StateChangeFormatter';

// Future formatters can be added here:
// export { ResourceFormatter } from './ResourceFormatter';
// export { ModifierFormatter } from './ModifierFormatter';
