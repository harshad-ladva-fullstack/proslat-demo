/**
 * Connection-Based Light Bar 3D Component
 * 
 * Renders a light bar based on the connection graph.
 * Position and rotation are DERIVED from connections.
 * 
 * MOVEMENT RULES:
 * - Light bars are always connected to parent components
 * - Movement is ONLY via group move (with connected components)
 * - No free dragging allowed
 */

import { memo, useRef, useMemo } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { Mesh, MeshStandardMaterial } from 'three'
import type { LightBarComponent } from '../../types/connection-graph'
import { useConnectionGraphStore } from '../../store/connection-graph-store'
import { useComponentMovement } from '../../hooks/useComponentMovement'

// ============================================================================
// CONSTANTS
// ============================================================================

const LIGHT_BAR_HEIGHT = 0.06 // Slimmer profile
const LIGHT_BAR_DEPTH = 0.08 // Narrower for more realistic look
const INCHES_TO_3D_UNITS = 1 / 12

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

interface ConnectionLightBar3DProps {
  data: LightBarComponent
}

// ============================================================================
// COMPONENT
// ============================================================================

export const ConnectionLightBar3D = memo(function ConnectionLightBar3D({ data }: ConnectionLightBar3DProps) {
  const meshRef = useRef<Mesh>(null)
  const glowRef = useRef<Mesh>(null)
  const diffuserRef = useRef<Mesh>(null)
  const pointLightRef = useRef<any>(null)
  
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
  
  // Movement hook - light bars can only move as part of a group
  const {
    isMoving,
    isValidPosition,
    onPointerDown,
    onPointerMove,
    onPointerUp,
  } = useComponentMovement({
    componentId: data.id,
    enableGroupMove: true, // Light bars only support group move
  })
  
  // Get preview position if moving
  const previewPos = movePreviewPositions?.get(data.id)
  
  // Calculate dimensions in 3D units
  const lengthInUnits = data.lengthInches * INCHES_TO_3D_UNITS
  
  // Determine glow color based on lighting mode
  const glowColor = useMemo(() => {
    return data.lightingMode === 'rgb' ? data.rgbColor : '#ffffff'
  }, [data.lightingMode, data.rgbColor])
  
  // Casing color
  const casingColor = CASING_COLORS[data.casingColor]
  
  // Determine material color based on state
  const materialColor = useMemo(() => {
    if (isMoving && !isValidPosition) return INVALID_MOVE_COLOR
    if (isMoving) return MOVING_COLOR
    if (isSelected) return SELECTION_COLOR
    if (isInSelection) return SELECTION_COLOR
    if (isHovered) return HOVER_COLOR
    return casingColor
  }, [isSelected, isHovered, isInSelection, isMoving, isValidPosition, casingColor])
  
  // Animate glow
  useFrame((state) => {
    if (glowRef.current) {
      const material = glowRef.current.material as MeshStandardMaterial
      
      if (data.lightingMode === 'rgb') {
        // Pulsing glow for RGB mode
        const time = state.clock.elapsedTime
        const pulseIntensity = 0.7 + Math.sin(time * 2) * 0.3
        material.emissiveIntensity = pulseIntensity
        
        if (pointLightRef.current) {
          pointLightRef.current.intensity = pulseIntensity * 3
        }
      } else {
        // Subtle breathing for white mode
        const intensity = 0.6 + Math.sin(state.clock.elapsedTime * 1.5) * 0.1
        material.emissiveIntensity = intensity
        
        if (pointLightRef.current) {
          pointLightRef.current.intensity = intensity * 2
        }
      }
    }
    
    if (diffuserRef.current) {
      const material = diffuserRef.current.material as MeshStandardMaterial
      const time = state.clock.elapsedTime
      material.opacity = 0.85 + Math.sin(time * 2) * 0.1
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
      {/* Main point light for illumination */}
      <pointLight
        ref={pointLightRef}
        position={[0, -LIGHT_BAR_HEIGHT - 0.15, 0]}
        color={glowColor}
        intensity={2}
        distance={4}
        decay={2}
        castShadow
      />
      
      {/* Aluminum housing (main body) */}
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
        <boxGeometry args={[lengthInUnits, LIGHT_BAR_HEIGHT, LIGHT_BAR_DEPTH]} />
        <meshStandardMaterial
          color={materialColor}
          metalness={0.7}
          roughness={0.3}
        />
      </mesh>
      
      {/* Diffuser lens (bottom) */}
      <mesh
        ref={diffuserRef}
        position={[0, -LIGHT_BAR_HEIGHT / 2 - 0.005, 0]}
      >
        <boxGeometry args={[lengthInUnits - 0.02, 0.01, LIGHT_BAR_DEPTH - 0.02]} />
        <meshStandardMaterial
          color="#ffffff"
          transparent
          opacity={0.9}
          emissive={glowColor}
          emissiveIntensity={0.3}
        />
      </mesh>
      
      {/* LED strip glow */}
      <mesh
        ref={glowRef}
        position={[0, -LIGHT_BAR_HEIGHT / 2 - 0.015, 0]}
      >
        <boxGeometry args={[lengthInUnits - 0.04, 0.005, LIGHT_BAR_DEPTH - 0.04]} />
        <meshStandardMaterial
          color={glowColor}
          emissive={glowColor}
          emissiveIntensity={0.7}
        />
      </mesh>
      
      {/* End caps */}
      <mesh position={[-lengthInUnits / 2, 0, 0]}>
        <boxGeometry args={[0.02, LIGHT_BAR_HEIGHT + 0.01, LIGHT_BAR_DEPTH + 0.01]} />
        <meshStandardMaterial color={casingColor} metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh position={[lengthInUnits / 2, 0, 0]}>
        <boxGeometry args={[0.02, LIGHT_BAR_HEIGHT + 0.01, LIGHT_BAR_DEPTH + 0.01]} />
        <meshStandardMaterial color={casingColor} metalness={0.6} roughness={0.4} />
      </mesh>
      
      {/* Selection highlight */}
      {isSelected && (
        <mesh position={[0, 0.01, 0]}>
          <boxGeometry args={[lengthInUnits + 0.05, LIGHT_BAR_HEIGHT + 0.05, LIGHT_BAR_DEPTH + 0.05]} />
          <meshBasicMaterial color={SELECTION_COLOR} transparent opacity={0.2} wireframe />
        </mesh>
      )}
      
      {/* Mounting brackets */}
      <mesh position={[-lengthInUnits / 4, LIGHT_BAR_HEIGHT / 2 + 0.015, 0]}>
        <boxGeometry args={[0.04, 0.03, 0.02]} />
        <meshStandardMaterial color="#333333" metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh position={[lengthInUnits / 4, LIGHT_BAR_HEIGHT / 2 + 0.015, 0]}>
        <boxGeometry args={[0.04, 0.03, 0.02]} />
        <meshStandardMaterial color="#333333" metalness={0.8} roughness={0.2} />
      </mesh>
    </group>
  )
})
