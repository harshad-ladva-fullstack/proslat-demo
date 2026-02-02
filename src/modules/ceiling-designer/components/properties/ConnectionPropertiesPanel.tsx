/**
 * Connection-Based Properties Panel
 * 
 * Right sidebar showing properties of the selected component.
 * Works with the connection graph store.
 * 
 * KEY FEATURES:
 * - Reads from connection graph store
 * - Shows connection information
 * - Shows group selection info
 * - Shows movement controls
 * - No free rotation (rotation is derived from connections)
 * - Shows measurement data
 */

import { memo } from 'react'
import { 
  Zap, 
  Lightbulb, 
  Cable, 
  Settings, 
  Trash2, 
  Link2, 
  Info,
  AlertTriangle,
  Move,
  Users,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  useConnectionGraphStore,
  useSelectedComponent,
  useMeasurements,
  useCurrentSelection,
  useSelectedComponents,
} from '../../store/connection-graph-store'
import {
  ComponentType,
  isHubComponent,
  isLightBarComponent,
  isConnectorComponent,
  type Component,
  type HubComponent,
  type LightBarComponent,
  type ConnectorComponent,
} from '../../types/connection-graph'
import { SelectionMode } from '../../types/movement'
import { getConnectorSubtypeName } from '../../types/component-factory'
import { RIGHT_SIDEBAR_WIDTH } from '../../constants'

// ============================================================================
// TYPES
// ============================================================================

interface ConnectionPropertiesPanelProps {
  width?: number
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getComponentIcon(type: ComponentType) {
  switch (type) {
    case ComponentType.HUB:
      return <Zap className="size-5 text-blue-500" />
    case ComponentType.LIGHT_BAR:
      return <Lightbulb className="size-5 text-amber-500" />
    case ComponentType.CONNECTOR:
      return <Cable className="size-5 text-emerald-500" />
  }
}

function getComponentTypeName(type: ComponentType): string {
  switch (type) {
    case ComponentType.HUB:
      return 'Hub'
    case ComponentType.LIGHT_BAR:
      return 'Light Bar'
    case ComponentType.CONNECTOR:
      return 'Connector'
  }
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const ConnectionPropertiesPanel = memo(function ConnectionPropertiesPanel({ 
  width = RIGHT_SIDEBAR_WIDTH 
}: ConnectionPropertiesPanelProps) {
  const selectedComponent = useSelectedComponent()
  const currentSelection = useCurrentSelection()
  const selectedComponents = useSelectedComponents()
  const isCompact = width < 200
  const isGroupSelection = currentSelection?.mode === SelectionMode.GROUP

  return (
    <aside
      className="flex flex-col h-full bg-white border-l border-gray-200 shadow-sm overflow-hidden"
      style={{ width }}
    >
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
        <div className="flex items-center gap-2">
          <div className={cn(
            "p-1.5 rounded-lg flex-shrink-0",
            isGroupSelection ? "bg-purple-600" : "bg-gray-900"
          )}>
            {isGroupSelection ? (
              <Users className="size-4 text-white" />
            ) : (
              <Settings className="size-4 text-white" />
            )}
          </div>
          {!isCompact && (
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-gray-900 truncate">
                {isGroupSelection ? 'Group Selected' : 'Properties'}
              </h2>
              <p className="text-xs text-gray-500 truncate">
                {isGroupSelection
                  ? `${selectedComponents.length} components`
                  : selectedComponent
                    ? getComponentTypeName(selectedComponent.type)
                    : 'No selection'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto bg-gray-50/50">
        {isGroupSelection ? (
          <GroupSelectionProperties 
            components={selectedComponents} 
            isCompact={isCompact} 
          />
        ) : selectedComponent ? (
          <SelectedComponentProperties component={selectedComponent} isCompact={isCompact} />
        ) : (
          <EmptyState isCompact={isCompact} />
        )}
      </div>
    </aside>
  )
})

// ============================================================================
// GROUP SELECTION PROPERTIES
// ============================================================================

interface GroupSelectionPropertiesProps {
  components: Component[]
  isCompact: boolean
}

const GroupSelectionProperties = memo(function GroupSelectionProperties({
  components,
  isCompact,
}: GroupSelectionPropertiesProps) {
  const clearSelection = useConnectionGraphStore((state) => state.clearSelection)
  
  // Calculate group stats
  const hubCount = components.filter(c => c.type === ComponentType.HUB).length
  const lightBarCount = components.filter(c => c.type === ComponentType.LIGHT_BAR).length
  const connectorCount = components.filter(c => c.type === ComponentType.CONNECTOR).length
  const totalPrice = components.reduce((sum, c) => sum + c.price, 0)
  const totalWire = components.reduce((sum, c) => sum + c.wireLengthContribution, 0)
  
  return (
    <div className={cn("space-y-4", isCompact ? "p-2" : "p-4")}>
      {/* Group Header */}
      <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
        <div className="flex items-center gap-2 mb-2">
          <Users className="size-5 text-purple-600" />
          <span className="text-sm font-medium text-purple-900">
            {components.length} Components Selected
          </span>
        </div>
        <p className="text-xs text-purple-700">
          Shift+click selected a connected group. You can move all components together.
        </p>
      </div>
      
      {/* Component Breakdown */}
      <div className="bg-white rounded-lg border border-gray-200 p-3">
        <h4 className="text-xs font-medium text-gray-500 uppercase mb-2">Components</h4>
        <div className="space-y-2">
          {hubCount > 0 && (
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Zap className="size-4 text-blue-500" />
                <span className="text-gray-700">Hubs</span>
              </div>
              <span className="font-medium">{hubCount}</span>
            </div>
          )}
          {lightBarCount > 0 && (
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Lightbulb className="size-4 text-amber-500" />
                <span className="text-gray-700">Light Bars</span>
              </div>
              <span className="font-medium">{lightBarCount}</span>
            </div>
          )}
          {connectorCount > 0 && (
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Cable className="size-4 text-emerald-500" />
                <span className="text-gray-700">Connectors</span>
              </div>
              <span className="font-medium">{connectorCount}</span>
            </div>
          )}
        </div>
      </div>
      
      {/* Group Stats */}
      <div className="bg-white rounded-lg border border-gray-200 p-3">
        <h4 className="text-xs font-medium text-gray-500 uppercase mb-2">Group Totals</h4>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Total Wire</span>
            <span className="font-medium">{totalWire}"</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Total Price</span>
            <span className="font-medium text-green-600">${totalPrice}</span>
          </div>
        </div>
      </div>
      
      {/* Movement Info */}
      <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
        <div className="flex items-start gap-2">
          <Move className="size-4 text-blue-600 mt-0.5" />
          <div>
            <p className="text-xs text-blue-800 font-medium">Group Movement</p>
            <p className="text-xs text-blue-700 mt-1">
              Drag any component to move the entire group while preserving connections.
            </p>
          </div>
        </div>
      </div>
      
      {/* Clear Selection Button */}
      <button
        onClick={() => clearSelection()}
        className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
      >
        Clear Selection
      </button>
    </div>
  )
})

// ============================================================================
// EMPTY STATE
// ============================================================================

const EmptyState = memo(function EmptyState({ isCompact = false }: { isCompact?: boolean }) {
  if (isCompact) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 text-center">
        <Lightbulb className="size-6 text-gray-400" />
        <p className="text-[10px] text-gray-500 mt-2">No selection</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center h-full p-6 text-center">
      <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4 shadow-sm">
        <Lightbulb className="size-8 text-gray-400" />
      </div>
      <h3 className="text-sm font-medium text-gray-700 mb-1">No Component Selected</h3>
      <p className="text-xs text-gray-500">
        Click a component on the ceiling to view its properties
      </p>
    </div>
  )
})

// ============================================================================
// SELECTED COMPONENT PROPERTIES
// ============================================================================

interface SelectedComponentPropertiesProps {
  component: Component
  isCompact: boolean
}

const SelectedComponentProperties = memo(function SelectedComponentProperties({ 
  component, 
  isCompact 
}: SelectedComponentPropertiesProps) {
  return (
    <div className={cn("space-y-4", isCompact ? "p-2" : "p-4")}>
      {/* Component Header */}
      <ComponentHeader component={component} />
      
      {/* Connection Info */}
      <ConnectionInfoSection component={component} />
      
      {/* Type-specific sections */}
      {isHubComponent(component) && <HubPropertiesSection component={component} />}
      {isLightBarComponent(component) && <LightBarPropertiesSection component={component} />}
      {isConnectorComponent(component) && <ConnectorPropertiesSection component={component} />}
      
      {/* Position Info (read-only, derived) */}
      <PositionInfoSection component={component} />
      
      {/* Delete Button */}
      <DeleteButton component={component} />
    </div>
  )
})

// ============================================================================
// COMPONENT HEADER
// ============================================================================

const ComponentHeader = memo(function ComponentHeader({ component }: { component: Component }) {
  return (
    <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200">
      <div className="p-2 bg-gray-50 rounded-lg">
        {getComponentIcon(component.type)}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-semibold text-gray-900">
          {getComponentTypeName(component.type)}
        </h3>
        <p className="text-xs text-gray-500 truncate">
          ID: {component.id.slice(0, 12)}...
        </p>
      </div>
      <div className="text-right">
        <span className="text-sm font-medium text-green-600">${component.price}</span>
      </div>
    </div>
  )
})

// ============================================================================
// CONNECTION INFO SECTION
// ============================================================================

const ConnectionInfoSection = memo(function ConnectionInfoSection({ component }: { component: Component }) {
  const occupiedPorts = component.ports.filter(p => p.occupied)
  const freePorts = component.ports.filter(p => !p.occupied)
  
  return (
    <div className="p-3 bg-white rounded-lg border border-gray-200">
      <div className="flex items-center gap-2 mb-3">
        <Link2 className="size-4 text-gray-500" />
        <h4 className="text-sm font-medium text-gray-700">Connections</h4>
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        <div className="text-center p-2 bg-green-50 rounded-lg">
          <div className="text-lg font-bold text-green-600">{occupiedPorts.length}</div>
          <div className="text-xs text-green-700">Connected</div>
        </div>
        <div className="text-center p-2 bg-gray-50 rounded-lg">
          <div className="text-lg font-bold text-gray-600">{freePorts.length}</div>
          <div className="text-xs text-gray-500">Available</div>
        </div>
      </div>
      
      {/* Port list */}
      <div className="mt-3 space-y-1">
        {component.ports.map((port, index) => (
          <div
            key={port.id}
            className={cn(
              "flex items-center justify-between px-2 py-1 rounded text-xs",
              port.occupied ? "bg-green-50 text-green-700" : "bg-gray-50 text-gray-500"
            )}
          >
            <span>Port {index + 1} ({port.direction}°)</span>
            <span>{port.occupied ? '● Connected' : '○ Free'}</span>
          </div>
        ))}
      </div>
    </div>
  )
})

// ============================================================================
// HUB PROPERTIES SECTION
// ============================================================================

const HubPropertiesSection = memo(function HubPropertiesSection({ component }: { component: HubComponent }) {
  const measurements = useMeasurements()
  
  const wireLengthInches = measurements?.totalWireLengthInches || 0
  const maxWireLengthInches = component.maxWireLength
  const utilization = (wireLengthInches / maxWireLengthInches) * 100
  const isOverLimit = wireLengthInches > maxWireLengthInches
  
  return (
    <div className="p-3 bg-white rounded-lg border border-gray-200">
      <div className="flex items-center gap-2 mb-3">
        <Zap className="size-4 text-blue-500" />
        <h4 className="text-sm font-medium text-gray-700">Hub Properties</h4>
      </div>
      
      {component.isRootHub && (
        <div className="mb-3 px-2 py-1 bg-amber-50 text-amber-700 text-xs rounded flex items-center gap-1">
          <span>⭐</span>
          <span>Root Hub (Power Source)</span>
        </div>
      )}
      
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Wire Length Used</span>
          <span className={cn(
            "font-medium",
            isOverLimit ? "text-red-600" : utilization > 70 ? "text-amber-600" : "text-gray-900"
          )}>
            {(wireLengthInches / 12).toFixed(1)}ft / {(maxWireLengthInches / 12).toFixed(0)}ft
          </span>
        </div>
        
        {/* Progress bar */}
        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full transition-all duration-300",
              isOverLimit ? "bg-red-500" : utilization > 70 ? "bg-amber-500" : "bg-blue-500"
            )}
            style={{ width: `${Math.min(utilization, 100)}%` }}
          />
        </div>
        
        {isOverLimit && (
          <div className="flex items-center gap-1 text-xs text-red-600">
            <AlertTriangle className="size-3" />
            <span>Wire length exceeded!</span>
          </div>
        )}
      </div>
    </div>
  )
})

// ============================================================================
// LIGHT BAR PROPERTIES SECTION
// ============================================================================

const LightBarPropertiesSection = memo(function LightBarPropertiesSection({ component }: { component: LightBarComponent }) {
  return (
    <div className="p-3 bg-white rounded-lg border border-gray-200">
      <div className="flex items-center gap-2 mb-3">
        <Lightbulb className="size-4 text-amber-500" />
        <h4 className="text-sm font-medium text-gray-700">Light Bar Properties</h4>
      </div>
      
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">Length</span>
          <span className="font-medium text-gray-900">{component.lengthInches}"</span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-gray-600">Wattage</span>
          <span className="font-medium text-gray-900">{component.watts}W</span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-gray-600">Lumens</span>
          <span className="font-medium text-gray-900">{component.lumens} lm</span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-gray-600">Lighting Mode</span>
          <span className={cn(
            "font-medium px-2 py-0.5 rounded text-xs",
            component.lightingMode === 'rgb' 
              ? "bg-purple-100 text-purple-700" 
              : "bg-gray-100 text-gray-700"
          )}>
            {component.lightingMode === 'rgb' ? 'RGB' : 'White'}
          </span>
        </div>
        
        {component.lightingMode === 'rgb' && (
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Color</span>
            <div className="flex items-center gap-2">
              <div 
                className="w-6 h-6 rounded border border-gray-200" 
                style={{ backgroundColor: component.rgbColor }}
              />
              <span className="font-mono text-xs text-gray-500">{component.rgbColor}</span>
            </div>
          </div>
        )}
        
        <div className="flex justify-between">
          <span className="text-gray-600">Casing</span>
          <span className="font-medium text-gray-900 capitalize">
            {component.casingColor.replace('_', ' ')}
          </span>
        </div>
      </div>
    </div>
  )
})

// ============================================================================
// CONNECTOR PROPERTIES SECTION
// ============================================================================

const ConnectorPropertiesSection = memo(function ConnectorPropertiesSection({ component }: { component: ConnectorComponent }) {
  return (
    <div className="p-3 bg-white rounded-lg border border-gray-200">
      <div className="flex items-center gap-2 mb-3">
        <Cable className="size-4 text-emerald-500" />
        <h4 className="text-sm font-medium text-gray-700">Connector Properties</h4>
      </div>
      
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">Type</span>
          <span className="font-medium text-gray-900">{getConnectorSubtypeName(component.subtype)}</span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-gray-600">Ports</span>
          <span className="font-medium text-gray-900">{component.portCount}</span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-gray-600">Angles</span>
          <span className="font-medium text-gray-900">{component.portAngles.join('°, ')}°</span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-gray-600">Casing</span>
          <span className="font-medium text-gray-900 capitalize">
            {component.casingColor.replace('_', ' ')}
          </span>
        </div>
      </div>
    </div>
  )
})

// ============================================================================
// POSITION INFO SECTION (READ-ONLY)
// ============================================================================

const PositionInfoSection = memo(function PositionInfoSection({ component }: { component: Component }) {
  return (
    <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
      <div className="flex items-center gap-2 mb-3">
        <Info className="size-4 text-gray-400" />
        <h4 className="text-sm font-medium text-gray-500">Position (Derived)</h4>
      </div>
      
      <div className="space-y-1 text-xs text-gray-500 font-mono">
        <div className="flex justify-between">
          <span>X:</span>
          <span>{component.worldPosition.x.toFixed(2)} units</span>
        </div>
        <div className="flex justify-between">
          <span>Z:</span>
          <span>{component.worldPosition.z.toFixed(2)} units</span>
        </div>
        <div className="flex justify-between">
          <span>Rotation:</span>
          <span>{component.worldRotation.toFixed(0)}°</span>
        </div>
      </div>
      
      <p className="mt-2 text-[10px] text-gray-400 italic">
        Position is derived from connections. To move a component, reconnect it to a different port.
      </p>
    </div>
  )
})

// ============================================================================
// DELETE BUTTON
// ============================================================================

const DeleteButton = memo(function DeleteButton({ component }: { component: Component }) {
  const removeComponent = useConnectionGraphStore((state) => state.removeComponent)
  const components = useConnectionGraphStore((state) => state.components)
  
  // Check if component can be deleted
  // Root hub can only be deleted if it's the only component
  // Other components can be deleted if they're leaf nodes (1 or 0 connections)
  const connectedPortCount = component.ports.filter(p => p.occupied).length
  const canDelete = isHubComponent(component) 
    ? (component.isRootHub && components.length === 1) || (!component.isRootHub && connectedPortCount <= 1)
    : connectedPortCount <= 1
  
  const handleDelete = () => {
    if (canDelete) {
      removeComponent(component.id)
    }
  }
  
  return (
    <button
      onClick={handleDelete}
      disabled={!canDelete}
      className={cn(
        "w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors",
        canDelete
          ? "bg-red-50 text-red-600 hover:bg-red-100 border border-red-200"
          : "bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200"
      )}
    >
      <Trash2 className="size-4" />
      {canDelete ? 'Remove Component' : 'Cannot Remove (Connected)'}
    </button>
  )
})

export default ConnectionPropertiesPanel
