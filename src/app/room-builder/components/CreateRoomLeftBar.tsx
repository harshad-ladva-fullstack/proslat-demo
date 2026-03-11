import { ChevronLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { SideBar } from '@/components/ui/sideBar'
import { CreateRoomSettings } from './CreateRoomSettings'
import { WallCutoutEdit } from './WallCutoutEdit'
import { useRoomBuilderStore } from '@/store/useRoomBuilderStore'
import { PAGES_PATHS } from '@/constants/page'

export const CreateRoomLeftBar = () => {
	const { isWallContextMenuOpen } = useRoomBuilderStore()
	const navigate = useNavigate()

	return (
		<SideBar>
			<h2 className='text-lg font-semibold flex items-center gap-2 mb-4'>
				<button onClick={() => navigate(PAGES_PATHS.createRoom)}>
					<ChevronLeft />
				</button>
				Create your custom room
			</h2>
			{!isWallContextMenuOpen ? <CreateRoomSettings /> : <WallCutoutEdit />}
		</SideBar>
	)
}
