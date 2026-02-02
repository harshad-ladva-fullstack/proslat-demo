/**
 * Hubs Tab
 * 
 * Displays available hub components for selection and drag-drop.
 */

import { memo } from 'react'
import { ComponentCard } from './ComponentCard'
import { HUB_CATALOG } from '../../constants'
import type { HubCatalogItem } from '../../types'

export const HubsTab = memo(function HubsTab() {
  return (
    <div className="space-y-2">
      {HUB_CATALOG.map((item: HubCatalogItem) => (
        <ComponentCard key={item.id} item={item} />
      ))}
    </div>
  )
})
