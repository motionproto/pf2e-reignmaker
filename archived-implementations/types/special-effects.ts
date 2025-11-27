/**
 * Special Effect Types - Structured data for game effects display
 * Used by GameCommandHelpers and OutcomeDisplay for badge rendering
 */

export interface SpecialEffect {
  type: 'attitude' | 'resource' | 'status' | 'info' | 'damage' | 'hex';
  message: string;
  icon?: string;
  variant?: 'positive' | 'negative' | 'info';
}

/**
 * Helper: Create attitude change effect
 */
export function createAttitudeEffect(
  factionName: string,
  oldAttitude: string,
  newAttitude: string,
  steps: number
): SpecialEffect {
  const isPositive = steps > 0;
  return {
    type: 'attitude',
    message: `${factionName}: ${oldAttitude} → ${newAttitude}`,
    icon: 'fa-handshake',
    variant: isPositive ? 'positive' : 'negative'
  };
}

/**
 * Helper: Create structure damage effect
 */
export function createStructureDamageEffect(
  structureName: string,
  settlementName: string
): SpecialEffect {
  return {
    type: 'damage',
    message: `${structureName} in ${settlementName} damaged`,
    icon: 'fa-hammer',
    variant: 'negative'
  };
}

/**
 * Helper: Create hex removal effect
 */
export function createHexRemovalEffect(hexCount: number): SpecialEffect {
  return {
    type: 'hex',
    message: `${hexCount} border hex${hexCount !== 1 ? 'es' : ''} removed`,
    icon: 'fa-map',
    variant: 'negative'
  };
}

/**
 * Helper: Create resource gain effect
 */
export function createResourceGainEffect(
  resource: string,
  amount: number
): SpecialEffect {
  return {
    type: 'resource',
    message: `Gained ${amount} ${resource.charAt(0).toUpperCase() + resource.slice(1)}`,
    icon: 'fa-coins',
    variant: 'positive'
  };
}

/**
 * Helper: Convert legacy string effect to structured effect
 */
export function parseLegacyEffect(message: string): SpecialEffect {
  // Try to infer effect type from message content
  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes('attitude') || lowerMessage.includes('relations')) {
    return {
      type: 'attitude',
      message,
      icon: 'fa-handshake',
      variant: lowerMessage.includes('improved') ? 'positive' : 'negative'
    };
  }
  
  if (lowerMessage.includes('damaged')) {
    return {
      type: 'damage',
      message,
      icon: 'fa-hammer',
      variant: 'negative'
    };
  }
  
  if (lowerMessage.includes('hex') || lowerMessage.includes('border')) {
    return {
      type: 'hex',
      message,
      icon: 'fa-map',
      variant: 'negative'
    };
  }
  
  if (lowerMessage.includes('gained') || lowerMessage.includes('gain')) {
    return {
      type: 'resource',
      message,
      icon: 'fa-coins',
      variant: 'positive'
    };
  }
  
  // Default to info type
  return {
    type: 'info',
    message,
    variant: 'info'
  };
}
