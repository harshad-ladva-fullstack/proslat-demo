import { useState, type JSX, type RefObject } from 'react'
import {
	Box3,
	Vector3,
	Group,
	BufferGeometry,
	LineBasicMaterial,
	Line,
	Float32BufferAttribute,
	Raycaster,
	Object3D,
} from 'three'
import { Billboard, Text3D } from '@react-three/drei'
import { METER_TO_INCH } from '@/lib/functions'
import { useFrame, useThree } from '@react-three/fiber'
import {
	getClosestPointsBetweenBoxes,
	checkIfElementISModel,
} from '@/lib/utils'

interface GroupModelProps {
	groupRef?: RefObject<Group>
}

type TModelContainerProps = JSX.IntrinsicElements['group'] & GroupModelProps

export const GroupModel = ({ groupRef }: TModelContainerProps) => {
	const [size, setSize] = useState<Vector3 | null>(null)
	const [boxMin, setBoxMin] = useState<Vector3 | null>(null)
	const [boxMax, setBoxMax] = useState<Vector3 | null>(null)
	const [distances, setDistances] = useState<{
		left: { distance: number; point: Vector3 } | null
		right: { distance: number; point: Vector3 } | null
		top: { distance: number; point: Vector3 } | null
	}>({
		left: null,
		right: null,
		top: null,
	})
	const [geometryLeftDistance] = useState(() => new BufferGeometry())
	const [geometryRightDistance] = useState(() => new BufferGeometry())
	const [geometryTopDistance] = useState(() => new BufferGeometry())
	const [lastUpdateTime, setLastUpdateTime] = useState(0)

	const { scene } = useThree()

	// grouping threshold (meters). Two models are considered connected
	// if the closest distance between their bounding boxes is < GROUP_DIST
	const GROUP_DIST = 0.005

	const castRayToNearestObject = (
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
				if (parent === groupRef?.current) return false
				if (parent.name === 'ghost-model') return false
				parent = parent.parent
			}

			return (
				intersect.object !== groupRef?.current && intersect.distance > 0.001
			)
		})

		return filteredIntersects.length > 0
			? {
					distance: filteredIntersects[0].distance,
					point: filteredIntersects[0].point,
			  }
			: null
	}

	// Helper: compute box distance between two Box3s using shared util
	const boxDistance = (a: Box3, b: Box3) => {
		const [pA, pB] = getClosestPointsBetweenBoxes(a, b)
		return pA.distanceTo(pB)
	}

	// Build connected component of nearby visualize-model_* objects starting from the provided groupRef
	const findConnectedModels = (start: Object3D | null): Object3D[] => {
		if (!start) return []

		// collect all visualize-model objects in scene
		const models: Object3D[] = []
		scene.traverse(child => {
			if (checkIfElementISModel(child)) models.push(child)
		})

		// map to boxes
		const boxes = new Map<Object3D, Box3>()
		models.forEach(m => boxes.set(m, new Box3().setFromObject(m)))

		// adjacency via threshold
		const adj = new Map<Object3D, Object3D[]>()
		models.forEach(a => {
			adj.set(a, [])
			models.forEach(b => {
				if (a === b) return
				const boxA = boxes.get(a)!
				const boxB = boxes.get(b)!
				if (!boxA || !boxB) return
				const dist = boxDistance(boxA, boxB)
				if (dist < GROUP_DIST) {
					adj.get(a)!.push(b)
				}
			})
		})

		// BFS from start
		const comp: Object3D[] = []
		const visited = new Set<Object3D>()
		const q: Object3D[] = []
		// find start object in models (sometimes start is nested)
		const startObj = models.find(
			m => m === start || m === start.parent || start.name === m.name
		)
		if (!startObj) return [start]
		q.push(startObj)
		visited.add(startObj)
		while (q.length) {
			const cur = q.shift()!
			comp.push(cur)
			const neigh = adj.get(cur) || []
			neigh.forEach(n => {
				if (!visited.has(n)) {
					visited.add(n)
					q.push(n)
				}
			})
		}

		return comp
	}

	useFrame(({ clock }) => {
		if (groupRef?.current) {
			const currentTime = clock.getElapsedTime()
			if (currentTime - lastUpdateTime < 0.05) return

			setLastUpdateTime(currentTime)
			// compute connected group of models and union their boxes
			const connected = findConnectedModels(groupRef.current)
			let box: Box3
			if (connected.length <= 1) {
				box = new Box3().setFromObject(groupRef.current)
			} else {
				box = new Box3()
				connected.forEach(m => box.union(new Box3().setFromObject(m)))
			}
			const sizeVec = new Vector3()
			box.getSize(sizeVec)

			setSize(sizeVec)
			setBoxMin(box.min.clone())
			setBoxMax(box.max.clone())

			const center = new Vector3()
			box.getCenter(center)

			const worldMatrix = groupRef.current.matrixWorld
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

			setDistances({
				left: leftDistance,
				right: rightDistance,
				top: topDistance,
			})

			if (leftDistance && worldMatrix) {
				const leftEdge = center
					.clone()
					.add(leftDirection.clone().multiplyScalar(-sizeVec.x / 2))
				const leftEndPoint = leftDistance.point
				geometryLeftDistance.setAttribute(
					'position',
					new Float32BufferAttribute(
						[
							leftEdge.x,
							leftEdge.y,
							leftEdge.z,
							leftEndPoint.x,
							leftEndPoint.y,
							leftEndPoint.z,
						],
						3
					)
				)
			}

			if (rightDistance && worldMatrix) {
				const rightEdge = center
					.clone()
					.add(rightDirection.clone().multiplyScalar(sizeVec.x / 2))
				const rightEndPoint = rightDistance.point
				geometryRightDistance.setAttribute(
					'position',
					new Float32BufferAttribute(
						[
							rightEdge.x,
							rightEdge.y,
							rightEdge.z,
							rightEndPoint.x,
							rightEndPoint.y,
							rightEndPoint.z,
						],
						3
					)
				)
			}

			if (topDistance && worldMatrix) {
				const topEdge = center.clone().add(new Vector3(0, sizeVec.y / 2, 0))
				const topEndPoint = topDistance.point
				geometryTopDistance.setAttribute(
					'position',
					new Float32BufferAttribute(
						[
							topEdge.x,
							topEdge.y,
							topEdge.z,
							topEndPoint.x,
							topEndPoint.y,
							topEndPoint.z,
						],
						3
					)
				)
			}
		}
	})

	if (!size || !boxMin || !boxMax) return null

	const worldMatrix = groupRef?.current?.matrixWorld
	const leftLocalDirection = new Vector3(-1, 0, 0)
	const rightLocalDirection = new Vector3(1, 0, 0)

	const leftWorldDirection = worldMatrix
		? leftLocalDirection.clone().transformDirection(worldMatrix).normalize()
		: leftLocalDirection
	const rightWorldDirection = worldMatrix
		? rightLocalDirection.clone().transformDirection(worldMatrix).normalize()
		: rightLocalDirection

	const forwardLocal = new Vector3(0, 0, 1)
	const forwardWorld = worldMatrix
		? forwardLocal.clone().transformDirection(worldMatrix).normalize()
		: forwardLocal

	// Project forward onto XZ plane and decide which box sides are front
	const forwardXZ = new Vector3(forwardWorld.x, 0, forwardWorld.z)
	if (forwardXZ.lengthSq() < 1e-6) {
		// fallback: use right direction projection if forward is nearly vertical
		forwardXZ.set(rightWorldDirection.x, 0, rightWorldDirection.z)
	}
	forwardXZ.normalize()

	const frontXIsMax = forwardXZ.dot(new Vector3(1, 0, 0)) >= 0
	const frontZIsMax = forwardXZ.dot(new Vector3(0, 0, 1)) >= 0

	const frontZ = frontZIsMax ? boxMax.z : boxMin.z
	const backZ = frontZIsMax ? boxMin.z : boxMax.z
	const frontX = frontXIsMax ? boxMax.x : boxMin.x
	const backX = frontXIsMax ? boxMin.x : boxMax.x

	const frontRightTop = new Vector3(frontX, boxMax.y, frontZ)
	const bottomRightTop = new Vector3(frontX, boxMin.y, frontZ)
	const frontLeftTop = new Vector3(backX, boxMax.y, frontZ)
	const frontRightBottom = new Vector3(frontX, boxMax.y, backZ)

	const geometryHeight = new BufferGeometry()
	geometryHeight.setAttribute(
		'position',
		new Float32BufferAttribute(
			[
				frontRightTop.x,
				frontRightTop.y,
				frontRightTop.z,
				bottomRightTop.x,
				bottomRightTop.y,
				bottomRightTop.z,
			],
			3
		)
	)

	const geometryWidth = new BufferGeometry()
	geometryWidth.setAttribute(
		'position',
		new Float32BufferAttribute(
			[
				frontRightTop.x,
				frontRightTop.y,
				frontRightTop.z,
				frontLeftTop.x,
				frontLeftTop.y,
				frontLeftTop.z,
			],
			3
		)
	)

	const geometryDepth = new BufferGeometry()
	geometryDepth.setAttribute(
		'position',
		new Float32BufferAttribute(
			[
				frontRightTop.x,
				frontRightTop.y,
				frontRightTop.z,
				frontRightBottom.x,
				frontRightBottom.y,
				frontRightBottom.z,
			],
			3
		)
	)

	const lineMaterial = new LineBasicMaterial({ color: 'red' })
	const distanceLineMaterial = new LineBasicMaterial({ color: 'blue' })

	const OFFSET = 0.05

	const centerPos = new Vector3()
	if (groupRef?.current) {
		new Box3().setFromObject(groupRef.current).getCenter(centerPos)
	}

	const leftEdge = centerPos
		.clone()
		.add(leftWorldDirection.clone().multiplyScalar(-size.x / 2))
	const rightEdge = centerPos
		.clone()
		.add(rightWorldDirection.clone().multiplyScalar(size.x / 2))

	const posHeightText = frontRightTop
		.clone()
		.lerp(bottomRightTop, 0.5)
		.add(new Vector3(OFFSET, 0, OFFSET))

	const posWidthText = frontRightTop
		.clone()
		.lerp(frontLeftTop, 0.5)
		.add(new Vector3(0, OFFSET, OFFSET))

	const posDepthText = frontRightTop
		.clone()
		.lerp(frontRightBottom, 0.5)
		.add(new Vector3(OFFSET, OFFSET, 0))

	const sizeInches = size.clone().multiplyScalar(METER_TO_INCH)

	const leftDistancePos =
		distances.left && worldMatrix
			? leftEdge
					.clone()
					.lerp(distances.left.point, 0.5)
					.add(new Vector3(0, OFFSET, 0))
			: new Vector3()
	const rightDistancePos =
		distances.right && worldMatrix
			? rightEdge
					.clone()
					.lerp(distances.right.point, 0.5)
					.add(new Vector3(0, OFFSET, 0))
			: new Vector3()

	const topDistancePos =
		distances.top && worldMatrix && boxMin && boxMax
			? new Vector3()
					.addVectors(boxMin, boxMax)
					.divideScalar(2)
					.add(new Vector3(0, size.y / 2, 0))
					.clone()
					.lerp(distances.top.point, 0.5)
					.add(new Vector3(OFFSET, 0, 0))
			: new Vector3()

	return (
		<>
			<primitive
				name='ignore'
				object={new Line(geometryHeight, lineMaterial)}
			/>
			<primitive name='ignore' object={new Line(geometryWidth, lineMaterial)} />
			<primitive name='ignore' object={new Line(geometryDepth, lineMaterial)} />

			{distances.left && (
				<primitive
					name='ignore'
					object={new Line(geometryLeftDistance, distanceLineMaterial)}
				/>
			)}

			{distances.right && (
				<primitive
					name='ignore'
					object={new Line(geometryRightDistance, distanceLineMaterial)}
				/>
			)}

			{distances.top && (
				<primitive
					name='ignore'
					object={new Line(geometryTopDistance, distanceLineMaterial)}
				/>
			)}

			<Billboard name='ignore' position={posHeightText} follow={true}>
				<Text3D
					font='/fonts/helvetiker_regular.typeface.json'
					size={0.04}
					height={0.01}
				>
					{sizeInches.y.toFixed(1)}"
					<meshBasicMaterial color='black' />
				</Text3D>
			</Billboard>

			<Billboard name='ignore' position={posWidthText} follow={true}>
				<Text3D
					font='/fonts/helvetiker_regular.typeface.json'
					size={0.04}
					height={0.01}
				>
					{sizeInches.x.toFixed(1)}"
					<meshBasicMaterial color='black' />
				</Text3D>
			</Billboard>

			<Billboard name='ignore' position={posDepthText} follow={true}>
				<Text3D
					font='/fonts/helvetiker_regular.typeface.json'
					size={0.04}
					height={0.01}
				>
					{sizeInches.z.toFixed(1)}"
					<meshBasicMaterial color='black' />
				</Text3D>
			</Billboard>

			{distances.left && (
				<Billboard name='ignore' position={leftDistancePos} follow={true}>
					<Text3D
						font='/fonts/helvetiker_regular.typeface.json'
						size={0.05}
						height={0.01}
					>
						{(distances.left.distance * METER_TO_INCH).toFixed(1)}"
						<meshBasicMaterial color='blue' />
					</Text3D>
				</Billboard>
			)}

			{distances.right && (
				<Billboard name='ignore' position={rightDistancePos} follow={true}>
					<Text3D
						font='/fonts/helvetiker_regular.typeface.json'
						size={0.05}
						height={0.01}
					>
						{(distances.right.distance * METER_TO_INCH).toFixed(1)}"
						<meshBasicMaterial color='blue' />
					</Text3D>
				</Billboard>
			)}

			{distances.top && (
				<Billboard name='ignore' position={topDistancePos} follow={true}>
					<Text3D
						font='/fonts/helvetiker_regular.typeface.json'
						size={0.05}
						height={0.01}
					>
						{(distances.top.distance * METER_TO_INCH).toFixed(1)}"
						<meshBasicMaterial color='blue' />
					</Text3D>
				</Billboard>
			)}
		</>
	)
}
