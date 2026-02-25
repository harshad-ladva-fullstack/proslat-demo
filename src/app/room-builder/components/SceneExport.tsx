import { saveAs } from 'file-saver'
import { GLTFExporter } from 'three/examples/jsm/Addons.js'
import { Object3D } from 'three'
import { useRoomBuilderStore } from '@/store/useRoomBuilderStore'
import { Button } from '@/components/ui/button'

export function SceneExporter() {
	const { scene } = useRoomBuilderStore()

	const fixBillboardOrientations = (sceneClone: Object3D) => {
		sceneClone.traverse(child => {
			if (child.name === 'ignore') {
				child.lookAt(0, 0, 0)
			}
		})
	}

	const exportScene = (callback?: (blob: Blob) => void) => {
		const exporter = new GLTFExporter()
		if (!scene) return

		// Створюємо клон сцени для експорту
		const tempScene = scene.clone()

		// Фіксуємо орієнтацію Billboard'ів
		fixBillboardOrientations(tempScene)

		exporter.parse(
			tempScene,
			result => {
				if (result instanceof ArrayBuffer) {
					const blob = new Blob([result], { type: 'model/gltf-binary' })
					callback?.(blob)
				} else {
					console.warn('Expected binary glTF (.glb), got JSON')
				}
			},
			error => {
				console.error('Export error:', error)
			},
			{ binary: true }
		)
	}

	const handleDownload = () => {
		exportScene(blob => {
			saveAs(blob, 'scene.glb')
		})
	}

	return (
		<div className='flex gap-2'>
			<Button onClick={handleDownload}>Download</Button>
		</div>
	)
}
