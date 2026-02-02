/**
 * Room Type Definitions
 * 
 * This file defines the core data models for the Room Builder.
 * Room is the foundation that MUST exist before ceiling design.
 * 
 * INVARIANT: A Room must be created and persisted before any ceiling design.
 */

// ============================================================================
// ROOM DIMENSIONS
// ============================================================================

/**
 * Room dimensions in feet (converted to 3D units internally).
 * All ceiling constraints derive from these values.
 */
export interface RoomDimensions {
  /** Room width in feet (X axis) */
  width: number
  /** Room depth in feet (Z axis) */
  depth: number
  /** Room height in feet (Y axis) */
  height: number
  /** Wall thickness in feet (typically 0.1) */
  wallThickness: number
}

/**
 * Ceiling plane derived from room dimensions.
 * The ceiling design canvas is bounded by this plane.
 * 
 * CONSTRAINT: All ceiling components must lie within these bounds.
 */
export interface CeilingPlane {
  /** Minimum X coordinate (0) */
  minX: number
  /** Maximum X coordinate (room.width) */
  maxX: number
  /** Minimum Z coordinate (0) */
  minZ: number
  /** Maximum Z coordinate (room.depth) */
  maxZ: number
  /** Y position of ceiling plane (room.height) */
  y: number
}

// ============================================================================
// ROOM ENTITY
// ============================================================================

/**
 * Room entity - the foundation for all design work.
 * 
 * RULE: Room must be created BEFORE ceiling design.
 * RULE: CeilingDesign MUST reference a valid Room.
 */
export interface Room {
  /** Unique room identifier */
  id: string
  /** Room dimensions in feet */
  dimensions: RoomDimensions
  /** Derived ceiling plane (computed from dimensions) */
  ceilingPlane: CeilingPlane
  /** Wall color (hex) */
  wallColor: string
  /** Floor color (hex) */
  floorColor: string
  /** Ceiling color (hex) */
  ceilingColor: string
  /** Creation timestamp */
  createdAt: string
  /** Last updated timestamp */
  updatedAt: string
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

/**
 * Compute ceiling plane from room dimensions.
 * This is a DERIVED value, not user input.
 */
export function computeCeilingPlane(dimensions: RoomDimensions): CeilingPlane {
  return {
    minX: 0,
    maxX: dimensions.width,
    minZ: 0,
    maxZ: dimensions.depth,
    y: dimensions.height,
  }
}

/**
 * Create a new Room with default values.
 * Ceiling plane is automatically computed.
 */
export function createRoom(
  id: string,
  dimensions: Partial<RoomDimensions> = {}
): Room {
  const fullDimensions: RoomDimensions = {
    width: dimensions.width ?? 20, // Default 20 feet
    depth: dimensions.depth ?? 20, // Default 20 feet
    height: dimensions.height ?? 10, // Default 10 feet
    wallThickness: dimensions.wallThickness ?? 0.5,
  }

  const now = new Date().toISOString()

  return {
    id,
    dimensions: fullDimensions,
    ceilingPlane: computeCeilingPlane(fullDimensions),
    wallColor: '#ffffff',
    floorColor: '#808080',
    ceilingColor: '#f5f5f5',
    createdAt: now,
    updatedAt: now,
  }
}

/**
 * Update room dimensions and recompute ceiling plane.
 */
export function updateRoomDimensions(
  room: Room,
  dimensions: Partial<RoomDimensions>
): Room {
  const newDimensions = { ...room.dimensions, ...dimensions }
  return {
    ...room,
    dimensions: newDimensions,
    ceilingPlane: computeCeilingPlane(newDimensions),
    updatedAt: new Date().toISOString(),
  }
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Minimum room dimensions in feet.
 * Prevents creation of impossibly small rooms.
 */
export const MIN_ROOM_DIMENSIONS: RoomDimensions = {
  width: 5,
  depth: 5,
  height: 8,
  wallThickness: 0.1,
}

/**
 * Maximum room dimensions in feet.
 * Prevents creation of impossibly large rooms.
 */
export const MAX_ROOM_DIMENSIONS: RoomDimensions = {
  width: 100,
  depth: 100,
  height: 30,
  wallThickness: 2,
}

/**
 * Validate room dimensions are within acceptable range.
 */
export function validateRoomDimensions(
  dimensions: RoomDimensions
): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (dimensions.width < MIN_ROOM_DIMENSIONS.width) {
    errors.push(`Width must be at least ${MIN_ROOM_DIMENSIONS.width} feet`)
  }
  if (dimensions.width > MAX_ROOM_DIMENSIONS.width) {
    errors.push(`Width must be at most ${MAX_ROOM_DIMENSIONS.width} feet`)
  }

  if (dimensions.depth < MIN_ROOM_DIMENSIONS.depth) {
    errors.push(`Depth must be at least ${MIN_ROOM_DIMENSIONS.depth} feet`)
  }
  if (dimensions.depth > MAX_ROOM_DIMENSIONS.depth) {
    errors.push(`Depth must be at most ${MAX_ROOM_DIMENSIONS.depth} feet`)
  }

  if (dimensions.height < MIN_ROOM_DIMENSIONS.height) {
    errors.push(`Height must be at least ${MIN_ROOM_DIMENSIONS.height} feet`)
  }
  if (dimensions.height > MAX_ROOM_DIMENSIONS.height) {
    errors.push(`Height must be at most ${MAX_ROOM_DIMENSIONS.height} feet`)
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Check if a point (x, z) is within the ceiling bounds.
 * Used for validating component placement.
 */
export function isWithinCeilingBounds(
  x: number,
  z: number,
  ceilingPlane: CeilingPlane
): boolean {
  return (
    x >= ceilingPlane.minX &&
    x <= ceilingPlane.maxX &&
    z >= ceilingPlane.minZ &&
    z <= ceilingPlane.maxZ
  )
}
