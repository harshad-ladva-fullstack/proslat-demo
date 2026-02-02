/**
 * Create Room Page
 * 
 * First step in the design flow.
 * User MUST create a room before accessing ceiling design.
 * 
 * FLOW:
 * 1. User enters project name
 * 2. User sets room dimensions
 * 3. Room is saved
 * 4. User can proceed to ceiling design
 */

import { memo, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Ruler,
  ArrowRight,
  AlertCircle,
  CheckCircle,
  Lightbulb,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useProjectStore } from '@/store/useProjectStore'
import {
  MIN_ROOM_DIMENSIONS,
  MAX_ROOM_DIMENSIONS,
  validateRoomDimensions,
  type RoomDimensions,
} from '@/types/room'
import { validateProjectName } from '@/types/project-types'
import { getCeilingDesignPath } from '@/constants/page'

// ============================================================================
// DIMENSION INPUT
// ============================================================================

interface DimensionInputProps {
  label: string
  value: number
  onChange: (value: number) => void
  min: number
  max: number
  unit: string
  icon: React.ReactNode
}

const DimensionInput = memo(function DimensionInput({
  label,
  value,
  onChange,
  min,
  max,
  unit,
  icon,
}: DimensionInputProps) {
  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
        {icon}
        {label}
      </label>
      <div className="flex items-center gap-2">
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
        />
        <div className="flex items-center gap-1 min-w-[80px]">
          <input
            type="number"
            min={min}
            max={max}
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            className="w-16 px-2 py-1 text-sm text-center border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <span className="text-sm text-gray-500">{unit}</span>
        </div>
      </div>
    </div>
  )
})

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const CreateRoomPage = memo(function CreateRoomPage() {
  const navigate = useNavigate()
  
  // Project store actions
  const createNewProject = useProjectStore((state) => state.createNewProject)
  const createRoom = useProjectStore((state) => state.createRoom)
  
  // Form state
  const [projectName, setProjectName] = useState('')
  const [dimensions, setDimensions] = useState<RoomDimensions>({
    width: 20,
    depth: 20,
    height: 10,
    wallThickness: 0.5,
  })
  
  // UI state
  const [step, setStep] = useState<'name' | 'dimensions'>('name')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Validation
  const nameValidation = validateProjectName(projectName)
  const dimensionValidation = validateRoomDimensions(dimensions)
  
  // Handle project name submission
  const handleNameSubmit = useCallback(() => {
    setError(null)
    
    if (!nameValidation.valid) {
      setError(nameValidation.error ?? 'Invalid project name')
      return
    }
    
    setStep('dimensions')
  }, [nameValidation])
  
  // Handle final submission - create project and room
  const handleCreateRoom = useCallback(async () => {
    setError(null)
    setIsSubmitting(true)
    
    try {
      // Create project
      const projectResult = createNewProject(projectName.trim())
      if (!projectResult.success) {
        setError(projectResult.error ?? 'Failed to create project')
        return
      }
      
      // Create room
      const roomResult = createRoom(dimensions)
      if (!roomResult.success) {
        setError(roomResult.error ?? 'Failed to create room')
        return
      }
      
      // Navigate to ceiling design
      if (roomResult.roomId) {
        navigate(getCeilingDesignPath(roomResult.roomId))
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }, [projectName, dimensions, createNewProject, createRoom, navigate])
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-8 text-white">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-white/20 rounded-lg">
                <Box className="size-6" />
              </div>
              <h1 className="text-2xl font-bold">Create Your Room</h1>
            </div>
            <p className="text-blue-100 text-sm">
              Define your room dimensions to start designing ceiling lighting
            </p>
          </div>
          
          {/* Progress indicator */}
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <div className="flex items-center gap-4">
              <div className={cn(
                "flex items-center gap-2",
                step === 'name' ? 'text-blue-600' : 'text-green-600'
              )}>
                <div className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                  step === 'name' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'
                )}>
                  {step === 'name' ? '1' : <CheckCircle className="size-4" />}
                </div>
                <span className="text-sm font-medium">Project Name</span>
              </div>
              
              <div className="flex-1 h-px bg-gray-300" />
              
              <div className={cn(
                "flex items-center gap-2",
                step === 'dimensions' ? 'text-blue-600' : 'text-gray-400'
              )}>
                <div className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                  step === 'dimensions' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'
                )}>
                  2
                </div>
                <span className="text-sm font-medium">Room Dimensions</span>
              </div>
            </div>
          </div>
          
          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Error display */}
            {error && (
              <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="size-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}
            
            {/* Step 1: Project Name */}
            {step === 'name' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Project Name
                  </label>
                  <input
                    type="text"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="e.g., Kitchen Remodel, Garage Lighting"
                    className={cn(
                      "w-full px-4 py-3 border rounded-lg text-gray-900 placeholder-gray-400",
                      "focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
                      !nameValidation.valid && projectName.length > 0
                        ? 'border-red-300'
                        : 'border-gray-300'
                    )}
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && handleNameSubmit()}
                  />
                  {!nameValidation.valid && projectName.length > 0 && (
                    <p className="text-sm text-red-500">{nameValidation.error}</p>
                  )}
                </div>
                
                <button
                  onClick={handleNameSubmit}
                  disabled={!nameValidation.valid}
                  className={cn(
                    "w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors",
                    nameValidation.valid
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  )}
                >
                  Continue
                  <ArrowRight className="size-4" />
                </button>
              </div>
            )}
            
            {/* Step 2: Room Dimensions */}
            {step === 'dimensions' && (
              <div className="space-y-6">
                <DimensionInput
                  label="Room Width"
                  value={dimensions.width}
                  onChange={(width) => setDimensions((d) => ({ ...d, width }))}
                  min={MIN_ROOM_DIMENSIONS.width}
                  max={MAX_ROOM_DIMENSIONS.width}
                  unit="ft"
                  icon={<Ruler className="size-4 text-gray-400" />}
                />
                
                <DimensionInput
                  label="Room Depth"
                  value={dimensions.depth}
                  onChange={(depth) => setDimensions((d) => ({ ...d, depth }))}
                  min={MIN_ROOM_DIMENSIONS.depth}
                  max={MAX_ROOM_DIMENSIONS.depth}
                  unit="ft"
                  icon={<Ruler className="size-4 text-gray-400 rotate-90" />}
                />
                
                <DimensionInput
                  label="Ceiling Height"
                  value={dimensions.height}
                  onChange={(height) => setDimensions((d) => ({ ...d, height }))}
                  min={MIN_ROOM_DIMENSIONS.height}
                  max={MAX_ROOM_DIMENSIONS.height}
                  unit="ft"
                  icon={<Box className="size-4 text-gray-400" />}
                />
                
                {/* Dimension errors */}
                {!dimensionValidation.valid && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <ul className="text-sm text-amber-700 space-y-1">
                      {dimensionValidation.errors.map((err, i) => (
                        <li key={i}>• {err}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {/* Preview */}
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-start gap-3">
                    <Lightbulb className="size-5 text-blue-500 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-700">
                      <p className="font-medium mb-1">Ceiling Area Preview</p>
                      <p>
                        Your ceiling will be{' '}
                        <span className="font-bold">{dimensions.width} × {dimensions.depth}</span> feet
                        ({(dimensions.width * dimensions.depth).toLocaleString()} sq ft).
                      </p>
                      <p className="mt-1 text-blue-600">
                        All lighting components must fit within this area.
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    onClick={() => setStep('name')}
                    className="px-4 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Back
                  </button>
                  
                  <button
                    onClick={handleCreateRoom}
                    disabled={!dimensionValidation.valid || isSubmitting}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors",
                      dimensionValidation.valid && !isSubmitting
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    )}
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Lightbulb className="size-4" />
                        Design Ceiling Lighting
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Footer info */}
        <p className="text-center text-sm text-gray-500 mt-4">
          You'll be able to design your ceiling lighting after creating the room.
        </p>
      </div>
    </div>
  )
})

export default CreateRoomPage
