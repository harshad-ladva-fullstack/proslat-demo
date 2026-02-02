import { useState, useCallback } from 'react'
import { Mesh, Vector3 } from 'three'
import { updateCutoutPosition, getCutoutAtPosition } from '@/lib/wall-actions'
import type { ThreeEvent } from '@react-three/fiber'

export const useCutoutDrag = () => {
	const [dragState, setDragState] = useState<{
		isDragging: boolean
		cutoutMesh: Mesh | null
		wallMesh: Mesh | null
		offset: Vector3
	}>({
		isDragging: false,
		cutoutMesh: null,
		wallMesh: null,
		offset: new Vector3(),
	})

	const handlePointerDown = useCallback((event: ThreeEvent<PointerEvent>) => {
		if (!event.intersections[0]) return

		const wallObject = event.intersections[0].object.parent
		if (!wallObject) return

		const cutout = getCutoutAtPosition(wallObject, event.point)
		if (cutout && cutout.userData.isDraggable) {
			event.stopPropagation()

			const wallMesh = cutout.userData.parentWall as Mesh
			const offset = new Vector3().subVectors(
				cutout.position,
				wallMesh.worldToLocal(event.point.clone())
			)

			setDragState({
				isDragging: true,
				cutoutMesh: cutout,
				wallMesh,
				offset,
			})
		}
	}, [])

	const handlePointerMove = useCallback(
		(event: ThreeEvent<PointerEvent>) => {
			if (!dragState.isDragging || !dragState.cutoutMesh || !dragState.wallMesh)
				return

			event.stopPropagation()

			const newPosition = new Vector3().addVectors(
				dragState.wallMesh.worldToLocal(event.point.clone()),
				dragState.offset
			)

			updateCutoutPosition(
				dragState.cutoutMesh,
				dragState.wallMesh.localToWorld(newPosition),
				dragState.wallMesh
			)
		},
		[dragState]
	)

	const handlePointerUp = useCallback(
		(event: ThreeEvent<PointerEvent>) => {
			if (dragState.isDragging) {
				event.stopPropagation()
				setDragState({
					isDragging: false,
					cutoutMesh: null,
					wallMesh: null,
					offset: new Vector3(),
				})
			}
		},
		[dragState.isDragging]
	)

	return {
		handlePointerDown,
		handlePointerMove,
		handlePointerUp,
		isDragging: dragState.isDragging,
	}
}
