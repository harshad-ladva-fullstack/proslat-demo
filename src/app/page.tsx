import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { ModelLoadDialog } from './room-builder/components/ModelLoadDialog'
import { Button } from '@/components/ui/button'
import { useRoomBuilderStore } from '@/store/useRoomBuilderStore'
import { Input } from '@/components/ui/input'
import { fetchCreateProject } from '@/api/project'

export default function CreateRoomPage() {
	const [name, setName] = useState('')
	const [isCreating, setIsCreating] = useState(false)
	const navigate = useNavigate()
	const { setIsCustomRoom } = useRoomBuilderStore()

	const { mutateAsync: createProject } = useMutation({
		mutationFn: fetchCreateProject,
	})

	const handleCreateScratch = async () => {
		if (!name) return
		try {
			setIsCreating(true)
			const project = await createProject({ name })
			if (project.id) {
				setIsCustomRoom(true)
				navigate(`/room-builder/edit-room/${project.id}`)
			}
		} catch (error) {
			console.error('Error creating project:', error)
		} finally {
			setIsCreating(false)
		}
	}

	return (
		<div className='room-builder-page relative'>
			<div className='absolute bottom-[50%] left-[50%] translate-x-[-50%] translate-y-[50%] bg-white p-4 '>
				<h2 className='text-lg font-semibold'>Create a new room</h2>
				<Input
					id='name'
					value={name}
					onChange={e => setName(e.target.value)}
					placeholder='Type here name of project'
					className='my-2'
				/>
				<p className='text-gray-600'>
					You can upload a 3D model of your room or start from scratch.
				</p>
				{name && (
					<div className='mt-4 flex gap-2'>
						<ModelLoadDialog name={name} />
						<Button
							variant='outline'
							onClick={handleCreateScratch}
							disabled={isCreating}
						>
							{isCreating ? 'Creating...' : 'Create scratch'}
						</Button>
					</div>
				)}
			</div>
		</div>
	)
}
