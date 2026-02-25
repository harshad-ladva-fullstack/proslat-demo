import {
	checkIfElementISModel,
	checkIfElementISWall,
	checkIfSnap,
	getClosestPointsBetweenBoxes,
	getPositionYByModelType,
} from '@/lib/utils'
import { useRoomBuilderStore } from '@/store/useRoomBuilderStore'
import { useThree, useFrame } from '@react-three/fiber'
import { useEffect, useRef, useCallback } from 'react'
import {
	ArrowHelper,
	Box3,
	BoxGeometry,
	Color,
	Mesh,
	MeshStandardMaterial,
	Object3D,
	Quaternion,
	Raycaster,
	Vector2,
	Vector3,
	WireframeGeometry,
	LineSegments,
	LineBasicMaterial,
} from 'three'
import { SNAP_DISTANCE_MODEL, SNAP_DISTANCE_WALL } from '@/constants/constants'
import { getWallBoundingBoxExcludingCutouts } from '@/modules/collision-checker/boxUtils'
import {
	COLLISION_RULES,
	MODEL_TYPES,
	canSnapToTarget,
} from '@/lib/model-constants'

function getOrientedBoundingInfo(obj: Object3D): {
	box: Box3
	size: Vector3
	center: Vector3
	corners: Vector3[]
} {
	obj.updateMatrixWorld(true)

	// Use world axis-aligned bounding box for collision/visualization boxes.
	const box = new Box3().setFromObject(obj)
	const size = new Vector3()
	box.getSize(size)
	const center = new Vector3()
	box.getCenter(center)

	const quaternion = new Quaternion()
	obj.getWorldQuaternion(quaternion)

	const boxWithQuaternion = box as Box3 & { quaternion?: Quaternion }
	boxWithQuaternion.quaternion = quaternion.clone()

	const corners = [
		new Vector3(box.min.x, box.min.y, box.min.z),
		new Vector3(box.max.x, box.min.y, box.min.z),
		new Vector3(box.min.x, box.max.y, box.min.z),
		new Vector3(box.max.x, box.max.y, box.min.z),
		new Vector3(box.min.x, box.min.y, box.max.z),
		new Vector3(box.max.x, box.min.y, box.max.z),
		new Vector3(box.min.x, box.max.y, box.max.z),
		new Vector3(box.max.x, box.max.y, box.max.z),
	]

	return { box, size, center, corners }
}

// helper moved to boxUtils.ts

function shrinkBox(box: Box3, factor: number): Box3 {
	const size = new Vector3()
	box.getSize(size)
	const shrink = size.multiplyScalar(factor)

	const newMin = new Vector3(
		box.min.x + shrink.x / 2,
		box.min.y + shrink.y / 2,
		box.min.z + shrink.z / 2
	)
	const newMax = new Vector3(
		box.max.x - shrink.x / 2,
		box.max.y - shrink.y / 2,
		box.max.z - shrink.z / 2
	)

	return new Box3(newMin, newMax)
}

// helper moved to boxUtils.ts

function shouldIgnoreCollision(
	draggingType: string,
	targetType: string
): boolean {
	const rule = COLLISION_RULES.find(rule => rule.type === draggingType)
	if (!rule) return false

	return rule.ignoreTypes.includes(targetType)
}

function paintObjectWithRestore(obj: Object3D, color: Color, restore = false) {
	obj.traverse(child => {
		if (!(child instanceof Mesh)) return

		const materials = Array.isArray(child.material)
			? child.material
			: [child.material]

		materials.forEach(mat => {
			if (!(mat instanceof MeshStandardMaterial)) return

			if (!mat.userData.cloned) {
				const cloned = mat.clone()
				cloned.userData.originalColor =
					mat.userData.originalColor || `#${mat.color.getHexString()}`
				cloned.userData.customColor =
					mat.userData.customColor || `#${mat.color.getHexString()}`
				cloned.userData.cloned = true

				if (Array.isArray(child.material)) {
					const matsCopy = child.material.slice()
					const idx = matsCopy.indexOf(mat)
					if (idx !== -1) matsCopy[idx] = cloned
					child.material = matsCopy
				} else {
					child.material = cloned
				}

				mat = cloned
			}

			if (restore && mat.userData.customColor) {
				mat.color.set(mat.userData.customColor)
			} else {
				if (!mat.userData.customColor) {
					mat.userData.customColor = `#${mat.color.getHexString()}`
				}
				mat.color.copy(color)
			}

			mat.needsUpdate = true
		})
	})
}

function createBoundingBoxVisualization(
	box: Box3,
	color: Color = new Color(0x00ff00),
	name: string = 'debug-box'
): LineSegments {
	const geometry = new BoxGeometry()
	const wireframe = new WireframeGeometry(geometry)
	const material = new LineBasicMaterial({ color })
	const wireframeLines = new LineSegments(wireframe, material)

	const size = new Vector3()
	box.getSize(size)
	const center = new Vector3()
	box.getCenter(center)

	wireframeLines.scale.set(size.x, size.y, size.z)
	wireframeLines.position.copy(center)
	wireframeLines.name = name

	wireframeLines.userData.isDebugVisualization = true
	wireframeLines.userData.ignoreInCollisions = true

	wireframeLines.renderOrder = 999

	material.depthTest = false
	material.transparent = true
	material.opacity = 0.8

	return wireframeLines
}

// Функція для детекції нижнього об'єкта під час перетягування
function detectBottomObjectUnderDragging(
	draggingModel: Object3D,
	scene: Object3D,
	sourceVisualizeRef: Object3D | null,
	raycaster: Raycaster,
	debug: boolean = false,
	arrowHelpersRef?: React.MutableRefObject<ArrowHelper[]>
): Object3D | null {
	if (debug) {
		console.debug(
			'detectBottomObjectUnderDragging called for:',
			draggingModel.name,
			draggingModel.userData?.type
		)
	}

	// Use oriented bounding info so we can respect the model quaternion when
	// building ray origins (rotate control points with model orientation).
	const draggedInfo = getOrientedBoundingInfo(draggingModel)
	const boundingBox = draggedInfo.box
	const center = draggedInfo.center.clone()
	const size = draggedInfo.size

	// quaternion stored on the box by getOrientedBoundingInfo or fallback to
	// the model world quaternion
	const quaternion =
		(draggedInfo.box as Box3 & { quaternion?: Quaternion }).quaternion ||
		draggingModel.getWorldQuaternion(new Quaternion())

	const draggingType = draggingModel.userData?.type

	if (debug) {
		console.debug('draggingType:', draggingType)
	}

	// Створюємо точки для променів: 3 по краях і 1 в центрі.
	// Для двох внутрішніх точок по осі X використовуємо позицію на 20% від краю коробки.
	// Додаємо зсуви по X та Z на 10% від розмірів коробки (відповідно до запиту).
	// Build world-space axes from the model quaternion
	const xAxis = new Vector3(1, 0, 0).applyQuaternion(quaternion)
	const zAxis = new Vector3(0, 0, 1).applyQuaternion(quaternion)

	const boxWidth = size.x
	const boxDepth = size.z

	// positions at ~20% inward from each side along model X axis
	const left20Pos = center
		.clone()
		.add(xAxis.clone().multiplyScalar((0.5 - 0.1) * boxWidth))
	const right20Pos = center
		.clone()
		.add(xAxis.clone().multiplyScalar(-(0.5 - 0.1) * boxWidth))

	// offsets (kept previously) are not used here because we calculate positions via axes

	// compute z offset relative to model center: min.z + offsetZ in oriented space
	const zOffsetMultiplier = -(0.5 - 0.1) * boxDepth // equals -0.4 * boxDepth

	const minY = boundingBox.min.y

	const rayOrigins = [
		left20Pos
			.clone()
			.add(zAxis.clone().multiplyScalar(zOffsetMultiplier))
			.setY(minY),
		right20Pos
			.clone()
			.add(zAxis.clone().multiplyScalar(zOffsetMultiplier))
			.setY(minY),
		center
			.clone()
			.add(zAxis.clone().multiplyScalar(zOffsetMultiplier))
			.setY(minY),
	]

	const rayDirection = new Vector3(0, -1, 0) // Напрямок вниз
	const maxRayDistance = 10

	// Зберігаємо підрахунок перетинів для кожного об'єкта
	const objectIntersections = new Map<Object3D, number>()

	// Зберігаємо прапорці для кожного рейкасту: чи був перетин з visualize-model
	const rayHitFlags: boolean[] = []

	rayOrigins.forEach(origin => {
		raycaster.set(origin, rayDirection)
		const hits = raycaster.intersectObjects(scene.children, true)

		if (debug) {
			console.debug(
				`Ray from origin (${origin.x.toFixed(2)}, ${origin.y.toFixed(
					2
				)}, ${origin.z.toFixed(2)}): found ${hits.length} total hits`
			)
		}

		// Додаємо візуалізацію променя для дебагу
		if (debug && arrowHelpersRef) {
			const arrow = new ArrowHelper(
				rayDirection,
				origin,
				maxRayDistance,
				0x00ffff // Блакитний колір для детекції нижнього об'єкта
			)
			arrow.name = 'raycast-bottom-detection'
			arrow.userData.isDebugVisualization = true
			arrow.userData.ignoreInCollisions = true
			arrow.renderOrder = 999
			scene.add(arrow)
			arrowHelpersRef.current.push(arrow)
		}

		const filteredHits = hits.filter(hit => {
			// Фільтруємо об'єкти відповідно до логіки з основного коду
			if (hit.object.userData?.isDebugVisualization) {
				if (debug)
					console.log(`  Filtered out debug visualization: ${hit.object.name}`)
				return false
			}
			if (hit.distance > maxRayDistance) {
				if (debug)
					console.log(
						`  Filtered out by distance (${hit.distance.toFixed(
							2
						)} > ${maxRayDistance}): ${hit.object.name}`
					)
				return false
			}

			// Перевіряємо чи це не сам об'єкт, що перетягується
			let current = hit.object
			while (current) {
				if (current === draggingModel) {
					if (debug)
						console.log(`  Filtered out dragging model: ${hit.object.name}`)
					return false
				}
				current = current.parent!
			}

			// Перевіряємо чи це не оригінальний об'єкт
			if (sourceVisualizeRef) {
				let current = hit.object
				while (current) {
					if (current === sourceVisualizeRef) {
						if (debug)
							console.log(
								`  Filtered out source visualize ref: ${hit.object.name}`
							)
						return false
					}
					current = current.parent!
				}
			}

			// Ігноруємо підлогу та деякі спеціальні об'єкти
			if (hit.object.name.includes('floor')) {
				if (debug) console.log(`  Filtered out floor: ${hit.object.name}`)
				return false
			}
			if (hit.object.name.includes('raycast-')) {
				if (debug) console.log(`  Filtered out raycast: ${hit.object.name}`)
				return false
			}
			if (hit.object.name.includes('debug-')) {
				if (debug) console.log(`  Filtered out debug: ${hit.object.name}`)
				return false
			}
			if (hit.object.name === 'ignore') {
				if (debug) console.log(`  Filtered out ignore: ${hit.object.name}`)
				return false
			}

			// Перевіряємо чи це модель або об'єкт з типом
			// Шукаємо батьківський об'єкт, який є моделлю
			let modelParent = hit.object
			let isModel = false
			while (modelParent) {
				if (checkIfElementISModel(modelParent)) {
					isModel = true
					break
				}
				modelParent = modelParent.parent!
			}

			// Перевіряємо тип на знайденому батьківському об'єкті-моделі
			const hasType = modelParent?.userData?.type

			if (debug) {
				console.debug(
					`  Object ${
						hit.object.name
					}: hasType=${!!hasType}, isModel=${isModel}, type=${hasType}, modelParent=${
						modelParent?.name
					}`
				)
			}

			return hasType && isModel
		})

		if (debug) {
			console.debug(
				`Ray ${rayOrigins.indexOf(origin)}: found ${
					filteredHits.length
				} valid hits`
			)
		}

		let rayHasModelHit = false
		filteredHits.forEach(hit => {
			let modelObject: Object3D | null = hit.object
			while (modelObject && !modelObject.userData?.type) {
				modelObject = modelObject.parent!
			}

			if (modelObject && modelObject.userData?.type) {
				rayHasModelHit = true
				const currentCount = objectIntersections.get(modelObject) || 0
				objectIntersections.set(modelObject, currentCount + 1)
				if (debug) {
					console.debug(
						`    Added intersection for ${modelObject.name}, count now: ${
							currentCount + 1
						}`
					)
				}
			}
		})

		rayHitFlags.push(!!rayHasModelHit)
	})

	if (debug) {
		console.debug(
			`Total objects found with intersections: ${objectIntersections.size}`
		)
	}

	// Знаходимо об'єкт з найбільшою кількістю перетинів
	let maxIntersections = 0
	let bottomObject: Object3D | null = null

	objectIntersections.forEach((count, obj) => {
		if (count > maxIntersections) {
			maxIntersections = count
			bottomObject = obj
		}
	})

	if (debug && objectIntersections.size > 0) {
		console.log('Bottom object detection results:')
		objectIntersections.forEach((count, obj) => {
			console.log(
				`  - ${obj.name} (${obj.userData?.type}): ${count} ray intersections`
			)
		})
		if (bottomObject && maxIntersections > 0) {
			console.log(
				`  Winner: ${
					(bottomObject as Object3D).name
				} with ${maxIntersections} intersections`
			)
		}
	}

	// Записуємо детектований елемент безпосередньо в draggingModel.userData
	draggingModel.userData.detectedBottomObject = bottomObject
	draggingModel.userData.bottomRayHitsCount = rayHitFlags.filter(Boolean).length
	draggingModel.userData.bottomRayTotalRays = rayHitFlags.length
	draggingModel.userData.bottomRayHitFlags = rayHitFlags
	if (debug) {
		console.log(
			'Setting detectedBottomObject in draggingModel.userData:',
			bottomObject ? (bottomObject as Object3D).name : 'null'
		)
	}

	return bottomObject
}

export const CollisionChecker = () => {
	const debug = false
	const { scene, camera, gl } = useThree()

	const {
		draggingModelRef,
		setIsModelPositionValid,
		selectedCabinetId,
		setFloorMesh,
		floorMesh,
	} = useRoomBuilderStore()
	const raycaster = new Raycaster()

	const arrowHelpersRef = useRef<ArrowHelper[]>([])
	const debugBoxesRef = useRef<LineSegments[]>([])

	// Move selected wall state into the global store so it can be used across the app
	const { selectedWall, setSelectedWall, selectedWallRef } =
		useRoomBuilderStore()

	// Helper to paint selection (purple) and restore previous color when deselecting
	const selectWall = useCallback(
		(wall: Object3D | null) => {
			// Restore any previously-painted walls so only one wall is selected at a time.
			// paintObjectWithRestore is safe to call on objects that haven't been painted.
			scene.traverse(obj => {
				if (checkIfElementISWall(obj)) {
					paintObjectWithRestore(obj, new Color(), true)
				}
			})

			if (wall) {
				paintObjectWithRestore(wall, new Color(0x800080), false) // purple
				if (selectedWallRef) selectedWallRef.current = wall
				setSelectedWall(wall)
			} else {
				if (selectedWallRef) selectedWallRef.current = null
				setSelectedWall(null)
			}
		},
		[scene, selectedWallRef, setSelectedWall]
	)

	// Context menu (right-click) handler to allow Ctrl+right-click selection of walls
	useEffect(() => {
		const canvas = gl?.domElement || document.querySelector('canvas')
		if (!canvas) return

		const onContextMenu = (ev: PointerEvent) => {
			if (!ev.ctrlKey) return
			ev.preventDefault()

			const rect = (ev.target as Element).getBoundingClientRect()
			const x = ((ev.clientX - rect.left) / rect.width) * 2 - 1
			const y = -((ev.clientY - rect.top) / rect.height) * 2 + 1

			const pointer = new Vector2(x, y)
			const rc = new Raycaster()
			rc.setFromCamera(pointer, camera)
			const hits = rc.intersectObjects(scene.children, true)

			const wallHit = hits.find(hit => {
				let curr: Object3D | null = hit.object
				while (curr) {
					if (checkIfElementISWall(curr)) return true
					curr = curr.parent
				}
				return false
			})

			if (wallHit) {
				let wallObj: Object3D | null = wallHit.object
				while (wallObj && !checkIfElementISWall(wallObj))
					wallObj = wallObj.parent
				if (wallObj) {
					// toggle selection
					if (selectedWallRef && selectedWallRef.current === wallObj) {
						selectWall(null)
					} else {
						selectWall(wallObj)
					}
				}
			}
		}

		canvas.addEventListener('pointerdown', onContextMenu)

		return () => {
			canvas.removeEventListener('pointerdown', onContextMenu)
			// restore selection color on unmount
			if (selectedWallRef && selectedWallRef.current) {
				paintObjectWithRestore(selectedWallRef.current, new Color(), true)
				selectedWallRef.current = null
			}
			setSelectedWall(null)
		}
	}, [camera, gl, scene, selectWall, selectedWallRef, setSelectedWall])

	useEffect(() => {
		const onKeyDown = (ev: KeyboardEvent) => {
			if (ev.key === 'Escape' || ev.key === 'Esc') {
				selectWall(null)
			}
		}

		window.addEventListener('keydown', onKeyDown)

		return () => window.removeEventListener('keydown', onKeyDown)
	}, [selectWall])

	const isDescendantOf = (obj: Object3D, parent: Object3D | null) => {
		let current: Object3D | null = obj
		while (current) {
			if (current === parent) return true
			current = current.parent
		}
		return false
	}

	useFrame(() => {
		scene.traverse(obj => {
			if (obj.name.includes('floor')) {
				if (!floorMesh && obj instanceof Mesh) {
					setFloorMesh({ current: obj })
				}
				return
			}

			if (obj.userData?.type) {
				obj.position.set(
					obj.position.x,
					getPositionYByModelType(obj.userData.type),
					obj.position.z
				)

				obj.updateMatrixWorld(true)
			}
		})
	})

	useFrame(() => {
		if (!draggingModelRef?.current) {
			scene.traverse(obj => {
				if (obj.name === 'ghost-model' && obj.userData) {
					delete obj.userData.savedQuaternion
					delete obj.userData.potentialQuaternion
					delete obj.userData.lastQuaternion
				}
				if (checkIfElementISModel(obj)) {
					paintObjectWithRestore(obj, new Color(), true)
				}
			})

			arrowHelpersRef.current.forEach(arrow => scene.remove(arrow))
			arrowHelpersRef.current = []
			debugBoxesRef.current.forEach(box => scene.remove(box))
			debugBoxesRef.current = []

			return
		}

		if (!draggingModelRef?.current) return

		// Allow wall auto-detection: proceed even without a manually selected wall.
		// The collision system will find the nearest wall via tempNearestWall.

		if (draggingModelRef.current.userData.debugLogged !== true) {
			const wallObjects: string[] = []
			const modelObjects: string[] = []
			scene.traverse(obj => {
				if (checkIfElementISWall(obj)) {
					wallObjects.push(obj.name)
				}
				if (checkIfElementISModel(obj)) {
					modelObjects.push(obj.name)
				}
			})
			console.log(
				'Scene objects - Walls:',
				wallObjects,
				'Models:',
				modelObjects
			)
			draggingModelRef.current.userData.debugLogged = true
		}

		if (!draggingModelRef.current.userData.savedQuaternion) {
			draggingModelRef.current.userData.savedQuaternion =
				draggingModelRef.current.quaternion.clone()
		}

		const currentQuaternion = draggingModelRef.current.quaternion.clone()
		const lastQuaternion = draggingModelRef.current.userData.lastQuaternion
		if (!lastQuaternion || !currentQuaternion.equals(lastQuaternion)) {
			draggingModelRef.current.userData.lastQuaternion =
				currentQuaternion.clone()
		}

		arrowHelpersRef.current.forEach(arrow => scene.remove(arrow))
		arrowHelpersRef.current = []

		debugBoxesRef.current.forEach(box => scene.remove(box))
		debugBoxesRef.current = []

		let isValid = true
		let wallIntersection = false
		let wallIntersectionObj: Object3D | null = null
		let isNear = false
		let hasSnapObject = false

		draggingModelRef.current.updateMatrixWorld(true)
		const draggedBox = new Box3().setFromObject(draggingModelRef.current)

		let nearestModelObj: Object3D | null = null
		let nearestModelDist = Infinity
		let nearestBottomModelObj: Object3D | null = null
		let nearestBottomModelDist = Infinity

		// Start without a temp nearest wall. If a wall is manually selected we
		// should only consider it a valid tempNearestWall when the measured
		// distance is within SNAP_DISTANCE_WALL. Initializing to null/Infinity
		// prevents treating a selected wall as 'near' when it isn't.
		let tempNearestWall: Object3D | null = null
		let tempNearestWallDist = Infinity
		// Track nearest other wall (even when a wall is manually selected) so we can detect close-by wall corners
		let nearestOtherWall: Object3D | null = null
		let nearestOtherWallDist = Infinity
		// Track two nearest walls for corner detection when no manual selection
		let secondNearestWall: Object3D | null = null
		let secondNearestWallDist = Infinity
		// (no explicit override flag needed)

		// Детекція нижнього об'єкта під час перетягування
		// Буде викликано після оголошення sourceVisualizeRef

		const sourceFromUserData = (draggingModelRef?.current as Object3D | null)
			?.userData?.sourceVisualizeName as string | undefined
		const sourceVisualizeName =
			sourceFromUserData ??
			(selectedCabinetId != null
				? `visualize-model_${selectedCabinetId}`
				: undefined)
		const sourceFromRef = (draggingModelRef?.current as Object3D | null)
			?.userData?.sourceVisualizeRef as Object3D | null | undefined
		const sourceVisualizeRef =
			sourceFromRef ??
			(sourceVisualizeName
				? (scene.getObjectByName(sourceVisualizeName) as Object3D | null)
				: undefined)

		// Детекція нижнього об'єкта під час перетягування
		const detectedBottomObject = detectBottomObjectUnderDragging(
			draggingModelRef.current,
			scene,
			sourceVisualizeRef || null,
			raycaster,
			debug,
			arrowHelpersRef
		)

		if (detectedBottomObject && debug) {
			console.log(
				'Detected bottom object under dragging:',
				detectedBottomObject.name,
				detectedBottomObject.userData?.type
			)
		}

		try {
			const bottomFlags = draggingModelRef.current?.userData
				?.bottomRayHitFlags as boolean[] | undefined

			const draggingType = draggingModelRef.current?.userData?.type
			if (
				bottomFlags &&
				(draggingType === MODEL_TYPES.surface ||
					draggingType === MODEL_TYPES.surfaceWall) &&
				bottomFlags.some(f => !f)
			) {
				isValid = false
				if (debug) {
					console.log(
						'Surface placement invalid: at least one bottom ray did not hit a visualize-model',
						bottomFlags
					)
				}
			}
		} catch {
			// Defensive: if userData isn't set or malformed, don't throw — leave isValid unchanged
		}

		scene.traverse(obj => {
			if (obj.userData?.isDebugVisualization) return

			const draggingType = draggingModelRef.current?.userData?.type
			const targetType = obj.userData?.type

			if (
				draggingType &&
				targetType &&
				shouldIgnoreCollision(draggingType, targetType)
			) {
				return
			}
			if (
				sourceVisualizeRef &&
				(obj === sourceVisualizeRef || isDescendantOf(obj, sourceVisualizeRef))
			)
				return
			if (
				draggingModelRef?.current &&
				isDescendantOf(obj, draggingModelRef.current)
			)
				return
			if (obj.name === 'ignore') return
			if (obj === draggingModelRef.current) return
			if (!(obj instanceof Object3D)) return
			if (obj.name.includes('floor')) return
			if (obj.name.includes('raycast-')) return
			if (obj.name.includes('debug-')) return

			if (obj.name === '') return

			let otherBox: Box3
			if (checkIfElementISWall(obj)) {
				otherBox = getWallBoundingBoxExcludingCutouts(obj)
			} else {
				// For models, exclude handle meshes when computing the other box
				otherBox = new Box3().setFromObject(obj)
			}

			if (debug && (checkIfElementISWall(obj) || checkIfElementISModel(obj))) {
				const boxColor = checkIfElementISWall(obj)
					? new Color(0xff0000)
					: new Color(0x00ff00)
				const otherBoxViz = createBoundingBoxVisualization(
					otherBox,
					boxColor,
					`debug-${obj.name}-box`
				)
				scene.add(otherBoxViz)
				debugBoxesRef.current.push(otherBoxViz)
			}

			const [pointA, pointB] = getClosestPointsBetweenBoxes(
				draggedBox,
				otherBox
			)

			if (pointA && pointB) {
				const distance = pointA.distanceTo(pointB)
				if (checkIfElementISWall(obj)) {
					console.log(
						`Wall ${obj.name} distance:`,
						distance,
						'checkIfSnap:',
						checkIfSnap(distance)
					)
				} else if (checkIfElementISModel(obj)) {
					const isValidDistance = distance <= SNAP_DISTANCE_MODEL
					console.log(
						`Model ${obj.name} distance:`,
						distance,
						'isValid:',
						isValidDistance
					)
				}
			}

			if (draggedBox.intersectsBox(shrinkBox(otherBox, 0.05))) {
				isValid = false

				if (
					draggingModelRef.current.userData.type === MODEL_TYPES.surfaceWall
				) {
					let hitWallParent: Object3D | null = obj
					while (hitWallParent && !checkIfElementISWall(hitWallParent)) {
						hitWallParent = hitWallParent.parent!
					}
					if (hitWallParent) {
						wallIntersection = true
						wallIntersectionObj = hitWallParent
						if (debug)
							console.log(
								'SurfaceWall intersecting wall - position invalid:',
								obj.name,
								'wall parent:',
								hitWallParent.name
							)
						return
					}
					let hitModelParent: Object3D | null = obj
					while (hitModelParent && !hitModelParent.userData?.type) {
						hitModelParent = hitModelParent.parent!
					}
					if (
						hitModelParent &&
						hitModelParent.userData.type === MODEL_TYPES.surface
					) {
						isValid = true
						return
					}
				}
			} else if (
				pointA &&
				pointB &&
				(obj.name === 'ghost-model' ||
					checkIfElementISWall(obj) ||
					checkIfElementISModel(obj))
			) {
				const distance = pointA.distanceTo(pointB)

				let canSnap = false
				if (checkIfElementISWall(obj)) {
					canSnap = checkIfSnap(distance)
				} else if (checkIfElementISModel(obj)) {
					canSnap = distance <= SNAP_DISTANCE_MODEL
				} else {
					canSnap = checkIfSnap(distance)
				}

				if (canSnap) {
					isNear = true
					hasSnapObject = true
					console.log(`Snap detected with ${obj.name}, distance: ${distance}`)

					if (debug) {
						const snapBoxColor = new Color(0xffff00)
						const snapBoxViz = createBoundingBoxVisualization(
							otherBox,
							snapBoxColor,
							`debug-snap-${obj.name}-box`
						)
						scene.add(snapBoxViz)
						debugBoxesRef.current.push(snapBoxViz)
					}

					if (checkIfElementISWall(obj)) {
						console.log(`Processing wall snap with ${obj.name}`)
						// Always track the nearest other wall (exclude the manually selected one)
						if (selectedWall && obj !== selectedWall) {
							if (distance < nearestOtherWallDist) {
								nearestOtherWallDist = distance
								nearestOtherWall = obj
							}
						}

						// If there is no manual selection, maintain two nearest walls as before
						if (!selectedWall) {
							if (distance < tempNearestWallDist) {
								secondNearestWall = tempNearestWall
								secondNearestWallDist = tempNearestWallDist
								tempNearestWallDist = distance
								tempNearestWall = obj
							} else if (distance < secondNearestWallDist) {
								secondNearestWallDist = distance
								secondNearestWall = obj
							}
						} else {
							// If manual wall selected, only allow snapping to that wall within SNAP_DISTANCE_WALL
							if (obj === selectedWall) {
								if (distance <= SNAP_DISTANCE_WALL) {
									tempNearestWall = obj
									tempNearestWallDist = distance
								}
							}
						}
					} else if (checkIfElementISModel(obj)) {
						hasSnapObject = true

						const canSnapToThisTarget = canSnapToTarget(
							draggingType || '',
							obj.userData?.type || ''
						)

						// Only consider this model if it is allowed by snap rules.
						// New behavior: models are acceptable when any of the following is true:
						// - model has no attachedWallName (free-floating)
						// - model is attached to the same wall as the dragging model (by name)
						// - model is attached to the current wall context (selected or tempNearest)
						// - model is marked as a corner model (isInCorner)
						const wallContext = selectedWall || tempNearestWall
						const wallContextName = wallContext?.name as string | undefined

						const modelAttachedWallName = obj.userData?.attachedWallName as
							| string
							| undefined
						const modelIsInCorner = !!obj.userData?.isInCorner

						const draggingAttachedWallName = draggingModelRef.current?.userData
							?.attachedWallName as string | undefined

						const attachedWallMatches = (() => {
							// if model has no attachedWallName, allow
							if (!modelAttachedWallName) return true
							// if model explicitly marked as corner, allow regardless of wall
							if (modelIsInCorner) return true
							// if wall context (selected or nearest) matches model's attached wall name
							if (wallContextName && modelAttachedWallName === wallContextName)
								return true
							// if dragging model has attachedWallName and matches model's attached wall name
							if (
								draggingAttachedWallName &&
								modelAttachedWallName === draggingAttachedWallName
							)
								return true

							return false
						})()

						if (
							canSnapToThisTarget &&
							distance <= SNAP_DISTANCE_MODEL &&
							distance < nearestModelDist &&
							attachedWallMatches
						) {
							nearestModelDist = distance
							nearestModelObj = obj
						}

						if (obj.position.y < (draggingModelRef.current?.position.y || 0)) {
							if (
								canSnapToThisTarget &&
								distance <= SNAP_DISTANCE_MODEL &&
								distance < nearestBottomModelDist &&
								attachedWallMatches
							) {
								nearestBottomModelDist = distance
								nearestBottomModelObj = obj
							}
						}
					}
				}
			}
		})

		if (
			selectedWall &&
			nearestOtherWall &&
			isFinite(nearestOtherWallDist) &&
			nearestOtherWallDist < 0.5
		) {
			try {
				if (!selectedWall || !nearestOtherWall) {
					// guards
				} else {
					const selBox = getWallBoundingBoxExcludingCutouts(selectedWall)
					const otherBox = getWallBoundingBoxExcludingCutouts(nearestOtherWall)

					const selSize = new Vector3()
					const otherSize = new Vector3()
					selBox.getSize(selSize)
					otherBox.getSize(otherSize)

					const selQuat = (selectedWall as Object3D).getWorldQuaternion(
						new Quaternion()
					)
					const otherQuat = (nearestOtherWall as Object3D).getWorldQuaternion(
						new Quaternion()
					)

					const selAxis = (
						selSize.x > selSize.z ? new Vector3(1, 0, 0) : new Vector3(0, 0, 1)
					)
						.applyQuaternion(selQuat)
						.setY(0)
						.normalize()
					const otherAxis = (
						otherSize.x > otherSize.z
							? new Vector3(1, 0, 0)
							: new Vector3(0, 0, 1)
					)
						.applyQuaternion(otherQuat)
						.setY(0)
						.normalize()

					const dot = Math.max(-1, Math.min(1, selAxis.dot(otherAxis)))
					const angleRad = Math.acos(dot)
					const angleDeg = (angleRad * 180) / Math.PI
					console.log(
						'Manual selection corner override: angle between selected and nearestOtherWall:',
						angleDeg
					)

					secondNearestWall = nearestOtherWall
					secondNearestWallDist = nearestOtherWallDist
				}
			} catch (e) {
				console.warn('Error computing override wall angle', e)
			}
		}

		const wallToUse = selectedWall || tempNearestWall

		if (wallToUse) {
			draggingModelRef.current.updateMatrixWorld(true)

			const draggedInfo = getOrientedBoundingInfo(draggingModelRef.current)

			const [wallPointA, wallPointB] = getClosestPointsBetweenBoxes(
				draggedInfo.box,
				checkIfElementISWall(wallToUse!)
					? getWallBoundingBoxExcludingCutouts(wallToUse!)
					: new Box3().setFromObject(wallToUse!)
			)

			if (wallPointA && wallPointB) {
				try {
					const modelPoint = wallPointA
					const wallPoint = wallPointB
					if (modelPoint && wallPoint) {
						const desiredDir = new Vector3().subVectors(wallPoint, modelPoint)
						desiredDir.y = 0
						desiredDir.normalize()

						// Compute yaw-only delta relative to the model's current world quaternion
						const worldQ = draggingModelRef.current.getWorldQuaternion(
							new Quaternion()
						)

						const currentForward = new Vector3(0, 0, 1)
							.applyQuaternion(worldQ)
							.setY(0)
							.normalize()
						const currentYaw = Math.atan2(currentForward.x, currentForward.z)

						const desiredYaw = Math.atan2(desiredDir.x, desiredDir.z) + Math.PI
						let yawDelta = desiredYaw - currentYaw
						yawDelta = ((yawDelta + Math.PI) % (Math.PI * 2)) - Math.PI

						const yawDeltaQ = new Quaternion().setFromAxisAngle(
							new Vector3(0, 1, 0),
							yawDelta
						)

						const alignedWorldQ = yawDeltaQ.multiply(worldQ)

						draggingModelRef.current.userData.potentialQuaternion =
							alignedWorldQ.clone()

						// If user manually selected a wall, persist this alignment as the model origin
						if (selectedWall) {
							draggingModelRef.current.userData.savedQuaternion =
								alignedWorldQ.clone()
						}
					}
				} catch {
					// defensive
				}
			}

			if (
				wallPointA &&
				wallPointB &&
				draggingModelRef.current.userData.type !== MODEL_TYPES.surface
			) {
				const box = draggedInfo.box
				const size = new Vector3()
				box.getSize(size)
				const center = draggedInfo.center.clone()

				// Align dragging model so its back faces the wall (live during dragging)

				const height = size.y
				const offset20Percent = height * 0.1
				const offset50Percent = height * 0.3
				const offset80Percent = height * 0.8

				const width = size.x
				const depth = size.z
				const offsetX = width * 0.1
				const offsetZ = depth * 0.1

				// build local-space control points relative to center
				const hx = width / 2
				const hy = height / 2
				const hz = depth / 2

				const localPoints: Vector3[] = []

				// corners (3 heights per corner)
				const cornerXs = [hx - offsetX, -hx + offsetX]
				const cornerZs = [hz - offsetZ, -hz + offsetZ]
				const heights = [
					-hy + offset20Percent,
					-hy + offset50Percent,
					-hy + offset80Percent,
				]

				for (let cx = 0; cx < cornerXs.length; cx++) {
					for (let cz = 0; cz < cornerZs.length; cz++) {
						for (let h = 0; h < heights.length; h++) {
							localPoints.push(
								new Vector3(cornerXs[cx], heights[h], cornerZs[cz])
							)
						}
					}
				}

				// side top midpoints (top of model)
				const sideTopY = hy
				const sideBottomY = -hy + offset20Percent
				const sideZs = [hz - offsetZ, -hz + offsetZ]

				// top side centers (mid X)
				localPoints.push(new Vector3(0, sideTopY, sideZs[0]))
				localPoints.push(new Vector3(0, sideTopY, sideZs[1]))
				// top side centers (mid Z)
				localPoints.push(new Vector3(hx - offsetX, sideTopY, 0))
				localPoints.push(new Vector3(-hx + offsetX, sideTopY, 0))

				// bottom side centers (near base)
				localPoints.push(new Vector3(0, sideBottomY, sideZs[0]))
				localPoints.push(new Vector3(0, sideBottomY, sideZs[1]))
				localPoints.push(new Vector3(hx - offsetX, sideBottomY, 0))
				localPoints.push(new Vector3(-hx + offsetX, sideBottomY, 0))

				// center
				localPoints.push(new Vector3(0, 0, 0))

				// transform local points (centered) into world-space using model quaternion and center
				const boxQuaternion =
					(box as Box3 & { quaternion?: Quaternion }).quaternion ||
					draggingModelRef.current!.getWorldQuaternion(new Quaternion())
				const origins = localPoints.map(lp => {
					const worldP = lp.clone().applyQuaternion(boxQuaternion).add(center)
					// ensure y is in world-space min.y + local y offset
					return worldP
				})

				let allWallHit = true
				for (let i = 0; i < origins.length; i++) {
					const origin = origins[i]
					let raycastType: string
					if (i < 12) {
						const cornerIndex = Math.floor(i / 3) + 1
						const heightLevel = (i % 3) + 1
						raycastType = `CORNER_${cornerIndex}_LEVEL_${heightLevel}_TO_WALL`
					} else if (i < 16) {
						const sideIndex = i - 12 + 1
						raycastType = `SIDE_${sideIndex}_TOP_TO_WALL`
					} else if (i < 20) {
						const sideIndex = i - 16 + 1
						raycastType = `SIDE_${sideIndex}_BOTTOM_TO_WALL`
					} else {
						raycastType = 'CENTER_TO_WALL'
					}

					const offsetBox = new Box3().setFromCenterAndSize(
						origin,
						new Vector3(0.001, 0.001, 0.001)
					)
					const wallBox = checkIfElementISWall(wallToUse!)
						? getWallBoundingBoxExcludingCutouts(wallToUse!)
						: new Box3().setFromObject(wallToUse!)

					const [offsetPoint, wallPoint] = getClosestPointsBetweenBoxes(
						offsetBox,
						wallBox
					)

					if (!offsetPoint || !wallPoint) continue

					const offsetDirection = new Vector3()
						.subVectors(wallPoint, offsetPoint)
						.normalize()
					const offsetDistance = offsetPoint.distanceTo(wallPoint)

					raycaster.set(origin, offsetDirection)

					const allHits = raycaster.intersectObjects(scene.children, true)

					const filteredHits = allHits.filter(hit => {
						if (hit.object.userData?.isDebugVisualization) return false

						if (isDescendantOf(hit.object, draggingModelRef.current!))
							return false
						if (
							sourceVisualizeRef &&
							(hit.object === sourceVisualizeRef ||
								isDescendantOf(hit.object, sourceVisualizeRef))
						)
							return false

						const parent = hit.object.parent
						if (
							parent &&
							parent.name &&
							parent.name.includes('visualize-model')
						) {
							return false
						}

						if (
							'name' in hit.object &&
							hit.object.name &&
							hit.object.name.includes('floor')
						) {
							return false
						}

						if ('name' in hit.object && hit.object.name === 'ignore') {
							return false
						}

						if (
							hit.object.type === 'Line' ||
							hit.object.type === 'LineSegments'
						) {
							return false
						}

						if (
							hit.object.type === 'ArrowHelper' ||
							hit.object.name.includes('raycast-') ||
							hit.object.name.includes('debug-')
						) {
							return false
						}

						// If we have a wall context (selectedWall or tempNearestWall) ignore
						// hits on other walls so other walls don't block alignment to the
						// target wall.
						const wallContext = selectedWall || tempNearestWall
						if (wallContext) {
							let hitWallParent: Object3D | null = hit.object
							while (hitWallParent && !checkIfElementISWall(hitWallParent)) {
								hitWallParent = hitWallParent.parent!
							}
							if (hitWallParent && hitWallParent !== wallContext) {
								// treat other walls as non-blocking for alignment
								return false
							}
						}

						const draggingType = draggingModelRef.current?.userData?.type
						const hitObjectType =
							hit.object.userData?.type || hit.object.parent?.userData?.type
						if (
							draggingType &&
							hitObjectType &&
							shouldIgnoreCollision(draggingType, hitObjectType)
						) {
							return false
						}

						return true
					})

					const hitsInRange = filteredHits.filter(
						hit => hit.distance <= offsetDistance + 0.01
					)

					const wallHitsInRange = hitsInRange.filter(hit =>
						checkIfElementISWall(hit.object)
					)

					const isValidPath =
						wallHitsInRange.length > 0 &&
						hitsInRange.length === wallHitsInRange.length

					const arrow = new ArrowHelper(
						offsetDirection,
						origin,
						offsetDistance,
						isValidPath ? 0x00ff00 : 0xff0000
					)
					arrow.name = `raycast-${raycastType.toLowerCase()}`
					arrow.userData.isDebugVisualization = true
					arrow.userData.ignoreInCollisions = true
					arrow.renderOrder = 999
					if (debug) {
						scene.add(arrow)
						arrowHelpersRef.current.push(arrow)
					}

					if (!isValidPath) {
						allWallHit = false
						break
					}
				}

				if (!allWallHit) {
					isValid = false
				}

				if (allWallHit) {
					const centerBottom = new Vector3(
						draggedInfo.center.x,
						draggedInfo.box.min.y - 0.001,
						draggedInfo.center.z
					)

					const down = new Vector3(0, -1, 0)
					const downDistance = 10

					raycaster.set(centerBottom, down)
					const allObjects = scene.children

					let hits = raycaster.intersectObjects(allObjects, true)
					if (draggingModelRef?.current) {
						hits = hits.filter(hit => {
							if (hit.object.userData?.isDebugVisualization) return false

							if (isDescendantOf(hit.object, draggingModelRef.current!))
								return false
							if (
								sourceVisualizeRef &&
								(hit.object === sourceVisualizeRef ||
									isDescendantOf(hit.object, sourceVisualizeRef))
							)
								return false

							const parent = hit.object.parent
							if (
								parent &&
								parent.name &&
								parent.name.includes('visualize-model')
							) {
								return false
							}

							if (
								hit.object.name.includes('raycast-') ||
								hit.object.name.includes('debug-')
							) {
								return false
							}

							const draggingType = draggingModelRef.current?.userData?.type
							const hitObjectType =
								hit.object.userData?.type || hit.object.parent?.userData?.type
							if (
								draggingType &&
								hitObjectType &&
								shouldIgnoreCollision(draggingType, hitObjectType)
							) {
								return false
							}

							return true
						})
					}

					const groundHit = hits.find(hit => hit.distance <= downDistance)

					const arrow = new ArrowHelper(
						down,
						centerBottom,
						downDistance,
						groundHit ? 0x00ff00 : 0xff0000
					)
					arrow.name = 'raycast-vertical-support'
					arrow.userData.isDebugVisualization = true
					arrow.userData.ignoreInCollisions = true
					arrow.renderOrder = 999
					if (debug) {
						scene.add(arrow)
						arrowHelpersRef.current.push(arrow)
					}

					if (!groundHit) {
						isValid = false
					}
				}
			}
		}

		let isInCorner = false
		if (
			secondNearestWall &&
			isFinite(secondNearestWallDist) &&
			secondNearestWallDist < 1 &&
			tempNearestWallDist < 1
		) {
			isInCorner = true
			console.log(
				'Corner detected between',
				tempNearestWall || '<none>',
				'and',
				secondNearestWall || '<none>'
			)
		}

		// If any wall intersection was detected, the position must be invalid.
		if (wallIntersection) {
			isValid = false
			if (debug)
				console.log(
					'Final invalidation due to wall intersection',
					(wallIntersectionObj as unknown as { name?: string })?.name ??
						'<unknown-wall>'
				)
		}

		if (!isNear || !hasSnapObject) {
			isValid = false
			console.log('Position invalid: no snap objects nearby', {
				isNear,
				hasSnapObject,
				tempNearestWallDist,
				nearestModelDist,
			})
		}

		if (!tempNearestWall && !nearestModelObj && !nearestBottomModelObj) {
			isValid = false
			console.log('Position invalid: no objects nearby for snapping')
		}

		// If a wall is manually selected, require that we are within its snap distance
		if (selectedWall) {
			if (
				!tempNearestWall ||
				tempNearestWall !== selectedWall ||
				tempNearestWallDist > SNAP_DISTANCE_WALL
			) {
				isValid = false
				console.log(
					'Position invalid: not within selected wall snap distance',
					{ tempNearestWall, tempNearestWallDist }
				)
			}
		}

		if (debug) {
			console.log('Final validation state:', {
				isValid,
				isNear,
				hasSnapObject,
				tempNearestWallDist,
				nearestModelDist,
				nearestBottomModelDist,
			})
		}

		if (draggingModelRef.current) {
			const ghost = draggingModelRef.current

			scene.traverse(obj => {
				if (checkIfElementISModel(obj)) {
					paintObjectWithRestore(obj, new Color(), true)
				}
			})

			if (nearestModelObj) {
				paintObjectWithRestore(nearestModelObj, new Color('yellow'), false)
			}

			// Фарбуємо детектований нижній об'єкт синім кольором
			if (detectedBottomObject) {
				paintObjectWithRestore(detectedBottomObject, new Color('blue'), false)
			}

			if (ghost.userData.potentialQuaternion) {
				ghost.quaternion.copy(ghost.userData.potentialQuaternion)
			} else if (ghost.userData.savedQuaternion) {
				ghost.quaternion.copy(ghost.userData.savedQuaternion)
			}

			ghost.updateMatrixWorld(true)
			if (debug) {
				const updatedDraggedBox = new Box3().setFromObject(ghost)
				const draggedBoxViz = createBoundingBoxVisualization(
					updatedDraggedBox,
					new Color(0x0000ff),
					'debug-dragged-box'
				)
				scene.add(draggedBoxViz)
				debugBoxesRef.current.push(draggedBoxViz)
			}

			// If in corner, prefer storing both walls and avoid assigning a single closestWall
			if (isInCorner) {
				ghost.userData.isInCorner = true
				// expose a simpler flag used by other parts of the app/serialization
				ghost.userData.isInCorner = true
				ghost.userData.cornerWalls = [tempNearestWall, secondNearestWall]
				// Do not align to a single wall in corners
				ghost.userData.closestWall = null
				ghost.userData.attachedWall = null
				ghost.userData.potentialQuaternion = null
				console.log(
					'Ghost is in wall corner - storing corner walls and clearing closestWall and attachedWall'
				)
			} else {
				// Prefer manual selection; if selectedWall exists use it as closestWall
				const wallToUse = selectedWall || tempNearestWall
				if (wallToUse) {
					ghost.userData.closestWall = wallToUse
					console.log('Setting closestWall to:', wallToUse)
				} else {
					ghost.userData.closestWall = null
					console.log('No nearest wall found, setting closestWall to null')
					ghost.userData.potentialQuaternion = null
				}
				ghost.userData.isInCorner = null
				ghost.userData.cornerWalls = null
			}

			// Manual selection is used; no automatic nearestWall state to update here.
			if (selectedWall) {
				// selectedWall active — alignment will use it
			} else if (isInCorner) {
				console.log('In corner: not setting nearestWall to avoid alignment')
			} else {
				if (tempNearestWall)
					console.log('Setting nearestWall to:', tempNearestWall)
			}

			// If in corner, disable snapping to other models (set to null)
			if (isInCorner) {
				ghost.userData.closestModel = null
				ghost.userData.closestBottomModel = null
				console.log('In corner: clearing closestModel and closestBottomModel')
			} else {
				if (
					ghost.userData.closestModel &&
					ghost.userData.closestModel !== nearestModelObj
				) {
					ghost.userData.closestModel = null
				}
				if (nearestModelObj) {
					ghost.userData.closestModel = nearestModelObj
				} else {
					ghost.userData.closestModel = null
				}

				if (nearestBottomModelObj) {
					ghost.userData.closestBottomModel = nearestBottomModelObj
				} else {
					ghost.userData.closestBottomModel = null
				}
			}

			// detectedBottomObject вже записується всередині detectBottomObjectUnderDragging
		}

		setIsModelPositionValid(isValid)
	})

	useEffect(() => {
		console.log(
			'Effect for wall alignment triggered',
			selectedWall,
			draggingModelRef?.current
		)
		// Only align if a wall is manually selected
		if (
			selectedWall &&
			draggingModelRef?.current &&
			!draggingModelRef.current.userData?.isInCorner
		) {
			const wall = selectedWall
			const model = draggingModelRef.current

			const wallBox = checkIfElementISWall(wall)
				? getWallBoundingBoxExcludingCutouts(wall)
				: new Box3().setFromObject(wall)

			const modelBox = new Box3().setFromObject(model)
			const [modelPoint, wallPoint] = getClosestPointsBetweenBoxes(
				modelBox,
				wallBox
			)

			if (modelPoint && wallPoint) {
				// Desired direction: vector from model to wall (so model's back will point to wall)
				const desiredDir = new Vector3().subVectors(wallPoint, modelPoint)
				desiredDir.y = 0
				desiredDir.normalize()

				// Compute a yaw-only delta to rotate the model so its back faces the wall
				// while preserving the model's current pitch/roll. This avoids sudden
				// full-quaternion snaps and ensures perpendicular alignment to the wall.
				const worldQ = model.getWorldQuaternion(new Quaternion())

				// current forward direction in world-space (model local +Z)
				const currentForward = new Vector3(0, 0, 1)
					.applyQuaternion(worldQ)
					.setY(0)
					.normalize()
				const currentYaw = Math.atan2(currentForward.x, currentForward.z)

				// desired front yaw: make the model's back point to the wall, so front faces away
				const desiredYaw = Math.atan2(desiredDir.x, desiredDir.z) + Math.PI

				// smallest delta in range [-PI, PI]
				let yawDelta = desiredYaw - currentYaw
				yawDelta = ((yawDelta + Math.PI) % (Math.PI * 2)) - Math.PI

				const yawDeltaQ = new Quaternion().setFromAxisAngle(
					new Vector3(0, 1, 0),
					yawDelta
				)

				// apply the yaw delta in world-space to the current world quaternion
				const alignedWorldQ = yawDeltaQ.multiply(worldQ)

				model.userData.potentialQuaternion = alignedWorldQ.clone()
				console.log(
					'Setting potential quaternion (yaw-delta) for wall alignment'
				)
			}
		}
	}, [selectedWall, draggingModelRef])

	return null
}
