import { useRoomBuilderStore } from '@/store/useRoomBuilderStore'
import { Color, Mesh, MeshStandardMaterial, Object3D } from 'three'

export function useRoomSettings() {
	const { scene } = useRoomBuilderStore()

	const setWallColor = (newColor: string | Color) => {
		const color = new Color(newColor)

		scene?.traverse((object: Object3D) => {
			if (
				object instanceof Mesh &&
				object.name.includes('wall') &&
				object.material instanceof MeshStandardMaterial
			) {
				object.material.color = color
				object.material.needsUpdate = true
			}
		})
	}

	return {
		setWallColor,
	}
}
