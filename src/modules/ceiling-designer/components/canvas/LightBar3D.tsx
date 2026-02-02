/**
 * Light Bar 3D Model
 * 
 * Realistic Three.js mesh component for rendering light bar components.
 * Features professional aluminum housing, diffuser lens, LED strip,
 * and colorful RGB lighting with animated glow effects.
 * Supports dragging to reposition on the ceiling.
 */

import { memo, useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Mesh, MeshStandardMaterial } from 'three'
import type { LightBar as LightBarType } from '../../types'
import { LightingMode } from '../../types'
import { CASING_COLOR_VALUES, SELECTION_HIGHLIGHT_COLOR } from '../../constants'
import { useCeilingDesignerStore } from '../../store'

// ============================================================================
// TYPES
// ============================================================================

interface LightBarProps {
  data: LightBarType
}

// ============================================================================
// CONSTANTS
// ============================================================================

const LIGHT_BAR_HEIGHT = 0.15 // Slimmer profile (tripled from 0.06)
const LIGHT_BAR_DEPTH = 0.20 // Wider for better visibility (tripled from 0.08)
const END_CAP_SIZE = 0.05 // (tripled from 0.02)
const MOUNTING_BRACKET_WIDTH = 0.10 // (tripled from 0.04)

// ============================================================================
// COMPONENT
// ============================================================================

export const LightBar3D = memo(function LightBar3D({ data }: LightBarProps) {
  const meshRef = useRef<Mesh>(null)
  const glowRef = useRef<Mesh>(null)
  const diffuserRef = useRef<Mesh>(null)
  const pointLightRef = useRef<any>(null)
  const spotLightRef = useRef<any>(null)
  
  const selectComponent = useCeilingDesignerStore((state) => state.selectComponent)
  const hoverComponent = useCeilingDesignerStore((state) => state.hoverComponent)
  const selectedId = useCeilingDesignerStore((state) => state.selection.selectedComponentId)
  const hoveredId = useCeilingDesignerStore((state) => state.selection.hoveredComponentId)

  const isSelected = selectedId === data.id
  const isHovered = hoveredId === data.id

  // Calculate dimensions based on light bar length
  const lengthInUnits = useMemo(() => {
    // Convert inches to 3D units (1 foot = 1 unit)
    return data.length / 12
  }, [data.length])

  // Material colors - use custom lightColor for RGB mode
  const casingColor = CASING_COLOR_VALUES[data.casingColor]
  const glowColor = useMemo(() => {
    if (data.lightingMode === LightingMode.RGB) {
      return data.lightColor || '#ff00ff'
    }
    return '#ffffff'
  }, [data.lightingMode, data.lightColor])

  // Parse color for animation
  const animationSpeed = data.animationSpeed || 1

  // Animation for glow effect with colorful pulsing
  useFrame((state) => {
    if (glowRef.current) {
      const material = glowRef.current.material as MeshStandardMaterial
      
      if (data.lightingMode === LightingMode.RGB && animationSpeed > 0) {
        // Pulsing glow animation for RGB mode
        const time = state.clock.elapsedTime * animationSpeed
        const pulseIntensity = 0.7 + Math.sin(time * 2) * 0.3
        
        material.emissiveIntensity = pulseIntensity
        
        // Update lights for dynamic lighting
        if (pointLightRef.current) {
          pointLightRef.current.intensity = pulseIntensity * 3
        }
        if (spotLightRef.current) {
          spotLightRef.current.intensity = pulseIntensity * 2
        }
      } else {
        // Subtle breathing for white mode
        const intensity = 0.6 + Math.sin(state.clock.elapsedTime * 1.5) * 0.1
        material.emissiveIntensity = intensity
        
        if (pointLightRef.current) {
          pointLightRef.current.intensity = intensity * 2
        }
        if (spotLightRef.current) {
          spotLightRef.current.intensity = intensity * 1.5
        }
      }
    }
    
    // Diffuser glow animation
    if (diffuserRef.current) {
      const material = diffuserRef.current.material as MeshStandardMaterial
      const time = state.clock.elapsedTime
      material.opacity = 0.85 + Math.sin(time * 2) * 0.1
    }
  })

  const handleClick = (e: any) => {
    e.stopPropagation()
    selectComponent(data.id)
  }

  const handlePointerOver = (e: any) => {
    e.stopPropagation()
    hoverComponent(data.id)
    document.body.style.cursor = 'pointer'
  }

  const handlePointerOut = () => {
    hoverComponent(null)
    document.body.style.cursor = 'auto'
  }

  return (
    <group
      position={[data.position.x, data.position.y, data.position.z]}
      rotation={[data.rotation.x, data.rotation.y, data.rotation.z]}
    >
      {/* ===== LIGHTS FOR ILLUMINATION ===== */}
      
      {/* Main point light for area illumination */}
      <pointLight
        ref={pointLightRef}
        position={[0, -LIGHT_BAR_HEIGHT - 0.15, 0]}
        color={glowColor}
        intensity={2}
        distance={4}
        decay={2}
        castShadow
      />
      
      {/* Spot light for focused beam effect */}
      <spotLight
        ref={spotLightRef}
        position={[0, -LIGHT_BAR_HEIGHT - 0.05, 0]}
        target-position={[0, -2, 0]}
        color={glowColor}
        intensity={1.5}
        distance={5}
        angle={Math.PI / 4}
        penumbra={0.5}
        decay={2}
      />
      
      {/* ===== ALUMINUM HOUSING ===== */}
      
      {/* Main extruded aluminum body */}
      <mesh
        ref={meshRef}
        onClick={handleClick}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        onPointerDown={(e) => e.stopPropagation()}
        onPointerMove={(e) => e.stopPropagation()}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[lengthInUnits, LIGHT_BAR_HEIGHT, LIGHT_BAR_DEPTH]} />
        <meshStandardMaterial
          color={casingColor}
          metalness={0.7}
          roughness={0.3}
        />
      </mesh>
      
      {/* Top channel groove detail */}
      <mesh position={[0, LIGHT_BAR_HEIGHT / 2 + 0.002, 0]}>
        <boxGeometry args={[lengthInUnits * 0.95, 0.005, LIGHT_BAR_DEPTH * 0.6]} />
        <meshStandardMaterial color={casingColor} metalness={0.8} roughness={0.2} />
      </mesh>
      
      {/* Side fins for heat dissipation */}
      {[-1, 1].map((side) => (
        <mesh key={side} position={[0, 0, side * (LIGHT_BAR_DEPTH / 2 + 0.003)]}>
          <boxGeometry args={[lengthInUnits, LIGHT_BAR_HEIGHT * 0.7, 0.006]} />
          <meshStandardMaterial color={casingColor} metalness={0.6} roughness={0.4} />
        </mesh>
      ))}
      
      {/* ===== END CAPS ===== */}
      {[-1, 1].map((side) => (
        <mesh 
          key={`cap-${side}`} 
          position={[side * (lengthInUnits / 2 + END_CAP_SIZE / 2), 0, 0]}
          castShadow
        >
          <boxGeometry args={[END_CAP_SIZE, LIGHT_BAR_HEIGHT + 0.01, LIGHT_BAR_DEPTH + 0.01]} />
          <meshStandardMaterial 
            color={casingColor} 
            metalness={0.5} 
            roughness={0.5} 
          />
        </mesh>
      ))}
      
      {/* ===== MOUNTING BRACKETS ===== */}
      {[-0.3, 0.3].map((pos) => (
        <group key={`bracket-${pos}`} position={[lengthInUnits * pos, LIGHT_BAR_HEIGHT / 2 + 0.015, 0]}>
          {/* Bracket base */}
          <mesh>
            <boxGeometry args={[MOUNTING_BRACKET_WIDTH, 0.015, LIGHT_BAR_DEPTH * 0.4]} />
            <meshStandardMaterial color="#6b7280" metalness={0.8} roughness={0.3} />
          </mesh>
          {/* Mounting hole */}
          <mesh position={[0, 0.008, 0]}>
            <cylinderGeometry args={[0.005, 0.005, 0.003, 12]} />
            <meshStandardMaterial color="#1f2937" metalness={0.9} roughness={0.2} />
          </mesh>
        </group>
      ))}
      
      {/* ===== DIFFUSER LENS ===== */}
      <mesh 
        ref={diffuserRef}
        position={[0, -LIGHT_BAR_HEIGHT / 2 - 0.008, 0]}
      >
        <boxGeometry args={[lengthInUnits * 0.92, 0.015, LIGHT_BAR_DEPTH * 0.75]} />
        <meshPhysicalMaterial
          color="#ffffff"
          transparent
          opacity={0.85}
          transmission={0.3}
          roughness={0.1}
          metalness={0}
          clearcoat={0.5}
          clearcoatRoughness={0.2}
        />
      </mesh>
      
      {/* ===== LED STRIP (internal glow source) ===== */}
      <mesh ref={glowRef} position={[0, -LIGHT_BAR_HEIGHT / 2 - 0.002, 0]}>
        <boxGeometry args={[lengthInUnits * 0.88, 0.008, LIGHT_BAR_DEPTH * 0.5]} />
        <meshStandardMaterial
          color={glowColor}
          emissive={glowColor}
          emissiveIntensity={0.8}
          toneMapped={false}
        />
      </mesh>
      
      {/* Individual LED dots visualization */}
      {Array.from({ length: Math.floor(lengthInUnits * 8) }).map((_, i) => {
        const xPos = -lengthInUnits * 0.42 + (i * lengthInUnits * 0.88) / Math.max(1, Math.floor(lengthInUnits * 8) - 1)
        return (
          <mesh key={`led-${i}`} position={[xPos, -LIGHT_BAR_HEIGHT / 2 - 0.005, 0]}>
            <boxGeometry args={[0.015, 0.004, 0.015]} />
            <meshStandardMaterial
              color={glowColor}
              emissive={glowColor}
              emissiveIntensity={1.2}
              toneMapped={false}
            />
          </mesh>
        )
      })}
      
      {/* ===== OUTER GLOW HALO (RGB MODE) ===== */}
      {data.lightingMode === LightingMode.RGB && (
        <>
          {/* Primary glow */}
          <mesh position={[0, -LIGHT_BAR_HEIGHT / 2 - 0.025, 0]}>
            <boxGeometry args={[lengthInUnits * 1.05, 0.04, LIGHT_BAR_DEPTH * 1.1]} />
            <meshBasicMaterial
              color={glowColor}
              transparent
              opacity={0.25}
              depthWrite={false}
            />
          </mesh>
          {/* Secondary glow - softer spread */}
          <mesh position={[0, -LIGHT_BAR_HEIGHT / 2 - 0.04, 0]}>
            <boxGeometry args={[lengthInUnits * 1.15, 0.06, LIGHT_BAR_DEPTH * 1.3]} />
            <meshBasicMaterial
              color={glowColor}
              transparent
              opacity={0.12}
              depthWrite={false}
            />
          </mesh>
        </>
      )}

      {/* ===== SELECTION OUTLINE ===== */}
      {(isSelected || isHovered) && (
        <mesh>
          <boxGeometry
            args={[
              lengthInUnits + 0.06,
              LIGHT_BAR_HEIGHT + 0.04,
              LIGHT_BAR_DEPTH + 0.04,
            ]}
          />
          <meshBasicMaterial
            color={isSelected ? SELECTION_HIGHLIGHT_COLOR : '#60a5fa'}
            transparent
            opacity={0.35}
            depthWrite={false}
          />
        </mesh>
      )}

      {/* ===== CONNECTION PORTS ===== */}
      {[-1, 1].map((side) => (
        <group key={`port-${side}`} position={[side * (lengthInUnits / 2 + END_CAP_SIZE + 0.01), 0, 0]}>
          {/* Port connector housing */}
          <mesh>
            <cylinderGeometry args={[0.02, 0.025, 0.025, 16]} />
            <meshStandardMaterial color="#374151" metalness={0.7} roughness={0.3} />
          </mesh>
          {/* Port indicator LED */}
          <mesh position={[side * 0.01, 0, 0]}>
            <sphereGeometry args={[0.008, 12, 12]} />
            <meshStandardMaterial 
              color="#22c55e" 
              emissive="#22c55e"
              emissiveIntensity={0.5}
              metalness={0.3} 
              roughness={0.5} 
            />
          </mesh>
        </group>
      ))}
      
      {/* ===== WIRE/CABLE ===== */}
      <mesh position={[lengthInUnits / 2 + END_CAP_SIZE + 0.08, 0, 0]}>
        <cylinderGeometry args={[0.008, 0.008, 0.12, 8]} />
        <meshStandardMaterial color="#1f2937" roughness={0.9} />
      </mesh>
    </group>
  )
})

export default LightBar3D
