import { useRoutes } from 'react-router-dom'
import Home from './components/container/page'
import CreateRoomPage from './app/page'
import EditRoomPage from './app/room-builder/edit-room/page'
import ForbiddenPage from './app/403/page'
import EditRoomCategoryPage from './app/room-builder/edit-room/[id]/[category]/page'
import WorksurfacesPage from './app/room-builder/edit-room/[id]/[category]/worksurfaces/page'
import BacksplashesPage from './app/room-builder/edit-room/[id]/[category]/backsplashes/page'
import TilesStartPage from './app/room-builder/edit-room/[id]/tiles/start/page'
import CreateTilesPage from './app/room-builder/edit-room/[id]/tiles/create-tiles/page'
import RampsPage from './app/room-builder/edit-room/[id]/tiles/ramps/page'
import { PAGES_PATHS } from './constants/page'
import TexturesPage from './app/room-builder/edit-room/[id]/textures/page'
import ColorsPage from './app/room-builder/edit-room/[id]/colors/page'
import RoomSettingsPage from './app/room-builder/edit-room/[id]/roomSettings/page'
import CeilingLightsPage from './app/room-builder/edit-room/[id]/ceiling-lights/page'

export default function AppRoutes() {
	return useRoutes([
		{ path: PAGES_PATHS.home, element: <Home /> },
		{ path: PAGES_PATHS.createRoom, element: <CreateRoomPage /> },
		{ path: PAGES_PATHS.forbidden, element: <ForbiddenPage /> },
		{
			path: `${PAGES_PATHS.editRoom}/:id`,
			element: <EditRoomPage />,
			children: [
				{ path: '', element: null },
				{ path: 'textures', element: <TexturesPage /> },
				{ path: 'colors', element: <ColorsPage /> },
				{ path: 'roomSettings', element: <RoomSettingsPage /> },
				{ path: ':category', element: <EditRoomCategoryPage /> },
				{ path: ':category/worksurfaces', element: <WorksurfacesPage /> },
				{ path: ':category/backsplashes', element: <BacksplashesPage /> },
				{ path: 'tiles/start', element: <TilesStartPage /> },
				{ path: 'tiles/create-tiles', element: <CreateTilesPage /> },
				{ path: 'tiles/ramps', element: <RampsPage /> },
				{ path: 'ceiling-lights', element: <CeilingLightsPage /> },
			],
		},
	])
}
