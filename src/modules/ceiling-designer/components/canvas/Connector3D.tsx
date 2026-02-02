/**
 * Connector 3D Model
 * 
 * Three.js mesh component for rendering connector components.
 * Supports various connector types (L, T, Cross, Y, etc.)
 * Supports dragging to reposition on the ceiling.
 */

import { memo, useRef, useMemo } from 'react'
import { Mesh } from 'three'
import type { Connector as ConnectorType } from '../../types'
import { CASING_COLOR_VALUES, SELECTION_HIGHLIGHT_COLOR } from '../../constants'
import { useCeilingDesignerStore } from '../../store'
import { degreesToRadians } from '../../utils'

// ============================================================================
// TYPES
// ============================================================================

interface Connector3DProps {
  data: ConnectorType
}

// ============================================================================
// CONSTANTS
// ============================================================================

const CONNECTOR_SIZE = 0.4 // Size of connector body (tripled from 0.15)
const ARM_LENGTH = 0.25 // Length of connector arms (tripled from 0.1)
const ARM_WIDTH = 0.15 // Width of connector arms (tripled from 0.06)

// ============================================================================
// COMPONENT
// ============================================================================

export const Connector3D = memo(function Connector3D({ data }: Connector3DProps) {
  const meshRef = useRef<Mesh>(null)

  const selectComponent = useCeilingDesignerStore((state) => state.selectComponent)
  const hoverComponent = useCeilingDesignerStore((state) => state.hoverComponent)
  const selectedId = useCeilingDesignerStore((state) => state.selection.selectedComponentId)
  const hoveredId = useCeilingDesignerStore((state) => state.selection.hoveredComponentId)

  const isSelected = selectedId === data.id
  const isHovered = hoveredId === data.id

  // Material colors
  const casingColor = CASING_COLOR_VALUES[data.casingColor]

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

  // Calculate arm positions based on connector type
  const arms = useMemo(() => {
    return data.angles.map((angle: number) => {
      const radians = degreesToRadians(angle)
      return {
        angle,
        position: {
          x: Math.sin(radians) * (CONNECTOR_SIZE / 2 + ARM_LENGTH / 2),
          z: -Math.cos(radians) * (CONNECTOR_SIZE / 2 + ARM_LENGTH / 2),
        },
        rotation: radians,
      }
    })
  }, [data.angles])

  return (
    <group
      position={[data.position.x, data.position.y, data.position.z]}
      rotation={[data.rotation.x, data.rotation.y, data.rotation.z]}
    >
      {/* Central body */}
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
        <cylinderGeometry args={[CONNECTOR_SIZE / 2, CONNECTOR_SIZE / 2, 0.08, 16]} />
        <meshStandardMaterial
          color={casingColor}
          metalness={0.3}
          roughness={0.7}
        />
      </mesh>

      {/* Connector arms */}
      {arms.map((arm: { angle: number; position: { x: number; z: number }; rotation: number }, index: number) => (
        <group key={index}>
          {/* Arm body */}
          <mesh
            position={[arm.position.x, 0, arm.position.z]}
            rotation={[0, arm.rotation, 0]}
          >
            <boxGeometry args={[ARM_WIDTH, 0.06, ARM_LENGTH]} />
            <meshStandardMaterial
              color={casingColor}
              metalness={0.3}
              roughness={0.7}
            />
          </mesh>

          {/* Port indicator */}
          <mesh
            position={[
              arm.position.x * 1.8,
              0,
              arm.position.z * 1.8,
            ]}
          >
            <sphereGeometry args={[0.025, 16, 16]} />
            <meshStandardMaterial
              color={data.ports[index]?.isOccupied ? '#3b82f6' : '#4ade80'}
              metalness={0.5}
              roughness={0.5}
            />
          </mesh>
        </group>
      ))}

      {/* Selection outline */}
      {(isSelected || isHovered) && (
        <mesh>
          <cylinderGeometry
            args={[CONNECTOR_SIZE / 2 + 0.05, CONNECTOR_SIZE / 2 + 0.05, 0.12, 16]}
          />
          <meshBasicMaterial
            color={isSelected ? SELECTION_HIGHLIGHT_COLOR : '#60a5fa'}
            transparent
            opacity={0.3}
            depthWrite={false}
          />
        </mesh>
      )}

      {/* Connector type label (for debugging) */}
      {/* Consider adding Text component from @react-three/drei for labels */}
    </group>
  )
})

export default Connector3D
