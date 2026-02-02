import { useState } from 'react'
import { Scene } from './room-builder/components/Scene'
import { ModelLoadDialog } from './room-builder/components/ModelLoadDialog'
import { Button } from '@/components/ui/button'
import { CreateRoomLeftBar } from './room-builder/components/CreateRoomLeftBar'
import { useRoomBuilderStore } from '@/store/useRoomBuilderStore'
import { Input } from '@/components/ui/input'

export default function CreateRoomPage() {
	const [isCreateScratch, setIsCreateScratch] = useState(false)
	const [name, setName] = useState('')

	const { setIsCustomRoom } = useRoomBuilderStore()

	const handleCreateScratch = () => {
		setIsCustomRoom(true)

		setIsCreateScratch(true)
	}
	return (
		<div className='room-builder-page relative'>
			{isCreateScratch && <Scene />}
			{!isCreateScratch && (
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
							<Button variant='outline' onClick={handleCreateScratch}>
								Create scratch
							</Button>
						</div>
					)}
				</div>
			)}
			{isCreateScratch && (
				<CreateRoomLeftBar setIsCreateScratch={setIsCreateScratch} />
			)}
		</div>
	)
}
