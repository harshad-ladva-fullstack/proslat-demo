/**
 * Connection Toast
 * 
 * Toast notification for connection validation messages.
 * Shows success/error messages when connecting components.
 */

import { memo, useEffect } from 'react'
import { X, CheckCircle2, AlertTriangle, Info } from 'lucide-react'
import { cn } from '@/lib/utils'

// ============================================================================
// TYPES
// ============================================================================

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface ToastData {
  id: string
  type: ToastType
  title: string
  message: string
  duration?: number
}

interface ConnectionToastProps {
  toast: ToastData
  onClose: (id: string) => void
}

// ============================================================================
// COMPONENT
// ============================================================================

export const ConnectionToast = memo(function ConnectionToast({ 
  toast, 
  onClose 
}: ConnectionToastProps) {
  const { id, type, title, message, duration = 4000 } = toast

  // Auto-dismiss
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose(id)
      }, duration)
      return () => clearTimeout(timer)
    }
  }, [id, duration, onClose])

  const icons = {
    success: <CheckCircle2 className="size-5 text-green-500" />,
    error: <AlertTriangle className="size-5 text-red-500" />,
    warning: <AlertTriangle className="size-5 text-amber-500" />,
    info: <Info className="size-5 text-blue-500" />,
  }

  const backgrounds = {
    success: 'bg-green-50 border-green-200',
    error: 'bg-red-50 border-red-200',
    warning: 'bg-amber-50 border-amber-200',
    info: 'bg-blue-50 border-blue-200',
  }

  const titleColors = {
    success: 'text-green-800',
    error: 'text-red-800',
    warning: 'text-amber-800',
    info: 'text-blue-800',
  }

  const messageColors = {
    success: 'text-green-600',
    error: 'text-red-600',
    warning: 'text-amber-600',
    info: 'text-blue-600',
  }

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-4 rounded-xl border shadow-lg backdrop-blur-sm',
        'animate-in slide-in-from-top-2 fade-in duration-300',
        backgrounds[type]
      )}
    >
      {icons[type]}
      <div className="flex-1 min-w-0">
        <h4 className={cn('text-sm font-semibold', titleColors[type])}>
          {title}
        </h4>
        <p className={cn('text-xs mt-0.5', messageColors[type])}>
          {message}
        </p>
      </div>
      <button
        onClick={() => onClose(id)}
        className="p-1 rounded-lg hover:bg-black/5 transition-colors"
      >
        <X className="size-4 text-gray-500" />
      </button>
    </div>
  )
})

// ============================================================================
// TOAST CONTAINER
// ============================================================================

interface ToastContainerProps {
  toasts: ToastData[]
  onClose: (id: string) => void
}

export const ToastContainer = memo(function ToastContainer({
  toasts,
  onClose,
}: ToastContainerProps) {
  if (toasts.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {toasts.map((toast) => (
        <ConnectionToast key={toast.id} toast={toast} onClose={onClose} />
      ))}
    </div>
  )
})

export default ConnectionToast
