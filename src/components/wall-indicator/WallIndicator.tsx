import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import {
	Group,
	Mesh,
	MeshBasicMaterial,
	BoxGeometry,
	Vector3,
	Object3D,
	Box3,
} from 'three'
import { checkIfElementISWall } from '@/lib/utils'
import { getWallBoundingBoxExcludingCutouts } from '@/modules/collision-checker/boxUtils'

interface WallIndicatorProps {
	roomModel?: Object3D | null
	roomPosition?: [number, number, number] | null
	// distance (in world units/meters) to offset inward from the wall
	offsetDistance?: number
}

// Renders semi-transparent footprints of each wall projected to the floor.
export const WallIndicator = ({
	roomModel,
	roomPosition,
	offsetDistance = 0.05,
}: WallIndicatorProps) => {
	const { scene } = useThree()
	const groupRef = useRef<Group | null>(null)

	useFrame(() => {
		const group = groupRef.current
		if (!group) return

		// Clear previous helpers
		while (group.children.length) {
			const child = group.children[0]
			group.remove(child)
			// dispose geometries/materials to avoid leaks
			// try to dispose safely (some children may not have geometry/material)
			try {
				// @ts-expect-error possible RTTI absence
				child.geometry?.dispose()
			} catch {
				// ignore
			}
			try {
				// @ts-expect-error possible RTTI absence
				child.material?.dispose()
			} catch {
				// ignore
			}
		}

		// Prefer traversing the provided roomModel (this allows footprints
		// even when the full room model isn't mounted into the scene). Fall
		// back to the live scene when no model is provided.
		const source = roomModel ?? scene

		// compute an approximate room center so we can decide which direction
		// is "inward" for each wall (we will offset footprints toward this
		// center). If roomPosition is provided (room model is rendered at an
		// offset), apply it to the computed box.
		const roomCenter = new Vector3()
		try {
			const roomBox = new Box3().setFromObject(source)
			if (roomPosition) {
				roomBox.min.add(new Vector3(...roomPosition))
				roomBox.max.add(new Vector3(...roomPosition))
			}
			roomBox.getCenter(roomCenter)
		} catch {
			// fallback: leave roomCenter at origin
		}

		source.traverse((obj: Object3D) => {
			const isWall =
				checkIfElementISWall(obj) ||
				(typeof obj.name === 'string' && checkIfElementISWall(obj)) ||
				!!obj.userData?.isWall

			if (!isWall) return

			try {
				const box = getWallBoundingBoxExcludingCutouts(obj)
				const size = new Vector3()
				box.getSize(size)
				const center = new Vector3()
				box.getCenter(center)

				// Apply room position offset if provided (Scene renders the
				// room model at an offset, so footprints must be offset too).
				if (roomPosition) {
					center.x += roomPosition[0]
					center.y += roomPosition[1]
					center.z += roomPosition[2]
					box.min.add(new Vector3(...roomPosition))
					box.max.add(new Vector3(...roomPosition))
				}

				// Determine which horizontal axis is the wall thickness (the
				// smaller of size.x and size.z). We'll offset the footprint
				// along that axis toward the room center by `offsetDistance`.
				const axis = size.x < size.z ? 'x' : 'z'
				const offset = new Vector3()
				if (offsetDistance && offsetDistance > 0) {
					if (axis === 'x') {
						let sign = Math.sign(roomCenter.x - center.x)
						if (sign === 0) sign = -1
						offset.set(sign * offsetDistance, 0, 0)
					} else {
						let sign = Math.sign(roomCenter.z - center.z)
						if (sign === 0) sign = -1
						offset.set(0, 0, sign * offsetDistance)
					}
				}

				// Create a thin box mesh at floor level to indicate wall footprint
				const geom = new BoxGeometry(size.x, 0.02, size.z)
				const mat = new MeshBasicMaterial({
					color: 0xff0000,
					transparent: true,
					opacity: 0.25,
					depthTest: true,
				})
				const mesh = new Mesh(geom, mat)
				// place slightly above the floor Y so the indicator is visible
				// above tiles and avoids z-fighting. Use a slightly larger offset
				// than the tiles.
				mesh.position.set(
					center.x + offset.x,
					box.min.y + 0.1,
					center.z + offset.z
				)
				mesh.name = `wall-footprint-${obj.name}`
				mesh.userData.isWallFootprint = true
				group.add(mesh)
			} catch {
				// defensive: some objects may not yield a box
			}
		})
	})

	return (
		<group
			name='ignore'
			ref={ref => (groupRef.current = ref)}
			renderOrder={100}
		/>
	)
}

export default WallIndicator
