/**
 * Project Store
 * 
 * Centralized state management for Project → Room → CeilingDesign flow.
 * 
 * KEY CONSTRAINTS ENFORCED:
 * 1. Project must be created first
 * 2. Room must be created before ceiling design
 * 3. CeilingDesign MUST reference a valid Room
 * 4. Ceiling bounds are derived from Room dimensions
 * 
 * This store is the single source of truth for project/room data.
 */

import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import {
  type Project,
  type CeilingDesign,
  createProject,
  createCeilingDesign,
  validateProjectName,
  validateCeilingDesignAccess,
} from '@/types/project-types'
import {
  type Room,
  type RoomDimensions,
  type CeilingPlane,
  createRoom,
  updateRoomDimensions,
  validateRoomDimensions,
} from '@/types/room'

// ============================================================================
// STORE STATE INTERFACE
// ============================================================================

interface ProjectStoreState {
  // ===== CURRENT PROJECT =====
  
  /** Currently active project */
  currentProject: Project | null
  
  /** Currently active room */
  currentRoom: Room | null
  
  /** Currently active ceiling design */
  currentCeilingDesign: CeilingDesign | null
  
  // ===== PROJECT ACTIONS =====
  
  /**
   * Create a new project with the given name.
   * This is the first step in the workflow.
   */
  createNewProject: (name: string) => { success: boolean; error?: string; projectId?: string }
  
  /**
   * Load an existing project by ID.
   */
  loadProject: (projectId: string) => boolean
  
  /**
   * Update project name.
   */
  updateProjectName: (name: string) => { success: boolean; error?: string }
  
  // ===== ROOM ACTIONS =====
  
  /**
   * Create a room for the current project.
   * REQUIRES: A project must be active.
   */
  createRoom: (dimensions: Partial<RoomDimensions>) => { success: boolean; error?: string; roomId?: string }
  
  /**
   * Update room dimensions.
   * This will recompute the ceiling plane.
   */
  updateRoomDimensions: (dimensions: Partial<RoomDimensions>) => { success: boolean; error?: string }
  
  /**
   * Update room colors.
   */
  updateRoomColors: (colors: { wallColor?: string; floorColor?: string; ceilingColor?: string }) => void
  
  // ===== CEILING DESIGN ACTIONS =====
  
  /**
   * Initialize ceiling design for the current room.
   * REQUIRES: A room must exist.
   * 
   * This enforces the constraint that ceiling design requires a room.
   */
  initializeCeilingDesign: () => { success: boolean; error?: string; ceilingDesignId?: string }
  
  /**
   * Check if ceiling design can be accessed.
   * Returns false if no room exists.
   */
  canAccessCeilingDesign: () => { allowed: boolean; error?: string }
  
  // ===== GETTERS =====
  
  /**
   * Get the ceiling plane bounds for the current room.
   * Returns null if no room exists.
   * 
   * This is the ONLY way ceiling configurator should get bounds.
   */
  getCeilingBounds: () => CeilingPlane | null
  
  /**
   * Get room dimensions in a format suitable for display.
   */
  getRoomDimensionsDisplay: () => { width: number; depth: number; height: number } | null
  
  // ===== PERSISTENCE =====
  
  /** All saved projects (for project list) */
  savedProjects: Project[]
  
  /** All saved rooms (keyed by room ID) */
  savedRooms: Record<string, Room>
  
  /** All saved ceiling designs (keyed by design ID) */
  savedCeilingDesigns: Record<string, CeilingDesign>
  
  // ===== RESET =====
  
  /**
   * Clear current project state (but not saved data).
   */
  clearCurrentState: () => void
  
  /**
   * Clear all data (for testing).
   */
  clearAllData: () => void
}

// ============================================================================
// ID GENERATION
// ============================================================================

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// ============================================================================
// STORE IMPLEMENTATION
// ============================================================================

export const useProjectStore = create<ProjectStoreState>()(
  devtools(
    persist(
      (set, get) => ({
        // ===== INITIAL STATE =====
        currentProject: null,
        currentRoom: null,
        currentCeilingDesign: null,
        savedProjects: [],
        savedRooms: {},
        savedCeilingDesigns: {},

        // ===== PROJECT ACTIONS =====

        createNewProject: (name: string) => {
          const validation = validateProjectName(name)
          if (!validation.valid) {
            return { success: false, error: validation.error }
          }

          const projectId = generateId('proj')
          const project = createProject(projectId, name.trim())

          set((state) => ({
            currentProject: project,
            currentRoom: null,
            currentCeilingDesign: null,
            savedProjects: [...state.savedProjects, project],
          }))

          return { success: true, projectId }
        },

        loadProject: (projectId: string) => {
          const state = get()
          const project = state.savedProjects.find((p) => p.id === projectId)
          
          if (!project) {
            return false
          }

          const room = project.roomId ? state.savedRooms[project.roomId] : null
          const ceilingDesign = room
            ? Object.values(state.savedCeilingDesigns).find((cd) => cd.roomId === room.id)
            : null

          set({
            currentProject: project,
            currentRoom: room,
            currentCeilingDesign: ceilingDesign ?? null,
          })

          return true
        },

        updateProjectName: (name: string) => {
          const validation = validateProjectName(name)
          if (!validation.valid) {
            return { success: false, error: validation.error }
          }

          set((state) => {
            if (!state.currentProject) {
              return state
            }

            const updatedProject = {
              ...state.currentProject,
              name: name.trim(),
              updatedAt: new Date().toISOString(),
            }

            return {
              currentProject: updatedProject,
              savedProjects: state.savedProjects.map((p) =>
                p.id === updatedProject.id ? updatedProject : p
              ),
            }
          })

          return { success: true }
        },

        // ===== ROOM ACTIONS =====

        createRoom: (dimensions: Partial<RoomDimensions>) => {
          const state = get()

          // CONSTRAINT: Project must exist
          if (!state.currentProject) {
            return { success: false, error: 'Please create a project first' }
          }

          // Merge with defaults and validate
          const fullDimensions: RoomDimensions = {
            width: dimensions.width ?? 20,
            depth: dimensions.depth ?? 20,
            height: dimensions.height ?? 10,
            wallThickness: dimensions.wallThickness ?? 0.5,
          }

          const validation = validateRoomDimensions(fullDimensions)
          if (!validation.valid) {
            return { success: false, error: validation.errors.join(', ') }
          }

          const roomId = generateId('room')
          const room = createRoom(roomId, fullDimensions)

          // Update project to reference this room
          const updatedProject = {
            ...state.currentProject,
            roomId,
            updatedAt: new Date().toISOString(),
          }

          set((state) => ({
            currentProject: updatedProject,
            currentRoom: room,
            savedProjects: state.savedProjects.map((p) =>
              p.id === updatedProject.id ? updatedProject : p
            ),
            savedRooms: { ...state.savedRooms, [roomId]: room },
          }))

          return { success: true, roomId }
        },

        updateRoomDimensions: (dimensions: Partial<RoomDimensions>) => {
          const state = get()

          if (!state.currentRoom) {
            return { success: false, error: 'No room to update' }
          }

          const newDimensions = { ...state.currentRoom.dimensions, ...dimensions }
          const validation = validateRoomDimensions(newDimensions)
          
          if (!validation.valid) {
            return { success: false, error: validation.errors.join(', ') }
          }

          const updatedRoom = updateRoomDimensions(state.currentRoom, dimensions)

          set((state) => ({
            currentRoom: updatedRoom,
            savedRooms: { ...state.savedRooms, [updatedRoom.id]: updatedRoom },
          }))

          return { success: true }
        },

        updateRoomColors: (colors) => {
          set((state) => {
            if (!state.currentRoom) return state

            const updatedRoom = {
              ...state.currentRoom,
              ...colors,
              updatedAt: new Date().toISOString(),
            }

            return {
              currentRoom: updatedRoom,
              savedRooms: { ...state.savedRooms, [updatedRoom.id]: updatedRoom },
            }
          })
        },

        // ===== CEILING DESIGN ACTIONS =====

        initializeCeilingDesign: () => {
          const state = get()

          // CONSTRAINT ENFORCEMENT: Room must exist
          const accessCheck = validateCeilingDesignAccess(state.currentRoom)
          if (!accessCheck.valid) {
            return { success: false, error: accessCheck.error }
          }

          // Check if ceiling design already exists for this room
          const existingDesign = Object.values(state.savedCeilingDesigns).find(
            (cd) => cd.roomId === state.currentRoom!.id
          )

          if (existingDesign) {
            set({ currentCeilingDesign: existingDesign })
            return { success: true, ceilingDesignId: existingDesign.id }
          }

          // Create new ceiling design
          const ceilingDesignId = generateId('ceiling')
          const ceilingDesign = createCeilingDesign(ceilingDesignId, state.currentRoom!.id)

          set((state) => ({
            currentCeilingDesign: ceilingDesign,
            savedCeilingDesigns: {
              ...state.savedCeilingDesigns,
              [ceilingDesignId]: ceilingDesign,
            },
          }))

          return { success: true, ceilingDesignId }
        },

        canAccessCeilingDesign: () => {
          const state = get()
          const accessCheck = validateCeilingDesignAccess(state.currentRoom)
          return {
            allowed: accessCheck.valid,
            error: accessCheck.error,
          }
        },

        // ===== GETTERS =====

        getCeilingBounds: () => {
          const state = get()
          return state.currentRoom?.ceilingPlane ?? null
        },

        getRoomDimensionsDisplay: () => {
          const state = get()
          if (!state.currentRoom) return null

          return {
            width: state.currentRoom.dimensions.width,
            depth: state.currentRoom.dimensions.depth,
            height: state.currentRoom.dimensions.height,
          }
        },

        // ===== RESET =====

        clearCurrentState: () => {
          set({
            currentProject: null,
            currentRoom: null,
            currentCeilingDesign: null,
          })
        },

        clearAllData: () => {
          set({
            currentProject: null,
            currentRoom: null,
            currentCeilingDesign: null,
            savedProjects: [],
            savedRooms: {},
            savedCeilingDesigns: {},
          })
        },
      }),
      {
        name: 'project-store',
        partialize: (state) => ({
          savedProjects: state.savedProjects,
          savedRooms: state.savedRooms,
          savedCeilingDesigns: state.savedCeilingDesigns,
        }),
      }
    ),
    { name: 'ProjectStore' }
  )
)

// ============================================================================
// SELECTOR HOOKS
// ============================================================================

/**
 * Get current project (or null).
 */
export const useCurrentProject = () => useProjectStore((state) => state.currentProject)

/**
 * Get current room (or null).
 */
export const useCurrentRoom = () => useProjectStore((state) => state.currentRoom)

/**
 * Get current ceiling design (or null).
 */
export const useCurrentCeilingDesign = () => useProjectStore((state) => state.currentCeilingDesign)

/**
 * Get ceiling bounds for the current room.
 * This is the ONLY way ceiling configurator should access bounds.
 */
export const useCeilingBounds = () => {
  const room = useProjectStore((state) => state.currentRoom)
  return room?.ceilingPlane ?? null
}

/**
 * Get room dimensions for display (read-only in ceiling mode).
 */
export const useRoomDimensionsDisplay = () => {
  const room = useProjectStore((state) => state.currentRoom)
  if (!room) return null
  return {
    width: room.dimensions.width,
    depth: room.dimensions.depth,
    height: room.dimensions.height,
  }
}

/**
 * Check if ceiling design mode is accessible.
 */
export const useCanAccessCeilingDesign = () => {
  const room = useProjectStore((state) => state.currentRoom)
  return room !== null
}

/**
 * Get all saved projects for listing.
 */
export const useSavedProjects = () => useProjectStore((state) => state.savedProjects)
