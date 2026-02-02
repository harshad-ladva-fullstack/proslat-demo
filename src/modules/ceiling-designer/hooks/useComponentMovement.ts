/**
 * Movement Controls Hook
 * 
 * Provides drag-based movement for components in the 3D canvas.
 * 
 * KEY FEATURES:
 * - Validates movement in real-time
 * - Shows preview positions during drag
 * - Commits on release, cancels on escape
 * - Supports both single and group movement
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import type { ThreeEvent } from '@react-three/fiber'
import { useConnectionGraphStore } from '../store/connection-graph-store'
import { SelectionMode } from '../types/movement'

// ============================================================================
// TYPES
// ============================================================================

interface UseComponentMovementOptions {
  /** Component ID to control */
  componentId: string
  /** Whether group movement is enabled */
  enableGroupMove?: boolean
  /** Callback when movement starts */
  onMoveStart?: () => void
  /** Callback when movement ends */
  onMoveEnd?: (success: boolean) => void
}

interface UseComponentMovementResult {
  /** Whether this component is currently being moved */
  isMoving: boolean
  /** Whether movement is valid at current position */
  isValidPosition: boolean
  /** Error message if position is invalid */
  errorMessage: string | null
  /** Handler for pointer down */
  onPointerDown: (e: ThreeEvent<PointerEvent>) => void
  /** Handler for pointer move */
  onPointerMove: (e: ThreeEvent<PointerEvent>) => void
  /** Handler for pointer up */
  onPointerUp: (e: ThreeEvent<PointerEvent>) => void
  /** Preview position (if moving) */
  previewPosition: { x: number; z: number } | null
}

// ============================================================================
// HOOK
// ============================================================================

export function useComponentMovement({
  componentId,
  enableGroupMove = false,
  onMoveStart,
  onMoveEnd,
}: UseComponentMovementOptions): UseComponentMovementResult {
  const [isDragging, setIsDragging] = useState(false)
  const [previewPosition, setPreviewPosition] = useState<{ x: number; z: number } | null>(null)
  
  // Store refs for drag calculation
  const dragStartRef = useRef<{ x: number; z: number } | null>(null)
  const componentStartRef = useRef<{ x: number; z: number } | null>(null)
  
  // Store actions
  const startMove = useConnectionGraphStore((state) => state.startMove)
  const updateMovePreview = useConnectionGraphStore((state) => state.updateMovePreview)
  const commitMove = useConnectionGraphStore((state) => state.commitMove)
  const cancelMove = useConnectionGraphStore((state) => state.cancelMove)
  const canMove = useConnectionGraphStore((state) => state.canMove)
  const isStoreMoving = useConnectionGraphStore((state) => state.isMoving)
  const moveValidation = useConnectionGraphStore((state) => state.moveValidation)
  const currentSelection = useConnectionGraphStore((state) => state.currentSelection)
  const getComponent = useConnectionGraphStore((state) => state.getComponent)
  
  // Check if this component is part of the current movement
  const isPartOfSelection = currentSelection?.componentIds.includes(componentId) ?? false
  const isMoving = isDragging && isPartOfSelection && isStoreMoving
  
  // Get validation state
  const isValidPosition = moveValidation?.isValid ?? true
  const errorMessage = moveValidation?.errors?.[0] ?? null
  
  // Handle pointer down - start drag
  const onPointerDown = useCallback((e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    
    // Check if component can be moved
    const moveCheck = canMove(componentId)
    if (!moveCheck.canMove && !enableGroupMove) {
      console.log('Component cannot be moved individually:', moveCheck.reason)
      return
    }
    
    // Get component position
    const component = getComponent(componentId)
    if (!component) return
    
    // Store starting positions
    dragStartRef.current = { x: e.point.x, z: e.point.z }
    componentStartRef.current = { x: component.worldPosition.x, z: component.worldPosition.z }
    
    // Start the move in store
    const useGroupMove = enableGroupMove || moveCheck.type === 'group'
    const started = startMove(componentId, useGroupMove)
    
    if (started) {
      setIsDragging(true)
      onMoveStart?.()
      
      // Capture pointer for drag
      ;(e.target as HTMLElement)?.setPointerCapture?.(e.nativeEvent.pointerId)
    }
  }, [componentId, canMove, startMove, getComponent, enableGroupMove, onMoveStart])
  
  // Handle pointer move - update preview
  const onPointerMove = useCallback((e: ThreeEvent<PointerEvent>) => {
    if (!isDragging || !dragStartRef.current || !componentStartRef.current) return
    
    e.stopPropagation()
    
    // Calculate delta
    const deltaX = e.point.x - dragStartRef.current.x
    const deltaZ = e.point.z - dragStartRef.current.z
    
    // Update preview position
    setPreviewPosition({
      x: componentStartRef.current.x + deltaX,
      z: componentStartRef.current.z + deltaZ,
    })
    
    // Update store with movement preview
    updateMovePreview(deltaX, deltaZ)
  }, [isDragging, updateMovePreview])
  
  // Handle pointer up - commit or cancel
  const onPointerUp = useCallback((e: ThreeEvent<PointerEvent>) => {
    if (!isDragging) return
    
    e.stopPropagation()
    
    // Release pointer
    ;(e.target as HTMLElement)?.releasePointerCapture?.(e.nativeEvent.pointerId)
    
    // Commit or cancel based on validation
    const success = commitMove()
    
    setIsDragging(false)
    setPreviewPosition(null)
    dragStartRef.current = null
    componentStartRef.current = null
    
    onMoveEnd?.(success)
  }, [isDragging, commitMove, onMoveEnd])
  
  // Handle escape key to cancel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isDragging) {
        cancelMove()
        setIsDragging(false)
        setPreviewPosition(null)
        dragStartRef.current = null
        componentStartRef.current = null
        onMoveEnd?.(false)
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isDragging, cancelMove, onMoveEnd])
  
  return {
    isMoving,
    isValidPosition,
    errorMessage,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    previewPosition,
  }
}

// ============================================================================
// SELECTION HANDLERS
// ============================================================================

export function useSelectionHandlers() {
  const selectComponent = useConnectionGraphStore((state) => state.selectComponent)
  const selectGroup = useConnectionGraphStore((state) => state.selectGroup)
  const clearSelection = useConnectionGraphStore((state) => state.clearSelection)
  const currentSelection = useConnectionGraphStore((state) => state.currentSelection)
  
  /**
   * Handle click on a component.
   * Shift+click selects group, regular click selects single.
   */
  const handleComponentClick = useCallback((componentId: string, shiftKey: boolean) => {
    if (shiftKey) {
      selectGroup(componentId)
    } else {
      selectComponent(componentId)
    }
  }, [selectComponent, selectGroup])
  
  /**
   * Handle click on empty space.
   */
  const handleBackgroundClick = useCallback(() => {
    clearSelection()
  }, [clearSelection])
  
  return {
    handleComponentClick,
    handleBackgroundClick,
    currentSelection,
    isGroupSelection: currentSelection?.mode === SelectionMode.GROUP,
  }
}

export default useComponentMovement
