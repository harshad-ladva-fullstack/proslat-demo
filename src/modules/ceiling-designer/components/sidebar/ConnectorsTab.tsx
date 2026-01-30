/**
 * Connectors Tab
 * 
 * Displays available connector components for selection and drag-drop.
 */

import { memo } from 'react'
import { ComponentCard } from './ComponentCard'
import { CONNECTOR_CATALOG } from '../../constants'
import type { ConnectorCatalogItem } from '../../types'

export const ConnectorsTab = memo(function ConnectorsTab() {
  return (
    <div className="space-y-2">
      {CONNECTOR_CATALOG.map((item: ConnectorCatalogItem) => (
        <ComponentCard key={item.id} item={item} />
      ))}
    </div>
  )
})
