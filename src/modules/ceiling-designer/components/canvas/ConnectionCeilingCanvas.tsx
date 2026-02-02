/**
 * Connection-Based Ceiling Canvas
 * 
 * Main 3D canvas for the constraint-driven ceiling configurator.
 * 
 * KEY DIFFERENCES FROM OLD CANVAS:
 * - Components are placed through PORT CONNECTIONS only
 * - Drag operations find snap targets (valid ports)
 * - No free placement allowed (except root hub)
 * - Visual feedback shows valid/invalid connection points
 */

import { memo, Suspense, useCallback, useRef, useEffect } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { Environment, Preload } from '@react-three/drei'
import { Raycaster, Plane, Vector3, Vector2 } from 'three'
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize2,
  Minimize2,
  Move3D,
  Eye,
  Grid3X3,
  AlertCircle,
} from 'lucide-react'
import { CeilingPlane } from './CeilingPlane'
import { GarageRoom } from './GarageRoom'
import { CameraController } from './CameraController'
import { SceneLighting } from './SceneLighting'
import { ConnectionComponentRenderer } from './ConnectionComponentRenderer'
import { ConnectionGhostPreview } from './ConnectionGhostPreview'
import { SnapTargetVisualizer } from './SnapTargetVisualizer'
import { ConnectionLinesVisualizer } from './ConnectionLinesVisualizer'
import {
  useConnectionGraphStore,
  useIsDragging,
  usePlacementValidation,
} from '../../store/connection-graph-store'
import { ComponentType, ValidationState } from '../../types/connection-graph'
import type { ConnectorSubtype } from '../../types/connection-graph'
import { cn } from '@/lib/utils'

// ============================================================================
// CONSTANTS
// ============================================================================

const CEILING_HEIGHT = 10

// ============================================================================
// TYPES
// ============================================================================

interface ConnectionCeilingCanvasProps {
  className?: string
  zoomLevel?: number
  onZoomIn?: () => void
  onZoomOut?: () => void
  onResetZoom?: () => void
  isFullscreen?: boolean
  onToggleFullscreen?: () => void
}

// ============================================================================
// DRAG HANDLER COMPONENT (inside Canvas)
// ============================================================================

const DragHandler = memo(function DragHandler() {
  const { camera, gl } = useThree()
  const isDragging = useIsDragging()
  
  const updateDragPosition = useConnectionGraphStore((state) => state.updateDragPosition)
  const endDrag = useConnectionGraphStore((state) => state.endDrag)
  const cancelDrag = useConnectionGraphStore((state) => state.cancelDrag)
  
  // Ceiling plane for raycasting
  const ceilingPlane = useRef(new Plane(new Vector3(0, -1, 0), CEILING_HEIGHT))
  const raycaster = useRef(new Raycaster())
  
  const handlePointerMove = useCallback((e: any) => {
    if (!isDragging) return
    
    // Get intersection with ceiling plane
    const rect = gl.domElement.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1
    const y = -((e.clientY - rect.top) / rect.height) * 2 + 1
    
    raycaster.current.setFromCamera(new Vector2(x, y), camera)
    const intersection = new Vector3()
    raycaster.current.ray.intersectPlane(ceilingPlane.current, intersection)
    
    if (intersection) {
      updateDragPosition({
        x: intersection.x,
        y: CEILING_HEIGHT,
        z: intersection.z,
      })
    }
  }, [isDragging, camera, gl, updateDragPosition])
  
  const handlePointerUp = useCallback(() => {
    if (isDragging) {
      endDrag()
    }
  }, [isDragging, endDrag])
  
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape' && isDragging) {
      cancelDrag()
    }
  }, [isDragging, cancelDrag])
  
  // Register event listeners
  useEffect(() => {
    const canvas = gl.domElement
    
    canvas.addEventListener('pointermove', handlePointerMove)
    canvas.addEventListener('pointerup', handlePointerUp)
    document.addEventListener('keydown', handleKeyDown)
    
    return () => {
      canvas.removeEventListener('pointermove', handlePointerMove)
      canvas.removeEventListener('pointerup', handlePointerUp)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [gl, handlePointerMove, handlePointerUp, handleKeyDown])
  
  return null
})

// ============================================================================
// CANVAS CONTROL BUTTON
// ============================================================================

interface CanvasControlButtonProps {
  onClick?: () => void
  icon: React.ReactNode
  title: string
  disabled?: boolean
}

const CanvasControlButton = memo(function CanvasControlButton({
  onClick,
  icon,
  title,
  disabled = false,
}: CanvasControlButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        "p-2 rounded-lg transition-colors duration-150",
        "hover:bg-gray-100 active:bg-gray-200",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        "text-gray-600 hover:text-gray-900"
      )}
    >
      {icon}
    </button>
  )
})

// ============================================================================
// VALIDATION STATUS BANNER
// ============================================================================

const ValidationStatusBanner = memo(function ValidationStatusBanner() {
  const isDragging = useIsDragging()
  const placementValidation = usePlacementValidation()
  const rootHubId = useConnectionGraphStore((state) => state.rootHubId)
  const draggedComponentType = useConnectionGraphStore((state) => state.draggedComponentType)
  
  if (!isDragging) return null
  
  // Show "place hub first" message
  if (rootHubId === null && draggedComponentType !== ComponentType.HUB) {
    return (
      <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-20">
        <div className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg shadow-lg">
          <AlertCircle className="size-5" />
          <span className="font-medium">Place a Hub first before adding other components</span>
        </div>
      </div>
    )
  }
  
  // Show validation errors
  if (placementValidation?.state === ValidationState.INVALID && placementValidation.errorMessages.length > 0) {
    return (
      <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-20">
        <div className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg shadow-lg">
          <AlertCircle className="size-5" />
          <span className="font-medium">{placementValidation.errorMessages[0]}</span>
        </div>
      </div>
    )
  }
  
  // Show valid placement indicator
  if (placementValidation?.state === ValidationState.VALID) {
    return (
      <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-20">
        <div className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg shadow-lg">
          <span className="font-medium">Release to connect</span>
        </div>
      </div>
    )
  }
  
  return null
})

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const ConnectionCeilingCanvas = memo(function ConnectionCeilingCanvas({
  className = '',
  zoomLevel = 1,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  isFullscreen = false,
  onToggleFullscreen,
}: ConnectionCeilingCanvasProps) {
  const startDrag = useConnectionGraphStore((state) => state.startDrag)
  const cancelDrag = useConnectionGraphStore((state) => state.cancelDrag)
  const isDragging = useIsDragging()

  // Handle drag from sidebar
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }, [])

  // Handle drop from sidebar - start the connection-based drag
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    
    try {
      const data = e.dataTransfer.getData('application/json')
      if (data) {
        const catalogItem = JSON.parse(data)
        
        // Map catalog item to component type
        let componentType: ComponentType
        let lightBarLength: 18 | 36 | undefined
        let connectorSubtype: ConnectorSubtype | undefined
        
        switch (catalogItem.category) {
          case 'hubs':
            componentType = ComponentType.HUB
            break
          case 'light_bars':
            componentType = ComponentType.LIGHT_BAR
            lightBarLength = catalogItem.length || 36
            break
          case 'connectors':
            componentType = ComponentType.CONNECTOR
            connectorSubtype = catalogItem.connectorType
            break
          default:
            console.warn('Unknown catalog item category:', catalogItem.category)
            return
        }
        
        startDrag(componentType, lightBarLength, connectorSubtype)
      }
    } catch (error) {
      console.error('Failed to parse drop data:', error)
    }
  }, [startDrag])

  const handleDragLeave = useCallback(() => {
    cancelDrag()
  }, [cancelDrag])

  return (
    <div
      className={cn('relative w-full h-full bg-gray-100', className)}
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
          {isDragging && (
            <>
              <div className="w-px h-4 bg-gray-300" />
              <div className="flex items-center gap-2 text-sm text-blue-600 font-medium">
                <span>🎯 Move to a green port to connect</span>
              </div>
            </>
          )}
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
          far: 1000,
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
        <color attach="background" args={['#f1f5f9']} />

        <SceneLighting />
        <CameraController />
        
        {/* Drag handler for pointer events */}
        <DragHandler />

        <Suspense fallback={null}>
          <GarageRoom />
          <CeilingPlane />

          {/* Connection-based component renderer */}
          <ConnectionComponentRenderer />

          {/* Connection lines between components */}
          <ConnectionLinesVisualizer />

          {/* Snap targets (valid ports to connect to) */}
          <SnapTargetVisualizer />

          {/* Ghost preview of component being placed */}
          <ConnectionGhostPreview />

          <Environment preset="studio" />
          <Preload all />
        </Suspense>
      </Canvas>

      {/* Validation status banner */}
      <ValidationStatusBanner />

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
          title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
        />
      </div>
    </div>
  )
})

export default ConnectionCeilingCanvas
