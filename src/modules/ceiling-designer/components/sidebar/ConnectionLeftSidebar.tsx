/**
 * Connection-Based Left Sidebar
 * 
 * Component library sidebar for the constraint-driven configurator.
 * 
 * KEY DIFFERENCES:
 * - Shows instruction banner about connection-based placement
 * - Shows warning if no hub is placed yet
 * - Uses connection graph store
 */

import { memo } from 'react'
import { Lightbulb, Zap, Cable, Package, AlertCircle, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ComponentCategory } from '../../types'
import { useCeilingDesignerStore } from '../../store'
import { useConnectionGraphStore } from '../../store/connection-graph-store'
import { LEFT_SIDEBAR_WIDTH } from '../../constants'
import { LightBarsTab } from './LightBarsTab'
import { HubsTab } from './HubsTab'
import { ConnectorsTab } from './ConnectorsTab'
import { WireLengthStatusDisplay, SystemStatsDisplay } from '../ui/MeasurementDisplay'

// ============================================================================
// TYPES
// ============================================================================

interface ConnectionLeftSidebarProps {
  width?: number
}

interface TabConfig {
  key: ComponentCategory
  label: string
  icon: React.ReactNode
  Component: React.ComponentType
  requiresHub: boolean
}

// ============================================================================
// TABS CONFIGURATION
// ============================================================================

const TABS: TabConfig[] = [
  {
    key: ComponentCategory.HUBS,
    label: 'Hubs',
    icon: <Zap className="size-4" />,
    Component: HubsTab,
    requiresHub: false, // Hubs can always be dragged
  },
  {
    key: ComponentCategory.LIGHT_BARS,
    label: 'Light Bars',
    icon: <Lightbulb className="size-4" />,
    Component: LightBarsTab,
    requiresHub: true,
  },
  {
    key: ComponentCategory.CONNECTORS,
    label: 'Connectors',
    icon: <Cable className="size-4" />,
    Component: ConnectorsTab,
    requiresHub: true,
  },
]

// ============================================================================
// INSTRUCTION BANNER (Compact)
// ============================================================================

const InstructionBanner = memo(function InstructionBanner() {
  const rootHubId = useConnectionGraphStore((state) => state.rootHubId)
  
  if (rootHubId === null) {
    return (
      <div className="mx-2 mb-2 px-2 py-1.5 bg-amber-50 border border-amber-200 rounded-md">
        <div className="flex items-center gap-1.5">
          <AlertCircle className="size-4 text-amber-500 flex-shrink-0" />
          <p className="text-xs font-medium text-amber-700">Drag a Hub to start</p>
        </div>
      </div>
    )
  }
  
  return (
    <div className="mx-2 mb-2 px-2 py-1.5 bg-blue-50 border border-blue-200 rounded-md">
      <div className="flex items-center gap-1.5">
        <Info className="size-4 text-blue-500 flex-shrink-0" />
        <p className="text-xs text-blue-700">Drag to green ports to connect</p>
      </div>
    </div>
  )
})

// ============================================================================
// COMPONENT
// ============================================================================

export const ConnectionLeftSidebar = memo(function ConnectionLeftSidebar({ 
  width = LEFT_SIDEBAR_WIDTH 
}: ConnectionLeftSidebarProps) {
  const activeTab = useCeilingDesignerStore((state) => state.activeTab)
  const setActiveTab = useCeilingDesignerStore((state) => state.setActiveTab)
  const rootHubId = useConnectionGraphStore((state) => state.rootHubId)
  
  const activeTabConfig = TABS.find((tab) => tab.key === activeTab)
  const ActiveComponent = activeTabConfig?.Component || HubsTab
  const tabRequiresHub = activeTabConfig?.requiresHub ?? false
  
  // Determine if compact mode (for narrow widths)
  const isCompact = width < 200
  
  // If hub not placed and tab requires hub, show hubs tab instead
  const showHubsFirst = rootHubId === null && tabRequiresHub

  return (
    <aside
      className="flex flex-col h-full bg-white border-r border-gray-200 shadow-sm overflow-hidden"
      style={{ width }}
    >
      {/* Header with Wire Length Status */}
      <div className="flex-shrink-0 px-3 py-2 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1 bg-blue-500 rounded flex-shrink-0">
              <Package className="size-3.5 text-white" />
            </div>
            {!isCompact && (
              <h2 className="text-sm font-semibold text-gray-900">Components</h2>
            )}
          </div>
          {/* Wire Length in Header */}
          {!isCompact && rootHubId !== null && (
            <WireLengthStatusDisplay compact />
          )}
        </div>
      </div>

      {/* Instruction Banner (Compact) */}
      {!isCompact && <InstructionBanner />}

      {/* Tabs */}
      <div className="flex-shrink-0 flex bg-gray-50 border-b border-gray-200">
        {TABS.map((tab) => {
          const isDisabled = rootHubId === null && tab.requiresHub
          
          return (
            <button
              key={tab.key}
              onClick={() => !isDisabled && setActiveTab(tab.key)}
              disabled={isDisabled}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 px-3 py-2',
                'text-sm font-medium transition-all duration-150',
                'border-b-2 -mb-px',
                activeTab === tab.key && !isDisabled
                  ? 'border-blue-500 text-blue-600 bg-white'
                  : isDisabled
                  ? 'border-transparent text-gray-300 cursor-not-allowed'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              )}
              title={isDisabled ? 'Place a Hub first' : tab.label}
            >
              {tab.icon}
              {!isCompact && <span className="hidden xl:inline truncate">{tab.label}</span>}
            </button>
          )
        })}
      </div>

      {/* Tab Content - Larger area for components */}
      <div className={cn("flex-1 overflow-y-auto bg-gray-50/50", isCompact ? "p-1" : "p-2")}>
        {!isCompact && (
          showHubsFirst ? <HubsTab /> : <ActiveComponent />
        )}
        {isCompact && (
          <div className="text-center text-xs text-gray-500 p-2">
            Expand to see components
          </div>
        )}
      </div>

      {/* System Stats Footer - Compact */}
      {!isCompact && rootHubId !== null && (
        <div className="flex-shrink-0 px-2 py-2 border-t border-gray-200 bg-white">
          <SystemStatsDisplay compact />
        </div>
      )}
    </aside>
  )
})

export default ConnectionLeftSidebar
