/**
 * Connection Graph Store
 * 
 * Core state management for the constraint-driven ceiling configurator.
 * 
 * KEY PRINCIPLES:
 * 1. The connection graph is the source of truth
 * 2. Component positions are DERIVED from connections
 * 3. No component can exist without a valid connection (except root hub)
 * 4. All mutations must maintain graph integrity
 */

import { create } from 'zustand'
import { devtools, subscribeWithSelector } from 'zustand/middleware'
import { useShallow } from 'zustand/react/shallow'
import {
  ComponentType,
  ValidationState,
  PlacementError,
  type Component,
  type HubComponent,
  type Connection,
  type Port,
  type WorldPosition,
  type PlacementValidationResult,
  type SnapTarget,
  type SystemMeasurements,
  type LightBarMeasurement,
  isHubComponent,
  isLightBarComponent,
} from '../types/connection-graph'
import {
  type MoveProposal,
  type MoveValidationResult,
  type ComponentSelection,
  SelectionMode,
  MovementType,
  validateMove,
  createSelection,
  getConnectedComponents,
  canMoveIndividually,
  determineMovementType,
  checkRoomResizeImpact,
} from '../types/movement'
import {
  createHubComponent,
  createLightBarComponent,
  createConnectorComponent,
  generateConnectionId,
  type ConnectorSubtype,
} from '../types/component-factory'

// ============================================================================
// CONSTANTS
// ============================================================================

/** Maximum wire length per hub in inches (36 feet) */
const MAX_WIRE_LENGTH_INCHES = 36 * 12 // 432 inches

/** Ceiling height in 3D units */
const CEILING_HEIGHT = 10

/** Conversion factor: inches to 3D units (1 foot = 1 unit) */
const INCHES_TO_3D_UNITS = 1 / 12

/**
 * Default ceiling bounds (used when room is not connected yet).
 * In production, these should come from RoomContext.
 * 
 * TODO: Remove this once room integration is complete.
 */
const DEFAULT_CEILING_BOUNDS = {
  minX: 0,
  maxX: 20, // 20 feet default
  minZ: 0,
  maxZ: 20, // 20 feet default
}

// ============================================================================
// STORE STATE INTERFACE
// ============================================================================

interface CeilingBounds {
  minX: number
  maxX: number
  minZ: number
  maxZ: number
}

interface ConnectionGraphState {
  // ===== ROOM BOUNDS (from Room) =====
  
  /** 
   * Ceiling bounds from the room.
   * All placement is constrained to these bounds.
   * 
   * CONSTRAINT: Components cannot be placed outside these bounds.
   */
  ceilingBounds: CeilingBounds
  
  /**
   * Set ceiling bounds from room.
   * This MUST be called when room data is available.
   */
  setCeilingBounds: (bounds: CeilingBounds) => void
  
  /**
   * Check if a position is within ceiling bounds.
   */
  isWithinCeilingBounds: (x: number, z: number) => boolean
  
  // ===== CORE DATA (using arrays for stable references) =====
  
  /** All components as array */
  components: Component[]
  
  /** All connections as array */
  connections: Connection[]
  
  /** Root hub ID (null if no hub placed yet) */
  rootHubId: string | null
  
  // ===== DRAG & PLACEMENT STATE =====
  
  /** Currently dragging a component from sidebar */
  isDragging: boolean
  
  /** Type of component being dragged */
  draggedComponentType: ComponentType | null
  
  /** For light bars: the length being dragged */
  draggedLightBarLength: 18 | 36 | null
  
  /** For connectors: the subtype being dragged */
  draggedConnectorSubtype: ConnectorSubtype | null
  
  /** Current snap targets (valid ports to connect to) */
  snapTargets: SnapTarget[]
  
  /** Currently highlighted snap target */
  activeSnapTarget: SnapTarget | null
  
  /** Current validation result for placement */
  placementValidation: PlacementValidationResult | null
  
  // ===== SELECTION STATE =====
  
  /** Currently selected component ID */
  selectedComponentId: string | null
  
  /** Currently hovered component ID */
  hoveredComponentId: string | null
  
  /** Current selection (includes group info) */
  currentSelection: ComponentSelection | null
  
  // ===== MOVEMENT STATE =====
  
  /** Is a component currently being moved (not placed from sidebar) */
  isMoving: boolean
  
  /** Current movement validation result */
  moveValidation: MoveValidationResult | null
  
  /** Preview positions during movement */
  movePreviewPositions: Map<string, WorldPosition> | null
  
  // ===== SYSTEM STATS =====
  
  /** Cached system measurements */
  measurements: SystemMeasurements | null
  
  // ===== ACTIONS =====
  
  // Component Actions
  placeRootHub: (position: WorldPosition) => HubComponent | null
  connectComponent: (
    targetPortId: string,
    newComponent: Component,
    newComponentPortIndex: number
  ) => boolean
  removeComponent: (componentId: string) => boolean
  
  // Drag Actions
  startDrag: (
    type: ComponentType,
    lightBarLength?: 18 | 36,
    connectorSubtype?: ConnectorSubtype
  ) => void
  updateDragPosition: (worldPosition: WorldPosition) => void
  endDrag: () => void
  cancelDrag: () => void
  
  // Selection Actions
  selectComponent: (id: string | null) => void
  selectGroup: (id: string) => void
  hoverComponent: (id: string | null) => void
  clearSelection: () => void
  
  // Movement Actions
  startMove: (componentId: string, isGroupMove?: boolean) => boolean
  updateMovePreview: (deltaX: number, deltaZ: number) => void
  commitMove: () => boolean
  cancelMove: () => void
  
  /** Check if a component can be moved */
  canMove: (componentId: string) => { canMove: boolean; type: MovementType; reason?: string }
  
  /** Get connected components for a given component */
  getConnectedComponentIds: (componentId: string) => string[]
  
  /** Check impact of room resize on existing components */
  checkResizeImpact: (newWidth: number, newDepth: number) => {
    affectedComponents: string[]
    isValid: boolean
    warnings: string[]
  }
  
  // Validation Actions
  validatePlacement: (targetPortId: string, componentType: ComponentType) => PlacementValidationResult
  
  // Query Actions
  getComponent: (id: string) => Component | undefined
  getPort: (portId: string) => { port: Port; component: Component } | undefined
  getPortWorldPosition: (portId: string) => WorldPosition | null
  getFreePorts: () => Array<{ port: Port; component: Component }>
  getFreePortsForComponent: (componentId: string) => Port[]
  
  // Calculation Actions
  recalculateMeasurements: () => void
  calculateTotalWireLength: () => number
  
  // Reset
  clearAll: () => void
}

// ============================================================================
// GEOMETRY DERIVATION HELPERS
// ============================================================================

/**
 * Calculate the world position of a port given its parent component's transform.
 */
function calculatePortWorldPosition(
  port: Port,
  componentPosition: WorldPosition,
  componentRotation: number // degrees
): WorldPosition {
  // Convert local position from inches to 3D units
  const localX = port.localPosition.x * INCHES_TO_3D_UNITS
  const localZ = port.localPosition.z * INCHES_TO_3D_UNITS
  
  // Rotate local position by component rotation
  const rotationRad = (componentRotation * Math.PI) / 180
  const cos = Math.cos(rotationRad)
  const sin = Math.sin(rotationRad)
  
  const worldX = componentPosition.x + (localX * cos - localZ * sin)
  const worldZ = componentPosition.z + (localX * sin + localZ * cos)
  
  return {
    x: worldX,
    y: componentPosition.y,
    z: worldZ,
  }
}

/**
 * Calculate the world direction of a port given its parent component's rotation.
 */
function calculatePortWorldDirection(
  portDirection: number,
  componentRotation: number
): number {
  return (portDirection + componentRotation) % 360
}

/**
 * Given a target port and a connecting port, derive the new component's position and rotation.
 * 
 * The new component is positioned so that its connecting port aligns with the target port.
 * Ports must face opposite directions (differ by 180°) when connected.
 */
function deriveComponentTransform(
  targetPortWorldPosition: WorldPosition,
  targetPortWorldDirection: number,
  newComponentPort: Port,
  _newComponent: Component // Unused but kept for API consistency
): { position: WorldPosition; rotation: number } {
  // The new component's rotation is set so its port faces opposite to the target port
  // Target port direction + 180° = new component's port direction in world space
  // newComponentPort.direction + rotation = targetPortWorldDirection + 180
  const rotation = (targetPortWorldDirection + 180 - newComponentPort.direction + 360) % 360
  
  // Calculate the offset from new component center to its port in world space
  const localX = newComponentPort.localPosition.x * INCHES_TO_3D_UNITS
  const localZ = newComponentPort.localPosition.z * INCHES_TO_3D_UNITS
  
  const rotationRad = (rotation * Math.PI) / 180
  const cos = Math.cos(rotationRad)
  const sin = Math.sin(rotationRad)
  
  const portOffsetX = localX * cos - localZ * sin
  const portOffsetZ = localX * sin + localZ * cos
  
  // New component center = target port position - port offset
  const position: WorldPosition = {
    x: targetPortWorldPosition.x - portOffsetX,
    y: targetPortWorldPosition.y,
    z: targetPortWorldPosition.z - portOffsetZ,
  }
  
  return { position, rotation }
}

/**
 * Check if two port directions are compatible for connection.
 * Ports must face opposite directions (differ by ~180°).
 * 
 * @internal Used internally for validation
 */
function _areDirectionsCompatible(dir1: number, dir2: number): boolean {
  const diff = Math.abs(((dir1 - dir2 + 540) % 360) - 180)
  // Allow 15 degree tolerance
  return diff <= 15
}

// Export for testing
export const __internal = {
  areDirectionsCompatible: _areDirectionsCompatible,
}

// ============================================================================
// STORE IMPLEMENTATION
// ============================================================================

export const useConnectionGraphStore = create<ConnectionGraphState>()(
  devtools(
    subscribeWithSelector((set, get) => ({
      // ===== ROOM BOUNDS STATE =====
      
      /**
       * Ceiling bounds - initialized with defaults.
       * MUST be updated when room is loaded via setCeilingBounds().
       */
      ceilingBounds: DEFAULT_CEILING_BOUNDS,
      
      /**
       * Set ceiling bounds from room data.
       * Called by RoomCeilingDesignPage when room is loaded.
       */
      setCeilingBounds: (bounds: CeilingBounds) => {
        set({ ceilingBounds: bounds }, false, 'setCeilingBounds')
      },
      
      /**
       * Check if position is within ceiling bounds.
       * Used for placement validation.
       */
      isWithinCeilingBounds: (x: number, z: number) => {
        const { ceilingBounds } = get()
        return (
          x >= ceilingBounds.minX &&
          x <= ceilingBounds.maxX &&
          z >= ceilingBounds.minZ &&
          z <= ceilingBounds.maxZ
        )
      },
      
      // ===== CORE DATA STATE (using arrays for stable references) =====
      components: [],
      connections: [],
      rootHubId: null,
      
      isDragging: false,
      draggedComponentType: null,
      draggedLightBarLength: null,
      draggedConnectorSubtype: null,
      snapTargets: [],
      activeSnapTarget: null,
      placementValidation: null,
      
      selectedComponentId: null,
      hoveredComponentId: null,
      currentSelection: null,
      
      // Movement state
      isMoving: false,
      moveValidation: null,
      movePreviewPositions: null,
      
      measurements: null,

      // ========================================================================
      // PLACE ROOT HUB
      // ========================================================================
      
      /**
       * Place the root hub - the ONLY component that can be placed without a connection.
       * Returns the created hub or null if placement fails.
       * 
       * CONSTRAINT: Position must be within ceiling bounds.
       */
      placeRootHub: (position: WorldPosition) => {
        const { rootHubId, isWithinCeilingBounds, ceilingBounds } = get()
        
        // Rule: Only one root hub allowed
        if (rootHubId !== null) {
          console.warn('Root hub already exists. Cannot place another.')
          return null
        }
        
        // CONSTRAINT: Check ceiling bounds
        if (!isWithinCeilingBounds(position.x, position.z)) {
          console.warn(`Hub position (${position.x}, ${position.z}) is outside ceiling bounds [${ceilingBounds.minX}-${ceilingBounds.maxX}, ${ceilingBounds.minZ}-${ceilingBounds.maxZ}]`)
          return null
        }
        
        const hub = createHubComponent(true, position, 0)
        
        set((state) => ({
          components: [...state.components, hub],
          rootHubId: hub.id,
        }), false, 'placeRootHub')
        
        get().recalculateMeasurements()
        
        return hub
      },

      // ========================================================================
      // CONNECT COMPONENT
      // ========================================================================
      
      /**
       * Connect a new component to an existing port.
       * This is the ONLY way to add components (except root hub).
       * 
       * @param targetPortId - The port ID on an existing component to connect to
       * @param newComponent - The new component to add
       * @param newComponentPortIndex - Which port on the new component to use for connection
       * @returns true if connection successful, false otherwise
       */
      connectComponent: (targetPortId, newComponent, newComponentPortIndex) => {
        const state = get()
        
        // Find the target port
        let targetPort: Port | undefined
        let targetComponent: Component | undefined
        
        for (const comp of state.components) {
          const port = comp.ports.find(p => p.id === targetPortId)
          if (port) {
            targetPort = port
            targetComponent = comp
            break
          }
        }
        
        if (!targetPort || !targetComponent) {
          console.error('Target port not found')
          return false
        }
        
        // Validate: port must not be occupied
        if (targetPort.occupied) {
          console.error('Target port is already occupied')
          return false
        }
        
        // Validate: new component port exists
        const newComponentPort = newComponent.ports[newComponentPortIndex]
        if (!newComponentPort) {
          console.error('New component port not found at index', newComponentPortIndex)
          return false
        }
        
        // Calculate target port world position and direction
        const targetPortWorldPos = calculatePortWorldPosition(
          targetPort,
          targetComponent.worldPosition,
          targetComponent.worldRotation
        )
        const targetPortWorldDir = calculatePortWorldDirection(
          targetPort.direction,
          targetComponent.worldRotation
        )
        
        // Derive new component's position and rotation
        const { position, rotation } = deriveComponentTransform(
          targetPortWorldPos,
          targetPortWorldDir,
          newComponentPort,
          newComponent
        )
        
        // Update new component with derived transform
        const updatedNewComponent = {
          ...newComponent,
          worldPosition: position,
          worldRotation: rotation,
        } as Component
        
        // Update port IDs after component creation
        updatedNewComponent.ports = updatedNewComponent.ports.map(p => ({
          ...p,
          parentComponentId: updatedNewComponent.id,
        }))
        
        // Mark ports as occupied
        const updatedNewComponentPort = {
          ...updatedNewComponent.ports[newComponentPortIndex],
          occupied: true,
          connectedToPortId: targetPort.id,
        }
        updatedNewComponent.ports[newComponentPortIndex] = updatedNewComponentPort
        
        // Create the connection
        const connection: Connection = {
          id: generateConnectionId(),
          fromPortId: targetPort.id,
          fromComponentId: targetComponent.id,
          toPortId: updatedNewComponentPort.id,
          toComponentId: updatedNewComponent.id,
          wireLength: 0, // Will be calculated
          createdAt: Date.now(),
        }
        
        // Update state atomically
        set((state) => {
          // Update target component's port
          const updatedComponents = state.components.map(comp => {
            if (comp.id === targetComponent!.id) {
              return {
                ...comp,
                ports: comp.ports.map(p =>
                  p.id === targetPort!.id
                    ? { ...p, occupied: true, connectedToPortId: updatedNewComponentPort.id }
                    : p
                ),
              } as Component
            }
            return comp
          })
          
          return {
            components: [...updatedComponents, updatedNewComponent],
            connections: [...state.connections, connection],
          }
        }, false, 'connectComponent')
        
        get().recalculateMeasurements()
        
        return true
      },

      // ========================================================================
      // REMOVE COMPONENT
      // ========================================================================
      
      /**
       * Remove a component from the graph.
       * Only allowed if removing doesn't orphan other components.
       */
      removeComponent: (componentId) => {
        const state = get()
        const component = state.components.find(c => c.id === componentId)
        
        if (!component) {
          console.error('Component not found')
          return false
        }
        
        // Cannot remove root hub if other components exist
        if (componentId === state.rootHubId && state.components.length > 1) {
          console.error('Cannot remove root hub while other components exist')
          return false
        }
        
        // Find all connections involving this component
        const connectionsToRemove: string[] = []
        const portsToFree: Array<{ componentId: string; portId: string }> = []
        
        for (const conn of state.connections) {
          if (conn.fromComponentId === componentId || conn.toComponentId === componentId) {
            connectionsToRemove.push(conn.id)
            
            // Mark the other port as free
            if (conn.fromComponentId === componentId) {
              portsToFree.push({ componentId: conn.toComponentId, portId: conn.toPortId })
            } else {
              portsToFree.push({ componentId: conn.fromComponentId, portId: conn.fromPortId })
            }
          }
        }
        
        // TODO: Check if removing would orphan components (for now, allow leaf removal only)
        // For now, only allow removing components with at most 1 connection (leaf nodes)
        if (connectionsToRemove.length > 1 && !isHubComponent(component)) {
          console.error('Cannot remove non-leaf component (would orphan other components)')
          return false
        }
        
        set((state) => {
          // Remove component and free ports on other components
          const updatedComponents = state.components
            .filter(c => c.id !== componentId)
            .map(comp => {
              const portToFree = portsToFree.find(p => p.componentId === comp.id)
              if (portToFree) {
                return {
                  ...comp,
                  ports: comp.ports.map(p =>
                    p.id === portToFree.portId
                      ? { ...p, occupied: false, connectedToPortId: null }
                      : p
                  ),
                } as Component
              }
              return comp
            })
          
          // Remove connections
          const updatedConnections = state.connections.filter(
            c => !connectionsToRemove.includes(c.id)
          )
          
          return {
            components: updatedComponents,
            connections: updatedConnections,
            rootHubId: componentId === state.rootHubId ? null : state.rootHubId,
            selectedComponentId: componentId === state.selectedComponentId ? null : state.selectedComponentId,
          }
        }, false, 'removeComponent')
        
        get().recalculateMeasurements()
        
        return true
      },

      // ========================================================================
      // DRAG ACTIONS
      // ========================================================================
      
      startDrag: (type, lightBarLength, connectorSubtype) => {
        const state = get()
        
        // Calculate available snap targets
        const snapTargets: SnapTarget[] = []
        
        // If no root hub, only hub can be placed (and only one)
        if (state.rootHubId === null) {
          if (type !== ComponentType.HUB) {
            // No valid targets - must place hub first
            set({
              isDragging: true,
              draggedComponentType: type,
              draggedLightBarLength: lightBarLength || null,
              draggedConnectorSubtype: connectorSubtype || null,
              snapTargets: [],
              activeSnapTarget: null,
              placementValidation: {
                state: ValidationState.INVALID,
                errors: [PlacementError.NO_ROOT_HUB],
                errorMessages: ['You must place a Hub first before adding other components.'],
                suggestedPortId: null,
                derivedPosition: null,
                derivedRotation: null,
              },
            }, false, 'startDrag')
            return
          }
          
          // Hub can be placed anywhere on ceiling - no snap targets needed
          set({
            isDragging: true,
            draggedComponentType: type,
            draggedLightBarLength: null,
            draggedConnectorSubtype: null,
            snapTargets: [],
            activeSnapTarget: null,
            placementValidation: null,
          }, false, 'startDrag')
          return
        }
        
        // Find all free ports that this component type can connect to
        for (const comp of state.components) {
          for (const port of comp.ports) {
            if (port.occupied) continue
            
            // Check type compatibility
            // All component types can connect to all port types in this system
            // (Light bars, connectors, and hubs can all interconnect)
            
            const portWorldPos = calculatePortWorldPosition(
              port,
              comp.worldPosition,
              comp.worldRotation
            )
            const portWorldDir = calculatePortWorldDirection(
              port.direction,
              comp.worldRotation
            )
            
            snapTargets.push({
              componentId: comp.id,
              portId: port.id,
              portWorldPosition: portWorldPos,
              portDirection: portWorldDir,
              isValid: true,
              invalidReason: null,
            })
          }
        }
        
        set({
          isDragging: true,
          draggedComponentType: type,
          draggedLightBarLength: lightBarLength || null,
          draggedConnectorSubtype: connectorSubtype || null,
          snapTargets,
          activeSnapTarget: null,
          placementValidation: snapTargets.length > 0 ? null : {
            state: ValidationState.INVALID,
            errors: [PlacementError.NO_COMPATIBLE_PORT],
            errorMessages: ['No free ports available. Remove a component or add a connector.'],
            suggestedPortId: null,
            derivedPosition: null,
            derivedRotation: null,
          },
        }, false, 'startDrag')
      },
      
      updateDragPosition: (worldPosition) => {
        const state = get()
        
        if (!state.isDragging || state.draggedComponentType === null) return
        
        // For hub placement (when no root hub exists)
        if (state.rootHubId === null && state.draggedComponentType === ComponentType.HUB) {
          set({
            activeSnapTarget: {
              componentId: 'ceiling',
              portId: 'free_placement',
              portWorldPosition: worldPosition,
              portDirection: 0,
              isValid: true,
              invalidReason: null,
            },
            placementValidation: {
              state: ValidationState.VALID,
              errors: [],
              errorMessages: [],
              suggestedPortId: null,
              derivedPosition: worldPosition,
              derivedRotation: 0,
            },
          }, false, 'updateDragPosition')
          return
        }
        
        // Find nearest snap target
        let nearestTarget: SnapTarget | null = null
        let nearestDistance = Infinity
        const SNAP_THRESHOLD = 1.5 // 3D units
        
        for (const target of state.snapTargets) {
          const dx = target.portWorldPosition.x - worldPosition.x
          const dz = target.portWorldPosition.z - worldPosition.z
          const distance = Math.sqrt(dx * dx + dz * dz)
          
          if (distance < SNAP_THRESHOLD && distance < nearestDistance) {
            nearestDistance = distance
            nearestTarget = target
          }
        }
        
        if (nearestTarget) {
          // Calculate derived position for preview
          const validation = get().validatePlacement(nearestTarget.portId, state.draggedComponentType)
          
          set({
            activeSnapTarget: nearestTarget,
            placementValidation: validation,
          }, false, 'updateDragPosition')
        } else {
          set({
            activeSnapTarget: null,
            placementValidation: {
              state: ValidationState.INVALID,
              errors: [PlacementError.NO_COMPATIBLE_PORT],
              errorMessages: ['Move closer to a highlighted port to connect.'],
              suggestedPortId: null,
              derivedPosition: null,
              derivedRotation: null,
            },
          }, false, 'updateDragPosition')
        }
      },
      
      endDrag: () => {
        const state = get()
        
        if (!state.isDragging || state.draggedComponentType === null) {
          set({
            isDragging: false,
            draggedComponentType: null,
            draggedLightBarLength: null,
            draggedConnectorSubtype: null,
            snapTargets: [],
            activeSnapTarget: null,
            placementValidation: null,
          }, false, 'endDrag')
          return
        }
        
        // Check if valid placement
        if (state.placementValidation?.state !== ValidationState.VALID) {
          // Invalid placement - cancel
          get().cancelDrag()
          return
        }
        
        // Handle root hub placement
        if (state.rootHubId === null && state.draggedComponentType === ComponentType.HUB) {
          const position = state.placementValidation.derivedPosition || { x: 0, y: CEILING_HEIGHT, z: 0 }
          get().placeRootHub(position)
          
          set({
            isDragging: false,
            draggedComponentType: null,
            draggedLightBarLength: null,
            draggedConnectorSubtype: null,
            snapTargets: [],
            activeSnapTarget: null,
            placementValidation: null,
          }, false, 'endDrag')
          return
        }
        
        // Handle component connection
        if (state.activeSnapTarget && state.placementValidation?.suggestedPortId) {
          let newComponent: Component
          
          switch (state.draggedComponentType) {
            case ComponentType.LIGHT_BAR:
              newComponent = createLightBarComponent(state.draggedLightBarLength || 36)
              break
            
            case ComponentType.CONNECTOR:
              if (!state.draggedConnectorSubtype) {
                console.error('Connector subtype not specified')
                get().cancelDrag()
                return
              }
              newComponent = createConnectorComponent(state.draggedConnectorSubtype)
              break
            
            case ComponentType.HUB:
              newComponent = createHubComponent(false)
              break
            
            default:
              get().cancelDrag()
              return
          }
          
          // Connect using port 0 of the new component
          get().connectComponent(state.activeSnapTarget.portId, newComponent, 0)
        }
        
        set({
          isDragging: false,
          draggedComponentType: null,
          draggedLightBarLength: null,
          draggedConnectorSubtype: null,
          snapTargets: [],
          activeSnapTarget: null,
          placementValidation: null,
        }, false, 'endDrag')
      },
      
      cancelDrag: () => {
        set({
          isDragging: false,
          draggedComponentType: null,
          draggedLightBarLength: null,
          draggedConnectorSubtype: null,
          snapTargets: [],
          activeSnapTarget: null,
          placementValidation: null,
        }, false, 'cancelDrag')
      },

      // ========================================================================
      // SELECTION ACTIONS
      // ========================================================================
      
      selectComponent: (id) => {
        if (!id) {
          set({ 
            selectedComponentId: null, 
            currentSelection: null 
          }, false, 'selectComponent')
          return
        }
        
        const state = get()
        const selection = createSelection(id, SelectionMode.SINGLE, state.components, state.connections)
        
        set({ 
          selectedComponentId: id,
          currentSelection: selection,
        }, false, 'selectComponent')
      },
      
      selectGroup: (id) => {
        const state = get()
        const selection = createSelection(id, SelectionMode.GROUP, state.components, state.connections)
        
        set({
          selectedComponentId: id,
          currentSelection: selection,
        }, false, 'selectGroup')
      },
      
      hoverComponent: (id) => {
        set({ hoveredComponentId: id }, false, 'hoverComponent')
      },
      
      clearSelection: () => {
        set({
          selectedComponentId: null,
          currentSelection: null,
          isMoving: false,
          moveValidation: null,
          movePreviewPositions: null,
        }, false, 'clearSelection')
      },

      // ========================================================================
      // MOVEMENT ACTIONS
      // ========================================================================
      
      /**
       * Check if a component can be moved.
       */
      canMove: (componentId: string) => {
        const state = get()
        const component = state.components.find(c => c.id === componentId)
        
        if (!component) {
          return { canMove: false, type: MovementType.SINGLE_FREE, reason: 'Component not found' }
        }
        
        const moveCheck = canMoveIndividually(component, state.connections)
        const moveType = determineMovementType(component, state.connections)
        
        return {
          canMove: moveCheck.canMove || moveType === MovementType.GROUP,
          type: moveType,
          reason: moveCheck.reason,
        }
      },
      
      /**
       * Get all connected component IDs for a component.
       */
      getConnectedComponentIds: (componentId: string) => {
        const state = get()
        return getConnectedComponents(componentId, state.components, state.connections)
      },
      
      /**
       * Start moving component(s).
       */
      startMove: (componentId: string, isGroupMove = false) => {
        const state = get()
        const component = state.components.find(c => c.id === componentId)
        
        if (!component) {
          console.error('Component not found for move')
          return false
        }
        
        // Create selection based on move type
        const selection = isGroupMove
          ? createSelection(componentId, SelectionMode.GROUP, state.components, state.connections)
          : createSelection(componentId, SelectionMode.SINGLE, state.components, state.connections)
        
        // Check if individual move is allowed
        if (!isGroupMove) {
          const moveCheck = canMoveIndividually(component, state.connections)
          if (!moveCheck.canMove) {
            console.warn('Cannot move individually:', moveCheck.reason)
            return false
          }
        }
        
        set({
          selectedComponentId: componentId,
          currentSelection: selection,
          isMoving: true,
          moveValidation: null,
          movePreviewPositions: null,
        }, false, 'startMove')
        
        return true
      },
      
      /**
       * Update movement preview with proposed delta.
       */
      updateMovePreview: (deltaX: number, deltaZ: number) => {
        const state = get()
        
        if (!state.isMoving || !state.currentSelection) {
          return
        }
        
        // Create move proposal
        const proposal: MoveProposal = {
          type: state.currentSelection.mode === SelectionMode.GROUP 
            ? MovementType.GROUP 
            : MovementType.SINGLE_FREE,
          componentIds: state.currentSelection.componentIds,
          deltaX,
          deltaZ,
        }
        
        // Validate the move
        const validation = validateMove(
          proposal,
          state.components,
          state.connections,
          state.ceilingBounds
        )
        
        set({
          moveValidation: validation,
          movePreviewPositions: validation.newPositions,
        }, false, 'updateMovePreview')
      },
      
      /**
       * Commit the current movement.
       */
      commitMove: () => {
        const state = get()
        
        if (!state.isMoving || !state.moveValidation || !state.movePreviewPositions) {
          console.warn('No valid move to commit')
          return false
        }
        
        if (!state.moveValidation.isValid) {
          console.warn('Cannot commit invalid move:', state.moveValidation.errors)
          return false
        }
        
        // Apply the new positions
        set((s) => ({
          components: s.components.map(comp => {
            const newPos = state.movePreviewPositions!.get(comp.id)
            if (newPos) {
              return {
                ...comp,
                worldPosition: newPos,
                updatedAt: Date.now(),
              } as Component
            }
            return comp
          }),
          isMoving: false,
          moveValidation: null,
          movePreviewPositions: null,
        }), false, 'commitMove')
        
        get().recalculateMeasurements()
        
        return true
      },
      
      /**
       * Cancel the current movement.
       */
      cancelMove: () => {
        set({
          isMoving: false,
          moveValidation: null,
          movePreviewPositions: null,
        }, false, 'cancelMove')
      },
      
      /**
       * Check impact of room resize on existing components.
       */
      checkResizeImpact: (newWidth: number, newDepth: number) => {
        const state = get()
        return checkRoomResizeImpact(newWidth, newDepth, state.components)
      },

      // ========================================================================
      // VALIDATION ACTIONS
      // ========================================================================
      
      validatePlacement: (targetPortId, componentType) => {
        const state = get()
        
        // Find target port and component
        let targetPort: Port | undefined
        let targetComponent: Component | undefined
        
        for (const comp of state.components) {
          const port = comp.ports.find(p => p.id === targetPortId)
          if (port) {
            targetPort = port
            targetComponent = comp
            break
          }
        }
        
        if (!targetPort || !targetComponent) {
          return {
            state: ValidationState.INVALID,
            errors: [PlacementError.NO_COMPATIBLE_PORT],
            errorMessages: ['Target port not found.'],
            suggestedPortId: null,
            derivedPosition: null,
            derivedRotation: null,
          }
        }
        
        // Check if port is occupied
        if (targetPort.occupied) {
          return {
            state: ValidationState.INVALID,
            errors: [PlacementError.PORT_OCCUPIED],
            errorMessages: ['This port is already connected.'],
            suggestedPortId: null,
            derivedPosition: null,
            derivedRotation: null,
          }
        }
        
        // Calculate where the new component would be positioned
        const targetPortWorldPos = calculatePortWorldPosition(
          targetPort,
          targetComponent.worldPosition,
          targetComponent.worldRotation
        )
        const targetPortWorldDir = calculatePortWorldDirection(
          targetPort.direction,
          targetComponent.worldRotation
        )
        
        // Create a temporary component to calculate derived transform
        let tempComponent: Component
        switch (componentType) {
          case ComponentType.LIGHT_BAR:
            tempComponent = createLightBarComponent(state.draggedLightBarLength || 36)
            break
          case ComponentType.CONNECTOR:
            tempComponent = createConnectorComponent(state.draggedConnectorSubtype || 'elbow_90' as ConnectorSubtype)
            break
          case ComponentType.HUB:
            tempComponent = createHubComponent(false)
            break
          default:
            return {
              state: ValidationState.INVALID,
              errors: [PlacementError.INCOMPATIBLE_TYPES],
              errorMessages: ['Unknown component type.'],
              suggestedPortId: null,
              derivedPosition: null,
              derivedRotation: null,
            }
        }
        
        const { position, rotation } = deriveComponentTransform(
          targetPortWorldPos,
          targetPortWorldDir,
          tempComponent.ports[0], // Use port 0 for connection
          tempComponent
        )
        
        // Check wire length limit for light bars
        if (componentType === ComponentType.LIGHT_BAR) {
          const currentWireLength = get().calculateTotalWireLength()
          const newWireLength = currentWireLength + (state.draggedLightBarLength || 36)
          
          if (newWireLength > MAX_WIRE_LENGTH_INCHES) {
            return {
              state: ValidationState.INVALID,
              errors: [PlacementError.WIRE_LENGTH_EXCEEDED],
              errorMessages: [`Adding this light bar would exceed the ${MAX_WIRE_LENGTH_INCHES / 12}ft maximum wire length.`],
              suggestedPortId: tempComponent.ports[0].id,
              derivedPosition: position,
              derivedRotation: rotation,
            }
          }
        }
        
        return {
          state: ValidationState.VALID,
          errors: [],
          errorMessages: [],
          suggestedPortId: tempComponent.ports[0].id,
          derivedPosition: position,
          derivedRotation: rotation,
        }
      },

      // ========================================================================
      // QUERY ACTIONS
      // ========================================================================
      
      getComponent: (id) => {
        return get().components.find(c => c.id === id)
      },
      
      getPort: (portId) => {
        for (const comp of get().components) {
          const port = comp.ports.find(p => p.id === portId)
          if (port) return { port, component: comp }
        }
        return undefined
      },
      
      getPortWorldPosition: (portId) => {
        for (const comp of get().components) {
          const port = comp.ports.find(p => p.id === portId)
          if (port) {
            return calculatePortWorldPosition(port, comp.worldPosition, comp.worldRotation)
          }
        }
        return null
      },
      
      getFreePorts: () => {
        const freePorts: Array<{ port: Port; component: Component }> = []
        for (const comp of get().components) {
          for (const port of comp.ports) {
            if (!port.occupied) {
              freePorts.push({ port, component: comp })
            }
          }
        }
        return freePorts
      },
      
      getFreePortsForComponent: (componentId) => {
        const comp = get().components.find(c => c.id === componentId)
        if (!comp) return []
        return comp.ports.filter(p => !p.occupied)
      },

      // ========================================================================
      // CALCULATION ACTIONS
      // ========================================================================
      
      recalculateMeasurements: () => {
        const state = get()
        
        let totalWireLengthInches = 0
        const lightBarMeasurements: LightBarMeasurement[] = []
        
        let minX = Infinity, maxX = -Infinity
        let minZ = Infinity, maxZ = -Infinity
        
        for (const comp of state.components) {
          // Update bounding box
          if (comp.worldPosition.x < minX) minX = comp.worldPosition.x
          if (comp.worldPosition.x > maxX) maxX = comp.worldPosition.x
          if (comp.worldPosition.z < minZ) minZ = comp.worldPosition.z
          if (comp.worldPosition.z > maxZ) maxZ = comp.worldPosition.z
          
          if (isLightBarComponent(comp)) {
            totalWireLengthInches += comp.lengthInches
            
            // Calculate port world positions
            const port0WorldPos = calculatePortWorldPosition(
              comp.ports[0],
              comp.worldPosition,
              comp.worldRotation
            )
            const port1WorldPos = calculatePortWorldPosition(
              comp.ports[1],
              comp.worldPosition,
              comp.worldRotation
            )
            
            // Calculate spans
            const horizontalSpan = Math.abs(port1WorldPos.x - port0WorldPos.x) * 12 // Convert back to inches
            const verticalSpan = Math.abs(port1WorldPos.z - port0WorldPos.z) * 12
            
            lightBarMeasurements.push({
              componentId: comp.id,
              lengthInches: comp.lengthInches,
              horizontalSpan,
              verticalSpan,
              startPosition: port0WorldPos,
              endPosition: port1WorldPos,
            })
          }
        }
        
        // Handle empty system
        if (state.components.length === 0) {
          minX = maxX = minZ = maxZ = 0
        }
        
        const measurements: SystemMeasurements = {
          totalWireLengthInches,
          totalWireLengthFeet: totalWireLengthInches / 12,
          maxWireLengthInches: MAX_WIRE_LENGTH_INCHES,
          wireLengthUtilization: (totalWireLengthInches / MAX_WIRE_LENGTH_INCHES) * 100,
          isOverLimit: totalWireLengthInches > MAX_WIRE_LENGTH_INCHES,
          lightBarMeasurements,
          boundingBox: {
            minX,
            maxX,
            minZ,
            maxZ,
            width: (maxX - minX) * 12, // inches
            depth: (maxZ - minZ) * 12, // inches
          },
        }
        
        set({ measurements }, false, 'recalculateMeasurements')
      },
      
      calculateTotalWireLength: () => {
        let total = 0
        for (const comp of get().components) {
          if (isLightBarComponent(comp)) {
            total += comp.lengthInches
          }
        }
        return total
      },

      // ========================================================================
      // RESET
      // ========================================================================
      
      clearAll: () => {
        set({
          components: [],
          connections: [],
          rootHubId: null,
          isDragging: false,
          draggedComponentType: null,
          draggedLightBarLength: null,
          draggedConnectorSubtype: null,
          snapTargets: [],
          activeSnapTarget: null,
          placementValidation: null,
          selectedComponentId: null,
          hoveredComponentId: null,
          currentSelection: null,
          isMoving: false,
          moveValidation: null,
          movePreviewPositions: null,
          measurements: null,
        }, false, 'clearAll')
      },
    })),
    { name: 'connection-graph' }
  )
)

// ============================================================================
// SELECTOR HOOKS
// ============================================================================

export const useComponents = () =>
  useConnectionGraphStore((state) => state.components)

export const useConnections = () =>
  useConnectionGraphStore((state) => state.connections)

export const useRootHub = () => {
  const rootHubId = useConnectionGraphStore((state) => state.rootHubId)
  const components = useConnectionGraphStore((state) => state.components)
  if (!rootHubId) return undefined
  return components.find(c => c.id === rootHubId) as HubComponent | undefined
}

export const useIsDragging = () =>
  useConnectionGraphStore((state) => state.isDragging)

export const useSnapTargets = () =>
  useConnectionGraphStore((state) => state.snapTargets)

export const useActiveSnapTarget = () =>
  useConnectionGraphStore((state) => state.activeSnapTarget)

export const usePlacementValidation = () =>
  useConnectionGraphStore((state) => state.placementValidation)

export const useSelectedComponent = () => {
  const selectedComponentId = useConnectionGraphStore((state) => state.selectedComponentId)
  const components = useConnectionGraphStore((state) => state.components)
  if (!selectedComponentId) return undefined
  return components.find(c => c.id === selectedComponentId)
}

export const useMeasurements = () =>
  useConnectionGraphStore((state) => state.measurements)

// Movement-related selectors
export const useCurrentSelection = () =>
  useConnectionGraphStore((state) => state.currentSelection)

export const useIsMoving = () =>
  useConnectionGraphStore((state) => state.isMoving)

export const useMoveValidation = () =>
  useConnectionGraphStore((state) => state.moveValidation)

export const useMovePreviewPositions = () =>
  useConnectionGraphStore((state) => state.movePreviewPositions)

export const useSelectedComponents = () =>
  useConnectionGraphStore(
    useShallow((state) => {
      if (!state.currentSelection) return []
      return state.currentSelection.componentIds
        .map(id => state.components.find(c => c.id === id))
        .filter((c): c is Component => c !== undefined)
    })
  )
