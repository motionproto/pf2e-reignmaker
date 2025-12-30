/**
 * NavigationGrid - Primary pathfinding structure
 *
 * A fine-resolution navigation grid overlaid on the kingdom scene.
 * Uses an 8x8 pixel global grid for river blocking detection.
 *
 * Architecture:
 * - Global 8x8 pixel grid (not per-hex)
 * - Caches hex layout for hex lookup
 * - Rivers rasterized as blocked cells
 * - Works scene-independently after initialization
 */

import type { KingdomData, RiverPath, RiverCrossing, RiverPathPoint, CellRiverPath, RasterizedCell } from '../../actors/KingdomActor';
import { logger } from '../../utils/Logger';
import { getEdgeMidpoint } from '../../utils/riverUtils';

/**
 * Grid cell key format: "gridX,gridY" (pixel coords / cellSize)
 */
type CellKey = string;

/**
 * Point in pixel coordinates
 */
interface Point {
  x: number;
  y: number;
}

/**
 * Cached hex layout data (scene-independent)
 */
interface HexLayoutData {
  id: string;           // "i.j"
  i: number;
  j: number;
  center: Point;
  vertices: Point[];    // 6 vertices
  bounds: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  };
}

/**
 * Hex neighbor offsets for odd-q layout (scene-independent)
 */
const ODD_Q_NEIGHBORS = {
  odd: [  // Odd column (j % 2 === 1)
    { di: -1, dj: 0 },   // North
    { di: 0, dj: 1 },    // Northeast
    { di: 1, dj: 1 },    // Southeast
    { di: 1, dj: 0 },    // South
    { di: 1, dj: -1 },   // Southwest
    { di: 0, dj: -1 },   // Northwest
  ],
  even: [ // Even column (j % 2 === 0)
    { di: -1, dj: 0 },   // North
    { di: -1, dj: 1 },   // Northeast
    { di: 0, dj: 1 },    // Southeast
    { di: 1, dj: 0 },    // South
    { di: 0, dj: -1 },   // Southwest
    { di: -1, dj: -1 },  // Northwest
  ]
};

/**
 * NavigationGrid - Primary pathfinding structure
 */
export class NavigationGrid {
  /** Grid cell size in pixels (8x8 pixel squares) */
  private readonly cellSize = 8;

  /** Blocked cells (river passes through) */
  private blockedCells: Set<CellKey> = new Set();

  /** Lake cells (painted water blobs) */
  private lakeCells: Set<CellKey> = new Set();

  /** Passage cells (painted crossings that override water blocking) */
  private passageCells: Set<CellKey> = new Set();

  /** Crossing cells (legacy bridge/ford allows passage) */
  private crossingCells: Set<CellKey> = new Set();

  /** Cached hex layout data - scene independent */
  private hexLayouts: Map<string, HexLayoutData> = new Map();

  /** Is the grid initialized with hex layout? */
  private isInitialized = false;

  /** Cached reference to canvas (only used during initialization) */
  private canvas: any = null;

  constructor() {}

  /**
   * Initialize the navigation grid from a hex scene
   * Must be called when on a hex grid scene to cache layout data
   */
  initialize(canvas: any, kingdom: KingdomData): boolean {
    if (!canvas?.grid) {
      logger.warn('[NavigationGrid] Cannot initialize - no canvas grid');
      return false;
    }

    // Check if we're on a hex grid
    const gridType = canvas.grid.constructor.name;
    if (!gridType.includes('Hex')) {
      logger.warn(`[NavigationGrid] Cannot initialize on ${gridType} - must be hex grid`);
      return false;
    }

    this.canvas = canvas;
    this.hexLayouts.clear();

    // Cache hex layout for all kingdom hexes
    if (kingdom.hexes) {
      for (const hex of kingdom.hexes) {
        const parts = hex.id.split('.');
        if (parts.length !== 2) continue;

        const i = parseInt(parts[0], 10);
        const j = parseInt(parts[1], 10);
        if (isNaN(i) || isNaN(j)) continue;

        const layout = this.cacheHexLayout(i, j, canvas);
        if (layout) {
          this.hexLayouts.set(hex.id, layout);
        }
      }
    }

    // Build water blocking data (rivers + lakes)
    this.buildWaterBlocking(kingdom);

    this.isInitialized = true;
    logger.info(`[NavigationGrid] Initialized with ${this.hexLayouts.size} hexes, ${this.cellSize}px cell size`);

    return true;
  }

  /**
   * Check if the grid is ready for use
   */
  isReady(): boolean {
    return this.isInitialized && this.hexLayouts.size > 0;
  }

  /**
   * Get hex ID at a pixel position (scene-independent)
   */
  getHexAt(x: number, y: number): string | null {
    // Use cached layouts for point-in-polygon testing
    for (const layout of this.hexLayouts.values()) {
      if (this.isPointInHex(x, y, layout)) {
        return layout.id;
      }
    }
    return null;
  }

  /**
   * Get neighbor hex IDs (scene-independent using coordinate math)
   */
  getNeighborHexIds(hexId: string): string[] {
    const coords = this.parseHexId(hexId);
    if (!coords) return [];

    const { i, j } = coords;
    const neighbors: string[] = [];

    // Use odd-q neighbor offsets based on column parity
    const offsets = (j % 2 === 1) ? ODD_Q_NEIGHBORS.odd : ODD_Q_NEIGHBORS.even;

    for (const offset of offsets) {
      const ni = i + offset.di;
      const nj = j + offset.dj;
      const neighborId = `${ni}.${nj}`;

      // Only include if hex exists in our cached layouts
      if (this.hexLayouts.has(neighborId)) {
        neighbors.push(neighborId);
      }
    }

    return neighbors;
  }

  /**
   * Check if movement between two hexes crosses water (river or lake) without a crossing
   * Uses the 8x8 pixel grid for precise detection
   */
  doesMovementCrossRiver(fromHexId: string, toHexId: string): boolean {
    if (!this.isInitialized) return false;

    const fromLayout = this.hexLayouts.get(fromHexId);
    const toLayout = this.hexLayouts.get(toHexId);

    if (!fromLayout || !toLayout) return false;

    // Trace line from center to center through the grid
    const cellsOnPath = this.getCellsOnLine(fromLayout.center, toLayout.center);

    for (const cellKey of cellsOnPath) {
      // Check if cell is blocked by river OR lake (unified water blocking)
      const isWaterBlocked = this.blockedCells.has(cellKey) || this.lakeCells.has(cellKey);
      // Check if cell has a passage (painted crossing) or legacy crossing
      const hasPassage = this.passageCells.has(cellKey) || this.crossingCells.has(cellKey);
      if (isWaterBlocked && !hasPassage) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get hex center position (scene-independent)
   */
  getHexCenter(hexId: string): Point | null {
    const layout = this.hexLayouts.get(hexId);
    return layout ? { ...layout.center } : null;
  }

  /**
   * Check if a hex exists in the navigation grid
   */
  hasHex(hexId: string): boolean {
    return this.hexLayouts.has(hexId);
  }

  /**
   * Get all hex IDs in the navigation grid
   */
  getAllHexIds(): string[] {
    return Array.from(this.hexLayouts.keys());
  }

  /**
   * Force rebuild of river blocking data
   * @deprecated Use rebuildWaterBlocking instead
   */
  rebuildRiverBlocking(kingdom: KingdomData): void {
    this.buildWaterBlocking(kingdom);
  }

  /**
   * Force rebuild of all water blocking data (rivers + lakes)
   */
  rebuildWaterBlocking(kingdom: KingdomData): void {
    this.buildWaterBlocking(kingdom);
  }

  /**
   * Get statistics for debugging
   */
  getStats(): { hexCount: number; blockedCells: number; lakeCells: number; passageCells: number; crossingCells: number; cellSize: number; isReady: boolean } {
    return {
      hexCount: this.hexLayouts.size,
      blockedCells: this.blockedCells.size,
      lakeCells: this.lakeCells.size,
      passageCells: this.passageCells.size,
      crossingCells: this.crossingCells.size,
      cellSize: this.cellSize,
      isReady: this.isReady()
    };
  }

  /**
   * Get all blocked cells (for debugging/visualization) - rivers only
   */
  getBlockedCells(): Set<CellKey> {
    return new Set(this.blockedCells);
  }

  /**
   * Get all lake cells (for debugging/visualization)
   */
  getLakeCells(): Set<CellKey> {
    return new Set(this.lakeCells);
  }

  /**
   * Get all passage cells (for debugging/visualization)
   */
  getPassageCells(): Set<CellKey> {
    return new Set(this.passageCells);
  }

  /**
   * Get all crossing cells (legacy - for debugging/visualization)
   */
  getCrossingCells(): Set<CellKey> {
    return new Set(this.crossingCells);
  }

  /**
   * Get cell size in pixels
   */
  getCellSize(): number {
    return this.cellSize;
  }

  /**
   * Convert pixel coordinates to nav grid cell coordinates
   */
  pixelToCell(pixelX: number, pixelY: number): { x: number; y: number } {
    return {
      x: Math.floor(pixelX / this.cellSize),
      y: Math.floor(pixelY / this.cellSize)
    };
  }

  // ============================================================================
  // Cell-Based Pathfinding Methods
  // ============================================================================

  /**
   * Get 4-directional (cardinal) neighbor cells
   */
  getCellNeighbors(gridX: number, gridY: number): Array<{x: number, y: number}> {
    return [
      { x: gridX, y: gridY - 1 },  // Up
      { x: gridX + 1, y: gridY },  // Right
      { x: gridX, y: gridY + 1 },  // Down
      { x: gridX - 1, y: gridY }   // Left
    ];
  }

  /**
   * Check if a cell is blocked (river or lake water)
   */
  isCellBlocked(gridX: number, gridY: number): boolean {
    const cellKey = this.getCellKey(gridX, gridY);
    return this.blockedCells.has(cellKey) || this.lakeCells.has(cellKey);
  }

  /**
   * Check if a cell is specifically a river (not lake)
   */
  isCellRiver(gridX: number, gridY: number): boolean {
    const cellKey = this.getCellKey(gridX, gridY);
    return this.blockedCells.has(cellKey);
  }

  /**
   * Check if a cell is specifically a lake (not river)
   */
  isCellLake(gridX: number, gridY: number): boolean {
    const cellKey = this.getCellKey(gridX, gridY);
    return this.lakeCells.has(cellKey);
  }

  /**
   * Check if a cell is a crossing (bridge/ford)
   */
  isCellCrossing(gridX: number, gridY: number): boolean {
    const cellKey = this.getCellKey(gridX, gridY);
    return this.crossingCells.has(cellKey);
  }

  /**
   * Get hex ID for a cell (which hex contains this cell's center)
   */
  getHexForCell(gridX: number, gridY: number): string | null {
    // Convert cell to pixel (center of cell)
    const pixelX = gridX * this.cellSize + this.cellSize / 2;
    const pixelY = gridY * this.cellSize + this.cellSize / 2;
    return this.getHexAt(pixelX, pixelY);
  }

  /**
   * Convert hex center to grid cell coordinates
   */
  hexCenterToCell(hexId: string): { x: number; y: number } | null {
    const layout = this.hexLayouts.get(hexId);
    if (!layout) return null;

    return {
      x: Math.floor(layout.center.x / this.cellSize),
      y: Math.floor(layout.center.y / this.cellSize)
    };
  }

  /**
   * Check if a cell can be traversed (not blocked, or has a passage/crossing)
   */
  isCellPassable(gridX: number, gridY: number): boolean {
    const cellKey = this.getCellKey(gridX, gridY);
    // Check if blocked by water (river or lake)
    const isWaterBlocked = this.blockedCells.has(cellKey) || this.lakeCells.has(cellKey);
    if (!isWaterBlocked) return true;
    // Blocked by water - check for passage or legacy crossing
    return this.passageCells.has(cellKey) || this.crossingCells.has(cellKey);
  }

  /**
   * Find a passable cell within a hex (for starting pathfinding)
   *
   * If the hex center is passable, returns that.
   * Otherwise, BFS outward to find the nearest passable cell still in the same hex.
   * This handles hexes with rivers running through their centers.
   */
  getPassableCellInHex(hexId: string): { x: number; y: number } | null {
    const centerCell = this.hexCenterToCell(hexId);
    if (!centerCell) return null;

    // If center is passable, use it
    if (this.isCellPassable(centerCell.x, centerCell.y)) {
      return centerCell;
    }

    // BFS outward to find nearest passable cell in same hex
    const visited = new Set<string>();
    const queue: Array<{ x: number; y: number }> = [centerCell];
    visited.add(`${centerCell.x},${centerCell.y}`);

    // Limit search radius (hex is roughly 10-15 cells across)
    const maxIterations = 500;
    let iterations = 0;

    while (queue.length > 0 && iterations < maxIterations) {
      iterations++;
      const current = queue.shift()!;

      // Check all 4 neighbors
      const neighbors = this.getCellNeighbors(current.x, current.y);

      for (const neighbor of neighbors) {
        const key = `${neighbor.x},${neighbor.y}`;
        if (visited.has(key)) continue;
        visited.add(key);

        // Check if still in same hex
        const neighborHex = this.getHexForCell(neighbor.x, neighbor.y);
        if (neighborHex !== hexId) continue;

        // Found a passable cell in the same hex!
        if (this.isCellPassable(neighbor.x, neighbor.y)) {
          return neighbor;
        }

        // Not passable, but still in hex - continue searching
        queue.push(neighbor);
      }
    }

    // No passable cell found in this hex (entirely blocked or water hex)
    return null;
  }

  /**
   * Convert cell key to pixel position (center of cell)
   */
  cellKeyToPixel(cellKey: CellKey): Point | null {
    const parts = cellKey.split(',');
    if (parts.length !== 2) return null;

    const gridX = parseInt(parts[0], 10);
    const gridY = parseInt(parts[1], 10);

    if (isNaN(gridX) || isNaN(gridY)) return null;

    return {
      x: gridX * this.cellSize + this.cellSize / 2,
      y: gridY * this.cellSize + this.cellSize / 2
    };
  }

  /**
   * Clear all data
   */
  clear(): void {
    this.blockedCells.clear();
    this.lakeCells.clear();
    this.passageCells.clear();
    this.crossingCells.clear();
    this.hexLayouts.clear();
    this.isInitialized = false;
    this.canvas = null;
  }

  /**
   * Debug: Check if a pixel position is blocked
   * Call from console: game.reignmaker.checkBlocking(x, y)
   */
  debugCheckPixel(pixelX: number, pixelY: number): { gridX: number; gridY: number; hexId: string | null; isBlocked: boolean; isCrossing: boolean; isPassable: boolean } {
    const gridX = Math.floor(pixelX / this.cellSize);
    const gridY = Math.floor(pixelY / this.cellSize);
    const hexId = this.getHexForCell(gridX, gridY);

    return {
      gridX,
      gridY,
      hexId,
      isBlocked: this.isCellBlocked(gridX, gridY),
      isCrossing: this.isCellCrossing(gridX, gridY),
      isPassable: this.isCellPassable(gridX, gridY)
    };
  }

  /**
   * Debug: Check all cells along a path between two hexes
   */
  debugPathBlocking(fromHexId: string, toHexId: string): { crossesRiver: boolean; blockedCells: Array<{ gridX: number; gridY: number }> } {
    const fromLayout = this.hexLayouts.get(fromHexId);
    const toLayout = this.hexLayouts.get(toHexId);

    if (!fromLayout || !toLayout) {
      return { crossesRiver: false, blockedCells: [] };
    }

    const cells = this.getCellsOnLine(fromLayout.center, toLayout.center);
    const blockedCellsList: Array<{ gridX: number; gridY: number }> = [];

    for (const cellKey of cells) {
      if (this.blockedCells.has(cellKey) && !this.crossingCells.has(cellKey)) {
        const parts = cellKey.split(',');
        blockedCellsList.push({
          gridX: parseInt(parts[0], 10),
          gridY: parseInt(parts[1], 10)
        });
      }
    }

    return {
      crossesRiver: blockedCellsList.length > 0,
      blockedCells: blockedCellsList
    };
  }

  // ============================================================================
  // Private Methods - Layout Caching
  // ============================================================================

  /**
   * Cache hex layout data from canvas
   */
  private cacheHexLayout(i: number, j: number, canvas: any): HexLayoutData | null {
    if (!canvas?.grid) return null;

    try {
      // Get hex center
      const center = canvas.grid.getCenterPoint({ i, j });
      if (!center) return null;

      // Get vertices
      const vertices = canvas.grid.getVertices({ i, j });
      if (!vertices || vertices.length === 0) return null;

      // Calculate bounds
      let minX = Infinity, maxX = -Infinity;
      let minY = Infinity, maxY = -Infinity;

      const vertexPoints: Point[] = [];
      for (const v of vertices) {
        vertexPoints.push({ x: v.x, y: v.y });
        minX = Math.min(minX, v.x);
        maxX = Math.max(maxX, v.x);
        minY = Math.min(minY, v.y);
        maxY = Math.max(maxY, v.y);
      }

      return {
        id: `${i}.${j}`,
        i,
        j,
        center: { x: center.x, y: center.y },
        vertices: vertexPoints,
        bounds: { minX, maxX, minY, maxY }
      };
    } catch (e) {
      logger.error(`[NavigationGrid] Failed to cache layout for hex ${i}.${j}:`, e);
      return null;
    }
  }

  /**
   * Check if a point is inside a hex using ray casting
   */
  private isPointInHex(x: number, y: number, layout: HexLayoutData): boolean {
    // Quick bounds check first
    if (x < layout.bounds.minX || x > layout.bounds.maxX ||
        y < layout.bounds.minY || y > layout.bounds.maxY) {
      return false;
    }

    // Ray casting algorithm for polygon
    const vertices = layout.vertices;
    let inside = false;

    for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
      const xi = vertices[i].x, yi = vertices[i].y;
      const xj = vertices[j].x, yj = vertices[j].y;

      if (((yi > y) !== (yj > y)) &&
          (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
        inside = !inside;
      }
    }

    return inside;
  }

  // ============================================================================
  // Private Methods - Water Blocking (Rivers + Lakes)
  // ============================================================================

  /**
   * Build all water blocking data (rivers + lakes + passages)
   */
  private buildWaterBlocking(kingdom: KingdomData): void {
    this.buildRiverBlocking(kingdom);
    this.buildLakeBlocking(kingdom);
    this.buildPassageBlocking(kingdom);
  }

  /**
   * Build river blocking data from kingdom data
   * Priority: rasterizedCells (pre-computed) > cellPaths (polylines) > paths (legacy)
   */
  private buildRiverBlocking(kingdom: KingdomData): void {
    this.blockedCells.clear();
    this.crossingCells.clear();

    // PREFERRED: Use pre-computed rasterized cells (fastest, no computation needed)
    if (kingdom.rivers?.rasterizedCells && kingdom.rivers.rasterizedCells.length > 0) {
      this.buildFromRasterizedCells(kingdom.rivers.rasterizedCells);

      // Mark crossing cells
      if (kingdom.rivers.crossings && kingdom.rivers.crossings.length > 0) {
        this.markCrossings(kingdom.rivers.crossings);
      }

      logger.info(`[NavigationGrid] Built blocking from rasterizedCells: ${this.blockedCells.size} blocked cells, ${this.crossingCells.size} crossing cells`);
      return;
    }

    // FALLBACK: Cell-based paths that need rasterization (for backwards compatibility)
    if (kingdom.rivers?.cellPaths && kingdom.rivers.cellPaths.length > 0) {
      this.buildFromCellPaths(kingdom.rivers.cellPaths);

      // Mark crossing cells
      if (kingdom.rivers.crossings && kingdom.rivers.crossings.length > 0) {
        this.markCrossings(kingdom.rivers.crossings);
      }

      logger.info(`[NavigationGrid] Built blocking from cellPaths (fallback): ${this.blockedCells.size} blocked cells, ${this.crossingCells.size} crossing cells`);
      return;
    }

    // LEGACY: Fall back to old path system (requires rasterization)
    if (!kingdom.rivers?.paths || kingdom.rivers.paths.length === 0) {
      logger.debug('[NavigationGrid] No river paths to rasterize');
      return;
    }

    // Rasterize each river path
    for (const path of kingdom.rivers.paths) {
      this.rasterizeRiverPath(path);
    }

    // Mark crossing cells
    if (kingdom.rivers.crossings && kingdom.rivers.crossings.length > 0) {
      this.markCrossings(kingdom.rivers.crossings);
    }

    logger.info(`[NavigationGrid] Built blocking (legacy): ${this.blockedCells.size} blocked cells, ${this.crossingCells.size} crossing cells (${this.cellSize}px grid)`);
  }

  /**
   * Build lake blocking data from kingdom data
   * Lakes are stored as pre-computed cell arrays (no rasterization needed)
   */
  private buildLakeBlocking(kingdom: KingdomData): void {
    this.lakeCells.clear();

    // Load lake cells from waterFeatures.lakeCells
    const lakeCellArray = kingdom.waterFeatures?.lakeCells;
    if (!lakeCellArray || lakeCellArray.length === 0) {
      logger.debug('[NavigationGrid] No lake cells to load');
      return;
    }

    for (const cell of lakeCellArray) {
      this.lakeCells.add(`${cell.x},${cell.y}`);
    }

    logger.info(`[NavigationGrid] Built lake blocking: ${this.lakeCells.size} lake cells`);
  }

  /**
   * Build passage data from kingdom data
   * Passages are painted crossings that override water blocking
   */
  private buildPassageBlocking(kingdom: KingdomData): void {
    this.passageCells.clear();

    // Load passage cells from waterFeatures.passageCells
    const passageCellArray = kingdom.waterFeatures?.passageCells;
    if (!passageCellArray || passageCellArray.length === 0) {
      logger.debug('[NavigationGrid] No passage cells to load');
      return;
    }

    for (const cell of passageCellArray) {
      this.passageCells.add(`${cell.x},${cell.y}`);
    }

    logger.info(`[NavigationGrid] Built passages: ${this.passageCells.size} passage cells`);
  }

  /**
   * Build blocking from pre-computed rasterized cells
   * Simple and fast - just add cells directly to the blocked set
   */
  private buildFromRasterizedCells(cells: RasterizedCell[]): void {
    for (const cell of cells) {
      this.blockedCells.add(`${cell.x},${cell.y}`);
    }
  }

  /**
   * Build blocking from cell-based river paths
   * Rasterizes lines between consecutive polyline points to create continuous blocked paths
   */
  private buildFromCellPaths(cellPaths: CellRiverPath[]): void {
    for (const path of cellPaths) {
      if (path.cells.length === 0) continue;

      // Sort cells by order to get the polyline sequence
      const sortedCells = [...path.cells].sort((a, b) => a.order - b.order);

      if (sortedCells.length === 1) {
        // Single point - just mark that cell
        const cell = sortedCells[0];
        this.blockedCells.add(`${cell.x},${cell.y}`);
        continue;
      }

      // Rasterize lines between consecutive points
      for (let i = 0; i < sortedCells.length - 1; i++) {
        const p1 = sortedCells[i];
        const p2 = sortedCells[i + 1];

        // Convert cell coordinates to pixel centers, then rasterize
        const halfCell = this.cellSize / 2;
        const pixel1 = {
          x: p1.x * this.cellSize + halfCell,
          y: p1.y * this.cellSize + halfCell
        };
        const pixel2 = {
          x: p2.x * this.cellSize + halfCell,
          y: p2.y * this.cellSize + halfCell
        };

        this.rasterizeLine(pixel1, pixel2);
      }
    }
    logger.debug(`[NavigationGrid] Rasterized ${this.blockedCells.size} cells from ${cellPaths.length} cell paths`);
  }

  /**
   * Rasterize a single river path onto the grid
   */
  private rasterizeRiverPath(path: RiverPath): void {
    if (!path.points || path.points.length < 2) return;

    // Sort points by order
    const sortedPoints = [...path.points].sort((a, b) => a.order - b.order);

    // Convert each point to pixel coordinates and rasterize lines between them
    for (let i = 0; i < sortedPoints.length - 1; i++) {
      const p1 = sortedPoints[i];
      const p2 = sortedPoints[i + 1];

      const pixel1 = this.riverPointToPixel(p1);
      const pixel2 = this.riverPointToPixel(p2);

      if (pixel1 && pixel2) {
        this.rasterizeLine(pixel1, pixel2);
      }
    }
  }

  /**
   * Convert a river path point to pixel coordinates using cached layouts
   */
  private riverPointToPixel(point: RiverPathPoint): Point | null {
    const hexId = `${point.hexI}.${point.hexJ}`;
    const layout = this.hexLayouts.get(hexId);

    if (!layout) {
      // Hex not in kingdom, try to get from canvas if available
      if (this.canvas?.grid) {
        return this.riverPointToPixelFromCanvas(point);
      }
      return null;
    }

    // Center point
    if (point.isCenter) {
      return { ...layout.center };
    }

    // Edge point - calculate from vertices
    if (point.edge) {
      return this.getEdgeMidpointFromLayout(layout, point.edge);
    }

    // Corner point
    if (point.cornerIndex !== undefined && layout.vertices[point.cornerIndex]) {
      return { ...layout.vertices[point.cornerIndex] };
    }

    // Default to center
    return { ...layout.center };
  }

  /**
   * Fallback: get river point pixel from canvas (during initialization)
   */
  private riverPointToPixelFromCanvas(point: RiverPathPoint): Point | null {
    if (!this.canvas?.grid) return null;

    if (point.isCenter) {
      const center = this.canvas.grid.getCenterPoint({ i: point.hexI, j: point.hexJ });
      return center ? { x: center.x, y: center.y } : null;
    }

    if (point.edge) {
      const midpoint = getEdgeMidpoint(point.hexI, point.hexJ, point.edge as any, this.canvas);
      return midpoint ? { x: midpoint.x, y: midpoint.y } : null;
    }

    if (point.cornerIndex !== undefined) {
      const vertices = this.canvas.grid.getVertices({ i: point.hexI, j: point.hexJ });
      if (vertices && vertices[point.cornerIndex]) {
        return { x: vertices[point.cornerIndex].x, y: vertices[point.cornerIndex].y };
      }
    }

    const center = this.canvas.grid.getCenterPoint({ i: point.hexI, j: point.hexJ });
    return center ? { x: center.x, y: center.y } : null;
  }

  /**
   * Get edge midpoint from cached layout
   */
  private getEdgeMidpointFromLayout(layout: HexLayoutData, edge: string): Point | null {
    // Edge names to vertex indices (for pointy-top hexes)
    const edgeToVertices: Record<string, [number, number]> = {
      'top': [5, 0],
      'top-right': [0, 1],
      'bottom-right': [1, 2],
      'bottom': [2, 3],
      'bottom-left': [3, 4],
      'top-left': [4, 5]
    };

    const indices = edgeToVertices[edge];
    if (!indices) return layout.center;

    const v1 = layout.vertices[indices[0]];
    const v2 = layout.vertices[indices[1]];

    if (!v1 || !v2) return layout.center;

    return {
      x: (v1.x + v2.x) / 2,
      y: (v1.y + v2.y) / 2
    };
  }

  /**
   * Rasterize a line between two pixel positions onto the grid
   * Uses 3-cell thickness to prevent diagonal corner slipping
   */
  private rasterizeLine(from: Point, to: Point): void {
    const cells = this.bresenhamLine(
      Math.floor(from.x / this.cellSize),
      Math.floor(from.y / this.cellSize),
      Math.floor(to.x / this.cellSize),
      Math.floor(to.y / this.cellSize)
    );

    // Mark each cell plus its 4 cardinal neighbors (3-cell thick line)
    for (const cell of cells) {
      // Center cell
      this.blockedCells.add(this.getCellKey(cell.x, cell.y));
      // Cardinal neighbors for thickness
      this.blockedCells.add(this.getCellKey(cell.x - 1, cell.y));
      this.blockedCells.add(this.getCellKey(cell.x + 1, cell.y));
      this.blockedCells.add(this.getCellKey(cell.x, cell.y - 1));
      this.blockedCells.add(this.getCellKey(cell.x, cell.y + 1));
    }
  }

  /**
   * Bresenham's line algorithm - returns grid cell positions
   */
  private bresenhamLine(x0: number, y0: number, x1: number, y1: number): Array<{x: number, y: number}> {
    const cells: Array<{x: number, y: number}> = [];

    // Validate inputs
    if (!isFinite(x0) || !isFinite(y0) || !isFinite(x1) || !isFinite(y1)) {
      logger.warn(`[NavigationGrid] Invalid coordinates for bresenhamLine: (${x0},${y0}) to (${x1},${y1})`);
      return cells;
    }

    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);

    // Handle zero-length line
    if (dx === 0 && dy === 0) {
      cells.push({ x: x0, y: y0 });
      return cells;
    }

    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;

    let x = x0;
    let y = y0;

    // Safety: max iterations
    const maxIterations = dx + dy + 10;
    let iterations = 0;

    while (iterations < maxIterations) {
      cells.push({ x, y });

      if (x === x1 && y === y1) break;

      const e2 = 2 * err;

      if (e2 > -dy) {
        err -= dy;
        x += sx;
      }

      if (e2 < dx) {
        err += dx;
        y += sy;
      }

      iterations++;
    }

    return cells;
  }

  /**
   * Mark crossing cells (bridges/fords)
   */
  private markCrossings(crossings: RiverCrossing[]): void {
    for (const crossing of crossings) {
      const pixel = this.crossingToPixel(crossing);
      if (!pixel) continue;

      const gridX = Math.floor(pixel.x / this.cellSize);
      const gridY = Math.floor(pixel.y / this.cellSize);

      // Mark center and neighbors as crossing (3x3 area)
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          this.crossingCells.add(this.getCellKey(gridX + dx, gridY + dy));
        }
      }
    }
  }

  /**
   * Convert crossing to pixel coordinates
   */
  private crossingToPixel(crossing: RiverCrossing): Point | null {
    const hexId = `${crossing.hexI}.${crossing.hexJ}`;
    const layout = this.hexLayouts.get(hexId);

    if (!layout) {
      if (this.canvas?.grid) {
        // Fallback to canvas
        if (crossing.isCenter) {
          const center = this.canvas.grid.getCenterPoint({ i: crossing.hexI, j: crossing.hexJ });
          return center ? { x: center.x, y: center.y } : null;
        }
        if (crossing.edge) {
          const midpoint = getEdgeMidpoint(crossing.hexI, crossing.hexJ, crossing.edge as any, this.canvas);
          return midpoint ? { x: midpoint.x, y: midpoint.y } : null;
        }
      }
      return null;
    }

    if (crossing.isCenter) {
      return { ...layout.center };
    }

    if (crossing.edge) {
      return this.getEdgeMidpointFromLayout(layout, crossing.edge);
    }

    if (crossing.cornerIndex !== undefined && layout.vertices[crossing.cornerIndex]) {
      return { ...layout.vertices[crossing.cornerIndex] };
    }

    return { ...layout.center };
  }

  /**
   * Get cells along a line between two pixel positions
   */
  private getCellsOnLine(from: Point, to: Point): CellKey[] {
    const cells = this.bresenhamLine(
      Math.floor(from.x / this.cellSize),
      Math.floor(from.y / this.cellSize),
      Math.floor(to.x / this.cellSize),
      Math.floor(to.y / this.cellSize)
    );

    return cells.map(c => this.getCellKey(c.x, c.y));
  }

  /**
   * Create cell key from grid coordinates
   */
  private getCellKey(gridX: number, gridY: number): CellKey {
    return `${gridX},${gridY}`;
  }

  /**
   * Parse hex ID into coordinates
   */
  private parseHexId(hexId: string): { i: number; j: number } | null {
    const parts = hexId.split('.');
    if (parts.length !== 2) return null;

    const i = parseInt(parts[0], 10);
    const j = parseInt(parts[1], 10);

    if (isNaN(i) || isNaN(j)) return null;

    return { i, j };
  }
}

// Export singleton instance
export const navigationGrid = new NavigationGrid();
