import type { Settlement } from '../types/simulation';
import './SettlementDetails.css';

interface SettlementDetailsProps {
  settlements: Settlement[];
}

// Structure name → category mapping (normalized: lowercase, no apostrophes)
const STRUCTURE_CATEGORIES: Record<string, string> = {
  // Food Storage
  'granary': 'Food Storage', 'storehouses': 'Food Storage', 'warehouses': 'Food Storage', 'strategic reserves': 'Food Storage',
  // Revenue
  'tax office': 'Revenue', 'counting house': 'Revenue', 'treasury': 'Revenue', 'exchequer': 'Revenue',
  // Commerce
  'market square': 'Commerce', 'bazaar': 'Commerce', 'merchant guild': 'Commerce', 'imperial bank': 'Commerce',
  // Justice
  'stocks': 'Justice', 'jail': 'Justice', 'prison': 'Justice', 'donjon': 'Justice',
  // Culture
  'dive bar': 'Culture', 'public house': 'Culture', 'respectable tavern': 'Culture', 'pleasure palace': 'Culture',
  // Logistics
  'barracks': 'Logistics', 'garrison': 'Logistics', 'fortress': 'Logistics', 'citadel': 'Logistics',
  // Fortifications
  'wooden palisade': 'Fortifications', 'stone walls': 'Fortifications', 'fortified walls': 'Fortifications', 'grand battlements': 'Fortifications',
  // Diplomacy
  'envoys office': 'Diplomacy', 'embassy': 'Diplomacy', 'grand embassy': 'Diplomacy', 'diplomatic quarter': 'Diplomacy',
  // Civic & Governance
  'meeting house': 'Civic & Governance', 'town hall': 'Civic & Governance', 'council chambers': 'Civic & Governance', 'royal court': 'Civic & Governance',
  // Military & Training
  'sparring ring': 'Military & Training', 'training yard': 'Military & Training', 'champions hall': 'Military & Training', 'grand coliseum': 'Military & Training',
  // Crafting & Trade
  'workshop': 'Crafting & Trade', 'artisans hall': 'Crafting & Trade', 'blacksmiths guild': 'Crafting & Trade', 'masterworks foundry': 'Crafting & Trade',
  // Knowledge & Magic
  'schoolhouse': 'Knowledge & Magic', 'library': 'Knowledge & Magic', 'mages tower': 'Knowledge & Magic', 'arcane university': 'Knowledge & Magic',
  // Faith & Nature
  'sacred grove': 'Faith & Nature', 'shrine': 'Faith & Nature', 'temple': 'Faith & Nature', 'cathedral': 'Faith & Nature',
  // Medicine & Healing
  'healers hut': 'Medicine & Healing', 'infirmary': 'Medicine & Healing', 'hospital': 'Medicine & Healing', 'medical academy': 'Medicine & Healing',
  // Performance & Culture
  'buskers row': 'Performance & Culture', 'minstrels stage': 'Performance & Culture', 'theater': 'Performance & Culture', 'grand opera house': 'Performance & Culture',
  // Crime & Intrigue
  'rats warren': 'Crime & Intrigue', 'smugglers den': 'Crime & Intrigue', 'thieves guild': 'Crime & Intrigue', 'shadow network': 'Crime & Intrigue',
  // Exploration & Wilderness
  'hunters lodge': 'Exploration & Wilderness', 'rangers outpost': 'Exploration & Wilderness', 'druids grove': 'Exploration & Wilderness', 'wildskeepers enclave': 'Exploration & Wilderness',
};

// Structure name → tier mapping
const STRUCTURE_TIERS: Record<string, number> = {
  // T1
  'granary': 1, 'tax office': 1, 'market square': 1, 'stocks': 1, 'dive bar': 1, 'barracks': 1, 'wooden palisade': 1, 'envoys office': 1,
  'meeting house': 1, 'sparring ring': 1, 'workshop': 1, 'schoolhouse': 1, 'sacred grove': 1, 'healers hut': 1, 'buskers row': 1, 'rats warren': 1, 'hunters lodge': 1,
  // T2
  'storehouses': 2, 'counting house': 2, 'bazaar': 2, 'jail': 2, 'public house': 2, 'garrison': 2, 'stone walls': 2, 'embassy': 2,
  'town hall': 2, 'training yard': 2, 'artisans hall': 2, 'library': 2, 'shrine': 2, 'infirmary': 2, 'minstrels stage': 2, 'smugglers den': 2, 'rangers outpost': 2,
  // T3
  'warehouses': 3, 'treasury': 3, 'merchant guild': 3, 'prison': 3, 'respectable tavern': 3, 'fortress': 3, 'fortified walls': 3, 'grand embassy': 3,
  'council chambers': 3, 'champions hall': 3, 'blacksmiths guild': 3, 'mages tower': 3, 'temple': 3, 'hospital': 3, 'theater': 3, 'thieves guild': 3, 'druids grove': 3,
  // T4
  'strategic reserves': 4, 'exchequer': 4, 'imperial bank': 4, 'donjon': 4, 'pleasure palace': 4, 'citadel': 4, 'grand battlements': 4, 'diplomatic quarter': 4,
  'royal court': 4, 'grand coliseum': 4, 'masterworks foundry': 4, 'arcane university': 4, 'cathedral': 4, 'medical academy': 4, 'grand opera house': 4, 'shadow network': 4, 'wildskeepers enclave': 4,
};

// Effects by category and tier
const CATEGORY_TIER_EFFECTS: Record<string, Record<number, string>> = {
  'Food Storage': {
    1: '+4 Food capacity',
    2: '+8 Food capacity',
    3: '+16 Food capacity',
    4: '+36 Food capacity; Negate spoilage (DC 15)',
  },
  'Revenue': {
    1: '+1 Gold/turn',
    2: '+2 Gold/turn; Personal Income action',
    3: '+4 Gold/turn; Personal Income action',
    4: '+8 Gold/turn; Personal Income action',
  },
  'Commerce': {
    1: 'Trade 2:1 (2 res ↔ 1 gold); Buy non-magical items',
    2: 'Trade 2:1; Buy scrolls & consumables',
    3: 'Trade 3:2 (3 res ↔ 2 gold); Buy magical items; +1 gold/turn',
    4: 'Trade 1:1; +2 gold/turn',
  },
  'Justice': {
    1: 'Hold 1 imprisoned Unrest',
    2: 'Hold 2 imprisoned Unrest',
    3: 'Hold 4 imprisoned Unrest; Pardon action',
    4: 'Hold 8 imprisoned Unrest; Convert 1 Unrest/turn',
  },
  'Culture': {
    1: '+1 to Unrest reduction checks',
    2: '+2 to Unrest reduction checks',
    3: '+2 to Unrest reduction checks',
    4: '+1 Fame/turn; -1 Unrest/turn; +2 to checks',
  },
  'Logistics': {
    1: '+1 Unit capacity',
    2: '+2 Unit capacity',
    3: '+3 Unit capacity',
    4: '+4 Unit capacity; -1 Unrest/turn',
  },
  'Fortifications': {
    1: '+1 Army AC bonus',
    2: '+1 Army AC; +1 Effective Level',
    3: '+1 Army AC; +2 Effective Level',
    4: '+2 Army AC; +3 Effective Level; Defender recovery',
  },
  'Diplomacy': {
    1: '+1 Diplomatic capacity; Establish Diplomatic Relations',
    2: '+2 Diplomatic capacity',
    3: '+3 Diplomatic capacity; +1 Fame',
    4: '+4 Diplomatic capacity; +1 Fame; -1 Unrest/turn',
  },
  'Civic & Governance': {
    1: 'Enable Earn Income with Society',
    2: '+1 to Society/Diplomacy checks',
    3: '+2 to Society/Diplomacy/Deception checks',
    4: '+3 to skill checks; Reroll 1 failed check/turn',
  },
  'Military & Training': {
    1: 'Enable Earn Income with Athletics',
    2: '+1 to Athletics/Acrobatics checks',
    3: '+2 to Athletics/Acrobatics/Intimidation checks',
    4: '+3 to skill checks; Reroll 1 failed check/turn',
  },
  'Crafting & Trade': {
    1: 'Enable Earn Income with Crafting',
    2: '+1 to Crafting/Lore checks',
    3: '+2 to Crafting/Lore/Society checks',
    4: '+3 to skill checks; Reroll 1 failed check/turn',
  },
  'Knowledge & Magic': {
    1: 'Enable Earn Income with Lore',
    2: '+1 to Lore/Arcana checks',
    3: '+2 to Lore/Arcana/Occultism checks',
    4: '+3 to skill checks; Reroll 1 failed check/turn',
  },
  'Faith & Nature': {
    1: 'Enable Earn Income with Religion',
    2: '+1 to Religion/Medicine checks',
    3: '+2 to Religion/Medicine/Nature checks',
    4: '+3 to skill checks; Reroll 1 failed check/turn',
  },
  'Medicine & Healing': {
    1: 'Enable Earn Income with Medicine',
    2: '+1 to Medicine/Lore checks',
    3: '+2 to Medicine/Lore/Arcana checks',
    4: '+3 to skill checks; Reroll 1 failed check/turn',
  },
  'Performance & Culture': {
    1: 'Enable Earn Income with Performance',
    2: '+1 to Performance/Diplomacy checks',
    3: '+2 to Performance/Diplomacy/Lore checks',
    4: '+3 to skill checks; Reroll 1 failed check/turn',
  },
  'Crime & Intrigue': {
    1: 'Enable Earn Income with Thievery',
    2: '+1 to Thievery/Deception checks',
    3: '+2 to Thievery/Deception/Stealth checks',
    4: '+3 to skill checks; Reroll 1 failed check/turn',
  },
  'Exploration & Wilderness': {
    1: 'Enable Earn Income with Survival',
    2: '+1 to Survival/Nature checks',
    3: '+2 to Survival/Nature/Stealth checks',
    4: '+3 to skill checks; Reroll 1 failed check/turn',
  },
};

// Category display order
const CATEGORY_ORDER = [
  'Food Storage',
  'Revenue',
  'Commerce',
  'Justice',
  'Culture',
  'Logistics',
  'Fortifications',
  'Diplomacy',
  'Civic & Governance',
  'Military & Training',
  'Crafting & Trade',
  'Knowledge & Magic',
  'Faith & Nature',
  'Medicine & Healing',
  'Performance & Culture',
  'Crime & Intrigue',
  'Exploration & Wilderness',
];

function getStructureInfo(structureName: string): { effect: string; category: string; tier: number } {
  // Normalize: lowercase, remove apostrophes, convert hyphens to spaces
  // Handle the "s" artifact from apostrophe conversion (e.g., "healer-s-hut" or "Healer S Hut" -> "healers hut")
  let normalized = structureName.toLowerCase().trim()
    .replace(/[']/g, '')           // Remove apostrophes
    .replace(/-/g, ' ')            // Convert hyphens to spaces
    .replace(/\s+s\s+/g, 's ')     // Convert " s " (standalone s from possessive) to "s "
    .replace(/\s+/g, ' ')          // Collapse multiple spaces
    .trim();

  const category = STRUCTURE_CATEGORIES[normalized];
  const tier = STRUCTURE_TIERS[normalized];

  if (!category || !tier) {
    console.warn(`Unknown structure: "${structureName}" (normalized: "${normalized}")`);
    return { effect: 'Unknown effect', category: 'Unknown', tier: 0 };
  }

  const effect = CATEGORY_TIER_EFFECTS[category]?.[tier] || 'Unknown effect';
  return { effect, category, tier };
}

function getTierColor(tier: number): string {
  switch (tier) {
    case 1: return '#27ae60';
    case 2: return '#3498db';
    case 3: return '#9b59b6';
    case 4: return '#f39c12';
    default: return '#7f8c8d';
  }
}

interface StructureEntry {
  name: string;
  settlement: string;
  damaged: boolean;
  effect: string;
  category: string;
  tier: number;
}

export function SettlementDetails({ settlements }: SettlementDetailsProps) {
  if (!settlements || settlements.length === 0) {
    return (
      <div className="settlement-details">
        <h2>Settlement Details</h2>
        <p className="no-settlements">No settlements found in this simulation.</p>
      </div>
    );
  }

  // Collect all structures across all settlements
  const allStructures: StructureEntry[] = [];

  for (const settlement of settlements) {
    let structureNames: { name: string; damaged: boolean }[] = [];

    if (settlement.structures && settlement.structures.length > 0) {
      structureNames = settlement.structures.map(s => ({ name: s.name, damaged: s.damaged }));
    } else if (settlement.structureIds && settlement.structureIds.length > 0) {
      structureNames = settlement.structureIds.map(id => ({
        name: id.split('-').map(word =>
          word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' '),
        damaged: false
      }));
    }

    for (const struct of structureNames) {
      const info = getStructureInfo(struct.name);
      allStructures.push({
        name: struct.name,
        settlement: settlement.name,
        damaged: struct.damaged,
        effect: info.effect,
        category: info.category,
        tier: info.tier
      });
    }
  }

  // Group by category
  const byCategory: Record<string, StructureEntry[]> = {};
  for (const struct of allStructures) {
    if (!byCategory[struct.category]) {
      byCategory[struct.category] = [];
    }
    byCategory[struct.category].push(struct);
  }

  // Sort structures within each category by tier
  for (const cat of Object.keys(byCategory)) {
    byCategory[cat].sort((a, b) => a.tier - b.tier);
  }

  // Get ordered categories (only those that have structures)
  const orderedCategories = CATEGORY_ORDER.filter(cat => byCategory[cat] && byCategory[cat].length > 0);
  // Add any categories not in the predefined order
  for (const cat of Object.keys(byCategory)) {
    if (!orderedCategories.includes(cat)) {
      orderedCategories.push(cat);
    }
  }

  const totalStructures = allStructures.length;

  return (
    <div className="settlement-details">
      <h2>Settlement Details</h2>

      {/* Settlement Summary */}
      <div className="settlement-summary">
        {settlements.map((settlement, idx) => (
          <div key={idx} className="settlement-badge">
            {settlement.isCapital && <span className="capital-star">★</span>}
            <span className="badge-name">{settlement.name}</span>
            <span className="badge-info">{settlement.tier} Lv{settlement.level}</span>
          </div>
        ))}
      </div>

      {totalStructures === 0 ? (
        <p className="no-settlements">No structures built in any settlement.</p>
      ) : (
        <div className="structures-by-category">
          {orderedCategories.map(category => (
            <div key={category} className="category-section">
              <h3 className="category-header">{category}</h3>
              <table className="structures-table">
                <thead>
                  <tr>
                    <th className="col-tier">Tier</th>
                    <th className="col-name">Structure</th>
                    <th className="col-settlement">Settlement</th>
                    <th className="col-effect">Effect</th>
                  </tr>
                </thead>
                <tbody>
                  {byCategory[category].map((struct, idx) => (
                    <tr key={idx} className={struct.damaged ? 'damaged' : ''}>
                      <td className="col-tier">
                        <span className="tier-badge" style={{ backgroundColor: getTierColor(struct.tier) }}>
                          T{struct.tier}
                        </span>
                      </td>
                      <td className="col-name">
                        {struct.damaged && <span className="damaged-icon" title="Damaged">⚠</span>}
                        {struct.name}
                      </td>
                      <td className="col-settlement">{struct.settlement}</td>
                      <td className="col-effect">{struct.effect}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
