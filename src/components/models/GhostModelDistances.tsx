import { useRef, useEffect, useCallback, type JSX, type RefObject } from 'react'
import {
	Box3,
	Vector3,
	Group,
	Raycaster,
	BufferGeometry,
	LineBasicMaterial,
	Line,
	Float32BufferAttribute,
} from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { useRoomBuilderStore } from '@/store/useRoomBuilderStore'

import type { Object3DEventMap } from 'three'
interface GhostModelDistancesProps {
	ghostRef?: RefObject<Group<Object3DEventMap> | null> | null
}

type TGhostModelDistancesProps = JSX.IntrinsicElements['group'] &
	GhostModelDistancesProps

export const GhostModelDistances = ({
	ghostRef,
}: TGhostModelDistancesProps) => {
	const linesRef = useRef<Line[]>([])

	const prevDistancesRef = useRef<{
		left: number | null
		right: number | null
		top: number | null
	}>({ left: null, right: null, top: null })
	const { selectedModelRef, setGhostDistances } = useRoomBuilderStore()

	const { scene } = useThree()

	const clearLines = () => {
		linesRef.current.forEach(line => {
			scene.remove(line)
			line.geometry.dispose()
			if (Array.isArray(line.material)) {
				line.material.forEach(mat => mat.dispose())
			} else {
				line.material.dispose()
			}
		})
		linesRef.current = []
	}

	useEffect(() => {
		return () => {
			linesRef.current.forEach(line => {
				scene.remove(line)
				line.geometry.dispose()
				if (Array.isArray(line.material)) {
					line.material.forEach(mat => mat.dispose())
				} else {
					line.material.dispose()
				}
			})
			linesRef.current = []
		}
	}, [scene])

	const castRayToNearestObject = useCallback(
		(
			origin: Vector3,
			direction: Vector3
		): { distance: number; point: Vector3 } | null => {
			const raycaster = new Raycaster(origin, direction.normalize(), 0, 100)
			raycaster.layers.enableAll()

			const intersects = raycaster.intersectObjects(scene.children, true)
			const filteredIntersects = intersects.filter(intersect => {
				if (intersect.object.name === 'ignore') return false
				if (intersect.object.name === 'ghost-model') return false

				let parent = intersect.object.parent
				while (parent) {
					if (parent === ghostRef?.current) return false
					if (parent === selectedModelRef?.current) return false
					if (parent.name === 'ghost-model') return false
					parent = parent.parent
				}

				return (
					intersect.object !== ghostRef?.current && intersect.distance > 0.001
				)
			})

			return filteredIntersects.length > 0
				? {
						distance: filteredIntersects[0].distance,
						point: filteredIntersects[0].point,
				  }
				: null
		},
		[scene, ghostRef, selectedModelRef]
	)

	useFrame(() => {
		if (!ghostRef?.current) {
			clearLines()
			return
		}

		clearLines()

		const box = new Box3().setFromObject(ghostRef.current)
		const sizeVec = new Vector3()
		box.getSize(sizeVec)

		const center = new Vector3()
		box.getCenter(center)

		const worldMatrix = ghostRef.current.matrixWorld
		const leftDirection = new Vector3(-1, 0, 0)
			.transformDirection(worldMatrix)
			.normalize()
		const rightDirection = new Vector3(1, 0, 0)
			.transformDirection(worldMatrix)
			.normalize()

		const leftEdgePos = center
			.clone()
			.add(leftDirection.clone().multiplyScalar(sizeVec.x / 2))
		const rightEdgePos = center
			.clone()
			.add(rightDirection.clone().multiplyScalar(sizeVec.x / 2))
		const topPos = center.clone().add(new Vector3(0, sizeVec.y / 2, 0))

		const leftDistance = castRayToNearestObject(leftEdgePos, leftDirection)
		const rightDistance = castRayToNearestObject(rightEdgePos, rightDirection)
		const topDistance = castRayToNearestObject(topPos, new Vector3(0, 1, 0))

		if (leftDistance) {
			const endPoint = leftEdgePos
				.clone()
				.add(leftDirection.clone().multiplyScalar(leftDistance.distance))
			const geometry = new BufferGeometry()
			geometry.setAttribute(
				'position',
				new Float32BufferAttribute(
					[
						leftEdgePos.x,
						leftEdgePos.y,
						leftEdgePos.z,
						endPoint.x,
						endPoint.y,
						endPoint.z,
					],
					3
				)
			)
			const material = new LineBasicMaterial({ color: 0x0000ff })
			const line = new Line(geometry, material)
			line.name = 'ignore'

			scene.add(line)
			linesRef.current.push(line)
		}

		if (rightDistance) {
			const endPoint = rightEdgePos
				.clone()
				.add(rightDirection.clone().multiplyScalar(rightDistance.distance))
			const geometry = new BufferGeometry()
			geometry.setAttribute(
				'position',
				new Float32BufferAttribute(
					[
						rightEdgePos.x,
						rightEdgePos.y,
						rightEdgePos.z,
						endPoint.x,
						endPoint.y,
						endPoint.z,
					],
					3
				)
			)
			const material = new LineBasicMaterial({ color: 0x0000ff })
			const line = new Line(geometry, material)
			line.name = 'ignore'

			scene.add(line)
			linesRef.current.push(line)
		}

		if (topDistance) {
			const endPoint = topPos
				.clone()
				.add(new Vector3(0, 1, 0).multiplyScalar(topDistance.distance))
			const geometry = new BufferGeometry()
			geometry.setAttribute(
				'position',
				new Float32BufferAttribute(
					[topPos.x, topPos.y, topPos.z, endPoint.x, endPoint.y, endPoint.z],
					3
				)
			)
			const material = new LineBasicMaterial({ color: 0x0000ff })
			const line = new Line(geometry, material)
			line.name = 'ignore'

			scene.add(line)
			linesRef.current.push(line)
		}

		const currentLeftDistance = leftDistance?.distance || null
		const currentRightDistance = rightDistance?.distance || null
		const currentTopDistance = topDistance?.distance || null

		const tolerance = 0.001

		if (
			Math.abs(
				(prevDistancesRef.current.left || 0) - (currentLeftDistance || 0)
			) > tolerance ||
			Math.abs(
				(prevDistancesRef.current.right || 0) - (currentRightDistance || 0)
			) > tolerance ||
			Math.abs(
				(prevDistancesRef.current.top || 0) - (currentTopDistance || 0)
			) > tolerance
		) {
			setGhostDistances({
				left: leftDistance
					? {
							distance: leftDistance.distance,
					  }
					: null,
				right: rightDistance
					? {
							distance: rightDistance.distance,
					  }
					: null,
				top: topDistance
					? {
							distance: topDistance.distance,
					  }
					: null,
			})

			prevDistancesRef.current = {
				left: currentLeftDistance,
				right: currentRightDistance,
				top: currentTopDistance,
			}
		}
	})

	return null
}
