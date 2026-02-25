import { useMemo } from 'react'
import { Shape, ExtrudeGeometry } from 'three'
import { useCeilingDesignerStore } from '../../store'
import { useRoomBuilderStore } from '@/store/useRoomBuilderStore'
import { INCHES_TO_PX, HUB_RADIUS, CONNECTOR_SIZE } from '../../constants'
import type { CeilingComponentType, LightBarComponent } from '../../types'

// ── Build a Three.js Shape for each connector type ──
function makeConnectorShape(type: CeilingComponentType, s: number): Shape {
	const hs = s / 2
	const w = s * 0.35 // arm width
	const shape = new Shape()

	switch (type) {
		case 't-connector': {
			// T: horizontal top bar + vertical stem down
			shape.moveTo(-hs, -w)
			shape.lineTo(hs, -w)
			shape.lineTo(hs, w)
			shape.lineTo(w, w)
			shape.lineTo(w, hs)
			shape.lineTo(-w, hs)
			shape.lineTo(-w, w)
			shape.lineTo(-hs, w)
			shape.closePath()
			break
		}
		case '90-connector-left': {
			// L going up + left
			shape.moveTo(-w, -hs)
			shape.lineTo(w, -hs)
			shape.lineTo(w, w)
			shape.lineTo(-hs, w)
			shape.lineTo(-hs, -w)
			shape.lineTo(-w, -w)
			shape.closePath()
			break
		}
		case '90-connector-right': {
			// L going up + right
			shape.moveTo(-w, -hs)
			shape.lineTo(w, -hs)
			shape.lineTo(w, -w)
			shape.lineTo(hs, -w)
			shape.lineTo(hs, w)
			shape.lineTo(-w, w)
			shape.closePath()
			break
		}
		case 'cross-connector': {
			// + shape
			shape.moveTo(-w, -hs)
			shape.lineTo(w, -hs)
			shape.lineTo(w, -w)
			shape.lineTo(hs, -w)
			shape.lineTo(hs, w)
			shape.lineTo(w, w)
			shape.lineTo(w, hs)
			shape.lineTo(-w, hs)
			shape.lineTo(-w, w)
			shape.lineTo(-hs, w)
			shape.lineTo(-hs, -w)
			shape.lineTo(-w, -w)
			shape.closePath()
			break
		}
		case 'y-connector': {
			// Y: two branches up + stem down
			shape.moveTo(0, -hs)
			shape.lineTo(hs * 0.65, -hs * 0.2)
			shape.lineTo(hs * 0.35, w * 0.3)
			shape.lineTo(w, w * 0.3)
			shape.lineTo(w, hs)
			shape.lineTo(-w, hs)
			shape.lineTo(-w, w * 0.3)
			shape.lineTo(-hs * 0.35, w * 0.3)
			shape.lineTo(-hs * 0.65, -hs * 0.2)
			shape.closePath()
			break
		}
		case '45-left-elbow': {
			// Vertical bar with 45° left branch
			shape.moveTo(-w, -hs)
			shape.lineTo(w, -hs)
			shape.lineTo(w, -w)
			shape.lineTo(-hs * 0.5, hs * 0.5)
			shape.lineTo(-hs * 0.85, hs * 0.15)
			shape.lineTo(-w, 0)
			shape.closePath()
			break
		}
		case '45-right-elbow': {
			shape.moveTo(-w, -hs)
			shape.lineTo(w, -hs)
			shape.lineTo(w, 0)
			shape.lineTo(hs * 0.85, hs * 0.15)
			shape.lineTo(hs * 0.5, hs * 0.5)
			shape.lineTo(-w, -w)
			shape.closePath()
			break
		}
		default: {
			// Fallback: square
			shape.moveTo(-hs, -hs)
			shape.lineTo(hs, -hs)
			shape.lineTo(hs, hs)
			shape.lineTo(-hs, hs)
			shape.closePath()
		}
	}
	return shape
}

/** 3D connector mesh using ExtrudeGeometry */
function ConnectorMesh3D({
	type,
	sizeM,
	color,
	rotY,
	position,
}: {
	type: CeilingComponentType
	sizeM: number
	color: string
	rotY: number
	position: [number, number, number]
}) {
	const geometry = useMemo(() => {
		const shape = makeConnectorShape(type, sizeM)
		const geo = new ExtrudeGeometry(shape, {
			depth: 0.015,
			bevelEnabled: false,
		})
		geo.center()
		return geo
	}, [type, sizeM])

	return (
		<mesh
			geometry={geometry}
			position={position}
			rotation={[-Math.PI / 2, 0, rotY]}
		>
			<meshStandardMaterial color={color} metalness={0.3} roughness={0.6} />
		</mesh>
	)
}

/**
 * Renders the ceiling lighting layout as 3D meshes inside the room scene.
 * Converts 2D canvas coordinates (px) → 3D world coordinates (meters).
 */
export function CeilingLights3D() {
	const components = useCeilingDesignerStore((s) => s.components)
	const ceilingWidth = useCeilingDesignerStore((s) => s.ceilingWidth)
	const ceilingHeight = useCeilingDesignerStore((s) => s.ceilingHeight)
	const roomParams = useRoomBuilderStore((s) => s.roomParams)

	// Map 2D canvas px → 3D world meters
	// Canvas origin (0,0) = top-left corner of ceiling
	// Room centered at origin: x ∈ [-w/2, w/2], z ∈ [-d/2, d/2]
	const toWorld = useMemo(() => {
		const scaleX = roomParams.width / (ceilingWidth || 1)
		const scaleZ = roomParams.depth / (ceilingHeight || 1)
		const yPos = roomParams.height - 0.02 // just below the ceiling mesh
		return (px: number, py: number) => ({
			x: px * scaleX - roomParams.width / 2,
			y: yPos,
			z: py * scaleZ - roomParams.depth / 2,
		})
	}, [roomParams, ceilingWidth, ceilingHeight])

	if (components.length === 0) return null

	return (
		<group name='ceiling-lights'>
			{components.map((comp) => {
				const pos = toWorld(comp.x, comp.y)
				const color = comp.color === 'black' ? '#1a1a1a' : '#f0f0f0'
				const rotY = -(comp.rotation * Math.PI) / 180

				if (comp.type === 'hub') {
					// Hub → flat octagonal cylinder
					const radiusM = (HUB_RADIUS / (ceilingWidth || 1)) * roomParams.width
					return (
					<mesh key={comp.id} position={[pos.x, pos.y, pos.z]}>
							<cylinderGeometry args={[radiusM, radiusM, 0.025, 8]} />
							<meshStandardMaterial color={color} metalness={0.4} roughness={0.5} />
						</mesh>
					)
				}

				if (comp.type === 'light-bar') {
					const lb = comp as LightBarComponent
					const lengthM = ((lb.length * INCHES_TO_PX) / (ceilingWidth || 1)) * roomParams.width
					const widthM = 0.03
					const heightM = 0.015
					const lightColor = lb.lightMode === 'rgb' ? '#ffaaff' : '#ffffee'

					return (
						<group key={comp.id} position={[pos.x, pos.y, pos.z]} rotation={[0, rotY, 0]}>
							{/* Light bar housing */}
							<mesh>
								<boxGeometry args={[widthM, heightM, lengthM]} />
								<meshStandardMaterial color={color} metalness={0.4} roughness={0.5} />
							</mesh>
							{/* Glowing strip */}
							<mesh position={[0, -heightM / 2 - 0.001, 0]}>
								<boxGeometry args={[widthM * 0.6, 0.003, lengthM * 0.9]} />
								<meshStandardMaterial
									color={lightColor}
									emissive={lightColor}
									emissiveIntensity={2}
									toneMapped={false}
								/>
							</mesh>
							{/* Point light for illumination */}
							<pointLight
								position={[0, -0.1, 0]}
								intensity={0.4}
								distance={2}
								color={lb.lightMode === 'rgb' ? '#ffccff' : '#fffde0'}
							/>
						</group>
					)
				}

				// Connector → proper 3D shape
				const sizeM = (CONNECTOR_SIZE / (ceilingWidth || 1)) * roomParams.width
				return (
					<ConnectorMesh3D
						key={comp.id}
						type={comp.type}
						sizeM={sizeM}
						color={color}
						rotY={rotY}
						position={[pos.x, pos.y, pos.z]}
					/>
				)
			})}

			{/* Connection wires between parent → child */}
			{components
				.filter((c) => c.parentId)
				.map((child) => {
					const parent = components.find((c) => c.id === child.parentId)
					if (!parent) return null
					const a = toWorld(parent.x, parent.y)
					const b = toWorld(child.x, child.y)
					const midX = (a.x + b.x) / 2
					const midZ = (a.z + b.z) / 2
					const dist = Math.hypot(b.x - a.x, b.z - a.z)
					const angle = Math.atan2(b.x - a.x, b.z - a.z)
					const wireColor = child.color === 'black' ? '#222' : '#ccc'

					return (
						<mesh
							key={`wire-${child.id}`}
							position={[midX, a.y - 0.005, midZ]}
							rotation={[0, angle, 0]}
						>
							<boxGeometry args={[0.008, 0.008, dist]} />
							<meshStandardMaterial color={wireColor} />
						</mesh>
					)
				})}
		</group>
	)
}
