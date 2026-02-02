/**
 * Route Guards
 * 
 * Components that enforce navigation constraints.
 * 
 * KEY CONSTRAINT:
 * - Ceiling design REQUIRES a valid room
 * - If room doesn't exist, redirect to create room
 * - NO bypass or shortcut allowed
 */

import { memo, useEffect } from 'react'
import { Navigate, useParams, useLocation } from 'react-router-dom'
import { useProjectStore, useCurrentRoom } from '@/store/useProjectStore'
import { PAGES_PATHS } from '@/constants/page'

// ============================================================================
// REQUIRE ROOM GUARD
// ============================================================================

interface RequireRoomGuardProps {
  children: React.ReactNode
}

/**
 * Guard that ensures a room exists before rendering children.
 * 
 * ENFORCES: Ceiling design cannot be accessed without a room.
 * 
 * Behavior:
 * 1. Extracts roomId from URL params
 * 2. Attempts to load room from store
 * 3. If room doesn't exist → redirect to create room
 * 4. If room exists → render children
 */
export const RequireRoomGuard = memo(function RequireRoomGuard({
  children,
}: RequireRoomGuardProps) {
  const { roomId } = useParams<{ roomId: string }>()
  const location = useLocation()
  const currentRoom = useCurrentRoom()
  const loadProject = useProjectStore((state) => state.loadProject)
  const savedRooms = useProjectStore((state) => state.savedRooms)
  const savedProjects = useProjectStore((state) => state.savedProjects)

  // Attempt to load project if room is not currently loaded
  useEffect(() => {
    if (roomId && !currentRoom) {
      // Find project that owns this room
      const project = savedProjects.find((p) => p.roomId === roomId)
      if (project) {
        loadProject(project.id)
      }
    }
  }, [roomId, currentRoom, savedProjects, loadProject])

  // CONSTRAINT CHECK: Room must exist
  if (!roomId) {
    console.warn('[RequireRoomGuard] No roomId in URL, redirecting to create room')
    return <Navigate to={PAGES_PATHS.roomCreate} replace state={{ from: location }} />
  }

  // Check if room exists in saved data
  const roomExists = savedRooms[roomId] !== undefined

  if (!roomExists) {
    console.warn(`[RequireRoomGuard] Room ${roomId} not found, redirecting to create room`)
    return <Navigate to={PAGES_PATHS.roomCreate} replace state={{ from: location }} />
  }

  // Room exists, allow access
  return <>{children}</>
})

// ============================================================================
// REQUIRE PROJECT GUARD
// ============================================================================

interface RequireProjectGuardProps {
  children: React.ReactNode
}

/**
 * Guard that ensures a project exists before rendering children.
 */
export const RequireProjectGuard = memo(function RequireProjectGuard({
  children,
}: RequireProjectGuardProps) {
  const currentProject = useProjectStore((state) => state.currentProject)
  const location = useLocation()

  if (!currentProject) {
    console.warn('[RequireProjectGuard] No active project, redirecting to create room')
    return <Navigate to={PAGES_PATHS.roomCreate} replace state={{ from: location }} />
  }

  return <>{children}</>
})

// ============================================================================
// LEGACY CEILING REDIRECT
// ============================================================================

/**
 * Redirects legacy ceiling route (/design/ceiling) to new flow.
 * 
 * If a room exists → go to /room/:roomId/ceiling-design
 * If no room → go to /room/create
 */
export const LegacyCeilingRedirect = memo(function LegacyCeilingRedirect() {
  const currentRoom = useCurrentRoom()

  if (currentRoom) {
    return <Navigate to={`/room/${currentRoom.id}/ceiling-design`} replace />
  }

  // No room exists, redirect to create room
  return <Navigate to={PAGES_PATHS.roomCreate} replace />
})

// ============================================================================
// LOADING COMPONENT
// ============================================================================

/**
 * Simple loading indicator shown while checking guards.
 */
export const RouteLoadingFallback = memo(function RouteLoadingFallback() {
  return (
    <div className="flex items-center justify-center h-screen bg-gray-100">
      <div className="text-center">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-600">Loading...</p>
      </div>
    </div>
  )
})
