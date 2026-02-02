/**
 * Ceiling Header
 * 
 * Navigation header for the ceiling designer page.
 */

import { memo } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { PAGES_PATHS } from '@/constants/page'

// ============================================================================
// TYPES
// ============================================================================

interface NavItem {
  label: string
  path: string
  isActive?: boolean
}

// ============================================================================
// COMPONENT
// ============================================================================

export const CeilingHeader = memo(function CeilingHeader() {
  const location = useLocation()

  const navItems: NavItem[] = [
    { label: 'Cabinets', path: '#cabinets' },
    { label: 'Toolboxes', path: '#toolboxes' },
    { label: 'Floor', path: '#floor' },
    { label: 'Ceiling', path: PAGES_PATHS.ceiling },
    { label: 'Full Designer', path: '#full-designer' },
  ]

  return (
    <nav className="flex items-center gap-6">
      {navItems.map((item) => {
        const isActive =
          item.path === PAGES_PATHS.ceiling
            ? location.pathname === PAGES_PATHS.ceiling
            : false

        return (
          <Link
            key={item.label}
            to={item.path}
            className={cn(
              'px-4 py-2 text-sm font-medium rounded-lg transition-colors',
              isActive
                ? 'bg-blue-600 text-white'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            )}
          >
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
})

export default CeilingHeader
