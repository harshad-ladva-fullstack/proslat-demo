/**
 * Page Paths
 * 
 * Defines all routes in the application.
 * 
 * FLOW HIERARCHY:
 * 1. Home → Project List
 * 2. Create Room → /room/create
 * 3. Room View → /room/:roomId
 * 4. Ceiling Design → /room/:roomId/ceiling-design
 * 
 * CONSTRAINT: Ceiling design REQUIRES a valid roomId.
 */

export const PAGES_PATHS = {
  // Home / Project List
  home: '/',
  
  // Legacy room builder paths (keep for backward compatibility)
  createRoom: '/room-builder',
  editRoom: '/room-builder/edit-room',
  editRoomCategory: '/room-builder/edit-room/:id/:category',
  editRoomCategoryStep: '/room-builder/edit-room/:id/:category/:step',
  
  // New integrated flow paths
  /** Create a new room - first step */
  roomCreate: '/room/create',
  /** View/edit room by ID */
  room: '/room/:roomId',
  /** Ceiling design - REQUIRES roomId */
  roomCeilingDesign: '/room/:roomId/ceiling-design',
  
  // Legacy ceiling path (redirect to new flow)
  ceiling: '/design/ceiling',
  
  // Error pages
  notFound: '*',
} as const

/**
 * Generate room path with ID.
 */
export function getRoomPath(roomId: string): string {
  return `/room/${roomId}`
}

/**
 * Generate ceiling design path with room ID.
 * This enforces that ceiling design requires a room.
 */
export function getCeilingDesignPath(roomId: string): string {
  if (!roomId) {
    throw new Error('Ceiling design path requires a roomId')
  }
  return `/room/${roomId}/ceiling-design`
}

/**
 * Parse room ID from ceiling design path.
 * Returns null if path doesn't match.
 */
export function parseRoomIdFromPath(path: string): string | null {
  const match = path.match(/^\/room\/([^/]+)/)
  return match ? match[1] : null
}

