import type { BalanceConfig } from '../types/simulation';
import './BalanceConfigPanel.css';

interface BalanceConfigPanelProps {
  config?: BalanceConfig;
}

export function BalanceConfigPanel({ config }: BalanceConfigPanelProps) {
  if (!config) {
    return (
      <div className="balance-config-panel">
        <h2>Simulation Parameters</h2>
        <p className="no-config">Balance configuration not available for this simulation.</p>
      </div>
    );
  }

  return (
    <div className="balance-config-panel">
      <h2>Simulation Parameters</h2>
      <p className="config-intro">Current balance settings being tested in this simulation run.</p>

      <div className="config-grid">
        {/* Food Production */}
        <div className="config-section">
          <h3>Food Production</h3>
          <table className="config-table">
            <tbody>
              <tr>
                <td className="label">Plains Farmstead</td>
                <td className="value">{config.foodProduction.plains} food/turn</td>
              </tr>
              <tr>
                <td className="label">Hills Farmstead</td>
                <td className="value">{config.foodProduction.hills} food/turn</td>
              </tr>
              <tr>
                <td className="label">Swamp Fishing Camp</td>
                <td className="value">{config.foodProduction.swamp} food/turn</td>
              </tr>
              <tr>
                <td className="label">Water Fishing Camp</td>
                <td className="value">{config.foodProduction.water} food/turn</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Unrest Mechanics */}
        <div className="config-section">
          <h3>Unrest Mechanics</h3>
          <table className="config-table">
            <tbody>
              <tr>
                <td className="label">Hex-based Unrest</td>
                <td className={`value ${config.unrest.hexUnrestEnabled ? 'enabled' : 'disabled'}`}>
                  {config.unrest.hexUnrestEnabled
                    ? `+1 per ${config.unrest.hexesPerUnrest} hexes`
                    : 'Disabled'}
                </td>
              </tr>
              <tr>
                <td className="label">Metropolis Complexity</td>
                <td className="value">+{config.unrest.metropolisComplexityUnrest} unrest/turn</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Fame Mechanics */}
        <div className="config-section">
          <h3>Fame Mechanics</h3>
          <table className="config-table">
            <tbody>
              <tr>
                <td className="label">Base Fame/Turn</td>
                <td className="value">+{config.fame.basePerTurn}</td>
              </tr>
              <tr>
                <td className="label">Critical Success Bonus</td>
                <td className="value">+{config.fame.critSuccessBonus} fame</td>
              </tr>
              <tr>
                <td className="label">Fame to Unrest</td>
                <td className="value">1 fame = -{config.fame.unrestConversion} unrest</td>
              </tr>
              <tr>
                <td className="label">Fame to Gold</td>
                <td className="value">1 fame = +{config.fame.goldConversion} gold</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Resource Decay */}
        <div className="config-section">
          <h3>Resource Decay</h3>
          <table className="config-table">
            <tbody>
              <tr>
                <td className="label">Lumber</td>
                <td className={`value ${config.resourceDecay.lumberDecays ? 'enabled' : 'disabled'}`}>
                  {config.resourceDecay.lumberDecays ? 'Decays at end of turn' : 'Persists'}
                </td>
              </tr>
              <tr>
                <td className="label">Stone</td>
                <td className={`value ${config.resourceDecay.stoneDecays ? 'enabled' : 'disabled'}`}>
                  {config.resourceDecay.stoneDecays ? 'Decays at end of turn' : 'Persists'}
                </td>
              </tr>
              <tr>
                <td className="label">Ore</td>
                <td className={`value ${config.resourceDecay.oreDecays ? 'enabled' : 'disabled'}`}>
                  {config.resourceDecay.oreDecays ? 'Decays at end of turn' : 'Persists'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Commerce Rates */}
        <div className="config-section commerce-section">
          <h3>Commerce Trade Rates</h3>
          <table className="config-table commerce-table">
            <thead>
              <tr>
                <th>Tier</th>
                <th>Sell (Res to Gold)</th>
                <th>Buy (Gold to Res)</th>
              </tr>
            </thead>
            <tbody>
              {config.commerce.sellRates.map((sell, idx) => {
                const buy = config.commerce.buyRates[idx];
                const tierNames = ['None', 'Market Square', 'Bazaar', 'Merchant Guild', 'Imperial Bank', 'Crit Bonus'];
                return (
                  <tr key={idx}>
                    <td className="tier-name">T{idx}: {tierNames[idx]}</td>
                    <td className="rate">{sell.resourceCost}:{sell.goldGain}</td>
                    <td className="rate">{buy.goldCost}:{buy.resourceGain}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
