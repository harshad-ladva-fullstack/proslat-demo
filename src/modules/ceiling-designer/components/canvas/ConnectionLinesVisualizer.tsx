/**
 * Connection Lines Visualizer
 * 
 * Renders visual connections between connected components.
 * Shows the connection graph structure.
 */

import { memo, useMemo } from 'react'
import { Line } from '@react-three/drei'
import {
  useConnections,
  useConnectionGraphStore,
} from '../../store/connection-graph-store'
import type { Connection, Component, Port, WorldPosition } from '../../types/connection-graph'

// ============================================================================
// CONSTANTS
// ============================================================================

const INCHES_TO_3D_UNITS = 1 / 12

const CONNECTION_COLOR = '#6b7280'
const SELECTED_CONNECTION_COLOR = '#3b82f6'

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate world position of a port
 */
function calculatePortWorldPosition(
  port: Port,
  componentPosition: WorldPosition,
  componentRotation: number
): WorldPosition {
  const localX = port.localPosition.x * INCHES_TO_3D_UNITS
  const localZ = port.localPosition.z * INCHES_TO_3D_UNITS
  
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

// ============================================================================
// SINGLE CONNECTION LINE
// ============================================================================

interface ConnectionLineProps {
  connection: Connection
  fromComponent: Component
  toComponent: Component
  isSelected: boolean
}

const ConnectionLine = memo(function ConnectionLine({
  connection,
  fromComponent,
  toComponent,
  isSelected,
}: ConnectionLineProps) {
  // Find the ports
  const fromPort = fromComponent.ports.find((p) => p.id === connection.fromPortId)
  const toPort = toComponent.ports.find((p) => p.id === connection.toPortId)
  
  if (!fromPort || !toPort) return null
  
  // Calculate world positions
  const fromPos = calculatePortWorldPosition(
    fromPort,
    fromComponent.worldPosition,
    fromComponent.worldRotation
  )
  const toPos = calculatePortWorldPosition(
    toPort,
    toComponent.worldPosition,
    toComponent.worldRotation
  )
  
  const points: [number, number, number][] = [
    [fromPos.x, fromPos.y - 0.03, fromPos.z],
    [toPos.x, toPos.y - 0.03, toPos.z],
  ]
  
  return (
    <Line
      points={points}
      color={isSelected ? SELECTED_CONNECTION_COLOR : CONNECTION_COLOR}
      lineWidth={isSelected ? 3 : 2}
      dashed={false}
    />
  )
})

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const ConnectionLinesVisualizer = memo(function ConnectionLinesVisualizer() {
  const connections = useConnections()
  const components = useConnectionGraphStore((state) => state.components)
  const selectedComponentId = useConnectionGraphStore((state) => state.selectedComponentId)
  
  // Build connection line data
  const connectionLines = useMemo(() => {
    return connections.map((conn) => {
      const fromComponent = components.find(c => c.id === conn.fromComponentId)
      const toComponent = components.find(c => c.id === conn.toComponentId)
      
      if (!fromComponent || !toComponent) return null
      
      const isSelected =
        selectedComponentId === conn.fromComponentId ||
        selectedComponentId === conn.toComponentId
      
      return {
        connection: conn,
        fromComponent,
        toComponent,
        isSelected,
      }
    }).filter(Boolean) as Array<{
      connection: Connection
      fromComponent: Component
      toComponent: Component
      isSelected: boolean
    }>
  }, [connections, components, selectedComponentId])
  
  if (connectionLines.length === 0) return null
  
  return (
    <group>
      {connectionLines.map((line) => (
        <ConnectionLine
          key={line.connection.id}
          connection={line.connection}
          fromComponent={line.fromComponent}
          toComponent={line.toComponent}
          isSelected={line.isSelected}
        />
      ))}
    </group>
  )
})

export default ConnectionLinesVisualizer
