/**
 * Connection Graph Type Definitions
 * 
 * This file defines the core data model for the constraint-driven,
 * connection-based ceiling lighting configurator.
 * 
 * CORE MENTAL MODEL:
 * - The system is a connection GRAPH, not a canvas
 * - Users do NOT place components freely
 * - Every component must be connected through ports
 * - Geometry (position, rotation, length) is a RESULT of connections, not user input
 * 
 * This is a manufacturing-safe configurator, not a drawing tool.
 */

// ============================================================================
// COMPONENT TYPES
// ============================================================================

/**
 * The three fundamental component types in the system.
 * Each has distinct rules for ports and connections.
 */
export const ComponentType = {
  /** Central power distribution unit - must be placed first */
  HUB: 'hub',
  /** Light-emitting bar - must connect to existing components */
  LIGHT_BAR: 'light_bar',
  /** Junction piece for branching (T, Cross, Y, 45°, 90°) */
  CONNECTOR: 'connector',
} as const

export type ComponentType = typeof ComponentType[keyof typeof ComponentType]

/**
 * Connector subtypes define the geometry and port arrangement
 * These match the ConnectorType from the catalog for compatibility
 */
export const ConnectorSubtype = {
  L_CONNECTOR: 'l_connector',          // 2 ports: 0°, 90°
  T_CONNECTOR: 't_connector',          // 3 ports: 0°, 90°, 180°
  CROSS_CONNECTOR: 'cross_connector',  // 4 ports: 0°, 90°, 180°, 270°
  Y_CONNECTOR: 'y_connector',          // 3 ports: 0°, 120°, 240°
  ELBOW_45_LEFT: 'elbow_45_left',      // 2 ports: 0°, 45°
  ELBOW_45_RIGHT: 'elbow_45_right',    // 2 ports: 0°, -45°
  ELBOW_90_LEFT: 'elbow_90_left',      // 2 ports: 0°, 90°
  ELBOW_90_RIGHT: 'elbow_90_right',    // 2 ports: 0°, -90°
} as const

export type ConnectorSubtype = typeof ConnectorSubtype[keyof typeof ConnectorSubtype]

// ============================================================================
// PORT TYPES (CRITICAL)
// ============================================================================

/**
 * A Port is the fundamental connection point on a component.
 * 
 * Ports are NOT just numbers. They are spatial + directional.
 * Every connection happens port-to-port.
 */
export interface Port {
  /** Unique identifier within the parent component */
  id: string
  
  /** Reference to the parent component */
  parentComponentId: string
  
  /**
   * Direction the port faces, in degrees.
   * 0° = positive Z axis (forward)
   * 90° = positive X axis (right)
   * 180° = negative Z axis (backward)
   * 270° = negative X axis (left)
   */
  direction: number
  
  /**
   * Position relative to component center (in inches).
   * This is used to calculate world position when the component
   * is placed in the scene.
   */
  localPosition: Position2D
  
  /** Whether this port is currently connected */
  occupied: boolean
  
  /** ID of the port this is connected to (if occupied) */
  connectedToPortId: string | null
  
  /**
   * List of component types that can connect to this port.
   * Empty array means compatible with all types.
   */
  compatibleWith: ComponentType[]
  
  /**
   * Port index for UI display (0, 1, 2, etc.)
   * Used when users select "connect to port 1"
   */
  index: number
}

/**
 * 2D position on the ceiling plane (X, Z in 3D space).
 * We use inches as the unit of measurement.
 */
export interface Position2D {
  x: number // inches
  z: number // inches
}

/**
 * World position for 3D rendering (includes Y for ceiling height)
 */
export interface WorldPosition {
  x: number
  y: number
  z: number
}

// ============================================================================
// COMPONENT DEFINITIONS
// ============================================================================

/**
 * Base interface for all ceiling components.
 * 
 * IMPORTANT: position and rotation are DERIVED from the connection graph,
 * not set directly by users (except for the root hub).
 */
interface BaseComponent {
  /** Unique component identifier */
  id: string
  
  /** Component type discriminator */
  type: ComponentType
  
  /** Array of connection ports */
  ports: Port[]
  
  /** Price in dollars */
  price: number
  
  /**
   * How much wire length this component contributes.
   * For light bars, this is the bar length.
   * For connectors and hubs, this is typically 0 or minimal.
   */
  wireLengthContribution: number
  
  /** Timestamp of creation */
  createdAt: number
  
  /** Timestamp of last update */
  updatedAt: number
}

/**
 * Hub Component - Central power distribution unit
 * 
 * RULES:
 * - Exactly ONE hub can exist without a connection (root hub)
 * - Additional hubs must connect to existing system
 * - Hub has 4 ports facing cardinal directions
 */
export interface HubComponent extends BaseComponent {
  type: typeof ComponentType.HUB
  
  /** Maximum total wire length this hub can power (in inches) */
  maxWireLength: number
  
  /**
   * Whether this is the root hub (first placed component).
   * Root hub is the only component that can be placed without a connection.
   */
  isRootHub: boolean
  
  /**
   * World position of the hub center.
   * For root hub: set by user.
   * For other hubs: derived from connections.
   */
  worldPosition: WorldPosition
  
  /**
   * Rotation in degrees around Y axis.
   * For root hub: set by user (default 0).
   * For other hubs: derived from connections.
   */
  worldRotation: number
}

/**
 * Light Bar Component
 * 
 * RULES:
 * - CANNOT be placed without connecting to an existing port
 * - Has exactly 2 ports (one at each end)
 * - Length is fixed (18" or 36")
 */
export interface LightBarComponent extends BaseComponent {
  type: typeof ComponentType.LIGHT_BAR
  
  /** Physical length in inches (18 or 36) */
  lengthInches: 18 | 36
  
  /** Lighting mode */
  lightingMode: 'white' | 'rgb'
  
  /** RGB color when in RGB mode */
  rgbColor: string
  
  /** Wattage */
  watts: number
  
  /** Lumens output */
  lumens: number
  
  /** Casing color */
  casingColor: 'matte_black' | 'white'
  
  /**
   * World position of the light bar CENTER.
   * DERIVED from connection to the parent component.
   */
  worldPosition: WorldPosition
  
  /**
   * Rotation in degrees around Y axis.
   * DERIVED from the connection angle.
   */
  worldRotation: number
}

/**
 * Connector Component
 * 
 * RULES:
 * - CANNOT be placed without connecting to an existing port
 * - Port count varies by subtype (2, 3, or 4 ports)
 * - Consumes one port to connect, exposes remaining ports
 */
export interface ConnectorComponent extends BaseComponent {
  type: typeof ComponentType.CONNECTOR
  
  /** Specific connector subtype */
  subtype: ConnectorSubtype
  
  /** Number of ports this connector has */
  portCount: number
  
  /** Angles at which ports are arranged */
  portAngles: number[]
  
  /** Casing color */
  casingColor: 'matte_black' | 'white'
  
  /**
   * World position of the connector CENTER.
   * DERIVED from connection to the parent component.
   */
  worldPosition: WorldPosition
  
  /**
   * Rotation in degrees around Y axis.
   * DERIVED from the connection angle.
   */
  worldRotation: number
}

/** Union type for all component types */
export type Component = HubComponent | LightBarComponent | ConnectorComponent

// ============================================================================
// CONNECTION TYPES
// ============================================================================

/**
 * A Connection represents a link between two ports.
 * 
 * The connection graph is bidirectional:
 * - fromPortId connects to toPortId
 * - toPortId connects to fromPortId
 */
export interface Connection {
  /** Unique connection identifier */
  id: string
  
  /** Port ID of the source (existing component) */
  fromPortId: string
  
  /** Component ID of the source */
  fromComponentId: string
  
  /** Port ID of the target (new component) */
  toPortId: string
  
  /** Component ID of the target */
  toComponentId: string
  
  /**
   * Physical distance of this connection segment in inches.
   * For direct port-to-port: minimal (connector size)
   * Contributes to total wire length calculation.
   */
  wireLength: number
  
  /** Timestamp of creation */
  createdAt: number
}

// ============================================================================
// CONNECTION GRAPH
// ============================================================================

/**
 * The Connection Graph is the core data structure.
 * 
 * All component positions and rotations are DERIVED from this graph.
 * The graph must always be valid - no orphaned components allowed.
 */
export interface ConnectionGraph {
  /** All components in the system, keyed by ID */
  components: Map<string, Component>
  
  /** All connections in the system, keyed by ID */
  connections: Map<string, Connection>
  
  /** Quick lookup: port ID -> connection ID */
  portToConnection: Map<string, string>
  
  /** The root hub ID (first placed component) */
  rootHubId: string | null
}

// ============================================================================
// VALIDATION TYPES
// ============================================================================

/**
 * Validation state for placement attempts
 */
export const ValidationState = {
  /** Component can be placed at this location */
  VALID: 'valid',
  /** Component cannot be placed - show red + warning */
  INVALID: 'invalid',
  /** Checking validity */
  PENDING: 'pending',
} as const

export type ValidationState = typeof ValidationState[keyof typeof ValidationState]

/**
 * Specific error codes for invalid placements
 */
export const PlacementError = {
  /** No compatible free port exists */
  NO_COMPATIBLE_PORT: 'no_compatible_port',
  /** Target port is already occupied */
  PORT_OCCUPIED: 'port_occupied',
  /** Port directions don't align */
  DIRECTION_MISMATCH: 'direction_mismatch',
  /** Would exceed maximum wire length */
  WIRE_LENGTH_EXCEEDED: 'wire_length_exceeded',
  /** Component types are not compatible */
  INCOMPATIBLE_TYPES: 'incompatible_types',
  /** No hub exists (first component must be hub) */
  NO_ROOT_HUB: 'no_root_hub',
  /** System already has a root hub */
  ROOT_HUB_EXISTS: 'root_hub_exists',
} as const

export type PlacementError = typeof PlacementError[keyof typeof PlacementError]

/**
 * Result of a placement validation check
 */
export interface PlacementValidationResult {
  state: ValidationState
  errors: PlacementError[]
  errorMessages: string[]
  
  /** If valid, which port on the target component to use */
  suggestedPortId: string | null
  
  /** If valid, the world position for the new component */
  derivedPosition: WorldPosition | null
  
  /** If valid, the world rotation for the new component */
  derivedRotation: number | null
}

// ============================================================================
// SNAP TARGET TYPES
// ============================================================================

/**
 * Information about a potential snap target during drag operations
 */
export interface SnapTarget {
  /** Component ID of the target */
  componentId: string
  
  /** Port ID on the target component */
  portId: string
  
  /** World position of the port */
  portWorldPosition: WorldPosition
  
  /** Direction the port faces (degrees) */
  portDirection: number
  
  /** Whether this is a valid snap target */
  isValid: boolean
  
  /** If invalid, why */
  invalidReason: PlacementError | null
}

// ============================================================================
// MEASUREMENT TYPES
// ============================================================================

/**
 * Measurement display for a placed light bar
 */
export interface LightBarMeasurement {
  componentId: string
  
  /** Physical length in inches */
  lengthInches: number
  
  /** Horizontal span on X axis in inches */
  horizontalSpan: number
  
  /** Vertical span on Z axis in inches */
  verticalSpan: number
  
  /** Start position (port 0 world position) */
  startPosition: WorldPosition
  
  /** End position (port 1 world position) */
  endPosition: WorldPosition
}

/**
 * System-wide measurements
 */
export interface SystemMeasurements {
  /** Total wire length in inches */
  totalWireLengthInches: number
  
  /** Total wire length in feet */
  totalWireLengthFeet: number
  
  /** Maximum allowed wire length in inches */
  maxWireLengthInches: number
  
  /** Wire length utilization percentage */
  wireLengthUtilization: number
  
  /** Is system over the wire limit */
  isOverLimit: boolean
  
  /** Individual light bar measurements */
  lightBarMeasurements: LightBarMeasurement[]
  
  /** Bounding box of entire system */
  boundingBox: {
    minX: number
    maxX: number
    minZ: number
    maxZ: number
    width: number
    depth: number
  }
}

// ============================================================================
// TYPE GUARDS
// ============================================================================

export function isHubComponent(component: Component): component is HubComponent {
  return component.type === ComponentType.HUB
}

export function isLightBarComponent(component: Component): component is LightBarComponent {
  return component.type === ComponentType.LIGHT_BAR
}

export function isConnectorComponent(component: Component): component is ConnectorComponent {
  return component.type === ComponentType.CONNECTOR
}
