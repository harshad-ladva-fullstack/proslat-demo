/**
 * Connection-Based Ceiling Designer Page
 * 
 * Main page component for the constraint-driven ceiling lighting configurator.
 * 
 * KEY DIFFERENCES FROM FREE-PLACEMENT VERSION:
 * - Uses connection graph store for all state
 * - Components can only be placed by connecting to ports
 * - Positions and rotations are derived from connection graph
 * - No free dragging of placed components
 * 
 * This is a manufacturing-safe configurator, not a drawing tool.
 */

import { memo, useState, useCallback, useRef, useEffect } from 'react'
import { ChevronLeft, ChevronRight, GripVertical, Minimize2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ConnectionLeftSidebar } from './components/sidebar/ConnectionLeftSidebar'
import { ConnectionCeilingCanvas } from './components/canvas/ConnectionCeilingCanvas'
import { ConnectionPropertiesPanel } from './components/properties/ConnectionPropertiesPanel'
import { ToastContainer } from './components/ui/ConnectionToast'
import { useCeilingDesignerStore, useToasts } from './store'

// ============================================================================
// CONSTANTS
// ============================================================================

const MIN_SIDEBAR_WIDTH = 60
const MAX_SIDEBAR_WIDTH = 400
const DEFAULT_LEFT_WIDTH = 280
const DEFAULT_RIGHT_WIDTH = 320

// ============================================================================
// COMPONENT
// ============================================================================

export const ConnectionCeilingDesignerPage = memo(function ConnectionCeilingDesignerPage() {
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [zoomLevel, setZoomLevel] = useState(1)

  // Sidebar visibility
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true)
  const [rightSidebarOpen, setRightSidebarOpen] = useState(true)

  // Sidebar widths
  const [leftWidth, setLeftWidth] = useState(DEFAULT_LEFT_WIDTH)
  const [rightWidth, setRightWidth] = useState(DEFAULT_RIGHT_WIDTH)

  // Resize state
  const [isResizingLeft, setIsResizingLeft] = useState(false)
  const [isResizingRight, setIsResizingRight] = useState(false)

  const containerRef = useRef<HTMLDivElement>(null)

  // Toast notifications
  const toasts = useToasts()
  const removeToast = useCeilingDesignerStore((state) => state.removeToast)

  const handleZoomIn = useCallback(() => {
    setZoomLevel((prev) => Math.min(prev + 0.25, 3))
  }, [])

  const handleZoomOut = useCallback(() => {
    setZoomLevel((prev) => Math.max(prev - 0.25, 0.5))
  }, [])

  const handleResetZoom = useCallback(() => {
    setZoomLevel(1)
  }, [])

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }, [])

  // Handle fullscreen change from browser
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  // Handle mouse move for resizing
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return

      const containerRect = containerRef.current.getBoundingClientRect()

      if (isResizingLeft) {
        const newWidth = e.clientX - containerRect.left
        setLeftWidth(Math.max(MIN_SIDEBAR_WIDTH, Math.min(MAX_SIDEBAR_WIDTH, newWidth)))
      }

      if (isResizingRight) {
        const newWidth = containerRect.right - e.clientX
        setRightWidth(Math.max(MIN_SIDEBAR_WIDTH, Math.min(MAX_SIDEBAR_WIDTH, newWidth)))
      }
    }

    const handleMouseUp = () => {
      setIsResizingLeft(false)
      setIsResizingRight(false)
      document.body.style.cursor = 'auto'
      document.body.style.userSelect = 'auto'
    }

    if (isResizingLeft || isResizingRight) {
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizingLeft, isResizingRight])

  return (
    <div
      ref={containerRef}
      className={cn(
        "flex overflow-hidden bg-gray-100",
        isFullscreen ? "h-screen" : "h-[calc(100vh-64px)]"
      )}
    >
      {/* Left Sidebar - Component Library */}
      <div
        className={cn(
          "relative flex-shrink-0 transition-all duration-300 ease-in-out",
          !leftSidebarOpen && "w-0"
        )}
        style={{ width: leftSidebarOpen ? leftWidth : 0 }}
      >
        {leftSidebarOpen && (
          <>
            <ConnectionLeftSidebar width={leftWidth} />
            {/* Resize Handle */}
            <div
              className="absolute right-0 top-0 bottom-0 w-1 bg-gray-200 hover:bg-blue-400 cursor-col-resize z-20 group"
              onMouseDown={() => setIsResizingLeft(true)}
            >
              <div className="absolute top-1/2 -translate-y-1/2 -right-2 w-5 h-10 bg-gray-200 group-hover:bg-blue-400 rounded-r-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <GripVertical className="size-3 text-gray-600 group-hover:text-white" />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Left Sidebar Toggle */}
      <button
        onClick={() => setLeftSidebarOpen(!leftSidebarOpen)}
        className={cn(
          "absolute left-0 top-1/2 -translate-y-1/2 z-30",
          "w-6 h-16 bg-white border border-gray-200 rounded-r-lg shadow-md",
          "flex items-center justify-center",
          "hover:bg-gray-50 transition-colors"
        )}
        style={{ left: leftSidebarOpen ? leftWidth : 0 }}
      >
        {leftSidebarOpen ? (
          <ChevronLeft className="size-4 text-gray-600" />
        ) : (
          <ChevronRight className="size-4 text-gray-600" />
        )}
      </button>

      {/* Center - 3D Canvas */}
      <main className="flex-1 relative overflow-hidden bg-white border-x border-gray-200">
        <ConnectionCeilingCanvas
          zoomLevel={zoomLevel}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onResetZoom={handleResetZoom}
          isFullscreen={isFullscreen}
          onToggleFullscreen={toggleFullscreen}
        />

        {/* Fullscreen indicator */}
        {isFullscreen && (
          <button
            onClick={toggleFullscreen}
            className="absolute top-4 right-4 z-50 p-2 bg-white/90 rounded-lg shadow-md hover:bg-white transition-colors"
            title="Exit Fullscreen"
          >
            <Minimize2 className="size-5 text-gray-700" />
          </button>
        )}
      </main>

      {/* Right Sidebar Toggle */}
      <button
        onClick={() => setRightSidebarOpen(!rightSidebarOpen)}
        className={cn(
          "absolute top-1/2 -translate-y-1/2 z-30",
          "w-6 h-16 bg-white border border-gray-200 rounded-l-lg shadow-md",
          "flex items-center justify-center",
          "hover:bg-gray-50 transition-colors"
        )}
        style={{ right: rightSidebarOpen ? rightWidth : 0 }}
      >
        {rightSidebarOpen ? (
          <ChevronRight className="size-4 text-gray-600" />
        ) : (
          <ChevronLeft className="size-4 text-gray-600" />
        )}
      </button>

      {/* Right Sidebar - Properties Panel */}
      <div
        className={cn(
          "relative flex-shrink-0 transition-all duration-300 ease-in-out",
          !rightSidebarOpen && "w-0"
        )}
        style={{ width: rightSidebarOpen ? rightWidth : 0 }}
      >
        {rightSidebarOpen && (
          <>
            {/* Resize Handle */}
            <div
              className="absolute left-0 top-0 bottom-0 w-1 bg-gray-200 hover:bg-blue-400 cursor-col-resize z-20 group"
              onMouseDown={() => setIsResizingRight(true)}
            >
              <div className="absolute top-1/2 -translate-y-1/2 -left-2 w-5 h-10 bg-gray-200 group-hover:bg-blue-400 rounded-l-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <GripVertical className="size-3 text-gray-600 group-hover:text-white" />
              </div>
            </div>
            <ConnectionPropertiesPanel width={rightWidth} />
          </>
        )}
      </div>

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </div>
  )
})

export default ConnectionCeilingDesignerPage
