/**
 * Component Renderer
 * 
 * Renders all placed ceiling components based on their type.
 */

import { memo } from 'react'
import { useComponents } from '../../store'
import type { CeilingComponent } from '../../types'
import { isLightBar, isHub, isConnector } from '../../types'
import { LightBar3D } from './LightBar3D'
import { Hub3D } from './Hub3D'
import { Connector3D } from './Connector3D'

// ============================================================================
// COMPONENT
// ============================================================================

export const ComponentRenderer = memo(function ComponentRenderer() {
  const components = useComponents()

  return (
    <group>
      {components.map((component: CeilingComponent) => {
        if (isLightBar(component)) {
          return <LightBar3D key={component.id} data={component} />
        }
        if (isHub(component)) {
          return <Hub3D key={component.id} data={component} />
        }
        if (isConnector(component)) {
          return <Connector3D key={component.id} data={component} />
        }
        return null
      })}
    </group>
  )
})

export default ComponentRenderer
