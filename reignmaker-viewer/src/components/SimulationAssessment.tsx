import type { AnalysisReport, SimulationSummary } from '../types/simulation';
import './SimulationAssessment.css';

interface SimulationAssessmentProps {
  analysis: AnalysisReport;
  summary: SimulationSummary;
}

export function SimulationAssessment({ analysis, summary }: SimulationAssessmentProps) {
  const { balanceAssessment, unrest, resourceFlow, actionEffectiveness, progression } = analysis;

  // Generate narrative sections
  const getOverallAssessment = () => {
    const health = balanceAssessment.overallHealth;
    const turns = analysis.turnsAnalyzed;

    if (summary.collapsed) {
      return `This kingdom **collapsed** after ${turns} turns. The collapse was caused by: ${summary.collapseReason || 'unmanageable unrest'}. This simulation demonstrates the challenges of maintaining kingdom stability when critical systems fail.`;
    }

    if (health === 'healthy') {
      return `This kingdom successfully **completed ${turns} turns** with excellent overall health. The simulation demonstrates effective resource management, controlled unrest, and steady progression. This run can serve as a benchmark for balanced gameplay.`;
    } else if (health === 'concerning') {
      return `This kingdom **survived ${turns} turns** but showed concerning trends. While not at immediate risk of collapse, several systems were under strain. This run highlights areas where the balance could be improved.`;
    } else {
      return `This kingdom **barely survived ${turns} turns** with problematic indicators throughout. Multiple systems were at or near failure, and collapse was narrowly avoided. This simulation reveals critical balance issues that need addressing.`;
    }
  };

  const getUnrestAssessment = () => {
    const { deathSpirals, timeInTier, volatility } = unrest;
    const rebellionTurns = timeInTier.rebellion;
    const stableTurns = timeInTier.stable;
    const totalTurns = analysis.turnsAnalyzed;

    let assessment = '';

    // Death spirals
    if (deathSpirals > 0) {
      assessment += `**Critical Issue:** ${deathSpirals} death spiral${deathSpirals > 1 ? 's' : ''} occurred, where unrest compounded faster than the kingdom could recover. `;
    }

    // Time in rebellion
    if (rebellionTurns > 0) {
      const pct = ((rebellionTurns / totalTurns) * 100).toFixed(0);
      assessment += `The kingdom spent ${rebellionTurns} turn${rebellionTurns > 1 ? 's' : ''} (${pct}%) in rebellion state, triggering severe incidents. `;
    }

    // Stability assessment
    if (stableTurns >= totalTurns * 0.7) {
      assessment += `The kingdom maintained stability for ${stableTurns} of ${totalTurns} turns, indicating well-balanced unrest mechanics. `;
    } else if (stableTurns >= totalTurns * 0.4) {
      assessment += `Stability was maintained for only ${stableTurns} of ${totalTurns} turns, suggesting unrest generation may be too aggressive. `;
    } else {
      assessment += `The kingdom struggled with stability, remaining stable for only ${stableTurns} of ${totalTurns} turns. Unrest mechanics may need significant rebalancing. `;
    }

    // Volatility
    if (volatility > 3) {
      assessment += `High volatility (${volatility.toFixed(1)}) indicates unpredictable swings in unrest, which may feel chaotic to players.`;
    } else if (volatility > 1.5) {
      assessment += `Moderate volatility (${volatility.toFixed(1)}) creates tension without feeling random.`;
    } else {
      assessment += `Low volatility (${volatility.toFixed(1)}) provides predictable unrest management.`;
    }

    return assessment || 'Unrest mechanics performed within normal parameters.';
  };

  const getResourceAssessment = () => {
    const { totals, bottlenecks, surpluses } = resourceFlow;
    const { avgNetFlow, avgSustainability } = totals;

    let assessment = '';

    // Food sustainability
    if (avgSustainability >= 0.95) {
      assessment += 'Food production was **excellent**, with settlements well-fed throughout the simulation. ';
    } else if (avgSustainability >= 0.8) {
      assessment += 'Food production was **adequate**, though some turns saw shortages. ';
    } else if (avgSustainability >= 0.6) {
      assessment += 'Food production was **strained**, with frequent shortages impacting unrest. ';
    } else {
      assessment += 'Food production was **critically insufficient**, leading to chronic starvation and unrest spikes. ';
    }

    // Gold economy
    if (avgNetFlow.gold >= 3) {
      assessment += 'The gold economy was **robust**, generating healthy surpluses for expansion. ';
    } else if (avgNetFlow.gold >= 0) {
      assessment += 'The gold economy was **balanced**, with modest positive flow. ';
    } else {
      assessment += 'The gold economy was **struggling**, frequently running deficits. ';
    }

    // Bottlenecks and surpluses
    if (bottlenecks.length > 0) {
      assessment += `Resource bottlenecks were identified in: ${bottlenecks.join(', ')}. `;
    }
    if (surpluses.length > 0) {
      assessment += `Surplus resources accumulated in: ${surpluses.join(', ')}.`;
    }

    return assessment || 'Resource management performed within expected parameters.';
  };

  const getActionAssessment = () => {
    const { overall, mostUsed, leastEffective } = actionEffectiveness;

    let assessment = '';

    // Overall success rate
    if (overall.successRate >= 0.7) {
      assessment += `Actions had a **strong success rate** of ${(overall.successRate * 100).toFixed(0)}%, indicating well-tuned DCs. `;
    } else if (overall.successRate >= 0.5) {
      assessment += `Actions had a **moderate success rate** of ${(overall.successRate * 100).toFixed(0)}%, providing meaningful challenge. `;
    } else {
      assessment += `Actions had a **low success rate** of ${(overall.successRate * 100).toFixed(0)}%, suggesting DCs may be too punishing. `;
    }

    // Critical rates
    if (overall.critRate > 0.15) {
      assessment += 'Critical successes occurred frequently, adding excitement. ';
    }
    if (overall.failureRate > 0.35) {
      assessment += 'High failure rates may frustrate players. ';
    }

    // Action diversity
    if (mostUsed.length > 0) {
      assessment += `Most relied-upon actions: ${mostUsed.slice(0, 3).join(', ')}. `;
    }
    if (leastEffective.length > 0) {
      assessment += `Actions needing balance review: ${leastEffective.slice(0, 2).join(', ')}.`;
    }

    return assessment || 'Action effectiveness was within normal parameters.';
  };

  const getProgressionAssessment = () => {
    const { expansionRate, structureBuildRate, milestones } = progression;

    let assessment = '';

    // Expansion rate
    if (expansionRate >= 1.5) {
      assessment += `Expansion was **rapid** at ${expansionRate.toFixed(2)} hexes/turn, possibly too fast for early game. `;
    } else if (expansionRate >= 0.8) {
      assessment += `Expansion proceeded at a **healthy pace** of ${expansionRate.toFixed(2)} hexes/turn. `;
    } else if (expansionRate >= 0.4) {
      assessment += `Expansion was **slow** at ${expansionRate.toFixed(2)} hexes/turn, limiting resource access. `;
    } else {
      assessment += `Expansion was **very limited** at ${expansionRate.toFixed(2)} hexes/turn, constraining kingdom growth. `;
    }

    // Structure building
    if (structureBuildRate >= 0.8) {
      assessment += 'Structure construction was active, rapidly developing settlements. ';
    } else if (structureBuildRate >= 0.3) {
      assessment += 'Structure construction proceeded at a reasonable pace. ';
    } else {
      assessment += 'Structure construction was minimal, leaving settlements underdeveloped. ';
    }

    // Milestones
    if (milestones && milestones.length > 0) {
      const keyMilestones = milestones.slice(-3).map(m => `Turn ${m.turn}: ${m.event}`).join('; ');
      assessment += `Key milestones: ${keyMilestones}.`;
    }

    return assessment || 'Kingdom progression followed expected patterns.';
  };

  const getComparisonNotes = () => {
    // Generate notes about what makes this simulation notable
    const notes: string[] = [];

    if (summary.collapsed) {
      notes.push('This run ended in collapse, providing data on failure conditions.');
    }

    if (unrest.deathSpirals > 0) {
      notes.push('Death spiral mechanics triggered, testing recovery systems.');
    }

    if (resourceFlow.totals.avgSustainability < 0.7) {
      notes.push('Food scarcity scenarios were explored, stress-testing feeding mechanics.');
    }

    if (actionEffectiveness.overall.successRate < 0.5) {
      notes.push('Low action success rates highlight potential DC scaling issues.');
    }

    if (progression.expansionRate > 1.5) {
      notes.push('Rapid expansion tested resource scaling and management capacity.');
    }

    const settlementCount = summary.finalState.settlements?.length || 0;
    if (settlementCount >= 3) {
      notes.push(`Multi-settlement management was tested with ${settlementCount} settlements.`);
    }

    return notes.length > 0 ? notes : ['Standard simulation parameters, useful as a baseline comparison.'];
  };

  return (
    <div className="simulation-assessment">
      <h2>Simulation Assessment</h2>

      <div className="assessment-section overall">
        <h3>Overall Summary</h3>
        <p dangerouslySetInnerHTML={{ __html: getOverallAssessment().replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
      </div>

      <div className="assessment-section">
        <h3>Unrest Mechanics</h3>
        <p dangerouslySetInnerHTML={{ __html: getUnrestAssessment().replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
      </div>

      <div className="assessment-section">
        <h3>Resource Economy</h3>
        <p dangerouslySetInnerHTML={{ __html: getResourceAssessment().replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
      </div>

      <div className="assessment-section">
        <h3>Action Effectiveness</h3>
        <p dangerouslySetInnerHTML={{ __html: getActionAssessment().replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
      </div>

      <div className="assessment-section">
        <h3>Kingdom Progression</h3>
        <p dangerouslySetInnerHTML={{ __html: getProgressionAssessment().replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
      </div>

      <div className="assessment-section comparison">
        <h3>Notable Observations</h3>
        <ul className="comparison-notes">
          {getComparisonNotes().map((note, idx) => (
            <li key={idx}>{note}</li>
          ))}
        </ul>
      </div>

      {balanceAssessment.issues.length > 0 && (
        <div className="assessment-section issues">
          <h3>Balance Issues Detected</h3>
          <ul className="issues-list">
            {balanceAssessment.issues.map((issue, idx) => (
              <li key={idx}>{issue}</li>
            ))}
          </ul>
        </div>
      )}

      {balanceAssessment.recommendations.length > 0 && (
        <div className="assessment-section recommendations">
          <h3>Recommendations</h3>
          <ul className="recommendations-list">
            {balanceAssessment.recommendations.map((rec, idx) => (
              <li key={idx}>{rec}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
