/**
 * Light Bars Tab
 * 
 * Displays available light bar components for selection and drag-drop.
 */

import { memo } from 'react'
import { ComponentCard } from './ComponentCard'
import { LIGHT_BAR_CATALOG } from '../../constants'
import type { LightBarCatalogItem } from '../../types'

export const LightBarsTab = memo(function LightBarsTab() {
  return (
    <div className="space-y-2">
      {LIGHT_BAR_CATALOG.map((item: LightBarCatalogItem) => (
        <ComponentCard key={item.id} item={item} />
      ))}
    </div>
  )
})
