/**
 * Scene Lighting
 * 
 * Sets up the lighting for the 3D scene.
 */

import { memo } from 'react'
import { AMBIENT_LIGHT_INTENSITY, DIRECTIONAL_LIGHT_INTENSITY } from '../../constants'

// ============================================================================
// COMPONENT
// ============================================================================

export const SceneLighting = memo(function SceneLighting() {
  return (
    <>
      {/* Ambient light for general illumination */}
      <ambientLight intensity={AMBIENT_LIGHT_INTENSITY} color="#ffffff" />

      {/* Main directional light (simulates overhead lighting) */}
      <directionalLight
        position={[10, 20, 10]}
        intensity={DIRECTIONAL_LIGHT_INTENSITY}
        color="#ffffff"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={50}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
      />

      {/* Fill light from opposite side */}
      <directionalLight
        position={[-10, 15, -10]}
        intensity={DIRECTIONAL_LIGHT_INTENSITY * 0.4}
        color="#b3d4ff"
      />

      {/* Subtle rim light */}
      <pointLight
        position={[0, 15, 10]}
        intensity={0.3}
        color="#ffeedd"
        distance={30}
        decay={2}
      />
    </>
  )
})

export default SceneLighting
