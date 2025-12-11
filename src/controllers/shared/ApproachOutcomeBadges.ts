/**
 * Helper to inject approach-specific outcome badges into possible outcomes
 * for events with strategic choices.
 */

import { valueBadge, textBadge } from '../../types/OutcomeBadge';

/**
 * Get approach-specific outcome badges for an event
 */
export function getApproachOutcomeBadges(
  eventId: string,
  approach: string | null,
  outcomeType: 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure'
): any[] {
  if (!approach) {
    return [textBadge('Select an approach to see possible outcomes', 'fas fa-question-circle', 'info')];
  }

  // Criminal Trial
  if (eventId === 'criminal-trial') {
    if (approach === 'fair') {
      if (outcomeType === 'criticalSuccess') {
        return [
          valueBadge('Gain {{value}} Fame', 'fas fa-star', 2, 'positive'),
          valueBadge('Reduce Unrest by {{value}}', 'fas fa-shield-alt', 1, 'positive')
        ];
      } else if (outcomeType === 'success') {
        return [
          valueBadge('Gain {{value}} Fame', 'fas fa-star', 1, 'positive'),
          valueBadge('Reduce Unrest by {{value}}', 'fas fa-shield-alt', 1, 'positive')
        ];
      } else if (outcomeType === 'failure') {
        return [valueBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', 1, 'negative')];
      } else if (outcomeType === 'criticalFailure') {
        return [valueBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', 2, 'negative')];
      }
    } else if (approach === 'harsh') {
      if (outcomeType === 'criticalSuccess') {
        return [valueBadge('Reduce Unrest by {{value}}', 'fas fa-shield-alt', 3, 'positive')];
      } else if (outcomeType === 'success') {
        return [valueBadge('Reduce Unrest by {{value}}', 'fas fa-shield-alt', 2, 'positive')];
      } else if (outcomeType === 'failure') {
        return [valueBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', 1, 'negative')];
      } else if (outcomeType === 'criticalFailure') {
        return [
          valueBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', 2, 'negative'),
          valueBadge('Lose {{value}} Fame', 'fas fa-star', 1, 'negative')
        ];
      }
    } else if (approach === 'mercy') {
      if (outcomeType === 'criticalSuccess') {
        return [
          valueBadge('Gain {{value}} Fame', 'fas fa-star', 2, 'positive'),
          valueBadge('Reduce Unrest by {{value}}', 'fas fa-shield-alt', 1, 'positive')
        ];
      } else if (outcomeType === 'success') {
        return [valueBadge('Gain {{value}} Fame', 'fas fa-star', 1, 'positive')];
      } else if (outcomeType === 'failure') {
        return [valueBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', 2, 'negative')];
      } else if (outcomeType === 'criticalFailure') {
        return [valueBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', 3, 'negative')];
      }
    }
  }

  // Feud
  if (eventId === 'feud') {
    if (approach === 'mediate') {
      if (outcomeType === 'criticalSuccess' || outcomeType === 'success') {
        return [
          valueBadge('Reduce Unrest by {{value}}', 'fas fa-shield-alt', 2, 'positive'),
          valueBadge('Gain {{value}} Fame', 'fas fa-star', 1, 'positive')
        ];
      } else if (outcomeType === 'failure') {
        return [valueBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', 1, 'negative')];
      } else if (outcomeType === 'criticalFailure') {
        return [valueBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', 1, 'negative')];
      }
    } else if (approach === 'force') {
      if (outcomeType === 'criticalSuccess' || outcomeType === 'success') {
        return [valueBadge('Reduce Unrest by {{value}}', 'fas fa-shield-alt', 1, 'positive')];
      } else if (outcomeType === 'failure') {
        return [valueBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', 2, 'negative')];
      } else if (outcomeType === 'criticalFailure') {
        return [
          valueBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', 2, 'negative'),
          textBadge('Structure damaged', 'fas fa-hammer', 'negative')
        ];
      }
    } else if (approach === 'manipulate') {
      if (outcomeType === 'criticalSuccess') {
        return [
          valueBadge('Reduce Unrest by {{value}}', 'fas fa-shield-alt', 2, 'positive'),
          valueBadge('Gain {{value}} Fame', 'fas fa-star', 1, 'positive')
        ];
      } else if (outcomeType === 'success') {
        return [valueBadge('Reduce Unrest by {{value}}', 'fas fa-shield-alt', 1, 'positive')];
      } else if (outcomeType === 'failure') {
        return [
          valueBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', 1, 'negative'),
          valueBadge('Lose {{value}} Fame', 'fas fa-star', 1, 'negative')
        ];
      } else if (outcomeType === 'criticalFailure') {
        return [
          valueBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', 1, 'negative'),
          valueBadge('Lose {{value}} Fame', 'fas fa-star', 1, 'negative')
        ];
      }
    }
  }

  // Inquisition
  if (eventId === 'inquisition') {
    if (approach === 'support') {
      if (outcomeType === 'criticalSuccess' || outcomeType === 'success') {
        return [valueBadge('Reduce Unrest by {{value}}', 'fas fa-shield-alt', 1, 'positive')];
      } else if (outcomeType === 'failure') {
        return [
          valueBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', 2, 'negative'),
          valueBadge('Lose {{value}} Fame', 'fas fa-star', 1, 'negative')
        ];
      } else if (outcomeType === 'criticalFailure') {
        return [
          valueBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', 3, 'negative'),
          valueBadge('Lose {{value}} Fame', 'fas fa-star', 2, 'negative')
        ];
      }
    } else if (approach === 'protect') {
      if (outcomeType === 'criticalSuccess') {
        return [valueBadge('Gain {{value}} Fame', 'fas fa-star', 2, 'positive')];
      } else if (outcomeType === 'success') {
        return [valueBadge('Gain {{value}} Fame', 'fas fa-star', 1, 'positive')];
      } else if (outcomeType === 'failure') {
        return [valueBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', 1, 'negative')];
      } else if (outcomeType === 'criticalFailure') {
        return [valueBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', 2, 'negative')];
      }
    } else if (approach === 'neutral') {
      if (outcomeType === 'criticalSuccess' || outcomeType === 'success') {
        return [valueBadge('Gain {{value}} Gold', 'fas fa-coins', 1, 'positive')];
      } else if (outcomeType === 'failure' || outcomeType === 'criticalFailure') {
        return [valueBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', 2, 'negative')];
      }
    }
  }

  // Public Scandal
  if (eventId === 'public-scandal') {
    if (approach === 'transparent') {
      if (outcomeType === 'criticalSuccess') {
        return [
          valueBadge('Gain {{value}} Fame', 'fas fa-star', 2, 'positive'),
          valueBadge('Reduce Unrest by {{value}}', 'fas fa-shield-alt', 1, 'positive')
        ];
      } else if (outcomeType === 'success') {
        return [valueBadge('Gain {{value}} Fame', 'fas fa-star', 1, 'positive')];
      } else if (outcomeType === 'failure') {
        return [
          valueBadge('Lose {{value}} Fame', 'fas fa-star', 1, 'negative'),
          valueBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', 1, 'negative')
        ];
      } else if (outcomeType === 'criticalFailure') {
        return [
          valueBadge('Lose {{value}} Fame', 'fas fa-star', 2, 'negative'),
          valueBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', 2, 'negative')
        ];
      }
    } else if (approach === 'coverup') {
      if (outcomeType === 'criticalSuccess' || outcomeType === 'success') {
        return [textBadge('No consequences', 'fas fa-user-secret', 'info')];
      } else if (outcomeType === 'failure') {
        return [
          valueBadge('Lose {{value}} Fame', 'fas fa-star', 2, 'negative'),
          valueBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', 2, 'negative')
        ];
      } else if (outcomeType === 'criticalFailure') {
        return [
          valueBadge('Lose {{value}} Fame', 'fas fa-star', 3, 'negative'),
          valueBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', 3, 'negative')
        ];
      }
    } else if (approach === 'scapegoat') {
      if (outcomeType === 'criticalSuccess' || outcomeType === 'success') {
        return [valueBadge('Reduce Unrest by {{value}}', 'fas fa-shield-alt', 1, 'positive')];
      } else if (outcomeType === 'failure') {
        return [
          valueBadge('Lose {{value}} Fame', 'fas fa-star', 1, 'negative'),
          valueBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', 1, 'negative')
        ];
      } else if (outcomeType === 'criticalFailure') {
        return [
          valueBadge('Lose {{value}} Fame', 'fas fa-star', 2, 'negative'),
          valueBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', 2, 'negative')
        ];
      }
    }
  }

  return [];
}
