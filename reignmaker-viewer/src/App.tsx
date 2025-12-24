import { useState, useEffect, useRef } from 'react';
import type { SimulationInfo, SimulationData, TurnReport, AnalysisReport } from './types/simulation';
import { getAvailableSimulations, loadSimulation, loadAllTurns, runSimulation, checkSimulationStatus, loadAnalysisReport } from './utils/dataLoader';
import { KingdomMap } from './components/KingdomMap';
import { TimeScrubber } from './components/TimeScrubber';
import { AnalysisPanel } from './components/AnalysisPanel';
import { AnalysisCharts } from './components/AnalysisCharts';
import { SimulationAssessment } from './components/SimulationAssessment';
import { SettlementDetails } from './components/SettlementDetails';
import { BalanceConfigPanel } from './components/BalanceConfigPanel';
import { WorksiteProduction } from './components/WorksiteProduction';
import './App.css';

function App() {
  const [simulations, setSimulations] = useState<SimulationInfo[]>([]);
  const [selectedSimId, setSelectedSimId] = useState<string>('');
  const [simulation, setSimulation] = useState<SimulationData | null>(null);
  const [turns, setTurns] = useState<TurnReport[]>([]);
  const [analysisReport, setAnalysisReport] = useState<AnalysisReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'report' | 'turns'>('report');

  // Simulation runner state
  const [showRunDialog, setShowRunDialog] = useState(false);
  const [runTurns, setRunTurns] = useState(15);
  const [runningSimId, setRunningSimId] = useState<string | null>(null);
  const [runStatus, setRunStatus] = useState<string>('');
  const [runLogs, setRunLogs] = useState<string[]>([]);
  const statusCheckInterval = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Map view and timeline state
  const [currentTurn, setCurrentTurn] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const playbackInterval = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load available simulations on mount
  useEffect(() => {
    async function loadSims() {
      try {
        const sims = await getAvailableSimulations();
        setSimulations(sims);
        if (sims.length > 0) {
          // Auto-select the latest simulation
          setSelectedSimId(sims[sims.length - 1].id);
        }
      } catch (err) {
        console.error('Failed to load simulations:', err);
        setError('Failed to load simulations list');
      }
    }
    loadSims();
  }, []);

  // Load simulation data when selection changes
  useEffect(() => {
    if (!selectedSimId) return;

    async function loadSimData() {
      setLoading(true);
      setError('');
      try {
        const simData = await loadSimulation(selectedSimId);
        if (!simData) {
          setError('Failed to load simulation');
          return;
        }
        setSimulation(simData);

        // Load all turns (pass hex map for optimized format support)
        const fullHexMap = simData.summary.finalState.hexes || [];
        const turnData = await loadAllTurns(selectedSimId, simData.summary.totalTurns, fullHexMap);
        setTurns(turnData);

        // Load analysis report if available
        const analysis = await loadAnalysisReport(selectedSimId);
        setAnalysisReport(analysis);
      } catch (err) {
        console.error('Failed to load simulation data:', err);
        setError('Failed to load simulation data');
      } finally {
        setLoading(false);
      }
    }

    loadSimData();
  }, [selectedSimId]);

  // Poll for simulation status while running
  useEffect(() => {
    if (!runningSimId) {
      if (statusCheckInterval.current) {
        clearInterval(statusCheckInterval.current);
        statusCheckInterval.current = null;
      }
      return;
    }

    const checkStatus = async () => {
      const status = await checkSimulationStatus(runningSimId);
      if (status) {
        setRunStatus(status.status);
        setRunLogs(status.logs);

        if (status.status === 'completed' || status.status === 'failed') {
          setRunningSimId(null);
          if (statusCheckInterval.current) {
            clearInterval(statusCheckInterval.current);
            statusCheckInterval.current = null;
          }

          // Reload simulations list
          const sims = await getAvailableSimulations();
          setSimulations(sims);

          // Auto-select the latest simulation
          if (sims.length > 0) {
            setSelectedSimId(sims[sims.length - 1].id);
          }
        }
      }
    };

    // Check immediately
    checkStatus();

    // Then check every 2 seconds
    statusCheckInterval.current = setInterval(checkStatus, 2000);

    return () => {
      if (statusCheckInterval.current) {
        clearInterval(statusCheckInterval.current);
      }
    };
  }, [runningSimId]);

  // Reset current turn when simulation changes
  useEffect(() => {
    setCurrentTurn(1);
    setIsPlaying(false);
  }, [selectedSimId]);

  // Playback effect
  useEffect(() => {
    if (isPlaying && turns.length > 0) {
      playbackInterval.current = setInterval(() => {
        setCurrentTurn((prev) => {
          if (prev >= turns.length) {
            setIsPlaying(false);
            return turns.length;
          }
          return prev + 1;
        });
      }, 500);
    } else {
      if (playbackInterval.current) {
        clearInterval(playbackInterval.current);
        playbackInterval.current = null;
      }
    }

    return () => {
      if (playbackInterval.current) {
        clearInterval(playbackInterval.current);
      }
    };
  }, [isPlaying, turns.length]);

  const handlePlayPauseToggle = () => {
    setIsPlaying(!isPlaying);
  };

  // Handle milestone click - switch to turns tab and scroll to turn
  const handleMilestoneClick = (turnNumber: number) => {
    setActiveTab('turns');
    // Use setTimeout to allow the tab to render before scrolling
    setTimeout(() => {
      const turnRow = document.getElementById(`turn-row-${turnNumber}`);
      if (turnRow) {
        turnRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Add a brief highlight effect
        turnRow.classList.add('highlight');
        setTimeout(() => turnRow.classList.remove('highlight'), 2000);
      }
    }, 100);
  };

  // Handle running a new simulation
  const handleRunSimulation = async () => {
    setShowRunDialog(false);
    setError(''); // Clear any previous errors
    console.log('Starting simulation with', runTurns, 'turns...');

    const result = await runSimulation({ turns: runTurns });
    console.log('Simulation start result:', result);

    if (result) {
      setRunningSimId(result.runId);
      setRunStatus('starting');
      setRunLogs([]);
      console.log('Simulation started with ID:', result.runId);
    } else {
      const errorMsg = 'Failed to start simulation. Check the console for details.';
      console.error(errorMsg);
      setError(errorMsg);
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>Kingdom Simulation Viewer</h1>
        <div className="header-controls">
          <div className="sim-selector">
            <label htmlFor="simulation-select">Simulation: </label>
            <select
              id="simulation-select"
              value={selectedSimId}
              onChange={(e) => setSelectedSimId(e.target.value)}
              disabled={loading || simulations.length === 0}
            >
              {simulations.map((sim) => (
                <option key={sim.id} value={sim.id}>
                  {sim.id} ({sim.totalTurns} turns{sim.collapsed ? ' - COLLAPSED' : ''})
                </option>
              ))}
            </select>
          </div>
          <button
            className="run-sim-button"
            onClick={() => alert('To run a new simulation:\n\ncd /Users/mark/Documents/repos/reignmaker-sim\nnpm run simulate -- --turns=15\n\nThen refresh this page to see the results.')}
            title="Click for instructions on running simulations"
          >
            Run New Simulation (Manual)
          </button>
        </div>
      </header>

      {/* Run Simulation Dialog */}
      {showRunDialog && (
        <div className="modal-overlay" onClick={() => setShowRunDialog(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Run New Simulation</h2>
            <div className="form-group">
              <label htmlFor="turns-input">Number of Turns:</label>
              <input
                id="turns-input"
                type="number"
                min="1"
                max="120"
                value={runTurns}
                onChange={(e) => setRunTurns(parseInt(e.target.value) || 15)}
              />
            </div>
            <div className="modal-actions">
              <button onClick={handleRunSimulation} className="btn-primary">
                Run Simulation
              </button>
              <button onClick={() => setShowRunDialog(false)} className="btn-secondary">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Simulation Running Status */}
      {runningSimId && (
        <div className="running-status">
          <h3>Simulation Running: {runStatus}</h3>
          <div className="log-output">
            {runLogs.slice(-10).map((log, idx) => (
              <div key={idx} className="log-line">
                {log}
              </div>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {loading && (
        <div className="loading-message">
          Loading simulation data...
        </div>
      )}

      {!loading && simulation && turns.length > 0 && (
        <>
          {/* Tab Navigation */}
          <nav className="tab-navigation">
            <button
              className={`tab-button ${activeTab === 'report' ? 'active' : ''}`}
              onClick={() => setActiveTab('report')}
            >
              Report & Map
            </button>
            <button
              className={`tab-button ${activeTab === 'turns' ? 'active' : ''}`}
              onClick={() => setActiveTab('turns')}
            >
              Turn Timeline
            </button>
          </nav>

          <main className="simulation-view">
            {/* Report Tab */}
            {activeTab === 'report' && (
              <>
                {/* Balance Configuration Panel - shows what parameters are being tested */}
                <BalanceConfigPanel config={simulation.balanceConfig} />

                <div className="summary-section">
                  <h2>Summary</h2>
                  <div className="stat-cards">
                    <div className="stat-card">
                      <h3>Total Turns</h3>
                      <div className="value">{simulation.summary.totalTurns}</div>
                    </div>
                    <div className={`stat-card ${simulation.summary.finalState.unrest > 5 ? 'danger' : 'success'}`}>
                      <h3>Final Unrest</h3>
                      <div className="value">{simulation.summary.finalState.unrest}</div>
                    </div>
                    <div className="stat-card success">
                      <h3>Final Resources</h3>
                      <div className="value">
                        {simulation.summary.finalState.resources.gold}g{' '}
                        {simulation.summary.finalState.resources.food}f
                      </div>
                    </div>
                    <div className="stat-card">
                      <h3>Hexes Claimed</h3>
                      <div className="value">{simulation.summary.finalState.hexesClaimed}</div>
                    </div>
                    <div className="stat-card">
                      <h3>Settlements</h3>
                      <div className="value">{simulation.summary.finalState.settlements?.length ?? 0}</div>
                      <div className="sub-value">
                        {(simulation.summary.finalState.settlements ?? []).reduce(
                          (sum, s) => sum + (s.structureIds?.length ?? s.structures?.length ?? 0),
                          0
                        )}{' '}
                        structures
                      </div>
                    </div>
                    <div className={`stat-card ${simulation.summary.collapsed ? 'danger' : 'success'}`}>
                      <h3>Kingdom Status</h3>
                      <div className="value">{simulation.summary.collapsed ? '✗' : '✓'}</div>
                    </div>
                  </div>
                </div>

                <div className="map-section">
                  <h2>Kingdom Map (Turn {currentTurn})</h2>
                  {(() => {
                    const currentTurnData = turns[currentTurn - 1];
                    const hasFullState = currentTurnData?.endState?.hexes &&
                                         currentTurnData?.endState?.settlementsList &&
                                         currentTurnData?.endState?.worksitesList;

                    if (!hasFullState) {
                      // Fallback to final state if turn data doesn't have full state
                      return simulation.summary.finalState.hexes ? (
                        <>
                          <div className="map-info">
                            <p>Showing final state (turn {turns.length}) - full turn-by-turn data not available in this simulation.</p>
                          </div>
                          <KingdomMap
                            hexes={simulation.summary.finalState.hexes}
                            worksites={simulation.summary.finalState.worksites}
                            settlements={simulation.summary.finalState.settlements}
                          />
                        </>
                      ) : (
                        <div className="map-placeholder">
                          <p>Map data not available.</p>
                        </div>
                      );
                    }

                    return (
                      <KingdomMap
                        hexes={currentTurnData.endState.hexes!}
                        worksites={currentTurnData.endState.worksitesList!}
                        settlements={currentTurnData.endState.settlementsList!}
                      />
                    );
                  })()}
                </div>

                <div className="time-scrubber-section">
                  <TimeScrubber
                    totalTurns={turns.length}
                    currentTurn={currentTurn}
                    onTurnChange={setCurrentTurn}
                    isPlaying={isPlaying}
                    onPlayPauseToggle={handlePlayPauseToggle}
                  />
                </div>

                {/* Worksite Production - updates with time scrubber */}
                {(() => {
                  const currentTurnData = turns[currentTurn - 1];
                  const worksitesList = currentTurnData?.endState?.worksitesList
                    || simulation.summary.finalState.worksites
                    || [];
                  return (
                    <WorksiteProduction
                      worksites={worksitesList}
                      turn={currentTurn}
                    />
                  );
                })()}

                {/* Written Assessment */}
                {analysisReport && (
                  <SimulationAssessment analysis={analysisReport} summary={simulation.summary} />
                )}

                {/* Settlement Details */}
                <SettlementDetails settlements={simulation.summary.finalState.settlements || []} />

                {/* Balance Analysis Section */}
                {analysisReport && (
                  <>
                    <div className="analysis-section-wrapper">
                      <AnalysisPanel analysis={analysisReport} />
                    </div>
                    <AnalysisCharts analysis={analysisReport} turns={turns} onMilestoneClick={handleMilestoneClick} />
                  </>
                )}

                {!analysisReport && (
                  <div className="analysis-placeholder">
                    <p>No balance analysis available for this simulation.</p>
                    <p className="hint">Run <code>npm run simulate</code> to generate a new simulation with analysis.</p>
                  </div>
                )}
              </>
            )}

            {/* Turns Tab */}
            {activeTab === 'turns' && (
              <div className="timeline-section">
            <h2>Turn-by-Turn Timeline</h2>
            <div className="timeline-table-container">
              <table className="timeline-table">
                <thead>
                  <tr>
                    <th>Turn</th>
                    <th>Phase/Action</th>
                    <th>Gold</th>
                    <th>Food</th>
                    <th>Lumber</th>
                    <th>Stone</th>
                    <th>Ore</th>
                    <th>DC</th>
                    <th>Roll</th>
                    <th>Result</th>
                    <th>Effects</th>
                    <th>Worksites</th>
                    <th>Hexes</th>
                    <th>Unrest</th>
                  </tr>
                </thead>
                <tbody>
                  {turns.map((turn) => {
                    const snapshots = turn.resourceSnapshots || [];
                    // Calculate level based on 100-turn progression (level 1-20)
                    const calculatedLevel = Math.min(20, 1 + Math.floor((turn.turnNumber - 1) * 19 / 99));
                    return snapshots.map((snapshot, idx) => {
                      const prevSnapshot = idx > 0 ? snapshots[idx - 1] : null;
                      const unrestTier = Math.min(3, Math.floor(snapshot.unrest / 3));

                      // Get roll info for this snapshot
                      const getRollInfo = (source: string) => {
                        const playerAction = turn.playerActions.find(
                          (pa) => source === `${pa.playerName}: ${pa.actionName}`
                        );
                        if (playerAction) {
                          const resultCode =
                            playerAction.outcome === 'Critical Success'
                              ? 'CS'
                              : playerAction.outcome === 'Success'
                              ? 'S'
                              : playerAction.outcome === 'Failure'
                              ? 'F'
                              : 'CF';
                          const resultClass = playerAction.outcome
                            .toLowerCase()
                            .replace(' ', '-');
                          return {
                            dc: String(turn.dc),
                            roll: String(playerAction.roll),
                            result: resultCode,
                            resultClass,
                          };
                        }

                        if (source.startsWith('Event:') && turn.eventResult) {
                          const ev = turn.eventResult;
                          const resultCode =
                            ev.outcome === 'Critical Success'
                              ? 'CS'
                              : ev.outcome === 'Success'
                              ? 'S'
                              : ev.outcome === 'Failure'
                              ? 'F'
                              : 'CF';
                          const resultClass = ev.outcome.toLowerCase().replace(' ', '-');
                          return {
                            dc: String(ev.dc),
                            roll: String(ev.roll),
                            result: resultCode,
                            resultClass,
                          };
                        }

                        if (source.startsWith('Incident:') && turn.incidentResult) {
                          const inc = turn.incidentResult;
                          const resultCode =
                            inc.outcome === 'Critical Success'
                              ? 'CS'
                              : inc.outcome === 'Success'
                              ? 'S'
                              : inc.outcome === 'Failure'
                              ? 'F'
                              : 'CF';
                          const resultClass = inc.outcome.toLowerCase().replace(' ', '-');
                          return {
                            dc: String(inc.dc),
                            roll: String(inc.roll),
                            result: resultCode,
                            resultClass,
                          };
                        }

                        return { dc: '', roll: '', result: '', resultClass: '' };
                      };

                      const rollInfo = getRollInfo(snapshot.source);

                      // Enhance source display with approach for events
                      const getDisplaySource = (source: string): string => {
                        if (source.startsWith('Event:') && turn.eventResult) {
                          const eventName = source.replace('Event: ', '');
                          return `Event: ${eventName} (${turn.eventResult.approach})`;
                        }
                        return source;
                      };

                      const displaySource = getDisplaySource(snapshot.source);

                      // Get effects
                      const getEffects = (source: string): string => {
                        const playerAction = turn.playerActions.find(
                          (pa) => source === `${pa.playerName}: ${pa.actionName}`
                        );
                        if (playerAction && playerAction.effects.length > 0) {
                          return playerAction.effects.join('; ');
                        }

                        if (source.startsWith('Event:') && turn.eventResult) {
                          return turn.eventResult.effects.join('; ');
                        }

                        if (source.startsWith('Incident:') && turn.incidentResult) {
                          return turn.incidentResult.effects.join('; ');
                        }

                        const phaseName = source.replace(' Phase', '').replace(' (no event)', '');
                        const phase = turn.phases.find((p) => p.phase === phaseName);
                        if (phase && phase.changes && phase.changes.length > 0) {
                          return phase.changes.join('; ');
                        }

                        return '';
                      };

                      const effects = getEffects(snapshot.source);

                      const resourceChanged = (current: number, prev: number | null) => {
                        if (prev === null) return '';
                        const diff = current - prev;
                        if (diff === 0) return '';
                        return diff > 0 ? 'changed-up' : 'changed-down';
                      };

                      return (
                        <tr
                          key={`${turn.turnNumber}-${idx}`}
                          id={idx === 0 ? `turn-row-${turn.turnNumber}` : undefined}
                          className={`snapshot-row ${rollInfo.resultClass} ${
                            idx === 0 ? 'turn-start' : ''
                          }`}
                        >
                          {idx === 0 && (
                            <td className="turn-col" rowSpan={snapshots.length}>
                              <div className="turn-number">{turn.turnNumber}</div>
                              <div className="turn-level">Lv{calculatedLevel}</div>
                            </td>
                          )}
                          <td className="source-col">{displaySource}</td>
                          <td
                            className={`resource-col gold ${resourceChanged(
                              snapshot.gold,
                              prevSnapshot?.gold ?? null
                            )}`}
                          >
                            {snapshot.gold}
                          </td>
                          <td
                            className={`resource-col food ${resourceChanged(
                              snapshot.food,
                              prevSnapshot?.food ?? null
                            )}`}
                          >
                            {snapshot.food}
                          </td>
                          <td
                            className={`resource-col lumber ${resourceChanged(
                              snapshot.lumber,
                              prevSnapshot?.lumber ?? null
                            )}`}
                          >
                            {snapshot.lumber}
                          </td>
                          <td
                            className={`resource-col stone ${resourceChanged(
                              snapshot.stone,
                              prevSnapshot?.stone ?? null
                            )}`}
                          >
                            {snapshot.stone}
                          </td>
                          <td
                            className={`resource-col ore ${resourceChanged(
                              snapshot.ore,
                              prevSnapshot?.ore ?? null
                            )}`}
                          >
                            {snapshot.ore}
                          </td>
                          <td className="dc-col">{rollInfo.dc}</td>
                          <td className="roll-col">{rollInfo.roll}</td>
                          <td className={`result-col ${rollInfo.resultClass}`}>{rollInfo.result}</td>
                          <td className="effects-col">{effects}</td>
                          {idx === snapshots.length - 1 ? (
                            <>
                              <td className="hex-col">{turn.endState.worksites ?? 0}</td>
                              <td className="hex-col">{turn.endState.hexesClaimed}</td>
                            </>
                          ) : (
                            <>
                              <td className="hex-col"></td>
                              <td className="hex-col"></td>
                            </>
                          )}
                          <td className={`unrest-col unrest-${unrestTier}`}>{snapshot.unrest}</td>
                        </tr>
                      );
                    });
                  })}
                </tbody>
              </table>
            </div>
          </div>
            )}
          </main>
        </>
      )}
    </div>
  );
}

export default App;
