/**
 * Room View Page
 * 
 * Shows room details and provides navigation to ceiling design.
 * This is the step between room creation and ceiling design.
 * 
 * FLOW:
 * /room/create → /room/:roomId → /room/:roomId/ceiling-design
 */

import { memo, useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  Home,
  Lightbulb,
  Settings,
  Ruler,
  Box,
  ArrowRight,
  AlertTriangle,
  Edit3,
  Trash2,
} from 'lucide-react'
import { RequireRoomGuard } from '@/components/guards/RouteGuards'
import { useProjectStore, useCurrentRoom, useCurrentProject } from '@/store/useProjectStore'
import { PAGES_PATHS, getCeilingDesignPath } from '@/constants/page'

// ============================================================================
// STAT CARD
// ============================================================================

interface StatCardProps {
  icon: React.ReactNode
  label: string
  value: string | number
  unit?: string
}

const StatCard = memo(function StatCard({ icon, label, value, unit }: StatCardProps) {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-gray-100 rounded-lg">
          {icon}
        </div>
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-lg font-semibold text-gray-900">
            {value}
            {unit && <span className="text-sm text-gray-400 ml-1">{unit}</span>}
          </p>
        </div>
      </div>
    </div>
  )
})

// ============================================================================
// MAIN CONTENT
// ============================================================================

const RoomViewContent = memo(function RoomViewContent() {
  const { roomId } = useParams<{ roomId: string }>()
  const navigate = useNavigate()
  
  const currentRoom = useCurrentRoom()
  const currentProject = useCurrentProject()
  const loadProject = useProjectStore((state) => state.loadProject)
  const savedProjects = useProjectStore((state) => state.savedProjects)
  const savedRooms = useProjectStore((state) => state.savedRooms)
  
  const [isLoading, setIsLoading] = useState(true)
  
  // Load project if needed
  useEffect(() => {
    if (!currentRoom && roomId) {
      const room = savedRooms[roomId]
      if (room) {
        const project = savedProjects.find((p) => p.roomId === roomId)
        if (project) {
          loadProject(project.id)
        }
      }
    }
    setIsLoading(false)
  }, [roomId, currentRoom, savedRooms, savedProjects, loadProject])
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }
  
  if (!currentRoom) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center max-w-md p-8">
          <AlertTriangle className="size-12 text-amber-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Room Not Found</h2>
          <p className="text-gray-600 mb-4">
            The room you're looking for doesn't exist or has been deleted.
          </p>
          <Link
            to={PAGES_PATHS.roomCreate}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Create New Room
          </Link>
        </div>
      </div>
    )
  }
  
  const { width, depth, height } = currentRoom.dimensions
  const ceilingArea = width * depth
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                to={PAGES_PATHS.home}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <Home className="size-4" />
                <span className="text-sm">Projects</span>
              </Link>
              <div className="h-6 w-px bg-gray-200" />
              <div>
                <h1 className="text-lg font-semibold text-gray-900">
                  {currentProject?.name ?? 'My Room'}
                </h1>
                <p className="text-sm text-gray-500">Room Overview</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                title="Edit Room"
              >
                <Edit3 className="size-4" />
              </button>
              <button
                className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Delete Room"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          </div>
        </div>
      </header>
      
      {/* Main content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Room dimensions */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Ruler className="size-5 text-gray-400" />
            Room Dimensions
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              icon={<Ruler className="size-4 text-blue-500" />}
              label="Width"
              value={width}
              unit="ft"
            />
            <StatCard
              icon={<Ruler className="size-4 text-blue-500 rotate-90" />}
              label="Depth"
              value={depth}
              unit="ft"
            />
            <StatCard
              icon={<Box className="size-4 text-blue-500" />}
              label="Height"
              value={height}
              unit="ft"
            />
            <StatCard
              icon={<Box className="size-4 text-green-500" />}
              label="Ceiling Area"
              value={ceilingArea.toLocaleString()}
              unit="sq ft"
            />
          </div>
        </section>
        
        {/* Ceiling Design CTA */}
        <section className="mb-8">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-6 text-white">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <Lightbulb className="size-6" />
                  </div>
                  <h3 className="text-xl font-bold">Design Ceiling Lighting</h3>
                </div>
                <p className="text-blue-100 mb-4 max-w-md">
                  Create your custom ceiling lighting configuration. Add hubs, 
                  light bars, and connectors within your {width}×{depth} ft ceiling space.
                </p>
                <button
                  onClick={() => navigate(getCeilingDesignPath(currentRoom.id))}
                  className="inline-flex items-center gap-2 px-5 py-3 bg-white text-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
                >
                  <Lightbulb className="size-5" />
                  Open Ceiling Designer
                  <ArrowRight className="size-4" />
                </button>
              </div>
              
              {/* Visual preview placeholder */}
              <div className="hidden md:block w-32 h-32 bg-white/10 rounded-xl flex items-center justify-center">
                <div className="text-center">
                  <div className="w-16 h-16 border-2 border-white/30 rounded-lg mx-auto mb-2" />
                  <p className="text-xs text-blue-200">{width}' × {depth}'</p>
                </div>
              </div>
            </div>
          </div>
        </section>
        
        {/* Info cards */}
        <section className="grid md:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
            <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
              <Settings className="size-4 text-gray-400" />
              Constraint-Driven Design
            </h4>
            <p className="text-sm text-gray-600">
              Components connect through ports. No free placement—every light bar 
              and connector must attach to an existing component.
            </p>
          </div>
          
          <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
            <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
              <Box className="size-4 text-gray-400" />
              Bounded to Room
            </h4>
            <p className="text-sm text-gray-600">
              Your ceiling design is limited to the room boundaries. 
              Components cannot extend beyond the {width}×{depth} ft ceiling area.
            </p>
          </div>
        </section>
      </main>
    </div>
  )
})

// ============================================================================
// PAGE EXPORT
// ============================================================================

export const RoomViewPage = memo(function RoomViewPage() {
  return (
    <RequireRoomGuard>
      <RoomViewContent />
    </RequireRoomGuard>
  )
})

export default RoomViewPage
