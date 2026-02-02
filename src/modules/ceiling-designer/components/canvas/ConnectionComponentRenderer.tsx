/**
 * Connection-Based Component Renderer
 * 
 * Renders components based on the connection graph.
 * Positions and rotations are DERIVED from connections, not free-placed.
 * 
 * This replaces the old free-placement ComponentRenderer.
 */

import { memo } from 'react'
import { useComponents } from '../../store/connection-graph-store'
import type { Component } from '../../types/connection-graph'
import {
  isHubComponent,
  isLightBarComponent,
  isConnectorComponent,
} from '../../types/connection-graph'
import { ConnectionHub3D } from './ConnectionHub3D'
import { ConnectionLightBar3D } from './ConnectionLightBar3D'
import { ConnectionConnector3D } from './ConnectionConnector3D'
import { ComponentPorts } from './PortVisualizer'

// ============================================================================
// COMPONENT
// ============================================================================

export const ConnectionComponentRenderer = memo(function ConnectionComponentRenderer() {
  const components = useComponents()

  return (
    <group>
      {components.map((component: Component) => {
        if (isHubComponent(component)) {
          return (
            <group key={component.id}>
              <ConnectionHub3D data={component} />
              <ComponentPorts
                ports={component.ports}
                componentWorldPosition={component.worldPosition}
                componentWorldRotation={component.worldRotation}
              />
            </group>
          )
        }
        if (isLightBarComponent(component)) {
          return (
            <group key={component.id}>
              <ConnectionLightBar3D data={component} />
              <ComponentPorts
                ports={component.ports}
                componentWorldPosition={component.worldPosition}
                componentWorldRotation={component.worldRotation}
              />
            </group>
          )
        }
        if (isConnectorComponent(component)) {
          return (
            <group key={component.id}>
              <ConnectionConnector3D data={component} />
              <ComponentPorts
                ports={component.ports}
                componentWorldPosition={component.worldPosition}
                componentWorldRotation={component.worldRotation}
              />
            </group>
          )
        }
        return null
      })}
    </group>
  )
})

export default ConnectionComponentRenderer
