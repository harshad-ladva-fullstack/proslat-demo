/**
 * Component Card
 * 
 * Reusable card component for displaying catalog items in the sidebar.
 * Supports drag-and-drop functionality.
 * Professional white theme styling.
 */

import { memo } from 'react'
import { GripVertical, Zap, Lightbulb, Cable } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CatalogItem, CeilingDesignerState } from '../../types'
import {
  isLightBarCatalogItem,
  isHubCatalogItem,
  isConnectorCatalogItem,
} from '../../types'
import { useCeilingDesignerStore } from '../../store'
import { formatPrice } from '../../utils'

// ============================================================================
// TYPES
// ============================================================================

interface ComponentCardProps {
  item: CatalogItem
  isSelected?: boolean
  onSelect?: () => void
}

// ============================================================================
// COMPONENT
// ============================================================================

export const ComponentCard = memo(function ComponentCard({
  item,
  isSelected = false,
  onSelect,
}: ComponentCardProps) {
  const startDrag = useCeilingDesignerStore((state: CeilingDesignerState) => state.startDrag)

  // Determine icon based on item type
  const renderIcon = () => {
    if (isLightBarCatalogItem(item)) {
      return <Lightbulb className="size-5 text-amber-500" />
    }
    if (isHubCatalogItem(item)) {
      return <Zap className="size-5 text-blue-500" />
    }
    if (isConnectorCatalogItem(item)) {
      return <Cable className="size-5 text-emerald-500" />
    }
    return null
  }

  // Get icon background color
  const getIconBgColor = () => {
    if (isLightBarCatalogItem(item)) return 'bg-amber-50'
    if (isHubCatalogItem(item)) return 'bg-blue-50'
    if (isConnectorCatalogItem(item)) return 'bg-emerald-50'
    return 'bg-gray-100'
  }

  // Render specs based on item type
  const renderSpecs = () => {
    if (isLightBarCatalogItem(item)) {
      return (
        <span className="text-xs text-gray-500">
          {item.watts}W • {item.lumens} lumens
        </span>
      )
    }
    if (isHubCatalogItem(item)) {
      return (
        <span className="text-xs text-gray-500">
          {item.portCount} ports • Max {item.maxWireLength}ft wire
        </span>
      )
    }
    if (isConnectorCatalogItem(item)) {
      return (
        <span className="text-xs text-gray-500">
          {item.portCount} ports • Max {item.maxWireLength}ft wire
        </span>
      )
    }
    return null
  }

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = 'copy'
    e.dataTransfer.setData('application/json', JSON.stringify(item))
    startDrag(item)
  }

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onClick={onSelect}
      className={cn(
        'flex items-center gap-3 p-3 rounded-xl cursor-grab active:cursor-grabbing',
        'border bg-white shadow-sm',
        'hover:shadow-md hover:border-gray-300 hover:bg-gray-50',
        'transition-all duration-150',
        isSelected 
          ? 'border-blue-400 bg-blue-50 ring-2 ring-blue-100' 
          : 'border-gray-200'
      )}
    >
      {/* Drag Handle */}
      <div className="flex-shrink-0 text-gray-400 hover:text-gray-600">
        <GripVertical className="size-4" />
      </div>

      {/* Icon */}
      <div className={cn('flex-shrink-0 p-2 rounded-lg', getIconBgColor())}>
        {renderIcon()}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <h4 className="text-sm font-medium text-gray-900 truncate">
            {item.name}
          </h4>
          <span className="flex-shrink-0 text-sm font-semibold text-emerald-600">
            {formatPrice(item.price)}
          </span>
        </div>
        <div className="mt-0.5">{renderSpecs()}</div>
      </div>
    </div>
  )
})
