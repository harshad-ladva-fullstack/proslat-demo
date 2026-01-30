/**
 * Garage Room
 * 
 * Realistic 3D garage environment with a parked car.
 * Transparent side walls for better visibility.
 * Includes detailed car, tools, and garage equipment.
 */

import { memo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Mesh } from 'three'
import { ROOM_DIMENSIONS } from '../../constants'

// ============================================================================
// CONSTANTS
// ============================================================================

const WALL_THICKNESS = 0.08
const BACK_WALL_COLOR = '#f3f4f6' // Light gray for back wall
const SIDE_WALL_COLOR = '#e0f2fe' // Very light blue tint for transparent walls
const FLOOR_COLOR = '#d1d5db' // Light concrete gray floor

// ============================================================================
// REALISTIC CAR COMPONENT
// ============================================================================

const RealisticCar = memo(function RealisticCar() {
  // Car dimensions (scaled to fit garage - realistic sedan proportions)
  const carLength = 4.8
  const carWidth = 2.0
  const bodyHeight = 0.45
  const cabinHeight = 0.55
  const wheelRadius = 0.38
  const wheelWidth = 0.28
  
  return (
    <group position={[0, 0, 1.5]} rotation={[0, 0, 0]}>
      {/* ===== MAIN BODY ===== */}
      
      {/* Underbody / Chassis */}
      <mesh position={[0, 0.2, 0]} castShadow receiveShadow>
        <boxGeometry args={[carLength * 0.9, 0.15, carWidth * 0.85]} />
        <meshStandardMaterial color="#0a0a0a" metalness={0.3} roughness={0.8} />
      </mesh>
      
      {/* Lower body - main section */}
      <mesh position={[0, 0.45, 0]} castShadow receiveShadow>
        <boxGeometry args={[carLength, bodyHeight, carWidth]} />
        <meshStandardMaterial color="#1e40af" metalness={0.85} roughness={0.15} />
      </mesh>
      
      {/* Front bumper */}
      <mesh position={[-carLength / 2 + 0.15, 0.32, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.35, 0.28, carWidth * 1.02]} />
        <meshStandardMaterial color="#1e3a8a" metalness={0.7} roughness={0.25} />
      </mesh>
      
      {/* Rear bumper */}
      <mesh position={[carLength / 2 - 0.15, 0.32, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.35, 0.28, carWidth * 1.02]} />
        <meshStandardMaterial color="#1e3a8a" metalness={0.7} roughness={0.25} />
      </mesh>
      
      {/* Hood (front) - slightly angled */}
      <mesh position={[-carLength * 0.28, 0.72, 0]} rotation={[0, 0, 0.08]} castShadow receiveShadow>
        <boxGeometry args={[carLength * 0.38, 0.06, carWidth * 0.95]} />
        <meshStandardMaterial color="#1e40af" metalness={0.9} roughness={0.1} />
      </mesh>
      
      {/* Trunk (rear) */}
      <mesh position={[carLength * 0.32, 0.7, 0]} rotation={[0, 0, -0.05]} castShadow receiveShadow>
        <boxGeometry args={[carLength * 0.28, 0.06, carWidth * 0.92]} />
        <meshStandardMaterial color="#1e40af" metalness={0.9} roughness={0.1} />
      </mesh>
      
      {/* ===== CABIN ===== */}
      
      {/* Cabin base */}
      <mesh position={[0.15, 0.85, 0]} castShadow receiveShadow>
        <boxGeometry args={[carLength * 0.45, cabinHeight * 0.85, carWidth * 0.92]} />
        <meshStandardMaterial color="#1e40af" metalness={0.85} roughness={0.15} />
      </mesh>
      
      {/* Roof */}
      <mesh position={[0.15, 1.18, 0]} castShadow receiveShadow>
        <boxGeometry args={[carLength * 0.4, 0.08, carWidth * 0.88]} />
        <meshStandardMaterial color="#1e40af" metalness={0.9} roughness={0.1} />
      </mesh>
      
      {/* ===== WINDOWS ===== */}
      
      {/* Windshield (front) */}
      <mesh position={[-0.65, 0.92, 0]} rotation={[0, 0, -0.45]} castShadow>
        <boxGeometry args={[0.04, cabinHeight * 0.75, carWidth * 0.85]} />
        <meshPhysicalMaterial 
          color="#1a365d" 
          metalness={0.1} 
          roughness={0.05} 
          transparent 
          opacity={0.6}
          reflectivity={0.9}
        />
      </mesh>
      
      {/* Rear window */}
      <mesh position={[0.95, 0.92, 0]} rotation={[0, 0, 0.4]} castShadow>
        <boxGeometry args={[0.04, cabinHeight * 0.7, carWidth * 0.82]} />
        <meshPhysicalMaterial 
          color="#1a365d" 
          metalness={0.1} 
          roughness={0.05} 
          transparent 
          opacity={0.6}
          reflectivity={0.9}
        />
      </mesh>
      
      {/* Side windows - Left */}
      <mesh position={[0.15, 0.95, carWidth / 2 - 0.02]} castShadow>
        <boxGeometry args={[carLength * 0.38, cabinHeight * 0.55, 0.03]} />
        <meshPhysicalMaterial 
          color="#1a365d" 
          metalness={0.1} 
          roughness={0.05} 
          transparent 
          opacity={0.5}
          reflectivity={0.8}
        />
      </mesh>
      
      {/* Side windows - Right */}
      <mesh position={[0.15, 0.95, -carWidth / 2 + 0.02]} castShadow>
        <boxGeometry args={[carLength * 0.38, cabinHeight * 0.55, 0.03]} />
        <meshPhysicalMaterial 
          color="#1a365d" 
          metalness={0.1} 
          roughness={0.05} 
          transparent 
          opacity={0.5}
          reflectivity={0.8}
        />
      </mesh>
      
      {/* ===== HEADLIGHTS ===== */}
      
      {/* Headlight housing - Left */}
      <mesh position={[-carLength / 2 + 0.08, 0.48, carWidth * 0.35]} castShadow>
        <boxGeometry args={[0.12, 0.18, 0.35]} />
        <meshStandardMaterial color="#111827" metalness={0.4} roughness={0.3} />
      </mesh>
      {/* Headlight lens - Left */}
      <mesh position={[-carLength / 2 + 0.02, 0.48, carWidth * 0.35]}>
        <boxGeometry args={[0.02, 0.14, 0.3]} />
        <meshStandardMaterial color="#fefce8" emissive="#fef9c3" emissiveIntensity={0.5} transparent opacity={0.9} />
      </mesh>
      
      {/* Headlight housing - Right */}
      <mesh position={[-carLength / 2 + 0.08, 0.48, -carWidth * 0.35]} castShadow>
        <boxGeometry args={[0.12, 0.18, 0.35]} />
        <meshStandardMaterial color="#111827" metalness={0.4} roughness={0.3} />
      </mesh>
      {/* Headlight lens - Right */}
      <mesh position={[-carLength / 2 + 0.02, 0.48, -carWidth * 0.35]}>
        <boxGeometry args={[0.02, 0.14, 0.3]} />
        <meshStandardMaterial color="#fefce8" emissive="#fef9c3" emissiveIntensity={0.5} transparent opacity={0.9} />
      </mesh>
      
      {/* DRL strips */}
      <mesh position={[-carLength / 2 + 0.02, 0.38, carWidth * 0.35]}>
        <boxGeometry args={[0.02, 0.03, 0.28]} />
        <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.6} />
      </mesh>
      <mesh position={[-carLength / 2 + 0.02, 0.38, -carWidth * 0.35]}>
        <boxGeometry args={[0.02, 0.03, 0.28]} />
        <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.6} />
      </mesh>
      
      {/* ===== TAILLIGHTS ===== */}
      
      {/* Taillight - Left */}
      <mesh position={[carLength / 2 - 0.02, 0.5, carWidth * 0.38]}>
        <boxGeometry args={[0.06, 0.15, 0.25]} />
        <meshStandardMaterial color="#dc2626" emissive="#dc2626" emissiveIntensity={0.4} />
      </mesh>
      
      {/* Taillight - Right */}
      <mesh position={[carLength / 2 - 0.02, 0.5, -carWidth * 0.38]}>
        <boxGeometry args={[0.06, 0.15, 0.25]} />
        <meshStandardMaterial color="#dc2626" emissive="#dc2626" emissiveIntensity={0.4} />
      </mesh>
      
      {/* ===== GRILLE & DETAILS ===== */}
      
      {/* Front grille */}
      <mesh position={[-carLength / 2 + 0.02, 0.42, 0]}>
        <boxGeometry args={[0.04, 0.12, carWidth * 0.45]} />
        <meshStandardMaterial color="#111827" metalness={0.95} roughness={0.05} />
      </mesh>
      
      {/* License plate - front */}
      <mesh position={[-carLength / 2 + 0.01, 0.3, 0]}>
        <boxGeometry args={[0.02, 0.12, 0.4]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      
      {/* License plate - rear */}
      <mesh position={[carLength / 2 - 0.01, 0.35, 0]}>
        <boxGeometry args={[0.02, 0.12, 0.4]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      
      {/* ===== SIDE MIRRORS ===== */}
      
      <group position={[-0.55, 0.8, carWidth / 2 + 0.12]}>
        <mesh castShadow>
          <boxGeometry args={[0.08, 0.06, 0.04]} />
          <meshStandardMaterial color="#1e40af" metalness={0.85} roughness={0.15} />
        </mesh>
        <mesh position={[0.02, 0, 0.03]}>
          <boxGeometry args={[0.12, 0.08, 0.02]} />
          <meshStandardMaterial color="#1e40af" metalness={0.85} roughness={0.15} />
        </mesh>
        <mesh position={[0.02, 0, 0.05]}>
          <boxGeometry args={[0.1, 0.06, 0.01]} />
          <meshPhysicalMaterial color="#94a3b8" metalness={0.9} roughness={0.1} reflectivity={1} />
        </mesh>
      </group>
      
      <group position={[-0.55, 0.8, -carWidth / 2 - 0.12]}>
        <mesh castShadow>
          <boxGeometry args={[0.08, 0.06, 0.04]} />
          <meshStandardMaterial color="#1e40af" metalness={0.85} roughness={0.15} />
        </mesh>
        <mesh position={[0.02, 0, -0.03]}>
          <boxGeometry args={[0.12, 0.08, 0.02]} />
          <meshStandardMaterial color="#1e40af" metalness={0.85} roughness={0.15} />
        </mesh>
        <mesh position={[0.02, 0, -0.05]}>
          <boxGeometry args={[0.1, 0.06, 0.01]} />
          <meshPhysicalMaterial color="#94a3b8" metalness={0.9} roughness={0.1} reflectivity={1} />
        </mesh>
      </group>
      
      {/* ===== WHEELS ===== */}
      
      {/* Front Left Wheel */}
      <WheelAssembly position={[-carLength * 0.32, wheelRadius, carWidth / 2 + 0.08]} wheelRadius={wheelRadius} wheelWidth={wheelWidth} />
      
      {/* Front Right Wheel */}
      <WheelAssembly position={[-carLength * 0.32, wheelRadius, -carWidth / 2 - 0.08]} wheelRadius={wheelRadius} wheelWidth={wheelWidth} />
      
      {/* Rear Left Wheel */}
      <WheelAssembly position={[carLength * 0.32, wheelRadius, carWidth / 2 + 0.08]} wheelRadius={wheelRadius} wheelWidth={wheelWidth} />
      
      {/* Rear Right Wheel */}
      <WheelAssembly position={[carLength * 0.32, wheelRadius, -carWidth / 2 - 0.08]} wheelRadius={wheelRadius} wheelWidth={wheelWidth} />
      
      {/* ===== INTERIOR HINT ===== */}
      
      {/* Steering wheel silhouette */}
      <mesh position={[-0.3, 0.85, carWidth * 0.25]} rotation={[0.3, 0, 0]}>
        <torusGeometry args={[0.12, 0.015, 8, 24]} />
        <meshStandardMaterial color="#1f2937" />
      </mesh>
      
      {/* Seats hint */}
      <mesh position={[0, 0.75, carWidth * 0.25]} castShadow>
        <boxGeometry args={[0.4, 0.35, 0.4]} />
        <meshStandardMaterial color="#1f2937" />
      </mesh>
      <mesh position={[0, 0.75, -carWidth * 0.25]} castShadow>
        <boxGeometry args={[0.4, 0.35, 0.4]} />
        <meshStandardMaterial color="#1f2937" />
      </mesh>
      
      {/* Car shadow */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <planeGeometry args={[carLength + 0.8, carWidth + 0.6]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.25} depthWrite={false} />
      </mesh>
    </group>
  )
})

// ============================================================================
// WHEEL ASSEMBLY COMPONENT
// ============================================================================

interface WheelProps {
  position: [number, number, number]
  wheelRadius: number
  wheelWidth: number
}

const WheelAssembly = memo(function WheelAssembly({ position, wheelRadius, wheelWidth }: WheelProps) {
  return (
    <group position={position}>
      {/* Tire */}
      <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[wheelRadius, wheelRadius, wheelWidth, 32]} />
        <meshStandardMaterial color="#1a1a1a" metalness={0.1} roughness={0.9} />
      </mesh>
      
      {/* Tire sidewall detail */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[wheelRadius * 0.95, wheelRadius * 0.95, wheelWidth * 1.02, 32]} />
        <meshStandardMaterial color="#262626" metalness={0.1} roughness={0.85} />
      </mesh>
      
      {/* Rim */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[wheelRadius * 0.7, wheelRadius * 0.7, wheelWidth * 0.6, 24]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.95} roughness={0.1} />
      </mesh>
      
      {/* Rim center cap */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, wheelWidth * 0.31, 0]}>
        <cylinderGeometry args={[wheelRadius * 0.25, wheelRadius * 0.25, 0.03, 16]} />
        <meshStandardMaterial color="#64748b" metalness={0.9} roughness={0.15} />
      </mesh>
      
      {/* Rim spokes (5 spoke design) */}
      {[0, 1, 2, 3, 4].map((i) => (
        <mesh 
          key={`spoke-${i}`} 
          rotation={[Math.PI / 2, 0, (Math.PI * 2 / 5) * i]} 
          position={[0, wheelWidth * 0.25, 0]}
        >
          <boxGeometry args={[wheelRadius * 0.15, 0.04, wheelRadius * 0.5]} />
          <meshStandardMaterial color="#cbd5e1" metalness={0.9} roughness={0.15} />
        </mesh>
      ))}
      
      {/* Brake disc hint */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -wheelWidth * 0.2, 0]}>
        <cylinderGeometry args={[wheelRadius * 0.5, wheelRadius * 0.5, 0.04, 24]} />
        <meshStandardMaterial color="#374151" metalness={0.7} roughness={0.4} />
      </mesh>
    </group>
  )
})

// ============================================================================
// SPARE TIRE COMPONENT
// ============================================================================

const SpareTire = memo(function SpareTire() {
  return (
    <group position={[-9, 0.45, 6]} rotation={[Math.PI / 2, 0, 0.1]}>
      {/* Tire */}
      <mesh castShadow>
        <torusGeometry args={[0.35, 0.12, 16, 32]} />
        <meshStandardMaterial color="#1a1a1a" metalness={0.1} roughness={0.9} />
      </mesh>
      {/* Rim */}
      <mesh>
        <cylinderGeometry args={[0.25, 0.25, 0.2, 24]} />
        <meshStandardMaterial color="#6b7280" metalness={0.8} roughness={0.2} />
      </mesh>
    </group>
  )
})

// ============================================================================
// OIL DRUM COMPONENT
// ============================================================================

const OilDrum = memo(function OilDrum({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[0.3, 0.3, 0.9, 24]} />
        <meshStandardMaterial color="#1e40af" metalness={0.6} roughness={0.4} />
      </mesh>
      {/* Rim bands */}
      <mesh position={[0, 0.38, 0]}>
        <cylinderGeometry args={[0.32, 0.32, 0.08, 24]} />
        <meshStandardMaterial color="#1e3a8a" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[0, -0.38, 0]}>
        <cylinderGeometry args={[0.32, 0.32, 0.08, 24]} />
        <meshStandardMaterial color="#1e3a8a" metalness={0.7} roughness={0.3} />
      </mesh>
      {/* Label */}
      <mesh position={[0.31, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <planeGeometry args={[0.5, 0.3]} />
        <meshStandardMaterial color="#fbbf24" />
      </mesh>
    </group>
  )
})

// ============================================================================
// TOOL CART COMPONENT
// ============================================================================

const ToolCart = memo(function ToolCart() {
  return (
    <group position={[9, 0, 4]}>
      {/* Cart body */}
      <mesh position={[0, 0.55, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.8, 0.9, 0.5]} />
        <meshStandardMaterial color="#dc2626" metalness={0.75} roughness={0.25} />
      </mesh>
      
      {/* Drawers */}
      {[0.2, 0.4, 0.6, 0.8].map((y, i) => (
        <group key={`drawer-${i}`}>
          <mesh position={[0, y, 0.26]} castShadow>
            <boxGeometry args={[0.72, 0.15, 0.02]} />
            <meshStandardMaterial color="#b91c1c" metalness={0.6} roughness={0.35} />
          </mesh>
          <mesh position={[0, y, 0.29]} castShadow>
            <boxGeometry args={[0.2, 0.03, 0.03]} />
            <meshStandardMaterial color="#9ca3af" metalness={0.9} roughness={0.1} />
          </mesh>
        </group>
      ))}
      
      {/* Top surface */}
      <mesh position={[0, 1.02, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.85, 0.04, 0.55]} />
        <meshStandardMaterial color="#374151" metalness={0.5} roughness={0.5} />
      </mesh>
      
      {/* Wheels */}
      {[[-0.3, -0.2], [0.3, -0.2], [-0.3, 0.2], [0.3, 0.2]].map(([x, z], i) => (
        <mesh key={`caster-${i}`} position={[x, 0.06, z]} castShadow>
          <sphereGeometry args={[0.06, 12, 12]} />
          <meshStandardMaterial color="#1f2937" />
        </mesh>
      ))}
      
      {/* Tools on top */}
      <mesh position={[-0.2, 1.08, 0]} rotation={[0, 0.3, Math.PI / 2]}>
        <cylinderGeometry args={[0.02, 0.02, 0.25, 8]} />
        <meshStandardMaterial color="#ef4444" />
      </mesh>
      <mesh position={[0.15, 1.06, 0.1]} rotation={[0, -0.2, 0]}>
        <boxGeometry args={[0.2, 0.04, 0.08]} />
        <meshStandardMaterial color="#fbbf24" />
      </mesh>
    </group>
  )
})

// ============================================================================
// WORKBENCH WITH TOOLS COMPONENT
// ============================================================================

const RealisticWorkbench = memo(function RealisticWorkbench() {
  return (
    <group position={[-9.5, 0, -9]}>
      {/* Workbench top - wooden */}
      <mesh position={[0, 0.9, 0]} castShadow receiveShadow>
        <boxGeometry args={[4, 0.08, 1.2]} />
        <meshStandardMaterial color="#92400e" metalness={0.05} roughness={0.85} />
      </mesh>
      
      {/* Metal frame legs */}
      {[[-1.8, 0.4], [1.8, 0.4], [-1.8, -0.4], [1.8, -0.4]].map(([x, z], i) => (
        <mesh key={`leg-${i}`} position={[x, 0.45, z]} castShadow>
          <boxGeometry args={[0.08, 0.9, 0.08]} />
          <meshStandardMaterial color="#374151" metalness={0.7} roughness={0.3} />
        </mesh>
      ))}
      
      {/* Lower shelf */}
      <mesh position={[0, 0.2, 0]} receiveShadow>
        <boxGeometry args={[3.8, 0.04, 1]} />
        <meshStandardMaterial color="#78350f" metalness={0.05} roughness={0.9} />
      </mesh>
      
      {/* Pegboard */}
      <mesh position={[0, 1.7, -0.65]} receiveShadow>
        <boxGeometry args={[4, 1.4, 0.04]} />
        <meshStandardMaterial color="#d4a574" metalness={0.05} roughness={0.95} />
      </mesh>
      
      {/* Pegboard holes pattern */}
      {Array.from({ length: 15 }).map((_, i) => (
        Array.from({ length: 8 }).map((_, j) => (
          <mesh key={`hole-${i}-${j}`} position={[-1.8 + i * 0.25, 1.2 + j * 0.15, -0.62]}>
            <circleGeometry args={[0.02, 8]} />
            <meshStandardMaterial color="#a16207" />
          </mesh>
        ))
      )).flat()}
      
      {/* Tools hanging on pegboard */}
      {/* Wrench set */}
      {[0, 0.12, 0.24, 0.36].map((offset, i) => (
        <mesh key={`wrench-${i}`} position={[-1.5 + offset, 1.6, -0.6]} rotation={[0, 0, 0]}>
          <boxGeometry args={[0.06, 0.25 - i * 0.03, 0.015]} />
          <meshStandardMaterial color="#6b7280" metalness={0.9} roughness={0.2} />
        </mesh>
      ))}
      
      {/* Screwdrivers */}
      {[0, 0.1, 0.2].map((offset, i) => (
        <group key={`screwdriver-${i}`} position={[-0.5 + offset, 1.55, -0.6]}>
          <mesh>
            <cylinderGeometry args={[0.025, 0.02, 0.15, 8]} />
            <meshStandardMaterial color={['#dc2626', '#eab308', '#22c55e'][i]} />
          </mesh>
          <mesh position={[0, -0.12, 0]}>
            <cylinderGeometry args={[0.008, 0.008, 0.1, 6]} />
            <meshStandardMaterial color="#6b7280" metalness={0.9} roughness={0.2} />
          </mesh>
        </group>
      ))}
      
      {/* Pliers */}
      <mesh position={[0.3, 1.5, -0.6]} rotation={[0, 0, 0.3]}>
        <boxGeometry args={[0.04, 0.2, 0.015]} />
        <meshStandardMaterial color="#dc2626" />
      </mesh>
      
      {/* Hammer */}
      <group position={[0.8, 1.55, -0.6]}>
        <mesh>
          <boxGeometry args={[0.08, 0.06, 0.04]} />
          <meshStandardMaterial color="#374151" metalness={0.8} roughness={0.3} />
        </mesh>
        <mesh position={[0, -0.12, 0]}>
          <cylinderGeometry args={[0.015, 0.015, 0.2, 8]} />
          <meshStandardMaterial color="#92400e" />
        </mesh>
      </group>
      
      {/* Tape measure */}
      <mesh position={[1.3, 1.4, -0.6]}>
        <boxGeometry args={[0.08, 0.08, 0.04]} />
        <meshStandardMaterial color="#fbbf24" />
      </mesh>
      
      {/* Vise on workbench */}
      <group position={[1.5, 1, 0.3]}>
        <mesh castShadow>
          <boxGeometry args={[0.25, 0.15, 0.2]} />
          <meshStandardMaterial color="#374151" metalness={0.8} roughness={0.3} />
        </mesh>
        <mesh position={[0, 0.1, 0.15]}>
          <boxGeometry args={[0.2, 0.12, 0.08]} />
          <meshStandardMaterial color="#4b5563" metalness={0.7} roughness={0.4} />
        </mesh>
        <mesh position={[0, 0.1, -0.15]}>
          <boxGeometry args={[0.2, 0.12, 0.08]} />
          <meshStandardMaterial color="#4b5563" metalness={0.7} roughness={0.4} />
        </mesh>
      </group>
      
      {/* Items on lower shelf */}
      <mesh position={[-1, 0.28, 0]} castShadow>
        <boxGeometry args={[0.4, 0.12, 0.3]} />
        <meshStandardMaterial color="#1e40af" />
      </mesh>
      <mesh position={[0.5, 0.32, 0]} castShadow>
        <cylinderGeometry args={[0.12, 0.12, 0.2, 16]} />
        <meshStandardMaterial color="#dc2626" />
      </mesh>
    </group>
  )
})

// ============================================================================
// STORAGE SHELF UNIT COMPONENT
// ============================================================================

const StorageUnit = memo(function StorageUnit() {
  return (
    <group position={[9.5, 0, -9]}>
      {/* Metal frame */}
      {[[-1, -0.35], [1, -0.35], [-1, 0.35], [1, 0.35]].map(([x, z], i) => (
        <mesh key={`post-${i}`} position={[x, 1.3, z]} castShadow>
          <boxGeometry args={[0.06, 2.6, 0.06]} />
          <meshStandardMaterial color="#4b5563" metalness={0.7} roughness={0.3} />
        </mesh>
      ))}
      
      {/* Shelves */}
      {[0.1, 0.7, 1.3, 1.9, 2.5].map((y, i) => (
        <mesh key={`shelf-${i}`} position={[0, y, 0]} receiveShadow castShadow>
          <boxGeometry args={[2.1, 0.05, 0.8]} />
          <meshStandardMaterial color="#6b7280" metalness={0.6} roughness={0.4} />
        </mesh>
      ))}
      
      {/* Storage items */}
      {/* Bottom shelf - heavy items */}
      <mesh position={[-0.5, 0.22, 0]} castShadow>
        <boxGeometry args={[0.5, 0.2, 0.4]} />
        <meshStandardMaterial color="#1e40af" />
      </mesh>
      <mesh position={[0.4, 0.25, 0]} castShadow>
        <boxGeometry args={[0.6, 0.25, 0.45]} />
        <meshStandardMaterial color="#059669" />
      </mesh>
      
      {/* Second shelf */}
      <mesh position={[-0.6, 0.88, 0]} castShadow>
        <boxGeometry args={[0.4, 0.3, 0.35]} />
        <meshStandardMaterial color="#dc2626" />
      </mesh>
      <mesh position={[0.2, 0.85, 0]} castShadow>
        <cylinderGeometry args={[0.15, 0.15, 0.25, 16]} />
        <meshStandardMaterial color="#fbbf24" />
      </mesh>
      <mesh position={[0.7, 0.82, 0]} castShadow>
        <boxGeometry args={[0.35, 0.2, 0.3]} />
        <meshStandardMaterial color="#7c3aed" />
      </mesh>
      
      {/* Third shelf */}
      <mesh position={[0, 1.48, 0]} castShadow>
        <boxGeometry args={[0.8, 0.3, 0.4]} />
        <meshStandardMaterial color="#374151" />
      </mesh>
      
      {/* Top shelves - lighter items */}
      <mesh position={[-0.4, 2.05, 0]} castShadow>
        <boxGeometry args={[0.3, 0.25, 0.25]} />
        <meshStandardMaterial color="#f97316" />
      </mesh>
      <mesh position={[0.5, 2.1, 0]} castShadow>
        <boxGeometry args={[0.5, 0.35, 0.35]} />
        <meshStandardMaterial color="#06b6d4" />
      </mesh>
    </group>
  )
})

// ============================================================================
// GARAGE DOOR COMPONENT
// ============================================================================

const GarageDoor = memo(function GarageDoor() {
  const { width, height } = ROOM_DIMENSIONS
  const doorWidth = width * 0.75
  const doorHeight = height * 0.85
  
  return (
    <group position={[0, 0, ROOM_DIMENSIONS.depth / 2 - 0.05]}>
      {/* Garage door panels */}
      {[0, 1, 2, 3, 4].map((i) => (
        <mesh key={`panel-${i}`} position={[0, doorHeight * 0.1 + doorHeight * 0.17 * i, 0]} receiveShadow>
          <boxGeometry args={[doorWidth, doorHeight * 0.15, 0.1]} />
          <meshStandardMaterial color="#e5e7eb" metalness={0.25} roughness={0.7} />
        </mesh>
      ))}
      
      {/* Panel lines/grooves */}
      {[0, 1, 2, 3, 4].map((i) => (
        <mesh key={`groove-${i}`} position={[0, doorHeight * 0.02 + doorHeight * 0.17 * i, 0.06]}>
          <boxGeometry args={[doorWidth * 0.98, 0.02, 0.01]} />
          <meshStandardMaterial color="#9ca3af" />
        </mesh>
      ))}
      
      {/* Door frame */}
      <mesh position={[-doorWidth / 2 - 0.15, doorHeight / 2, 0]}>
        <boxGeometry args={[0.25, doorHeight + 0.3, 0.15]} />
        <meshStandardMaterial color="#374151" metalness={0.5} roughness={0.5} />
      </mesh>
      <mesh position={[doorWidth / 2 + 0.15, doorHeight / 2, 0]}>
        <boxGeometry args={[0.25, doorHeight + 0.3, 0.15]} />
        <meshStandardMaterial color="#374151" metalness={0.5} roughness={0.5} />
      </mesh>
      
      {/* Top window panel row */}
      {[-3, -1.5, 0, 1.5, 3].map((x, i) => (
        <mesh key={`window-${i}`} position={[x, doorHeight * 0.78, 0.06]}>
          <boxGeometry args={[1.2, doorHeight * 0.1, 0.02]} />
          <meshPhysicalMaterial 
            color="#bfdbfe" 
            transparent 
            opacity={0.5} 
            metalness={0.1} 
            roughness={0.1}
            reflectivity={0.5}
          />
        </mesh>
      ))}
    </group>
  )
})

// ============================================================================
// FLOOR DETAILS COMPONENT
// ============================================================================

const FloorDetails = memo(function FloorDetails() {
  return (
    <group>
      {/* Concrete floor texture simulation - control joints */}
      {[-8, 0, 8].map((x) => (
        <mesh key={`joint-x-${x}`} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.005, 0]}>
          <planeGeometry args={[0.02, ROOM_DIMENSIONS.depth * 0.9]} />
          <meshStandardMaterial color="#9ca3af" />
        </mesh>
      ))}
      {[-8, 0, 8].map((z) => (
        <mesh key={`joint-z-${z}`} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, z]}>
          <planeGeometry args={[ROOM_DIMENSIONS.width * 0.9, 0.02]} />
          <meshStandardMaterial color="#9ca3af" />
        </mesh>
      ))}
      
      {/* Oil stains */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[1.5, 0.006, 2.5]}>
        <circleGeometry args={[0.5, 32]} />
        <meshStandardMaterial color="#1f2937" transparent opacity={0.3} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-0.8, 0.006, 0.5]}>
        <circleGeometry args={[0.3, 32]} />
        <meshStandardMaterial color="#1f2937" transparent opacity={0.25} />
      </mesh>
      
      {/* Floor drain */}
      <group position={[-8, 0.01, 0]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.2, 24]} />
          <meshStandardMaterial color="#4b5563" metalness={0.8} roughness={0.3} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
          <ringGeometry args={[0.08, 0.15, 16]} />
          <meshStandardMaterial color="#1f2937" />
        </mesh>
      </group>
    </group>
  )
})

// ============================================================================
// MAIN GARAGE ROOM COMPONENT
// ============================================================================

export const GarageRoom = memo(function GarageRoom() {
  const { width, depth, height } = ROOM_DIMENSIONS

  return (
    <group>
      {/* ===== FLOOR (FULLY TRANSPARENT for bottom-to-top view) ===== */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[width, depth]} />
        <meshPhysicalMaterial 
          color="#f8fafc"
          transparent
          opacity={0.08}
          metalness={0.05}
          roughness={0.1}
          side={2}
        />
      </mesh>
      
      {/* Floor outline for reference */}
      <lineSegments rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <edgesGeometry args={[new THREE.PlaneGeometry(width, depth)]} />
        <lineBasicMaterial color="#94a3b8" transparent opacity={0.4} />
      </lineSegments>
      
      <FloorDetails />

      {/* ===== BACK WALL (TRANSPARENT) ===== */}
      <mesh position={[0, height / 2, -depth / 2]}>
        <boxGeometry args={[width, height, WALL_THICKNESS]} />
        <meshPhysicalMaterial 
          color={SIDE_WALL_COLOR}
          transparent
          opacity={0.12}
          metalness={0.1}
          roughness={0.1}
          side={2}
        />
      </mesh>
      
      {/* Back wall frame outline */}
      <lineSegments position={[0, height / 2, -depth / 2]}>
        <edgesGeometry args={[new THREE.BoxGeometry(width, height, WALL_THICKNESS)]} />
        <lineBasicMaterial color="#94a3b8" transparent opacity={0.5} />
      </lineSegments>

      {/* ===== FRONT WALL (TRANSPARENT - where garage door is) ===== */}
      <mesh position={[0, height / 2, depth / 2]}>
        <boxGeometry args={[width, height, WALL_THICKNESS]} />
        <meshPhysicalMaterial 
          color={SIDE_WALL_COLOR}
          transparent
          opacity={0.08}
          metalness={0.1}
          roughness={0.1}
          side={2}
        />
      </mesh>
      
      {/* Front wall frame outline */}
      <lineSegments position={[0, height / 2, depth / 2]}>
        <edgesGeometry args={[new THREE.BoxGeometry(width, height, WALL_THICKNESS)]} />
        <lineBasicMaterial color="#94a3b8" transparent opacity={0.4} />
      </lineSegments>

      {/* ===== LEFT WALL (TRANSPARENT) ===== */}
      <mesh position={[-width / 2, height / 2, 0]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[depth, height, WALL_THICKNESS]} />
        <meshPhysicalMaterial 
          color={SIDE_WALL_COLOR}
          transparent
          opacity={0.1}
          metalness={0.1}
          roughness={0.1}
          side={2}
        />
      </mesh>
      
      {/* Left wall frame outline */}
      <lineSegments position={[-width / 2, height / 2, 0]}>
        <edgesGeometry args={[new THREE.BoxGeometry(WALL_THICKNESS, height, depth)]} />
        <lineBasicMaterial color="#94a3b8" transparent opacity={0.5} />
      </lineSegments>

      {/* ===== RIGHT WALL (TRANSPARENT) ===== */}
      <mesh position={[width / 2, height / 2, 0]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[depth, height, WALL_THICKNESS]} />
        <meshPhysicalMaterial 
          color={SIDE_WALL_COLOR}
          transparent
          opacity={0.1}
          metalness={0.1}
          roughness={0.1}
          side={2}
        />
      </mesh>
      
      {/* Right wall frame outline */}
      <lineSegments position={[width / 2, height / 2, 0]}>
        <edgesGeometry args={[new THREE.BoxGeometry(WALL_THICKNESS, height, depth)]} />
        <lineBasicMaterial color="#94a3b8" transparent opacity={0.5} />
      </lineSegments>
      
      {/* ===== CORNER POSTS for visual reference ===== */}
      {[
        [-width/2, -depth/2],
        [width/2, -depth/2],
        [-width/2, depth/2],
        [width/2, depth/2],
      ].map(([x, z], i) => (
        <mesh key={`corner-${i}`} position={[x, height / 2, z]}>
          <boxGeometry args={[0.1, height, 0.1]} />
          <meshStandardMaterial color="#64748b" transparent opacity={0.3} />
        </mesh>
      ))}

      {/* ===== GARAGE DOOR (semi-transparent) ===== */}
      <GarageDoor />
      
      {/* ===== CAR ===== */}
      <RealisticCar />
      
      {/* ===== GARAGE EQUIPMENT ===== */}
      <RealisticWorkbench />
      <StorageUnit />
      <ToolCart />
      
      {/* ===== SPARE PARTS ===== */}
      <SpareTire />
      <OilDrum position={[-10, 0.45, 3]} />
      <OilDrum position={[-10, 0.45, 4.2]} />

      {/* ===== FLOOR GRID (light for visibility) ===== */}
      <gridHelper
        args={[Math.max(width, depth), 24, '#cbd5e1', '#e2e8f0']}
        position={[0, 0.008, 0]}
      />
    </group>
  )
})

// Need to import THREE for EdgesGeometry
import * as THREE from 'three'

export default GarageRoom
