import { useCallback, useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
import { deleteTile, patchTiles } from '@/api/tiles'
import { useMatch } from 'react-router-dom'
import { useRoomBuilderStore } from '@/store/useRoomBuilderStore'
import { TILE_SIZE } from '@/constants/floor-tiles'
import type { ThreeEvent } from '@react-three/fiber'
import type { ITile } from '@/types/tiles'
import { useRef } from 'react'

export const useFloorTileHandler = () => {
	const {
		floorTilesEnabled,
		selectedTileType,
		setCamControlDisabled,
		addFloorTile,
		removeFloorTile,
		useEdges,
	} = useRoomBuilderStore()

	// Track whether Alt is currently pressed globally. Some pointer events' altKey
	// may be unreliable across synthetic events, so keep a small ref we consult
	// when deciding whether to create tiles.
	const altPressedRef = useRef(false)
	useEffect(() => {
		const onKeyDown = (e: KeyboardEvent) => {
			if (e.key === 'Alt') altPressedRef.current = true
		}
		const onKeyUp = (e: KeyboardEvent) => {
			if (e.key === 'Alt') altPressedRef.current = false
		}
		window.addEventListener('keydown', onKeyDown)
		window.addEventListener('keyup', onKeyUp)
		return () => {
			window.removeEventListener('keydown', onKeyDown)
			window.removeEventListener('keyup', onKeyUp)
		}
	}, [])

	const match = useMatch('/room-builder/edit-room/:id/*')
	const projectId = match?.params?.id

	const deleteMutation = useMutation({
		mutationFn: ({ projectId, id }: { projectId: string; id: number }) =>
			deleteTile(projectId, id),
		onSuccess: () => {},
	})

	const patchMutation = useMutation({
		mutationFn: (payload: {
			projectId: string
			items: Array<Record<string, unknown>>
		}) => patchTiles(payload.projectId, payload.items),
		onSuccess: () => {},
	})

	// Keep refs to mutations and projectId so we can call them from callbacks
	// without having to include them in dependency arrays (avoids lint churn).
	const deleteMutationRef = useRef(deleteMutation)
	const patchMutationRef = useRef(patchMutation)
	const projectIdRef = useRef(projectId)

	useEffect(() => {
		deleteMutationRef.current = deleteMutation
	}, [deleteMutation])
	useEffect(() => {
		patchMutationRef.current = patchMutation
	}, [patchMutation])
	useEffect(() => {
		projectIdRef.current = projectId
	}, [projectId])

	useEffect(() => {
		const handleGlobalPointerUp = () => {
			setCamControlDisabled(false)
		}

		const handleGlobalPointerLeave = () => {
			setCamControlDisabled(false)
		}

		if (floorTilesEnabled) {
			document.addEventListener('pointerup', handleGlobalPointerUp)
			document.addEventListener('mouseleave', handleGlobalPointerLeave)
		}

		return () => {
			document.removeEventListener('pointerup', handleGlobalPointerUp)
			document.removeEventListener('mouseleave', handleGlobalPointerLeave)
			setCamControlDisabled(false)
		}
	}, [floorTilesEnabled, setCamControlDisabled])

	const handleFloorClick = useCallback(
		(event: ThreeEvent<MouseEvent>) => {
			if (!floorTilesEnabled) return

			console.log('selectedTileType', selectedTileType)

			event.stopPropagation()
			setCamControlDisabled(true)

			const point = event.point
			if (!point) return

			const gridX = Math.floor((point.x + TILE_SIZE / 2) / TILE_SIZE)
			const gridZ = Math.floor((point.z + TILE_SIZE / 2) / TILE_SIZE)

			// Boundary check: Allow tiles across the entire floor
			// Increased tolerance significantly to allow full floor coverage
			{
				const { roomParams } = useRoomBuilderStore.getState()
				const halfW = roomParams.width / 2 + TILE_SIZE * 10 // Much larger tolerance
				const halfD = roomParams.depth / 2 + TILE_SIZE * 10 // Much larger tolerance
				const cx = gridX * TILE_SIZE
				const cz = gridZ * TILE_SIZE
				if (cx < -halfW || cx > halfW || cz < -halfD || cz > halfD) {
					setTimeout(() => setCamControlDisabled(false), 50)
					return
				}
			}

			// Alt + click = remove. Consult altPressedRef in case the synthetic event
			// doesn't reliably include the altKey flag.
			if (event.altKey || altPressedRef.current) {
				// Try to delete via API if this tile has a server id
				const existing = useRoomBuilderStore
					.getState()
					.floorTiles.find((t: ITile) => t.x === gridX && t.z === gridZ)
				removeFloorTile(gridX, gridZ)
				if (projectIdRef.current && existing?.id) {
					deleteMutationRef.current?.mutate({
						projectId: projectIdRef.current,
						id: existing.id,
					})
				}
			} else if (selectedTileType) {
				const existing = useRoomBuilderStore
					.getState()
					.floorTiles.find((t: ITile) => t.x === gridX && t.z === gridZ)

				if (
					existing &&
					existing.type === selectedTileType &&
					existing.useEdges === useEdges
				) {
					// no-op to avoid stuck tile
				} else {
					// replace or add
					console.log(
						'Adding tile at',
						gridX,
						gridZ,
						selectedTileType,
						useEdges
					)
					addFloorTile(gridX, gridZ, selectedTileType, useEdges)
					// If there was an existing tile with a server id, send a PATCH for that single tile
					if (projectIdRef.current && existing?.id) {
						const selectedEdgesColor =
							useRoomBuilderStore.getState().selectedEdgesColor
						const item: Record<string, unknown> = {
							id: existing.id,
							type: selectedTileType,
							useEdges,
							edgesColor: useEdges
								? selectedEdgesColor ?? undefined
								: undefined,
						}
						patchMutationRef.current?.mutate({
							projectId: projectIdRef.current,
							items: [item],
						})
					}
				}
			}

			setTimeout(() => {
				setCamControlDisabled(false)
			}, 50)
		},
		[
			floorTilesEnabled,
			useEdges,
			selectedTileType,
			addFloorTile,
			removeFloorTile,
			setCamControlDisabled,
		]
	)

	const handleFloorPointerDown = useCallback(
		(event: ThreeEvent<PointerEvent>) => {
			if (!floorTilesEnabled || !selectedTileType) return
			event.stopPropagation()
			setCamControlDisabled(true)
		},
		[floorTilesEnabled, selectedTileType, setCamControlDisabled]
	)

	const handleFloorPointerUp = useCallback(
		(event: ThreeEvent<PointerEvent>) => {
			event.stopPropagation()
			setCamControlDisabled(false)
		},
		[setCamControlDisabled]
	)

	const handleFloorDrag = useCallback(
		(event: ThreeEvent<MouseEvent>) => {
			if (!floorTilesEnabled || !selectedTileType) return
			if (event.nativeEvent.buttons !== 1) return // Тільки лівий клік

			const point = event.point
			if (!point) return

			const gridX = Math.floor((point.x + TILE_SIZE / 2) / TILE_SIZE)
			const gridZ = Math.floor((point.z + TILE_SIZE / 2) / TILE_SIZE)

			// Boundary check during drag painting - allow full floor coverage
			{
				const { roomParams } = useRoomBuilderStore.getState()
				const halfW = roomParams.width / 2 + TILE_SIZE * 10 // Much larger tolerance
				const halfD = roomParams.depth / 2 + TILE_SIZE * 10 // Much larger tolerance
				const cx = gridX * TILE_SIZE
				const cz = gridZ * TILE_SIZE
				if (cx < -halfW || cx > halfW || cz < -halfD || cz > halfD) return
			}

			if (event.altKey || altPressedRef.current) {
				// Alt + drag => delete tiles under cursor
				removeFloorTile(gridX, gridZ)
				return
			}

			// Paint/replace tile under cursor
			const existing = useRoomBuilderStore
				.getState()
				.floorTiles.find(
					(t: import('@/types/tiles').ITile) => t.x === gridX && t.z === gridZ
				)
			if (
				existing &&
				existing.type === selectedTileType &&
				existing.useEdges === useEdges
			) {
				// no-op
			} else {
				addFloorTile(gridX, gridZ, selectedTileType, useEdges)
			}
		},
		[
			floorTilesEnabled,
			selectedTileType,
			addFloorTile,
			useEdges,
			removeFloorTile,
		]
	)

	return {
		handleFloorClick,
		handleFloorDrag,
		handleFloorPointerDown,
		handleFloorPointerUp,
		canPlaceTiles: floorTilesEnabled,
	}
}
