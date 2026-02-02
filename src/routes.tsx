/**
 * Application Routes
 * 
 * FLOW HIERARCHY:
 * 1. Home (/) - Project list
 * 2. Create Room (/room/create) - FIRST STEP
 * 3. Room View (/room/:roomId) - Room overview
 * 4. Ceiling Design (/room/:roomId/ceiling-design) - REQUIRES room
 * 
 * CONSTRAINT: Ceiling design is ONLY accessible with a valid roomId.
 * Legacy ceiling route redirects to new flow.
 */

import { useRoutes, Navigate } from 'react-router-dom'

// Legacy pages (keep for backward compatibility)
import Home from './components/container/page'
import LegacyCreateRoomPage from './app/page'
import EditRoomPage from './app/room-builder/edit-room/page'
import EditRoomCategoryPage from './app/room-builder/edit-room/[id]/[category]/page'
import WorksurfacesPage from './app/room-builder/edit-room/[id]/[category]/worksurfaces/page'
import BacksplashesPage from './app/room-builder/edit-room/[id]/[category]/backsplashes/page'
import TilesStartPage from './app/room-builder/edit-room/[id]/tiles/start/page'
import CreateTilesPage from './app/room-builder/edit-room/[id]/tiles/create-tiles/page'
import RampsPage from './app/room-builder/edit-room/[id]/tiles/ramps/page'
import TexturesPage from './app/room-builder/edit-room/[id]/textures/page'
import ColorsPage from './app/room-builder/edit-room/[id]/colors/page'
import RoomSettingsPage from './app/room-builder/edit-room/[id]/roomSettings/page'

// New integrated flow pages
import CreateRoomPage from './app/room/create/page'
import RoomViewPage from './app/room/[roomId]/page'
import RoomCeilingDesignPage from './app/room/[roomId]/ceiling-design/page'

// Guards
import { LegacyCeilingRedirect } from './components/guards/RouteGuards'

import { PAGES_PATHS } from './constants/page'

export default function AppRoutes() {
  return useRoutes([
    // ===== HOME =====
    { path: PAGES_PATHS.home, element: <Home /> },
    
    // ===== NEW INTEGRATED FLOW =====
    // These routes enforce: Room must exist before ceiling design
    
    /** Step 1: Create room (project name + dimensions) */
    { path: PAGES_PATHS.roomCreate, element: <CreateRoomPage /> },
    
    /** Step 2: Room overview (shows CTA to ceiling design) */
    { path: '/room/:roomId', element: <RoomViewPage /> },
    
    /** Step 3: Ceiling design (REQUIRES valid roomId) */
    { path: '/room/:roomId/ceiling-design', element: <RoomCeilingDesignPage /> },
    
    // ===== LEGACY ROUTES (backward compatibility) =====
    
    /** Legacy room builder */
    { path: PAGES_PATHS.createRoom, element: <LegacyCreateRoomPage /> },
    
    /** Legacy ceiling route - redirects to new flow */
    { path: PAGES_PATHS.ceiling, element: <LegacyCeilingRedirect /> },
    
    /** Legacy edit room */
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
      ],
    },
    
    // ===== CATCH-ALL =====
    { path: '*', element: <Navigate to="/" replace /> },
  ])
}
