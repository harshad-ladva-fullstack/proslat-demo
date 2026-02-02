/**
 * Ceiling Designer Types
 * 
 * Core type definitions for the ceiling lighting configuration module.
 * All types are strictly typed to ensure compile-time safety.
 * Using const objects instead of enums for compatibility.
 */

// ============================================================================
// CONST OBJECTS (replacing enums)
// ============================================================================

/** Available lighting modes for light bars */
export const LightingMode = {
  WHITE: 'white',
  RGB: 'rgb',
} as const
export type LightingMode = typeof LightingMode[keyof typeof LightingMode]

/** Available casing colors for components */
export const CasingColor = {
  MATTE_BLACK: 'matte_black',
  WHITE: 'white',
} as const
export type CasingColor = typeof CasingColor[keyof typeof CasingColor]

/** Light bar length options in inches */
export const LightBarLength = {
  INCHES_18: 18,
  INCHES_36: 36,
} as const
export type LightBarLength = typeof LightBarLength[keyof typeof LightBarLength]

/** Component categories for the sidebar tabs */
export const ComponentCategory = {
  LIGHT_BARS: 'light_bars',
  HUBS: 'hubs',
  CONNECTORS: 'connectors',
} as const
export type ComponentCategory = typeof ComponentCategory[keyof typeof ComponentCategory]

/** Connector types with their specific properties */
export const ConnectorType = {
  L_CONNECTOR: 'l_connector',
  T_CONNECTOR: 't_connector',
  CROSS_CONNECTOR: 'cross_connector',
  Y_CONNECTOR: 'y_connector',
  ELBOW_45_LEFT: 'elbow_45_left',
  ELBOW_45_RIGHT: 'elbow_45_right',
  ELBOW_90_LEFT: 'elbow_90_left',
  ELBOW_90_RIGHT: 'elbow_90_right',
} as const
export type ConnectorType = typeof ConnectorType[keyof typeof ConnectorType]

/** Connection validation states */
export const ConnectionState = {
  VALID: 'valid',
  INVALID: 'invalid',
  PENDING: 'pending',
} as const
export type ConnectionState = typeof ConnectionState[keyof typeof ConnectionState]

/** Camera view modes */
export const CameraView = {
  FRONT: 'front',
  SIDE: 'side',
  TOP: 'top',
  PERSPECTIVE: 'perspective',
} as const
export type CameraView = typeof CameraView[keyof typeof CameraView]

/** Error codes for placement validation */
export const PlacementErrorCode = {
  OVERLAPPING: 'overlapping',
  FLOATING: 'floating',
  WIRE_LENGTH_EXCEEDED: 'wire_length_exceeded',
  INVALID_CONNECTION_ANGLE: 'invalid_connection_angle',
  PORT_ALREADY_OCCUPIED: 'port_already_occupied',
  INCOMPATIBLE_COMPONENTS: 'incompatible_components',
} as const
export type PlacementErrorCode = typeof PlacementErrorCode[keyof typeof PlacementErrorCode]

/** Warning codes for placement validation */
export const PlacementWarningCode = {
  NEAR_WIRE_LIMIT: 'near_wire_limit',
  SUBOPTIMAL_LAYOUT: 'suboptimal_layout',
} as const
export type PlacementWarningCode = typeof PlacementWarningCode[keyof typeof PlacementWarningCode]

// ============================================================================
// POSITION & GEOMETRY
// ============================================================================

/** 3D position coordinates */
export interface Position3D {
  x: number
  y: number
  z: number
}

/** Rotation in Euler angles (radians) */
export interface Rotation3D {
  x: number
  y: number
  z: number
}

/** Connection port on a component */
export interface ConnectionPort {
  id: string
  position: Position3D
  direction: Position3D
  angle: number
  isOccupied: boolean
  connectedTo: string | null
}

// ============================================================================
// COMPONENT BASE TYPES
// ============================================================================

/** Base interface for all ceiling components */
export interface CeilingComponentBase {
  id: string
  type: ComponentCategory
  position: Position3D
  rotation: Rotation3D
  casingColor: CasingColor
  isSelected: boolean
  isValid: boolean
  createdAt: number
  updatedAt: number
  ports: ConnectionPort[]
}

/** Light bar component */
export interface LightBar extends CeilingComponentBase {
  type: typeof ComponentCategory.LIGHT_BARS
  length: LightBarLength
  lightingMode: LightingMode
  lightColor: string // RGB hex color for the light glow (e.g., '#ff00ff')
  animationSpeed: number // Animation speed for blinking/pulsing effects (0 = no animation)
  watts: number
  lumens: number
  connectedHubId: string | null
}

/** Hub component - central power unit */
export interface Hub extends CeilingComponentBase {
  type: typeof ComponentCategory.HUBS
  maxWireLength: number
  currentWireLength: number
  connectedComponents: string[]
  isPowered: boolean
}

/** Connector component */
export interface Connector extends CeilingComponentBase {
  type: typeof ComponentCategory.CONNECTORS
  connectorType: ConnectorType
  portCount: number
  maxWireLength: number
  angles: number[]
}

/** Union type for all placeable components */
export type CeilingComponent = LightBar | Hub | Connector

// ============================================================================
// CATALOG TYPES (for sidebar display)
// ============================================================================

/** Catalog item for light bars */
export interface LightBarCatalogItem {
  id: string
  name: string
  category: typeof ComponentCategory.LIGHT_BARS
  length: LightBarLength
  watts: number
  lumens: number
  price: number
  description: string
  iconPath?: string
}

/** Catalog item for hubs */
export interface HubCatalogItem {
  id: string
  name: string
  category: typeof ComponentCategory.HUBS
  maxWireLength: number
  portCount: number
  price: number
  description: string
  iconPath?: string
}

/** Catalog item for connectors */
export interface ConnectorCatalogItem {
  id: string
  name: string
  category: typeof ComponentCategory.CONNECTORS
  connectorType: ConnectorType
  portCount: number
  maxWireLength: number
  angles: number[]
  price: number
  description: string
  iconPath?: string
}

/** Union type for all catalog items */
export type CatalogItem = LightBarCatalogItem | HubCatalogItem | ConnectorCatalogItem

// ============================================================================
// CONNECTION TYPES
// ============================================================================

/** Represents a connection between two components */
export interface Connection {
  id: string
  sourceComponentId: string
  sourcePortId: string
  targetComponentId: string
  targetPortId: string
  wireLength: number
  isValid: boolean
  validationErrors: string[]
}

/** Wire length tracking per hub */
export interface WireLengthStatus {
  hubId: string
  currentLength: number
  maxLength: number
  isOverLimit: boolean
  utilizationPercentage: number
}

// ============================================================================
// VALIDATION TYPES
// ============================================================================

/** Validation result for a component placement */
export interface PlacementValidation {
  isValid: boolean
  errors: PlacementError[]
  warnings: PlacementWarning[]
}

/** Placement error details */
export interface PlacementError {
  code: PlacementErrorCode
  message: string
  affectedComponentIds: string[]
}

/** Placement warning details */
export interface PlacementWarning {
  code: PlacementWarningCode
  message: string
  affectedComponentIds: string[]
}

// ============================================================================
// STATE TYPES
// ============================================================================

/** Drag operation state */
export interface DragState {
  isDragging: boolean
  draggedComponentId: string | null
  draggedCatalogItem: CatalogItem | null
  startPosition: Position3D | null
  currentPosition: Position3D | null
  snapTarget: SnapTarget | null
}

/** Snap target information */
export interface SnapTarget {
  componentId: string
  portId: string
  position: Position3D
  isValid: boolean
}

/** Selection state */
export interface SelectionState {
  selectedComponentId: string | null
  hoveredComponentId: string | null
  multiSelectIds: string[]
}

/** Canvas state */
export interface CanvasState {
  cameraView: CameraView
  gridVisible: boolean
  snapEnabled: boolean
  wireframeMode: boolean
  showConnections: boolean
}

// ============================================================================
// STATISTICS TYPES
// ============================================================================

/** Overall system statistics */
export interface SystemStats {
  totalWatts: number
  totalLumens: number
  totalWireLength: number
  componentCount: {
    lightBars: number
    hubs: number
    connectors: number
  }
  estimatedPrice: number
}

// ============================================================================
// TYPE GUARDS
// ============================================================================

/** Type guard for LightBar */
export function isLightBar(component: CeilingComponent): component is LightBar {
  return component.type === ComponentCategory.LIGHT_BARS
}

/** Type guard for Hub */
export function isHub(component: CeilingComponent): component is Hub {
  return component.type === ComponentCategory.HUBS
}

/** Type guard for Connector */
export function isConnector(component: CeilingComponent): component is Connector {
  return component.type === ComponentCategory.CONNECTORS
}

/** Type guard for LightBarCatalogItem */
export function isLightBarCatalogItem(item: CatalogItem): item is LightBarCatalogItem {
  return item.category === ComponentCategory.LIGHT_BARS
}

/** Type guard for HubCatalogItem */
export function isHubCatalogItem(item: CatalogItem): item is HubCatalogItem {
  return item.category === ComponentCategory.HUBS
}

/** Type guard for ConnectorCatalogItem */
export function isConnectorCatalogItem(item: CatalogItem): item is ConnectorCatalogItem {
  return item.category === ComponentCategory.CONNECTORS
}

// ============================================================================
// STORE STATE TYPE (for explicit typing in selectors)
// ============================================================================

/** State interface for the ceiling designer store */
export interface CeilingDesignerState {
  // Components
  components: CeilingComponent[]
  connections: Connection[]
  
  // Selection & Interaction
  selection: SelectionState
  drag: DragState
  
  // Canvas settings
  canvas: CanvasState
  
  // Sidebar state
  activeTab: ComponentCategory
  
  // Computed values (cached)
  systemStats: SystemStats
  
  // Toast notifications
  toasts: { id: string; type: string; title: string; message: string; duration?: number }[]
  
  // Placed component dragging
  isDraggingPlacedComponent: boolean
  draggedPlacedComponentId: string | null
  
  // Actions - Components
  addComponent: (component: CeilingComponent) => void
  removeComponent: (id: string) => void
  updateComponent: (id: string, updates: Partial<CeilingComponent>) => void
  clearAllComponents: () => void
  
  // Actions - Component Creation from Catalog
  createComponentFromCatalog: (
    catalogItem: CatalogItem,
    position: Position3D
  ) => CeilingComponent | null
  
  // Actions - Connections
  addConnection: (connection: Connection) => void
  removeConnection: (id: string) => void
  validateAndConnect: (
    sourceId: string,
    sourcePortId: string,
    targetId: string,
    targetPortId: string
  ) => boolean
  
  // Actions - Selection
  selectComponent: (id: string | null) => void
  hoverComponent: (id: string | null) => void
  toggleMultiSelect: (id: string) => void
  clearSelection: () => void
  
  // Actions - Drag & Drop
  startDrag: (catalogItem: CatalogItem) => void
  updateDragPosition: (position: Position3D) => void
  setSnapTarget: (target: SnapTarget | null) => void
  endDrag: (dropPosition: Position3D | null) => void
  cancelDrag: () => void
  
  // Actions - Placed Component Dragging
  startDragPlacedComponent: (componentId: string) => void
  updatePlacedComponentPosition: (position: Position3D) => void
  endDragPlacedComponent: (finalPosition: Position3D | null) => void
  cancelDragPlacedComponent: () => void
  
  // Actions - Toast Notifications
  addToast: (toast: { type: string; title: string; message: string; duration?: number }) => void
  removeToast: (id: string) => void
  showConnectionError: (message: string) => void
  showConnectionSuccess: (message: string) => void
  
  // Actions - Properties Panel
  updateSelectedLightingMode: (mode: typeof LightingMode[keyof typeof LightingMode]) => void
  updateSelectedCasingColor: (color: typeof CasingColor[keyof typeof CasingColor]) => void
  updateSelectedLightColor: (color: string) => void
  updateSelectedAnimationSpeed: (speed: number) => void
  updateSelectedRotation: (rotation: Rotation3D) => void
  applyLightingModeToAll: (mode: typeof LightingMode[keyof typeof LightingMode]) => void
  applyCasingColorToAll: (color: typeof CasingColor[keyof typeof CasingColor]) => void
  applyLightColorToAll: (color: string) => void
  
  // Actions - Canvas
  setCameraView: (view: typeof CameraView[keyof typeof CameraView]) => void
  toggleGrid: () => void
  toggleSnap: () => void
  toggleWireframe: () => void
  toggleShowConnections: () => void
  
  // Actions - Sidebar
  setActiveTab: (tab: ComponentCategory) => void
  
  // Getters
  getSelectedComponent: () => CeilingComponent | null
  getWireLengthStatus: (hubId: string) => WireLengthStatus
  getComponentById: (id: string) => CeilingComponent | undefined
  getConnectedComponents: (componentId: string) => CeilingComponent[]
  
  // Recalculate stats
  recalculateStats: () => void
}

// ============================================================================
// RE-EXPORTS: Connection Graph Types (new constraint-driven system)
// ============================================================================

export * from './connection-graph'
export * from './component-factory'
export * from './movement'

