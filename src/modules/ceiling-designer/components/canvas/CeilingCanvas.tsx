/**
 * Ceiling Canvas
 * 
 * Main 3D canvas component using React Three Fiber.
 * Professional white theme with optimized performance.
 * Includes zoom and fullscreen controls.
 */

import { memo, Suspense, useCallback } from 'react'
import { Canvas } from '@react-three/fiber'
import { Environment, Preload } from '@react-three/drei'
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Maximize2, 
  Minimize2,
  Move3D,
  Eye,
  Grid3X3
} from 'lucide-react'
import { CeilingPlane } from './CeilingPlane'
import { GarageRoom } from './GarageRoom'
import { ComponentRenderer } from './ComponentRenderer'
import { ConnectionLines } from './ConnectionLines'
import { GhostPreview } from './GhostPreview'
import { CameraController } from './CameraController'
import { SceneLighting } from './SceneLighting'
import { useCeilingDesignerStore } from '../../store'
import type { CatalogItem, CeilingDesignerState } from '../../types'
import { cn } from '@/lib/utils'

// ============================================================================
// TYPES
// ============================================================================

interface CeilingCanvasProps {
  className?: string
  zoomLevel?: number
  onZoomIn?: () => void
  onZoomOut?: () => void
  onResetZoom?: () => void
  isFullscreen?: boolean
  onToggleFullscreen?: () => void
}

// ============================================================================
// COMPONENT
// ============================================================================

export const CeilingCanvas = memo(function CeilingCanvas({
  className = '',
  zoomLevel = 1,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  isFullscreen = false,
  onToggleFullscreen,
}: CeilingCanvasProps) {
  const startDrag = useCeilingDesignerStore((state: CeilingDesignerState) => state.startDrag)
  const cancelDrag = useCeilingDesignerStore((state: CeilingDesignerState) => state.cancelDrag)

  // Handle drag enter from sidebar
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }, [])

  // Handle drop from sidebar
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    
    try {
      const data = e.dataTransfer.getData('application/json')
      if (data) {
        const catalogItem: CatalogItem = JSON.parse(data)
        startDrag(catalogItem)
      }
    } catch (error) {
      console.error('Failed to parse drop data:', error)
    }
  }, [startDrag])

  // Handle drag leave
  const handleDragLeave = useCallback(() => {
    cancelDrag()
  }, [cancelDrag])

  return (
    <div
      className={`relative w-full h-full bg-gray-100 ${className}`}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onDragLeave={handleDragLeave}
    >
      {/* Canvas Info Bar */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-2 bg-white/90 backdrop-blur-sm border-b border-gray-200">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Move3D className="size-4" />
            <span>Drag to rotate</span>
          </div>
          <div className="w-px h-4 bg-gray-300" />
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Eye className="size-4" />
            <span>Scroll to zoom</span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Grid3X3 className="size-4" />
          <span>Zoom: {Math.round(zoomLevel * 100)}%</span>
        </div>
      </div>

      <Canvas
        shadows
        camera={{ 
          position: [15 / zoomLevel, 15 / zoomLevel, 15 / zoomLevel], 
          fov: 50, 
          near: 0.1, 
          far: 1000 
        }}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
          preserveDrawingBuffer: true,
        }}
        dpr={[1, 2]}
        performance={{ min: 0.5 }}
        style={{ background: 'linear-gradient(180deg, #f8fafc 0%, #e2e8f0 100%)' }}
      >
        {/* Scene background - Light gray gradient */}
        <color attach="background" args={['#f1f5f9']} />

        {/* Lighting */}
        <SceneLighting />

        {/* Camera controls */}
        <CameraController />

        {/* Main content */}
        <Suspense fallback={null}>
          {/* Garage environment */}
          <GarageRoom />

          {/* Ceiling surface */}
          <CeilingPlane />

          {/* Placed components */}
          <ComponentRenderer />

          {/* Connection visualizations */}
          <ConnectionLines />

          {/* Ghost preview for drag operations */}
          <GhostPreview />

          {/* Environment for reflections - soft studio lighting */}
          <Environment preset="studio" />

          {/* Preload assets */}
          <Preload all />
        </Suspense>
      </Canvas>

      {/* Left Controls - Zoom */}
      <div className="absolute left-4 top-1/2 -translate-y-1/2 flex flex-col gap-1 bg-white rounded-xl shadow-lg border border-gray-200 p-1">
        <CanvasControlButton 
          onClick={onZoomIn} 
          icon={<ZoomIn className="size-4" />} 
          title="Zoom In"
        />
        <CanvasControlButton 
          onClick={onResetZoom} 
          icon={<RotateCcw className="size-4" />} 
          title="Reset View"
        />
        <CanvasControlButton 
          onClick={onZoomOut} 
          icon={<ZoomOut className="size-4" />} 
          title="Zoom Out"
        />
      </div>

      {/* Right Controls - View Options */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-1 bg-white rounded-xl shadow-lg border border-gray-200 p-1">
        <CanvasControlButton 
          onClick={onToggleFullscreen} 
          icon={isFullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />} 
          title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
        />
      </div>

      {/* Bottom Controls - Camera Views */}
      <CameraViewControls />
    </div>
  )
})

// ============================================================================
// CANVAS CONTROL BUTTON
// ============================================================================

interface CanvasControlButtonProps {
  onClick?: () => void
  icon: React.ReactNode
  title: string
  isActive?: boolean
}

const CanvasControlButton = memo(function CanvasControlButton({
  onClick,
  icon,
  title,
  isActive = false,
}: CanvasControlButtonProps) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={cn(
        'p-2 rounded-lg transition-all duration-150',
        'hover:bg-gray-100 active:bg-gray-200',
        'text-gray-600 hover:text-gray-900',
        isActive && 'bg-blue-50 text-blue-600 hover:bg-blue-100'
      )}
    >
      {icon}
    </button>
  )
})

// ============================================================================
// CAMERA VIEW CONTROLS
// ============================================================================

import { CameraView, type CeilingDesignerState as CanvasState } from '../../types'

const CameraViewControls = memo(function CameraViewControls() {
  const setCameraView = useCeilingDesignerStore((state: CanvasState) => state.setCameraView)
  const currentView = useCeilingDesignerStore((state: CanvasState) => state.canvas.cameraView)

  const views: { key: CameraView; label: string; icon: string }[] = [
    { key: CameraView.FRONT, label: 'Front', icon: '⬆️' },
    { key: CameraView.SIDE, label: 'Side', icon: '➡️' },
    { key: CameraView.TOP, label: 'Top', icon: '⬇️' },
    { key: CameraView.PERSPECTIVE, label: '3D', icon: '🎯' },
  ]

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1 bg-white rounded-xl shadow-lg border border-gray-200 p-1">
      {views.map((view) => (
        <button
          key={view.key}
          onClick={() => setCameraView(view.key)}
          className={cn(
            'px-4 py-2 text-sm font-medium rounded-lg transition-all duration-150',
            currentView === view.key
              ? 'bg-blue-500 text-white shadow-md'
              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
          )}
        >
          {view.label}
        </button>
      ))}
    </div>
  )
})

export default CeilingCanvas
