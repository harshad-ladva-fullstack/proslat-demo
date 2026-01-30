/**
 * Ceiling Plane
 * 
 * The main ceiling surface where components are placed.
 * Handles drop events for drag-and-drop functionality.
 */

import { memo, useRef } from 'react'
import { Mesh } from 'three'
import * as THREE from 'three'
import { Grid } from '@react-three/drei'
import type { CeilingDesignerState } from '../../types'
import { useCeilingDesignerStore, useCanvas } from '../../store'
import {
  ROOM_DIMENSIONS,
  CEILING_HEIGHT,
  GRID_CELL_SIZE,
} from '../../constants'

// ============================================================================
// COMPONENT
// ============================================================================

export const CeilingPlane = memo(function CeilingPlane() {
  const meshRef = useRef<Mesh>(null)
  const canvasState = useCanvas()

  const endDrag = useCeilingDesignerStore((state: CeilingDesignerState) => state.endDrag)
  const drag = useCeilingDesignerStore((state: CeilingDesignerState) => state.drag)
  const clearSelection = useCeilingDesignerStore((state: CeilingDesignerState) => state.clearSelection)

  const handleClick = (e: any) => {
    // Clear selection when clicking on empty ceiling
    if (!e.stopped) {
      clearSelection()
    }
  }

  const handlePointerMove = (e: any) => {
    if (drag.isDragging && e.point) {
      useCeilingDesignerStore.getState().updateDragPosition({
        x: e.point.x,
        y: CEILING_HEIGHT,
        z: e.point.z,
      })
    }
  }

  const handlePointerUp = (e: any) => {
    if (drag.isDragging && e.point) {
      endDrag({
        x: e.point.x,
        y: CEILING_HEIGHT,
        z: e.point.z,
      })
    }
  }

  return (
    <group position={[0, CEILING_HEIGHT, 0]}>
      {/* Ceiling surface - clearly visible from bottom-to-top view */}
      <mesh
        ref={meshRef}
        rotation={[-Math.PI / 2, 0, 0]}
        onClick={handleClick}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        receiveShadow
      >
        <planeGeometry args={[ROOM_DIMENSIONS.width, ROOM_DIMENSIONS.depth]} />
        <meshStandardMaterial
          color="#ffffff"
          metalness={0.02}
          roughness={0.98}
          transparent
          opacity={0.85}
          side={2}
        />
      </mesh>
      
      {/* Ceiling border outline for clear boundary definition */}
      <lineSegments rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
        <edgesGeometry args={[new THREE.PlaneGeometry(ROOM_DIMENSIONS.width, ROOM_DIMENSIONS.depth)]} />
        <lineBasicMaterial color="#64748b" linewidth={2} />
      </lineSegments>

      {/* Grid overlay - visible from below */}
      {canvasState.gridVisible && (
        <Grid
          position={[0, -0.02, 0]}
          args={[ROOM_DIMENSIONS.width, ROOM_DIMENSIONS.depth]}
          cellSize={GRID_CELL_SIZE}
          cellThickness={0.8}
          cellColor="#94a3b8"
          sectionSize={3}
          sectionThickness={1.5}
          sectionColor="#64748b"
          fadeDistance={50}
          fadeStrength={1}
          followCamera={false}
          infiniteGrid={false}
          side={2}
        />
      )}
    </group>
  )
})

export default CeilingPlane
