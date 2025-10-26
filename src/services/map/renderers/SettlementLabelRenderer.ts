/**
 * SettlementLabelRenderer - Renders settlement name labels on map hexes
 * Displays text labels below settlement icons with background panels for readability
 */

/**
 * Styling configuration for settlement labels
 */
const LABEL_STYLE = {
  fontFamily: 'Faculty Glyphic, Domine, serif',
  fontSize: 28,
  fill: 0xFFFFFF, // White text
  stroke: 0x000000, // Black outline
  strokeThickness: 0, // Outline disabled (testing drop shadow only)
  dropShadow: true,
  dropShadowColor: 0x000000,
  dropShadowBlur: 6,
  dropShadowAngle: Math.PI / 4,
  dropShadowDistance: 3,
  align: 'center' as const,
  wordWrap: false
};

const BACKGROUND_STYLE = {
  color: 0x1a1a1a, // Dark background
  alpha: 0.75,
  padding: 8,
  radius: 6
};

/**
 * Draw settlement labels on hexes
 * Places text labels below settlement icons with dark background panels
 * Labels are scale-invariant and remain legible at all zoom levels
 * 
 * @param layer - PIXI container to add text objects to
 * @param settlementData - Array of settlements with hex ID, name, and tier
 * @param canvas - Foundry canvas object
 */
export async function renderSettlementLabels(
  layer: PIXI.Container,
  settlementData: Array<{ id: string; name: string; tier: string }>,
  canvas: any
): Promise<number> {
  console.log(`[SettlementLabelRenderer] 📝 Rendering settlement labels for ${settlementData.length} settlements...`);

  if (!canvas?.grid) {
    console.warn('[SettlementLabelRenderer] ❌ Canvas grid not available');
    return 0;
  }

  const GridHex = (globalThis as any).foundry.grid.GridHex;
  let successCount = 0;

  // Get current canvas scale for zoom-invariant sizing
  // Canvas scale is stored in canvas.stage.scale.x (1.0 = 100%, 0.5 = 50%, 2.0 = 200%)
  const rawCanvasScale = canvas.stage?.scale?.x || 1.0;
  const canvasScale = Math.max(0.3, rawCanvasScale); // Clamp minimum to 0.3 - labels won't scale beyond this when zooming out
  const inverseScale = 1.0 / canvasScale;
  
  // Debug logging for zoom levels
  console.log(`[SettlementLabelRenderer] 🔍 Zoom Debug:`, {
    rawCanvasScale: rawCanvasScale.toFixed(2),
    canvasScale: canvasScale.toFixed(2),
    clamped: rawCanvasScale < 0.3,
    zoomPercentage: `${(canvasScale * 100).toFixed(0)}%`,
    inverseScale: inverseScale.toFixed(2),
    baseFontSize: LABEL_STYLE.fontSize,
    effectiveFontSize: `${LABEL_STYLE.fontSize * inverseScale} (appears as ${LABEL_STYLE.fontSize}px on screen)`
  });

  // Process each settlement
  for (const settlement of settlementData) {
    const { id, name, tier } = settlement;
    
    try {
      // Parse hex ID
      const parts = id.split('.');
      if (parts.length !== 2) {
        console.warn(`[SettlementLabelRenderer] ⚠️ Invalid hex ID format: ${id}`);
        continue;
      }

      const i = parseInt(parts[0], 10);
      const j = parseInt(parts[1], 10);
      
      if (isNaN(i) || isNaN(j)) {
        console.warn(`[SettlementLabelRenderer] ⚠️ Invalid hex coordinates: ${id}`);
        continue;
      }

      // Get hex center
      const hex = new GridHex({i, j}, canvas.grid);
      const center = hex.center;
      
      // Calculate position for label baseline just above bottom hex vertex
      const hexSize = canvas.grid.sizeY;
      const bottomVertexY = center.y + (hexSize / 2);
      const labelY = bottomVertexY - 5; // 5px above bottom vertex

      // Create text object with proper PIXI.TextStyle
      const textStyle = new PIXI.TextStyle(LABEL_STYLE);
      const text = new PIXI.Text(name, textStyle);
      text.anchor.set(0.5, 1); // Center horizontally, bottom anchor (baseline)
      text.position.set(center.x, labelY);
      
      // Apply inverse scale to keep text size consistent at all zoom levels
      text.scale.set(inverseScale, inverseScale);
      
      // Add text directly (no background)
      layer.addChild(text);
      
      successCount++;
      
    } catch (error) {
      console.error(`[SettlementLabelRenderer] Failed to draw label for settlement ${id}:`, error);
    }
  }

  console.log(`[SettlementLabelRenderer] ✅ Drew ${successCount}/${settlementData.length} settlement labels`);
  return successCount;
}
