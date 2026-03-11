import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { ModelLoader } from '@/components/mode-loader/ModelLoader'
import { Button } from '@/components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@/components/ui/dialog'
import { fetchCreateProject, fetchUploadProjectModel } from '@/api/project'
import { useRoomBuilderStore } from '@/store/useRoomBuilderStore'

interface ModelLoadDialogProps {
	name: string
}

export const ModelLoadDialog = ({ name }: ModelLoadDialogProps) => {
	const [selectedFile, setSelectedFile] = useState<File | null>(null)
	const [isLoading, setIsLoading] = useState(false)
	const navigate = useNavigate()
	const { setIsCustomRoom } = useRoomBuilderStore()

	const { mutateAsync: createProject } = useMutation({
		mutationFn: fetchCreateProject,
	})

	const { mutateAsync: uploadModel } = useMutation({
		mutationFn: ({ projectId, file }: { projectId: number; file: File }) =>
			fetchUploadProjectModel(projectId, file),
	})

	const handleLoad = async () => {
		if (!selectedFile || !name) return
		try {
			setIsLoading(true)
			const project = await createProject({ name })
			if (project.id) {
				await uploadModel({ projectId: project.id, file: selectedFile })
				setIsCustomRoom(false)
				navigate(`/room-builder/edit-room/${project.id}`)
			} else {
				console.error('Failed to create project')
			}
		} catch (error) {
			console.error('Error loading model:', error)
		} finally {
			setIsLoading(false)
		}
	}

	return (
		<Dialog>
			<DialogTrigger asChild>
				<Button variant='outline'>Load room model</Button>
			</DialogTrigger>
			<DialogContent className='sm:max-w-[425px]'>
				<DialogHeader>
					<DialogTitle>Load Room Model</DialogTitle>
					<DialogDescription>
						Upload or load a GLB file of your 3D room model. This model will be
						used in the scene.
					</DialogDescription>
				</DialogHeader>
				<ModelLoader
					disabled={!name}
					selectedFile={selectedFile}
					onFileSelected={setSelectedFile}
				/>
				<DialogFooter>
					<Button
						onClick={handleLoad}
						disabled={!selectedFile || isLoading || !name}
					>
						{isLoading ? 'Loading...' : 'Load Model'}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
