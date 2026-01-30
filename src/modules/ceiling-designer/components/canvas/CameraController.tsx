/**
 * Camera Controller
 * 
 * Handles camera positioning and transitions between views.
 * Disables orbit controls when dragging placed components.
 */

import { memo, useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { useCanvas, useCeilingDesignerStore } from '../../store'
import { CAMERA_PRESETS } from '../../constants'
import type { CeilingDesignerState } from '../../types'

// ============================================================================
// COMPONENT
// ============================================================================

export const CameraController = memo(function CameraController() {
  const { camera } = useThree()
  const canvas = useCanvas()
  
  // Check if a placed component is being dragged
  const isDraggingPlacedComponent = useCeilingDesignerStore(
    (state: CeilingDesignerState) => state.isDraggingPlacedComponent
  )

  // Update camera position when view changes
  useEffect(() => {
    const preset = CAMERA_PRESETS[canvas.cameraView]
    if (preset) {
      camera.position.set(preset.position.x, preset.position.y, preset.position.z)
      camera.lookAt(preset.target.x, preset.target.y, preset.target.z)
    }
  }, [canvas.cameraView, camera])

  return (
    <OrbitControls
      makeDefault
      enableDamping
      dampingFactor={0.1}
      rotateSpeed={0.5}
      panSpeed={0.5}
      zoomSpeed={0.8}
      minDistance={5}
      maxDistance={50}
      maxPolarAngle={Math.PI * 0.85}
      target={[0, 5, 0]}
      enabled={!isDraggingPlacedComponent}
    />
  )
})

export default CameraController
