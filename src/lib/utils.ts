import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import {
	Box3,
	Camera,
	Group,
	Object3D,
	type Object3DEventMap,
	Plane,
	Quaternion,
	Raycaster,
	Vector2,
	Vector3,
} from 'three'
import { GLTFLoader } from 'three/examples/jsm/Addons.js'
import {
	MODEL_GAP,
	SNAP_DISTANCE_WALL,
	SNAP_DISTANCE_MODEL,
} from '../constants/constants'
import { MODEL_IMG_URL, MODEL_URL, MODEL_SLAP_RULES } from './model-constants'
import { LAYERS_HEIGHT } from '../constants/model-list'
import { getBoundingBoxExcludingHandles } from '@/modules/collision-checker/boxUtils'

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs))
}

export const loadModelFromBlob = (blob: Blob): Promise<Group> => {
	return new Promise((resolve, reject) => {
		const reader = new FileReader()

		reader.onload = async () => {
			const arrayBuffer = reader.result as ArrayBuffer

			const loader = new GLTFLoader()
			loader.parse(
				arrayBuffer,
				'',
				gltf => {
					resolve(gltf.scene)
				},
				error => {
					reject(error)
				}
			)
		}

		reader.onerror = reject
		reader.readAsArrayBuffer(blob)
	})
}

export const checkIfElementISWall = (
	obj: Object3D<Object3DEventMap>
): boolean => {
	return /^wall_\d+$/.test(obj.name)
}

export const checkIfElementIS = (name: string, type: string): boolean => {
	if (type === '') return false
	return name.includes(type)
}

export const checkIfElementISModel = (
	obj: Object3D<Object3DEventMap>
): boolean => {
	return /^visualize-model_\d+$/.test(obj.name)
}

export const getClosestPointsBetweenBoxes = (boxA: Box3, boxB: Box3) => {
	const pointA = new Vector3()
	const pointB = new Vector3()
	;(['x', 'y', 'z'] as const).forEach(axis => {
		const minA = boxA.min[axis]
		const maxA = boxA.max[axis]
		const minB = boxB.min[axis]
		const maxB = boxB.max[axis]

		if (maxA < minB) {
			pointA[axis] = maxA
			pointB[axis] = minB
		} else if (minA > maxB) {
			pointA[axis] = minA
			pointB[axis] = maxB
		} else {
			const overlapMin = Math.max(minA, minB)
			const overlapMax = Math.min(maxA, maxB)
			const mid = (overlapMin + overlapMax) / 2
			pointA[axis] = mid
			pointB[axis] = mid
		}
	})

	return [pointA, pointB]
}

export const getPlanesForPointOnBox = (point: Vector3, box: Box3) => {
	const planes = []

	const epsilon = 0.001

	if (Math.abs(point.x - box.min.x) < epsilon) planes.push('minX')
	if (Math.abs(point.x - box.max.x) < epsilon) planes.push('maxX')

	if (Math.abs(point.y - box.min.y) < epsilon) planes.push('minY')
	if (Math.abs(point.y - box.max.y) < epsilon) planes.push('maxY')

	if (Math.abs(point.z - box.min.z) < epsilon) planes.push('minZ')
	if (Math.abs(point.z - box.max.z) < epsilon) planes.push('maxZ')

	return planes
}
export function snapBoxToWallByPlanes(
	refBox: Object3D,
	refWall: Object3D,
	gap = 1
) {
	if (!refBox || !refWall) return

	const boxA = new Box3().setFromObject(refBox)
	const boxB = new Box3().setFromObject(refWall)

	const [pointA, pointB] = getClosestPointsBetweenBoxes(boxA, boxB)
	if (!pointA || !pointB) return

	const distance = pointA.distanceTo(pointB)
	if (distance >= SNAP_DISTANCE_WALL) return

	// Zero Y before computing length/direction so the XZ shift is not
	// diminished by a vertical component — this ensures the model touches
	// the wall precisely rather than stopping short.
	const shift = new Vector3().subVectors(pointB, pointA)
	shift.y = 0
	const length = shift.length()
	if (length > 0) {
		const normalizedShift = shift.clone().normalize()
		const targetDistance = Math.max(0, length - gap)
		const gapShift = normalizedShift.multiplyScalar(targetDistance)
		refBox.position.add(gapShift)
	}
}

export function snapBoxesByPlanes(
	refA: Object3D,
	refB: Object3D,
	gap = MODEL_GAP
) {
	if (!refA || !refB) return

	if (refB.name.includes('wall')) return
	if (refB.name.includes('ignore')) return

	// Use handle-excluded boxes for BOTH models so that protruding handles
	// do not falsely inflate the bounding box and cause the isSideSnap check
	// to think the boxes overlap (which would suppress the snap entirely and
	// leave a visible gap between modules).
	const boxA = getBoundingBoxExcludingHandles(refA)
	const boxB = getBoundingBoxExcludingHandles(refB)

	const [pointA, pointB] = getClosestPointsBetweenBoxes(boxA, boxB)
	if (!pointA || !pointB) return

	const distance = pointA.distanceTo(pointB)
	if (distance >= SNAP_DISTANCE_MODEL) return

	// When boxes are overlapping, getClosestPointsBetweenBoxes returns the midpoint
	// of each overlapping axis — a point inside both boxes that is never on any face.
	// getPlanesForPointOnBox therefore finds no planes, isSideSnap is false, and the
	// function bails without fixing the overlap.  Handle this explicitly: compute the
	// XZ penetration depth, pick the axis with the smaller overlap, and push refA out.
	if (distance < 0.001) {
		const overlapX =
			Math.min(boxA.max.x, boxB.max.x) - Math.max(boxA.min.x, boxB.min.x)
		const overlapZ =
			Math.min(boxA.max.z, boxB.max.z) - Math.max(boxA.min.z, boxB.min.z)

		if (overlapX > 0 && overlapZ > 0) {
			const centerA = new Vector3()
			const centerB = new Vector3()
			boxA.getCenter(centerA)
			boxB.getCenter(centerB)

			// Objects on different height layers (e.g. wall-mount above floor cabinet)
			// share an overlapping AABB but are not physically overlapping. Skip the
			// push so the wall-mount is not incorrectly displaced in Z (away from wall).
			const yDiff = Math.abs(centerA.y - centerB.y)
			if (yDiff > 0.5) return

			if (overlapX <= overlapZ) {
				const dir = centerA.x >= centerB.x ? 1 : -1
				refA.position.x += dir * (overlapX + gap)
			} else {
				const dir = centerA.z >= centerB.z ? 1 : -1
				refA.position.z += dir * (overlapZ + gap)
			}
		}
		return
	}

	const planesA = getPlanesForPointOnBox(pointA, boxA)
	const planesB = getPlanesForPointOnBox(pointB, boxB)

	const isSideSnap =
		(planesA.some(p => p.endsWith('X')) &&
			planesB.some(p => p.endsWith('X'))) ||
		(planesA.some(p => p.endsWith('Z')) && planesB.some(p => p.endsWith('Z')))

	if (!isSideSnap) return

	const initialPosition = refA.position.clone()
	const baseShift = new Vector3().subVectors(pointB, pointA)

	const snapX =
		planesA.some(p => p.endsWith('X')) && planesB.some(p => p.endsWith('X'))
	const snapZ =
		!snapX &&
		planesA.some(p => p.endsWith('Z')) &&
		planesB.some(p => p.endsWith('Z'))

	const shift = new Vector3(0, 0, 0)

	if (snapX) {
		const dir = baseShift.x > 0 ? 1 : -1
		const sep = Math.abs(baseShift.x)
		// Use signed delta: positive → close the gap, negative → spread apart.
		// Using abs() here is wrong when sep < gap (models too close) because it
		// would push A even further toward B.
		const delta = sep - gap
		if (Math.abs(delta) > 0.0001) shift.x = dir * delta
	} else if (snapZ) {
		const dir = baseShift.z > 0 ? 1 : -1
		const sep = Math.abs(baseShift.z)
		const delta = sep - gap
		if (Math.abs(delta) > 0.0001) shift.z = dir * delta
	} else {
		return
	}

	refA.position.set(
		initialPosition.x + shift.x,
		initialPosition.y + shift.y,
		initialPosition.z + shift.z
	)
}

export function snapBoxToCorner(
	refBox: Object3D,
	wallA: Object3D,
	wallB: Object3D,
	gap = MODEL_GAP,
	cornerThreshold = 1
) {
	if (!refBox || !wallA || !wallB) return

	const box = new Box3().setFromObject(refBox)
	const boxA = new Box3().setFromObject(wallA)
	const boxB = new Box3().setFromObject(wallB)

	const [pointA, wallPointA] = getClosestPointsBetweenBoxes(box, boxA)
	const [pointB, wallPointB] = getClosestPointsBetweenBoxes(box, boxB)
	if (!pointA || !wallPointA || !pointB || !wallPointB) return

	const distA = pointA.distanceTo(wallPointA)
	const distB = pointB.distanceTo(wallPointB)

	if (distA >= cornerThreshold || distB >= cornerThreshold) return

	const shiftA = new Vector3().subVectors(wallPointA, pointA)
	const lenA = shiftA.length()
	if (lenA > 0) {
		const normA = shiftA.clone().normalize()
		const targetA = Math.max(0, lenA - gap)
		normA.multiplyScalar(targetA)
		normA.y = 0
		shiftA.copy(normA)
	} else {
		shiftA.set(0, 0, 0)
	}

	const shiftB = new Vector3().subVectors(wallPointB, pointB)
	const lenB = shiftB.length()
	if (lenB > 0) {
		const normB = shiftB.clone().normalize()
		const targetB = Math.max(0, lenB - gap)
		normB.multiplyScalar(targetB)
		normB.y = 0
		shiftB.copy(normB)
	} else {
		shiftB.set(0, 0, 0)
	}

	const combined = shiftA.add(shiftB)
	refBox.position.add(combined)
}

export function getBackPlaneOfObject(object: Object3D): 'minZ' | 'maxZ' {
	if (!object) return 'minZ'

	const forward = new Vector3(0, 0, -1)
	forward
		.applyQuaternion(object.getWorldQuaternion(new Quaternion()))
		.normalize()

	const backDir = forward.clone().negate()

	const box = new Box3().setFromObject(object)

	const center = box.getCenter(new Vector3())

	const minPoint = new Vector3(center.x, center.y, box.min.z)
	const maxPoint = new Vector3(center.x, center.y, box.max.z)

	const minZDir = minPoint.clone().sub(center).normalize()
	const maxZDir = maxPoint.clone().sub(center).normalize()

	const dotMin = backDir.dot(minZDir)
	const dotMax = backDir.dot(maxZDir)

	return dotMin > dotMax ? 'minZ' : 'maxZ'
}

// Returns front-left and front-right world points for an object taking into account its rotation.
export function getFrontEdgePoints(object: Object3D) {
	const box = new Box3().setFromObject(object)
	const center = box.getCenter(new Vector3())

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

	const quat = object.getWorldQuaternion(new Quaternion())
	const forward = new Vector3(0, 0, -1).applyQuaternion(quat).normalize()
	const right = new Vector3(1, 0, 0).applyQuaternion(quat).normalize()

	// compute projection of each corner onto forward axis
	const projections = corners.map(c => ({
		corner: c,
		f: c.clone().sub(center).dot(forward),
		r: c.clone().sub(center).dot(right),
	}))

	// find max forward projection (front-most)
	let maxF = -Infinity
	projections.forEach(p => {
		if (p.f > maxF) maxF = p.f
	})

	const eps = 1e-4
	const frontCandidates = projections.filter(
		p => Math.abs(p.f - maxF) < eps || p.f >= maxF - 0.0001
	)

	let frontLeft: Vector3 | null = null
	let frontRight: Vector3 | null = null

	if (frontCandidates.length >= 2) {
		// pick min r as left, max r as right
		let minR = Infinity
		let maxR = -Infinity
		frontCandidates.forEach(p => {
			if (p.r < minR) {
				minR = p.r
				frontLeft = p.corner
			}
			if (p.r > maxR) {
				maxR = p.r
				frontRight = p.corner
			}
		})
	} else if (frontCandidates.length === 1) {
		// single front corner — find best left/right by choosing corners with closest r values
		const fc = frontCandidates[0]
		// find overall min and max r among all corners
		let minR = Infinity
		let maxR = -Infinity
		let minCorner: Vector3 | null = null
		let maxCorner: Vector3 | null = null
		projections.forEach(p => {
			if (p.r < minR) {
				minR = p.r
				minCorner = p.corner
			}
			if (p.r > maxR) {
				maxR = p.r
				maxCorner = p.corner
			}
		})
		frontLeft = minCorner || fc.corner
		frontRight = maxCorner || fc.corner
	} else {
		// fallback: use center plus axis extents
		// compute extents along forward and right
		let maxFAbs = 0
		let maxRAbs = 0
		projections.forEach(p => {
			maxFAbs = Math.max(maxFAbs, Math.abs(p.f))
			maxRAbs = Math.max(maxRAbs, Math.abs(p.r))
		})
		frontLeft = center
			.clone()
			.add(forward.clone().multiplyScalar(maxFAbs))
			.add(right.clone().multiplyScalar(-maxRAbs))
		frontRight = center
			.clone()
			.add(forward.clone().multiplyScalar(maxFAbs))
			.add(right.clone().multiplyScalar(maxRAbs))
	}

	return {
		frontLeft: frontLeft ? frontLeft.clone() : center.clone(),
		frontRight: frontRight ? frontRight.clone() : center.clone(),
		center,
	}
}

export const checkIfSnap = (distance: number) =>
	distance < SNAP_DISTANCE_WALL && distance > -0.5

export const getModelPath = (name: string): string => {
	return MODEL_URL + `${name}.glb`
}

export const getModelImagePath = (name: string): string => {
	// Convert model name to match the image file naming convention
	// Examples: "Counter top62 maple wood" -> "counterTop62MapleWood"
	//           "counterTop62MapleWood" -> "counterTop62MapleWood"
	
	// First, convert to camelCase if it's in normal case
	let normalizedName = name
	
	// If it contains spaces, convert to camelCase
	if (name.includes(' ')) {
		normalizedName = name
			.split(' ')
			.map((word, index) => {
				if (index === 0) {
					return word.toLowerCase()
				}
				return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
			})
			.join('')
	}
	
	return MODEL_IMG_URL + `${normalizedName}.png`
}

export const getMousePoint = (
	canvas: HTMLCanvasElement,
	camera: Camera,
	e: { clientX: number; clientY: number }
) => {
	const rect = canvas.getBoundingClientRect()
	const x = ((e.clientX - rect.left) / rect.width) * 2 - 1
	const y = -((e.clientY - rect.top) / rect.height) * 2 + 1

	const raycaster = new Raycaster()
	raycaster.setFromCamera(new Vector2(x, y), camera)

	const plane = new Plane(new Vector3(0, 1, 0), 0)
	const point = new Vector3()

	raycaster.ray.intersectPlane(plane, point)

	return point
}

export const getPositionYByModelType = (type: string) => {
	if (type === 'middle-wall-cabinet') {
		return LAYERS_HEIGHT.middleHigh
	} else if (type === 'top-wall-cabinet') {
		return LAYERS_HEIGHT.top
	} else if (type === 'surface-wall') {
		return LAYERS_HEIGHT.middle
	} else if (type === 'surface') {
		return LAYERS_HEIGHT.middleBottom
	} else {
		return LAYERS_HEIGHT.floor
	}
}

function canSnapToModel(
	slapRules: { allowedTargets: string[] },
	targetModel: Object3D
): boolean {
	if (!slapRules.allowedTargets || slapRules.allowedTargets.length === 0) {
		return true
	}

	const targetType = targetModel.userData?.type
	if (!targetType) {
		return false
	}

	return slapRules.allowedTargets.includes(targetType)
}

const CORNER_MODELS = ['door2Base62Lux', 'door2Base62']

export const slapObject = (draggingModel: Object3D<Object3DEventMap>) => {
	if (!draggingModel || !draggingModel.userData) {
		return
	}

	console.log('Slapping object:', draggingModel.userData.modelName)

	const modelType = draggingModel.userData.type
	if (!modelType) {
		return
	}

	const modelName = draggingModel.userData.modelName || ''
	const isCornerOnly =
		CORNER_MODELS.includes(modelName) ||
		modelName.toLowerCase().includes('corner')

	if (isCornerOnly) {
		if (draggingModel.userData.isInCorner) {
			const wallA = draggingModel.userData.cornerWalls[0]
			const wallB = draggingModel.userData.cornerWalls[1]

			// Determine corner chirality so the asymmetric L-shaped cabinet always
			// has its open slot pointing into the room corner regardless of which
			// wall the user was nearest when they dropped it.
			//
			// Identify the X-axis wall (left/right) and Z-axis wall (front/back)
			// from their bounding-box centres — order-independent.
			const centA = new Box3().setFromObject(wallA).getCenter(new Vector3())
			const centB = new Box3().setFromObject(wallB).getCenter(new Vector3())
			const isAXWall = Math.abs(centA.x) > Math.abs(centA.z)
			const xCent   = isAXWall ? centA : centB   // centre of left/right wall
			const zCent   = isAXWall ? centB : centA   // centre of front/back wall

			// Inward normal signs:  left wall → xNX=+1, right wall → xNX=-1
			//                       front wall → zNZ=+1, back wall → zNZ=-1
			// chirality = -(xNX * zNZ): > 0 means the corner is "opposite-handed"
			// to the model's default orientation and needs a +90° Y correction.
			const xNX = -Math.sign(xCent.x)
			const zNZ = -Math.sign(zCent.z)
			if (-xNX * zNZ > 0) {
				draggingModel.rotateY(Math.PI / 2)
			}

			snapBoxToCorner(draggingModel, wallA, wallB, MODEL_GAP)

			draggingModel.userData.attachedWall = null
			draggingModel.userData.attachedWallName = null
			draggingModel.userData.savedQuaternion = null
		} else {
			draggingModel.userData.attachedWall = null
			draggingModel.userData.attachedWallName = null
			draggingModel.userData.savedQuaternion = null
		}

		return
	}

	const slapRules = MODEL_SLAP_RULES.find(rule => rule.type === modelType)
	console.log('Slapping object:', draggingModel.userData)

	if (!slapRules) {
		return
	}

	if (slapRules.corner && draggingModel.userData.isInCorner) {
		snapBoxToCorner(
			draggingModel,
			draggingModel.userData.cornerWalls[0],
			draggingModel.userData.cornerWalls[1],
			MODEL_GAP
		)
		// In a corner snap we don't attach to a single wall
		draggingModel.userData.attachedWall = null
		// clear any saved orientation because corner doesn't have a single wall
		draggingModel.userData.savedQuaternion = null
		return
	}

	// 1. Prefer snapping to another model for surfaces when that model is on the
	// same wall or is a corner model. If not possible, fall back to wall snap.
	const draggingType = draggingModel.userData.type
	const canPreferModelSnap =
		draggingType === 'surface' || draggingType === 'surface-wall'

	if (
		canPreferModelSnap &&
		draggingModel.userData.closestModel &&
		// allow if the target model is free-floating, in a corner, or attached to the same wall
		(!draggingModel.userData.closestModel.userData?.attachedWallName ||
			!!draggingModel.userData.closestModel.userData?.isInCorner ||
			draggingModel.userData.closestModel.userData?.attachedWallName ===
				draggingModel.userData.closestWall?.name)
	) {
		// Snap to the side of the nearest model first if allowed by slapRules
		if (canSnapToModel(slapRules, draggingModel.userData.closestModel)) {
			const sideRule = slapRules.rules.find(rule => rule.plane === 'side')
			if (sideRule) {
				snapToModelSideUsingExistingFunction(
					draggingModel,
					draggingModel.userData.closestModel
				)

				// after model-side snapping, record attachedWall if we also have a closestWall
				if (slapRules.slapWall && draggingModel.userData.closestWall) {
					const q =
						draggingModel.userData.savedQuaternion ||
						draggingModel.userData.potentialQuaternion ||
						null
					if (q && q.isQuaternion) {
						draggingModel.quaternion.copy(q)
					}
					snapToWallUsingExistingFunction(
						draggingModel,
						draggingModel.userData.closestWall
					)
					draggingModel.userData.attachedWall =
						draggingModel.userData.closestWall
					draggingModel.userData.attachedWallName =
						draggingModel.userData.closestWall?.name ?? null
				}

				return
			}
		}
	}

	// 2. Спочатку злипання зі стіною (fallback)
	if (slapRules.slapWall && draggingModel.userData.closestWall) {
		// If the snapping algorithm previously computed a savedQuaternion (when
		// the user manually selected a wall) or potentialQuaternion during
		// dragging, apply it as the object's quaternion so the orientation is
		// persisted as the model's origin.
		const q =
			draggingModel.userData.savedQuaternion ||
			draggingModel.userData.potentialQuaternion ||
			null
		if (q && q.isQuaternion) {
			draggingModel.quaternion.copy(q)
		}

		snapToWallUsingExistingFunction(
			draggingModel,
			draggingModel.userData.closestWall
		)
		// record actual attached wall only after successful snap
		draggingModel.userData.attachedWall = draggingModel.userData.closestWall
		// also store wall name for serialization/lookup elsewhere
		draggingModel.userData.attachedWallName =
			draggingModel.userData.closestWall?.name ?? null
	} else {
		// no wall snap happened - ensure attachedWall is cleared and savedQuaternion
		// is not persisted
		draggingModel.userData.attachedWall = null
		draggingModel.userData.attachedWallName = null
		draggingModel.userData.savedQuaternion = null
	}

	// 2. Потім злипання з моделлю знизу (використовуємо detectedBottomObject)
	if (
		draggingModel.userData.closestModel &&
		canSnapToModel(slapRules, draggingModel.userData.closestModel)
	) {
		const sideRule = slapRules.rules.find(rule => rule.plane === 'side')
		if (sideRule) {
			snapToModelSideUsingExistingFunction(
				draggingModel,
				draggingModel.userData.closestModel
			)
		}

		return
	} else if (draggingModel.userData.detectedBottomObject) {
		snapToModelBottomByClosestEdge(
			draggingModel,
			draggingModel.userData.detectedBottomObject
		)

		if (slapRules.slapWall && draggingModel.userData.closestWall) {
			// Apply saved/potential quaternion if available before final wall snap
			const q =
				draggingModel.userData.savedQuaternion ||
				draggingModel.userData.potentialQuaternion ||
				null
			if (q && q.isQuaternion) {
				draggingModel.quaternion.copy(q)
			}

			snapToWallUsingExistingFunction(
				draggingModel,
				draggingModel.userData.closestWall
			)
			// after bottom-model snapping, if we also snap to wall, record it
			draggingModel.userData.attachedWall = draggingModel.userData.closestWall
			draggingModel.userData.attachedWallName =
				draggingModel.userData.closestWall?.name ?? null
		} else {
			// ensure attachedWall cleared if no wall snap
			draggingModel.userData.attachedWall = null
			draggingModel.userData.attachedWallName = null
			draggingModel.userData.savedQuaternion = null
		}
	}
}

// Злипання зі стіною використовуючи існуючу функцію
function snapToWallUsingExistingFunction(
	draggingModel: Object3D,
	wall: Object3D
) {
	snapBoxToWallByPlanes(draggingModel, wall, MODEL_GAP)
}

function snapToModelSideUsingExistingFunction(
	draggingModel: Object3D,
	targetModel: Object3D
) {
	snapBoxesByPlanes(draggingModel, targetModel)
}

function snapToModelBottomByClosestEdge(
	draggingModel: Object3D,
	targetModel: Object3D
) {
	// compute rotated front edge points for both models
	const draggingFront = getFrontEdgePoints(draggingModel)
	const targetFront = getFrontEdgePoints(targetModel)

	// compare left-left and right-right distances
	const leftDist = draggingFront.frontLeft.distanceTo(targetFront.frontLeft)
	const rightDist = draggingFront.frontRight.distanceTo(targetFront.frontRight)

	const useLeft = leftDist <= rightDist

	const draggingPoint = useLeft
		? draggingFront.frontLeft
		: draggingFront.frontRight
	const targetPoint = useLeft ? targetFront.frontLeft : targetFront.frontRight

	// align in XZ plane only
	const offset = new Vector3(
		targetPoint.x - draggingPoint.x,
		0,
		targetPoint.z - draggingPoint.z
	)
	draggingModel.position.add(offset)
}

export function camelCaseToNormal(str: string): string {
	const result = str
		.replace(/([A-Z])/g, ' $1')
		.trim()
		.toLowerCase()

	return result.charAt(0).toUpperCase() + result.slice(1)
}
