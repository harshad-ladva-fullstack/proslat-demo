/**
 * useCeilingDragDrop Hook
 * 
 * Custom hook for handling drag and drop operations in the ceiling designer.
 * Manages the interaction between the sidebar catalog and the 3D canvas.
 */

import { useCallback, useEffect } from 'react'
import { useCeilingDesignerStore } from '../store'
import type { CatalogItem, Position3D } from '../types'

interface UseCeilingDragDropOptions {
  onDropSuccess?: (component: unknown) => void
  onDropError?: (error: Error) => void
}

export function useCeilingDragDrop(options: UseCeilingDragDropOptions = {}) {
  const {
    drag,
    startDrag,
    updateDragPosition,
    endDrag,
    cancelDrag,
    setSnapTarget,
  } = useCeilingDesignerStore()

  // Start dragging a catalog item
  const handleDragStart = useCallback(
    (catalogItem: CatalogItem) => {
      startDrag(catalogItem)
    },
    [startDrag]
  )

  // Update position during drag
  const handleDragMove = useCallback(
    (position: Position3D) => {
      if (drag.isDragging) {
        updateDragPosition(position)
      }
    },
    [drag.isDragging, updateDragPosition]
  )

  // End drag and place component
  const handleDragEnd = useCallback(
    (dropPosition: Position3D | null) => {
      try {
        endDrag(dropPosition)
        if (dropPosition && options.onDropSuccess) {
          options.onDropSuccess({ position: dropPosition })
        }
      } catch (error) {
        if (options.onDropError) {
          options.onDropError(error as Error)
        }
        cancelDrag()
      }
    },
    [endDrag, cancelDrag, options]
  )

  // Cancel drag operation
  const handleDragCancel = useCallback(() => {
    cancelDrag()
  }, [cancelDrag])

  // Handle keyboard escape to cancel drag
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && drag.isDragging) {
        handleDragCancel()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [drag.isDragging, handleDragCancel])

  return {
    isDragging: drag.isDragging,
    draggedItem: drag.draggedCatalogItem,
    currentPosition: drag.currentPosition,
    snapTarget: drag.snapTarget,
    handleDragStart,
    handleDragMove,
    handleDragEnd,
    handleDragCancel,
    setSnapTarget,
  }
}

export default useCeilingDragDrop
