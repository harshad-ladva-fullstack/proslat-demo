/**
 * Ceiling Designer Constants
 * 
 * All configuration values, limits, and default settings for the ceiling designer.
 * No magic numbers in the codebase - everything is defined here.
 */

import {
  ConnectorType,
  LightBarLength,
  CasingColor,
  LightingMode,
  ComponentCategory,
  type LightBarCatalogItem,
  type HubCatalogItem,
  type ConnectorCatalogItem,
  type CameraView,
} from '../types'

// ============================================================================
// PHYSICAL CONSTRAINTS
// ============================================================================

/** Maximum wire length per hub in feet */
export const MAX_WIRE_LENGTH_PER_HUB = 36

/** Conversion factor: inches to feet */
export const INCHES_TO_FEET = 1 / 12

/** Snap distance threshold in 3D units */
export const SNAP_DISTANCE_THRESHOLD = 0.5

/** Minimum distance between components in 3D units */
export const MIN_COMPONENT_SPACING = 0.1

/** Grid cell size in 3D units */
export const GRID_CELL_SIZE = 1

// ============================================================================
// LIGHTING SPECIFICATIONS
// ============================================================================

/** Watts per inch for light bars */
export const WATTS_PER_INCH = 0.67

/** Lumens per inch for light bars */
export const LUMENS_PER_INCH = 66.67

// ============================================================================
// CONNECTOR SPECIFICATIONS
// ============================================================================

/** Port configurations for each connector type */
export const CONNECTOR_PORT_CONFIGS: Record<ConnectorType, { ports: number; angles: number[] }> = {
  [ConnectorType.L_CONNECTOR]: { ports: 2, angles: [0, 90] },
  [ConnectorType.T_CONNECTOR]: { ports: 3, angles: [0, 90, 180] },
  [ConnectorType.CROSS_CONNECTOR]: { ports: 4, angles: [0, 90, 180, 270] },
  [ConnectorType.Y_CONNECTOR]: { ports: 3, angles: [0, 120, 240] },
  [ConnectorType.ELBOW_45_LEFT]: { ports: 2, angles: [0, 45] },
  [ConnectorType.ELBOW_45_RIGHT]: { ports: 2, angles: [0, -45] },
  [ConnectorType.ELBOW_90_LEFT]: { ports: 2, angles: [0, 90] },
  [ConnectorType.ELBOW_90_RIGHT]: { ports: 2, angles: [0, -90] },
}

// ============================================================================
// CATALOG DATA
// ============================================================================

/** Light bar catalog items */
export const LIGHT_BAR_CATALOG: LightBarCatalogItem[] = [
  {
    id: 'lb-18-black',
    name: '18" Light Bar',
    category: ComponentCategory.LIGHT_BARS,
    length: LightBarLength.INCHES_18,
    watts: 12,
    lumens: 1200,
    price: 45,
    description: '18 inch light bar, 12W, 1200 lumens',
  },
  {
    id: 'lb-36-black',
    name: '36" Light Bar',
    category: ComponentCategory.LIGHT_BARS,
    length: LightBarLength.INCHES_36,
    watts: 24,
    lumens: 2400,
    price: 75,
    description: '36 inch light bar, 24W, 2400 lumens',
  },
]

/** Hub catalog items */
export const HUB_CATALOG: HubCatalogItem[] = [
  {
    id: 'hub-standard',
    name: 'Standard Hub',
    category: ComponentCategory.HUBS,
    maxWireLength: MAX_WIRE_LENGTH_PER_HUB,
    portCount: 4,
    price: 35,
    description: 'Central power hub, supports up to 36ft of connected light bars',
  },
]

/** Connector catalog items */
export const CONNECTOR_CATALOG: ConnectorCatalogItem[] = [
  {
    id: 'conn-l',
    name: 'L Connector',
    category: ComponentCategory.CONNECTORS,
    connectorType: ConnectorType.L_CONNECTOR,
    portCount: 2,
    maxWireLength: MAX_WIRE_LENGTH_PER_HUB,
    angles: [0, 90],
    price: 15,
    description: '90° corner connection',
  },
  {
    id: 'conn-t',
    name: 'T Connector',
    category: ComponentCategory.CONNECTORS,
    connectorType: ConnectorType.T_CONNECTOR,
    portCount: 3,
    maxWireLength: MAX_WIRE_LENGTH_PER_HUB,
    angles: [0, 90, 180],
    price: 19,
    description: '3-way junction',
  },
  {
    id: 'conn-cross',
    name: 'Cross Connector',
    category: ComponentCategory.CONNECTORS,
    connectorType: ConnectorType.CROSS_CONNECTOR,
    portCount: 4,
    maxWireLength: MAX_WIRE_LENGTH_PER_HUB,
    angles: [0, 90, 180, 270],
    price: 24,
    description: '4-way junction',
  },
  {
    id: 'conn-y',
    name: 'Y Connector',
    category: ComponentCategory.CONNECTORS,
    connectorType: ConnectorType.Y_CONNECTOR,
    portCount: 3,
    maxWireLength: MAX_WIRE_LENGTH_PER_HUB,
    angles: [0, 120, 240],
    price: 19,
    description: '3-way split at angle',
  },
  {
    id: 'conn-45-left',
    name: '45° Left Elbow',
    category: ComponentCategory.CONNECTORS,
    connectorType: ConnectorType.ELBOW_45_LEFT,
    portCount: 2,
    maxWireLength: MAX_WIRE_LENGTH_PER_HUB,
    angles: [0, 45],
    price: 12,
    description: '45° left angle connection',
  },
  {
    id: 'conn-45-right',
    name: '45° Right Elbow',
    category: ComponentCategory.CONNECTORS,
    connectorType: ConnectorType.ELBOW_45_RIGHT,
    portCount: 2,
    maxWireLength: MAX_WIRE_LENGTH_PER_HUB,
    angles: [0, -45],
    price: 12,
    description: '45° right angle connection',
  },
  {
    id: 'conn-90-left',
    name: '90° Left',
    category: ComponentCategory.CONNECTORS,
    connectorType: ConnectorType.ELBOW_90_LEFT,
    portCount: 2,
    maxWireLength: MAX_WIRE_LENGTH_PER_HUB,
    angles: [0, 90],
    price: 12,
    description: '90° left angle connection',
  },
  {
    id: 'conn-90-right',
    name: '90° Right',
    category: ComponentCategory.CONNECTORS,
    connectorType: ConnectorType.ELBOW_90_RIGHT,
    portCount: 2,
    maxWireLength: MAX_WIRE_LENGTH_PER_HUB,
    angles: [0, -90],
    price: 12,
    description: '90° right angle connection',
  },
]

// ============================================================================
// DEFAULT VALUES
// ============================================================================

/** Default casing color for new components */
export const DEFAULT_CASING_COLOR = CasingColor.MATTE_BLACK

/** Default lighting mode for new light bars */
export const DEFAULT_LIGHTING_MODE = LightingMode.WHITE

/** Default camera position */
export const DEFAULT_CAMERA_POSITION = { x: 0, y: 10, z: 15 }

/** Default camera look-at target */
export const DEFAULT_CAMERA_TARGET = { x: 0, y: 0, z: 0 }

// ============================================================================
// CAMERA PRESETS
// ============================================================================

export const CAMERA_PRESETS: Record<CameraView, { position: { x: number; y: number; z: number }; target: { x: number; y: number; z: number } }> = {
  front: { position: { x: 0, y: 5, z: 20 }, target: { x: 0, y: 5, z: 0 } },
  side: { position: { x: 20, y: 5, z: 0 }, target: { x: 0, y: 5, z: 0 } },
  top: { position: { x: 0, y: 25, z: 0 }, target: { x: 0, y: 0, z: 0 } },
  perspective: { position: { x: 15, y: 15, z: 15 }, target: { x: 0, y: 0, z: 0 } },
}

// ============================================================================
// COLORS
// ============================================================================

/** Color values for casing colors */
export const CASING_COLOR_VALUES: Record<CasingColor, string> = {
  [CasingColor.MATTE_BLACK]: '#1a1a1a',
  [CasingColor.WHITE]: '#f5f5f5',
}

/** Color for valid connections */
export const VALID_CONNECTION_COLOR = '#22c55e'

/** Color for invalid connections */
export const INVALID_CONNECTION_COLOR = '#ef4444'

/** Color for pending/hover connections */
export const PENDING_CONNECTION_COLOR = '#eab308'

/** Color for selection highlight */
export const SELECTION_HIGHLIGHT_COLOR = '#3b82f6'

/** Color for hover highlight */
export const HOVER_HIGHLIGHT_COLOR = '#60a5fa'

// ============================================================================
// UI CONSTANTS
// ============================================================================

/** Left sidebar width in pixels */
export const LEFT_SIDEBAR_WIDTH = 280

/** Right sidebar width in pixels */
export const RIGHT_SIDEBAR_WIDTH = 320

/** Header height in pixels */
export const HEADER_HEIGHT = 64

/** Animation duration in milliseconds */
export const ANIMATION_DURATION = 200

// ============================================================================
// 3D SCENE CONSTANTS
// ============================================================================

/** Ceiling height from floor in 3D units */
export const CEILING_HEIGHT = 10

/** Room dimensions for the garage */
export const ROOM_DIMENSIONS = {
  width: 24,
  depth: 24,
  height: CEILING_HEIGHT,
}

/** Light intensity for the scene */
export const AMBIENT_LIGHT_INTENSITY = 0.4

/** Directional light intensity */
export const DIRECTIONAL_LIGHT_INTENSITY = 0.6

/** Grid size (number of cells) */
export const GRID_SIZE = 50
