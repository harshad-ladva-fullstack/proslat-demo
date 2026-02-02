/**
 * Component Factory Functions
 * 
 * Creates properly-typed components with correctly configured ports.
 * All components follow the constraint-driven model.
 */

import { v4 as uuidv4 } from 'uuid'
import {
  ComponentType,
  ConnectorSubtype,
  type HubComponent,
  type LightBarComponent,
  type ConnectorComponent,
  type Port,
  type Position2D,
  type WorldPosition,
} from './connection-graph'

// Re-export ConnectorSubtype for convenience
export { ConnectorSubtype } from './connection-graph'

// ============================================================================
// ID GENERATORS
// ============================================================================

export function generateComponentId(): string {
  return `comp_${uuidv4()}`
}

export function generatePortId(): string {
  return `port_${uuidv4()}`
}

export function generateConnectionId(): string {
  return `conn_${uuidv4()}`
}

// ============================================================================
// PORT FACTORY
// ============================================================================

/**
 * Creates a port with the given configuration.
 */
function createPort(
  parentComponentId: string,
  direction: number,
  localPosition: Position2D,
  index: number,
  compatibleWith: ComponentType[] = []
): Port {
  return {
    id: generatePortId(),
    parentComponentId,
    direction,
    localPosition,
    occupied: false,
    connectedToPortId: null,
    compatibleWith,
    index,
  }
}

// ============================================================================
// HUB FACTORY
// ============================================================================

/**
 * Hub port distance from center (in inches)
 * Small offset for visual connection point
 */
const HUB_PORT_OFFSET_INCHES = 2.4 // ~0.2 feet

/**
 * Creates a Hub component.
 * 
 * Hub has 4 ports facing cardinal directions (0°, 90°, 180°, 270°).
 * 
 * @param isRootHub - Whether this is the first hub (can be placed freely)
 * @param worldPosition - World position (required for root hub)
 * @param worldRotation - World rotation in degrees (default 0)
 */
export function createHubComponent(
  isRootHub: boolean,
  worldPosition: WorldPosition = { x: 0, y: 10, z: 0 },
  worldRotation: number = 0
): HubComponent {
  const id = generateComponentId()
  const now = Date.now()
  
  // Hub has 4 ports at cardinal directions
  const ports: Port[] = [
    // Port 0: Forward (0°, negative Z)
    createPort(id, 0, { x: 0, z: -HUB_PORT_OFFSET_INCHES }, 0),
    // Port 1: Right (90°, positive X)
    createPort(id, 90, { x: HUB_PORT_OFFSET_INCHES, z: 0 }, 1),
    // Port 2: Backward (180°, positive Z)
    createPort(id, 180, { x: 0, z: HUB_PORT_OFFSET_INCHES }, 2),
    // Port 3: Left (270°, negative X)
    createPort(id, 270, { x: -HUB_PORT_OFFSET_INCHES, z: 0 }, 3),
  ]
  
  return {
    id,
    type: ComponentType.HUB,
    ports,
    price: 35,
    wireLengthContribution: 0, // Hubs don't contribute to wire length
    createdAt: now,
    updatedAt: now,
    maxWireLength: 36 * 12, // 36 feet in inches = 432 inches
    isRootHub,
    worldPosition,
    worldRotation,
  }
}

// ============================================================================
// LIGHT BAR FACTORY
// ============================================================================

/**
 * Creates a Light Bar component.
 * 
 * Light bar has 2 ports at each end (0° and 180°).
 * The port local positions are at half the length from center.
 * 
 * @param lengthInches - Length of the light bar (18 or 36)
 * @param lightingMode - 'white' or 'rgb'
 * @param rgbColor - RGB color hex string (used when lightingMode is 'rgb')
 * @param casingColor - Casing color
 */
export function createLightBarComponent(
  lengthInches: 18 | 36,
  lightingMode: 'white' | 'rgb' = 'white',
  rgbColor: string = '#ff00ff',
  casingColor: 'matte_black' | 'white' = 'matte_black'
): LightBarComponent {
  const id = generateComponentId()
  const now = Date.now()
  
  // Half length for port positioning
  const halfLength = lengthInches / 2
  
  // Light bar has 2 ports at each end
  // Port 0 faces backward (180°) - this is the "input" end
  // Port 1 faces forward (0°) - this is the "output" end
  const ports: Port[] = [
    // Port 0: Left end (180°, negative direction along bar axis)
    createPort(id, 180, { x: -halfLength, z: 0 }, 0),
    // Port 1: Right end (0°, positive direction along bar axis)
    createPort(id, 0, { x: halfLength, z: 0 }, 1),
  ]
  
  // Calculate wattage and lumens based on length
  const wattsPerInch = 0.67
  const lumensPerInch = 66.67
  const watts = Math.round(lengthInches * wattsPerInch)
  const lumens = Math.round(lengthInches * lumensPerInch)
  
  // Price based on length
  const price = lengthInches === 18 ? 45 : 75
  
  return {
    id,
    type: ComponentType.LIGHT_BAR,
    ports,
    price,
    wireLengthContribution: lengthInches,
    createdAt: now,
    updatedAt: now,
    lengthInches,
    lightingMode,
    rgbColor,
    watts,
    lumens,
    casingColor,
    // Position and rotation will be derived from connection
    worldPosition: { x: 0, y: 10, z: 0 },
    worldRotation: 0,
  }
}

// ============================================================================
// CONNECTOR FACTORY
// ============================================================================

/**
 * Connector port offset from center (in inches)
 */
const CONNECTOR_PORT_OFFSET_INCHES = 1.8 // ~0.15 feet

/**
 * Creates a Connector component.
 * 
 * @param subtype - The connector subtype
 * @param casingColor - Casing color
 */
export function createConnectorComponent(
  subtype: ConnectorSubtype,
  casingColor: 'matte_black' | 'white' = 'matte_black'
): ConnectorComponent {
  const id = generateComponentId()
  const now = Date.now()
  
  // Get port configuration based on subtype
  const { portCount, portAngles, price } = getConnectorConfig(subtype)
  
  // Create ports based on angles
  const ports: Port[] = portAngles.map((angle, index) => {
    const radians = (angle * Math.PI) / 180
    const localPosition: Position2D = {
      x: Math.sin(radians) * CONNECTOR_PORT_OFFSET_INCHES,
      z: -Math.cos(radians) * CONNECTOR_PORT_OFFSET_INCHES,
    }
    return createPort(id, angle, localPosition, index)
  })
  
  return {
    id,
    type: ComponentType.CONNECTOR,
    ports,
    price,
    wireLengthContribution: 0, // Connectors don't contribute significantly
    createdAt: now,
    updatedAt: now,
    subtype,
    portCount,
    portAngles,
    casingColor,
    // Position and rotation will be derived from connection
    worldPosition: { x: 0, y: 10, z: 0 },
    worldRotation: 0,
  }
}

/**
 * Get connector configuration based on subtype
 */
function getConnectorConfig(subtype: ConnectorSubtype): {
  portCount: number
  portAngles: number[]
  price: number
} {
  switch (subtype) {
    case ConnectorSubtype.L_CONNECTOR:
      return { portCount: 2, portAngles: [0, 90], price: 15 }
    
    case ConnectorSubtype.T_CONNECTOR:
      return { portCount: 3, portAngles: [0, 90, 180], price: 19 }
    
    case ConnectorSubtype.CROSS_CONNECTOR:
      return { portCount: 4, portAngles: [0, 90, 180, 270], price: 24 }
    
    case ConnectorSubtype.Y_CONNECTOR:
      return { portCount: 3, portAngles: [0, 120, 240], price: 19 }
    
    case ConnectorSubtype.ELBOW_45_LEFT:
      return { portCount: 2, portAngles: [0, 45], price: 12 }
    
    case ConnectorSubtype.ELBOW_45_RIGHT:
      return { portCount: 2, portAngles: [0, 315], price: 12 } // 315° = -45°
    
    case ConnectorSubtype.ELBOW_90_LEFT:
      return { portCount: 2, portAngles: [0, 90], price: 12 }
    
    case ConnectorSubtype.ELBOW_90_RIGHT:
      return { portCount: 2, portAngles: [0, 270], price: 12 } // 270° = -90°
    
    default:
      throw new Error(`Unknown connector subtype: ${subtype}`)
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get the display name for a component type
 */
export function getComponentTypeName(type: ComponentType): string {
  switch (type) {
    case ComponentType.HUB:
      return 'Hub'
    case ComponentType.LIGHT_BAR:
      return 'Light Bar'
    case ComponentType.CONNECTOR:
      return 'Connector'
    default:
      return 'Unknown'
  }
}

/**
 * Get the display name for a connector subtype
 */
export function getConnectorSubtypeName(subtype: ConnectorSubtype): string {
  switch (subtype) {
    case ConnectorSubtype.L_CONNECTOR:
      return 'L Connector'
    case ConnectorSubtype.T_CONNECTOR:
      return 'T Connector'
    case ConnectorSubtype.CROSS_CONNECTOR:
      return 'Cross Connector'
    case ConnectorSubtype.Y_CONNECTOR:
      return 'Y Connector'
    case ConnectorSubtype.ELBOW_45_LEFT:
      return '45° Left Elbow'
    case ConnectorSubtype.ELBOW_45_RIGHT:
      return '45° Right Elbow'
    case ConnectorSubtype.ELBOW_90_LEFT:
      return '90° Left Elbow'
    case ConnectorSubtype.ELBOW_90_RIGHT:
      return '90° Right Elbow'
    default:
      return 'Connector'
  }
}
