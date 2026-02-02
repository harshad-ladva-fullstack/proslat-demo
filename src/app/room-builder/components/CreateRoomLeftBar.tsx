import { ChevronLeft } from 'lucide-react'

import { SideBar } from '@/components/ui/sideBar'
import { CreateRoomSettings } from './CreateRoomSettings'
import { WallCutoutEdit } from './WallCutoutEdit'
import { useRoomBuilderStore } from '@/store/useRoomBuilderStore'

interface CreateRoomLeftBarProps {
	setIsCreateScratch: (value: boolean) => void
}

export const CreateRoomLeftBar = ({
	setIsCreateScratch,
}: CreateRoomLeftBarProps) => {
	const { isWallContextMenuOpen } = useRoomBuilderStore()
	return (
		<SideBar>
			<h2 className='text-lg font-semibold flex items-center gap-2 mb-4'>
				<button onClick={() => setIsCreateScratch(false)}>
					<ChevronLeft />
				</button>
				Create your custom room
			</h2>
			{!isWallContextMenuOpen ? <CreateRoomSettings /> : <WallCutoutEdit />}
		</SideBar>
	)
}
