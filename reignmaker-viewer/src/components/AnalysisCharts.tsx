import { ResponsiveLine } from '@nivo/line';
import { ResponsivePie } from '@nivo/pie';
import type { AnalysisReport, TurnReport } from '../types/simulation';
import './AnalysisCharts.css';

interface AnalysisChartsProps {
  analysis: AnalysisReport;
  turns: TurnReport[];
  onMilestoneClick?: (turn: number) => void;
}

// All known kingdom actions (from the simulation)
const ALL_ACTIONS = [
  'Aid Another', 'Arrest Dissidents', 'Build Roads', 'Build Structure',
  'Claim Hexes', 'Create Worksite', 'Deal with Unrest', 'Deploy Army',
  'Diplomatic Mission', 'Disband Army', 'Establish Settlement',
  'Execute or Pardon Prisoners', 'Fortify Hex', 'Harvest Resources',
  'Infiltration', 'Outfit Army', 'Purchase Resources', 'Recruit Army',
  'Repair Structure', 'Request Economic Aid', 'Request Military Aid',
  'Sell Surplus', 'Send Scouts', 'Tend Wounded', 'Train Army',
  'Upgrade Settlement'
];

export function AnalysisCharts({ analysis, turns, onMilestoneClick }: AnalysisChartsProps) {
  const { unrest, resourceFlow, actionEffectiveness, progression } = analysis;

  // Calculate result type distribution across all turns
  const resultDistribution = turns.reduce((acc, turn) => {
    // Count player actions
    turn.playerActions.forEach((action) => {
      switch (action.outcome) {
        case 'Critical Success':
          acc.criticalSuccess++;
          break;
        case 'Success':
          acc.success++;
          break;
        case 'Failure':
          acc.failure++;
          break;
        case 'Critical Failure':
          acc.criticalFailure++;
          break;
      }
    });

    // Count event results
    if (turn.eventResult) {
      switch (turn.eventResult.outcome) {
        case 'Critical Success':
          acc.criticalSuccess++;
          break;
        case 'Success':
          acc.success++;
          break;
        case 'Failure':
          acc.failure++;
          break;
        case 'Critical Failure':
          acc.criticalFailure++;
          break;
      }
    }

    // Count incident results
    if (turn.incidentResult) {
      switch (turn.incidentResult.outcome) {
        case 'Critical Success':
          acc.criticalSuccess++;
          break;
        case 'Success':
          acc.success++;
          break;
        case 'Failure':
          acc.failure++;
          break;
        case 'Critical Failure':
          acc.criticalFailure++;
          break;
      }
    }

    return acc;
  }, { criticalSuccess: 0, success: 0, failure: 0, criticalFailure: 0 });

  const pieData = [
    {
      id: 'Critical Success',
      label: 'Critical Success',
      value: resultDistribution.criticalSuccess,
      color: 'hsl(120, 70%, 40%)',
    },
    {
      id: 'Success',
      label: 'Success',
      value: resultDistribution.success,
      color: 'hsl(180, 70%, 50%)',
    },
    {
      id: 'Failure',
      label: 'Failure',
      value: resultDistribution.failure,
      color: 'hsl(40, 70%, 50%)',
    },
    {
      id: 'Critical Failure',
      label: 'Critical Failure',
      value: resultDistribution.criticalFailure,
      color: 'hsl(0, 70%, 50%)',
    },
  ].filter((item) => item.value > 0);

  // Unrest over time with tier visualization
  const unrestChartData = [{
    id: 'Unrest',
    color: '#e74c3c',
    data: unrest.perTurn.map((turn) => ({
      x: turn.turn,
      y: turn.endUnrest,
    })),
  }];

  // Resource net flow over time
  const resourceFlowChartData = [
    {
      id: 'Gold',
      color: '#f39c12',
      data: resourceFlow.perTurn.map((turn) => ({
        x: turn.turn,
        y: turn.netFlow.gold,
      })),
    },
    {
      id: 'Food',
      color: '#27ae60',
      data: resourceFlow.perTurn.map((turn) => ({
        x: turn.turn,
        y: turn.netFlow.food,
      })),
    },
  ];

  // Action effectiveness bar chart data - ALL actions, ordered by frequency
  // Create a map of used actions from the analysis
  const usedActionsMap = new Map(
    actionEffectiveness.byAction.map(a => [a.actionName, a])
  );

  // Build complete action list with all actions (including unused ones)
  const actionBarData = ALL_ACTIONS
    .map(actionName => {
      const stats = usedActionsMap.get(actionName);
      return {
        action: actionName.length > 18
          ? actionName.substring(0, 15) + '...'
          : actionName,
        fullName: actionName,
        attempts: stats?.attempts ?? 0,
        'Critical Success': stats?.outcomes.criticalSuccess ?? 0,
        'Success': stats?.outcomes.success ?? 0,
        'Failure': stats?.outcomes.failure ?? 0,
        'Critical Failure': stats?.outcomes.criticalFailure ?? 0,
      };
    })
    .sort((a, b) => b.attempts - a.attempts);

  // Progression over time
  const progressionChartData = [
    {
      id: 'Hexes',
      color: '#3498db',
      data: progression.perTurn.map((turn) => ({
        x: turn.turn,
        y: turn.hexesClaimed,
      })),
    },
    {
      id: 'Structures',
      color: '#9b59b6',
      data: progression.perTurn.map((turn) => ({
        x: turn.turn,
        y: turn.structures,
      })),
    },
    {
      id: 'Worksites',
      color: '#e67e22',
      data: progression.perTurn.map((turn) => ({
        x: turn.turn,
        y: turn.worksites,
      })),
    },
  ];

  const commonLineProps = {
    margin: { top: 20, right: 20, bottom: 50, left: 60 },
    xScale: { type: 'linear' as const, min: 'auto' as const, max: 'auto' as const },
    yScale: { type: 'linear' as const, min: 'auto' as const, max: 'auto' as const },
    axisBottom: {
      legend: 'Turn',
      legendOffset: 36,
      legendPosition: 'middle' as const,
      tickSize: 5,
      tickPadding: 5,
    },
    axisLeft: {
      legendOffset: -45,
      legendPosition: 'middle' as const,
      tickSize: 5,
      tickPadding: 5,
    },
    enablePoints: false,
    enableGridX: false,
    enableGridY: true,
    gridYValues: 5,
    useMesh: true,
    lineWidth: 3,
    theme: {
      background: '#ffffff',
      textColor: '#333333',
      fontSize: 11,
      axis: {
        domain: { line: { stroke: '#e0e0e0', strokeWidth: 1 } },
        ticks: { line: { stroke: '#e0e0e0', strokeWidth: 1 }, text: { fill: '#333333' } },
        legend: { text: { fill: '#333333', fontSize: 12, fontWeight: 600 } }
      },
      grid: { line: { stroke: '#e0e0e0', strokeWidth: 1 } },
      tooltip: {
        container: {
          background: '#ffffff',
          color: '#333333',
          fontSize: 12,
          borderRadius: '4px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
          border: '1px solid #e0e0e0'
        }
      }
    },
  };

  return (
    <div className="analysis-charts">
      <h2>Analysis Charts</h2>

      <div className="analysis-charts-grid">
        {/* Unrest Over Time with Tier Bands */}
        <div className="analysis-chart-container">
          <h3>Unrest Over Time</h3>
          <div className="analysis-chart-wrapper">
            <ResponsiveLine
              data={unrestChartData}
              {...commonLineProps}
              yScale={{ type: 'linear', min: 0, max: 10 }}
              axisLeft={{ ...commonLineProps.axisLeft, legend: 'Unrest' }}
              colors={['#e74c3c']}
              enableArea={true}
              areaOpacity={0.1}
              layers={[
                // Custom layer for tier bands
                ({ innerHeight, innerWidth }) => (
                  <g>
                    {/* Stable zone (0-2) */}
                    <rect x={0} y={innerHeight * 0.8} width={innerWidth} height={innerHeight * 0.2} fill="rgba(39, 174, 96, 0.1)" />
                    {/* Discontent zone (3-5) */}
                    <rect x={0} y={innerHeight * 0.5} width={innerWidth} height={innerHeight * 0.3} fill="rgba(255, 193, 7, 0.1)" />
                    {/* Turmoil zone (6-8) */}
                    <rect x={0} y={innerHeight * 0.2} width={innerWidth} height={innerHeight * 0.3} fill="rgba(255, 152, 0, 0.15)" />
                    {/* Rebellion zone (9-10) */}
                    <rect x={0} y={0} width={innerWidth} height={innerHeight * 0.2} fill="rgba(244, 67, 54, 0.2)" />
                  </g>
                ),
                'grid',
                'markers',
                'axes',
                'areas',
                'lines',
                'points',
                'slices',
                'mesh',
                'legends',
              ]}
              legends={[
                {
                  anchor: 'top-right',
                  direction: 'column',
                  translateX: -10,
                  translateY: 0,
                  itemsSpacing: 2,
                  itemWidth: 80,
                  itemHeight: 20,
                  symbolSize: 12,
                  symbolShape: 'circle',
                },
              ]}
            />
          </div>
          <div className="tier-legend">
            <span className="tier-label stable">Stable (0-2)</span>
            <span className="tier-label discontent">Discontent (3-5)</span>
            <span className="tier-label turmoil">Turmoil (6-8)</span>
            <span className="tier-label rebellion">Rebellion (9-10)</span>
          </div>
        </div>

        {/* Resource Net Flow Over Time */}
        <div className="analysis-chart-container">
          <h3>Resource Net Flow</h3>
          <div className="analysis-chart-wrapper">
            <ResponsiveLine
              data={resourceFlowChartData}
              {...commonLineProps}
              axisLeft={{ ...commonLineProps.axisLeft, legend: 'Net Change' }}
              colors={['#f39c12', '#27ae60']}
              legends={[
                {
                  anchor: 'top-right',
                  direction: 'column',
                  translateX: -10,
                  translateY: 0,
                  itemsSpacing: 2,
                  itemWidth: 80,
                  itemHeight: 20,
                  symbolSize: 12,
                  symbolShape: 'circle',
                },
              ]}
              markers={[
                {
                  axis: 'y',
                  value: 0,
                  lineStyle: { stroke: '#999', strokeWidth: 1, strokeDasharray: '4 4' },
                },
              ]}
            />
          </div>
        </div>

        {/* Action Outcomes - All Actions by Frequency */}
        <div className="analysis-chart-container wide">
          <h3>Action Outcomes (All Actions by Frequency)</h3>
          <div className="action-bars-container">
            {actionBarData.map((action) => {
              const total = action.attempts;
              const hasAttempts = total > 0;
              return (
                <div key={action.fullName} className={`action-bar-row ${!hasAttempts ? 'unused' : ''}`}>
                  <div className="action-bar-label" title={action.fullName}>
                    {action.action}
                  </div>
                  <div className="action-bar-track">
                    {hasAttempts ? (
                      <>
                        <div
                          className="action-bar-segment crit-success"
                          style={{ width: `${(action['Critical Success'] / total) * 100}%` }}
                          title={`Critical Success: ${action['Critical Success']}`}
                        />
                        <div
                          className="action-bar-segment success"
                          style={{ width: `${(action['Success'] / total) * 100}%` }}
                          title={`Success: ${action['Success']}`}
                        />
                        <div
                          className="action-bar-segment failure"
                          style={{ width: `${(action['Failure'] / total) * 100}%` }}
                          title={`Failure: ${action['Failure']}`}
                        />
                        <div
                          className="action-bar-segment crit-failure"
                          style={{ width: `${(action['Critical Failure'] / total) * 100}%` }}
                          title={`Critical Failure: ${action['Critical Failure']}`}
                        />
                      </>
                    ) : (
                      <div className="action-bar-unused" title="Not used" />
                    )}
                  </div>
                  <div className="action-bar-total">{total}</div>
                </div>
              );
            })}
            <div className="action-bar-legend">
              <span className="legend-item"><span className="legend-color crit-success"></span>Crit Success</span>
              <span className="legend-item"><span className="legend-color success"></span>Success</span>
              <span className="legend-item"><span className="legend-color failure"></span>Failure</span>
              <span className="legend-item"><span className="legend-color crit-failure"></span>Crit Failure</span>
              <span className="legend-item"><span className="legend-color unused"></span>Not Used</span>
            </div>
          </div>
        </div>

        {/* Progression Over Time */}
        <div className="analysis-chart-container">
          <h3>Kingdom Progression</h3>
          <div className="analysis-chart-wrapper">
            <ResponsiveLine
              data={progressionChartData}
              {...commonLineProps}
              yScale={{ type: 'linear', min: 0, max: 'auto' }}
              axisLeft={{ ...commonLineProps.axisLeft, legend: 'Count' }}
              colors={['#3498db', '#9b59b6', '#e67e22']}
              legends={[
                {
                  anchor: 'top-left',
                  direction: 'column',
                  translateX: 10,
                  translateY: 0,
                  itemsSpacing: 2,
                  itemWidth: 80,
                  itemHeight: 20,
                  symbolSize: 12,
                  symbolShape: 'circle',
                },
              ]}
            />
          </div>
        </div>

        {/* Result Type Distribution */}
        <div className="analysis-chart-container">
          <h3>Result Type Distribution</h3>
          <div className="analysis-chart-wrapper">
            <ResponsivePie
              data={pieData}
              margin={{ top: 20, right: 80, bottom: 60, left: 80 }}
              innerRadius={0.5}
              padAngle={0.7}
              cornerRadius={3}
              activeOuterRadiusOffset={8}
              colors={(d) => d.data.color}
              borderWidth={1}
              borderColor={{
                from: 'color',
                modifiers: [['darker', 0.2]],
              }}
              arcLinkLabelsSkipAngle={10}
              arcLinkLabelsTextColor="#333333"
              arcLinkLabelsThickness={2}
              arcLinkLabelsColor={{ from: 'color' }}
              arcLabelsSkipAngle={10}
              arcLabelsTextColor={{
                from: 'color',
                modifiers: [['darker', 2]],
              }}
              legends={[
                {
                  anchor: 'bottom',
                  direction: 'row',
                  justify: false,
                  translateX: 0,
                  translateY: 50,
                  itemsSpacing: 0,
                  itemWidth: 90,
                  itemHeight: 18,
                  itemTextColor: '#333',
                  itemDirection: 'left-to-right',
                  itemOpacity: 1,
                  symbolSize: 14,
                  symbolShape: 'circle',
                },
              ]}
            />
          </div>
        </div>
      </div>

      {/* Milestones Timeline */}
      {progression.milestones && progression.milestones.length > 0 && (
        <div className="milestones-section">
          <h3>Key Milestones</h3>
          <div className="milestones-timeline">
            {progression.milestones.slice(0, 10).map((milestone, idx) => (
              <div
                key={idx}
                className={`milestone-item ${onMilestoneClick ? 'clickable' : ''}`}
                onClick={() => onMilestoneClick?.(milestone.turn)}
                title={onMilestoneClick ? `Click to view Turn ${milestone.turn} in timeline` : undefined}
              >
                <span className="milestone-turn">Turn {milestone.turn}</span>
                <span className="milestone-event">{milestone.event}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
