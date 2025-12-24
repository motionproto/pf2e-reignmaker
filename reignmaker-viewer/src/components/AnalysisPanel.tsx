import type { AnalysisReport } from '../types/simulation';
import './AnalysisPanel.css';

interface AnalysisPanelProps {
  analysis: AnalysisReport;
}

export function AnalysisPanel({ analysis }: AnalysisPanelProps) {
  const { balanceAssessment, unrest, resourceFlow, actionEffectiveness, progression } = analysis;

  const healthClass = balanceAssessment.overallHealth === 'healthy' ? 'success' :
                      balanceAssessment.overallHealth === 'concerning' ? 'warning' : 'danger';

  return (
    <div className="analysis-panel">
      <h2>Balance Analysis</h2>

      {/* Overall Health */}
      <div className={`health-badge ${healthClass}`}>
        {balanceAssessment.overallHealth.toUpperCase()}
      </div>

      {/* Issues & Recommendations */}
      {balanceAssessment.issues.length > 0 && (
        <div className="analysis-section issues-section">
          <h3>Issues Detected</h3>
          <ul className="issues-list">
            {balanceAssessment.issues.map((issue, idx) => (
              <li key={idx} className="issue-item">{issue}</li>
            ))}
          </ul>
        </div>
      )}

      {balanceAssessment.recommendations.length > 0 && (
        <div className="analysis-section recommendations-section">
          <h3>Recommendations</h3>
          <ul className="recommendations-list">
            {balanceAssessment.recommendations.map((rec, idx) => (
              <li key={idx} className="recommendation-item">{rec}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Unrest Analysis */}
      <div className="analysis-section">
        <h3>Unrest Mechanics</h3>
        <div className="metrics-grid">
          <div className="metric">
            <span className="metric-label">Average</span>
            <span className="metric-value">{unrest.avgUnrest.toFixed(2)}</span>
          </div>
          <div className="metric">
            <span className="metric-label">Range</span>
            <span className="metric-value">{unrest.minUnrest} - {unrest.maxUnrest}</span>
          </div>
          <div className="metric">
            <span className="metric-label">Volatility</span>
            <span className="metric-value">{unrest.volatility.toFixed(2)}</span>
          </div>
          <div className="metric">
            <span className="metric-label">Death Spirals</span>
            <span className={`metric-value ${unrest.deathSpirals > 0 ? 'danger' : ''}`}>
              {unrest.deathSpirals}
            </span>
          </div>
        </div>

        <div className="tier-breakdown">
          <h4>Time in Unrest Tiers</h4>
          <div className="tier-bars">
            <div className="tier-bar stable" style={{ width: `${(unrest.timeInTier.stable / analysis.turnsAnalyzed) * 100}%` }}>
              Stable: {unrest.timeInTier.stable}
            </div>
            <div className="tier-bar discontent" style={{ width: `${(unrest.timeInTier.discontent / analysis.turnsAnalyzed) * 100}%` }}>
              Discontent: {unrest.timeInTier.discontent}
            </div>
            <div className="tier-bar turmoil" style={{ width: `${(unrest.timeInTier.turmoil / analysis.turnsAnalyzed) * 100}%` }}>
              Turmoil: {unrest.timeInTier.turmoil}
            </div>
            <div className="tier-bar rebellion" style={{ width: `${(unrest.timeInTier.rebellion / analysis.turnsAnalyzed) * 100}%` }}>
              Rebellion: {unrest.timeInTier.rebellion}
            </div>
          </div>
        </div>

        {unrest.topSources.length > 0 && (
          <div className="source-breakdown">
            <h4>Top Unrest Sources</h4>
            <ul className="source-list">
              {unrest.topSources.slice(0, 5).map((source) => {
                const data = unrest.sourceBreakdown[source];
                return (
                  <li key={source}>
                    <span className="source-name">{source}</span>
                    <span className="source-value">+{data.total} ({data.occurrences}x)</span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {unrest.effectiveSinks.length > 0 && (
          <div className="sink-breakdown">
            <h4>Effective Sinks</h4>
            <ul className="sink-list">
              {unrest.effectiveSinks.slice(0, 3).map((sink) => {
                const data = unrest.sinkBreakdown[sink];
                return (
                  <li key={sink}>
                    <span className="sink-name">{sink}</span>
                    <span className="sink-value">-{data.total} ({data.occurrences}x)</span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>

      {/* Resource Flow */}
      <div className="analysis-section">
        <h3>Resource Flow</h3>
        <div className="resource-flow-grid">
          <div className="flow-item">
            <span className="resource-label gold">Gold</span>
            <span className={`flow-value ${resourceFlow.totals.avgNetFlow.gold >= 0 ? 'positive' : 'negative'}`}>
              {resourceFlow.totals.avgNetFlow.gold >= 0 ? '+' : ''}{resourceFlow.totals.avgNetFlow.gold.toFixed(1)}/turn
            </span>
          </div>
          <div className="flow-item">
            <span className="resource-label food">Food</span>
            <span className={`flow-value ${resourceFlow.totals.avgNetFlow.food >= 0 ? 'positive' : 'negative'}`}>
              {resourceFlow.totals.avgNetFlow.food >= 0 ? '+' : ''}{resourceFlow.totals.avgNetFlow.food.toFixed(1)}/turn
            </span>
          </div>
          <div className="flow-item">
            <span className="resource-label lumber">Lumber</span>
            <span className={`flow-value ${resourceFlow.totals.avgNetFlow.lumber >= 0 ? 'positive' : 'negative'}`}>
              {resourceFlow.totals.avgNetFlow.lumber >= 0 ? '+' : ''}{resourceFlow.totals.avgNetFlow.lumber.toFixed(1)}/turn
            </span>
          </div>
          <div className="flow-item">
            <span className="resource-label stone">Stone</span>
            <span className={`flow-value ${resourceFlow.totals.avgNetFlow.stone >= 0 ? 'positive' : 'negative'}`}>
              {resourceFlow.totals.avgNetFlow.stone >= 0 ? '+' : ''}{resourceFlow.totals.avgNetFlow.stone.toFixed(1)}/turn
            </span>
          </div>
          <div className="flow-item">
            <span className="resource-label ore">Ore</span>
            <span className={`flow-value ${resourceFlow.totals.avgNetFlow.ore >= 0 ? 'positive' : 'negative'}`}>
              {resourceFlow.totals.avgNetFlow.ore >= 0 ? '+' : ''}{resourceFlow.totals.avgNetFlow.ore.toFixed(1)}/turn
            </span>
          </div>
        </div>

        <div className="sustainability">
          <span className="sustainability-label">Food Sustainability:</span>
          <span className={`sustainability-value ${resourceFlow.totals.avgSustainability >= 0.9 ? 'good' : resourceFlow.totals.avgSustainability >= 0.7 ? 'fair' : 'poor'}`}>
            {(resourceFlow.totals.avgSustainability * 100).toFixed(0)}%
          </span>
        </div>

        {resourceFlow.bottlenecks.length > 0 && (
          <div className="bottlenecks">
            <span className="label">Bottlenecks:</span> {resourceFlow.bottlenecks.join(', ')}
          </div>
        )}
        {resourceFlow.surpluses.length > 0 && (
          <div className="surpluses">
            <span className="label">Surpluses:</span> {resourceFlow.surpluses.join(', ')}
          </div>
        )}
      </div>

      {/* Action Effectiveness */}
      <div className="analysis-section">
        <h3>Action Effectiveness</h3>
        <div className="metrics-grid">
          <div className="metric">
            <span className="metric-label">Total Actions</span>
            <span className="metric-value">{actionEffectiveness.overall.totalActions}</span>
          </div>
          <div className="metric">
            <span className="metric-label">Success Rate</span>
            <span className={`metric-value ${actionEffectiveness.overall.successRate >= 0.7 ? 'good' : actionEffectiveness.overall.successRate >= 0.5 ? 'fair' : 'poor'}`}>
              {(actionEffectiveness.overall.successRate * 100).toFixed(1)}%
            </span>
          </div>
          <div className="metric">
            <span className="metric-label">Critical Rate</span>
            <span className="metric-value">{(actionEffectiveness.overall.critRate * 100).toFixed(1)}%</span>
          </div>
          <div className="metric">
            <span className="metric-label">Failure Rate</span>
            <span className={`metric-value ${actionEffectiveness.overall.failureRate > 0.3 ? 'poor' : ''}`}>
              {(actionEffectiveness.overall.failureRate * 100).toFixed(1)}%
            </span>
          </div>
        </div>

        {actionEffectiveness.mostUsed.length > 0 && (
          <div className="action-breakdown">
            <h4>Most Used Actions</h4>
            <ul className="action-list">
              {actionEffectiveness.mostUsed.slice(0, 5).map((actionName) => {
                const stats = actionEffectiveness.byAction.find(a => a.actionName === actionName);
                if (!stats) return null;
                return (
                  <li key={actionName}>
                    <span className="action-name">{actionName}</span>
                    <span className="action-stats">
                      {stats.attempts} uses, {(stats.successRate * 100).toFixed(0)}% success
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {actionEffectiveness.leastEffective.length > 0 && (
          <div className="action-breakdown least-effective">
            <h4>Least Effective Actions</h4>
            <ul className="action-list">
              {actionEffectiveness.leastEffective.slice(0, 3).map((actionName) => {
                const stats = actionEffectiveness.byAction.find(a => a.actionName === actionName);
                if (!stats || stats.attempts < 3) return null;
                return (
                  <li key={actionName}>
                    <span className="action-name">{actionName}</span>
                    <span className="action-stats poor">
                      {(stats.successRate * 100).toFixed(0)}% success ({stats.attempts} attempts)
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>

      {/* Progression */}
      <div className="analysis-section">
        <h3>Progression</h3>
        <div className="metrics-grid">
          <div className="metric">
            <span className="metric-label">Expansion Rate</span>
            <span className="metric-value">{progression.expansionRate.toFixed(2)} hexes/turn</span>
          </div>
          <div className="metric">
            <span className="metric-label">Structure Building</span>
            <span className="metric-value">{progression.structureBuildRate.toFixed(2)}/turn</span>
          </div>
          <div className="metric">
            <span className="metric-label">Worksite Creation</span>
            <span className="metric-value">{progression.worksiteRate.toFixed(2)}/turn</span>
          </div>
          <div className="metric">
            <span className="metric-label">Settlement Upgrades</span>
            <span className="metric-value">{progression.settlementUpgrades}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
