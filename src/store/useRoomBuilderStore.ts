import { create } from 'zustand'
import { Group, Mesh, Scene, Vector3, Object3D } from 'three'
import { generateRoom } from '@/lib/roomGenerator'
import type { RefObject } from 'react'
import type { IModel } from '@/constants/model-list'
import type { Model } from '@/types/model'
import type { ITile } from '@/types/tiles'

export type CabinetType = string

export interface RoomParams {
	width: number
	depth: number
	height: number
	wallThickness: number
	wallColor: string
	floorColor: string
}

interface RoomBuilderState {
	showDimensions: boolean
	toggleShowDimensions: () => void

	selectedRampType: string | null
	setSelectedRampType: (type: string | null) => void

	modelType: IModel | null
	setModelType: (type: IModel | null) => void

	selectedCabinetId: number | null
	setSelectedCabinetId: (id: number | null) => void

	selectedModelRef: RefObject<Group> | null
	setSelectedModelRef: (ref: RefObject<Group> | null) => void

	ghostDistances: {
		left: { distance: number } | null
		right: { distance: number } | null
		top: { distance: number } | null
	}
	setGhostDistances: (distances: {
		left: { distance: number } | null
		right: { distance: number } | null
		top: { distance: number } | null
	}) => void

	creationModel: Model | null
	setCreationModel: (data: Model | null) => void

	scene: Scene | null
	setScene: (scene: Scene | null) => void

	roomModel: Group | null
	addRoomModel: (scene: Group) => void
	clearRoomModel: () => void

	camControlDisabled: boolean
	setCamControlDisabled: (value: boolean) => void

	isCustomRoom: boolean
	setIsCustomRoom: (value: boolean) => void

	roomParams: RoomParams
	setRoomParams: (p: Partial<RoomParams>) => void
	setRoomParamsOnly: (p: Partial<RoomParams>) => void

	roomGroup: Group | null
	regenerateRoom: () => void

	cabinets: Model[]
	setCabinets: (cabinets: Model[]) => void
	addCabinet: (cabinet: Model) => void
	changeCabinetById: (id: number, data: Partial<Model>) => void
	removeCabinet: (id: number) => void
	clearCabinets: () => void
	modelRefs: RefObject<Group>[]
	addModelRef: (ref: RefObject<Group>) => void
	removeModelRef: (ref: RefObject<Group>) => void
	draggingModelRef: RefObject<Group> | null
	setDraggingModelRef: (ref: RefObject<Group> | null) => void

	isModelPositionValid: boolean
	setIsModelPositionValid: (isValid: boolean) => void

	floorTilesEnabled: boolean
	toggleFloorTilesEnabled: () => void

	selectedTileType: string | null
	setSelectedTileType: (type: string | null) => void

	selectedEdgesColor: string | null
	setSelectedEdgesColor: (type: string | null) => void

	rampSelectedTileType: string | null
	setRampSelectedTileType: (type: string | null) => void

	useEdges: boolean
	setUseEdges: (value: boolean) => void

	floorTiles: ITile[]
	setFloorTiles: (tiles: ITile[]) => void
	addFloorTile: (x: number, z: number, type: string, useEdges: boolean) => void
	removeFloorTile: (x: number, z: number) => void
	clearFloorTiles: () => void

	floorMesh: RefObject<Mesh> | null
	setFloorMesh: (ref: RefObject<Mesh> | null) => void

	// Reset UI/project state when switching projects
	resetProjectState: () => void

	selectedWall: Object3D | null
	setSelectedWall: (wall: Object3D | null) => void

	selectedWallRef: RefObject<Object3D | null> | null
	setSelectedWallRef: (ref: RefObject<Object3D | null> | null) => void

	selectSceneSetting: string
	setSelectSceneSetting: (setting: string) => void

	modelCategories: string[]
	setModelCategories: (categories: string[]) => void
	selectedModelCategory: string | null
	setSelectedModelCategory: (category: string | null) => void

	isWallContextMenuOpen: boolean
	setIsWallContextMenuOpen: (isOpen: boolean) => void

	editingCutoutMesh: Mesh | null
	setEditingCutoutMesh: (mesh: Mesh | null) => void

	editingCutoutPosition: Vector3 | null
	setEditingCutoutPosition: (pos: Vector3 | null) => void

	editingCutoutType: string | null
	setEditingCutoutType: (t: string | null) => void

	selectedHeaderModelCategory: string | null
	setSelectedHeaderModelCategory: (category: string | null) => void

	// Поточні вибрані кольори для нових моделей
	currentColors: {
		regular: {
			door?: string
			handle?: string
		}
		lux: {
			door?: string
		}
	}
	setCurrentColors: (colors: {
		regular?: { door?: string; handle?: string }
		lux?: { door?: string }
	}) => void
}

export const useRoomBuilderStore = create<RoomBuilderState>((set, get) => ({
	selectedRampType: null,
	setSelectedRampType: (type: string | null) => set({ selectedRampType: type }),

	showDimensions: false,
	toggleShowDimensions: () =>
		set(state => ({ showDimensions: !state.showDimensions })),
	scene: null,
	setScene: scene => set({ scene }),

	selectedCabinetId: null,
	setSelectedCabinetId: id => set({ selectedCabinetId: id }),

	creationModel: null,
	setCreationModel: data => set({ creationModel: data }),

	modelType: null,
	setModelType: type => set({ modelType: type }),

	roomModel: null,
	addRoomModel: scene => set({ roomModel: scene }),
	clearRoomModel: () => set({ roomModel: null }),

	selectedModelRef: null,
	setSelectedModelRef: ref => set({ selectedModelRef: ref }),

	camControlDisabled: false,
	setCamControlDisabled: value => set({ camControlDisabled: value }),

	ghostDistances: {
		left: null,
		right: null,
		top: null,
	},
	setGhostDistances: distances => set({ ghostDistances: distances }),

	isCustomRoom: false,
	setIsCustomRoom: value => set({ isCustomRoom: value }),

	roomParams: {
		width: 5,
		depth: 5,
		height: 3,
		wallThickness: 0.1,
		wallColor: '#ffffff',
		floorColor: '#000',
	},

	setRoomParams: p =>
		set(state => {
			const updated = { ...state.roomParams, ...p }
			return {
				roomParams: updated,
				roomGroup: generateRoom(updated),
			}
		}),

	setRoomParamsOnly: p =>
		set(state => ({ roomParams: { ...state.roomParams, ...p } })),

	roomGroup: generateRoom({
		width: 10,
		depth: 10,
		height: 3,
		wallThickness: 0.1,
		wallColor: '#ffffff',
		floorColor: '#000',
	}),

	regenerateRoom: () => {
		const params = get().roomParams
		set({ roomGroup: generateRoom(params) })
	},

	selectedEdgesColor: null,
	setSelectedEdgesColor: (type: string | null) => {
		set({ selectedEdgesColor: type })
	},

	cabinets: [],

	setCabinets: cabinets => set({ cabinets }),

	addCabinet: cabinet =>
		set(state => ({ cabinets: [...state.cabinets, cabinet] })),
	changeCabinetById: (id, data) =>
		set(state => ({
			cabinets: state.cabinets.map(c => (c.id === id ? { ...c, ...data } : c)),
		})),
	removeCabinet: id =>
		set(state => ({
			cabinets: state.cabinets.filter(c => c.id !== id),
		})),

	clearCabinets: () => set({ cabinets: [] }),

	modelRefs: [] as RefObject<Group>[],

	addModelRef: ref => {
		const { modelRefs } = get()
		if (!modelRefs.includes(ref)) {
			set({ modelRefs: [...modelRefs, ref] })
		}
	},
	removeModelRef: ref => {
		set({
			modelRefs: get().modelRefs.filter(r => r !== ref),
		})
	},
	draggingModelRef: null as RefObject<Group> | null,
	setDraggingModelRef: (ref: RefObject<Group> | null) => {
		set({ draggingModelRef: ref })
	},

	isModelPositionValid: true,
	setIsModelPositionValid: (isValid: boolean) => {
		set({ isModelPositionValid: isValid })
	},
	floorTilesEnabled: false,
	toggleFloorTilesEnabled: () =>
		set(state => ({ floorTilesEnabled: !state.floorTilesEnabled })),

	selectedTileType: null,
	setSelectedTileType: (type: string | null) => {
		set({ selectedTileType: type })
	},

	rampSelectedTileType: null,
	setRampSelectedTileType: (type: string | null) => {
		set({ rampSelectedTileType: type })
	},

	useEdges: true,
	setUseEdges: (value: boolean) => {
		set({ useEdges: value })
	},

	floorTiles: [],
	setFloorTiles: (tiles: ITile[]) => {
		// Ensure only one tile per grid cell (x,z). If duplicates exist, keep the last one.
		const map = new Map<string, ITile>()
		tiles.forEach(t => {
			map.set(`${t.x},${t.z}`, t)
		})
		const deduped = Array.from(map.values())
		set({ floorTiles: deduped })
	},
	addFloorTile: (x: number, z: number, type: string, useEdges: boolean) => {
		set(state => {
			// Capture currently selected edges color from the store
			const selectedEdgesColor = get().selectedEdgesColor
			const edgesColor = useEdges ? selectedEdgesColor ?? undefined : undefined

			const existingIndex = state.floorTiles.findIndex(
				tile => tile.x === x && tile.z === z
			)
			if (existingIndex >= 0) {
				const newTiles = [...state.floorTiles]
				newTiles[existingIndex] = { x, z, type, useEdges, edgesColor }
				return { floorTiles: newTiles }
			} else {
				return {
					floorTiles: [
						...state.floorTiles,
						{ x, z, type, useEdges, edgesColor },
					],
				}
			}
		})
	},

	removeFloorTile: (x: number, z: number) => {
		set(state => ({
			floorTiles: state.floorTiles.filter(
				tile => !(tile.x === x && tile.z === z)
			),
		}))
	},

	clearFloorTiles: () => {
		set({ floorTiles: [] })
	},
	floorMesh: null as RefObject<Mesh> | null,
	setFloorMesh: (ref: RefObject<Mesh> | null) => {
		set({ floorMesh: ref })
	},

	// Reset the store to a fresh state for a newly opened project. This is
	// used when navigating between projects so UI state doesn't leak.
	// NOTE: isCustomRoom is intentionally NOT reset here so that "Create scratch"
	// navigation from CreateRoomPage preserves the flag through to EditRoomPage.
	// Scene.tsx clears isCustomRoom once projectData.glbUrl is confirmed.
	resetProjectState: () => {
		const defaultRoomParams = {
			width: 5,
			depth: 5,
			height: 3,
			wallThickness: 0.1,
			wallColor: '#ffffff',
			floorColor: '#000',
		}
		set({
			showDimensions: false,
			selectedRampType: null,
			modelType: null,
			selectedCabinetId: null,
			selectedModelRef: null,
			camControlDisabled: false,
			roomParams: defaultRoomParams,
			roomGroup: generateRoom({
				width: 10,
				depth: 10,
				height: 3,
				wallThickness: 0.1,
				wallColor: '#ffffff',
				floorColor: '#000',
			}),
			cabinets: [],
			modelRefs: [] as RefObject<Group>[],
			draggingModelRef: null,
			isModelPositionValid: true,
			floorTilesEnabled: false,
			selectedTileType: null,
			selectedEdgesColor: null,
			rampSelectedTileType: null,
			useEdges: true,
			floorTiles: [],
			floorMesh: null,
			selectedWall: null,
			selectedWallRef: null,
			selectSceneSetting: 'default',
			modelCategories: [],
			selectedModelCategory: 'fusion-cabinet',
			isWallContextMenuOpen: false,
			editingCutoutMesh: null,
			editingCutoutPosition: null,
			editingCutoutType: null,
			selectedHeaderModelCategory: null,
			currentColors: { regular: {}, lux: {} },
		})
	},

	// Manually selected wall (for collision/snap behavior) and its ref for global access
	selectedWall: null,
	setSelectedWall: (wall: Object3D | null) => set({ selectedWall: wall }),

	// Keep a ref in the store so components that need a mutable reference can share it
	selectedWallRef: null,
	setSelectedWallRef: (ref: RefObject<Object3D | null> | null) => {
		set({ selectedWallRef: ref })
	},

	selectedHeaderModelCategory: null,
	setSelectedHeaderModelCategory: (category: string | null) =>
		set({ selectedHeaderModelCategory: category }),

	setSelectSceneSetting: (setting: string) => {
		set({ selectSceneSetting: setting })
	},
	selectSceneSetting: 'default',
	setModelCategories: (categories: string[]) => {
		set({ modelCategories: categories })
	},
	modelCategories: [],
	selectedModelCategory: 'fusion-cabinet',
	setSelectedModelCategory: (category: string | null) =>
		set({ selectedModelCategory: category }),

	isWallContextMenuOpen: false,
	setIsWallContextMenuOpen: (isOpen: boolean) => {
		set({ isWallContextMenuOpen: isOpen })
	},

	editingCutoutMesh: null,
	setEditingCutoutMesh: (mesh: Mesh | null) => set({ editingCutoutMesh: mesh }),

	editingCutoutPosition: null,
	setEditingCutoutPosition: (pos: Vector3 | null) =>
		set({ editingCutoutPosition: pos }),

	editingCutoutType: null,
	setEditingCutoutType: (t: string | null) => set({ editingCutoutType: t }),

	currentColors: {
		regular: {},
		lux: {},
	},
	setCurrentColors: (colors: {
		regular?: { door?: string; handle?: string }
		lux?: { door?: string }
	}) =>
		set(state => ({
			currentColors: {
				...state.currentColors,
				...colors,
			},
		})),
}))
