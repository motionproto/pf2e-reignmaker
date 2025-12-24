import type { UnrestAnalysis } from '../types';
import './UnrestBreakdown.css';

interface UnrestBreakdownProps {
  analysis: UnrestAnalysis;
}

// Format source/sink names for display
function formatName(name: string): string {
  return name
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
    .replace('Action ', '')
    .replace('Incident ', 'Incident: ')
    .replace('Event', 'Event');
}

export function UnrestBreakdown({ analysis }: UnrestBreakdownProps) {
  const { timeInTier, sourceBreakdown, sinkBreakdown, topSources, effectiveSinks } = analysis;

  // Calculate percentages for tier bars
  const tierTotal = timeInTier.stable + timeInTier.discontent + timeInTier.turmoil + timeInTier.rebellion;
  const tierPcts = tierTotal > 0 ? {
    stable: (timeInTier.stable / tierTotal) * 100,
    discontent: (timeInTier.discontent / tierTotal) * 100,
    turmoil: (timeInTier.turmoil / tierTotal) * 100,
    rebellion: (timeInTier.rebellion / tierTotal) * 100
  } : { stable: 100, discontent: 0, turmoil: 0, rebellion: 0 };

  return (
    <div className="unrest-breakdown">
      <h3>Unrest Analysis</h3>

      {/* Key Metrics */}
      <div className="unrest-metrics">
        <div className="metric">
          <span className="label">Avg Unrest</span>
          <span className="value">{analysis.avgUnrest.toFixed(1)}</span>
        </div>
        <div className="metric">
          <span className="label">Range</span>
          <span className="value">{analysis.minUnrest} - {analysis.maxUnrest}</span>
        </div>
        <div className="metric">
          <span className="label">Volatility</span>
          <span className="value">{analysis.volatility.toFixed(2)}</span>
        </div>
        <div className={`metric ${analysis.deathSpirals > 0 ? 'danger' : ''}`}>
          <span className="label">Death Spirals</span>
          <span className="value">{analysis.deathSpirals}</span>
        </div>
      </div>

      {/* Time in Tier */}
      <div className="tier-section">
        <h4>Time in Unrest Tiers</h4>
        <div className="tier-bar-container">
          <div className="tier-bar stable" style={{ width: `${tierPcts.stable}%` }}>
            {timeInTier.stable > 0 && <span>{timeInTier.stable}</span>}
          </div>
          <div className="tier-bar discontent" style={{ width: `${tierPcts.discontent}%` }}>
            {timeInTier.discontent > 0 && <span>{timeInTier.discontent}</span>}
          </div>
          <div className="tier-bar turmoil" style={{ width: `${tierPcts.turmoil}%` }}>
            {timeInTier.turmoil > 0 && <span>{timeInTier.turmoil}</span>}
          </div>
          <div className="tier-bar rebellion" style={{ width: `${tierPcts.rebellion}%` }}>
            {timeInTier.rebellion > 0 && <span>{timeInTier.rebellion}</span>}
          </div>
        </div>
        <div className="tier-legend">
          <span className="legend-item stable">Stable (0-2)</span>
          <span className="legend-item discontent">Discontent (3-5)</span>
          <span className="legend-item turmoil">Turmoil (6-8)</span>
          <span className="legend-item rebellion">Rebellion (9+)</span>
        </div>
      </div>

      {/* Sources and Sinks side by side */}
      <div className="source-sink-grid">
        {/* Top Sources */}
        <div className="sources-section">
          <h4>Unrest Sources</h4>
          {topSources.length > 0 ? (
            <ul className="source-list">
              {topSources.slice(0, 6).map(source => {
                const data = sourceBreakdown[source];
                if (!data) return null;
                return (
                  <li key={source} className="source-item">
                    <span className="name">{formatName(source)}</span>
                    <span className="stats">
                      <span className="total">+{data.total}</span>
                      <span className="occurrences">({data.occurrences}x)</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="no-data">No unrest sources recorded</p>
          )}
        </div>

        {/* Effective Sinks */}
        <div className="sinks-section">
          <h4>Unrest Reduction</h4>
          {effectiveSinks.length > 0 ? (
            <ul className="sink-list">
              {effectiveSinks.slice(0, 6).map(sink => {
                const data = sinkBreakdown[sink];
                if (!data) return null;
                return (
                  <li key={sink} className="sink-item">
                    <span className="name">{formatName(sink)}</span>
                    <span className="stats">
                      <span className="total">-{data.total}</span>
                      <span className="occurrences">({data.occurrences}x)</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="no-data">No unrest reduction recorded</p>
          )}
        </div>
      </div>

      {/* Prison Stats */}
      {(analysis.prisonUtilization > 0 || analysis.imprisonmentRate > 0) && (
        <div className="prison-section">
          <h4>Prison Effectiveness</h4>
          <div className="prison-stats">
            <div className="stat">
              <span className="label">Utilization</span>
              <span className="value">{(analysis.prisonUtilization * 100).toFixed(0)}%</span>
            </div>
            <div className="stat">
              <span className="label">Imprisonment Rate</span>
              <span className="value">{(analysis.imprisonmentRate * 100).toFixed(0)}%</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
