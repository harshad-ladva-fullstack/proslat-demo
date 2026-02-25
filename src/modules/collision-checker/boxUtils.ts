import { Box3, Mesh, Object3D } from 'three'

export function getBoundingBoxExcludingHandles(obj: Object3D): Box3 {
	const result = new Box3()
	const tempBox = new Box3()
	const handleRegex = /handle/i
	let any = false

	obj.traverse(child => {
		if (!(child instanceof Mesh)) return
		if (typeof child.name === 'string' && handleRegex.test(child.name)) return

		if (!child.geometry.boundingBox) child.geometry.computeBoundingBox()
		if (child.geometry.boundingBox) {
			tempBox.copy(child.geometry.boundingBox).applyMatrix4(child.matrixWorld)
			if (!any) {
				result.copy(tempBox)
				any = true
			} else {
				result.union(tempBox)
			}
		}
	})

	if (!any) {
		return new Box3().setFromObject(obj)
	}

	return result
}

export function getWallBoundingBoxExcludingCutouts(wallObject: Object3D): Box3 {
	const result = new Box3()
	let any = false

	wallObject.traverse(child => {
		if (!(child instanceof Mesh)) return
		if (child.userData?.isCutout) return
		if (
			typeof child.name === 'string' &&
			(child.name.includes('cutout') ||
				child.name.includes('Cutout') ||
				child.name.includes('helper'))
		)
			return

		const childBox = new Box3().setFromObject(child)
		if (!any) {
			result.copy(childBox)
			any = true
		} else {
			result.union(childBox)
		}
	})

	if (!any) {
		return new Box3().setFromObject(wallObject)
	}

	return result
}
