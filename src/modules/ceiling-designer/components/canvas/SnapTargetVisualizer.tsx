/**
 * Snap Target Visualizer
 * 
 * Renders visual indicators for all valid connection points during drag.
 * Shows where the user CAN connect the component they're dragging.
 * 
 * This is critical for the constraint-driven UX - users need to see
 * their options clearly.
 */

import { memo, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import { Mesh, MeshStandardMaterial, Color } from 'three'
import {
  useIsDragging,
  useSnapTargets,
  useActiveSnapTarget,
} from '../../store/connection-graph-store'
import type { SnapTarget } from '../../types/connection-graph'

// ============================================================================
// CONSTANTS
// ============================================================================

const TARGET_RADIUS = 0.12
const PULSE_SPEED = 3
const PULSE_AMPLITUDE = 0.3

const COLORS = {
  VALID: new Color('#22c55e'),
  ACTIVE: new Color('#3b82f6'),
  INVALID: new Color('#ef4444'),
}

// ============================================================================
// SINGLE TARGET COMPONENT
// ============================================================================

interface SnapTargetIndicatorProps {
  target: SnapTarget
  isActive: boolean
}

const SnapTargetIndicator = memo(function SnapTargetIndicator({
  target,
  isActive,
}: SnapTargetIndicatorProps) {
  const meshRef = useRef<Mesh>(null)
  const ringRef = useRef<Mesh>(null)
  const materialRef = useRef<MeshStandardMaterial>(null)
  
  const color = useMemo(() => {
    if (!target.isValid) return COLORS.INVALID
    if (isActive) return COLORS.ACTIVE
    return COLORS.VALID
  }, [target.isValid, isActive])
  
  // Animate the indicator
  useFrame((state) => {
    if (!meshRef.current || !materialRef.current) return
    
    const time = state.clock.elapsedTime * PULSE_SPEED
    
    // Pulse scale
    const scale = 1 + Math.sin(time) * PULSE_AMPLITUDE * (isActive ? 1.5 : 0.5)
    meshRef.current.scale.setScalar(scale)
    
    // Pulse opacity
    const opacity = 0.6 + Math.sin(time) * 0.2
    materialRef.current.opacity = isActive ? Math.min(opacity + 0.2, 1) : opacity
    
    // Pulse emissive intensity
    materialRef.current.emissiveIntensity = 0.3 + Math.sin(time) * 0.2
    
    // Rotate ring
    if (ringRef.current) {
      ringRef.current.rotation.z = time * 0.5
    }
  })
  
  const position: [number, number, number] = [
    target.portWorldPosition.x,
    target.portWorldPosition.y - 0.05,
    target.portWorldPosition.z,
  ]
  
  // Direction indicator rotation
  const directionRad = (target.portDirection * Math.PI) / 180
  
  return (
    <group position={position}>
      {/* Main target indicator */}
      <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[TARGET_RADIUS, 32]} />
        <meshStandardMaterial
          ref={materialRef}
          color={color}
          emissive={color}
          emissiveIntensity={0.3}
          transparent
          opacity={0.6}
          side={2} // DoubleSide
        />
      </mesh>
      
      {/* Animated ring */}
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]}>
        <ringGeometry args={[TARGET_RADIUS * 0.8, TARGET_RADIUS * 1.2, 32]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={isActive ? 0.8 : 0.4}
        />
      </mesh>
      
      {/* Direction arrow */}
      <group rotation={[0, -directionRad + Math.PI, 0]}>
        <mesh position={[0, 0.02, TARGET_RADIUS * 1.5]}>
          <coneGeometry args={[0.04, 0.1, 8]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={0.3}
          />
        </mesh>
      </group>
      
      {/* Active state glow */}
      {isActive && (
        <pointLight
          position={[0, -0.1, 0]}
          color={color}
          intensity={1}
          distance={1}
          decay={2}
        />
      )}
    </group>
  )
})

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const SnapTargetVisualizer = memo(function SnapTargetVisualizer() {
  const isDragging = useIsDragging()
  const snapTargets = useSnapTargets()
  const activeSnapTarget = useActiveSnapTarget()
  
  // Don't render if not dragging
  if (!isDragging || snapTargets.length === 0) {
    return null
  }
  
  return (
    <group>
      {snapTargets.map((target) => (
        <SnapTargetIndicator
          key={target.portId}
          target={target}
          isActive={activeSnapTarget?.portId === target.portId}
        />
      ))}
    </group>
  )
})

export default SnapTargetVisualizer
