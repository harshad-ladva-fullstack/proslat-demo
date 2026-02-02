import { LeftBarTabs } from './LeftBarTabs'
import { RoomSettings } from './RoomSettings'
import { SideBar } from '@/components/ui/sideBar'
import { Textures } from '@/components/textures/Textures'
import { useRoomBuilderStore } from '@/store/useRoomBuilderStore'
import { ColorSideBar } from '@/modules/color-bar/ColorSideBar'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { ChevronRight } from 'lucide-react'

export const LeftBar = () => {
	const { selectSceneSetting } = useRoomBuilderStore()
	const getTabContent = (value: string) => {
		if (value === 'models') return <LeftBarTabs />
		if (value === 'textures') return <Textures />
		if (value === 'colors') return <ColorSideBar />
		if (value === 'roomSettings') return <RoomSettings />
		return null
	}

	const navigate = useNavigate()

	const { id, category } = useParams<{
		id: string
		category: string
	}>()

	return (
		<SideBar>
			{getTabContent(selectSceneSetting)}
			{selectSceneSetting === 'models' && (
				<div className='side-bar-nav-btn'>
					<Button
						className='m-4 w-auto'
						onClick={() =>
							id &&
							category &&
							navigate(`/room-builder/edit-room/${id}/${category}/worksurfaces`)
						}
					>
						Next
						<ChevronRight />
					</Button>
				</div>
			)}
		</SideBar>
	)
}
