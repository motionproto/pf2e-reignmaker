/**
 * FactionColorGenerator - Auto-generate contrasting colors for factions
 * 
 * Uses HSL color space for perceptually uniform color distribution
 * Distributes colors evenly around the hue wheel to maximize contrast
 */

/**
 * Parse a color string to HSL values
 * Supports: hex (#rrggbb), hsl(h, s%, l%), rgb(r, g, b)
 */
function parseColorToHSL(color: string): { h: number; s: number; l: number } | null {
  // HSL format: hsl(240, 70%, 60%)
  const hslMatch = color.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
  if (hslMatch) {
    return {
      h: parseInt(hslMatch[1], 10),
      s: parseInt(hslMatch[2], 10),
      l: parseInt(hslMatch[3], 10)
    };
  }

  // Hex format: #rrggbb
  const hexMatch = color.match(/^#([0-9a-f]{6})$/i);
  if (hexMatch) {
    const r = parseInt(hexMatch[1].substr(0, 2), 16) / 255;
    const g = parseInt(hexMatch[1].substr(2, 2), 16) / 255;
    const b = parseInt(hexMatch[1].substr(4, 2), 16) / 255;
    return rgbToHSL(r, g, b);
  }

  // RGB format: rgb(255, 0, 0)
  const rgbMatch = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (rgbMatch) {
    const r = parseInt(rgbMatch[1], 10) / 255;
    const g = parseInt(rgbMatch[2], 10) / 255;
    const b = parseInt(rgbMatch[3], 10) / 255;
    return rgbToHSL(r, g, b);
  }

  return null;
}

/**
 * Convert RGB to HSL
 */
function rgbToHSL(r: number, g: number, b: number): { h: number; s: number; l: number } {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  if (max === min) {
    return { h: 0, s: 0, l: l * 100 };
  }

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

  let h = 0;
  switch (max) {
    case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
    case g: h = ((b - r) / d + 2) / 6; break;
    case b: h = ((r - g) / d + 4) / 6; break;
  }

  return { h: h * 360, s: s * 100, l: l * 100 };
}

/**
 * Extract hues from existing colors
 */
function getUsedHues(existingColors: string[]): number[] {
  const hues: number[] = [];
  
  for (const color of existingColors) {
    const hsl = parseColorToHSL(color);
    if (hsl) {
      hues.push(hsl.h);
    }
  }
  
  return hues.sort((a, b) => a - b);
}

/**
 * Find the largest gap in the hue wheel
 * Returns the midpoint of the largest gap
 */
function findLargestHueGap(usedHues: number[]): number {
  if (usedHues.length === 0) {
    // First color: red
    return 0;
  }

  // Sort hues
  const sortedHues = [...usedHues].sort((a, b) => a - b);

  // Find gaps between consecutive hues
  let maxGap = 0;
  let maxGapMidpoint = 0;

  for (let i = 0; i < sortedHues.length; i++) {
    const current = sortedHues[i];
    const next = sortedHues[(i + 1) % sortedHues.length];
    
    // Calculate gap (wrapping around 360°)
    const gap = i === sortedHues.length - 1 
      ? (360 - current) + next  // Wrap from 360 to 0
      : next - current;

    if (gap > maxGap) {
      maxGap = gap;
      // Midpoint of gap
      maxGapMidpoint = i === sortedHues.length - 1
        ? (current + gap / 2) % 360
        : current + gap / 2;
    }
  }

  return Math.round(maxGapMidpoint);
}

/**
 * Generate a new faction color that contrasts with existing colors
 * 
 * Strategy:
 * - Distribute colors evenly around the hue wheel (0-360°)
 * - Find the largest gap between existing hues
 * - Place new color at the midpoint of that gap
 * - Use consistent saturation (70%) and lightness (60%) for visual harmony
 * 
 * @param existingColors - Array of existing faction colors (hex, hsl, or rgb)
 * @returns HSL color string (e.g., "hsl(240, 70%, 60%)")
 */
export function generateFactionColor(existingColors: string[]): string {
  const usedHues = getUsedHues(existingColors);
  const newHue = findLargestHueGap(usedHues);
  
  // Return HSL color with good saturation and lightness for vivid, distinguishable colors
  return `hsl(${newHue}, 70%, 60%)`;
}

/**
 * Generate a palette of N colors with maximum contrast
 * Useful for initializing a set of factions at once
 * 
 * @param count - Number of colors to generate
 * @returns Array of HSL color strings
 */
export function generateColorPalette(count: number): string[] {
  const colors: string[] = [];
  
  for (let i = 0; i < count; i++) {
    const color = generateFactionColor(colors);
    colors.push(color);
  }
  
  return colors;
}
