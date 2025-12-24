import type { Worksite } from '../types/simulation';
import './WorksiteProduction.css';

interface WorksiteProductionProps {
  worksites: Worksite[];
  turn: number;
}

interface WorksiteSummary {
  type: string;
  count: number;
  totalProduction: number;
  resource: string;
}

// Map worksite types to their produced resource
const WORKSITE_RESOURCES: Record<string, string> = {
  'Farmstead': 'food',
  'Fishing Camp': 'food',
  'Logging Camp': 'lumber',
  'Quarry': 'stone',
  'Mine': 'ore',
  'Bog Mine': 'ore',
};

// Resource display colors
const RESOURCE_COLORS: Record<string, string> = {
  'food': '#27ae60',
  'lumber': '#8b4513',
  'stone': '#7f8c8d',
  'ore': '#c0392b',
};

export function WorksiteProduction({ worksites, turn }: WorksiteProductionProps) {
  // Group worksites by type and calculate totals
  const summaryByType: Record<string, WorksiteSummary> = {};

  for (const ws of worksites) {
    if (!summaryByType[ws.type]) {
      summaryByType[ws.type] = {
        type: ws.type,
        count: 0,
        totalProduction: 0,
        resource: WORKSITE_RESOURCES[ws.type] || 'unknown',
      };
    }
    summaryByType[ws.type].count++;
    summaryByType[ws.type].totalProduction += ws.production;
  }

  const summaries = Object.values(summaryByType).sort((a, b) => {
    // Sort by resource type for grouping, then by production
    const resourceOrder = ['food', 'lumber', 'stone', 'ore'];
    const aOrder = resourceOrder.indexOf(a.resource);
    const bOrder = resourceOrder.indexOf(b.resource);
    if (aOrder !== bOrder) return aOrder - bOrder;
    return b.totalProduction - a.totalProduction;
  });

  // Calculate totals by resource
  const totalsByResource: Record<string, number> = {
    food: 0,
    lumber: 0,
    stone: 0,
    ore: 0,
  };

  for (const summary of summaries) {
    if (totalsByResource[summary.resource] !== undefined) {
      totalsByResource[summary.resource] += summary.totalProduction;
    }
  }

  const totalWorksites = worksites.length;
  const totalProduction = Object.values(totalsByResource).reduce((a, b) => a + b, 0);

  return (
    <div className="worksite-production">
      <div className="worksite-header">
        <h3>Worksite Production</h3>
        <span className="turn-indicator">Turn {turn}</span>
      </div>

      {totalWorksites === 0 ? (
        <p className="no-worksites">No worksites established yet.</p>
      ) : (
        <>
          {/* Resource totals bar */}
          <div className="resource-totals">
            {Object.entries(totalsByResource).map(([resource, production]) => (
              <div
                key={resource}
                className={`resource-total ${resource}`}
                style={{ borderColor: RESOURCE_COLORS[resource] }}
              >
                <span className="resource-icon">{getResourceIcon(resource)}</span>
                <span className="resource-value">+{production}</span>
                <span className="resource-label">{resource}/turn</span>
              </div>
            ))}
          </div>

          {/* Worksite breakdown table */}
          <table className="worksite-table">
            <thead>
              <tr>
                <th>Worksite Type</th>
                <th>Count</th>
                <th>Production</th>
                <th>Resource</th>
              </tr>
            </thead>
            <tbody>
              {summaries.map((summary) => (
                <tr key={summary.type}>
                  <td className="type-col">
                    <span className="worksite-icon">{getWorksiteIcon(summary.type)}</span>
                    {summary.type}
                  </td>
                  <td className="count-col">{summary.count}</td>
                  <td className="production-col">+{summary.totalProduction}</td>
                  <td className="resource-col" style={{ color: RESOURCE_COLORS[summary.resource] }}>
                    {summary.resource}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="total-row">
                <td>Total</td>
                <td>{totalWorksites}</td>
                <td>+{totalProduction}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </>
      )}
    </div>
  );
}

function getResourceIcon(resource: string): string {
  switch (resource) {
    case 'food': return '🌾';
    case 'lumber': return '🪵';
    case 'stone': return '🪨';
    case 'ore': return '⛏️';
    default: return '📦';
  }
}

function getWorksiteIcon(type: string): string {
  switch (type) {
    case 'Farmstead': return '🌾';
    case 'Fishing Camp': return '🐟';
    case 'Logging Camp': return '🪓';
    case 'Quarry': return '⛰️';
    case 'Mine': return '⛏️';
    case 'Bog Mine': return '🏚️';
    default: return '🏗️';
  }
}
