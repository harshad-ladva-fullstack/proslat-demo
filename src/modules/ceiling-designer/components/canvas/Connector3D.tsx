/**
 * Connector 3D Model
 * 
 * Three.js mesh component for rendering connector components.
 * Supports various connector types (L, T, Cross, Y, etc.)
 * Supports dragging to reposition on the ceiling.
 */

import { memo, useRef, useMemo, useState, useCallback } from 'react'
import { useThree } from '@react-three/fiber'
import { Mesh, Raycaster, Plane, Vector3 } from 'three'
import type { Connector as ConnectorType, CeilingDesignerState } from '../../types'
import { CASING_COLOR_VALUES, SELECTION_HIGHLIGHT_COLOR, CEILING_HEIGHT } from '../../constants'
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

const CONNECTOR_SIZE = 0.15 // Size of connector body
const ARM_LENGTH = 0.1 // Length of connector arms
const ARM_WIDTH = 0.06 // Width of connector arms

// ============================================================================
// COMPONENT
// ============================================================================

export const Connector3D = memo(function Connector3D({ data }: Connector3DProps) {
  const meshRef = useRef<Mesh>(null)
  
  const { camera, gl } = useThree()
  const [isDragging, setIsDragging] = useState(false)

  const selectComponent = useCeilingDesignerStore((state: CeilingDesignerState) => state.selectComponent)
  const hoverComponent = useCeilingDesignerStore((state: CeilingDesignerState) => state.hoverComponent)
  const startDragPlacedComponent = useCeilingDesignerStore((state: CeilingDesignerState) => state.startDragPlacedComponent)
  const updatePlacedComponentPosition = useCeilingDesignerStore((state: CeilingDesignerState) => state.updatePlacedComponentPosition)
  const endDragPlacedComponent = useCeilingDesignerStore((state: CeilingDesignerState) => state.endDragPlacedComponent)
  const selectedId = useCeilingDesignerStore((state: CeilingDesignerState) => state.selection.selectedComponentId)
  const hoveredId = useCeilingDesignerStore((state: CeilingDesignerState) => state.selection.hoveredComponentId)

  const isSelected = selectedId === data.id
  const isHovered = hoveredId === data.id

  // Ceiling plane for raycasting during drag
  const ceilingPlane = useMemo(() => new Plane(new Vector3(0, -1, 0), CEILING_HEIGHT), [])
  const raycaster = useMemo(() => new Raycaster(), [])

  // Material colors
  const casingColor = CASING_COLOR_VALUES[data.casingColor]

  const handleClick = (e: any) => {
    e.stopPropagation()
    if (!isDragging) {
      selectComponent(data.id)
    }
  }

  const handlePointerOver = (e: any) => {
    e.stopPropagation()
    hoverComponent(data.id)
    document.body.style.cursor = 'grab'
  }

  const handlePointerOut = () => {
    if (!isDragging) {
      hoverComponent(null)
      document.body.style.cursor = 'auto'
    }
  }

  const handlePointerDown = useCallback((e: any) => {
    e.stopPropagation()
    setIsDragging(true)
    startDragPlacedComponent(data.id)
    document.body.style.cursor = 'grabbing'
    
    // Track the current dragged position
    let currentDragPosition = { x: data.position.x, y: CEILING_HEIGHT, z: data.position.z }
    
    const handleMouseMove = (event: MouseEvent) => {
      const rect = gl.domElement.getBoundingClientRect()
      const x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      const y = -((event.clientY - rect.top) / rect.height) * 2 + 1
      
      raycaster.setFromCamera({ x, y }, camera)
      const intersection = new Vector3()
      raycaster.ray.intersectPlane(ceilingPlane, intersection)
      
      if (intersection) {
        currentDragPosition = {
          x: intersection.x,
          y: CEILING_HEIGHT,
          z: intersection.z,
        }
        updatePlacedComponentPosition(currentDragPosition)
      }
    }
    
    const handleMouseUp = () => {
      setIsDragging(false)
      endDragPlacedComponent(currentDragPosition)
      document.body.style.cursor = 'auto'
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
    
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }, [data.id, data.position, camera, gl, raycaster, ceilingPlane, startDragPlacedComponent, updatePlacedComponentPosition, endDragPlacedComponent])

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
        onPointerDown={handlePointerDown}
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
