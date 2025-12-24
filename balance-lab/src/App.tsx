import React, { useState, useEffect, useMemo } from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine
} from 'recharts';
import type { BatchReport, ActionStats, MapState, RunResult } from './types';
import { STRATEGY_COLORS, STRATEGY_LABELS, median, ALL_KINGDOM_ACTIONS } from './types';
import { KingdomMap } from './components/KingdomMap';
import { TimeScrubber } from './components/TimeScrubber';
import { UnrestBreakdown } from './components/UnrestBreakdown';
import { TurnTimeline } from './components/TurnTimeline';
import './App.css';

function App() {
  const [report, setReport] = useState<BatchReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStrategy, setSelectedStrategy] = useState<string | null>(null);
  const [selectedRun, setSelectedRun] = useState<number | null>(null);
  const [currentTurn, setCurrentTurn] = useState<number>(0);

  useEffect(() => {
    loadReport();
  }, []);

  const loadReport = async () => {
    try {
      const response = await fetch('/comparison.json');
      if (response.ok) {
        const data = await response.json();
        setReport(data);
        // Auto-select first strategy
        const strategies = Object.keys(data.strategies);
        if (strategies.length > 0) {
          setSelectedStrategy(strategies[0]);
        }
      }
    } catch {
      setError('Failed to load comparison.json');
    }
    setLoading(false);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        setReport(data);
        setError(null);
        const strategies = Object.keys(data.strategies);
        if (strategies.length > 0) {
          setSelectedStrategy(strategies[0]);
          setSelectedRun(null);
        }
      } catch {
        setError('Invalid JSON file');
      }
    };
    reader.readAsText(file);
  };

  // Get time-series data for current strategy
  const timeSeriesData = useMemo(() => {
    if (!report || !selectedStrategy) return null;

    const strategyData = report.strategies[selectedStrategy];
    if (!strategyData) return null;

    const runs = strategyData.results.filter(r => r.turnData && r.turnData.length > 0);
    if (runs.length === 0) return null;

    // Find max turns across all runs
    const maxTurns = Math.max(...runs.map(r => r.turnData?.length || 0));

    // Build data for each turn with median and individual runs
    const data = [];
    for (let turn = 1; turn <= maxTurns; turn++) {
      const turnValues = {
        turn,
        unrestValues: [] as number[],
        goldValues: [] as number[],
        foodValues: [] as number[],
        structureValues: [] as number[],
        hexValues: [] as number[],
      };

      // Collect values from each run for this turn
      runs.forEach((run) => {
        const turnData = run.turnData?.find(t => t.turn === turn);
        if (turnData) {
          turnValues.unrestValues.push(turnData.unrest);
          turnValues.goldValues.push(turnData.gold);
          turnValues.foodValues.push(turnData.food);
          turnValues.structureValues.push(turnData.structures);
          turnValues.hexValues.push(turnData.hexes);
        }
      });

      // Calculate medians
      const entry: Record<string, number> = {
        turn,
        unrestMedian: median(turnValues.unrestValues),
        goldMedian: median(turnValues.goldValues),
        foodMedian: median(turnValues.foodValues),
        structuresMedian: median(turnValues.structureValues),
        hexesMedian: median(turnValues.hexValues),
      };

      // Add individual run values
      runs.forEach((run, runIdx) => {
        const turnData = run.turnData?.find(t => t.turn === turn);
        if (turnData) {
          entry[`unrest_run${runIdx}`] = turnData.unrest;
          entry[`gold_run${runIdx}`] = turnData.gold;
          entry[`food_run${runIdx}`] = turnData.food;
          entry[`structures_run${runIdx}`] = turnData.structures;
          entry[`hexes_run${runIdx}`] = turnData.hexes;
        }
      });

      data.push(entry);
    }

    return { data, runs };
  }, [report, selectedStrategy]);

  // Get map states for selected run
  const selectedRunMapStates = useMemo((): MapState[] | null => {
    if (!report || !selectedStrategy || selectedRun === null) return null;

    const strategyData = report.strategies[selectedStrategy];
    if (!strategyData) return null;

    const run = strategyData.results[selectedRun];
    if (!run?.mapStates || run.mapStates.length === 0) return null;

    return run.mapStates;
  }, [report, selectedStrategy, selectedRun]);

  // Get current map state based on turn
  const currentMapState = useMemo(() => {
    if (!selectedRunMapStates) return null;
    return selectedRunMapStates.find(s => s.turn === currentTurn) || selectedRunMapStates[0];
  }, [selectedRunMapStates, currentTurn]);

  // Get the selected run data
  const selectedRunData = useMemo((): RunResult | null => {
    if (!report || !selectedStrategy || selectedRun === null) return null;
    const strategyData = report.strategies[selectedStrategy];
    if (!strategyData) return null;
    return strategyData.results[selectedRun] || null;
  }, [report, selectedStrategy, selectedRun]);

  // Reset turn when selecting a new run
  useEffect(() => {
    setCurrentTurn(0);
  }, [selectedRun, selectedStrategy]);

  // Get ALL kingdom actions (complete list, not just those attempted)
  const allActionNames = useMemo(() => {
    return new Set<string>(ALL_KINGDOM_ACTIONS);
  }, []);

  // Get action effectiveness data - individual run if selected, otherwise aggregated
  const actionData = useMemo(() => {
    if (!report || !selectedStrategy) return null;

    const strategyData = report.strategies[selectedStrategy];
    if (!strategyData) return null;

    const actionMap = new Map<string, ActionStats>();

    // If a specific run is selected, use only that run's stats
    if (selectedRun !== null && selectedRunData?.actionStats) {
      selectedRunData.actionStats.forEach(stat => {
        actionMap.set(stat.name, { ...stat });
      });
    } else {
      // Aggregate action stats across all runs for this strategy
      strategyData.results.forEach(run => {
        run.actionStats?.forEach(stat => {
          const existing = actionMap.get(stat.name);
          if (existing) {
            existing.attempts += stat.attempts;
            existing.successes += stat.successes;
            existing.critSuccesses += stat.critSuccesses;
            existing.failures += stat.failures;
            existing.critFailures += stat.critFailures;
          } else {
            actionMap.set(stat.name, { ...stat });
          }
        });
      });
    }

    // Include ALL actions, even those not used
    allActionNames.forEach(name => {
      if (!actionMap.has(name)) {
        actionMap.set(name, {
          name,
          attempts: 0,
          successes: 0,
          critSuccesses: 0,
          failures: 0,
          critFailures: 0,
        });
      }
    });

    // Convert to array and calculate percentage breakdown for each outcome
    const actions = Array.from(actionMap.values())
      .map(a => ({
        ...a,
        critFailPct: a.attempts > 0 ? (a.critFailures / a.attempts) * 100 : 0,
        failPct: a.attempts > 0 ? (a.failures / a.attempts) * 100 : 0,
        successPct: a.attempts > 0 ? (a.successes / a.attempts) * 100 : 0,
        critSuccessPct: a.attempts > 0 ? (a.critSuccesses / a.attempts) * 100 : 0,
        unusedPct: a.attempts === 0 ? 100 : 0,
      }))
      .sort((a, b) => b.attempts - a.attempts);

    return actions;
  }, [report, selectedStrategy, selectedRun, selectedRunData, allActionNames]);

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (!report) {
    return (
      <div className="upload-prompt">
        <h1>Balance Lab</h1>
        <p>Upload a batch comparison report to analyze strategy performance.</p>
        <input type="file" accept=".json" onChange={handleFileUpload} />
        {error && <p className="error">{error}</p>}
      </div>
    );
  }

  const strategies = Object.values(report.strategies);
  const currentStrategy = selectedStrategy ? report.strategies[selectedStrategy] : null;

  return (
    <div className="app">
      <header className="sticky-header">
        <div className="header-top">
          <h1>Balance Lab</h1>
          <div className="batch-info">
            <span className="batch-id">{report.batchId}</span>
            <span className="batch-config">
              {report.config.runs} runs x {report.config.turns} turns
            </span>
          </div>
          {currentStrategy && (
            <div className="run-selector">
              <label>View Run: </label>
              <select
                value={selectedRun ?? ''}
                onChange={(e) => setSelectedRun(e.target.value === '' ? null : parseInt(e.target.value))}
              >
                <option value="">All Runs (Median)</option>
                {currentStrategy.results.map((run, idx) => (
                  <option key={idx} value={idx}>
                    Run {run.runNumber} - {run.collapsed ? '💀 Collapsed' : `✓ ${run.turnsCompleted} turns`}
                  </option>
                ))}
              </select>
            </div>
          )}
          <input type="file" accept=".json" onChange={handleFileUpload} className="file-input" />
        </div>
        {/* Strategy Selector Tabs */}
        <div className="strategy-tabs">
          {strategies.map(s => (
            <button
              key={s.strategy}
              className={`strategy-tab ${selectedStrategy === s.strategy ? 'active' : ''}`}
              style={{
                borderColor: selectedStrategy === s.strategy ? STRATEGY_COLORS[s.strategy] : 'transparent',
                color: selectedStrategy === s.strategy ? STRATEGY_COLORS[s.strategy] : undefined
              }}
              onClick={() => {
                setSelectedStrategy(s.strategy);
                setSelectedRun(null);
              }}
            >
              {STRATEGY_LABELS[s.strategy] || s.strategy}
              <span className="survival-badge" style={{
                background: s.survivalRate >= 0.8 ? '#22c55e' : s.survivalRate >= 0.5 ? '#f59e0b' : '#ef4444'
              }}>
                {(s.survivalRate * 100).toFixed(0)}%
              </span>
            </button>
          ))}
        </div>
      </header>

      <main>
        {/* Map View - Only shown when a specific run is selected */}
        {selectedRun !== null && currentMapState && (
          <section className="chart-section map-section">
            <h2>Kingdom Map - Turn {currentTurn}</h2>
            <KingdomMap
              hexes={currentMapState.hexes}
              settlements={currentMapState.settlements}
              worksites={currentMapState.worksites}
            />
            <TimeScrubber
              currentTurn={currentTurn}
              maxTurn={selectedRunMapStates ? Math.max(...selectedRunMapStates.map(s => s.turn)) : 0}
              onTurnChange={setCurrentTurn}
            />
          </section>
        )}

        {/* Unrest Breakdown - Only shown when a specific run is selected */}
        {selectedRun !== null && selectedRunData?.unrestAnalysis && (
          <section className="chart-section">
            <UnrestBreakdown analysis={selectedRunData.unrestAnalysis} />
          </section>
        )}

        {/* Turn Timeline - Only shown when a specific run is selected */}
        {selectedRun !== null && selectedRunData?.turnData && selectedRunData.turnData.length > 0 && (
          <section className="chart-section">
            <TurnTimeline
              turnData={selectedRunData.turnData}
              collapsed={selectedRunData.collapsed}
            />
          </section>
        )}

        {/* Time Series Charts */}
        {timeSeriesData && (
          <>
            {/* Unrest Over Time */}
            <section className="chart-section">
              <h2>Unrest Over Time</h2>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={timeSeriesData.data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2a4a" />
                  <XAxis dataKey="turn" stroke="#a0a0a0" />
                  <YAxis domain={[0, 12]} stroke="#a0a0a0" />
                  <Tooltip
                    contentStyle={{ background: '#1a1a2e', border: '1px solid #2a2a4a' }}
                  />
                  <ReferenceLine y={3} stroke="#f59e0b" strokeDasharray="5 5" label="Discontent" />
                  <ReferenceLine y={6} stroke="#ef4444" strokeDasharray="5 5" label="Turmoil" />
                  {/* Individual runs (always faint, hidden from legend) */}
                  {timeSeriesData.runs.map((_, idx) => (
                    <Line
                      key={`unrest_run${idx}`}
                      type="monotone"
                      dataKey={`unrest_run${idx}`}
                      stroke={STRATEGY_COLORS[selectedStrategy!]}
                      strokeOpacity={0.2}
                      strokeWidth={1}
                      dot={false}
                      legendType="none"
                    />
                  ))}
                  {/* Median line (always visible, light gray) */}
                  <Line
                    type="monotone"
                    dataKey="unrestMedian"
                    stroke="#e0e0e0"
                    strokeWidth={2}
                    dot={false}
                    name="Median"
                  />
                  {/* Selected run (prominent, hidden from legend) */}
                  {selectedRun !== null && (
                    <Line
                      type="monotone"
                      dataKey={`unrest_run${selectedRun}`}
                      stroke={STRATEGY_COLORS[selectedStrategy!]}
                      strokeWidth={3}
                      dot={false}
                      legendType="none"
                    />
                  )}
                  <Legend />
                </LineChart>
              </ResponsiveContainer>
            </section>

            {/* Structures Over Time */}
            <section className="chart-section">
              <h2>Structures Over Time</h2>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={timeSeriesData.data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2a4a" />
                  <XAxis dataKey="turn" stroke="#a0a0a0" />
                  <YAxis stroke="#a0a0a0" />
                  <Tooltip
                    contentStyle={{ background: '#1a1a2e', border: '1px solid #2a2a4a' }}
                  />
                  {/* Individual runs (always faint, hidden from legend) */}
                  {timeSeriesData.runs.map((_, idx) => (
                    <Line
                      key={`structures_run${idx}`}
                      type="monotone"
                      dataKey={`structures_run${idx}`}
                      stroke="#3b82f6"
                      strokeOpacity={0.2}
                      strokeWidth={1}
                      dot={false}
                      legendType="none"
                    />
                  ))}
                  {/* Median line (always visible, light gray) */}
                  <Line
                    type="monotone"
                    dataKey="structuresMedian"
                    stroke="#e0e0e0"
                    strokeWidth={2}
                    dot={false}
                    name="Median"
                  />
                  {/* Selected run (prominent, hidden from legend) */}
                  {selectedRun !== null && (
                    <Line
                      type="monotone"
                      dataKey={`structures_run${selectedRun}`}
                      stroke="#3b82f6"
                      strokeWidth={3}
                      dot={false}
                      legendType="none"
                    />
                  )}
                  <Legend />
                </LineChart>
              </ResponsiveContainer>
            </section>

            {/* Resources Over Time */}
            <section className="chart-section">
              <h2>Resources Over Time (Gold & Food)</h2>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={timeSeriesData.data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2a4a" />
                  <XAxis dataKey="turn" stroke="#a0a0a0" />
                  <YAxis stroke="#a0a0a0" />
                  <Tooltip
                    contentStyle={{ background: '#1a1a2e', border: '1px solid #2a2a4a' }}
                  />
                  {/* Individual runs (always faint, hidden from legend) */}
                  {timeSeriesData.runs.map((_, idx) => (
                    <React.Fragment key={`resources_run${idx}`}>
                      <Line
                        type="monotone"
                        dataKey={`gold_run${idx}`}
                        stroke="#fbbf24"
                        strokeOpacity={0.15}
                        strokeWidth={1}
                        dot={false}
                        legendType="none"
                      />
                      <Line
                        type="monotone"
                        dataKey={`food_run${idx}`}
                        stroke="#22c55e"
                        strokeOpacity={0.15}
                        strokeWidth={1}
                        dot={false}
                        legendType="none"
                      />
                    </React.Fragment>
                  ))}
                  {/* Median lines (always visible, light gray) */}
                  <Line
                    type="monotone"
                    dataKey="goldMedian"
                    stroke="#e0e0e0"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={false}
                    name="Gold Median"
                  />
                  <Line
                    type="monotone"
                    dataKey="foodMedian"
                    stroke="#c0c0c0"
                    strokeWidth={2}
                    strokeDasharray="3 3"
                    dot={false}
                    name="Food Median"
                  />
                  {/* Selected run (prominent, hidden from legend) */}
                  {selectedRun !== null && (
                    <>
                      <Line
                        type="monotone"
                        dataKey={`gold_run${selectedRun}`}
                        stroke="#fbbf24"
                        strokeWidth={3}
                        dot={false}
                        legendType="none"
                      />
                      <Line
                        type="monotone"
                        dataKey={`food_run${selectedRun}`}
                        stroke="#22c55e"
                        strokeWidth={3}
                        dot={false}
                        legendType="none"
                      />
                    </>
                  )}
                  <Legend />
                </LineChart>
              </ResponsiveContainer>
            </section>
          </>
        )}

        {/* Action Effectiveness */}
        {actionData && actionData.length > 0 && (
          <section className="chart-section">
            <h2>Action Effectiveness - {selectedRun !== null ? `Run ${selectedRun + 1}` : 'All Runs'} ({STRATEGY_LABELS[selectedStrategy!] || selectedStrategy})</h2>
            <ResponsiveContainer width="100%" height={Math.max(300, actionData.length * 28)}>
              <BarChart data={actionData} layout="vertical" barSize={20} margin={{ right: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a4a" />
                <XAxis type="number" domain={[0, 100]} unit="%" stroke="#a0a0a0" tickFormatter={(v) => Math.round(v).toString()} />
                <YAxis type="category" dataKey="name" width={150} stroke="#a0a0a0" tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ background: '#1a1a2e', border: '1px solid #2a2a4a' }}
                />
                <Bar dataKey="critFailPct" stackId="outcome" fill="#ef4444" name="Crit Fail"
                  label={({ x, y, width, height, index }) => {
                    const action = actionData[index as number];
                    if (!action || action.critFailures === 0 || (width as number) < 15) return null;
                    return (
                      <text x={(x as number) + (width as number) / 2} y={(y as number) + (height as number) / 2 + 4}
                        fill="#fff" fontSize={9} textAnchor="middle">{action.critFailures}</text>
                    );
                  }}
                />
                <Bar dataKey="failPct" stackId="outcome" fill="#991b1b" name="Failure"
                  label={({ x, y, width, height, index }) => {
                    const action = actionData[index as number];
                    if (!action || action.failures === 0 || (width as number) < 15) return null;
                    return (
                      <text x={(x as number) + (width as number) / 2} y={(y as number) + (height as number) / 2 + 4}
                        fill="#fff" fontSize={9} textAnchor="middle">{action.failures}</text>
                    );
                  }}
                />
                <Bar dataKey="successPct" stackId="outcome" fill="#15803d" name="Success"
                  label={({ x, y, width, height, index }) => {
                    const action = actionData[index as number];
                    if (!action || action.successes === 0 || (width as number) < 15) return null;
                    return (
                      <text x={(x as number) + (width as number) / 2} y={(y as number) + (height as number) / 2 + 4}
                        fill="#fff" fontSize={9} textAnchor="middle">{action.successes}</text>
                    );
                  }}
                />
                <Bar dataKey="critSuccessPct" stackId="outcome" fill="#22c55e" name="Crit Success"
                  label={({ x, y, width, height, index }) => {
                    const action = actionData[index as number];
                    if (!action || action.attempts === 0) return null;
                    // Show crit success count if segment is wide enough
                    const critLabel = action.critSuccesses > 0 && (width as number) >= 15 ? (
                      <text x={(x as number) + (width as number) / 2} y={(y as number) + (height as number) / 2 + 4}
                        fill="#fff" fontSize={9} textAnchor="middle">{action.critSuccesses}</text>
                    ) : null;
                    // Always show total at the end
                    const totalX = (x as number) + (width as number) + 8;
                    return (
                      <g>
                        {critLabel}
                        <text x={totalX} y={(y as number) + (height as number) / 2 + 4}
                          fill="#a0a0a0" fontSize={10} textAnchor="start">{action.attempts}</text>
                      </g>
                    );
                  }}
                />
                <Bar dataKey="unusedPct" stackId="outcome" fill="#4a4a4a" name="Unused"
                  label={({ x, y, width, height, index }) => {
                    const action = actionData[index as number];
                    if (!action || action.attempts > 0) return null;
                    return (
                      <text x={(x as number) + (width as number) / 2} y={(y as number) + (height as number) / 2 + 4}
                        fill="#888" fontSize={9} textAnchor="middle">unused</text>
                    );
                  }}
                />
                <Legend />
              </BarChart>
            </ResponsiveContainer>
          </section>
        )}

        {/* Insights */}
        {report.insights.length > 0 && (
          <section className="insights">
            <h2>Key Insights</h2>
            <ul>
              {report.insights.map((insight, i) => (
                <li key={i} className={insight.includes('⚠️') ? 'warning' : ''}>
                  {insight}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Rankings */}
        <section className="rankings">
          <h2>Rankings</h2>
          <div className="rankings-grid">
            <div className="ranking-card">
              <h3>By Survival</h3>
              <ol>
                {report.rankings.bySurvival.map((s) => (
                  <li key={s} style={{ color: STRATEGY_COLORS[s] }}>
                    {STRATEGY_LABELS[s] || s}
                    <span className="stat">
                      {(report.strategies[s].survivalRate * 100).toFixed(0)}%
                    </span>
                  </li>
                ))}
              </ol>
            </div>
            <div className="ranking-card">
              <h3>By Structures</h3>
              <ol>
                {report.rankings.byStructures.map((s) => (
                  <li key={s} style={{ color: STRATEGY_COLORS[s] }}>
                    {STRATEGY_LABELS[s] || s}
                    <span className="stat">
                      {report.strategies[s].avgStructures.toFixed(1)}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
            <div className="ranking-card">
              <h3>By Territory</h3>
              <ol>
                {report.rankings.byExpansion.map((s) => (
                  <li key={s} style={{ color: STRATEGY_COLORS[s] }}>
                    {STRATEGY_LABELS[s] || s}
                    <span className="stat">
                      {report.strategies[s].avgHexesClaimed.toFixed(1)} hexes
                    </span>
                  </li>
                ))}
              </ol>
            </div>
            <div className="ranking-card">
              <h3>By Stability</h3>
              <ol>
                {report.rankings.byStability.map((s) => (
                  <li key={s} style={{ color: STRATEGY_COLORS[s] }}>
                    {STRATEGY_LABELS[s] || s}
                    <span className="stat">
                      {report.strategies[s].avgFinalUnrest.toFixed(1)} unrest
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        {/* Detailed Stats Table */}
        <section className="stats-table-section">
          <h2>Detailed Statistics</h2>
          <table className="stats-table">
            <thead>
              <tr>
                <th>Strategy</th>
                <th>Runs</th>
                <th>Survival</th>
                <th>Structures</th>
                <th>Hexes</th>
                <th>Worksites</th>
                <th>Unrest</th>
                <th>Success Rate</th>
              </tr>
            </thead>
            <tbody>
              {strategies.map(s => (
                <tr
                  key={s.strategy}
                  style={{ borderLeft: `4px solid ${STRATEGY_COLORS[s.strategy]}` }}
                  className={selectedStrategy === s.strategy ? 'selected' : ''}
                  onClick={() => setSelectedStrategy(s.strategy)}
                >
                  <td className="strategy-name">{STRATEGY_LABELS[s.strategy] || s.strategy}</td>
                  <td>{s.runs}</td>
                  <td>{(s.survivalRate * 100).toFixed(0)}%</td>
                  <td>{s.avgStructures.toFixed(1)} <span className="std">(+/-{s.stdStructures.toFixed(1)})</span></td>
                  <td>{s.avgHexesClaimed.toFixed(1)}</td>
                  <td>{s.avgWorksites.toFixed(1)}</td>
                  <td>{s.avgFinalUnrest.toFixed(1)} <span className="std">(+/-{s.stdUnrest.toFixed(1)})</span></td>
                  <td>{s.avgSuccessRate ? `${(s.avgSuccessRate * 100).toFixed(0)}%` : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </main>

      <footer>
        <p>Generated: {new Date(report.generatedAt).toLocaleString()}</p>
      </footer>
    </div>
  );
}

export default App;
