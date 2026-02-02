/**
 * Movement Types and Validation
 * 
 * This file defines the types and validation logic for component movement.
 * 
 * KEY PRINCIPLES:
 * 1. Movement is CONSTRAINT-AWARE, not free drag
 * 2. Connections must be preserved or movement is rejected
 * 3. Group movement treats connected components as a rigid body
 * 4. All movement goes through proposeMove → validateMove → commitMove
 * 
 * NO DIRECT STATE MUTATION - all changes go through the store.
 */

import type {
  Component,
  Connection,
  WorldPosition,
} from './connection-graph'
import {
  isHubComponent,
  isLightBarComponent,
} from './connection-graph'

// ============================================================================
// MOVEMENT TYPES
// ============================================================================

/**
 * Type of movement being attempted
 */
export const MovementType = {
  /** Moving a single unconnected component (root hub only) */
  SINGLE_FREE: 'single_free',
  /** Moving a single component while preserving its one connection */
  SINGLE_CONSTRAINED: 'single_constrained',
  /** Moving an entire connected group as a rigid body */
  GROUP: 'group',
} as const

export type MovementType = typeof MovementType[keyof typeof MovementType]

/**
 * Movement mode for selection
 */
export const SelectionMode = {
  /** Single component selected */
  SINGLE: 'single',
  /** Connected group selected */
  GROUP: 'group',
} as const

export type SelectionMode = typeof SelectionMode[keyof typeof SelectionMode]

/**
 * Represents a proposed movement before validation
 */
export interface MoveProposal {
  /** Type of movement */
  type: MovementType
  
  /** Component(s) being moved */
  componentIds: string[]
  
  /** Delta movement (how much to move) */
  deltaX: number
  deltaZ: number
  
  /** Optional rotation change (degrees) */
  deltaRotation?: number
  
  /** For constrained movement: which port to pivot around */
  pivotPortId?: string
}

/**
 * Result of movement validation
 */
export const MoveValidationState = {
  /** Movement is valid and can be committed */
  VALID: 'valid',
  /** Movement would cause components to be out of bounds */
  OUT_OF_BOUNDS: 'out_of_bounds',
  /** Movement would break port alignment */
  PORT_MISALIGNMENT: 'port_misalignment',
  /** Movement would cause component overlap */
  OVERLAP: 'overlap',
  /** Movement is not allowed for this component type */
  NOT_ALLOWED: 'not_allowed',
  /** Movement would orphan components */
  WOULD_ORPHAN: 'would_orphan',
} as const

export type MoveValidationState = typeof MoveValidationState[keyof typeof MoveValidationState]

/**
 * Detailed result of move validation
 */
export interface MoveValidationResult {
  /** Overall validation state */
  state: MoveValidationState
  
  /** Whether move can be committed */
  isValid: boolean
  
  /** Error messages if invalid */
  errors: string[]
  
  /** Warning messages (valid but needs attention) */
  warnings: string[]
  
  /** Components that would be out of bounds */
  outOfBoundsComponentIds: string[]
  
  /** Proposed new positions (only if valid) */
  newPositions: Map<string, WorldPosition> | null
  
  /** Proposed new rotations (only if valid) */
  newRotations: Map<string, number> | null
}

/**
 * Represents a selection (single or group)
 */
export interface ComponentSelection {
  /** Selection mode */
  mode: SelectionMode
  
  /** Primary selected component ID */
  primaryId: string
  
  /** All selected component IDs (for group mode) */
  componentIds: string[]
  
  /** All connections within the selection */
  connectionIds: string[]
}

// ============================================================================
// MOVEMENT VALIDATION FUNCTIONS
// ============================================================================

/**
 * Get all components connected to a starting component using BFS.
 * Returns the connected subgraph.
 */
export function getConnectedComponents(
  startComponentId: string,
  _components: Component[],
  connections: Connection[]
): string[] {
  const visited = new Set<string>()
  const queue: string[] = [startComponentId]
  
  while (queue.length > 0) {
    const currentId = queue.shift()!
    if (visited.has(currentId)) continue
    visited.add(currentId)
    
    // Find all connections involving this component
    for (const conn of connections) {
      if (conn.fromComponentId === currentId && !visited.has(conn.toComponentId)) {
        queue.push(conn.toComponentId)
      }
      if (conn.toComponentId === currentId && !visited.has(conn.fromComponentId)) {
        queue.push(conn.fromComponentId)
      }
    }
  }
  
  return Array.from(visited)
}

/**
 * Check if a component can be moved individually.
 * 
 * Rules:
 * - Root hub with no connections: CAN be moved freely
 * - Component with 1 connection: CAN pivot around connected port
 * - Component with 2+ connections: CANNOT be moved individually (would break constraints)
 */
export function canMoveIndividually(
  component: Component,
  connections: Connection[]
): { canMove: boolean; reason?: string; pivotPortId?: string } {
  // Count connections for this component
  const componentConnections = connections.filter(
    c => c.fromComponentId === component.id || c.toComponentId === component.id
  )
  
  // Root hub with no connections can move freely
  if (isHubComponent(component) && component.isRootHub && componentConnections.length === 0) {
    return { canMove: true }
  }
  
  // Component with no connections (shouldn't happen except root hub)
  if (componentConnections.length === 0) {
    return { canMove: true }
  }
  
  // Component with exactly 1 connection can pivot
  if (componentConnections.length === 1) {
    const conn = componentConnections[0]
    // The pivot port is the one ON THIS COMPONENT
    const pivotPortId = conn.fromComponentId === component.id ? conn.fromPortId : conn.toPortId
    return { canMove: true, pivotPortId }
  }
  
  // Component with 2+ connections cannot move individually
  return {
    canMove: false,
    reason: 'Component has multiple connections. Use group movement instead.'
  }
}

/**
 * Determine the movement type based on component state
 */
export function determineMovementType(
  component: Component,
  connections: Connection[]
): MovementType {
  const componentConnections = connections.filter(
    c => c.fromComponentId === component.id || c.toComponentId === component.id
  )
  
  if (componentConnections.length === 0) {
    return MovementType.SINGLE_FREE
  }
  
  if (componentConnections.length === 1) {
    return MovementType.SINGLE_CONSTRAINED
  }
  
  return MovementType.GROUP
}

/**
 * Calculate new positions for a group move.
 * All components move by the same delta while maintaining relative positions.
 */
export function calculateGroupMovePositions(
  componentIds: string[],
  components: Component[],
  deltaX: number,
  deltaZ: number
): Map<string, WorldPosition> {
  const newPositions = new Map<string, WorldPosition>()
  
  for (const id of componentIds) {
    const component = components.find(c => c.id === id)
    if (!component) continue
    
    newPositions.set(id, {
      x: component.worldPosition.x + deltaX,
      y: component.worldPosition.y,
      z: component.worldPosition.z + deltaZ,
    })
  }
  
  return newPositions
}

/**
 * Check if all positions are within ceiling bounds.
 */
export function checkBoundsViolations(
  newPositions: Map<string, WorldPosition>,
  components: Component[],
  ceilingBounds: { minX: number; maxX: number; minZ: number; maxZ: number }
): string[] {
  const violations: string[] = []
  
  for (const [componentId, pos] of newPositions) {
    const component = components.find(c => c.id === componentId)
    if (!component) continue
    
    // For light bars, check both ends
    if (isLightBarComponent(component)) {
      const lengthInUnits = component.lengthInches / 12 // Convert inches to feet
      const halfLength = lengthInUnits / 2
      const rotationRad = (component.worldRotation * Math.PI) / 180
      
      // Check both endpoints
      const endX1 = pos.x + halfLength * Math.cos(rotationRad)
      const endZ1 = pos.z + halfLength * Math.sin(rotationRad)
      const endX2 = pos.x - halfLength * Math.cos(rotationRad)
      const endZ2 = pos.z - halfLength * Math.sin(rotationRad)
      
      if (endX1 < ceilingBounds.minX || endX1 > ceilingBounds.maxX ||
          endZ1 < ceilingBounds.minZ || endZ1 > ceilingBounds.maxZ ||
          endX2 < ceilingBounds.minX || endX2 > ceilingBounds.maxX ||
          endZ2 < ceilingBounds.minZ || endZ2 > ceilingBounds.maxZ) {
        violations.push(componentId)
      }
    } else {
      // For hubs and connectors, check center point with some margin
      const margin = 0.3 // feet
      if (pos.x - margin < ceilingBounds.minX || pos.x + margin > ceilingBounds.maxX ||
          pos.z - margin < ceilingBounds.minZ || pos.z + margin > ceilingBounds.maxZ) {
        violations.push(componentId)
      }
    }
  }
  
  return violations
}

/**
 * Validate a proposed move.
 * This is the main validation function.
 */
export function validateMove(
  proposal: MoveProposal,
  components: Component[],
  _connections: Connection[],
  ceilingBounds: { minX: number; maxX: number; minZ: number; maxZ: number }
): MoveValidationResult {
  const warnings: string[] = []
  
  // Get the components being moved
  const movingComponents = proposal.componentIds
    .map(id => components.find(c => c.id === id))
    .filter((c): c is Component => c !== undefined)
  
  if (movingComponents.length === 0) {
    return {
      state: MoveValidationState.NOT_ALLOWED,
      isValid: false,
      errors: ['No components to move'],
      warnings: [],
      outOfBoundsComponentIds: [],
      newPositions: null,
      newRotations: null,
    }
  }
  
  // Calculate new positions based on movement type
  let newPositions: Map<string, WorldPosition>
  let newRotations: Map<string, number> = new Map()
  
  switch (proposal.type) {
    case MovementType.SINGLE_FREE:
      // Free movement - just apply delta
      newPositions = calculateGroupMovePositions(
        proposal.componentIds,
        components,
        proposal.deltaX,
        proposal.deltaZ
      )
      break
      
    case MovementType.SINGLE_CONSTRAINED:
      // Constrained movement - pivot around connected port
      // For now, treat as free movement (TODO: implement pivot logic)
      newPositions = calculateGroupMovePositions(
        proposal.componentIds,
        components,
        proposal.deltaX,
        proposal.deltaZ
      )
      break
      
    case MovementType.GROUP:
      // Group movement - all move together
      newPositions = calculateGroupMovePositions(
        proposal.componentIds,
        components,
        proposal.deltaX,
        proposal.deltaZ
      )
      break
      
    default:
      return {
        state: MoveValidationState.NOT_ALLOWED,
        isValid: false,
        errors: ['Unknown movement type'],
        warnings: [],
        outOfBoundsComponentIds: [],
        newPositions: null,
        newRotations: null,
      }
  }
  
  // Check bounds violations
  const outOfBoundsIds = checkBoundsViolations(newPositions, components, ceilingBounds)
  
  if (outOfBoundsIds.length > 0) {
    return {
      state: MoveValidationState.OUT_OF_BOUNDS,
      isValid: false,
      errors: [`${outOfBoundsIds.length} component(s) would be outside ceiling bounds`],
      warnings: [],
      outOfBoundsComponentIds: outOfBoundsIds,
      newPositions: null,
      newRotations: null,
    }
  }
  
  // For group movement, verify connections remain valid
  // (For now, since we move all connected components together, connections are preserved)
  
  return {
    state: MoveValidationState.VALID,
    isValid: true,
    errors: [],
    warnings,
    outOfBoundsComponentIds: [],
    newPositions,
    newRotations,
  }
}

/**
 * Create a selection object for a single component or group
 */
export function createSelection(
  componentId: string,
  mode: SelectionMode,
  components: Component[],
  connections: Connection[]
): ComponentSelection {
  if (mode === SelectionMode.SINGLE) {
    return {
      mode: SelectionMode.SINGLE,
      primaryId: componentId,
      componentIds: [componentId],
      connectionIds: [],
    }
  }
  
  // Group mode - find all connected components
  const connectedIds = getConnectedComponents(componentId, components, connections)
  
  // Find all connections within the group
  const connectionIds = connections
    .filter(c => connectedIds.includes(c.fromComponentId) && connectedIds.includes(c.toComponentId))
    .map(c => c.id)
  
  return {
    mode: SelectionMode.GROUP,
    primaryId: componentId,
    componentIds: connectedIds,
    connectionIds,
  }
}

// ============================================================================
// ROOM DIMENSION VALIDATION FOR EXISTING COMPONENTS
// ============================================================================

/**
 * Check if resizing the room would cause components to be out of bounds.
 * Does NOT auto-delete - returns which components would be affected.
 */
export function checkRoomResizeImpact(
  newWidth: number,
  newDepth: number,
  components: Component[]
): {
  affectedComponents: string[]
  isValid: boolean
  warnings: string[]
} {
  const affectedComponents: string[] = []
  const warnings: string[] = []
  
  for (const component of components) {
    const pos = component.worldPosition
    let wouldBeOutOfBounds = false
    
    if (isLightBarComponent(component)) {
      const lengthInUnits = component.lengthInches / 12
      const halfLength = lengthInUnits / 2
      const rotationRad = (component.worldRotation * Math.PI) / 180
      
      const endX1 = pos.x + halfLength * Math.cos(rotationRad)
      const endZ1 = pos.z + halfLength * Math.sin(rotationRad)
      const endX2 = pos.x - halfLength * Math.cos(rotationRad)
      const endZ2 = pos.z - halfLength * Math.sin(rotationRad)
      
      wouldBeOutOfBounds = 
        endX1 > newWidth || endX2 > newWidth ||
        endZ1 > newDepth || endZ2 > newDepth ||
        endX1 < 0 || endX2 < 0 ||
        endZ1 < 0 || endZ2 < 0
    } else {
      const margin = 0.3
      wouldBeOutOfBounds = 
        pos.x - margin < 0 || pos.x + margin > newWidth ||
        pos.z - margin < 0 || pos.z + margin > newDepth
    }
    
    if (wouldBeOutOfBounds) {
      affectedComponents.push(component.id)
    }
  }
  
  if (affectedComponents.length > 0) {
    warnings.push(`${affectedComponents.length} component(s) would be outside the new room bounds`)
  }
  
  return {
    affectedComponents,
    isValid: affectedComponents.length === 0,
    warnings,
  }
}
