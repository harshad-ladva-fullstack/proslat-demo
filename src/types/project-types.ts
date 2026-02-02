/**
 * Project Type Definitions (Enhanced)
 * 
 * Project is the top-level entity that owns Rooms and CeilingDesigns.
 * 
 * HIERARCHY:
 * Project → Room → CeilingDesign
 * 
 * INVARIANT: CeilingDesign MUST reference a valid Room.
 */

import type { Room } from './room'

// ============================================================================
// PROJECT ENTITY
// ============================================================================

/**
 * Project is the top-level container.
 * A project has exactly one room (for now).
 */
export interface Project {
  /** Unique project identifier */
  id: string
  /** User-provided project name */
  name: string
  /** The room in this project (required after creation) */
  roomId: string | null
  /** User who owns this project */
  userId?: string
  /** Creation timestamp */
  createdAt: string
  /** Last updated timestamp */
  updatedAt: string
  /** Optional GLB URL for imported room models */
  glbUrl?: string
}

// ============================================================================
// CEILING DESIGN ENTITY
// ============================================================================

/**
 * CeilingDesign references a Room and contains all ceiling components.
 * 
 * INVARIANT: roomId is REQUIRED and must reference a valid Room.
 * This ensures ceiling design cannot exist without a room.
 */
export interface CeilingDesign {
  /** Unique ceiling design identifier */
  id: string
  /** 
   * REQUIRED: Reference to the room this design belongs to.
   * This is NOT optional - enforces the constraint that
   * ceiling design requires a room.
   */
  roomId: string
  /** IDs of components in this design (stored in connection graph) */
  componentIds: string[]
  /** IDs of connections in this design (stored in connection graph) */
  connectionIds: string[]
  /** Root hub ID (first component placed) */
  rootHubId: string | null
  /** Creation timestamp */
  createdAt: string
  /** Last updated timestamp */
  updatedAt: string
}

// ============================================================================
// COMBINED STATE FOR UNIFIED WORKFLOW
// ============================================================================

/**
 * The complete design state including project, room, and ceiling design.
 * Used for persistence and loading.
 */
export interface DesignState {
  project: Project
  room: Room | null
  ceilingDesign: CeilingDesign | null
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

/**
 * Create a new project.
 */
export function createProject(id: string, name: string): Project {
  const now = new Date().toISOString()
  return {
    id,
    name,
    roomId: null,
    createdAt: now,
    updatedAt: now,
  }
}

/**
 * Create a new ceiling design for a room.
 * 
 * REQUIRES: roomId must be provided (not optional).
 */
export function createCeilingDesign(id: string, roomId: string): CeilingDesign {
  // CONSTRAINT ENFORCEMENT: roomId is required
  if (!roomId) {
    throw new Error('CeilingDesign requires a valid roomId. Create a room first.')
  }

  const now = new Date().toISOString()
  return {
    id,
    roomId,
    componentIds: [],
    connectionIds: [],
    rootHubId: null,
    createdAt: now,
    updatedAt: now,
  }
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validate that a ceiling design can be created/accessed.
 * Returns errors if room doesn't exist.
 */
export function validateCeilingDesignAccess(
  room: Room | null | undefined
): { valid: boolean; error?: string } {
  if (!room) {
    return {
      valid: false,
      error: 'Cannot access ceiling design without a room. Please create a room first.',
    }
  }
  return { valid: true }
}

/**
 * Validate project name.
 */
export function validateProjectName(name: string): { valid: boolean; error?: string } {
  const trimmed = name.trim()
  if (!trimmed) {
    return { valid: false, error: 'Project name is required' }
  }
  if (trimmed.length < 2) {
    return { valid: false, error: 'Project name must be at least 2 characters' }
  }
  if (trimmed.length > 100) {
    return { valid: false, error: 'Project name must be at most 100 characters' }
  }
  return { valid: true }
}
