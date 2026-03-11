import { Scene } from '../components/Scene'
import { useParams } from 'react-router-dom'
import { Outlet } from 'react-router-dom'
import { useMatch } from 'react-router-dom'
import { useRoomBuilderStore } from '@/store/useRoomBuilderStore'
import { CreateRoomLeftBar } from '../components/CreateRoomLeftBar'

export default function EditRoomPage() {
	const { id } = useParams<{ id: string }>()
	const { isCustomRoom } = useRoomBuilderStore()

	const isTilesStart = !!useMatch('/room-builder/edit-room/:id/tiles/start')
	const isCeilingLights = !!useMatch(
		'/room-builder/edit-room/:id/ceiling-lights'
	)
	// Only show the custom-room sidebar when we're at the root edit-room route
	// (no sub-category active). Sub-routes render their own LeftBar via <Outlet>.
	const isRootEditRoute = !!useMatch('/room-builder/edit-room/:id')

	return (
		<div className='room-builder-page'>
			{!isTilesStart && !isCeilingLights && <Scene id={id} />}
			{isCustomRoom && isRootEditRoute && <CreateRoomLeftBar />}
			<Outlet />
		</div>
	)
}
