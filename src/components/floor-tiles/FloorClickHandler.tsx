import { useEffect, useRef } from 'react'
import debounce from 'lodash.debounce'
import { useThree } from '@react-three/fiber'
import { useFloorTileHandler } from '@/hooks/useFloorTileHandler'
import { Raycaster, Vector2, Vector3, Object3D } from 'three'
import type { ThreeEvent } from '@react-three/fiber'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { postTiles } from '@/api/tiles'
import { useRoomBuilderStore } from '@/store/useRoomBuilderStore'
import { useMatch } from 'react-router-dom'
export const FloorClickHandler = () => {
	const { scene, camera, gl } = useThree()
	const {
		handleFloorClick,
		handleFloorDrag,
		handleFloorPointerDown,
		handleFloorPointerUp,
		canPlaceTiles,
	} = useFloorTileHandler()
	const { floorTiles } = useRoomBuilderStore()

	const match = useMatch('/room-builder/edit-room/:id/*')
	const projectId = match?.params?.id

	const queryClient = useQueryClient()
	const lastPostedTilesRef = useRef<string>('')

	const postTilesMutation = useMutation({
		mutationFn: ({
			projectId,
			tiles,
		}: {
			projectId: string
			tiles: typeof floorTiles
		}) => postTiles(projectId, tiles),
		onSuccess: () => {
			if (projectId) {
				queryClient.setQueryData(
					['tiles', projectId],
					JSON.parse(JSON.stringify(floorTiles))
				)
			}
			lastPostedTilesRef.current = JSON.stringify(floorTiles)
		},
	})

	type DebouncedFn = ((args: {
		projectId: string
		tiles: typeof floorTiles
	}) => void) & {
		cancel?: () => void
		flush?: () => void
	}

	const debouncedPostTilesRef = useRef<DebouncedFn | null>(
		debounce((args: { projectId: string; tiles: typeof floorTiles }) => {
			postTilesMutation.mutate(args)
		}, 1000) as unknown as DebouncedFn
	)

	// Ensure any change to local floorTiles triggers a debounced POST to the API
	// This addresses cases where changes can happen outside the pointer handlers
	// (for example via UI controls). We still avoid redundant calls by comparing
	// serialized state with the last successfully posted snapshot.
	useEffect(() => {
		const debounced = debouncedPostTilesRef.current
		if (!projectId || !debounced) return
		let serialized = ''
		try {
			serialized = JSON.stringify(floorTiles)
		} catch {
			// If serialization fails, post anyway to be safe
			debounced({ projectId, tiles: floorTiles })
			return
		}
		if (serialized === lastPostedTilesRef.current) return
		debounced({ projectId, tiles: floorTiles })
	}, [floorTiles, projectId])

	useEffect(() => {
		const debounced = debouncedPostTilesRef.current
		if (!canPlaceTiles) return

		const raycaster = new Raycaster()
		const mouse = new Vector2()
		let isDragging = false
		let movedDuringDrag = false

		type HitType = 'floor' | 'tile'
		const getFloorIntersection = (
			clientX: number,
			clientY: number
		): {
			hit: ReturnType<Raycaster['intersectObject']>[0]
			type: HitType
		} | null => {
			const rect = gl.domElement.getBoundingClientRect()
			mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1
			mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1

			raycaster.setFromCamera(mouse, camera)

			const intersects = raycaster.intersectObject(scene, true)
			if (!intersects || intersects.length === 0) return null

			const closest = intersects[0]
			let obj: Object3D | null = closest.object
			while (obj) {
				if (obj.name?.includes('floor') || obj.userData?.name === 'floor') {
					return { hit: closest, type: 'floor' }
				}
				if (
					obj.name?.startsWith('tile') ||
					obj.userData?.name === 'tile' ||
					obj.userData?.name === 'tile-edge'
				) {
					return { hit: closest, type: 'tile' }
				}
				obj = obj.parent
			}
			return null
		}

		let dragMode: 'paint' | 'edit' | null = null
		let windowListenersAdded = false

		const addWindowListeners = () => {
			if (windowListenersAdded) return
			window.addEventListener('pointermove', onPointerMove)
			window.addEventListener('pointerup', onPointerUp)
			window.addEventListener('pointercancel', onPointerCancelOrOut)
			windowListenersAdded = true
		}

		const removeWindowListeners = () => {
			if (!windowListenersAdded) return
			window.removeEventListener('pointermove', onPointerMove)
			window.removeEventListener('pointerup', onPointerUp)
			window.removeEventListener('pointercancel', onPointerCancelOrOut)
			windowListenersAdded = false
		}
		const onPointerDown = (event: PointerEvent) => {
			const res = getFloorIntersection(event.clientX, event.clientY)
			if (!res) return
			const { hit, type } = res
			// If we clicked on the room floor (not an existing tile) -> start painting
			if (type === 'floor') {
				// Immediate placement on pointerdown (left button) to make single click
				// placement reliable.
				if (event.button === 0) {
					const fakeClick = {
						point: hit.point,
						nativeEvent: event,
						stopPropagation: () => {},
						altKey: event.altKey,
					}
					handleFloorClick(fakeClick as unknown as ThreeEvent<MouseEvent>)
				}
				isDragging = true
				movedDuringDrag = false

				dragMode = 'paint'
				try {
					;(event.target as Element)?.setPointerCapture?.(event.pointerId)
				} catch {
					// ignore
				}
				// Also attach window listeners to ensure we receive pointermove/up
				// events even if pointerCapture fails or the pointer leaves the canvas.
				addWindowListeners()
				const fakeEvent = {
					point: hit.point,
					nativeEvent: event,
					stopPropagation: () => {},
					altKey: event.altKey,
				}
				handleFloorPointerDown(fakeEvent as unknown as ThreeEvent<PointerEvent>)
			} else if (type === 'tile') {
				// Clicked an existing tile -> edit its style (no drag painting)
				dragMode = 'edit'
				const fakeEvent = {
					point: hit.point,
					nativeEvent: event,
					stopPropagation: () => {},
					altKey: event.altKey,
				}
				handleFloorClick(fakeEvent as unknown as ThreeEvent<MouseEvent>)
			}
		}

		const onPointerMove = (event: PointerEvent) => {
			// If the primary button is no longer pressed, stop dragging.
			if (event.buttons !== undefined && event.buttons !== 1) {
				isDragging = false
				return
			}
			if (!isDragging || dragMode !== 'paint') return
			// mark that movement occurred (start painting) — do not require an explicit pixel threshold
			if (!movedDuringDrag) movedDuringDrag = true
			const res = getFloorIntersection(event.clientX, event.clientY)
			if (!res) return
			const { hit, type } = res
			// Only paint when pointer is over actual room floor (not on top of a tile)
			if (type !== 'floor') return
			// perform painting once movement has started
			const fakeEvent = {
				point: hit.point,
				nativeEvent: event,
				stopPropagation: () => {},
				altKey: event.altKey,
			}
			handleFloorDrag(fakeEvent as unknown as ThreeEvent<MouseEvent>)
		}

		const onPointerUp = (event: PointerEvent) => {
			// End dragging on pointer up
			const wasPaint = dragMode === 'paint'
			isDragging = false
			// If we started a paint drag but there was no movement (or movement stayed below threshold),
			// treat this as a single click and attempt to place a single tile.
			if (dragMode === 'paint' && !movedDuringDrag) {
				const res = getFloorIntersection(event.clientX, event.clientY)
				if (res && res.type === 'floor') {
					const fakeEvent = {
						point: res.hit.point,
						nativeEvent: event,
						stopPropagation: () => {},
						altKey: event.altKey,
					}
					handleFloorClick(fakeEvent as unknown as ThreeEvent<MouseEvent>)
				}
			} else if (dragMode === 'paint' && movedDuringDrag) {
				// A drag occurred (movement passed threshold) but it's possible no tile
				// ended up placed at the final position (e.g., movement didn't cross into
				// a new grid cell). In that case, attempt to place a tile at final point
				// if that cell is empty.
				const res = getFloorIntersection(event.clientX, event.clientY)
				if (res && res.type === 'floor') {
					const point = res.hit.point
					const gridX = Math.floor((point.x + 0.41 / 2) / 0.41)
					const gridZ = Math.floor((point.z + 0.41 / 2) / 0.41)
					const existing = useRoomBuilderStore
						.getState()
						.floorTiles.find(
							(t: import('@/types/tiles').ITile) =>
								t.x === gridX && t.z === gridZ
						)
					if (!existing) {
						const fakeEvent = {
							point: res.hit.point,
							nativeEvent: event,
							stopPropagation: () => {},
							altKey: event.altKey,
						}
						handleFloorClick(fakeEvent as unknown as ThreeEvent<MouseEvent>)
					}
				}
			}
			dragMode = null

			movedDuringDrag = false
			// cleanup window listeners attached during drag
			removeWindowListeners()
			// Release pointer capture if held
			try {
				;(event.target as Element)?.releasePointerCapture?.(event.pointerId)
			} catch {
				// ignore
			}
			const fakeEvent = {
				point: new Vector3(),
				nativeEvent: event,
				stopPropagation: () => {},
				altKey: event.altKey,
			}
			handleFloorPointerUp(fakeEvent as ThreeEvent<PointerEvent>)
			// Only post to server when this interaction started on the floor (paint mode).
			// This prevents posting when editing existing tiles or deleting via Alt.
			if (projectId && wasPaint) {
				// Avoid posting if tiles haven't changed since last successful post.
				let serialized = ''
				try {
					serialized = JSON.stringify(floorTiles)
				} catch {
					// fallback: if we can't serialize, just post to be safe
					postTilesMutation.mutate({ projectId, tiles: floorTiles })
					return
				}
				if (lastPostedTilesRef.current === serialized) {
					// No changes since last post; skip network call.
					return
				}
				// Schedule a debounced post for ongoing painting, but flush immediately
				// on pointer up so the backend receives the most recent tile state.
				debounced?.({ projectId, tiles: floorTiles })
				// Immediately flush pending debounced call to ensure latest data is sent now
				debounced?.flush?.()
			}
		}

		const onPointerCancelOrOut = (event: PointerEvent) => {
			isDragging = false
			dragMode = null

			movedDuringDrag = false
			try {
				;(event.target as Element)?.releasePointerCapture?.(event.pointerId)
			} catch {
				// ignore
			}
			// cleanup window listeners attached during drag
			removeWindowListeners()
		}

		const canvas = gl.domElement
		canvas.addEventListener('pointerdown', onPointerDown)
		canvas.addEventListener('pointermove', onPointerMove)
		canvas.addEventListener('pointerup', onPointerUp)
		canvas.addEventListener('pointercancel', onPointerCancelOrOut)
		canvas.addEventListener('pointerout', onPointerCancelOrOut)

		return () => {
			canvas.removeEventListener('pointerdown', onPointerDown)
			canvas.removeEventListener('pointermove', onPointerMove)
			canvas.removeEventListener('pointerup', onPointerUp)
			canvas.removeEventListener('pointercancel', onPointerCancelOrOut)
			canvas.removeEventListener('pointerout', onPointerCancelOrOut)
			// cancel any pending debounced post when component unmounts
			debounced?.cancel?.()
		}
	}, [
		canPlaceTiles,
		scene,
		camera,
		gl,
		handleFloorClick,
		handleFloorDrag,
		handleFloorPointerDown,
		handleFloorPointerUp,
		floorTiles,
		projectId,
		postTilesMutation,
	])

	return null
}
