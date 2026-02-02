/**
 * Connection-Based Hub 3D Component
 * 
 * Renders a hub based on the connection graph.
 * Position and rotation are DERIVED from connections (except root hub).
 * 
 * MOVEMENT RULES:
 * - Root hub with no connections: CAN be moved freely
 * - Root hub with connections: Group move only
 * - Non-root hub: Group move only
 */

import { memo, useRef, useMemo } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { Mesh, MeshStandardMaterial } from 'three'
import type { HubComponent } from '../../types/connection-graph'
import { useConnectionGraphStore } from '../../store/connection-graph-store'
import { useComponentMovement } from '../../hooks/useComponentMovement'

// ============================================================================
// CONSTANTS
// ============================================================================

const HUB_SIZE = 0.3 // 3D units
const HUB_HEIGHT = 0.1

const CASING_COLORS = {
  matte_black: '#1a1a1a',
  white: '#f5f5f5',
}

const SELECTION_COLOR = '#3b82f6'
const HOVER_COLOR = '#60a5fa'
const MOVING_COLOR = '#8b5cf6'
const INVALID_MOVE_COLOR = '#ef4444'

// ============================================================================
// TYPES
// ============================================================================

interface ConnectionHub3DProps {
  data: HubComponent
}

// ============================================================================
// COMPONENT
// ============================================================================

export const ConnectionHub3D = memo(function ConnectionHub3D({ data }: ConnectionHub3DProps) {
  const meshRef = useRef<Mesh>(null)
  const powerIndicatorRef = useRef<Mesh>(null)
  
  const selectComponent = useConnectionGraphStore((state) => state.selectComponent)
  const selectGroup = useConnectionGraphStore((state) => state.selectGroup)
  const hoverComponent = useConnectionGraphStore((state) => state.hoverComponent)
  const selectedId = useConnectionGraphStore((state) => state.selectedComponentId)
  const hoveredId = useConnectionGraphStore((state) => state.hoveredComponentId)
  const currentSelection = useConnectionGraphStore((state) => state.currentSelection)
  const movePreviewPositions = useConnectionGraphStore((state) => state.movePreviewPositions)
  
  const isSelected = selectedId === data.id
  const isHovered = hoveredId === data.id
  const isInSelection = currentSelection?.componentIds.includes(data.id) ?? false
  
  // Movement hook - only root hub can be moved individually
  const {
    isMoving,
    isValidPosition,
    onPointerDown,
    onPointerMove,
    onPointerUp,
  } = useComponentMovement({
    componentId: data.id,
    enableGroupMove: true, // Always allow group move for hubs
  })
  
  // Get preview position if moving
  const previewPos = movePreviewPositions?.get(data.id)
  
  // Determine material color based on state
  const materialColor = useMemo(() => {
    if (isMoving && !isValidPosition) return INVALID_MOVE_COLOR
    if (isMoving) return MOVING_COLOR
    if (isSelected) return SELECTION_COLOR
    if (isInSelection) return SELECTION_COLOR
    if (isHovered) return HOVER_COLOR
    return CASING_COLORS.matte_black // Hubs use matte black
  }, [isSelected, isHovered, isInSelection, isMoving, isValidPosition])
  
  // Animate power indicator
  useFrame((state) => {
    if (powerIndicatorRef.current) {
      const intensity = 0.5 + Math.sin(state.clock.elapsedTime * 3) * 0.3
      const material = powerIndicatorRef.current.material as MeshStandardMaterial
      material.emissiveIntensity = intensity
    }
  })
  
  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    // Shift+click selects the connected group
    if (e.nativeEvent.shiftKey) {
      selectGroup(data.id)
    } else {
      selectComponent(data.id)
    }
  }
  
  const handlePointerOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    hoverComponent(data.id)
    document.body.style.cursor = isMoving ? 'grabbing' : 'grab'
  }
  
  const handlePointerOut = () => {
    hoverComponent(null)
    document.body.style.cursor = 'auto'
  }
  
  // Use world position and rotation from the connection graph
  // If moving, use preview position instead
  const position = previewPos ?? data.worldPosition
  const rotationY = (data.worldRotation * Math.PI) / 180
  
  return (
    <group
      position={[position.x, position.y, position.z]}
      rotation={[0, rotationY, 0]}
    >
      {/* Main hub body - octagonal shape */}
      <mesh
        ref={meshRef}
        onClick={handleClick}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        castShadow
        receiveShadow
      >
        <cylinderGeometry args={[HUB_SIZE, HUB_SIZE, HUB_HEIGHT, 8]} />
        <meshStandardMaterial
          color={materialColor}
          metalness={0.6}
          roughness={0.4}
        />
      </mesh>
      
      {/* Inner ring */}
      <mesh position={[0, HUB_HEIGHT / 2 + 0.001, 0]}>
        <ringGeometry args={[HUB_SIZE * 0.4, HUB_SIZE * 0.6, 32]} />
        <meshStandardMaterial
          color="#2a2a2a"
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>
      
      {/* Power indicator LED */}
      <mesh
        ref={powerIndicatorRef}
        position={[0, HUB_HEIGHT / 2 + 0.01, 0]}
      >
        <cylinderGeometry args={[0.03, 0.03, 0.02, 16]} />
        <meshStandardMaterial
          color="#22c55e"
          emissive="#22c55e"
          emissiveIntensity={0.5}
        />
      </mesh>
      
      {/* Root hub indicator */}
      {data.isRootHub && (
        <mesh position={[0, HUB_HEIGHT / 2 + 0.02, 0]}>
          <torusGeometry args={[HUB_SIZE * 0.8, 0.015, 8, 32]} />
          <meshStandardMaterial
            color="#fbbf24"
            emissive="#fbbf24"
            emissiveIntensity={0.3}
          />
        </mesh>
      )}
      
      {/* Selection ring */}
      {isSelected && (
        <mesh position={[0, -0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[HUB_SIZE + 0.05, HUB_SIZE + 0.1, 32]} />
          <meshBasicMaterial color={SELECTION_COLOR} transparent opacity={0.5} />
        </mesh>
      )}
      
      {/* Point light for ambient glow */}
      <pointLight
        position={[0, -HUB_HEIGHT, 0]}
        color="#22c55e"
        intensity={0.5}
        distance={2}
        decay={2}
      />
    </group>
  )
})
