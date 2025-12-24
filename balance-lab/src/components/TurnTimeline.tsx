import type { TurnData } from '../types';
import './TurnTimeline.css';

interface TurnTimelineProps {
  turnData: TurnData[];
  collapsed: boolean;
}

// Get unrest tier class name
function getUnrestTierClass(unrest: number): string {
  if (unrest <= 2) return 'stable';
  if (unrest <= 5) return 'discontent';
  if (unrest <= 8) return 'turmoil';
  return 'rebellion';
}

// Calculate delta with class
function getDeltaDisplay(current: number, previous: number | null): { value: string; className: string } | null {
  if (previous === null) return null;
  const delta = current - previous;
  if (delta === 0) return null;
  return {
    value: delta > 0 ? `+${delta}` : `${delta}`,
    className: delta > 0 ? 'delta-up' : 'delta-down'
  };
}

export function TurnTimeline({ turnData, collapsed }: TurnTimelineProps) {
  if (!turnData || turnData.length === 0) {
    return (
      <div className="turn-timeline-empty">
        <p>No turn data available for this run.</p>
      </div>
    );
  }

  return (
    <div className="turn-timeline">
      <h3>Turn-by-Turn Timeline</h3>
      {collapsed && (
        <div className="collapse-warning">
          Kingdom collapsed at turn {turnData.length}
        </div>
      )}
      <div className="timeline-table-container">
        <table className="timeline-table">
          <thead>
            <tr>
              <th>Turn</th>
              <th>Gold</th>
              <th>Food</th>
              <th>Lumber</th>
              <th>Stone</th>
              <th>Ore</th>
              <th>Hexes</th>
              <th>Structures</th>
              <th>Worksites</th>
              <th>Unrest</th>
            </tr>
          </thead>
          <tbody>
            {turnData.map((turn, idx) => {
              const prev = idx > 0 ? turnData[idx - 1] : null;
              const unrestTier = getUnrestTierClass(turn.unrest);

              return (
                <tr key={turn.turn} className={`turn-row ${unrestTier}`}>
                  <td className="turn-col">{turn.turn}</td>
                  <td className="resource-col gold">
                    {turn.gold}
                    {(() => {
                      const delta = getDeltaDisplay(turn.gold, prev?.gold ?? null);
                      return delta ? <span className={delta.className}>{delta.value}</span> : null;
                    })()}
                  </td>
                  <td className="resource-col food">
                    {turn.food}
                    {(() => {
                      const delta = getDeltaDisplay(turn.food, prev?.food ?? null);
                      return delta ? <span className={delta.className}>{delta.value}</span> : null;
                    })()}
                  </td>
                  <td className="resource-col lumber">
                    {turn.lumber}
                    {(() => {
                      const delta = getDeltaDisplay(turn.lumber, prev?.lumber ?? null);
                      return delta ? <span className={delta.className}>{delta.value}</span> : null;
                    })()}
                  </td>
                  <td className="resource-col stone">
                    {turn.stone}
                    {(() => {
                      const delta = getDeltaDisplay(turn.stone, prev?.stone ?? null);
                      return delta ? <span className={delta.className}>{delta.value}</span> : null;
                    })()}
                  </td>
                  <td className="resource-col ore">
                    {turn.ore}
                    {(() => {
                      const delta = getDeltaDisplay(turn.ore, prev?.ore ?? null);
                      return delta ? <span className={delta.className}>{delta.value}</span> : null;
                    })()}
                  </td>
                  <td className="count-col">
                    {turn.hexes}
                    {(() => {
                      const delta = getDeltaDisplay(turn.hexes, prev?.hexes ?? null);
                      return delta ? <span className={delta.className}>{delta.value}</span> : null;
                    })()}
                  </td>
                  <td className="count-col">
                    {turn.structures}
                    {(() => {
                      const delta = getDeltaDisplay(turn.structures, prev?.structures ?? null);
                      return delta ? <span className={delta.className}>{delta.value}</span> : null;
                    })()}
                  </td>
                  <td className="count-col">
                    {turn.worksites}
                    {(() => {
                      const delta = getDeltaDisplay(turn.worksites, prev?.worksites ?? null);
                      return delta ? <span className={delta.className}>{delta.value}</span> : null;
                    })()}
                  </td>
                  <td className={`unrest-col ${unrestTier}`}>
                    {turn.unrest}
                    {(() => {
                      const delta = getDeltaDisplay(turn.unrest, prev?.unrest ?? null);
                      return delta ? <span className={delta.className}>{delta.value}</span> : null;
                    })()}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
