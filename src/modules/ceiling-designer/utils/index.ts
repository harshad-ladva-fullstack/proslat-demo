/**
 * Ceiling Designer Utility Functions
 * 
 * Helper functions for ID generation, calculations, and validations.
 */

import { v4 as uuidv4 } from 'uuid'
import type {
  CeilingComponent,
  Connection,
  ConnectionPort,
  Position3D,
  WireLengthStatus,
  SystemStats,
  PlacementValidation,
  PlacementError,
  ConnectorType,
} from '../types'
import {
  ComponentCategory,
  LightBarLength,
  PlacementErrorCode,
  isLightBar,
  isHub,
  isConnector,
} from '../types'
import {
  INCHES_TO_FEET,
  MAX_WIRE_LENGTH_PER_HUB,
  SNAP_DISTANCE_THRESHOLD,
} from '../constants'

// ============================================================================
// CONNECTION VALIDATION RULES
// ============================================================================

export interface ConnectionValidationResult {
  isValid: boolean
  errorCode?: string
  errorMessage?: string
}

/**
 * Defines which component types can connect to each other
 * Rules:
 * - LightBars can connect to: Hubs, Connectors, other LightBars
 * - Hubs can connect to: LightBars, Connectors
 * - Connectors can connect to: LightBars, Hubs, other Connectors
 */
export const CONNECTION_COMPATIBILITY: Record<ComponentCategory, ComponentCategory[]> = {
  [ComponentCategory.LIGHT_BARS]: [
    ComponentCategory.HUBS,
    ComponentCategory.CONNECTORS,
    ComponentCategory.LIGHT_BARS,
  ],
  [ComponentCategory.HUBS]: [
    ComponentCategory.LIGHT_BARS,
    ComponentCategory.CONNECTORS,
  ],
  [ComponentCategory.CONNECTORS]: [
    ComponentCategory.LIGHT_BARS,
    ComponentCategory.HUBS,
    ComponentCategory.CONNECTORS,
  ],
}

/**
 * Check if two component types are compatible for connection
 */
export function areComponentTypesCompatible(
  sourceType: ComponentCategory,
  targetType: ComponentCategory
): boolean {
  return CONNECTION_COMPATIBILITY[sourceType]?.includes(targetType) ?? false
}

/**
 * Validate a connection between two components
 */
export function validateConnection(
  sourceComponent: CeilingComponent,
  targetComponent: CeilingComponent,
  sourcePortId: string,
  targetPortId: string
): ConnectionValidationResult {
  // Check if source and target are the same
  if (sourceComponent.id === targetComponent.id) {
    return {
      isValid: false,
      errorCode: 'SAME_COMPONENT',
      errorMessage: 'Cannot connect a component to itself',
    }
  }

  // Check component type compatibility
  if (!areComponentTypesCompatible(sourceComponent.type, targetComponent.type)) {
    return {
      isValid: false,
      errorCode: 'INCOMPATIBLE_TYPES',
      errorMessage: `${getComponentTypeName(sourceComponent.type)} cannot connect to ${getComponentTypeName(targetComponent.type)}`,
    }
  }

  // Check if ports exist
  const sourcePort = sourceComponent.ports?.find((p) => p.id === sourcePortId)
  const targetPort = targetComponent.ports?.find((p) => p.id === targetPortId)

  if (!sourcePort) {
    return {
      isValid: false,
      errorCode: 'SOURCE_PORT_NOT_FOUND',
      errorMessage: 'Source connection port not found',
    }
  }

  if (!targetPort) {
    return {
      isValid: false,
      errorCode: 'TARGET_PORT_NOT_FOUND',
      errorMessage: 'Target connection port not found',
    }
  }

  // Check if ports are already occupied
  if (sourcePort.isOccupied) {
    return {
      isValid: false,
      errorCode: 'SOURCE_PORT_OCCUPIED',
      errorMessage: 'Source connection port is already in use',
    }
  }

  if (targetPort.isOccupied) {
    return {
      isValid: false,
      errorCode: 'TARGET_PORT_OCCUPIED',
      errorMessage: 'Target connection port is already in use',
    }
  }

  // Check angle compatibility for connectors
  if (isConnector(sourceComponent) || isConnector(targetComponent)) {
    const angleValid = validateConnectionAngle(
      sourceComponent,
      targetComponent,
      sourcePort,
      targetPort
    )
    if (!angleValid.isValid) {
      return angleValid
    }
  }

  // All checks passed
  return { isValid: true }
}

/**
 * Validate connection angle between components
 */
function validateConnectionAngle(
  sourceComponent: CeilingComponent,
  targetComponent: CeilingComponent,
  sourcePort: ConnectionPort,
  targetPort: ConnectionPort
): ConnectionValidationResult {
  // Calculate the angle difference between ports
  const angleDiff = Math.abs(normalizeAngle(sourcePort.angle - targetPort.angle - 180))
  
  // Allow a tolerance of 15 degrees
  const ANGLE_TOLERANCE = 15
  
  if (angleDiff > ANGLE_TOLERANCE && angleDiff < (360 - ANGLE_TOLERANCE)) {
    return {
      isValid: false,
      errorCode: 'INVALID_ANGLE',
      errorMessage: 'Connection angle is not compatible. Rotate the component to align properly.',
    }
  }

  return { isValid: true }
}

/**
 * Get human-readable component type name
 */
export function getComponentTypeName(type: ComponentCategory): string {
  switch (type) {
    case ComponentCategory.LIGHT_BARS:
      return 'Light Bar'
    case ComponentCategory.HUBS:
      return 'Hub'
    case ComponentCategory.CONNECTORS:
      return 'Connector'
    default:
      return 'Component'
  }
}

// ============================================================================
// ID GENERATION
// ============================================================================

/** Generate unique component ID */
export function generateComponentId(): string {
  return `comp-${uuidv4()}`
}

/** Generate unique port ID */
export function generatePortId(): string {
  return `port-${uuidv4()}`
}

/** Generate unique connection ID */
export function generateConnectionId(): string {
  return `conn-${uuidv4()}`
}

// ============================================================================
// POSITION UTILITIES
// ============================================================================

/** Calculate distance between two 3D points */
export function calculateDistance(a: Position3D, b: Position3D): number {
  return Math.sqrt(
    Math.pow(b.x - a.x, 2) +
    Math.pow(b.y - a.y, 2) +
    Math.pow(b.z - a.z, 2)
  )
}

/** Check if two positions are within snap distance */
export function isWithinSnapDistance(a: Position3D, b: Position3D): boolean {
  return calculateDistance(a, b) <= SNAP_DISTANCE_THRESHOLD
}

/** Normalize a direction vector */
export function normalizeDirection(dir: Position3D): Position3D {
  const length = Math.sqrt(dir.x * dir.x + dir.y * dir.y + dir.z * dir.z)
  if (length === 0) return { x: 0, y: 0, z: 0 }
  return {
    x: dir.x / length,
    y: dir.y / length,
    z: dir.z / length,
  }
}

/** Create a position from coordinates */
export function createPosition(x: number, y: number, z: number): Position3D {
  return { x, y, z }
}

/** Add two positions */
export function addPositions(a: Position3D, b: Position3D): Position3D {
  return {
    x: a.x + b.x,
    y: a.y + b.y,
    z: a.z + b.z,
  }
}

// ============================================================================
// WIRE LENGTH CALCULATIONS
// ============================================================================

/** Convert light bar length (inches) to wire length (feet) */
export function lightBarLengthToFeet(length: LightBarLength): number {
  return length * INCHES_TO_FEET
}

/** Calculate total wire length for connected components */
export function calculateTotalWireLength(
  components: CeilingComponent[],
  hubId: string
): number {
  let totalLength = 0

  for (const component of components) {
    if (isLightBar(component) && component.connectedHubId === hubId) {
      totalLength += lightBarLengthToFeet(component.length)
    }
  }

  return totalLength
}

/** Get wire length status for a hub */
export function getWireLengthStatus(
  components: CeilingComponent[],
  hubId: string
): WireLengthStatus {
  const currentLength = calculateTotalWireLength(components, hubId)
  const maxLength = MAX_WIRE_LENGTH_PER_HUB

  return {
    hubId,
    currentLength,
    maxLength,
    isOverLimit: currentLength > maxLength,
    utilizationPercentage: (currentLength / maxLength) * 100,
  }
}

// ============================================================================
// SYSTEM STATISTICS
// ============================================================================

/** Calculate system statistics */
export function calculateSystemStats(components: CeilingComponent[]): SystemStats {
  let totalWatts = 0
  let totalLumens = 0
  let totalWireLength = 0
  let estimatedPrice = 0
  let lightBarsCount = 0
  let hubsCount = 0
  let connectorsCount = 0

  for (const component of components) {
    if (isLightBar(component)) {
      totalWatts += component.watts
      totalLumens += component.lumens
      totalWireLength += lightBarLengthToFeet(component.length)
      estimatedPrice += component.length === LightBarLength.INCHES_18 ? 45 : 75
      lightBarsCount++
    } else if (isHub(component)) {
      estimatedPrice += 35
      hubsCount++
    } else if (isConnector(component)) {
      estimatedPrice += 15
      connectorsCount++
    }
  }

  return {
    totalWatts,
    totalLumens,
    totalWireLength,
    componentCount: {
      lightBars: lightBarsCount,
      hubs: hubsCount,
      connectors: connectorsCount,
    },
    estimatedPrice,
  }
}

// ============================================================================
// VALIDATION UTILITIES
// ============================================================================

/** Check if two components overlap */
export function checkComponentOverlap(
  a: CeilingComponent,
  b: CeilingComponent
): boolean {
  const distance = calculateDistance(a.position, b.position)
  const minDistance = 0.5
  return distance < minDistance
}

/** Validate component placement */
export function validatePlacement(
  component: CeilingComponent,
  existingComponents: CeilingComponent[],
  _connections: Connection[]
): PlacementValidation {
  const errors: PlacementError[] = []

  // Check for overlaps
  for (const existing of existingComponents) {
    if (existing.id !== component.id && checkComponentOverlap(component, existing)) {
      errors.push({
        code: PlacementErrorCode.OVERLAPPING,
        message: `Component overlaps with ${existing.id}`,
        affectedComponentIds: [component.id, existing.id],
      })
    }
  }

  // Check wire length limits for light bars
  if (isLightBar(component) && component.connectedHubId) {
    const status = getWireLengthStatus(
      [...existingComponents, component],
      component.connectedHubId
    )
    if (status.isOverLimit) {
      errors.push({
        code: PlacementErrorCode.WIRE_LENGTH_EXCEEDED,
        message: `Wire length exceeds maximum of ${MAX_WIRE_LENGTH_PER_HUB}ft`,
        affectedComponentIds: [component.id, component.connectedHubId],
      })
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings: [],
  }
}

// ============================================================================
// PORT UTILITIES
// ============================================================================

/** Create ports for a light bar (2 ends) */
export function createLightBarPorts(length: LightBarLength): ConnectionPort[] {
  const halfLength = (length / 12) / 2
  return [
    {
      id: generatePortId(),
      position: { x: -halfLength, y: 0, z: 0 },
      direction: { x: -1, y: 0, z: 0 },
      angle: 180,
      isOccupied: false,
      connectedTo: null,
    },
    {
      id: generatePortId(),
      position: { x: halfLength, y: 0, z: 0 },
      direction: { x: 1, y: 0, z: 0 },
      angle: 0,
      isOccupied: false,
      connectedTo: null,
    },
  ]
}

/** Create ports for a hub (4 directions) */
export function createHubPorts(): ConnectionPort[] {
  const portDistance = 0.2
  return [
    {
      id: generatePortId(),
      position: { x: 0, y: 0, z: -portDistance },
      direction: { x: 0, y: 0, z: -1 },
      angle: 0,
      isOccupied: false,
      connectedTo: null,
    },
    {
      id: generatePortId(),
      position: { x: portDistance, y: 0, z: 0 },
      direction: { x: 1, y: 0, z: 0 },
      angle: 90,
      isOccupied: false,
      connectedTo: null,
    },
    {
      id: generatePortId(),
      position: { x: 0, y: 0, z: portDistance },
      direction: { x: 0, y: 0, z: 1 },
      angle: 180,
      isOccupied: false,
      connectedTo: null,
    },
    {
      id: generatePortId(),
      position: { x: -portDistance, y: 0, z: 0 },
      direction: { x: -1, y: 0, z: 0 },
      angle: 270,
      isOccupied: false,
      connectedTo: null,
    },
  ]
}

/** Create ports for a connector based on its type */
export function createConnectorPorts(angles: number[]): ConnectionPort[] {
  const portDistance = 0.15
  return angles.map((angle) => {
    const radians = (angle * Math.PI) / 180
    return {
      id: generatePortId(),
      position: {
        x: Math.sin(radians) * portDistance,
        y: 0,
        z: -Math.cos(radians) * portDistance,
      },
      direction: {
        x: Math.sin(radians),
        y: 0,
        z: -Math.cos(radians),
      },
      angle,
      isOccupied: false,
      connectedTo: null,
    }
  })
}

// ============================================================================
// ANGLE UTILITIES
// ============================================================================

/** Convert degrees to radians */
export function degreesToRadians(degrees: number): number {
  return (degrees * Math.PI) / 180
}

/** Convert radians to degrees */
export function radiansToDegrees(radians: number): number {
  return (radians * 180) / Math.PI
}

/** Normalize angle to 0-360 range */
export function normalizeAngle(angle: number): number {
  return ((angle % 360) + 360) % 360
}

// ============================================================================
// FORMATTING UTILITIES
// ============================================================================

/** Format wire length for display */
export function formatWireLength(lengthInFeet: number): string {
  return `${lengthInFeet.toFixed(1)}ft`
}

/** Format price for display */
export function formatPrice(price: number): string {
  return `$${price.toFixed(0)}`
}

/** Format percentage for display */
export function formatPercentage(value: number): string {
  return `${Math.round(value)}%`
}
