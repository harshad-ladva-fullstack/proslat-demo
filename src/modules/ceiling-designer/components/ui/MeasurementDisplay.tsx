/**
 * Measurement Display Component
 * 
 * Shows live measurements for the ceiling configuration:
 * - Individual light bar lengths (in inches)
 * - Horizontal and vertical spans
 * - Total wire length
 * - Wire length utilization
 * 
 * Measurements are DERIVED from the connection graph, not user input.
 */

import { memo, useMemo } from 'react'
import { Html, Line } from '@react-three/drei'
import {
  useMeasurements,
  useConnectionGraphStore,
  useComponents,
} from '../../store/connection-graph-store'
import {
  isLightBarComponent,
  type LightBarComponent,
} from '../../types/connection-graph'

// ============================================================================
// CONSTANTS
// ============================================================================

const INCHES_TO_3D_UNITS = 1 / 12

// ============================================================================
// INDIVIDUAL LIGHT BAR MEASUREMENT
// ============================================================================

interface LightBarMeasurementDisplayProps {
  component: LightBarComponent
}

const LightBarMeasurementDisplay = memo(function LightBarMeasurementDisplay({
  component,
}: LightBarMeasurementDisplayProps) {
  const selectedId = useConnectionGraphStore((state) => state.selectedComponentId)
  const isSelected = selectedId === component.id
  
  // Only show detailed measurements when selected
  if (!isSelected) return null
  
  const position = component.worldPosition
  const rotationY = (component.worldRotation * Math.PI) / 180
  const lengthInUnits = component.lengthInches * INCHES_TO_3D_UNITS
  
  // Calculate end positions
  const halfLength = lengthInUnits / 2
  const cos = Math.cos(rotationY)
  const sin = Math.sin(rotationY)
  
  const startPos: [number, number, number] = [
    position.x - halfLength * cos,
    position.y - 0.15,
    position.z - halfLength * sin,
  ]
  
  const endPos: [number, number, number] = [
    position.x + halfLength * cos,
    position.y - 0.15,
    position.z + halfLength * sin,
  ]
  
  // Calculate horizontal and vertical components
  const horizontalSpan = Math.abs(endPos[0] - startPos[0]) * 12 // inches
  const verticalSpan = Math.abs(endPos[2] - startPos[2]) * 12 // inches
  
  return (
    <group>
      {/* Length measurement line */}
      <Line
        points={[startPos, endPos]}
        color="#3b82f6"
        lineWidth={2}
        dashed
        dashScale={10}
        dashSize={0.1}
        gapSize={0.05}
      />
      
      {/* Length label */}
      <Html
        position={[position.x, position.y - 0.25, position.z]}
        center
        style={{
          background: 'rgba(59, 130, 246, 0.9)',
          padding: '4px 8px',
          borderRadius: '4px',
          color: 'white',
          fontSize: '12px',
          fontWeight: 'bold',
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
        }}
      >
        {component.lengthInches}"
      </Html>
      
      {/* Show horizontal span if rotated */}
      {horizontalSpan > 1 && Math.abs(rotationY % Math.PI) > 0.1 && (
        <Html
          position={[(startPos[0] + endPos[0]) / 2, position.y - 0.35, startPos[2]]}
          center
          style={{
            background: 'rgba(107, 114, 128, 0.8)',
            padding: '2px 6px',
            borderRadius: '3px',
            color: 'white',
            fontSize: '10px',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
          }}
        >
          H: {horizontalSpan.toFixed(1)}"
        </Html>
      )}
      
      {/* Show vertical span if rotated */}
      {verticalSpan > 1 && Math.abs(rotationY % Math.PI) > 0.1 && (
        <Html
          position={[startPos[0], position.y - 0.35, (startPos[2] + endPos[2]) / 2]}
          center
          style={{
            background: 'rgba(107, 114, 128, 0.8)',
            padding: '2px 6px',
            borderRadius: '3px',
            color: 'white',
            fontSize: '10px',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
          }}
        >
          V: {verticalSpan.toFixed(1)}"
        </Html>
      )}
      
      {/* End markers */}
      <mesh position={startPos}>
        <sphereGeometry args={[0.03, 8, 8]} />
        <meshBasicMaterial color="#3b82f6" />
      </mesh>
      <mesh position={endPos}>
        <sphereGeometry args={[0.03, 8, 8]} />
        <meshBasicMaterial color="#3b82f6" />
      </mesh>
    </group>
  )
})

// ============================================================================
// WIRE LENGTH STATUS DISPLAY
// ============================================================================

interface WireLengthStatusDisplayProps {
  compact?: boolean
}

export const WireLengthStatusDisplay = memo(function WireLengthStatusDisplay({ 
  compact = false 
}: WireLengthStatusDisplayProps) {
  const measurements = useMeasurements()
  
  if (!measurements) return null
  
  const { totalWireLengthInches, maxWireLengthInches, wireLengthUtilization, isOverLimit } = measurements
  
  // Determine color based on utilization
  let statusColor = 'text-green-600'
  let bgColor = compact ? '' : 'bg-green-50'
  let borderColor = compact ? '' : 'border-green-200'
  
  if (wireLengthUtilization > 90) {
    statusColor = 'text-red-600'
    bgColor = compact ? '' : 'bg-red-50'
    borderColor = compact ? '' : 'border-red-200'
  } else if (wireLengthUtilization > 70) {
    statusColor = 'text-amber-600'
    bgColor = compact ? '' : 'bg-amber-50'
    borderColor = compact ? '' : 'border-amber-200'
  }
  
  // Compact mode for header
  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <div className="w-12 h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${
              isOverLimit ? 'bg-red-500' : wireLengthUtilization > 70 ? 'bg-amber-500' : 'bg-green-500'
            }`}
            style={{ width: `${Math.min(wireLengthUtilization, 100)}%` }}
          />
        </div>
        <span className={`text-xs font-medium ${statusColor}`}>
          {(totalWireLengthInches / 12).toFixed(0)}′
        </span>
      </div>
    )
  }
  
  return (
    <div className={`px-4 py-3 ${bgColor} border ${borderColor} rounded-lg`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700">Wire Length</span>
        <span className={`text-sm font-bold ${statusColor}`}>
          {(totalWireLengthInches / 12).toFixed(1)}ft / {(maxWireLengthInches / 12).toFixed(0)}ft
        </span>
      </div>
      
      {/* Progress bar */}
      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-300 ${
            isOverLimit ? 'bg-red-500' : wireLengthUtilization > 70 ? 'bg-amber-500' : 'bg-green-500'
          }`}
          style={{ width: `${Math.min(wireLengthUtilization, 100)}%` }}
        />
      </div>
      
      <div className="mt-1 text-xs text-gray-500 text-right">
        {wireLengthUtilization.toFixed(0)}% utilized
      </div>
      
      {isOverLimit && (
        <div className="mt-2 text-xs text-red-600 font-medium">
          ⚠️ Wire length exceeds maximum! Remove some light bars.
        </div>
      )}
    </div>
  )
})

// ============================================================================
// SYSTEM STATS DISPLAY
// ============================================================================

interface SystemStatsDisplayProps {
  compact?: boolean
}

export const SystemStatsDisplay = memo(function SystemStatsDisplay({ 
  compact = false 
}: SystemStatsDisplayProps) {
  const measurements = useMeasurements()
  const components = useComponents()
  
  // Calculate stats
  const stats = useMemo(() => {
    let totalWatts = 0
    let totalLumens = 0
    let totalPrice = 0
    let lightBarCount = 0
    let hubCount = 0
    let connectorCount = 0
    
    for (const comp of components) {
      totalPrice += comp.price
      
      if (isLightBarComponent(comp)) {
        totalWatts += comp.watts
        totalLumens += comp.lumens
        lightBarCount++
      } else if (comp.type === 'hub') {
        hubCount++
      } else if (comp.type === 'connector') {
        connectorCount++
      }
    }
    
    return {
      totalWatts,
      totalLumens,
      totalPrice,
      lightBarCount,
      hubCount,
      connectorCount,
      totalComponents: components.length,
    }
  }, [components])
  
  if (stats.totalComponents === 0) return null
  
  // Compact mode
  if (compact) {
    return (
      <div className="flex items-center justify-between text-xs text-gray-600">
        <div className="flex items-center gap-3">
          <span>{stats.hubCount}H</span>
          <span>{stats.lightBarCount}LB</span>
          <span>{stats.connectorCount}C</span>
        </div>
        <span className="font-semibold text-green-600">${stats.totalPrice}</span>
      </div>
    )
  }
  
  return (
    <div className="space-y-3">
      {/* Component counts */}
      <div className="grid grid-cols-3 gap-2">
        <div className="text-center p-2 bg-gray-50 rounded-lg">
          <div className="text-lg font-bold text-gray-900">{stats.hubCount}</div>
          <div className="text-xs text-gray-500">Hubs</div>
        </div>
        <div className="text-center p-2 bg-gray-50 rounded-lg">
          <div className="text-lg font-bold text-gray-900">{stats.lightBarCount}</div>
          <div className="text-xs text-gray-500">Light Bars</div>
        </div>
        <div className="text-center p-2 bg-gray-50 rounded-lg">
          <div className="text-lg font-bold text-gray-900">{stats.connectorCount}</div>
          <div className="text-xs text-gray-500">Connectors</div>
        </div>
      </div>
      
      {/* Electrical stats */}
      <div className="flex justify-between items-center py-2 border-t border-gray-100">
        <span className="text-sm text-gray-600">Total Wattage</span>
        <span className="text-sm font-medium text-gray-900">{stats.totalWatts}W</span>
      </div>
      
      <div className="flex justify-between items-center py-2 border-t border-gray-100">
        <span className="text-sm text-gray-600">Total Lumens</span>
        <span className="text-sm font-medium text-gray-900">{stats.totalLumens.toLocaleString()} lm</span>
      </div>
      
      {/* Price */}
      <div className="flex justify-between items-center py-2 border-t border-gray-200">
        <span className="text-sm font-medium text-gray-700">Estimated Price</span>
        <span className="text-lg font-bold text-green-600">${stats.totalPrice}</span>
      </div>
      
      {/* Bounding box */}
      {measurements && (
        <div className="text-xs text-gray-500 text-center pt-2 border-t border-gray-100">
          System size: {measurements.boundingBox.width.toFixed(0)}" × {measurements.boundingBox.depth.toFixed(0)}"
        </div>
      )}
    </div>
  )
})

// ============================================================================
// 3D MEASUREMENT OVERLAY
// ============================================================================

export const MeasurementOverlay3D = memo(function MeasurementOverlay3D() {
  const components = useComponents()
  
  // Get all light bar components
  const lightBars = useMemo(() => {
    return components.filter(isLightBarComponent) as LightBarComponent[]
  }, [components])
  
  return (
    <group>
      {lightBars.map((lb) => (
        <LightBarMeasurementDisplay key={lb.id} component={lb} />
      ))}
    </group>
  )
})

export default MeasurementOverlay3D
