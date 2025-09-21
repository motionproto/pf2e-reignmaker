// Auto-converted from KingdomCore.kt
// TODO: Review and fix TypeScript-specific issues


// TODO: Review import - import js.objects.JsPlainObject


/**
 * Fresh start - Kingdom data model based on the simplified rules
 */

export interface Kingdom {
  id: string;
  name: string;
  level: number;
  xp: number;
  currentTurn: number;
  gold: number;
  unrest: number;
  fame: number;
  resources: Resources;
},
    const settlements: Array<Settlement> = emptyList();
    const activeEvents: Array<string> = emptyList(), // Event IDs
    const modifiers: Array<Modifier> = emptyList() }
export interface Resources {
  food: number;
  lumber: number;
  ore: number;
  stone: number;
}


export interface Settlement {
  id: string;
  name: string;
  level: number;
  structures: Array<string>;
} // Structure IDs
)


export interface Modifier {
  source: string;
  type: string;
  value: number;
  duration: string;
  turns: X;
  until: condition;
}

/**
 * Raw data types for JSON parsing - matching actual JSON schema
 */

// Structure JSON schema

declare interface RawStructure {
    const id: string
    const name: string
    const type: string
    const category: string
    const tier: number
    const effect: string | null
    const earnIncomeLevel: string | null
    const bonus: number | null
    const skills: Array<string> | null
    const construction: RawConstruction | null
    const traits: Array<string>
    const special: string | null
    const upgradeFrom: string | null
}


declare interface RawConstruction {
    const resources: RawResourceCost | null
}


declare interface RawResourceCost {
    const lumber: number | null
    const stone: number | null
    const ore: number | null
    const food: number | null
}

// Player Action JSON schema

declare interface RawPlayerAction {
    const id: string
    const name: string
    const category: string
    const description: string
    const skills: Array<RawSkillOption> | null
    const effects: RawActionEffects | null
    const special: string | null
}


declare interface RawSkillOption {
    const skill: string
    const description: string
}


declare interface RawActionEffects {
    const criticalSuccess: RawActionResult | null
    const success: RawActionResult | null
    const failure: RawActionResult | null
    const criticalFailure: RawActionResult | null
}


declare interface RawActionResult {
    const description: string
    const modifiers: any  // Complex object, using dynamic for now
}

// Event JSON schema

declare interface RawEvent {
    const id: string
    const name: string
    const description: string
    const traits: Array<string>
    const location: string | null
    const modifier: number
    const resolution: string | null
    const resolvedOn: Array<string> | null
    const stages: Array<RawEventStage> | null
    const special: string | null
}


declare interface RawEventStage {
    const skills: Array<string> | null
    const criticalSuccess: RawEventOutcome | null
    const success: RawEventOutcome | null
    const failure: RawEventOutcome | null
    const criticalFailure: RawEventOutcome | null
}


declare interface RawEventOutcome {
    const msg: string
    const modifiers: Array<RawEventModifier> | null
}


declare interface RawEventModifier {
    const type: string
    const name: string
    const value: number
    const selector: string
    const enabled: boolean
    const turns: number | null
}

// Incident JSON schema

declare interface RawIncident {
    const id: string
    const name: string
    const tier: string
    const description: string
    const percentileMin: number
    const percentileMax: number
    const skillOptions: Array<RawIncidentSkillOption>
}


declare interface RawIncidentSkillOption {
    const skill: string
    const description: string
    const successEffect: string
    const failureEffect: string
    const criticalFailureExtra: string | null
}
