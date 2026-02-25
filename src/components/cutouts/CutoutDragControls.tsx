import { useRef, useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import { DragControls } from 'three/examples/jsm/controls/DragControls.js'
import {
	Mesh,
	Vector3,
	Box3,
	Line,
	BufferGeometry,
	Float32BufferAttribute,
	LineBasicMaterial,
	Raycaster,
	Quaternion,
	Object3D,
	Material,
} from 'three'
import { useRoomBuilderStore } from '@/store/useRoomBuilderStore'

export function CutoutDragControls() {
	const { scene, camera, gl } = useThree()
	const { setCamControlDisabled, setGhostDistances } = useRoomBuilderStore()
	const dragControlsRef = useRef<DragControls | null>(null)
	const isDraggingRef = useRef(false)

	const clearDistanceLines = useRef((cutout: Mesh) => {
		if (cutout.userData.distanceLines) {
			cutout.userData.distanceLines.forEach((line: Line) => {
				scene.remove(line)
				line.geometry.dispose()
				;(line.material as LineBasicMaterial).dispose()
			})
			cutout.userData.distanceLines = []
		}
	}).current

	const createDistanceLine = useRef(
		(
			cutout: Mesh,
			origin: Vector3,
			distance: number,
			parallelDir: Vector3,
			color = 0x0000ff
		) => {
			const start = origin.clone()
			const dir = parallelDir.clone().normalize()
			const end = start.clone().add(dir.multiplyScalar(distance))

			const geometry = new BufferGeometry()
			geometry.setAttribute(
				'position',
				new Float32BufferAttribute(
					[start.x, start.y, start.z, end.x, end.y, end.z],
					3
				)
			)
			const material = new LineBasicMaterial({ color })
			const line = new Line(geometry, material)
			scene.add(line)
			if (!cutout.userData.distanceLines) cutout.userData.distanceLines = []
			cutout.userData.distanceLines.push(line)
		}
	).current

	useEffect(() => {
		const findCutouts = (): Mesh[] => {
			const cutouts: Mesh[] = []
			scene.traverse(child => {
				if (
					child instanceof Mesh &&
					child.userData.isCutout &&
					child.userData.isDraggable
				)
					cutouts.push(child)
			})
			return cutouts
		}

		const updateDragControls = () => {
			if (isDraggingRef.current) return
			const cutouts = findCutouts()
			const currentCutouts = dragControlsRef.current?.getObjects() || []
			const needsUpdate =
				cutouts.length !== currentCutouts.length ||
				cutouts.some(cutout => !currentCutouts.includes(cutout))

			if (needsUpdate) {
				if (dragControlsRef.current) {
					dragControlsRef.current.dispose()
					dragControlsRef.current = null
				}
				if (cutouts.length > 0) {
					dragControlsRef.current = new DragControls(
						cutouts,
						camera,
						gl.domElement
					)
					dragControlsRef.current.enabled = true
					dragControlsRef.current.transformGroup = false
					dragControlsRef.current.rotateSpeed = 0

					dragControlsRef.current.addEventListener('dragstart', event => {
						const cutout = event.object as Mesh
						isDraggingRef.current = true
						setCamControlDisabled(true)
						if (cutout.material && !Array.isArray(cutout.material)) {
							const m = cutout.material as Material & {
								color?: { setHex: (n: number) => void }
							}
							m.color?.setHex(0x00ff00)
						}
						gl.domElement.style.cursor = 'grabbing'
					})

					dragControlsRef.current.addEventListener('drag', event => {
						const cutout = event.object as Mesh
						const wall = cutout.parent as Mesh
						if (!wall) return

						const userData = cutout.userData
						const originalY = userData.originalY || cutout.position.y
						if (!userData.wallBounds || !userData.wallSize) {
							const wallBounds = new Box3().setFromObject(wall)
							const wallSize = new Vector3()
							wallBounds.getSize(wallSize)
							userData.wallBounds = wallBounds
							userData.wallSize = wallSize
						}

						// compute wall size (local) and cutout bounding box in world space
						const wallSize = userData.wallSizeLocal || userData.wallSize

						const boxWorld = new Box3().setFromObject(cutout)
						const boxMinWorld = boxWorld.min.clone()
						const boxMaxWorld = boxWorld.max.clone()
						const boxCenterWorld = boxWorld.getCenter(new Vector3())

						// transform box corners/center into wall-local coordinates
						const boxMinLocal = wall.worldToLocal(boxMinWorld)
						const boxMaxLocal = wall.worldToLocal(boxMaxWorld)
						const boxCenterLocal = wall.worldToLocal(boxCenterWorld.clone())

						const halfExtentsLocal = boxMaxLocal
							.clone()
							.sub(boxMinLocal)
							.multiplyScalar(0.5)

						// clamp center in wall-local coords using extents
						boxCenterLocal.x = Math.max(
							-wallSize.x / 2 + halfExtentsLocal.x,
							Math.min(wallSize.x / 2 - halfExtentsLocal.x, boxCenterLocal.x)
						)
						boxCenterLocal.z = Math.max(
							-wallSize.z / 2 + halfExtentsLocal.z,
							Math.min(wallSize.z / 2 - halfExtentsLocal.z, boxCenterLocal.z)
						)
						boxCenterLocal.y = originalY

						// write clamped center back to cutout local position (parent is wall)
						cutout.position.copy(boxCenterLocal)

						// prepare rays: compute front point in world space using current geometry
						const size = new Vector3()
						boxWorld.getSize(size)
						const frontOffset = new Vector3(0, 0, size.z / 2)
						const worldFront = cutout.localToWorld(frontOffset.clone())

						const wallQuat = new Quaternion()
						wall.getWorldQuaternion(wallQuat)

						const rightDir = new Vector3(1, 0, 0)
							.applyQuaternion(wallQuat)
							.normalize()
						const leftDir = new Vector3(-1, 0, 0)
							.applyQuaternion(wallQuat)
							.normalize()
						const upDir = new Vector3(0, 1, 0)

						const directions = [
							{ dir: rightDir, key: 'right' },
							{ dir: leftDir, key: 'left' },
							{ dir: upDir, key: 'top' },
						]

						const distances: Record<string, number | null> = {
							left: null,
							right: null,
							top: null,
						}

						directions.forEach(({ dir, key }) => {
							const rayOrigin = worldFront.clone()
							const rayDirection = dir.clone()
							const raycaster = new Raycaster(rayOrigin, rayDirection, 0, 100)
							raycaster.layers.enableAll()
							const intersects = raycaster
								.intersectObjects(scene.children, true)
								.filter(intersect => {
									if (intersect.object === cutout) return false
									let parent: Object3D | null = intersect.object
									while (parent) {
										if (parent === cutout) return false
										parent = parent.parent as Object3D | null
									}
									return intersect.distance > 0.001
								})
							if (intersects.length > 0) {
								const dist = intersects[0].distance
								// createDistanceLine(cutout, rayOrigin, dist, dir)
								distances[key] = dist
							}
					})

						setGhostDistances({
							left: distances.left ? { distance: distances.left } : null,
							right: distances.right ? { distance: distances.right } : null,
							top: distances.top ? { distance: distances.top } : null,
						})
					})

					dragControlsRef.current.addEventListener('dragend', event => {
						const cutout = event.object as Mesh
						isDraggingRef.current = false
						setCamControlDisabled(false)
						if (cutout.material && !Array.isArray(cutout.material)) {
							const m = cutout.material as Material & {
								color?: { setHex: (n: number) => void }
							}
							m.color?.setHex(0xff0000)
						}
						gl.domElement.style.cursor = 'default'
						clearDistanceLines(cutout)
					})
				}
			}
		}

		const intervalId = setInterval(updateDragControls, 1000)
		setTimeout(updateDragControls, 100)
		return () => {
			clearInterval(intervalId)
			if (dragControlsRef.current) dragControlsRef.current.dispose()
			setCamControlDisabled(false)
			gl.domElement.style.cursor = 'default'
		}
	}, [
		scene,
		camera,
		gl,
		setCamControlDisabled,
		setGhostDistances,
		createDistanceLine,
		clearDistanceLines,
	])

	return null
}
