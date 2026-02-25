import { create } from 'zustand'
import type {
	CeilingComponent,
	CeilingComponentType,
	ComponentColor,
	DragPayload,
	LightBarComponent,
	LightBarLength,
	LightMode,
	PlacedComponent,
} from '../types'
import {
	createPorts,
	MAX_LIGHT_BAR_FEET,
	WATTS_PER_18,
	WATTS_PER_36,
	LIGHT_BAR_PRICE_18,
	LIGHT_BAR_PRICE_36,
	COMPONENT_PRICES,
} from '../constants'

let _nextId = 1
function nextId(): string {
	return `cl_${_nextId++}`
}

interface CeilingDesignerState {
	// ── Component state ──
	components: PlacedComponent[]
	selectedComponentId: string | null
	activeColor: ComponentColor
	dragPayload: DragPayload | null

	// ── Ceiling boundary (in px, set from room dimensions) ──
	ceilingWidth: number
	ceilingHeight: number

	// ── Actions ──
	setCeilingBounds: (w: number, h: number) => void
	setActiveColor: (c: ComponentColor) => void
	setDragPayload: (p: DragPayload | null) => void
	setSelectedComponentId: (id: string | null) => void

	// Component CRUD
	placeHub: (x: number, y: number) => string | null
	placeComponent: (
		type: CeilingComponentType,
		x: number,
		y: number,
		parentId: string,
		parentPortId: string,
		length?: LightBarLength
	) => string | null
	moveComponent: (id: string, x: number, y: number) => void
	removeComponent: (id: string) => void
	setComponentColor: (id: string, color: ComponentColor) => void
	setLightMode: (id: string, mode: LightMode) => void
	rotateComponent: (id: string, angle: number) => void

	// Queries
	getComponent: (id: string) => PlacedComponent | undefined
	hasHub: () => boolean
	getTotalLightBarInches: () => number
	canAddLightBar: (lengthInches: LightBarLength) => boolean
	getLayoutSummary: () => {
		totalLengthInches: number
		totalLengthFeet: number
		maxLengthFeet: number
		totalWatts: number
		estimatedPrice: number
		componentCount: number
	}

	// Reset
	resetCeilingDesigner: () => void
}

export const useCeilingDesignerStore = create<CeilingDesignerState>(
	(set, get) => ({
		components: [],
		selectedComponentId: null,
		activeColor: 'black',
		dragPayload: null,
		ceilingWidth: 800,
		ceilingHeight: 500,

		setCeilingBounds: (w, h) => set({ ceilingWidth: w, ceilingHeight: h }),
		setActiveColor: (c) => set({ activeColor: c }),
		setDragPayload: (p) => set({ dragPayload: p }),
		setSelectedComponentId: (id) => set({ selectedComponentId: id }),

		// ── Place hub (must be first) ──
		placeHub: (x, y) => {
			const state = get()
			if (state.hasHub()) return null // only one hub allowed
			const id = nextId()
			const hub: CeilingComponent = {
				id,
				type: 'hub',
				color: state.activeColor,
				x,
				y,
				rotation: 0,
				ports: createPorts('hub'),
				parentId: null,
				childIds: [],
			}
			set({ components: [...state.components, hub] })
			return id
		},

		// ── Place any other component ──
		placeComponent: (type, x, y, parentId, parentPortId, length) => {
			const state = get()
			if (!state.hasHub()) return null

			// Validate light bar length limit
			if (type === 'light-bar') {
				const barLength = length || 36
				if (!state.canAddLightBar(barLength)) return null
			}

			// Check parent exists and port is free
			const parent = state.components.find((c) => c.id === parentId)
			if (!parent) return null
			const pPort = parent.ports.find((p) => p.id === parentPortId)
			if (!pPort || pPort.connectedTo !== null) return null

			const id = nextId()
			const ports = createPorts(type)

			// Mark the first port of the new component as connected to parent
			if (ports.length > 0) {
				ports[0].connectedTo = parentId
			}

			const base: CeilingComponent = {
				id,
				type,
				color: state.activeColor,
				x,
				y,
				rotation: 0,
				ports,
				parentId,
				childIds: [],
			}

			let newComp: PlacedComponent
			if (type === 'light-bar') {
				newComp = {
					...base,
					type: 'light-bar',
					length: length || 36,
					lightMode: 'white' as LightMode,
				} as LightBarComponent
			} else {
				newComp = base
			}

			// Update parent's port
			const updatedComponents = state.components.map((c) => {
				if (c.id === parentId) {
					return {
						...c,
						ports: c.ports.map((p) =>
							p.id === parentPortId ? { ...p, connectedTo: id } : p
						),
						childIds: [...c.childIds, id],
					}
				}
				return c
			})

			set({ components: [...updatedComponents, newComp] })
			return id
		},

		moveComponent: (id, x, y) => {
			set({
				components: get().components.map((c) =>
					c.id === id ? { ...c, x, y } : c
				),
			})
		},

		// ── Remove component and everything downstream ──
		removeComponent: (id) => {
			const state = get()
			// Collect all IDs to remove (recursive children)
			const toRemove = new Set<string>()
			function collect(cid: string) {
				toRemove.add(cid)
				const comp = state.components.find((c) => c.id === cid)
				if (comp) {
					comp.childIds.forEach(collect)
				}
			}
			collect(id)

			// Find the component to remove to update its parent
			const comp = state.components.find((c) => c.id === id)

			let updated = state.components.filter((c) => !toRemove.has(c.id))

			// Disconnect from parent
			if (comp?.parentId) {
				updated = updated.map((c) => {
					if (c.id === comp.parentId) {
						return {
							...c,
							ports: c.ports.map((p) =>
								p.connectedTo === id ? { ...p, connectedTo: null } : p
							),
							childIds: c.childIds.filter((cid) => cid !== id),
						}
					}
					return c
				})
			}

			set({
				components: updated,
				selectedComponentId:
					state.selectedComponentId && toRemove.has(state.selectedComponentId)
						? null
						: state.selectedComponentId,
			})
		},

		setComponentColor: (id, color) => {
			set({
				components: get().components.map((c) =>
					c.id === id ? { ...c, color } : c
				),
			})
		},

		setLightMode: (id, mode) => {
			set({
				components: get().components.map((c) =>
					c.id === id && c.type === 'light-bar'
						? { ...c, lightMode: mode } as LightBarComponent
						: c
				),
			})
		},

		rotateComponent: (id, angle) => {
			set({
				components: get().components.map((c) =>
					c.id === id ? { ...c, rotation: (c.rotation + angle) % 360 } : c
				),
			})
		},

		// ── Queries ──
		getComponent: (id) => get().components.find((c) => c.id === id),
		hasHub: () => get().components.some((c) => c.type === 'hub'),

		getTotalLightBarInches: () => {
			return get().components.reduce((sum, c) => {
				if (c.type === 'light-bar') {
					return sum + ((c as LightBarComponent).length || 0)
				}
				return sum
			}, 0)
		},

		canAddLightBar: (lengthInches) => {
			const current = get().getTotalLightBarInches()
			return (current + lengthInches) / 12 <= MAX_LIGHT_BAR_FEET
		},

		getLayoutSummary: () => {
			const comps = get().components
			let totalInches = 0
			let totalWatts = 0
			let totalPrice = 0

			comps.forEach((c) => {
				if (c.type === 'light-bar') {
					const lb = c as LightBarComponent
					totalInches += lb.length
					totalWatts += lb.length === 18 ? WATTS_PER_18 : WATTS_PER_36
					totalPrice += lb.length === 18 ? LIGHT_BAR_PRICE_18 : LIGHT_BAR_PRICE_36
				} else {
					totalPrice += COMPONENT_PRICES[c.type] || 0
				}
			})

			return {
				totalLengthInches: totalInches,
				totalLengthFeet: Math.round((totalInches / 12) * 100) / 100,
				maxLengthFeet: MAX_LIGHT_BAR_FEET,
				totalWatts,
				estimatedPrice: Math.round(totalPrice * 100) / 100,
				componentCount: comps.length,
			}
		},

		resetCeilingDesigner: () => {
			_nextId = 1
			set({
				components: [],
				selectedComponentId: null,
				activeColor: 'black',
				dragPayload: null,
			})
		},
	})
)
