/**
 * Ceiling Designer Store
 * 
 * Centralized state management using Zustand.
 * Handles all ceiling designer state including components, connections,
 * selection, drag operations, and canvas settings.
 */

import { create } from 'zustand'
import { devtools, subscribeWithSelector } from 'zustand/middleware'
import type {
  CeilingComponent,
  Connection,
  CatalogItem,
  LightBar,
  Hub,
  Connector,
  Position3D,
  Rotation3D,
  DragState,
  SelectionState,
  CanvasState,
  WireLengthStatus,
  SystemStats,
  SnapTarget,
} from '../types'
import {
  ComponentCategory,
  CasingColor,
  LightingMode,
  CameraView,
  isLightBar,
  isLightBarCatalogItem,
  isHubCatalogItem,
  isConnectorCatalogItem,
  generateComponentId,
  generateConnectionId,
} from '../types'
import {
  createLightBarPorts,
  createHubPorts,
  createConnectorPorts,
  getWireLengthStatus,
  calculateSystemStats,
  validateConnection,
} from '../utils'
import {
  DEFAULT_CASING_COLOR,
  DEFAULT_LIGHTING_MODE,
  MAX_WIRE_LENGTH_PER_HUB,
  CONNECTOR_PORT_CONFIGS,
} from '../constants'

// ============================================================================
// TOAST TYPES
// ============================================================================

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface ToastData {
  id: string
  type: ToastType
  title: string
  message: string
  duration?: number
}

// ============================================================================
// STORE STATE INTERFACE
// ============================================================================

interface CeilingDesignerState {
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
  toasts: ToastData[]
  
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
  addToast: (toast: Omit<ToastData, 'id'>) => void
  removeToast: (id: string) => void
  showConnectionError: (message: string) => void
  showConnectionSuccess: (message: string) => void
  
  // Actions - Properties Panel
  updateSelectedLightingMode: (mode: LightingMode) => void
  updateSelectedCasingColor: (color: CasingColor) => void
  updateSelectedLightColor: (color: string) => void
  updateSelectedAnimationSpeed: (speed: number) => void
  updateSelectedRotation: (rotation: Rotation3D) => void
  applyLightingModeToAll: (mode: LightingMode) => void
  applyCasingColorToAll: (color: CasingColor) => void
  applyLightColorToAll: (color: string) => void
  
  // Actions - Canvas
  setCameraView: (view: CameraView) => void
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
// INITIAL STATE
// ============================================================================

const initialDragState: DragState = {
  isDragging: false,
  draggedComponentId: null,
  draggedCatalogItem: null,
  startPosition: null,
  currentPosition: null,
  snapTarget: null,
}

const initialSelectionState: SelectionState = {
  selectedComponentId: null,
  hoveredComponentId: null,
  multiSelectIds: [],
}

const initialCanvasState: CanvasState = {
  cameraView: CameraView.PERSPECTIVE,
  gridVisible: true,
  snapEnabled: true,
  wireframeMode: false,
  showConnections: true,
}

const initialSystemStats: SystemStats = {
  totalWatts: 0,
  totalLumens: 0,
  totalWireLength: 0,
  componentCount: {
    lightBars: 0,
    hubs: 0,
    connectors: 0,
  },
  estimatedPrice: 0,
}

// ============================================================================
// STORE IMPLEMENTATION
// ============================================================================

export const useCeilingDesignerStore = create<CeilingDesignerState>()(
  devtools(
    subscribeWithSelector((set, get) => ({
      // Initial state
      components: [],
      connections: [],
      selection: initialSelectionState,
      drag: initialDragState,
      canvas: initialCanvasState,
      activeTab: ComponentCategory.LIGHT_BARS,
      systemStats: initialSystemStats,
      toasts: [],
      isDraggingPlacedComponent: false,
      draggedPlacedComponentId: null,

      // ========================================================================
      // COMPONENT ACTIONS
      // ========================================================================

      addComponent: (component) => {
        set(
          (state) => ({
            components: [...state.components, component],
          }),
          false,
          'addComponent'
        )
        get().recalculateStats()
      },

      removeComponent: (id) => {
        const { connections, components } = get()
        
        // Check if component has any connections
        const hasConnections = connections.some(
          (conn) => conn.sourceComponentId === id || conn.targetComponentId === id
        )
        
        if (hasConnections) {
          console.log('Cannot remove component: It has active connections')
          return // Don't remove connected components
        }
        
        // Check if this is a hub with connected components
        const component = components.find(c => c.id === id)
        if (component && component.type === ComponentCategory.HUBS) {
          const hub = component as Hub
          if (hub.connectedComponents && hub.connectedComponents.length > 0) {
            console.log('Cannot remove hub: It has connected components')
            return
          }
        }
        
        set(
          (state) => ({
            components: state.components.filter((c) => c.id !== id),
            connections: state.connections.filter(
              (conn) =>
                conn.sourceComponentId !== id && conn.targetComponentId !== id
            ),
            selection:
              state.selection.selectedComponentId === id
                ? { ...state.selection, selectedComponentId: null }
                : state.selection,
          }),
          false,
          'removeComponent'
        )
        get().recalculateStats()
      },

      updateComponent: (id, updates) => {
        set(
          (state) => ({
            components: state.components.map((c) => {
              if (c.id !== id) return c
              return { ...c, ...updates, updatedAt: Date.now() } as CeilingComponent
            }),
          }),
          false,
          'updateComponent'
        )
        get().recalculateStats()
      },

      clearAllComponents: () => {
        set(
          {
            components: [],
            connections: [],
            selection: initialSelectionState,
            systemStats: initialSystemStats,
          },
          false,
          'clearAllComponents'
        )
      },

      // ========================================================================
      // COMPONENT CREATION
      // ========================================================================

      createComponentFromCatalog: (catalogItem, position) => {
        const now = Date.now()
        const baseComponent = {
          id: generateComponentId(),
          position,
          rotation: { x: 0, y: 0, z: 0 },
          casingColor: DEFAULT_CASING_COLOR,
          isSelected: false,
          isValid: true,
          createdAt: now,
          updatedAt: now,
        }

        let component: CeilingComponent | null = null

        if (isLightBarCatalogItem(catalogItem)) {
          const lightBar: LightBar = {
            ...baseComponent,
            type: ComponentCategory.LIGHT_BARS,
            length: catalogItem.length,
            lightingMode: DEFAULT_LIGHTING_MODE,
            lightColor: '#ff00ff', // Default RGB color (magenta)
            animationSpeed: 1, // Default animation speed
            watts: catalogItem.watts,
            lumens: catalogItem.lumens,
            ports: createLightBarPorts(catalogItem.length),
            connectedHubId: null,
          }
          component = lightBar
        } else if (isHubCatalogItem(catalogItem)) {
          const hub: Hub = {
            ...baseComponent,
            type: ComponentCategory.HUBS,
            maxWireLength: MAX_WIRE_LENGTH_PER_HUB,
            currentWireLength: 0,
            connectedComponents: [],
            ports: createHubPorts(),
            isPowered: true,
          }
          component = hub
        } else if (isConnectorCatalogItem(catalogItem)) {
          const portConfig = CONNECTOR_PORT_CONFIGS[catalogItem.connectorType]
          const connector: Connector = {
            ...baseComponent,
            type: ComponentCategory.CONNECTORS,
            connectorType: catalogItem.connectorType,
            portCount: portConfig.ports,
            maxWireLength: MAX_WIRE_LENGTH_PER_HUB,
            angles: portConfig.angles,
            ports: createConnectorPorts(portConfig.angles),
          }
          component = connector
        }

        if (component) {
          get().addComponent(component)
        }

        return component
      },

      // ========================================================================
      // CONNECTION ACTIONS
      // ========================================================================

      addConnection: (connection) => {
        set(
          (state) => ({
            connections: [...state.connections, connection],
          }),
          false,
          'addConnection'
        )
      },

      removeConnection: (id) => {
        set(
          (state) => ({
            connections: state.connections.filter((c) => c.id !== id),
          }),
          false,
          'removeConnection'
        )
      },

      validateAndConnect: (sourceId, sourcePortId, targetId, targetPortId) => {
        const { components } = get()

        const sourceComponent = components.find((c) => c.id === sourceId)
        const targetComponent = components.find((c) => c.id === targetId)

        if (!sourceComponent || !targetComponent) {
          get().showConnectionError('Components not found')
          return false
        }

        // Validate the connection using the new validation function
        const validation = validateConnection(
          sourceComponent,
          targetComponent,
          sourcePortId,
          targetPortId
        )

        if (!validation.isValid) {
          get().showConnectionError(validation.errorMessage || 'Connection not possible')
          return false
        }

        // Create connection
        const connection: Connection = {
          id: generateConnectionId(),
          sourceComponentId: sourceId,
          sourcePortId,
          targetComponentId: targetId,
          targetPortId,
          wireLength: 0,
          isValid: true,
          validationErrors: [],
        }

        // Update ports (just check existence for validation, we use the ports directly)
        const sourcePortExists = sourceComponent.ports?.some((p) => p.id === sourcePortId)
        const targetPortExists = targetComponent.ports?.some((p) => p.id === targetPortId)
        
        if (!sourcePortExists || !targetPortExists) {
          console.warn('Port not found during connection')
        }

        get().updateComponent(sourceId, {
          ports: sourceComponent.ports?.map((p) =>
            p.id === sourcePortId
              ? { ...p, isOccupied: true, connectedTo: targetId }
              : p
          ),
        } as Partial<CeilingComponent>)

        get().updateComponent(targetId, {
          ports: targetComponent.ports?.map((p) =>
            p.id === targetPortId
              ? { ...p, isOccupied: true, connectedTo: sourceId }
              : p
          ),
        } as Partial<CeilingComponent>)

        get().addConnection(connection)
        get().showConnectionSuccess('Components connected successfully')
        return true
      },

      // ========================================================================
      // SELECTION ACTIONS
      // ========================================================================

      selectComponent: (id) => {
        set(
          (state) => ({
            selection: {
              ...state.selection,
              selectedComponentId: id,
              multiSelectIds: [],
            },
            components: state.components.map((c) => ({
              ...c,
              isSelected: c.id === id,
            }) as CeilingComponent),
          }),
          false,
          'selectComponent'
        )
      },

      hoverComponent: (id) => {
        set(
          (state) => ({
            selection: {
              ...state.selection,
              hoveredComponentId: id,
            },
          }),
          false,
          'hoverComponent'
        )
      },

      toggleMultiSelect: (id) => {
        set(
          (state) => {
            const isSelected = state.selection.multiSelectIds.includes(id)
            return {
              selection: {
                ...state.selection,
                multiSelectIds: isSelected
                  ? state.selection.multiSelectIds.filter((i) => i !== id)
                  : [...state.selection.multiSelectIds, id],
              },
            }
          },
          false,
          'toggleMultiSelect'
        )
      },

      clearSelection: () => {
        set(
          (state) => ({
            selection: initialSelectionState,
            components: state.components.map((c) => ({
              ...c,
              isSelected: false,
            }) as CeilingComponent),
          }),
          false,
          'clearSelection'
        )
      },

      // ========================================================================
      // DRAG & DROP ACTIONS
      // ========================================================================

      startDrag: (catalogItem) => {
        set(
          {
            drag: {
              ...initialDragState,
              isDragging: true,
              draggedCatalogItem: catalogItem,
            },
          },
          false,
          'startDrag'
        )
      },

      updateDragPosition: (position) => {
        set(
          (state) => ({
            drag: {
              ...state.drag,
              currentPosition: position,
            },
          }),
          false,
          'updateDragPosition'
        )
      },

      setSnapTarget: (target) => {
        set(
          (state) => ({
            drag: {
              ...state.drag,
              snapTarget: target,
            },
          }),
          false,
          'setSnapTarget'
        )
      },

      endDrag: (dropPosition) => {
        const { drag, components } = get()
        
        if (dropPosition && drag.draggedCatalogItem) {
          // Check if this is a hub (can be placed freely as root) or needs a valid snap target
          const isHub = isHubCatalogItem(drag.draggedCatalogItem)
          const hasExistingHub = components.some(c => c.type === ComponentCategory.HUBS)
          
          // Hubs can be placed freely only if no hub exists yet (root hub)
          // All other components MUST have a valid snap target (connection point)
          if (isHub && !hasExistingHub) {
            // Allow root hub placement anywhere
            const finalPosition = drag.snapTarget?.position || dropPosition
            get().createComponentFromCatalog(drag.draggedCatalogItem, finalPosition)
          } else if (drag.snapTarget?.isValid) {
            // Component has a valid connection point
            const finalPosition = drag.snapTarget.position
            get().createComponentFromCatalog(drag.draggedCatalogItem, finalPosition)
          } else {
            // No valid connection - don't place the component
            console.log('Cannot place component: No valid connection point')
          }
        }

        set({ drag: initialDragState }, false, 'endDrag')
      },

      cancelDrag: () => {
        set({ drag: initialDragState }, false, 'cancelDrag')
      },

      // ========================================================================
      // PLACED COMPONENT DRAGGING ACTIONS
      // ========================================================================

      startDragPlacedComponent: (componentId) => {
        set(
          {
            isDraggingPlacedComponent: true,
            draggedPlacedComponentId: componentId,
          },
          false,
          'startDragPlacedComponent'
        )
        // Also select the component being dragged
        get().selectComponent(componentId)
      },

      updatePlacedComponentPosition: (position) => {
        const { draggedPlacedComponentId, isDraggingPlacedComponent } = get()
        
        if (!isDraggingPlacedComponent || !draggedPlacedComponentId) return
        
        get().updateComponent(draggedPlacedComponentId, { position })
      },

      endDragPlacedComponent: (finalPosition) => {
        const { draggedPlacedComponentId, isDraggingPlacedComponent } = get()
        
        if (isDraggingPlacedComponent && draggedPlacedComponentId && finalPosition) {
          get().updateComponent(draggedPlacedComponentId, { position: finalPosition })
        }

        set(
          {
            isDraggingPlacedComponent: false,
            draggedPlacedComponentId: null,
          },
          false,
          'endDragPlacedComponent'
        )
      },

      cancelDragPlacedComponent: () => {
        set(
          {
            isDraggingPlacedComponent: false,
            draggedPlacedComponentId: null,
          },
          false,
          'cancelDragPlacedComponent'
        )
      },

      // ========================================================================
      // TOAST NOTIFICATION ACTIONS
      // ========================================================================

      addToast: (toast) => {
        const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        set(
          (state) => ({
            toasts: [...state.toasts, { ...toast, id }],
          }),
          false,
          'addToast'
        )
      },

      removeToast: (id) => {
        set(
          (state) => ({
            toasts: state.toasts.filter((t) => t.id !== id),
          }),
          false,
          'removeToast'
        )
      },

      showConnectionError: (message) => {
        get().addToast({
          type: 'error',
          title: 'Connection Not Possible',
          message,
          duration: 4000,
        })
      },

      showConnectionSuccess: (message) => {
        get().addToast({
          type: 'success',
          title: 'Connected',
          message,
          duration: 3000,
        })
      },

      // ========================================================================
      // PROPERTIES PANEL ACTIONS
      // ========================================================================

      updateSelectedLightingMode: (mode) => {
        const { selection, components } = get()
        if (!selection.selectedComponentId) return

        const component = components.find(
          (c) => c.id === selection.selectedComponentId
        )
        if (component && isLightBar(component)) {
          get().updateComponent(component.id, { lightingMode: mode } as Partial<CeilingComponent>)
        }
      },

      updateSelectedCasingColor: (color) => {
        const { selection } = get()
        if (!selection.selectedComponentId) return
        get().updateComponent(selection.selectedComponentId, { casingColor: color })
      },

      applyLightingModeToAll: (mode) => {
        const { components } = get()
        components.forEach((component) => {
          if (isLightBar(component)) {
            get().updateComponent(component.id, { lightingMode: mode } as Partial<CeilingComponent>)
          }
        })
      },

      applyCasingColorToAll: (color) => {
        const { components } = get()
        components.forEach((component) => {
          get().updateComponent(component.id, { casingColor: color })
        })
      },

      updateSelectedLightColor: (color) => {
        const { selection, components } = get()
        if (!selection.selectedComponentId) return

        const component = components.find(
          (c) => c.id === selection.selectedComponentId
        )
        if (component && isLightBar(component)) {
          get().updateComponent(component.id, { lightColor: color } as Partial<CeilingComponent>)
        }
      },

      updateSelectedAnimationSpeed: (speed) => {
        const { selection, components } = get()
        if (!selection.selectedComponentId) return

        const component = components.find(
          (c) => c.id === selection.selectedComponentId
        )
        if (component && isLightBar(component)) {
          get().updateComponent(component.id, { animationSpeed: speed } as Partial<CeilingComponent>)
        }
      },

      applyLightColorToAll: (color) => {
        const { components } = get()
        components.forEach((component) => {
          if (isLightBar(component) && component.lightingMode === LightingMode.RGB) {
            get().updateComponent(component.id, { lightColor: color } as Partial<CeilingComponent>)
          }
        })
      },

      updateSelectedRotation: (rotation) => {
        const { selection } = get()
        if (!selection.selectedComponentId) return
        get().updateComponent(selection.selectedComponentId, { rotation })
      },

      // ========================================================================
      // CANVAS ACTIONS
      // ========================================================================

      setCameraView: (view) => {
        set(
          (state) => ({
            canvas: { ...state.canvas, cameraView: view },
          }),
          false,
          'setCameraView'
        )
      },

      toggleGrid: () => {
        set(
          (state) => ({
            canvas: { ...state.canvas, gridVisible: !state.canvas.gridVisible },
          }),
          false,
          'toggleGrid'
        )
      },

      toggleSnap: () => {
        set(
          (state) => ({
            canvas: { ...state.canvas, snapEnabled: !state.canvas.snapEnabled },
          }),
          false,
          'toggleSnap'
        )
      },

      toggleWireframe: () => {
        set(
          (state) => ({
            canvas: { ...state.canvas, wireframeMode: !state.canvas.wireframeMode },
          }),
          false,
          'toggleWireframe'
        )
      },

      toggleShowConnections: () => {
        set(
          (state) => ({
            canvas: {
              ...state.canvas,
              showConnections: !state.canvas.showConnections,
            },
          }),
          false,
          'toggleShowConnections'
        )
      },

      // ========================================================================
      // SIDEBAR ACTIONS
      // ========================================================================

      setActiveTab: (tab) => {
        set({ activeTab: tab }, false, 'setActiveTab')
      },

      // ========================================================================
      // GETTERS
      // ========================================================================

      getSelectedComponent: () => {
        const { selection, components } = get()
        if (!selection.selectedComponentId) return null
        return components.find((c) => c.id === selection.selectedComponentId) || null
      },

      getWireLengthStatus: (hubId) => {
        const { components } = get()
        return getWireLengthStatus(components, hubId)
      },

      getComponentById: (id) => {
        return get().components.find((c) => c.id === id)
      },

      getConnectedComponents: (componentId) => {
        const { components, connections } = get()
        const connectedIds = connections
          .filter(
            (conn) =>
              conn.sourceComponentId === componentId ||
              conn.targetComponentId === componentId
          )
          .flatMap((conn) => [conn.sourceComponentId, conn.targetComponentId])
          .filter((id) => id !== componentId)

        return components.filter((c) => connectedIds.includes(c.id))
      },

      // ========================================================================
      // STATS RECALCULATION
      // ========================================================================

      recalculateStats: () => {
        const { components } = get()
        const stats = calculateSystemStats(components)
        set({ systemStats: stats }, false, 'recalculateStats')
      },
    })),
    { name: 'ceiling-designer' }
  )
)

// ============================================================================
// SELECTOR HOOKS
// ============================================================================

/** Select only components array */
export const useComponents = () =>
  useCeilingDesignerStore((state) => state.components)

/** Select only connections array */
export const useConnections = () =>
  useCeilingDesignerStore((state) => state.connections)

/** Select only selection state */
export const useSelection = () =>
  useCeilingDesignerStore((state) => state.selection)

/** Select only drag state */
export const useDrag = () =>
  useCeilingDesignerStore((state) => state.drag)

/** Select only canvas state */
export const useCanvas = () =>
  useCeilingDesignerStore((state) => state.canvas)

/** Select system stats */
export const useSystemStats = () =>
  useCeilingDesignerStore((state) => state.systemStats)

/** Select active tab */
export const useActiveTab = () =>
  useCeilingDesignerStore((state) => state.activeTab)
/** Select toasts */
export const useToasts = () =>
  useCeilingDesignerStore((state) => state.toasts)

/** Select placed component dragging state */
export const usePlacedComponentDrag = () =>
  useCeilingDesignerStore((state) => ({
    isDragging: state.isDraggingPlacedComponent,
    componentId: state.draggedPlacedComponentId,
  }))

// ============================================================================
// RE-EXPORTS: Connection Graph Store (new constraint-driven system)
// ============================================================================

export { 
  useConnectionGraphStore,
  useComponents as useConnectionGraphComponents,
  useConnections as useConnectionGraphConnections,
  useRootHub,
  useIsDragging,
  useSnapTargets,
  useActiveSnapTarget,
  usePlacementValidation,
  useSelectedComponent,
  useMeasurements,
} from './connection-graph-store'