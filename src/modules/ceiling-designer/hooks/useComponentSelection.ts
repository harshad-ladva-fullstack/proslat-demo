/**
 * useComponentSelection Hook
 * 
 * Custom hook for managing component selection in the ceiling designer.
 */

import { useCallback, useEffect } from 'react'
import { useCeilingDesignerStore } from '../store'

export function useComponentSelection() {
  const {
    selection,
    selectComponent,
    hoverComponent,
    toggleMultiSelect,
    clearSelection,
    getSelectedComponent,
    removeComponent,
  } = useCeilingDesignerStore()

  // Select a component
  const handleSelect = useCallback(
    (id: string | null) => {
      selectComponent(id)
    },
    [selectComponent]
  )

  // Hover over a component
  const handleHover = useCallback(
    (id: string | null) => {
      hoverComponent(id)
    },
    [hoverComponent]
  )

  // Toggle multi-select (with Shift/Ctrl)
  const handleMultiSelect = useCallback(
    (id: string) => {
      toggleMultiSelect(id)
    },
    [toggleMultiSelect]
  )

  // Clear selection
  const handleClearSelection = useCallback(() => {
    clearSelection()
  }, [clearSelection])

  // Delete selected component
  const handleDeleteSelected = useCallback(() => {
    if (selection.selectedComponentId) {
      removeComponent(selection.selectedComponentId)
    }
  }, [selection.selectedComponentId, removeComponent])

  // Handle keyboard shortcuts for selection
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Delete key to remove selected component
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selection.selectedComponentId) {
          handleDeleteSelected()
        }
      }

      // Escape to clear selection
      if (e.key === 'Escape') {
        handleClearSelection()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selection.selectedComponentId, handleDeleteSelected, handleClearSelection])

  return {
    selectedId: selection.selectedComponentId,
    hoveredId: selection.hoveredComponentId,
    multiSelectIds: selection.multiSelectIds,
    selectedComponent: getSelectedComponent(),
    handleSelect,
    handleHover,
    handleMultiSelect,
    handleClearSelection,
    handleDeleteSelected,
  }
}

export default useComponentSelection
