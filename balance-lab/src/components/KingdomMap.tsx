import { useMemo, useState } from 'react';
import type { HexData, WorksiteData, SettlementData } from '../types';
import './KingdomMap.css';

interface KingdomMapProps {
  hexes: HexData[];
  worksites?: WorksiteData[];
  settlements?: SettlementData[];
}

interface HexLayout {
  x: number;
  y: number;
  hex: HexData;
}

const HEX_SIZE = 20;
const HEX_WIDTH = HEX_SIZE * Math.sqrt(3);
const HEX_HEIGHT = HEX_SIZE * 2;

export function KingdomMap({ hexes, worksites = [], settlements = [] }: KingdomMapProps) {
  const [hoveredHex, setHoveredHex] = useState<HexData | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

  const totalHexes = hexes.length;
  const totalWorksites = worksites.length;
  const claimedHexes = hexes.filter(hex => hex.claimedBy === 'player').length;

  const getHexWorksites = (hexId: string) => worksites.filter(w => w.hexId === hexId);
  const getHexSettlement = (hexId: string) => settlements.find(s => s.hexId === hexId);

  const hexLayout = useMemo(() => {
    const layout: HexLayout[] = [];
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    for (const hex of hexes) {
      const col = hex.col;
      const row = hex.row;
      const x = col * HEX_WIDTH + (row % 2) * (HEX_WIDTH / 2);
      const y = row * HEX_HEIGHT * 0.75;

      layout.push({ x, y, hex });
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }

    const padding = HEX_SIZE * 2;
    const viewBox = {
      minX: minX - padding,
      minY: minY - padding,
      width: (maxX - minX) + padding * 2 + HEX_WIDTH,
      height: (maxY - minY) + padding * 2 + HEX_HEIGHT
    };

    return { layout, viewBox };
  }, [hexes]);

  const getHexPoints = (x: number, y: number): string => {
    const points: [number, number][] = [];
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i + (Math.PI / 6);
      const px = x + HEX_SIZE * Math.cos(angle);
      const py = y + HEX_SIZE * Math.sin(angle);
      points.push([px, py]);
    }
    return points.map(p => p.join(',')).join(' ');
  };

  const getHexColor = (hex: HexData): string => {
    const terrainColors: Record<string, string> = {
      plains: '#FFA50080',
      forest: '#006B0080',
      mountains: '#403E4380',
      desert: '#F9731680',
      hills: '#8B451380',
      rivers: '#0EA5E980',
      coastlines: '#40E0D080',
      swamp: '#4A332D80',
    };
    return terrainColors[hex.terrain] || '#cccccc80';
  };

  const handleHexMouseEnter = (hex: HexData, event: React.MouseEvent) => {
    setHoveredHex(hex);
    setTooltipPos({ x: event.clientX, y: event.clientY });
  };

  const handleHexMouseMove = (event: React.MouseEvent) => {
    if (hoveredHex) {
      setTooltipPos({ x: event.clientX, y: event.clientY });
    }
  };

  const handleHexMouseLeave = () => {
    setHoveredHex(null);
    setTooltipPos(null);
  };

  if (!hexes || hexes.length === 0) {
    return <div className="kingdom-map-empty">No map data available</div>;
  }

  const { layout, viewBox } = hexLayout;

  return (
    <div className="kingdom-map">
      <div className="map-statistics">
        <div className="stat-item">
          <span className="stat-label">Total Hexes:</span>
          <span className="stat-value">{totalHexes}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Claimed:</span>
          <span className="stat-value">{claimedHexes}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Worksites:</span>
          <span className="stat-value">{totalWorksites}</span>
        </div>
      </div>

      <svg
        viewBox={`${viewBox.minX} ${viewBox.minY} ${viewBox.width} ${viewBox.height}`}
        className="kingdom-map-svg"
      >
        {layout.map(({ x, y, hex }) => (
          <g
            key={hex.id}
            onMouseEnter={(e) => handleHexMouseEnter(hex, e)}
            onMouseMove={handleHexMouseMove}
            onMouseLeave={handleHexMouseLeave}
            style={{ cursor: 'pointer' }}
          >
            <polygon
              points={getHexPoints(x, y)}
              fill={getHexColor(hex)}
              stroke="#444"
              strokeWidth={0.5}
              className="hex-terrain"
            />
            {hex.claimedBy === 'player' && (
              <>
                <polygon
                  points={getHexPoints(x, y)}
                  fill="#3b82f620"
                  className="hex-claimed-overlay"
                />
                <polygon
                  points={getHexPoints(x, y)}
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth={2.5}
                  className="hex-claimed-border"
                />
              </>
            )}
            {hex.hasRoad && (
              <circle
                cx={x}
                cy={y}
                r={HEX_SIZE * 0.2}
                fill="#654321"
                stroke="#333"
                strokeWidth={0.5}
              />
            )}
            <text
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="middle"
              className="hex-label"
              fontSize={HEX_SIZE * 0.4}
              fill="#ccc"
            >
              {hex.id}
            </text>
            {getHexSettlement(hex.id) && (
              <text
                x={x}
                y={y - HEX_SIZE * 0.6}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={HEX_SIZE * 0.7}
                fill="#FFD700"
                stroke="#333"
                strokeWidth={0.5}
              >
                ★
              </text>
            )}
            {getHexWorksites(hex.id).length > 0 && (
              <text
                x={x + HEX_SIZE * 0.6}
                y={y - HEX_SIZE * 0.3}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={HEX_SIZE * 0.6}
                fill="#ffffff"
                stroke="#333"
                strokeWidth={0.5}
                fontWeight="bold"
              >
                +
              </text>
            )}
          </g>
        ))}
      </svg>

      {hoveredHex && tooltipPos && (() => {
        const hexWorksites = getHexWorksites(hoveredHex.id);
        const hexSettlement = getHexSettlement(hoveredHex.id);

        return (
          <div
            className="hex-tooltip"
            style={{
              left: tooltipPos.x + 10,
              top: tooltipPos.y + 10
            }}
          >
            <div className="tooltip-title">{hoveredHex.id}</div>
            <div className="tooltip-row">
              <strong>Terrain:</strong> {hoveredHex.terrain}
            </div>
            {hoveredHex.claimedBy && (
              <div className="tooltip-row">
                <strong>Claimed by:</strong> {hoveredHex.claimedBy}
              </div>
            )}
            {hoveredHex.features && hoveredHex.features.length > 0 && (
              <div className="tooltip-row">
                <strong>Features:</strong> {hoveredHex.features.join(', ')}
              </div>
            )}
            {hoveredHex.hasRoad && (
              <div className="tooltip-row">
                <strong>Road:</strong> Yes
              </div>
            )}
            {hexSettlement && (
              <div className="tooltip-row">
                <strong>Settlement:</strong> {hexSettlement.name} ({hexSettlement.tier})
              </div>
            )}
            {hexWorksites.length > 0 && (
              <div className="tooltip-row">
                <strong>Worksites:</strong>
                <div style={{ marginLeft: '1rem', marginTop: '0.25rem' }}>
                  {hexWorksites.map((w, i) => (
                    <div key={i}>{w.type} (+{w.production})</div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}
