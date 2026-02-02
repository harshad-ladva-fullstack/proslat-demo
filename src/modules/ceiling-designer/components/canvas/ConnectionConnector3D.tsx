/**
 * Connection-Based Connector 3D Component
 * 
 * Renders a connector based on the connection graph.
 * Position and rotation are DERIVED from connections.
 * 
 * MOVEMENT RULES:
 * - Connectors are always connected to parent components
 * - Movement is ONLY via group move (with connected components)
 * - No free dragging allowed
 */

import { memo, useRef, useMemo } from 'react'
import type { ThreeEvent } from '@react-three/fiber'
import { Mesh } from 'three'
import type { ConnectorComponent } from '../../types/connection-graph'
import { ConnectorSubtype } from '../../types/connection-graph'
import { useConnectionGraphStore } from '../../store/connection-graph-store'
import { useComponentMovement } from '../../hooks/useComponentMovement'

// ============================================================================
// CONSTANTS
// ============================================================================

const CONNECTOR_HEIGHT = 0.08
const CONNECTOR_RADIUS = 0.1

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

interface ConnectionConnector3DProps {
  data: ConnectorComponent
}

// ============================================================================
// COMPONENT
// ============================================================================

export const ConnectionConnector3D = memo(function ConnectionConnector3D({ data }: ConnectionConnector3DProps) {
  const meshRef = useRef<Mesh>(null)
  
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
  
  // Movement hook - connectors can only move as part of a group
  const {
    isMoving,
    isValidPosition,
    onPointerDown,
    onPointerMove,
    onPointerUp,
  } = useComponentMovement({
    componentId: data.id,
    enableGroupMove: true, // Connectors only support group move
  })
  
  // Get preview position if moving
  const previewPos = movePreviewPositions?.get(data.id)
  
  const casingColor = CASING_COLORS[data.casingColor]
  
  // Determine display color based on state
  const displayColor = useMemo(() => {
    if (isMoving && !isValidPosition) return INVALID_MOVE_COLOR
    if (isMoving) return MOVING_COLOR
    if (isSelected) return SELECTION_COLOR
    if (isInSelection) return SELECTION_COLOR
    if (isHovered) return HOVER_COLOR
    return casingColor
  }, [isSelected, isHovered, isInSelection, isMoving, isValidPosition, casingColor])
  
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
  
  // Generate arms based on port angles
  const arms = useMemo(() => {
    return data.portAngles.map((angle, index) => {
      const radians = (angle * Math.PI) / 180
      const length = 0.15 // Arm length in 3D units
      
      return {
        key: index,
        position: [
          Math.sin(radians) * length / 2,
          0,
          -Math.cos(radians) * length / 2,
        ] as [number, number, number],
        rotation: [0, -radians, 0] as [number, number, number],
        length,
      }
    })
  }, [data.portAngles])
  
  return (
    <group
      position={[position.x, position.y, position.z]}
      rotation={[0, rotationY, 0]}
    >
      {/* Central hub */}
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
        <cylinderGeometry args={[CONNECTOR_RADIUS, CONNECTOR_RADIUS, CONNECTOR_HEIGHT, getSegments(data.subtype)]} />
        <meshStandardMaterial
          color={displayColor}
          metalness={0.6}
          roughness={0.4}
        />
      </mesh>
      
      {/* Arms extending to each port */}
      {arms.map((arm) => (
        <mesh
          key={arm.key}
          position={arm.position}
          rotation={arm.rotation}
        >
          <boxGeometry args={[0.03, CONNECTOR_HEIGHT * 0.8, arm.length]} />
          <meshStandardMaterial
            color={displayColor}
            metalness={0.6}
            roughness={0.4}
          />
        </mesh>
      ))}
      
      {/* Center indicator */}
      <mesh position={[0, CONNECTOR_HEIGHT / 2 + 0.005, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 0.01, 16]} />
        <meshStandardMaterial
          color="#666666"
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>
      
      {/* Selection ring */}
      {isSelected && (
        <mesh position={[0, -0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[CONNECTOR_RADIUS + 0.05, CONNECTOR_RADIUS + 0.1, 32]} />
          <meshBasicMaterial color={SELECTION_COLOR} transparent opacity={0.5} />
        </mesh>
      )}
      
      {/* Subtype label indicator (visual differentiation) */}
      {data.subtype === ConnectorSubtype.Y_CONNECTOR && (
        <mesh position={[0, CONNECTOR_HEIGHT / 2 + 0.01, 0]}>
          <coneGeometry args={[0.03, 0.02, 3]} />
          <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={0.2} />
        </mesh>
      )}
    </group>
  )
})

/**
 * Get cylinder segments based on connector type
 */
function getSegments(subtype: ConnectorSubtype): number {
  switch (subtype) {
    case ConnectorSubtype.T_CONNECTOR:
      return 3
    case ConnectorSubtype.CROSS_CONNECTOR:
      return 4
    case ConnectorSubtype.Y_CONNECTOR:
      return 3
    case ConnectorSubtype.L_CONNECTOR:
    case ConnectorSubtype.ELBOW_45_LEFT:
    case ConnectorSubtype.ELBOW_45_RIGHT:
    case ConnectorSubtype.ELBOW_90_LEFT:
    case ConnectorSubtype.ELBOW_90_RIGHT:
      return 16 // Rounded for elbows
    default:
      return 16
  }
}
