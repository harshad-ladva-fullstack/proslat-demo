/**
 * Ghost Preview
 * 
 * Shows a preview of the component being dragged before placement.
 */

import { memo, useMemo } from 'react'
import { useDrag } from '../../store'
import {
  isLightBarCatalogItem,
  isHubCatalogItem,
  isConnectorCatalogItem,
} from '../../types'
import { CEILING_HEIGHT } from '../../constants'

// ============================================================================
// COMPONENT
// ============================================================================

export const GhostPreview = memo(function GhostPreview() {
  const drag = useDrag()

  const { isDragging, draggedCatalogItem, currentPosition, snapTarget } = drag

  // Determine the size based on catalog item type
  // This hook must be called unconditionally (before any returns)
  const geometry = useMemo(() => {
    if (!draggedCatalogItem) {
      return { type: 'box', args: [0.5, 0.1, 0.5] as [number, number, number] }
    }
    if (isLightBarCatalogItem(draggedCatalogItem)) {
      const length = draggedCatalogItem.length / 12 // Convert inches to feet
      return { type: 'box', args: [length, 0.08, 0.12] as [number, number, number] }
    }
    if (isHubCatalogItem(draggedCatalogItem)) {
      return { type: 'cylinder', args: [0.15, 0.15, 0.1, 32] as [number, number, number, number] }
    }
    if (isConnectorCatalogItem(draggedCatalogItem)) {
      return { type: 'cylinder', args: [0.075, 0.075, 0.08, 16] as [number, number, number, number] }
    }
    return { type: 'box', args: [0.5, 0.1, 0.5] as [number, number, number] }
  }, [draggedCatalogItem])

  // Don't render if not dragging or no position (AFTER all hooks)
  if (!isDragging || !currentPosition || !draggedCatalogItem) {
    return null
  }

  const position = snapTarget?.position || currentPosition
  const isSnapped = snapTarget?.isValid

  return (
    <group position={[position.x, CEILING_HEIGHT, position.z]}>
      {/* Ghost mesh */}
      <mesh>
        {geometry.type === 'box' ? (
          <boxGeometry args={geometry.args as [number, number, number]} />
        ) : (
          <cylinderGeometry args={geometry.args as [number, number, number, number]} />
        )}
        <meshStandardMaterial
          color={isSnapped ? '#22c55e' : '#3b82f6'}
          transparent
          opacity={0.5}
          depthWrite={false}
        />
      </mesh>

      {/* Outline */}
      <mesh>
        {geometry.type === 'box' ? (
          <boxGeometry
            args={[
              (geometry.args as [number, number, number])[0] + 0.02,
              (geometry.args as [number, number, number])[1] + 0.02,
              (geometry.args as [number, number, number])[2] + 0.02,
            ]}
          />
        ) : (
          <cylinderGeometry
            args={[
              (geometry.args as [number, number, number, number])[0] + 0.02,
              (geometry.args as [number, number, number, number])[1] + 0.02,
              (geometry.args as [number, number, number, number])[2] + 0.02,
              (geometry.args as [number, number, number, number])[3],
            ]}
          />
        )}
        <meshBasicMaterial
          color={isSnapped ? '#22c55e' : '#3b82f6'}
          wireframe
        />
      </mesh>
    </group>
  )
})

export default GhostPreview
