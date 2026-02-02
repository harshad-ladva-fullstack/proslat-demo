/**
 * Room Context for Ceiling Designer
 * 
 * Provides room data to ceiling configurator components.
 * This is the ONLY way ceiling components should access room bounds.
 * 
 * ENFORCES: Ceiling design is scoped to room dimensions.
 */

import { createContext, useContext, memo, useMemo, type ReactNode } from 'react'
import { useProjectStore, useCeilingBounds, useRoomDimensionsDisplay } from '@/store/useProjectStore'
import type { CeilingPlane } from '@/types/room'

// ============================================================================
// CONTEXT TYPES
// ============================================================================

interface RoomContextValue {
  /** Room ID (required for ceiling design) */
  roomId: string | null
  
  /** Ceiling plane bounds (the ONLY valid placement area) */
  ceilingBounds: CeilingPlane | null
  
  /** Room dimensions for display (read-only) */
  dimensions: {
    width: number
    depth: number
    height: number
  } | null
  
  /** Whether room data is available */
  hasRoom: boolean
  
  /** Check if a point is within ceiling bounds */
  isWithinBounds: (x: number, z: number) => boolean
  
  /** Clamp a point to ceiling bounds */
  clampToBounds: (x: number, z: number) => { x: number; z: number }
}

// ============================================================================
// CONTEXT
// ============================================================================

const RoomContext = createContext<RoomContextValue | null>(null)

// ============================================================================
// PROVIDER
// ============================================================================

interface RoomProviderProps {
  children: ReactNode
  /** Optional override room ID (for when not using URL params) */
  roomId?: string
}

/**
 * Provider that gives ceiling components access to room data.
 * 
 * CONSTRAINT: All ceiling placement checks use bounds from this context.
 */
export const RoomProvider = memo(function RoomProvider({
  children,
  roomId: overrideRoomId,
}: RoomProviderProps) {
  const currentRoom = useProjectStore((state) => state.currentRoom)
  const ceilingBounds = useCeilingBounds()
  const dimensions = useRoomDimensionsDisplay()
  
  const roomId = overrideRoomId ?? currentRoom?.id ?? null
  const hasRoom = ceilingBounds !== null
  
  const value = useMemo<RoomContextValue>(() => ({
    roomId,
    ceilingBounds,
    dimensions,
    hasRoom,
    
    /**
     * Check if a point (x, z) is within the ceiling bounds.
     * Used for validating component placement.
     * 
     * CONSTRAINT: Components outside bounds are BLOCKED.
     */
    isWithinBounds: (x: number, z: number) => {
      if (!ceilingBounds) {
        // No bounds = reject all (fail-safe)
        return false
      }
      return (
        x >= ceilingBounds.minX &&
        x <= ceilingBounds.maxX &&
        z >= ceilingBounds.minZ &&
        z <= ceilingBounds.maxZ
      )
    },
    
    /**
     * Clamp a point to ceiling bounds.
     * Used for snapping components that would be outside.
     */
    clampToBounds: (x: number, z: number) => {
      if (!ceilingBounds) {
        return { x, z } // No bounds, return as-is
      }
      return {
        x: Math.max(ceilingBounds.minX, Math.min(ceilingBounds.maxX, x)),
        z: Math.max(ceilingBounds.minZ, Math.min(ceilingBounds.maxZ, z)),
      }
    },
  }), [roomId, ceilingBounds, dimensions, hasRoom])
  
  return (
    <RoomContext.Provider value={value}>
      {children}
    </RoomContext.Provider>
  )
})

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Get room context. Throws if used outside provider.
 */
export function useRoomContext(): RoomContextValue {
  const context = useContext(RoomContext)
  if (!context) {
    throw new Error('useRoomContext must be used within a RoomProvider')
  }
  return context
}

/**
 * Get room context, returning null if not available.
 * Use this when you need optional room data.
 */
export function useRoomContextSafe(): RoomContextValue | null {
  return useContext(RoomContext)
}

/**
 * Get ceiling bounds or throw if not available.
 * Use this in components that REQUIRE room bounds.
 */
export function useRequiredCeilingBounds(): CeilingPlane {
  const context = useRoomContext()
  if (!context.ceilingBounds) {
    throw new Error('Ceiling bounds not available. Ensure room is created first.')
  }
  return context.ceilingBounds
}

/**
 * Get room dimensions for display (read-only).
 */
export function useRoomDimensions() {
  const context = useRoomContext()
  return context.dimensions
}

/**
 * Hook for checking if a position is within ceiling bounds.
 */
export function useIsWithinCeilingBounds() {
  const context = useRoomContext()
  return context.isWithinBounds
}

/**
 * Hook for clamping positions to ceiling bounds.
 */
export function useClampToCeilingBounds() {
  const context = useRoomContext()
  return context.clampToBounds
}
