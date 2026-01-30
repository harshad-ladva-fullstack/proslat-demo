/**
 * Left Sidebar
 * 
 * Component library sidebar with tabs for light bars, hubs, and connectors.
 * Professional white theme with clean styling.
 * Supports dynamic width for resize functionality.
 */

import { memo } from 'react'
import { Lightbulb, Zap, Cable, Package } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CeilingDesignerState } from '../../types'
import { ComponentCategory } from '../../types'
import { useCeilingDesignerStore } from '../../store'
import { LEFT_SIDEBAR_WIDTH } from '../../constants'
import { LightBarsTab } from './LightBarsTab'
import { HubsTab } from './HubsTab'
import { ConnectorsTab } from './ConnectorsTab'

// ============================================================================
// TYPES
// ============================================================================

interface LeftSidebarProps {
  width?: number
}

interface TabConfig {
  key: ComponentCategory
  label: string
  icon: React.ReactNode
  Component: React.ComponentType
}

// ============================================================================
// TABS CONFIGURATION
// ============================================================================

const TABS: TabConfig[] = [
  {
    key: ComponentCategory.LIGHT_BARS,
    label: 'Light Bars',
    icon: <Lightbulb className="size-4" />,
    Component: LightBarsTab,
  },
  {
    key: ComponentCategory.HUBS,
    label: 'Hubs',
    icon: <Zap className="size-4" />,
    Component: HubsTab,
  },
  {
    key: ComponentCategory.CONNECTORS,
    label: 'Connectors',
    icon: <Cable className="size-4" />,
    Component: ConnectorsTab,
  },
]

// ============================================================================
// COMPONENT
// ============================================================================

export const LeftSidebar = memo(function LeftSidebar({ width = LEFT_SIDEBAR_WIDTH }: LeftSidebarProps) {
  const activeTab = useCeilingDesignerStore((state: CeilingDesignerState) => state.activeTab)
  const setActiveTab = useCeilingDesignerStore((state: CeilingDesignerState) => state.setActiveTab)

  const activeTabConfig = TABS.find((tab) => tab.key === activeTab)
  const ActiveComponent = activeTabConfig?.Component || LightBarsTab
  
  // Determine if compact mode (for narrow widths)
  const isCompact = width < 200

  return (
    <aside
      className="flex flex-col h-full bg-white border-r border-gray-200 shadow-sm overflow-hidden"
      style={{ width }}
    >
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-white">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-blue-500 rounded-lg flex-shrink-0">
            <Package className="size-4 text-white" />
          </div>
          {!isCompact && (
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-gray-900 truncate">Components</h2>
              <p className="text-xs text-gray-500 truncate">
                Drag to canvas
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex-shrink-0 flex bg-gray-50 border-b border-gray-200">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 px-3 py-2.5',
              'text-sm font-medium transition-all duration-150',
              'border-b-2 -mb-px',
              activeTab === tab.key
                ? 'border-blue-500 text-blue-600 bg-white'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100'
            )}
            title={tab.label}
          >
            {tab.icon}
            {!isCompact && <span className="hidden xl:inline truncate">{tab.label}</span>}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className={cn("flex-1 overflow-y-auto bg-gray-50/50", isCompact ? "p-1" : "p-3")}>
        {!isCompact && <ActiveComponent />}
        {isCompact && (
          <div className="text-center text-xs text-gray-500 p-2">
            Expand to see components
          </div>
        )}
      </div>

      {/* System Stats Footer */}
      <SystemStatsFooter isCompact={isCompact} />
    </aside>
  )
})

// ============================================================================
// SYSTEM STATS FOOTER
// ============================================================================

const SystemStatsFooter = memo(function SystemStatsFooter({ isCompact = false }: { isCompact?: boolean }) {
  const systemStats = useCeilingDesignerStore((state: CeilingDesignerState) => state.systemStats)

  const totalComponents = 
    systemStats.componentCount.lightBars +
    systemStats.componentCount.hubs +
    systemStats.componentCount.connectors

  if (isCompact) {
    return (
      <div className="flex-shrink-0 p-2 border-t border-gray-200 bg-white">
        <div className="flex flex-col items-center gap-1">
          <span className="text-xs font-bold text-gray-900">{totalComponents}</span>
          <span className="text-[10px] text-gray-500">Items</span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-shrink-0 p-3 border-t border-gray-200 bg-white">
      <div className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wider">
        System Summary
      </div>
      <div className="grid grid-cols-2 gap-2">
        <StatItem label="Components" value={totalComponents.toString()} />
        <StatItem label="Watts" value={`${systemStats.totalWatts}W`} />
        <StatItem label="Wire Used" value={`${systemStats.totalWireLength}ft`} />
        <StatItem label="Lumens" value={systemStats.totalLumens.toLocaleString()} />
      </div>
    </div>
  )
})

// ============================================================================
// STAT ITEM
// ============================================================================

interface StatItemProps {
  label: string
  value: string
}

const StatItem = memo(function StatItem({ label, value }: StatItemProps) {
  return (
    <div className="flex items-center justify-between bg-gray-50 rounded-md px-2 py-1.5">
      <span className="text-xs text-gray-500">{label}</span>
      <span className="text-xs text-gray-900 font-semibold">{value}</span>
    </div>
  )
})

export default LeftSidebar
