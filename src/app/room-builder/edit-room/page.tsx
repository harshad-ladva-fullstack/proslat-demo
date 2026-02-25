import { Scene } from '../components/Scene'
import { useParams } from 'react-router-dom'
import { Outlet } from 'react-router-dom'
import { useMatch } from 'react-router-dom'

export default function EditRoomPage() {
	const { id } = useParams<{ id: string }>()

	const isTilesStart = !!useMatch('/room-builder/edit-room/:id/tiles/start')
	const isCeilingLights = !!useMatch(
		'/room-builder/edit-room/:id/ceiling-lights'
	)

	return (
		<div className='room-builder-page'>
			{!isTilesStart && !isCeilingLights && <Scene id={id} />}

			<Outlet />
		</div>
	)
}
