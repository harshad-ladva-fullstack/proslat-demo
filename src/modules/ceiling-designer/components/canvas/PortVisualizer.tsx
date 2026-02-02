/**
 * Port Visualizer Component
 * 
 * Renders connection ports on components.
 * - Green: Valid target for current drag operation
 * - Red: Invalid target (occupied or incompatible)
 * - Gray: Idle state
 * 
 * This is a critical UI element for the constraint-driven system.
 * Users must see where they CAN and CANNOT connect.
 */

import { memo, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import { Mesh, MeshStandardMaterial, Color } from 'three'
import type { Port, WorldPosition } from '../../types/connection-graph'
import {
  useIsDragging,
  useSnapTargets,
  useActiveSnapTarget,
} from '../../store/connection-graph-store'

// ============================================================================
// CONSTANTS
// ============================================================================

const PORT_RADIUS = 0.08 // 3D units
const PORT_HEIGHT = 0.04

const COLORS = {
  IDLE: new Color('#6b7280'), // Gray
  VALID: new Color('#22c55e'), // Green
  INVALID: new Color('#ef4444'), // Red
  ACTIVE: new Color('#3b82f6'), // Blue (active snap target)
  OCCUPIED: new Color('#374151'), // Dark gray
}

// ============================================================================
// TYPES
// ============================================================================

interface PortVisualizerProps {
  port: Port
  componentWorldPosition: WorldPosition
  componentWorldRotation: number
  isOccupied: boolean
}

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
  const INCHES_TO_3D_UNITS = 1 / 12
  
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
// COMPONENT
// ============================================================================

export const PortVisualizer = memo(function PortVisualizer({
  port,
  componentWorldPosition,
  componentWorldRotation,
  isOccupied,
}: PortVisualizerProps) {
  const meshRef = useRef<Mesh>(null)
  const materialRef = useRef<MeshStandardMaterial>(null)
  
  const isDragging = useIsDragging()
  const snapTargets = useSnapTargets()
  const activeSnapTarget = useActiveSnapTarget()
  
  // Calculate world position
  const worldPosition = useMemo(
    () => calculatePortWorldPosition(port, componentWorldPosition, componentWorldRotation),
    [port, componentWorldPosition, componentWorldRotation]
  )
  
  // Calculate world direction for visual indicator
  const worldDirection = useMemo(
    () => (port.direction + componentWorldRotation) * (Math.PI / 180),
    [port.direction, componentWorldRotation]
  )
  
  // Determine port state
  const portState = useMemo(() => {
    if (isOccupied) return 'occupied'
    if (!isDragging) return 'idle'
    
    // Check if this port is a valid snap target
    const isSnapTarget = snapTargets.some(t => t.portId === port.id)
    if (!isSnapTarget) return 'idle'
    
    // Check if this is the active snap target
    if (activeSnapTarget?.portId === port.id) {
      return activeSnapTarget.isValid ? 'active' : 'invalid'
    }
    
    return 'valid'
  }, [isDragging, snapTargets, activeSnapTarget, port.id, isOccupied])
  
  // Animate color based on state
  useFrame((_, delta) => {
    if (!materialRef.current) return
    
    let targetColor: Color
    let targetEmissive: number
    
    switch (portState) {
      case 'active':
        targetColor = COLORS.ACTIVE
        targetEmissive = 0.5
        break
      case 'valid':
        targetColor = COLORS.VALID
        targetEmissive = 0.3
        break
      case 'invalid':
        targetColor = COLORS.INVALID
        targetEmissive = 0.3
        break
      case 'occupied':
        targetColor = COLORS.OCCUPIED
        targetEmissive = 0
        break
      default:
        targetColor = COLORS.IDLE
        targetEmissive = 0
    }
    
    // Smooth color transition
    materialRef.current.color.lerp(targetColor, delta * 8)
    materialRef.current.emissive.lerp(targetColor, delta * 8)
    materialRef.current.emissiveIntensity += (targetEmissive - materialRef.current.emissiveIntensity) * delta * 8
  })
  
  // Only show ports when dragging (or always show occupied ones dimly)
  const visible = isDragging || isOccupied
  const opacity = isDragging ? 1 : 0.3
  
  if (!visible && !isOccupied) return null
  
  return (
    <group position={[worldPosition.x, worldPosition.y - 0.02, worldPosition.z]}>
      {/* Port indicator (cylinder) */}
      <mesh
        ref={meshRef}
        rotation={[-Math.PI / 2, 0, worldDirection]}
      >
        <cylinderGeometry args={[PORT_RADIUS, PORT_RADIUS, PORT_HEIGHT, 16]} />
        <meshStandardMaterial
          ref={materialRef}
          color={COLORS.IDLE}
          transparent
          opacity={opacity}
          emissive={COLORS.IDLE}
          emissiveIntensity={0}
        />
      </mesh>
      
      {/* Direction indicator (small arrow/cone) */}
      {isDragging && !isOccupied && (
        <mesh
          position={[
            Math.sin(worldDirection) * PORT_RADIUS * 1.5,
            0,
            -Math.cos(worldDirection) * PORT_RADIUS * 1.5,
          ]}
          rotation={[-Math.PI / 2, 0, worldDirection]}
        >
          <coneGeometry args={[PORT_RADIUS * 0.5, PORT_HEIGHT * 2, 8]} />
          <meshStandardMaterial
            color={portState === 'valid' || portState === 'active' ? COLORS.VALID : COLORS.IDLE}
            transparent
            opacity={opacity * 0.7}
          />
        </mesh>
      )}
    </group>
  )
})

// ============================================================================
// PORT GROUP COMPONENT
// ============================================================================

interface ComponentPortsProps {
  ports: Port[]
  componentWorldPosition: WorldPosition
  componentWorldRotation: number
}

/**
 * Renders all ports for a component
 */
export const ComponentPorts = memo(function ComponentPorts({
  ports,
  componentWorldPosition,
  componentWorldRotation,
}: ComponentPortsProps) {
  return (
    <group>
      {ports.map((port) => (
        <PortVisualizer
          key={port.id}
          port={port}
          componentWorldPosition={componentWorldPosition}
          componentWorldRotation={componentWorldRotation}
          isOccupied={port.occupied}
        />
      ))}
    </group>
  )
})

export default PortVisualizer
