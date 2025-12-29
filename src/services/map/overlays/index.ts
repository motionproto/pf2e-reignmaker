/**
 * Map Overlays - Modular overlay definitions
 * 
 * Each overlay is defined in its own file for better organization and maintainability.
 */

export { createTerrainOverlay } from './TerrainOverlay';
export { createTerrainDifficultyOverlay } from './TerrainDifficultyOverlay';
export { createTerritoryCompositeOverlay, setTerritoryFactionVisibility } from './TerritoryCompositeOverlay';
// Legacy separate overlays (kept for reference, replaced by TerritoryCompositeOverlay)
// export { createTerritoriesOverlay } from './TerritoriesOverlay';
// export { createTerritoryBorderOverlay } from './TerritoryBorderOverlay';
export { createProvinceOverlay } from './ProvinceOverlay';
export { createProvincesFillOverlay } from './ProvincesFillOverlay';
export { createSettlementsOverlay } from './SettlementsOverlay';
export { createRoadsOverlay } from './RoadsOverlay';
export { createRiversOverlay } from './RiversOverlay';
export { createWorksitesOverlay } from './WorksitesOverlay';
export { createResourcesOverlay } from './ResourcesOverlay';
export { createSettlementIconsOverlay } from './SettlementIconsOverlay';
export { createSettlementLabelsOverlay } from './SettlementLabelsOverlay';
export { createFortificationsOverlay } from './FortificationsOverlay';
export { createInteractiveHoverOverlay } from './InteractiveHoverOverlay';
export { createArmyMovementOverlay, ARMY_MOVEMENT_LAYERS, ARMY_MOVEMENT_Z_INDICES } from './ArmyMovementOverlay';
export { createNavigationGridDebugOverlay } from './NavigationGridDebugOverlay';
export { createDemandedHexOverlay } from './DemandedHexOverlay';
export { createCellLakeEditorOverlay, CELL_LAKE_LAYERS, CELL_LAKE_Z_INDICES } from './CellLakeEditorOverlay';
export { createCellCrossingEditorOverlay, CELL_CROSSING_LAYERS, CELL_CROSSING_Z_INDICES } from './CellCrossingEditorOverlay';
