/**
 * Properties Panel
 * 
 * Right sidebar showing properties of the selected component.
 * Context-aware and updates based on selection.
 * Professional white theme with color customization support.
 */

import { memo, useMemo, useState, useCallback } from 'react'
import { Zap, Lightbulb, Cable, AlertCircle, CheckCircle2, Settings, Trash2, Palette, Sparkles, RotateCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CeilingDesignerState, CeilingComponent } from '../../types'
import { useCeilingDesignerStore } from '../../store'
import {
  isLightBar,
  isHub,
  isConnector,
  ComponentCategory,
  CasingColor,
  LightingMode,
} from '../../types'
import {
  RIGHT_SIDEBAR_WIDTH,
  CASING_COLOR_VALUES,
} from '../../constants'
import { formatWireLength } from '../../utils'

// ============================================================================
// CUSTOM HOOK FOR SELECTED COMPONENT
// ============================================================================

/**
 * Custom hook to get selected component with proper reactivity.
 * This ensures the component re-renders when selection changes.
 */
function useSelectedComponent(): CeilingComponent | null {
  const selectedComponentId = useCeilingDesignerStore(
    (state: CeilingDesignerState) => state.selection.selectedComponentId
  )
  const components = useCeilingDesignerStore(
    (state: CeilingDesignerState) => state.components
  )
  
  return useMemo(() => {
    if (!selectedComponentId) return null
    return components.find((c) => c.id === selectedComponentId) || null
  }, [selectedComponentId, components])
}

// ============================================================================
// TYPES
// ============================================================================

interface PropertiesPanelProps {
  width?: number
}

// ============================================================================
// COMPONENT
// ============================================================================

export const PropertiesPanel = memo(function PropertiesPanel({ width = RIGHT_SIDEBAR_WIDTH }: PropertiesPanelProps) {
  // Use custom hook for proper reactivity
  const selectedComponent = useSelectedComponent()
  
  // Compact mode for narrow widths
  const isCompact = width < 200

  return (
    <aside
      className="flex flex-col h-full bg-white border-l border-gray-200 shadow-sm overflow-hidden"
      style={{ width }}
    >
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-gray-900 rounded-lg flex-shrink-0">
            <Settings className="size-4 text-white" />
          </div>
          {!isCompact && (
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-gray-900 truncate">Properties</h2>
              <p className="text-xs text-gray-500 truncate">
                {selectedComponent
                  ? `${getComponentTypeLabel(selectedComponent.type)}`
                  : 'No selection'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto bg-gray-50/50">
        {selectedComponent ? (
          <SelectedComponentProperties isCompact={isCompact} />
        ) : (
          <EmptyState isCompact={isCompact} />
        )}
      </div>
    </aside>
  )
})

// ============================================================================
// EMPTY STATE
// ============================================================================

const EmptyState = memo(function EmptyState({ isCompact = false }: { isCompact?: boolean }) {
  if (isCompact) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 text-center">
        <Lightbulb className="size-6 text-gray-400" />
        <p className="text-[10px] text-gray-500 mt-2">No selection</p>
      </div>
    )
  }
  
  return (
    <div className="flex flex-col items-center justify-center h-full p-6 text-center">
      <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4 shadow-sm">
        <Lightbulb className="size-8 text-gray-400" />
      </div>
      <h3 className="text-sm font-medium text-gray-700 mb-1">No Component Selected</h3>
      <p className="text-xs text-gray-500">
        Select a component on the ceiling to view and edit its properties
      </p>
    </div>
  )
})

// ============================================================================
// SELECTED COMPONENT PROPERTIES
// ============================================================================

const SelectedComponentProperties = memo(function SelectedComponentProperties({ isCompact = false }: { isCompact?: boolean }) {
  // Use custom hook for proper reactivity
  const component = useSelectedComponent()

  if (!component) return null

  return (
    <div className={cn("space-y-4", isCompact ? "p-2" : "p-4")}>
      {/* Rotation Controls (for light bars) */}
      {isLightBar(component) && <RotationSection isCompact={isCompact} />}
      
      {/* Lighting Mode (for light bars) */}
      {isLightBar(component) && <LightingModeSection isCompact={isCompact} />}
      
      {/* Light Color Picker (for RGB mode light bars) */}
      {isLightBar(component) && component.lightingMode === LightingMode.RGB && (
        <LightColorSection isCompact={isCompact} />
      )}

      {/* Casing Color */}
      <CasingColorSection isCompact={isCompact} />

      {/* Wire Length Status (for hubs or when hub is connected) */}
      {isHub(component) && <WireLengthSection hubId={component.id} />}

      {/* Component-specific info */}
      {!isCompact && <ComponentInfoSection />}
      
      {/* Delete Button - always visible */}
      <DeleteComponentButton isCompact={isCompact} />
    </div>
  )
})

// ============================================================================
// ROTATION SECTION
// ============================================================================

// Preset rotations for quick selection
const ROTATION_PRESETS = [
  { label: 'Horizontal', angle: 0, description: 'Left to Right' },
  { label: 'Vertical', angle: 90, description: 'Front to Back' },
  { label: '45° Left', angle: 45, description: 'Diagonal' },
  { label: '45° Right', angle: -45, description: 'Diagonal' },
  { label: '30°', angle: 30, description: 'Slight angle' },
  { label: '60°', angle: 60, description: 'Sharp angle' },
]

const RotationSection = memo(function RotationSection({ isCompact = false }: { isCompact?: boolean }) {
  const component = useSelectedComponent()
  const updateSelectedRotation = useCeilingDesignerStore(
    (state: CeilingDesignerState) => state.updateSelectedRotation
  )

  if (!component || !isLightBar(component)) return null

  // Convert current Y rotation to degrees
  const currentAngleDeg = Math.round((component.rotation.y * 180) / Math.PI)
  
  const handleRotation = useCallback((angleDeg: number) => {
    const angleRad = (angleDeg * Math.PI) / 180
    updateSelectedRotation({
      x: component.rotation.x,
      y: angleRad,
      z: component.rotation.z,
    })
  }, [component.rotation, updateSelectedRotation])

  const handleSliderChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    handleRotation(parseInt(e.target.value, 10))
  }, [handleRotation])

  if (isCompact) {
    return (
      <section className="p-2 bg-white rounded-lg border border-gray-200">
        <div className="flex items-center gap-2 mb-2">
          <RotateCw className="size-3 text-blue-500" />
          <span className="text-[10px] font-semibold text-gray-700">{currentAngleDeg}°</span>
        </div>
        <input
          type="range"
          min="-180"
          max="180"
          value={currentAngleDeg}
          onChange={handleSliderChange}
          className="w-full h-1.5 bg-gray-200 rounded-full appearance-none cursor-pointer accent-blue-500"
        />
        <div className="grid grid-cols-3 gap-1 mt-2">
          {ROTATION_PRESETS.slice(0, 3).map((preset) => (
            <button
              key={preset.angle}
              onClick={() => handleRotation(preset.angle)}
              className={cn(
                'px-1 py-1 text-[9px] rounded transition-colors',
                currentAngleDeg === preset.angle
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
            >
              {preset.angle}°
            </button>
          ))}
        </div>
      </section>
    )
  }

  return (
    <section className="p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-blue-50">
            <RotateCw className="size-4 text-blue-500" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Rotation</h3>
            <p className="text-xs text-gray-500">Position light bar at any angle</p>
          </div>
        </div>
        <div className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-lg">
          <span className="text-sm font-bold text-blue-600">{currentAngleDeg}</span>
          <span className="text-xs text-gray-500">°</span>
        </div>
      </div>

      {/* Rotation slider */}
      <div className="mb-4">
        <div className="relative">
          <input
            type="range"
            min="-180"
            max="180"
            step="5"
            value={currentAngleDeg}
            onChange={handleSliderChange}
            className="w-full h-2 bg-gradient-to-r from-blue-200 via-blue-400 to-blue-200 rounded-full appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, #bfdbfe 0%, #3b82f6 ${((currentAngleDeg + 180) / 360) * 100}%, #bfdbfe 100%)`
            }}
          />
        </div>
        <div className="flex justify-between mt-1 text-[10px] text-gray-400">
          <span>-180°</span>
          <span>0°</span>
          <span>180°</span>
        </div>
      </div>

      {/* Rotation dial visualization */}
      <div className="flex justify-center mb-4">
        <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 border-2 border-gray-300 shadow-inner">
          {/* Tick marks */}
          {[0, 45, 90, 135, 180, 225, 270, 315].map((tick) => (
            <div
              key={tick}
              className="absolute w-0.5 h-2 bg-gray-400"
              style={{
                left: '50%',
                top: '4px',
                transformOrigin: '50% 46px',
                transform: `translateX(-50%) rotate(${tick}deg)`,
              }}
            />
          ))}
          {/* Rotation indicator line */}
          <div
            className="absolute left-1/2 top-1/2 w-1 h-10 bg-blue-500 rounded-full origin-bottom"
            style={{
              transform: `translateX(-50%) rotate(${currentAngleDeg}deg)`,
              boxShadow: '0 0 6px rgba(59, 130, 246, 0.5)',
            }}
          />
          {/* Center dot */}
          <div className="absolute left-1/2 top-1/2 w-3 h-3 bg-blue-600 rounded-full -translate-x-1/2 -translate-y-1/2 shadow-md" />
        </div>
      </div>

      {/* Preset buttons */}
      <div className="grid grid-cols-3 gap-2">
        {ROTATION_PRESETS.map((preset) => (
          <button
            key={preset.angle}
            onClick={() => handleRotation(preset.angle)}
            className={cn(
              'flex flex-col items-center px-2 py-2 rounded-lg border transition-all duration-150',
              currentAngleDeg === preset.angle
                ? 'border-blue-400 bg-blue-50 ring-1 ring-blue-100'
                : 'border-gray-200 bg-gray-50 hover:border-gray-300 hover:bg-white'
            )}
          >
            <span className={cn(
              'text-xs font-semibold',
              currentAngleDeg === preset.angle ? 'text-blue-700' : 'text-gray-700'
            )}>
              {preset.label}
            </span>
            <span className="text-[10px] text-gray-500">{preset.description}</span>
          </button>
        ))}
      </div>

      {/* Manual input */}
      <div className="mt-3 flex items-center gap-2">
        <label className="text-xs text-gray-600">Custom:</label>
        <input
          type="number"
          min="-180"
          max="180"
          value={currentAngleDeg}
          onChange={(e) => handleRotation(parseInt(e.target.value, 10) || 0)}
          className="flex-1 px-2 py-1 text-sm text-center border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <span className="text-xs text-gray-500">degrees</span>
      </div>
    </section>
  )
})

// ============================================================================
// LIGHTING MODE SECTION
// ============================================================================

const LightingModeSection = memo(function LightingModeSection({ isCompact = false }: { isCompact?: boolean }) {
  const component = useSelectedComponent()
  const updateSelectedLightingMode = useCeilingDesignerStore(
    (state: CeilingDesignerState) => state.updateSelectedLightingMode
  )
  const applyLightingModeToAll = useCeilingDesignerStore(
    (state: CeilingDesignerState) => state.applyLightingModeToAll
  )

  if (!component || !isLightBar(component)) return null

  const modes: { key: LightingMode; label: string; description: string; icon: React.ReactNode }[] = [
    { key: LightingMode.WHITE, label: 'White', description: 'Pure white illumination', icon: <Lightbulb className="size-4" /> },
    { key: LightingMode.RGB, label: 'RGB', description: 'Colorful lighting effects', icon: <Sparkles className="size-4" /> },
  ]

  if (isCompact) {
    return (
      <section className="p-2 bg-white rounded-lg border border-gray-200">
        <div className="flex gap-1">
          {modes.map((mode) => (
            <button
              key={mode.key}
              onClick={() => updateSelectedLightingMode(mode.key)}
              className={cn(
                'flex-1 p-2 rounded-md transition-colors',
                component.lightingMode === mode.key
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
              title={mode.label}
            >
              {mode.icon}
            </button>
          ))}
        </div>
      </section>
    )
  }

  return (
    <section className="p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <div className="p-1.5 rounded-lg bg-amber-50">
          <Lightbulb className="size-4 text-amber-500" />
        </div>
        <h3 className="text-sm font-semibold text-gray-900">Lighting Mode</h3>
      </div>

      <div className="space-y-2">
        {modes.map((mode) => (
          <button
            key={mode.key}
            onClick={() => updateSelectedLightingMode(mode.key)}
            className={cn(
              'w-full flex items-center justify-between px-3 py-2.5 rounded-lg',
              'border transition-all duration-150',
              component.lightingMode === mode.key
                ? 'border-blue-400 bg-blue-50 ring-1 ring-blue-100'
                : 'border-gray-200 bg-gray-50 hover:border-gray-300 hover:bg-white'
            )}
          >
            <div className="flex items-center gap-2">
              <span className={cn(
                component.lightingMode === mode.key ? 'text-blue-600' : 'text-gray-400'
              )}>{mode.icon}</span>
              <div className="text-left">
                <span className={cn(
                  'text-sm font-medium',
                  component.lightingMode === mode.key ? 'text-blue-700' : 'text-gray-700'
                )}>{mode.label}</span>
                <p className="text-xs text-gray-500">{mode.description}</p>
              </div>
            </div>
            {component.lightingMode === mode.key && (
              <CheckCircle2 className="size-5 text-blue-500" />
            )}
          </button>
        ))}
      </div>

      <button
        onClick={() => applyLightingModeToAll(component.lightingMode)}
        className="w-full mt-3 px-3 py-2 text-xs font-medium text-gray-600 
                   border border-gray-200 rounded-lg bg-white
                   hover:bg-gray-50 hover:text-gray-800 
                   transition-colors"
      >
        Apply to All Light Bars
      </button>
    </section>
  )
})

// ============================================================================
// LIGHT COLOR SECTION (RGB Color Picker)
// ============================================================================

// Preset colors for quick selection
const PRESET_COLORS = [
  { name: 'Red', color: '#ff0000' },
  { name: 'Orange', color: '#ff8000' },
  { name: 'Yellow', color: '#ffff00' },
  { name: 'Lime', color: '#80ff00' },
  { name: 'Green', color: '#00ff00' },
  { name: 'Cyan', color: '#00ffff' },
  { name: 'Blue', color: '#0080ff' },
  { name: 'Purple', color: '#8000ff' },
  { name: 'Magenta', color: '#ff00ff' },
  { name: 'Pink', color: '#ff0080' },
  { name: 'White', color: '#ffffff' },
  { name: 'Warm', color: '#ffcc66' },
]

const LightColorSection = memo(function LightColorSection({ isCompact = false }: { isCompact?: boolean }) {
  const component = useSelectedComponent()
  const updateSelectedLightColor = useCeilingDesignerStore(
    (state: CeilingDesignerState) => state.updateSelectedLightColor
  )
  const applyLightColorToAll = useCeilingDesignerStore(
    (state: CeilingDesignerState) => state.applyLightColorToAll
  )
  
  const [showColorPicker, setShowColorPicker] = useState(false)
  
  if (!component || !isLightBar(component)) return null

  const currentColor = component.lightColor || '#ff00ff'
  
  const handleColorChange = useCallback((color: string) => {
    updateSelectedLightColor(color)
  }, [updateSelectedLightColor])

  if (isCompact) {
    return (
      <section className="p-2 bg-white rounded-lg border border-gray-200">
        <div className="grid grid-cols-4 gap-1">
          {PRESET_COLORS.slice(0, 8).map((preset) => (
            <button
              key={preset.color}
              onClick={() => handleColorChange(preset.color)}
              className={cn(
                'w-full aspect-square rounded-md border-2 transition-transform hover:scale-110',
                currentColor === preset.color ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200'
              )}
              style={{ backgroundColor: preset.color }}
              title={preset.name}
            />
          ))}
        </div>
      </section>
    )
  }

  return (
    <section className="p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-purple-50">
            <Palette className="size-4 text-purple-500" />
          </div>
          <h3 className="text-sm font-semibold text-gray-900">Light Color</h3>
        </div>
        <div 
          className="w-8 h-8 rounded-lg border-2 border-gray-300 shadow-inner cursor-pointer hover:scale-110 transition-transform"
          style={{ backgroundColor: currentColor }}
          onClick={() => setShowColorPicker(!showColorPicker)}
          title="Current color - Click to customize"
        />
      </div>

      {/* Color presets grid */}
      <div className="grid grid-cols-6 gap-2 mb-3">
        {PRESET_COLORS.map((preset) => (
          <button
            key={preset.color}
            onClick={() => handleColorChange(preset.color)}
            className={cn(
              'w-full aspect-square rounded-lg border-2 transition-all duration-150 hover:scale-110',
              currentColor === preset.color 
                ? 'border-blue-500 ring-2 ring-blue-200 scale-110' 
                : 'border-gray-200 hover:border-gray-400'
            )}
            style={{ backgroundColor: preset.color }}
            title={preset.name}
          />
        ))}
      </div>

      {/* Custom color input */}
      {showColorPicker && (
        <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 mb-3">
          <label className="block text-xs font-medium text-gray-600 mb-2">Custom Color</label>
          <div className="flex gap-2">
            <input
              type="color"
              value={currentColor}
              onChange={(e) => handleColorChange(e.target.value)}
              className="w-12 h-10 rounded-lg border border-gray-300 cursor-pointer"
            />
            <input
              type="text"
              value={currentColor}
              onChange={(e) => handleColorChange(e.target.value)}
              className="flex-1 px-3 py-2 text-sm font-mono border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="#ff00ff"
            />
          </div>
        </div>
      )}

      <button
        onClick={() => applyLightColorToAll(currentColor)}
        className="w-full px-3 py-2 text-xs font-medium text-gray-600 
                   border border-gray-200 rounded-lg bg-white
                   hover:bg-gray-50 hover:text-gray-800 
                   transition-colors"
      >
        Apply Color to All RGB Lights
      </button>
    </section>
  )
})

// ============================================================================
// CASING COLOR SECTION
// ============================================================================

const CasingColorSection = memo(function CasingColorSection({ isCompact = false }: { isCompact?: boolean }) {
  const component = useSelectedComponent()
  const updateSelectedCasingColor = useCeilingDesignerStore(
    (state: CeilingDesignerState) => state.updateSelectedCasingColor
  )
  const applyCasingColorToAll = useCeilingDesignerStore(
    (state: CeilingDesignerState) => state.applyCasingColorToAll
  )

  if (!component) return null

  const colors: { key: CasingColor; label: string; color: string }[] = [
    {
      key: CasingColor.MATTE_BLACK,
      label: 'Matte Black',
      color: CASING_COLOR_VALUES[CasingColor.MATTE_BLACK],
    },
    {
      key: CasingColor.WHITE,
      label: 'White',
      color: CASING_COLOR_VALUES[CasingColor.WHITE],
    },
  ]

  if (isCompact) {
    return (
      <section className="p-2 bg-white rounded-lg border border-gray-200">
        <div className="flex gap-1">
          {colors.map((colorOption) => (
            <button
              key={colorOption.key}
              onClick={() => updateSelectedCasingColor(colorOption.key)}
              className={cn(
                'flex-1 h-8 rounded-md border-2 transition-transform hover:scale-105',
                component.casingColor === colorOption.key 
                  ? 'border-blue-500 ring-2 ring-blue-200' 
                  : 'border-gray-300'
              )}
              style={{ backgroundColor: colorOption.color }}
              title={colorOption.label}
            />
          ))}
        </div>
      </section>
    )
  }

  return (
    <section className="p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <div className="size-4 rounded-full bg-gradient-to-br from-gray-300 to-gray-600" />
        <h3 className="text-sm font-semibold text-gray-900">Casing Color</h3>
      </div>

      <div className="flex gap-3">
        {colors.map((colorOption) => (
          <button
            key={colorOption.key}
            onClick={() => updateSelectedCasingColor(colorOption.key)}
            className={cn(
              'flex-1 flex flex-col items-center gap-2 p-3 rounded-xl',
              'border-2 transition-all duration-150',
              component.casingColor === colorOption.key
                ? 'border-blue-400 bg-blue-50 shadow-md'
                : 'border-gray-200 bg-gray-50 hover:border-gray-300 hover:bg-white'
            )}
          >
            <div
              className={cn(
                'w-12 h-12 rounded-lg shadow-md border',
                colorOption.key === CasingColor.WHITE ? 'border-gray-200' : 'border-transparent',
                component.casingColor === colorOption.key && 'ring-2 ring-blue-400 ring-offset-2'
              )}
              style={{ backgroundColor: colorOption.color }}
            />
            <span
              className={cn(
                'text-xs font-medium',
                component.casingColor === colorOption.key
                  ? 'text-blue-700'
                  : 'text-gray-600'
              )}
            >
              {colorOption.label}
            </span>
          </button>
        ))}
      </div>

      <button
        onClick={() => applyCasingColorToAll(component.casingColor)}
        className="w-full mt-3 px-3 py-2 text-xs font-medium text-gray-600 
                   border border-gray-200 rounded-lg bg-white
                   hover:bg-gray-50 hover:text-gray-800 
                   transition-colors"
      >
        Apply to All Components
      </button>
    </section>
  )
})

// ============================================================================
// WIRE LENGTH SECTION
// ============================================================================

interface WireLengthSectionProps {
  hubId: string
}

const WireLengthSection = memo(function WireLengthSection({
  hubId,
}: WireLengthSectionProps) {
  const getWireLengthStatus = useCeilingDesignerStore(
    (state: CeilingDesignerState) => state.getWireLengthStatus
  )
  const status = getWireLengthStatus(hubId)

  const progressColor = useMemo(() => {
    if (status.utilizationPercentage >= 100) return 'bg-red-500'
    if (status.utilizationPercentage >= 80) return 'bg-amber-500'
    return 'bg-emerald-500'
  }, [status.utilizationPercentage])

  return (
    <section className="p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <div className="p-1.5 rounded-lg bg-emerald-50">
          <Cable className="size-4 text-emerald-500" />
        </div>
        <h3 className="text-sm font-semibold text-gray-900">Wire Length Status</h3>
      </div>

      <div
        className={cn(
          'p-3 rounded-lg border',
          status.isOverLimit
            ? 'bg-red-50 border-red-200'
            : 'bg-gray-50 border-gray-200'
        )}
      >
        {/* Status indicator */}
        <div className="flex items-center gap-2 mb-2">
          {status.isOverLimit ? (
            <AlertCircle className="size-4 text-red-500" />
          ) : (
            <CheckCircle2 className="size-4 text-emerald-500" />
          )}
          <span
            className={cn(
              'text-sm font-semibold',
              status.isOverLimit ? 'text-red-600' : 'text-emerald-600'
            )}
          >
            {formatWireLength(status.currentLength)} / {formatWireLength(status.maxLength)} max
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={cn('h-full transition-all duration-300', progressColor)}
            style={{
              width: `${Math.min(status.utilizationPercentage, 100)}%`,
            }}
          />
        </div>

        {/* Warning message */}
        {status.isOverLimit && (
          <p className="mt-2 text-xs text-red-600 font-medium">
            Wire length exceeds maximum. Remove some light bars to continue.
          </p>
        )}
      </div>
    </section>
  )
})

// ============================================================================
// COMPONENT INFO SECTION
// ============================================================================

const ComponentInfoSection = memo(function ComponentInfoSection() {
  const component = useSelectedComponent()

  if (!component) return null

  const infoItems = useMemo(() => {
    const items: { label: string; value: string }[] = []

    if (isLightBar(component)) {
      items.push({ label: 'Length', value: `${component.length}"` })
      items.push({ label: 'Watts', value: `${component.watts}W` })
      items.push({ label: 'Lumens', value: `${component.lumens}` })
    }

    if (isHub(component)) {
      items.push({ label: 'Ports', value: `${component.ports.length}` })
      items.push({
        label: 'Connected',
        value: `${component.connectedComponents.length} components`,
      })
    }

    if (isConnector(component)) {
      items.push({ label: 'Type', value: formatConnectorType(component.connectorType) })
      items.push({ label: 'Ports', value: `${component.portCount}` })
    }

    return items
  }, [component])

  return (
    <section className="p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <div className="p-1.5 rounded-lg bg-blue-50">
          <Zap className="size-4 text-blue-500" />
        </div>
        <h3 className="text-sm font-semibold text-gray-900">Component Details</h3>
      </div>

      <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
        <div className="flex items-center gap-3 mb-3 pb-3 border-b border-gray-200">
          <div className="p-2 rounded-lg bg-white shadow-sm border border-gray-100">
            {getComponentIcon(component.type)}
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-900">
              {getComponentTypeLabel(component.type)}
            </h4>
            <p className="text-xs text-gray-500 font-mono">
              {component.id.slice(0, 12)}...
            </p>
          </div>
        </div>

        <dl className="space-y-2">
          {infoItems.map((item) => (
            <div key={item.label} className="flex justify-between items-center">
              <dt className="text-xs text-gray-500">{item.label}</dt>
              <dd className="text-xs font-semibold text-gray-800 bg-white px-2 py-0.5 rounded border border-gray-100">{item.value}</dd>
            </div>
          ))}
        </dl>
      </div>

      {/* Delete button */}
      <DeleteComponentButton />
    </section>
  )
})

// ============================================================================
// DELETE BUTTON
// ============================================================================

const DeleteComponentButton = memo(function DeleteComponentButton({ isCompact = false }: { isCompact?: boolean }) {
  const selection = useCeilingDesignerStore((state: CeilingDesignerState) => state.selection)
  const removeComponent = useCeilingDesignerStore((state: CeilingDesignerState) => state.removeComponent)

  if (!selection.selectedComponentId) return null

  const handleDelete = () => {
    if (selection.selectedComponentId) {
      removeComponent(selection.selectedComponentId)
    }
  }

  if (isCompact) {
    return (
      <button
        onClick={handleDelete}
        className="w-full p-2 text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
        title="Delete Component"
      >
        <Trash2 className="size-4 mx-auto" />
      </button>
    )
  }

  return (
    <button
      onClick={handleDelete}
      className="w-full mt-4 px-3 py-2.5 text-sm font-medium text-red-600 
                 border border-red-200 rounded-lg bg-red-50 flex items-center justify-center gap-2
                 hover:bg-red-100 hover:border-red-300 
                 transition-colors"
    >
      <Trash2 className="size-4" />
      Delete Component
    </button>
  )
})

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getComponentTypeLabel(type: ComponentCategory): string {
  switch (type) {
    case ComponentCategory.LIGHT_BARS:
      return 'Light Bar'
    case ComponentCategory.HUBS:
      return 'Hub'
    case ComponentCategory.CONNECTORS:
      return 'Connector'
    default:
      return 'Component'
  }
}

function getComponentIcon(type: ComponentCategory) {
  switch (type) {
    case ComponentCategory.LIGHT_BARS:
      return <Lightbulb className="size-4 text-amber-500" />
    case ComponentCategory.HUBS:
      return <Zap className="size-4 text-blue-500" />
    case ComponentCategory.CONNECTORS:
      return <Cable className="size-4 text-emerald-500" />
    default:
      return null
  }
}

function formatConnectorType(type: string): string {
  return type
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

export default PropertiesPanel
