/**
 * useConnectionValidation Hook
 * 
 * Custom hook for validating and managing connections between components.
 */

import { useCallback, useMemo } from 'react'
import { useCeilingDesignerStore } from '../store'
import {
  isWithinSnapDistance,
  validatePlacement,
  getWireLengthStatus,
} from '../utils'
import { MAX_WIRE_LENGTH_PER_HUB } from '../constants'
import type { CeilingComponent, ConnectionPort, Position3D, Hub } from '../types'
import { isHub, isLightBar } from '../types'

export function useConnectionValidation() {
  const { components, connections, validateAndConnect, removeConnection } =
    useCeilingDesignerStore()

  // Find nearby connectable ports
  const findNearbyPorts = useCallback(
    (position: Position3D, excludeId?: string) => {
      const nearbyPorts: Array<{
        component: CeilingComponent
        port: ConnectionPort
        distance: number
      }> = []

      for (const component of components) {
        if (component.id === excludeId) continue

        for (const port of component.ports || []) {
          if (port.isOccupied) continue

          const portWorldPosition = {
            x: component.position.x + port.position.x,
            y: component.position.y + port.position.y,
            z: component.position.z + port.position.z,
          }

          if (isWithinSnapDistance(position, portWorldPosition)) {
            const distance = Math.sqrt(
              Math.pow(position.x - portWorldPosition.x, 2) +
                Math.pow(position.y - portWorldPosition.y, 2) +
                Math.pow(position.z - portWorldPosition.z, 2)
            )

            nearbyPorts.push({
              component,
              port,
              distance,
            })
          }
        }
      }

      // Sort by distance
      return nearbyPorts.sort((a, b) => a.distance - b.distance)
    },
    [components]
  )

  // Validate a potential connection
  const validateConnection = useCallback(
    (
      sourceComponent: CeilingComponent,
      sourcePort: ConnectionPort,
      targetComponent: CeilingComponent,
      targetPort: ConnectionPort
    ) => {
      const errors: string[] = []

      // Check if ports are already occupied
      if (sourcePort.isOccupied) {
        errors.push('Source port is already connected')
      }
      if (targetPort.isOccupied) {
        errors.push('Target port is already connected')
      }

      // Check wire length limits for light bar connections to hub
      if (isLightBar(sourceComponent) && isHub(targetComponent)) {
        const status = getWireLengthStatus(components, targetComponent.id)
        const additionalLength = sourceComponent.length / 12 // Convert to feet
        if (status.currentLength + additionalLength > MAX_WIRE_LENGTH_PER_HUB) {
          errors.push(
            `Adding this light bar would exceed the ${MAX_WIRE_LENGTH_PER_HUB}ft wire limit`
          )
        }
      }

      return {
        isValid: errors.length === 0,
        errors,
      }
    },
    [components]
  )

  // Attempt to create a connection
  const tryConnect = useCallback(
    (
      sourceId: string,
      sourcePortId: string,
      targetId: string,
      targetPortId: string
    ) => {
      return validateAndConnect(sourceId, sourcePortId, targetId, targetPortId)
    },
    [validateAndConnect]
  )

  // Get wire length status for all hubs
  const hubWireStatuses = useMemo(() => {
    const hubs = components.filter(isHub) as Hub[]
    return hubs.map((hub: Hub) => ({
      hubId: hub.id,
      status: getWireLengthStatus(components, hub.id),
    }))
  }, [components])

  // Check if adding a component would be valid
  const canAddComponent = useCallback(
    (component: CeilingComponent) => {
      return validatePlacement(component, components, connections)
    },
    [components, connections]
  )

  return {
    findNearbyPorts,
    validateConnection,
    tryConnect,
    hubWireStatuses,
    canAddComponent,
    removeConnection,
  }
}

export default useConnectionValidation
