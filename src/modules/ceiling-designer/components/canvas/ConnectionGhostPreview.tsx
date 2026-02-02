/**
 * Connection Ghost Preview
 * 
 * Shows a preview of where a component will be placed when connected.
 * The preview position is DERIVED from the target port, not free mouse position.
 * 
 * Visual states:
 * - Green: Valid placement (snapped to port)
 * - Red: Invalid placement (no valid port nearby)
 * - Blue: Dragging but not near a port
 */

import { memo, useMemo } from 'react'
import {
  useConnectionGraphStore,
  useIsDragging,
  useActiveSnapTarget,
  usePlacementValidation,
} from '../../store/connection-graph-store'
import { ComponentType, ValidationState } from '../../types/connection-graph'

// ============================================================================
// CONSTANTS
// ============================================================================

const CEILING_HEIGHT = 10
const INCHES_TO_3D_UNITS = 1 / 12

const COLORS = {
  VALID: '#22c55e',
  INVALID: '#ef4444',
  NEUTRAL: '#3b82f6',
}

// ============================================================================
// COMPONENT
// ============================================================================

export const ConnectionGhostPreview = memo(function ConnectionGhostPreview() {
  const isDragging = useIsDragging()
  const activeSnapTarget = useActiveSnapTarget()
  const placementValidation = usePlacementValidation()
  
  const draggedComponentType = useConnectionGraphStore((state) => state.draggedComponentType)
  const draggedLightBarLength = useConnectionGraphStore((state) => state.draggedLightBarLength)
  // Note: draggedConnectorSubtype is available in store for connector-specific rendering if needed
  const rootHubId = useConnectionGraphStore((state) => state.rootHubId)
  
  // Calculate geometry based on component type
  const geometry = useMemo(() => {
    if (!draggedComponentType) {
      return { type: 'box' as const, args: [0.5, 0.1, 0.5] as [number, number, number] }
    }
    
    switch (draggedComponentType) {
      case ComponentType.HUB:
        return { type: 'cylinder' as const, args: [0.3, 0.3, 0.1, 8] as [number, number, number, number] }
      
      case ComponentType.LIGHT_BAR: {
        const length = (draggedLightBarLength || 36) * INCHES_TO_3D_UNITS
        return { type: 'box' as const, args: [length, 0.06, 0.08] as [number, number, number] }
      }
      
      case ComponentType.CONNECTOR:
        return { type: 'cylinder' as const, args: [0.1, 0.1, 0.08, 16] as [number, number, number, number] }
      
      default:
        return { type: 'box' as const, args: [0.5, 0.1, 0.5] as [number, number, number] }
    }
  }, [draggedComponentType, draggedLightBarLength])
  
  // Don't render if not dragging
  if (!isDragging || !draggedComponentType) {
    return null
  }
  
  // Determine position and color based on validation state
  const isValid = placementValidation?.state === ValidationState.VALID
  const hasPosition = placementValidation?.derivedPosition !== null
  
  // For root hub placement, show at snap target position
  // For other components, show derived position from validation
  let position: [number, number, number]
  let rotation: number = 0
  
  if (rootHubId === null && draggedComponentType === ComponentType.HUB) {
    // Root hub - show at active snap target (which is free placement position)
    if (activeSnapTarget) {
      position = [
        activeSnapTarget.portWorldPosition.x,
        CEILING_HEIGHT,
        activeSnapTarget.portWorldPosition.z,
      ]
    } else {
      // No position yet, don't show preview
      return null
    }
  } else if (hasPosition && placementValidation?.derivedPosition) {
    // Connected component - show at derived position
    position = [
      placementValidation.derivedPosition.x,
      placementValidation.derivedPosition.y,
      placementValidation.derivedPosition.z,
    ]
    rotation = ((placementValidation.derivedRotation || 0) * Math.PI) / 180
  } else if (activeSnapTarget) {
    // Snapped to port but validation pending
    position = [
      activeSnapTarget.portWorldPosition.x,
      CEILING_HEIGHT,
      activeSnapTarget.portWorldPosition.z,
    ]
  } else {
    // No valid position
    return null
  }
  
  const color = isValid ? COLORS.VALID : activeSnapTarget ? COLORS.INVALID : COLORS.NEUTRAL
  
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* Ghost mesh */}
      <mesh>
        {geometry.type === 'box' ? (
          <boxGeometry args={geometry.args as [number, number, number]} />
        ) : (
          <cylinderGeometry args={geometry.args as [number, number, number, number]} />
        )}
        <meshStandardMaterial
          color={color}
          transparent
          opacity={0.5}
          depthWrite={false}
        />
      </mesh>
      
      {/* Wireframe outline */}
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
          color={color}
          wireframe
        />
      </mesh>
      
      {/* Validation indicator */}
      {!isValid && activeSnapTarget && (
        <mesh position={[0, 0.2, 0]}>
          <sphereGeometry args={[0.08, 16, 16]} />
          <meshStandardMaterial
            color={COLORS.INVALID}
            emissive={COLORS.INVALID}
            emissiveIntensity={0.5}
          />
        </mesh>
      )}
      
      {/* Light bar end indicators */}
      {draggedComponentType === ComponentType.LIGHT_BAR && (
        <>
          <mesh position={[-(draggedLightBarLength || 36) * INCHES_TO_3D_UNITS / 2, 0, 0]}>
            <sphereGeometry args={[0.04, 8, 8]} />
            <meshStandardMaterial color={isValid ? '#22c55e' : '#ef4444'} />
          </mesh>
          <mesh position={[(draggedLightBarLength || 36) * INCHES_TO_3D_UNITS / 2, 0, 0]}>
            <sphereGeometry args={[0.04, 8, 8]} />
            <meshStandardMaterial color="#6b7280" />
          </mesh>
        </>
      )}
    </group>
  )
})

export default ConnectionGhostPreview
