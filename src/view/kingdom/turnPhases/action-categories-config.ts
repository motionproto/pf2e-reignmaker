/**
 * Action Categories Configuration
 * 
 * Defines the categories used to organize player actions in the Actions Phase UI.
 */

export interface ActionCategory {
  id: string;
  name: string;
  icon: string;
  description: string;
}

/**
 * Action categories for the Actions Phase.
 * 
 * These categories group related actions together for better organization
 * and discoverability in the UI.
 */
export const ACTION_CATEGORIES: ActionCategory[] = [
  {
    id: "uphold-stability",
    name: "Uphold Stability",
    icon: "fa-shield-alt",
    description: "Maintain the kingdom's cohesion by resolving crises and quelling unrest."
  },
  {
    id: "military-operations",
    name: "Military Operations",
    icon: "fa-chess-knight",
    description: "War must be waged with steel and strategy."
  },
  {
    id: "expand-borders",
    name: "Expand the Borders",
    icon: "fa-map-marked-alt",
    description: "Seize new territory to grow your influence and resources."
  },
  {
    id: "urban-planning",
    name: "Urban Planning",
    icon: "fa-city",
    description: "Your people need places to live, work, trade, and worship."
  },
  {
    id: "foreign-affairs",
    name: "Foreign Affairs",
    icon: "fa-handshake",
    description: "No kingdom stands alone."
  },
  {
    id: "economic-resources",
    name: "Economic Actions",
    icon: "fa-coins",
    description: "Manage trade and personal wealth."
  }
];
