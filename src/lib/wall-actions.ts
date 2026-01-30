import {
	Object3D,
	Vector3,
	Mesh,
	BoxGeometry,
	MeshBasicMaterial,
	Box3,
	Matrix4,
	BufferGeometry,
} from 'three'

export const DEFAULT_CUTOUT_WIDTH = 1.2
export const DEFAULT_DOOR_HEIGHT = 2.3
export const DEFAULT_WINDOW_HEIGHT = 1.0
export const DEFAULT_DOOR_FIXED_Y = 0
export const DEFAULT_WINDOW_FIXED_Y = 1.4
export const DEFAULT_CUTOUT_DEPTH = 0.3

export const removeAllCutouts = (wallObject: Object3D) => {
	const cutouts = getCutoutsOnWall(wallObject)
	cutouts.forEach(cutout => removeCutout(cutout))
	wallObject.updateMatrixWorld(true)
}
import { CSG } from 'three-csg-ts'

export interface WallAction {
	id: string
	label: string
	action: (wallObject: Object3D, intersectionPoint?: Vector3) => void
	color?: string
}

const getWallOrientation = (wallMesh: Mesh): Vector3 => {
	const wallBounds = new Box3().setFromObject(wallMesh)
	const size = new Vector3()
	wallBounds.getSize(size)

	if (size.x > size.z) {
		return new Vector3(1, 0, 0)
	} else {
		return new Vector3(0, 0, 1)
	}
}

const makeCutoutInteractive = (cutoutMesh: Mesh, wallMesh: Mesh) => {
	cutoutMesh.userData.isDraggable = true
	cutoutMesh.userData.parentWall = wallMesh
	cutoutMesh.userData.originalY = cutoutMesh.position.y

	// preserve any logical sizes provided at creation (do not overwrite)
	if (cutoutMesh.geometry) {
		const box = new Box3().setFromObject(cutoutMesh)
		const size = new Vector3()
		box.getSize(size)
		if (
			cutoutMesh.userData.originalWidth === undefined ||
			cutoutMesh.userData.originalWidth === null
		) {
			cutoutMesh.userData.originalWidth = size.x
		}
		if (
			cutoutMesh.userData.originalHeight === undefined ||
			cutoutMesh.userData.originalHeight === null
		) {
			cutoutMesh.userData.originalHeight = size.z
		}
	}
}

const updateCutoutPosition = (
	cutoutMesh: Mesh,
	newPosition: Vector3,
	wallMesh: Mesh
): { success: boolean; constrainedPosition: Vector3 } => {
	const localPosition = wallMesh.worldToLocal(newPosition.clone())
	const wallBounds = new Box3().setFromObject(wallMesh)
	const wallSize = new Vector3()
	wallBounds.getSize(wallSize)

	const halfWidth = cutoutMesh.userData.originalWidth / 2
	const halfHeight = cutoutMesh.userData.originalHeight / 2

	const originalX = localPosition.x
	const originalZ = localPosition.z

	localPosition.x = Math.max(
		-wallSize.x / 2 + halfWidth,
		Math.min(wallSize.x / 2 - halfWidth, localPosition.x)
	)
	localPosition.z = Math.max(
		-wallSize.z / 2 + halfHeight,
		Math.min(wallSize.z / 2 - halfHeight, localPosition.z)
	)

	cutoutMesh.position.x = localPosition.x
	cutoutMesh.position.z = localPosition.z

	const wasConstrained =
		originalX !== localPosition.x || originalZ !== localPosition.z

	return {
		success: !wasConstrained,
		constrainedPosition: localPosition,
	}
}

const getCutoutAtPosition = (
	wallObject: Object3D,
	position: Vector3
): Mesh | null => {
	let foundCutout: Mesh | null = null
	wallObject.traverse(child => {
		if (child instanceof Mesh && child.userData.isCutout) {
			const worldPos = child.localToWorld(child.position.clone())
			if (worldPos.distanceTo(position) < 0.3) {
				foundCutout = child
			}
		}
	})
	return foundCutout
}

const removeCutout = (cutoutMesh: Mesh) => {
	const parent = cutoutMesh.parent
	const scene = parent?.parent?.parent || parent?.parent

	if (parent) parent.remove(cutoutMesh)

	if (cutoutMesh.geometry) cutoutMesh.geometry.dispose()
	if (cutoutMesh.material) {
		if (Array.isArray(cutoutMesh.material)) {
			cutoutMesh.material.forEach(mat => mat.dispose?.())
		} else {
			cutoutMesh.material.dispose?.()
		}
	}

	cutoutMesh.userData = {}
	cutoutMesh.visible = false

	if (parent) {
		parent.updateMatrixWorld(true)
		parent.updateMatrix()
	}
	if (scene) scene.updateMatrixWorld(true)
}

const createWallCutout = (
	wallObject: Object3D,
	width: number,
	height: number,
	intersectionPoint?: Vector3,
	fixedY?: number,
	type: 'door' | 'window' = 'door'
) => {
	if (!intersectionPoint) return

	wallObject.traverse(child => {
		if (child instanceof Mesh && child.geometry && child.material) {
			if (
				child.userData.isCutout ||
				child.name.includes('cutout') ||
				child.name.includes('helper')
			)
				return

			const wallOrientation = getWallOrientation(child)

			const cutoutGeometry = new BoxGeometry(
				width,
				height,
				DEFAULT_CUTOUT_DEPTH
			)
			const cutoutMaterial = new MeshBasicMaterial({
				color: 0xff0000,
				transparent: true,
				opacity: 1,
				side: 2,
			})
			const cutoutMesh = new Mesh(cutoutGeometry, cutoutMaterial)
			cutoutMesh.castShadow = true
			cutoutMesh.receiveShadow = true

			const localIntersectionPoint = child.worldToLocal(
				intersectionPoint.clone()
			)
			cutoutMesh.position.x = localIntersectionPoint.x
			cutoutMesh.position.z = localIntersectionPoint.z
			// determine fixedY (distance from wall bottom) to use and persist
			const chosenFixedY =
				fixedY !== undefined
					? fixedY
					: type === 'window'
					? DEFAULT_WINDOW_FIXED_Y
					: DEFAULT_DOOR_FIXED_Y

			// compute wall bottom in wall-local coordinates and position cutout center
			const wallBox = new Box3().setFromObject(child)
			const wallBottomWorld = wallBox.min.clone()
			const wallBottomLocal = child.worldToLocal(wallBottomWorld)
			cutoutMesh.position.y = wallBottomLocal.y + chosenFixedY + height / 2

			if (wallOrientation.z > 0) {
				cutoutMesh.rotation.set(0, Math.PI / 2, 0)
			}

			cutoutMesh.updateMatrixWorld(true)
			child.updateMatrixWorld(true)

			cutoutMesh.name = `cutout_${type}_${Date.now()}`
			cutoutMesh.userData.isCutout = true
			cutoutMesh.userData.cutoutType = type
			// store the logical parameters passed to creation so UI can display them
			cutoutMesh.userData.logicalWidth = width
			cutoutMesh.userData.logicalHeight = height
			cutoutMesh.userData.originalWidth = width
			cutoutMesh.userData.originalHeight = height
			cutoutMesh.userData.logicalFixedY = chosenFixedY
			cutoutMesh.userData.originalFixedY = chosenFixedY

			cutoutMesh.visible = true
			cutoutMesh.raycast = Mesh.prototype.raycast
			cutoutMesh.layers.enableAll()

			makeCutoutInteractive(cutoutMesh, child)
			child.add(cutoutMesh)
		}
	})
}

const getCutoutsOnWall = (wallObject: Object3D): Mesh[] => {
	const cutouts: Mesh[] = []
	wallObject.traverse(child => {
		if (child instanceof Mesh && child.userData.isCutout) cutouts.push(child)
	})
	return cutouts
}

function bakeToWorld(src: Mesh, material?: Mesh['material']): Mesh {
	const g = (src.geometry as BufferGeometry).clone()
	src.updateMatrixWorld(true)
	g.applyMatrix4(src.matrixWorld)
	const m = new Mesh(g, material ?? new MeshBasicMaterial())
	m.position.set(0, 0, 0)
	m.rotation.set(0, 0, 0)
	m.scale.set(1, 1, 1)
	m.updateMatrixWorld(true)
	return m
}

export const applyAllCutoutsCSG = (wallObject: Object3D) => {
	const cutouts = getCutoutsOnWall(wallObject)
	if (cutouts.length === 0) return

	wallObject.updateMatrixWorld(true)
	wallObject.traverse(child => {
		if (
			child instanceof Mesh &&
			child.geometry &&
			child.material &&
			!child.userData.isCutout
		) {
			const wallWorld = bakeToWorld(child, child.material)
			let wallCSG = CSG.fromMesh(wallWorld)
			let updated = false
			cutouts.forEach(cutoutMesh => {
				if (cutoutMesh.parent === child && cutoutMesh.geometry) {
					const cutoutWorld = bakeToWorld(cutoutMesh, new MeshBasicMaterial())
					const cutCSG = CSG.fromMesh(cutoutWorld)
					wallCSG = wallCSG.subtract(cutCSG)
					updated = true
					cutoutWorld.geometry.dispose()
					if (Array.isArray(cutoutWorld.material)) {
						cutoutWorld.material.forEach(m => m.dispose?.())
					} else {
						cutoutWorld.material.dispose?.()
					}
				}
			})
			if (!updated) return
			const resultWorldMesh = CSG.toMesh(wallCSG, new Matrix4(), child.material)
			child.updateMatrixWorld(true)
			const inv = new Matrix4().copy(child.matrixWorld).invert()
			resultWorldMesh.geometry.applyMatrix4(inv)
			if (child.geometry) child.geometry.dispose()
			child.geometry = resultWorldMesh.geometry
			child.updateMatrixWorld(true)
			cutouts.forEach(c => {
				if (c.parent === child) {
					c.parent.remove(c)
					c.geometry?.dispose()
					if (Array.isArray(c.material)) c.material.forEach(m => m.dispose?.())
					else c.material?.dispose?.()
				}
			})
			wallWorld.geometry.dispose()
			if (Array.isArray(wallWorld.material)) {
				wallWorld.material.forEach(m => m.dispose?.())
			} else {
				wallWorld.material.dispose?.()
			}
		}
	})
}

export const applyCutoutCSG = (cutoutMesh: Mesh) => {
	const parent = cutoutMesh.parent
	if (!parent || !(parent instanceof Mesh)) return
	const child = parent as Mesh
	if (!cutoutMesh.geometry) return

	child.updateMatrixWorld(true)

	const wallWorld = bakeToWorld(child, child.material)
	let wallCSG = CSG.fromMesh(wallWorld)

	const cutoutWorld = bakeToWorld(cutoutMesh, new MeshBasicMaterial())
	const cutCSG = CSG.fromMesh(cutoutWorld)

	wallCSG = wallCSG.subtract(cutCSG)

	const resultWorldMesh = CSG.toMesh(wallCSG, new Matrix4(), child.material)
	child.updateMatrixWorld(true)
	const inv = new Matrix4().copy(child.matrixWorld).invert()
	resultWorldMesh.geometry.applyMatrix4(inv)

	if (child.geometry) child.geometry.dispose()
	child.geometry = resultWorldMesh.geometry
	child.updateMatrixWorld(true)

	// remove the cutout mesh from parent and dispose resources
	if (cutoutMesh.parent) {
		cutoutMesh.parent.remove(cutoutMesh)
	}
	cutoutMesh.geometry?.dispose()
	if (Array.isArray(cutoutMesh.material))
		cutoutMesh.material.forEach(m => m.dispose?.())
	else cutoutMesh.material?.dispose?.()

	// dispose temporary baked meshes
	wallWorld.geometry.dispose()
	if (Array.isArray(wallWorld.material))
		wallWorld.material.forEach(m => m.dispose?.())
	else wallWorld.material.dispose?.()

	cutoutWorld.geometry.dispose()
	if (Array.isArray(cutoutWorld.material))
		cutoutWorld.material.forEach(m => m.dispose?.())
	else cutoutWorld.material.dispose?.()

	child.updateMatrixWorld(true)
	const scene = child.parent
	if (scene) scene.updateMatrixWorld(true)
}

const getWallInfoFromCutout = (cutoutMesh: Mesh) => {
	const parentWall = cutoutMesh.parent
	const storedParentWall = cutoutMesh.userData.parentWall

	return {
		cutoutName: cutoutMesh.name,
		cutoutType: cutoutMesh.userData.cutoutType,
		cutoutSize: {
			width: cutoutMesh.userData.originalWidth,
			height: cutoutMesh.userData.originalHeight,
		},
		currentParent: {
			name: parentWall?.name || 'Unknown',
			object: parentWall,
		},
		storedParent: {
			name: storedParentWall?.name || 'Unknown',
			object: storedParentWall,
		},
		position: {
			local: cutoutMesh.position.clone(),
			world: cutoutMesh.getWorldPosition(new Vector3()),
		},
	}
}

export {
	removeCutout,
	makeCutoutInteractive,
	getWallOrientation,
	updateCutoutPosition,
	getCutoutAtPosition,
	getWallInfoFromCutout,
	getCutoutsOnWall,
	createWallCutout,
}
