/**
 * Room Dimension Editor Component
 * 
 * Allows editing room dimensions while in ceiling design mode.
 * 
 * KEY FEATURES:
 * - Live updates to ceiling bounds
 * - Warns if resize would affect existing components
 * - Does NOT auto-delete components
 * - Validates dimensions before applying
 */

import { memo, useState, useCallback, useEffect } from 'react'
import { Ruler, AlertTriangle, Check, X, Settings2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useProjectStore, useCurrentRoom } from '@/store/useProjectStore'
import { useConnectionGraphStore } from '@/modules/ceiling-designer/store/connection-graph-store'
import { MIN_ROOM_DIMENSIONS, MAX_ROOM_DIMENSIONS } from '@/types/room'

// ============================================================================
// TYPES
// ============================================================================

interface RoomDimensionEditorProps {
  /** Optional callback when dimensions change */
  onDimensionsChange?: (width: number, depth: number, height: number) => void
}

interface DimensionInputProps {
  label: string
  value: number
  onChange: (value: number) => void
  min: number
  max: number
  unit?: string
  hasWarning?: boolean
}

// ============================================================================
// DIMENSION INPUT
// ============================================================================

const DimensionInput = memo(function DimensionInput({
  label,
  value,
  onChange,
  min,
  max,
  unit = 'ft',
  hasWarning = false,
}: DimensionInputProps) {
  const [localValue, setLocalValue] = useState(value.toString())
  const [isFocused, setIsFocused] = useState(false)
  
  // Sync local value when prop changes (and not focused)
  useEffect(() => {
    if (!isFocused) {
      setLocalValue(value.toString())
    }
  }, [value, isFocused])
  
  const handleBlur = () => {
    setIsFocused(false)
    const numValue = parseFloat(localValue)
    if (isNaN(numValue)) {
      setLocalValue(value.toString())
      return
    }
    const clampedValue = Math.max(min, Math.min(max, numValue))
    setLocalValue(clampedValue.toString())
    if (clampedValue !== value) {
      onChange(clampedValue)
    }
  }
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleBlur()
    }
    if (e.key === 'Escape') {
      setLocalValue(value.toString())
      setIsFocused(false)
    }
  }
  
  return (
    <div className="flex items-center gap-2">
      <label className="text-xs text-gray-500 w-12">{label}</label>
      <div className="relative">
        <input
          type="number"
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          min={min}
          max={max}
          step={1}
          className={cn(
            "w-16 px-2 py-1 text-sm border rounded-md text-center",
            "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent",
            hasWarning 
              ? "border-amber-400 bg-amber-50" 
              : "border-gray-300 bg-white"
          )}
        />
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">
          {unit}
        </span>
      </div>
    </div>
  )
})

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const RoomDimensionEditor = memo(function RoomDimensionEditor({
  onDimensionsChange,
}: RoomDimensionEditorProps) {
  const currentRoom = useCurrentRoom()
  const updateRoomDimensions = useProjectStore((state) => state.updateRoomDimensions)
  const setCeilingBounds = useConnectionGraphStore((state) => state.setCeilingBounds)
  const checkResizeImpact = useConnectionGraphStore((state) => state.checkResizeImpact)
  const components = useConnectionGraphStore((state) => state.components)
  
  const [isExpanded, setIsExpanded] = useState(false)
  const [pendingChanges, setPendingChanges] = useState<{
    width?: number
    depth?: number
    height?: number
  } | null>(null)
  const [resizeWarning, setResizeWarning] = useState<string | null>(null)
  const [affectedComponentIds, setAffectedComponentIds] = useState<string[]>([])
  
  // Current dimensions
  const width = pendingChanges?.width ?? currentRoom?.dimensions.width ?? 20
  const depth = pendingChanges?.depth ?? currentRoom?.dimensions.depth ?? 20
  const height = pendingChanges?.height ?? currentRoom?.dimensions.height ?? 10
  
  // Check impact when dimensions change
  const checkImpact = useCallback((newWidth: number, newDepth: number) => {
    if (components.length === 0) {
      setResizeWarning(null)
      setAffectedComponentIds([])
      return
    }
    
    const impact = checkResizeImpact(newWidth, newDepth)
    
    if (!impact.isValid) {
      setResizeWarning(impact.warnings.join('. '))
      setAffectedComponentIds(impact.affectedComponents)
    } else {
      setResizeWarning(null)
      setAffectedComponentIds([])
    }
  }, [checkResizeImpact, components.length])
  
  // Handle dimension change
  const handleDimensionChange = useCallback((dimension: 'width' | 'depth' | 'height', value: number) => {
    const newChanges = {
      ...pendingChanges,
      [dimension]: value,
    }
    setPendingChanges(newChanges)
    
    // Check impact for width/depth changes
    if (dimension === 'width' || dimension === 'depth') {
      const checkWidth = newChanges.width ?? currentRoom?.dimensions.width ?? 20
      const checkDepth = newChanges.depth ?? currentRoom?.dimensions.depth ?? 20
      checkImpact(checkWidth, checkDepth)
    }
  }, [pendingChanges, currentRoom?.dimensions, checkImpact])
  
  // Apply changes
  const applyChanges = useCallback(() => {
    if (!pendingChanges || !currentRoom) return
    
    // Update room dimensions in project store
    const result = updateRoomDimensions(pendingChanges)
    
    if (!result.success) {
      console.error('Failed to update room dimensions:', result.error)
      return
    }
    
    // Update ceiling bounds in connection graph store
    const newWidth = pendingChanges.width ?? currentRoom.dimensions.width
    const newDepth = pendingChanges.depth ?? currentRoom.dimensions.depth
    
    setCeilingBounds({
      minX: 0,
      maxX: newWidth,
      minZ: 0,
      maxZ: newDepth,
    })
    
    // Notify parent
    if (onDimensionsChange) {
      onDimensionsChange(
        newWidth,
        newDepth,
        pendingChanges.height ?? currentRoom.dimensions.height
      )
    }
    
    // Clear pending changes
    setPendingChanges(null)
    setResizeWarning(null)
    setAffectedComponentIds([])
  }, [pendingChanges, currentRoom, updateRoomDimensions, setCeilingBounds, onDimensionsChange])
  
  // Cancel changes
  const cancelChanges = useCallback(() => {
    setPendingChanges(null)
    setResizeWarning(null)
    setAffectedComponentIds([])
  }, [])
  
  if (!currentRoom) {
    return null
  }
  
  const hasPendingChanges = pendingChanges !== null
  const hasWarning = affectedComponentIds.length > 0
  
  return (
    <div className={cn(
      "flex items-center gap-2 px-3 py-2 rounded-lg border transition-all",
      hasWarning 
        ? "bg-amber-50 border-amber-300" 
        : hasPendingChanges 
          ? "bg-blue-50 border-blue-300"
          : "bg-gray-50 border-gray-200"
    )}>
      {/* Toggle button for compact mode */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="p-1 hover:bg-gray-200 rounded transition-colors"
        title={isExpanded ? "Collapse" : "Edit dimensions"}
      >
        <Settings2 className={cn(
          "size-4 transition-transform",
          isExpanded ? "rotate-90" : ""
        )} />
      </button>
      
      <Ruler className="size-4 text-gray-400" />
      
      {isExpanded ? (
        <>
          {/* Editable dimensions */}
          <div className="flex items-center gap-4">
            <DimensionInput
              label="W:"
              value={width}
              onChange={(v) => handleDimensionChange('width', v)}
              min={MIN_ROOM_DIMENSIONS.width}
              max={MAX_ROOM_DIMENSIONS.width}
              hasWarning={affectedComponentIds.length > 0 && pendingChanges?.width !== undefined}
            />
            <DimensionInput
              label="D:"
              value={depth}
              onChange={(v) => handleDimensionChange('depth', v)}
              min={MIN_ROOM_DIMENSIONS.depth}
              max={MAX_ROOM_DIMENSIONS.depth}
              hasWarning={affectedComponentIds.length > 0 && pendingChanges?.depth !== undefined}
            />
            <DimensionInput
              label="H:"
              value={height}
              onChange={(v) => handleDimensionChange('height', v)}
              min={MIN_ROOM_DIMENSIONS.height}
              max={MAX_ROOM_DIMENSIONS.height}
            />
          </div>
          
          {/* Warning */}
          {resizeWarning && (
            <div className="flex items-center gap-1 text-amber-600">
              <AlertTriangle className="size-4" />
              <span className="text-xs">{resizeWarning}</span>
            </div>
          )}
          
          {/* Apply/Cancel buttons */}
          {hasPendingChanges && (
            <div className="flex items-center gap-1 ml-2">
              <button
                onClick={applyChanges}
                className={cn(
                  "p-1 rounded transition-colors",
                  hasWarning 
                    ? "bg-amber-500 hover:bg-amber-600 text-white"
                    : "bg-green-500 hover:bg-green-600 text-white"
                )}
                title={hasWarning ? "Apply anyway" : "Apply changes"}
              >
                <Check className="size-4" />
              </button>
              <button
                onClick={cancelChanges}
                className="p-1 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded transition-colors"
                title="Cancel"
              >
                <X className="size-4" />
              </button>
            </div>
          )}
        </>
      ) : (
        /* Compact read-only display */
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span>
            <span className="font-medium text-gray-900">{currentRoom.dimensions.width}</span>
            <span className="text-gray-400"> ft</span>
          </span>
          <span className="text-gray-300">×</span>
          <span>
            <span className="font-medium text-gray-900">{currentRoom.dimensions.depth}</span>
            <span className="text-gray-400"> ft</span>
          </span>
          <span className="text-gray-300">|</span>
          <span>
            H: <span className="font-medium text-gray-900">{currentRoom.dimensions.height}</span>
            <span className="text-gray-400"> ft</span>
          </span>
        </div>
      )}
    </div>
  )
})

export default RoomDimensionEditor
