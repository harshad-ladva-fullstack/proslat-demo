import {
	TextureLoader,
	Mesh,
	MeshStandardMaterial,
	Texture,
	Box3,
	Vector3,
	RepeatWrapping,
} from 'three'
import { useCallback } from 'react'
import { useRoomBuilderStore } from '@/store/useRoomBuilderStore'

export function useTextureChanger() {
	const { scene } = useRoomBuilderStore()

	const changeTextureByPartialName = useCallback(
		(namePart: string = 'floor', texturePath: string, onLoad?: () => void) => {
			const loader = new TextureLoader()
			loader.load(texturePath, newTexture => {
				newTexture.wrapS = RepeatWrapping
				newTexture.wrapT = RepeatWrapping

				scene?.traverse(obj => {
					if (
						obj.name.includes(namePart) &&
						obj instanceof Mesh &&
						obj.material instanceof MeshStandardMaterial
					) {
						if (!obj.userData.originalMap) {
							obj.userData.originalMap = obj.material.map ?? null
						}

						const bbox = new Box3().setFromObject(obj)
						const size = bbox.getSize(new Vector3())

						
						const defaultTileSize = 5

						newTexture.repeat.set(
							size.x / defaultTileSize,
							size.z / defaultTileSize
						)

						obj.material.map = newTexture
						obj.material.needsUpdate = true
					}
				})

				if (onLoad) onLoad()
			})
		},
		[scene]
	)

	const restoreTextureByPartialName = useCallback(
		(namePart: string = 'floor') => {
			scene?.traverse(obj => {
				if (
					obj.name.includes(namePart) &&
					obj instanceof Mesh &&
					obj.material instanceof MeshStandardMaterial &&
					obj.userData.originalMap
				) {
					obj.material.map = obj.userData.originalMap as Texture
					obj.material.needsUpdate = true
				}
			})
		},
		[scene]
	)

	return {
		changeTextureByPartialName,
		restoreTextureByPartialName,
	}
}
