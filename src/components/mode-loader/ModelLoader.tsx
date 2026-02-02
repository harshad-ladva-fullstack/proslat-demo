import {
	useRef,
	useState,
	useCallback,
	useEffect,
	type DragEvent,
	type ChangeEvent,
} from 'react'
import { useGLTF } from '@react-three/drei'
import { useRoomBuilderStore } from '@/store/useRoomBuilderStore'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { fetchCreateProject, fetchUploadProjectModel } from '@/api/project'

const SceneSaver = ({ url }: { url: string }) => {
	const { scene } = useGLTF(url)
	const { addRoomModel } = useRoomBuilderStore()

	useEffect(() => {
		addRoomModel(scene)
	}, [addRoomModel, scene])

	return null
}

export const ModelLoader = ({ name }: { name: string }) => {
	const { setIsCustomRoom } = useRoomBuilderStore()
	const navigate = useNavigate()

	const inputRef = useRef<HTMLInputElement>(null)
	const [modelUrl, setModelUrl] = useState<string | null>(null)

	const { mutateAsync: createProject } = useMutation({
		mutationFn: fetchCreateProject,
	})

	const { mutateAsync: uploadModel } = useMutation({
		mutationFn: ({ projectId, file }: { projectId: number; file: File }) =>
			fetchUploadProjectModel(projectId, file),
	})

	const handleFile = useCallback(
		async (file: File) => {
			try {
				const project = await createProject({ name })

				if (project.id) {
					const updatedProject = await uploadModel({
						projectId: project.id,
						file,
					})

					if (updatedProject.glbUrl) {
						setModelUrl(updatedProject.glbUrl)
					}
					setIsCustomRoom(false)
					navigate(`/room-builder/edit-room/${project.id}`)
				} else {
					console.error('Failed to create project')
				}
			} catch (error) {
				console.error('Error handling file:', error)
			}
		},
		[createProject, uploadModel, name, setIsCustomRoom, navigate]
	)

	const handleDrop = useCallback(
		(e: DragEvent) => {
			e.preventDefault()
			if (e.dataTransfer.files.length > 0) {
				handleFile(e.dataTransfer.files[0])
			}
		},
		[handleFile]
	)

	const handleChange = useCallback(
		(e: ChangeEvent<HTMLInputElement>) => {
			if (e.target.files && e.target.files[0]) {
				handleFile(e.target.files[0])
			}
		},
		[handleFile]
	)

	return (
		<div
			onDrop={handleDrop}
			onDragOver={e => e.preventDefault()}
			className='relative w-full h-[100px] border-2 border-dashed border-gray-400 flex items-center justify-center'
		>
			<input
				type='file'
				accept='.glb'
				ref={inputRef}
				onChange={handleChange}
				style={{ display: 'none' }}
				disabled={!name}
			/>
			{!modelUrl && (
				<div
					onClick={() => inputRef.current?.click()}
					className='text-center text-gray-500 cursor-pointer'
				>
					<p className='text-lg'>Glb model</p>
				</div>
			)}
			{modelUrl && <SceneSaver url={modelUrl} />}
		</div>
	)
}
