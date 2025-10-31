/**
 * Custom Action Handlers Configuration
 * 
 * Declarative pattern for actions requiring pre-roll dialogs.
 * Maps action IDs to their dialog requirements and handlers.
 */

export interface CustomActionHandler {
  requiresPreDialog: boolean;
  showDialog: () => void;
  storePending: (skill: string) => void;
}

export type CustomActionHandlers = Record<string, CustomActionHandler>;

/**
 * Creates the custom action handlers configuration.
 * 
 * This is a factory function because the handlers need access to
 * component-level state setters (showDialog flags, pending actions).
 * 
 * @param context - Component state setters
 * @returns Configured action handlers
 */
export function createCustomActionHandlers(context: {
  setShowBuildStructureDialog: (show: boolean) => void;
  setShowRepairStructureDialog: (show: boolean) => void;
  setShowUpgradeSettlementDialog: (show: boolean) => void;
  setShowFactionSelectionDialog: (show: boolean) => void;
  setShowSettlementSelectionDialog: (show: boolean) => void;
  setShowExecuteOrPardonSettlementDialog: (show: boolean) => void;
  setShowTrainArmyDialog: (show: boolean) => void;
  setShowDisbandArmyDialog: (show: boolean) => void;
  setShowOutfitArmyDialog: (show: boolean) => void;
  handleArmyDeployment?: (skill: string) => Promise<void>;
  setPendingBuildAction: (action: { skill: string }) => void;
  setPendingRepairAction: (action: { skill: string }) => void;
  setPendingUpgradeAction: (action: { skill: string }) => void;
  setPendingDiplomaticAction: (action: { skill: string }) => void;
  setPendingStipendAction: (action: { skill: string }) => void;
  setPendingExecuteOrPardonAction: (action: { skill: string }) => void;
  setPendingTrainArmyAction: (action: { skill: string }) => void;
  setPendingDisbandArmyAction: (action: { skill: string }) => void;
  setPendingOutfitArmyAction: (action: { skill: string }) => void;
  setPendingDeployArmyAction: (action: { skill: string }) => void;
}): CustomActionHandlers {
  return {
    'build-structure': {
      requiresPreDialog: true,
      showDialog: () => context.setShowBuildStructureDialog(true),
      storePending: (skill: string) => context.setPendingBuildAction({ skill })
    },
    'repair-structure': {
      requiresPreDialog: true,
      showDialog: () => context.setShowRepairStructureDialog(true),
      storePending: (skill: string) => context.setPendingRepairAction({ skill })
    },
    'upgrade-settlement': {
      requiresPreDialog: true,
      showDialog: () => context.setShowUpgradeSettlementDialog(true),
      storePending: (skill: string) => context.setPendingUpgradeAction({ skill })
    },
    'dimplomatic-mission': {
      requiresPreDialog: true,
      showDialog: () => context.setShowFactionSelectionDialog(true),
      storePending: (skill: string) => context.setPendingDiplomaticAction({ skill })
    },
    'collect-stipend': {
      requiresPreDialog: true,
      showDialog: () => context.setShowSettlementSelectionDialog(true),
      storePending: (skill: string) => context.setPendingStipendAction({ skill })
    },
    'execute-or-pardon-prisoners': {
      requiresPreDialog: true,
      showDialog: () => context.setShowExecuteOrPardonSettlementDialog(true),
      storePending: (skill: string) => context.setPendingExecuteOrPardonAction({ skill })
    },
    'train-army': {
      requiresPreDialog: true,
      showDialog: () => context.setShowTrainArmyDialog(true),
      storePending: (skill: string) => context.setPendingTrainArmyAction({ skill })
    },
    'disband-army': {
      requiresPreDialog: true,
      showDialog: () => context.setShowDisbandArmyDialog(true),
      storePending: (skill: string) => context.setPendingDisbandArmyAction({ skill })
    },
    'outfit-army': {
      requiresPreDialog: true,
      showDialog: () => context.setShowOutfitArmyDialog(true),
      storePending: (skill: string) => context.setPendingOutfitArmyAction({ skill })
    },
    'deploy-army': {
      requiresPreDialog: true,
      showDialog: () => {
        // Deploy army doesn't use a traditional dialog - it uses ArmyDeploymentPanel service
        // The showDialog method is called, but we don't actually show a dialog
        // Instead, the storePending method will handle the actual deployment
      },
      storePending: (skill: string) => {
        context.setPendingDeployArmyAction({ skill });
        // Trigger the deployment panel directly
        if (context.handleArmyDeployment) {
          context.handleArmyDeployment(skill);
        }
      }
    }
  };
}
