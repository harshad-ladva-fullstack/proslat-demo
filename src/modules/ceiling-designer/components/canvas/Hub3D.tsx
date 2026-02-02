/**
 * Hub 3D Model
 * 
 * Three.js mesh component for rendering hub components.
 * The hub is the central power distribution unit.
 * Supports dragging to reposition on the ceiling.
 */

import { memo, useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Mesh, MeshStandardMaterial } from 'three'
import type { Hub as HubType } from '../../types'
import { CASING_COLOR_VALUES, SELECTION_HIGHLIGHT_COLOR } from '../../constants'
import { useCeilingDesignerStore } from '../../store'

// ============================================================================
// TYPES
// ============================================================================

interface Hub3DProps {
  data: HubType
}

// ============================================================================
// CONSTANTS
// ============================================================================

const HUB_SIZE = 0.8 // Size of the hub (tripled from 0.3)
const HUB_HEIGHT = 0.25 // Height of the hub (increased from 0.1)

// ============================================================================
// COMPONENT
// ============================================================================

export const Hub3D = memo(function Hub3D({ data }: Hub3DProps) {
  const meshRef = useRef<Mesh>(null)
  const powerIndicatorRef = useRef<Mesh>(null)

  const selectComponent = useCeilingDesignerStore((state) => state.selectComponent)
  const hoverComponent = useCeilingDesignerStore((state) => state.hoverComponent)
  const selectedId = useCeilingDesignerStore((state) => state.selection.selectedComponentId)
  const hoveredId = useCeilingDesignerStore((state) => state.selection.hoveredComponentId)

  const isSelected = selectedId === data.id
  const isHovered = hoveredId === data.id

  // Material colors
  const casingColor = CASING_COLOR_VALUES[data.casingColor]

  // Animate power indicator
  useFrame((state) => {
    if (powerIndicatorRef.current && data.isPowered) {
      const intensity = 0.5 + Math.sin(state.clock.elapsedTime * 3) * 0.3
      const material = powerIndicatorRef.current.material as MeshStandardMaterial
      material.emissiveIntensity = intensity
    }
  })

  const handleClick = (e: any) => {
    e.stopPropagation()
    selectComponent(data.id)
  }

  const handlePointerOver = (e: any) => {
    e.stopPropagation()
    hoverComponent(data.id)
    document.body.style.cursor = 'pointer'
  }

  const handlePointerOut = () => {
    hoverComponent(null)
    document.body.style.cursor = 'auto'
  }

  // Port positions for 4-way hub
  const portPositions = useMemo(() => [
    { x: 0, z: -HUB_SIZE / 2 - 0.05 },
    { x: HUB_SIZE / 2 + 0.05, z: 0 },
    { x: 0, z: HUB_SIZE / 2 + 0.05 },
    { x: -HUB_SIZE / 2 - 0.05, z: 0 },
  ], [])

  return (
    <group
      position={[data.position.x, data.position.y, data.position.z]}
      rotation={[data.rotation.x, data.rotation.y, data.rotation.z]}
    >
      {/* Main hub body */}
      <mesh
        ref={meshRef}
        onClick={handleClick}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        onPointerDown={(e) => e.stopPropagation()}
        onPointerMove={(e) => e.stopPropagation()}
        castShadow
        receiveShadow
      >
        <cylinderGeometry args={[HUB_SIZE / 2, HUB_SIZE / 2, HUB_HEIGHT, 32]} />
        <meshStandardMaterial
          color={casingColor}
          metalness={0.4}
          roughness={0.6}
        />
      </mesh>

      {/* Power indicator (center) */}
      <mesh
        ref={powerIndicatorRef}
        position={[0, HUB_HEIGHT / 2 + 0.01, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <circleGeometry args={[0.05, 32]} />
        <meshStandardMaterial
          color={data.isPowered ? '#22c55e' : '#ef4444'}
          emissive={data.isPowered ? '#22c55e' : '#ef4444'}
          emissiveIntensity={0.5}
          toneMapped={false}
        />
      </mesh>

      {/* Connection ports */}
      {portPositions.map((pos, index) => (
        <mesh
          key={index}
          position={[pos.x, 0, pos.z]}
        >
          <boxGeometry args={[0.08, HUB_HEIGHT, 0.08]} />
          <meshStandardMaterial
            color={data.ports[index]?.isOccupied ? '#3b82f6' : '#4ade80'}
            metalness={0.3}
            roughness={0.7}
          />
        </mesh>
      ))}

      {/* Selection outline */}
      {(isSelected || isHovered) && (
        <mesh>
          <cylinderGeometry
            args={[HUB_SIZE / 2 + 0.03, HUB_SIZE / 2 + 0.03, HUB_HEIGHT + 0.03, 32]}
          />
          <meshBasicMaterial
            color={isSelected ? SELECTION_HIGHLIGHT_COLOR : '#60a5fa'}
            transparent
            opacity={0.3}
            depthWrite={false}
          />
        </mesh>
      )}
    </group>
  )
})

export default Hub3D
