/**
 * Room Ceiling Design Page
 * 
 * Integrated page for ceiling design within the room context.
 * 
 * FLOW ENFORCEMENT:
 * 1. Validates room exists (via RequireRoomGuard)
 * 2. Loads room data from project store
 * 3. Initializes ceiling design
 * 4. Sets ceiling bounds in connection graph store
 * 5. Renders ceiling designer scoped to room
 * 
 * FEATURES:
 * - Live room dimension editing
 * - Warns if resize affects components
 * - Syncs bounds to connection graph store
 * 
 * CONSTRAINT: This page REQUIRES a valid roomId.
 * If no room exists, user is redirected to create room.
 */

import { memo, useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { AlertTriangle, ArrowLeft, Home } from 'lucide-react'
import { RequireRoomGuard } from '@/components/guards/RouteGuards'
import { useProjectStore, useCurrentRoom, useCurrentProject } from '@/store/useProjectStore'
import { useConnectionGraphStore } from '@/modules/ceiling-designer/store/connection-graph-store'
import { RoomProvider } from '@/modules/ceiling-designer/context/RoomContext'
import { ConnectionCeilingDesignerPage } from '@/modules/ceiling-designer/ConnectionCeilingDesignerPage'
import { RoomDimensionEditor } from '@/modules/ceiling-designer/components/ui/RoomDimensionEditor'
import { PAGES_PATHS, getRoomPath } from '@/constants/page'

// ============================================================================
// ROOM DIMENSIONS HEADER
// ============================================================================

interface RoomDimensionsHeaderProps {
  roomName?: string
}

/**
 * Header with editable room dimensions for ceiling design mode.
 * Changes are live-synced to the connection graph store.
 */
const RoomDimensionsHeader = memo(function RoomDimensionsHeader({
  roomName,
}: RoomDimensionsHeaderProps) {
  const navigate = useNavigate()
  const room = useCurrentRoom()
  const project = useCurrentProject()
  const setCeilingBounds = useConnectionGraphStore((state) => state.setCeilingBounds)
  
  // Handle dimension changes - update ceiling bounds
  const handleDimensionsChange = useCallback((width: number, depth: number, _height: number) => {
    // Update ceiling bounds in connection graph store
    setCeilingBounds({
      minX: 0,
      maxX: width,
      minZ: 0,
      maxZ: depth,
    })
  }, [setCeilingBounds])
  
  return (
    <div className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 shadow-sm">
      {/* Left: Back navigation */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => room && navigate(getRoomPath(room.id))}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="size-4" />
          <span className="text-sm font-medium">Back to Room</span>
        </button>
        
        <div className="h-6 w-px bg-gray-200" />
        
        <div>
          <h1 className="text-sm font-semibold text-gray-900">
            {project?.name ?? 'Ceiling Design'}
          </h1>
          <p className="text-xs text-gray-500">
            {roomName ?? 'Room'} - Ceiling Configuration
          </p>
        </div>
      </div>
      
      {/* Center: Room dimensions (editable) */}
      <RoomDimensionEditor onDimensionsChange={handleDimensionsChange} />
      
      {/* Right: Home link */}
      <Link
        to={PAGES_PATHS.home}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
      >
        <Home className="size-4" />
        <span className="text-sm">Projects</span>
      </Link>
    </div>
  )
})

// ============================================================================
// MAIN PAGE CONTENT
// ============================================================================

const RoomCeilingDesignContent = memo(function RoomCeilingDesignContent() {
  const { roomId } = useParams<{ roomId: string }>()
  const navigate = useNavigate()
  
  const currentRoom = useCurrentRoom()
  const currentProject = useCurrentProject()
  const loadProject = useProjectStore((state) => state.loadProject)
  const initializeCeilingDesign = useProjectStore((state) => state.initializeCeilingDesign)
  const savedProjects = useProjectStore((state) => state.savedProjects)
  const savedRooms = useProjectStore((state) => state.savedRooms)
  
  // Connection graph store - for setting ceiling bounds
  const setCeilingBounds = useConnectionGraphStore((state) => state.setCeilingBounds)
  
  const [isInitializing, setIsInitializing] = useState(true)
  const [initError, setInitError] = useState<string | null>(null)
  
  // Initialize: Load project and room data, set ceiling bounds
  useEffect(() => {
    async function initialize() {
      setIsInitializing(true)
      setInitError(null)
      
      try {
        // If room not loaded, find and load the project
        if (!currentRoom && roomId) {
          const room = savedRooms[roomId]
          if (!room) {
            setInitError('Room not found')
            return
          }
          
          // Find project that owns this room
          const project = savedProjects.find((p) => p.roomId === roomId)
          if (project) {
            loadProject(project.id)
          }
        }
        
        // Wait for room to be available
        const room = savedRooms[roomId!]
        if (!room) {
          setInitError('Room not found')
          return
        }
        
        // CRITICAL: Set ceiling bounds from room data
        // This enforces that ceiling design is scoped to room
        setCeilingBounds({
          minX: room.ceilingPlane.minX,
          maxX: room.ceilingPlane.maxX,
          minZ: room.ceilingPlane.minZ,
          maxZ: room.ceilingPlane.maxZ,
        })
        
        // Initialize ceiling design
        const result = initializeCeilingDesign()
        if (!result.success) {
          setInitError(result.error ?? 'Failed to initialize ceiling design')
          return
        }
        
      } catch (error) {
        setInitError(error instanceof Error ? error.message : 'Unknown error')
      } finally {
        setIsInitializing(false)
      }
    }
    
    initialize()
  }, [roomId, currentRoom, savedRooms, savedProjects, loadProject, initializeCeilingDesign, setCeilingBounds])
  
  // Update ceiling bounds when room changes
  useEffect(() => {
    if (currentRoom) {
      setCeilingBounds({
        minX: currentRoom.ceilingPlane.minX,
        maxX: currentRoom.ceilingPlane.maxX,
        minZ: currentRoom.ceilingPlane.minZ,
        maxZ: currentRoom.ceilingPlane.maxZ,
      })
    }
  }, [currentRoom, setCeilingBounds])
  
  // Show loading state
  if (isInitializing) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading ceiling designer...</p>
        </div>
      </div>
    )
  }
  
  // Show error state
  if (initError) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center max-w-md">
          <AlertTriangle className="size-12 text-amber-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            Cannot Access Ceiling Designer
          </h2>
          <p className="text-gray-600 mb-4">{initError}</p>
          <button
            onClick={() => navigate(PAGES_PATHS.roomCreate)}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Create a Room First
          </button>
        </div>
      </div>
    )
  }
  
  // Room not loaded yet
  if (!currentRoom) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading room data...</p>
        </div>
      </div>
    )
  }
  
  return (
    <RoomProvider roomId={currentRoom.id}>
      <div className="h-screen flex flex-col">
        {/* Room dimensions header (editable) */}
        <RoomDimensionsHeader roomName={currentProject?.name} />
        
        {/* Ceiling designer - scoped to room */}
        <div className="flex-1">
          <ConnectionCeilingDesignerPage />
        </div>
      </div>
    </RoomProvider>
  )
})

// ============================================================================
// PAGE EXPORT (with guard)
// ============================================================================

/**
 * Room Ceiling Design Page
 * 
 * PROTECTED: Requires valid roomId in URL.
 * Redirects to create room if room doesn't exist.
 */
export const RoomCeilingDesignPage = memo(function RoomCeilingDesignPage() {
  return (
    <RequireRoomGuard>
      <RoomCeilingDesignContent />
    </RequireRoomGuard>
  )
})

export default RoomCeilingDesignPage
