/**
 * Nivo Chart Generator for Server-Side Rendering
 * 
 * Generates SVG charts using Nivo for embedding in HTML reports.
 * Uses React's renderToStaticMarkup with SVG components for headless rendering.
 */

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Line } from '@nivo/line';
import { Bar } from '@nivo/bar';
import { Pie } from '@nivo/pie';

// Chart theme matching our dark UI
const darkTheme = {
  background: 'transparent',
  text: { fill: '#eaeaea', fontSize: 11 },
  axis: {
    domain: { line: { stroke: '#444', strokeWidth: 1 } },
    ticks: { 
      line: { stroke: '#444', strokeWidth: 1 }, 
      text: { fill: '#a0a0a0', fontSize: 10 } 
    },
    legend: { text: { fill: '#eaeaea', fontSize: 11 } }
  },
  grid: { line: { stroke: '#333', strokeWidth: 1 } },
  legends: { text: { fill: '#a0a0a0', fontSize: 10 } },
  tooltip: {
    container: { background: '#1a1a2e', color: '#eaeaea', fontSize: 12 }
  }
};

export interface LineChartData {
  id: string;
  color: string;
  data: Array<{ x: number; y: number }>;
}

export interface BarChartData {
  label: string;
  value: number;
  color?: string;
}

export interface PieChartData {
  id: string;
  label: string;
  value: number;
  color: string;
}

/**
 * Generate a line chart SVG using non-responsive Line component
 */
export function generateLineChart(
  data: LineChartData[],
  width: number = 600,
  height: number = 300,
  options: {
    xLabel?: string;
    yLabel?: string;
    enableArea?: boolean;
    yMin?: number;
    yMax?: number;
  } = {}
): string {
  // Filter out any series with no data points
  const validData = data.filter(series => series.data && series.data.length > 0);
  
  if (validData.length === 0) {
    return '<svg width="600" height="300"><text x="300" y="150" text-anchor="middle" fill="#a0a0a0">No data available</text></svg>';
  }

  const chart = React.createElement(Line, {
    data: validData,
    width,
    height,
    theme: darkTheme,
    margin: { top: 20, right: 110, bottom: 50, left: 60 },
    xScale: { type: 'linear', min: 'auto', max: 'auto' },
    yScale: { 
      type: 'linear', 
      min: options.yMin ?? 0, 
      max: options.yMax ?? 'auto',
      stacked: false 
    },
    curve: 'monotoneX',
    axisBottom: {
      tickSize: 5,
      tickPadding: 5,
      tickRotation: 0,
      legend: options.xLabel || 'Turn',
      legendOffset: 36,
      legendPosition: 'middle'
    },
    axisLeft: {
      tickSize: 5,
      tickPadding: 5,
      tickRotation: 0,
      legend: options.yLabel || 'Value',
      legendOffset: -50,
      legendPosition: 'middle'
    },
    enablePoints: false,
    enableArea: options.enableArea ?? false,
    areaOpacity: 0.15,
    colors: validData.map(d => d.color),
    lineWidth: 2,
    useMesh: false,
    enableSlices: false,
    legends: [
      {
        anchor: 'bottom-right',
        direction: 'column',
        justify: false,
        translateX: 100,
        translateY: 0,
        itemsSpacing: 0,
        itemDirection: 'left-to-right',
        itemWidth: 80,
        itemHeight: 20,
        itemOpacity: 0.75,
        symbolSize: 12,
        symbolShape: 'circle',
        symbolBorderColor: 'rgba(0, 0, 0, .5)',
        effects: []
      }
    ]
  });

  try {
    return renderToStaticMarkup(chart);
  } catch (error) {
    console.error('Line chart render error:', error);
    return `<svg width="${width}" height="${height}"><text x="${width/2}" y="${height/2}" text-anchor="middle" fill="#ef4444">Chart render error</text></svg>`;
  }
}

/**
 * Generate a bar chart SVG
 */
export function generateBarChart(
  data: BarChartData[],
  width: number = 500,
  height: number = 300,
  options: {
    xLabel?: string;
    yLabel?: string;
    horizontal?: boolean;
    colorScheme?: string[];
  } = {}
): string {
  if (data.length === 0) {
    return '<svg width="500" height="300"><text x="250" y="150" text-anchor="middle" fill="#a0a0a0">No data available</text></svg>';
  }

  const formattedData = data.map((d, i) => ({
    label: d.label,
    value: d.value,
    color: d.color || options.colorScheme?.[i % (options.colorScheme?.length || 1)] || '#e94560'
  }));

  const chart = React.createElement(Bar, {
    data: formattedData,
    keys: ['value'],
    indexBy: 'label',
    width,
    height,
    theme: darkTheme,
    margin: { top: 20, right: 20, bottom: 60, left: 60 },
    padding: 0.3,
    layout: options.horizontal ? 'horizontal' : 'vertical',
    colors: ({ data: d }: any) => d.color,
    borderRadius: 4,
    axisBottom: {
      tickSize: 5,
      tickPadding: 5,
      tickRotation: -45,
      legend: options.xLabel,
      legendOffset: 50,
      legendPosition: 'middle'
    },
    axisLeft: {
      tickSize: 5,
      tickPadding: 5,
      tickRotation: 0,
      legend: options.yLabel,
      legendOffset: -50,
      legendPosition: 'middle'
    },
    enableLabel: false
  });

  try {
    return renderToStaticMarkup(chart);
  } catch (error) {
    console.error('Bar chart render error:', error);
    return `<svg width="${width}" height="${height}"><text x="${width/2}" y="${height/2}" text-anchor="middle" fill="#ef4444">Chart render error</text></svg>`;
  }
}

/**
 * Generate a pie chart SVG
 */
export function generatePieChart(
  data: PieChartData[],
  width: number = 400,
  height: number = 300
): string {
  if (data.length === 0 || data.every(d => d.value === 0)) {
    return '<svg width="400" height="300"><text x="200" y="150" text-anchor="middle" fill="#a0a0a0">No data available</text></svg>';
  }

  const chart = React.createElement(Pie, {
    data,
    width,
    height,
    theme: darkTheme,
    margin: { top: 20, right: 80, bottom: 20, left: 80 },
    innerRadius: 0.5,
    padAngle: 0.7,
    cornerRadius: 3,
    colors: data.map(d => d.color),
    borderWidth: 1,
    borderColor: { from: 'color', modifiers: [['darker', 0.2]] },
    arcLinkLabelsSkipAngle: 10,
    arcLinkLabelsTextColor: '#eaeaea',
    arcLinkLabelsThickness: 2,
    arcLinkLabelsColor: { from: 'color' },
    arcLabelsSkipAngle: 10,
    arcLabelsTextColor: { from: 'color', modifiers: [['darker', 2]] }
  });

  try {
    return renderToStaticMarkup(chart);
  } catch (error) {
    console.error('Pie chart render error:', error);
    return `<svg width="${width}" height="${height}"><text x="${width/2}" y="${height/2}" text-anchor="middle" fill="#ef4444">Chart render error</text></svg>`;
  }
}

/**
 * Generate multi-line resource progression chart
 */
export function generateResourceProgressionChart(
  progressionData: Record<string, Array<{ turn: number; avg: number; min: number; max: number }>>,
  width: number = 800,
  height: number = 400
): string {
  const colorMap: Record<string, string> = {
    gold: '#fbbf24',
    food: '#4ade80',
    lumber: '#8b5a2b',
    stone: '#94a3b8',
    ore: '#f97316',
    unrest: '#ef4444',
    fame: '#a78bfa',
    hexes: '#60a5fa'
  };

  const data: LineChartData[] = Object.entries(progressionData).map(([resource, values]) => ({
    id: resource.charAt(0).toUpperCase() + resource.slice(1),
    color: colorMap[resource] || '#e94560',
    data: values.map(v => ({ x: v.turn, y: v.avg }))
  }));

  return generateLineChart(data, width, height, {
    xLabel: 'Turn',
    yLabel: 'Value',
    enableArea: true
  });
}

/**
 * Generate outcome distribution pie chart
 */
export function generateOutcomeChart(
  outcomes: Record<string, number>,
  width: number = 400,
  height: number = 300
): string {
  const data: PieChartData[] = [
    { id: 'criticalSuccess', label: 'Crit Success', value: outcomes.criticalSuccess || 0, color: '#22c55e' },
    { id: 'success', label: 'Success', value: outcomes.success || 0, color: '#4ade80' },
    { id: 'failure', label: 'Failure', value: outcomes.failure || 0, color: '#fbbf24' },
    { id: 'criticalFailure', label: 'Crit Failure', value: outcomes.criticalFailure || 0, color: '#ef4444' }
  ];

  return generatePieChart(data, width, height);
}

/**
 * Generate tipping point bar chart
 */
export function generateTippingPointChart(
  tippingPoints: Array<{ unrestLevel: number; collapseRate: number }>,
  width: number = 600,
  height: number = 300
): string {
  const data: BarChartData[] = tippingPoints.map(tp => ({
    label: `${tp.unrestLevel}`,
    value: tp.collapseRate,
    color: tp.collapseRate > 50 ? '#ef4444' : tp.collapseRate > 25 ? '#fbbf24' : '#4ade80'
  }));

  return generateBarChart(data, width, height, {
    xLabel: 'Unrest Level',
    yLabel: 'Collapse Rate (%)'
  });
}
