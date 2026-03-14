import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useRoomBuilderStore } from '@/store/useRoomBuilderStore'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchUploadProjectModel } from '@/api/project'
import { GLTFExporter } from 'three/examples/jsm/Addons.js'
import { Object3D } from 'three'
import type { ChangeEvent } from 'react'
import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { QUERY_KEYS } from '@/constants/query-keys'

export const CreateRoomSettings = () => {
	const { id } = useParams<{ id: string }>()
	const queryClient = useQueryClient()
	const [isSaving, setIsSaving] = useState(false)

	const { roomParams, setRoomParams, regenerateRoom, scene, setIsCustomRoom } =
		useRoomBuilderStore()

	const { mutateAsync: uploadModel } = useMutation({
		mutationFn: ({ projectId, file }: { projectId: number; file: File }) =>
			fetchUploadProjectModel(projectId, file),
	})

	const handleChange =
		(field: keyof typeof roomParams) => (e: ChangeEvent<HTMLInputElement>) => {
			const value = e.target.value

			const parsedValue =
				field === 'wallColor' || field === 'floorColor' ? value : Number(value)

			setRoomParams({ [field]: parsedValue as never })
			regenerateRoom()

			// Persist dimensions to localStorage so they survive a page reload or
			// back-navigation before the user explicitly clicks "Save & Use Room".
			if (id) {
				const updated = { ...roomParams, [field]: parsedValue }
				localStorage.setItem(
					`proslat_roomParams_${id}`,
					JSON.stringify(updated)
				)
			}
		}

	const fixBillboardOrientations = (sceneClone: Object3D) => {
		sceneClone.traverse(child => {
			if (child.name === 'ignore') {
				child.rotation.set(0, 0, 0)
				child.rotateX(-Math.PI / 2)
			}
		})
	}

	const exportSceneAsBlob = async (): Promise<Blob | null> => {
		return new Promise(resolve => {
			if (!scene) {
				resolve(null)
				return
			}

			const tempScene = scene.clone()
			fixBillboardOrientations(tempScene)

			const exporter = new GLTFExporter()
			exporter.parse(
				tempScene,
				result => {
					if (result instanceof ArrayBuffer) {
						const blob = new Blob([result], { type: 'model/gltf-binary' })
						resolve(blob)
					} else {
						console.warn('Expected binary glTF (.glb), got JSON')
						resolve(null)
					}
				},
				error => {
					console.error('Export error:', error)
					resolve(null)
				},
				{ binary: true }
			)
		})
	}

	const handleSave = async () => {
		// Remove cutout meshes from the scene before exporting
		scene?.traverse(child => {
			if (child.userData.isCutout) {
				if (child.parent) {
					const mesh = child as unknown as {
						geometry?: { dispose(): void }
						material?: any
					}
					if (mesh.geometry && typeof mesh.geometry.dispose === 'function')
						mesh.geometry.dispose()
					if (mesh.material) {
						const m = mesh.material
						if (Array.isArray(m))
							m.forEach(
								(mm: any) =>
									mm && typeof mm.dispose === 'function' && mm.dispose()
							)
						else if (m && typeof m.dispose === 'function') m.dispose()
					}
					child.parent.remove(child)
				}
			}
		})

		if (!id) {
			console.error('No project id available')
			return
		}

		try {
			setIsSaving(true)

			const glbBlob = await exportSceneAsBlob()

			if (glbBlob) {
				const file = new File([glbBlob], 'custom-room.glb', {
					type: 'model/gltf-binary',
				})

				await uploadModel({ projectId: Number(id), file })

				// Persist the current room params so they are restored when the
				// project is reopened, even before the GLB bounding box is parsed.
				localStorage.setItem(
					`proslat_roomParams_${id}`,
					JSON.stringify(roomParams)
				)

				// Refresh project data so Scene.tsx loads the new GLB from the server.
				// The glbUrl effect in Scene.tsx will then set isCustomRoom=false.
				await queryClient.invalidateQueries({
					queryKey: [id, QUERY_KEYS.project],
				})
				setIsCustomRoom(false)
			} else {
				console.error('Failed to export scene as GLB')
			}
		} catch (error) {
			console.error('Error saving project:', error)
		} finally {
			setIsSaving(false)
		}
	}

	return (
		<>
			<div className='mb-4 flex flex-col gap-2'>
				<Label htmlFor='Width'>Width</Label>
				<Input
					id='Width'
					type='number'
					value={roomParams.width}
					onChange={handleChange('width')}
				/>
			</div>
			<div className='mb-4 flex flex-col gap-2'>
				<Label htmlFor='Height'>Height</Label>
				<Input
					id='Height'
					type='number'
					value={roomParams.height}
					onChange={handleChange('height')}
				/>
			</div>
			<div className='mb-4 flex flex-col gap-2'>
				<Label htmlFor='Depth'>Depth</Label>
				<Input
					id='Depth'
					type='number'
					value={roomParams.depth}
					onChange={handleChange('depth')}
				/>
			</div>
			<div className='mb-4 flex flex-col gap-2'>
				<Label htmlFor='wallThickness'>Wall Thickness</Label>
				<Input
					id='wallThickness'
					type='number'
					step='0.01'
					value={roomParams.wallThickness}
					onChange={handleChange('wallThickness')}
				/>
			</div>
			<div className='mb-4 flex flex-col gap-2'>
				<Label htmlFor='wallColor'>Wall Color</Label>
				<Input
					id='wallColor'
					type='color'
					value={roomParams.wallColor}
					onChange={handleChange('wallColor')}
				/>
			</div>
			<div className='mb-4 flex flex-col gap-2'>
				<Label htmlFor='floorColor'>Floor Color</Label>
				<Input
					id='floorColor'
					type='color'
					value={roomParams.floorColor}
					onChange={handleChange('floorColor')}
				/>
			</div>
			<Button
				variant={'outline'}
				className='w-full'
				onClick={handleSave}
				disabled={isSaving}
			>
				{isSaving ? 'Saving...' : 'Save & Use Room'}
			</Button>
		</>
	)
}
