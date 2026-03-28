import { Suspense, useMemo } from 'react'
import { useLoader } from '@react-three/fiber'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js'
import { Group, Mesh, MeshStandardMaterial, Vector3, Box3, Quaternion } from 'three'
import { useCeilingDesignerStore } from '../../store'
import { useRoomBuilderStore } from '@/store/useRoomBuilderStore'
import type { LightBarComponent } from '../../types'

const ALL_PATHS = [
	'/Ceiling Light Models/Hub.fbx',
	'/Ceiling Light Models/18in Light.fbx',
	'/Ceiling Light Models/36in Light.fbx',
	'/Ceiling Light Models/T Connector.fbx',
	'/Ceiling Light Models/Cross Connector.fbx',
	'/Ceiling Light Models/45Degree Left.fbx',
	'/Ceiling Light Models/45Degree Rightt.fbx',
	'/Ceiling Light Models/Left Angle Connector.fbx',
	'/Ceiling Light Models/Right Angle Connector.fbx',
	'/Ceiling Light Models/Y Connector.fbx',
] as const

function cloneAndScale(source: Group, targetMeters: number, color: string, modelType?: string): Group {
	const clone = source.clone(true) as Group
	clone.updateMatrixWorld(true)

	const box = new Box3().setFromObject(clone)
	const size = box.getSize(new Vector3())
	const center = box.getCenter(new Vector3())
	
	console.log(`cloneAndScale: modelType=${modelType}, targetMeters=${targetMeters}`)
	console.log(`  → original size=(${size.x.toFixed(3)}, ${size.y.toFixed(3)}, ${size.z.toFixed(3)})`)
	console.log(`  → original center=(${center.x.toFixed(3)}, ${center.y.toFixed(3)}, ${center.z.toFixed(3)})`)
	
	// Different scaling logic based on model type and current dimensions
	let scaleFactor = 1
	
	if (modelType === 'light-bar') {
		// Light bars: use the longest dimension (X-axis for horizontal bars)
		const maxDim = Math.max(size.x, size.y, size.z)
		if (maxDim > 0.0001) {
			scaleFactor = targetMeters / maxDim
		}
	} else if (modelType === 'hub') {
		// Hub: scale based on the largest horizontal dimension
		const horizontalDim = Math.max(size.x, size.z)
		if (horizontalDim > 0.0001) {
			scaleFactor = targetMeters / horizontalDim
		}
	} else {
		// Connectors: scale based on the largest horizontal dimension (X or Z)
		const horizontalDim = Math.max(size.x, size.z)
		if (horizontalDim > 0.0001) {
			scaleFactor = targetMeters / horizontalDim
		}
	}
	
	console.log(`  → scaleFactor=${scaleFactor.toFixed(6)}`)
	
	clone.scale.multiplyScalar(scaleFactor)
	clone.updateMatrixWorld(true)
	
	// Calculate the center offset AFTER scaling
	const scaledBox = new Box3().setFromObject(clone)
	const scaledCenter = scaledBox.getCenter(new Vector3())
	const scaledSize = scaledBox.getSize(new Vector3())
	
	console.log(`  → scaled size=(${scaledSize.x.toFixed(3)}, ${scaledSize.y.toFixed(3)}, ${scaledSize.z.toFixed(3)})`)
	console.log(`  → scaled center=(${scaledCenter.x.toFixed(3)}, ${scaledCenter.y.toFixed(3)}, ${scaledCenter.z.toFixed(3)})`)
	
	// Move all meshes to center the geometry at origin
	clone.traverse((child) => {
		if ((child as Mesh).isMesh) {
			const mesh = child as Mesh
			mesh.position.x -= scaledCenter.x
			mesh.position.y -= scaledCenter.y
			mesh.position.z -= scaledCenter.z
		}
	})
	
	// Apply material
	const material = new MeshStandardMaterial({
		color: color,
		metalness: 0.4,
		roughness: 0.5,
	})
	clone.traverse((child) => {
		if ((child as Mesh).isMesh) {
			;(child as Mesh).material = material.clone()
		}
	})

	return clone
}

// Calculate fixture rotation based on component type and ceiling normal
// Flat components (naturally horizontal): hub, t-connector, elbow connectors, y-connector
// Vertical components (need rotation to lie flat): light-bar, cross-connector
function getFixtureRotationFromNormal(
	componentType: string,
	ceilingNormal?: { x: number; y: number; z: number },
	canvasRotationRadians?: number
): [number, number, number] {
	const canvasRot = canvasRotationRadians || 0

	// Components that are naturally flat on ceiling (no tilt needed)
	const naturallyFlatTypes = ['hub', 't-connector', '45-left-elbow', '45-right-elbow', '90-connector-left', '90-connector-right', 'y-connector']
	const isNaturallyFlat = naturallyFlatTypes.includes(componentType)

	if (!ceilingNormal) {
		// Default: flat ceiling pointing up
		if (isNaturallyFlat) {
			// These components lie flat naturally on ceiling
			return [0, canvasRot, 0]
		} else {
			// Light bars: rotate 90° on X-axis to make horizontal (lie flat on ceiling)
			// Then apply canvas rotation on Z-axis
			return [Math.PI / 2, 0, canvasRot]
		}
	}

	// For sloped ceilings: use ceiling normal to determine fixture orientation
	const normal = new Vector3(ceilingNormal.x, ceilingNormal.y, ceilingNormal.z).normalize()
	const defaultUp = new Vector3(0, 1, 0)  // Default ceiling points up
	const lookDir = normal.multiplyScalar(-1)  // Fixtures face downward from ceiling

	const quat = new Quaternion()
	quat.setFromUnitVectors(defaultUp, lookDir)

	// For future: convert quaternion to Euler angles for sloped ceiling support
	if (isNaturallyFlat) {
		return [0, 0, canvasRot]
	} else {
		return [Math.PI / 2, 0, canvasRot]
	}
}

function ModelComponent({
	source,
	scale,
	color,
	position,
	rotation,
	componentType,
	ceilingNormal,
}: {
	source: Group
	scale: number
	color: string
	position: [number, number, number]
	rotation: number
	componentType: string
	ceilingNormal?: { x: number; y: number; z: number }
}) {
	// Determine model type for proper scaling
	const modelType = componentType === 'light-bar' ? 'light-bar' : componentType === 'hub' ? 'hub' : 'connector'
	
	const model = useMemo(
		() => cloneAndScale(source, scale, color, modelType),
		[source, scale, color, modelType]
	)

	const fixRotation = getFixtureRotationFromNormal(componentType, ceilingNormal, rotation)

	return (
		<group position={position} rotation={fixRotation}>
			{/* Debug: Show position marker at pivot point */}
			<mesh position={[0, 0, 0]}>
				<sphereGeometry args={[0.01, 8, 8]} />
				<meshBasicMaterial color="red" />
			</mesh>
			<primitive object={model} />
		</group>
	)
}

function CeilingLights3DContent() {
	const components = useCeilingDesignerStore((s) => s.components)
	const getComponentPosition = useCeilingDesignerStore((s) => s.getComponentPosition)
	const ceilingWidth = useCeilingDesignerStore((s) => s.ceilingWidth)
	const ceilingHeight = useCeilingDesignerStore((s) => s.ceilingHeight)
	const roomParams = useRoomBuilderStore((s) => s.roomParams)

	const [hubSrc, lb18Src, lb36Src, tSrc, crossSrc, l45Src, r45Src, l90Src, r90Src, ySrc] = useLoader(
		FBXLoader,
		ALL_PATHS as unknown as string[]
	) as Group[]

	const toWorld = useMemo(() => {
		const sx = roomParams.width / (ceilingWidth || 1)
		const sz = roomParams.depth / (ceilingHeight || 1)
		const yPos = roomParams.height - 0.02
		return (px: number, py: number) => ({
			x: px * sx - roomParams.width / 2,
			y: yPos,
			z: py * sz - roomParams.depth / 2,
		})
	}, [roomParams, ceilingWidth, ceilingHeight])

	const fbxByType: Record<string, Group> = useMemo(
		() => ({
			hub: hubSrc,
			't-connector': tSrc,
			'cross-connector': crossSrc,
			'45-left-elbow': l45Src,
			'45-right-elbow': r45Src,
			'90-connector-left': l90Src,
			'90-connector-right': r90Src,
			'y-connector': ySrc,
		}),
		[hubSrc, tSrc, crossSrc, l45Src, r45Src, l90Src, r90Src, ySrc]
	)

	if (components.length === 0) return null

	// Calculate proper scale factors to match 2D canvas positioning
	// In 2D: HUB_RADIUS = 24px, CONNECTOR_SIZE = 28px, INCHES_TO_PX = 4
	// Port distances from center:
	// - Hub: HUB_RADIUS + 4 = 28px
	// - Light bar: (length * INCHES_TO_PX) / 2
	// - Connector: CONNECTOR_SIZE / 2 + 4 = 18px
	
	// Convert canvas pixels to meters for 3D
	const canvasToMeters = roomParams.width / (ceilingWidth || 1)
	
	// Hub should be ~0.12m (5 inches) in diameter in 3D - smaller to close gap
	const hubScaleM = 0.12
	
	// Connectors should be ~0.05m (2 inches) in 3D
	const connectorScaleM = 0.05

	return (
		<group name='ceiling-lights'>
			{/* DEBUG: Draw connection lines between ports */}
			{components.map((comp) => {
				if (!comp.parentId) return null
				
				const parent = components.find(c => c.id === comp.parentId)
				if (!parent) return null
				
				const compPos = getComponentPosition(comp.id)
				const parentPos = getComponentPosition(parent.id)
				if (!compPos || !parentPos) return null
				
				const parentWorld = toWorld(parentPos.x, parentPos.y)
				const childWorld = toWorld(compPos.x, compPos.y)
				
				// Calculate parent port position
				const parentPort = parent.ports.find(p => p.connectedTo === comp.id)
				if (!parentPort) return null
				
				const portDistPx = parent.type === 'hub' ? 28 : 18
				const portDistMeters = portDistPx * canvasToMeters
				const parentRotRad = (parentPos.rotation * Math.PI) / 180
				const portAngleRad = parentRotRad + (parentPort.angle * Math.PI) / 180
				const parentPortX = parentWorld.x + Math.sin(portAngleRad) * portDistMeters
				const parentPortZ = parentWorld.z - Math.cos(portAngleRad) * portDistMeters
				
				// Calculate child port position (for light bar, it's the adjusted position)
				let childPortX = childWorld.x
				let childPortZ = childWorld.z
				
				if (comp.type === 'light-bar') {
					const lb = comp as LightBarComponent
					const portOffsetPx = (lb.length * 4) / 2
					const portOffsetMeters = portOffsetPx * canvasToMeters
					const rotRad = (compPos.rotation * Math.PI) / 180
					const portAngleRad = rotRad + Math.PI
					childPortX = childWorld.x + Math.sin(portAngleRad) * portOffsetMeters
					childPortZ = childWorld.z - Math.cos(portAngleRad) * portOffsetMeters
				}
				
				return (
					<group key={`connection-${comp.id}`}>
						{/* Line connecting the two ports */}
						<mesh>
							<bufferGeometry>
								<bufferAttribute
									attach="attributes-position"
									count={2}
									itemSize={3}
									array={new Float32Array([
										parentPortX, parentWorld.y, parentPortZ,
										childPortX, childWorld.y, childPortZ
									])}
									args={[new Float32Array([
										parentPortX, parentWorld.y, parentPortZ,
										childPortX, childWorld.y, childPortZ
									]), 3]}
								/>
							</bufferGeometry>
							<lineBasicMaterial color="lime" />
						</mesh>
						{/* Sphere at parent port */}
						<mesh position={[parentPortX, parentWorld.y, parentPortZ]}>
							<sphereGeometry args={[0.02, 8, 8]} />
							<meshBasicMaterial color="lime" />
						</mesh>
						{/* Sphere at child port */}
						<mesh position={[childPortX, childWorld.y, childPortZ]}>
							<sphereGeometry args={[0.02, 8, 8]} />
							<meshBasicMaterial color="cyan" />
						</mesh>
					</group>
				)
			})}
			
			{components.map((comp) => {
				const compPos = getComponentPosition(comp.id)
				if (!compPos) return null

				const wpos = toWorld(compPos.x, compPos.y)
				const rotRad = (compPos.rotation * Math.PI) / 180
				const color = comp.color === 'black' ? '#1a1a1a' : '#f0f0f0'

				// DEBUG: Log ALL component positioning
				console.log(`Component ${comp.id} (${comp.type}): canvas=(${compPos.x},${compPos.y}) → world=(${wpos.x.toFixed(3)},${wpos.y.toFixed(3)},${wpos.z.toFixed(3)}) rot=${compPos.rotation}°`)

				let pos: [number, number, number] = [wpos.x, wpos.y, wpos.z]

				// DEBUG: Draw connection lines between parent and child
				if (comp.parentId) {
					const parent = components.find(c => c.id === comp.parentId)
					if (parent) {
						const parentPos = getComponentPosition(parent.id)
						if (parentPos) {
							const parentWorld = toWorld(parentPos.x, parentPos.y)
							
							// Calculate parent's port position in 3D
							const parentPort = parent.ports.find(p => p.connectedTo === comp.id)
							if (parentPort) {
								// Port distance from center in canvas pixels
								const portDistPx = parent.type === 'hub' ? 28 : 18 // HUB_RADIUS + 4 or CONNECTOR_SIZE/2 + 4
								const portDistMeters = portDistPx * canvasToMeters
								
								// Port angle in radians
								const parentRotRad = (parentPos.rotation * Math.PI) / 180
								const portAngleRad = parentRotRad + (parentPort.angle * Math.PI) / 180
								
								// Port position in 3D
								const parentPortX = parentWorld.x + Math.sin(portAngleRad) * portDistMeters
								const parentPortZ = parentWorld.z - Math.cos(portAngleRad) * portDistMeters
								
								console.log(`  → Connected to ${parent.id}: parent canvas=(${parentPos.x},${parentPos.y}) world=(${parentWorld.x.toFixed(3)},${parentWorld.z.toFixed(3)})`)
								console.log(`  → Parent port at angle ${parentPort.angle}°: port world=(${parentPortX.toFixed(3)},${parentPortZ.toFixed(3)})`)
								console.log(`  → Distance check: parent port=(${parentPortX.toFixed(3)},${parentPortZ.toFixed(3)}) vs child pos=(${pos[0].toFixed(3)},${pos[2].toFixed(3)})`)
							}
						}
					}
				}

				if (comp.type === 'light-bar') {
					const lb = comp as LightBarComponent
					const lightColor = lb.lightMode === 'rgb' ? '#ffccff' : '#fffde0'

					// Convert length from inches to meters for proper scaling
					// Add 20% extra length to compensate for FBX model geometry offset
					const barLengthMeters = (lb.length * 0.0254) * 1.2 // inches to meters + 20% compensation
					
					// CRITICAL FIX: Position the light bar so its connection port (p0) aligns with parent port
					// The store gives us the light bar's CENTER position
					// But we need to position it so its PORT (at 180° from rotation) connects to parent
					
					// Find parent port position
					const parent = components.find(c => c.id === comp.parentId)
					let finalPos = pos
					
					if (parent) {
						const parentPos = getComponentPosition(parent.id)
						if (parentPos) {
							const parentWorld = toWorld(parentPos.x, parentPos.y)
							const parentPort = parent.ports.find(p => p.connectedTo === comp.id)
							
							if (parentPort) {
								// Calculate parent port position in 3D
								const portDistPx = parent.type === 'hub' ? 28 : 18
								const portDistMeters = portDistPx * canvasToMeters
								const parentRotRad = (parentPos.rotation * Math.PI) / 180
								const portAngleRad = parentRotRad + (parentPort.angle * Math.PI) / 180
								const parentPortX = parentWorld.x + Math.sin(portAngleRad) * portDistMeters
								const parentPortZ = parentWorld.z - Math.cos(portAngleRad) * portDistMeters
								
								// Light bar's connection port (p0) is at 180° from its rotation
								// Distance from center to port
								const lightPortOffsetPx = (lb.length * 4) / 2
								const lightPortOffsetMeters = lightPortOffsetPx * canvasToMeters
								
								// The light bar is rotated at 90°, and its port is at 180° relative to that
								// So the port direction is: rotation + 180° = 90° + 180° = 270°
								// To find where the CENTER should be, we go OPPOSITE direction from port
								// If port is at angle A from center, center is at angle A+180° from port
								const lightPortAngleRad = rotRad + Math.PI // Port direction from center
								
								// To position center from port, go opposite direction
								const centerFromPortAngleRad = lightPortAngleRad + Math.PI
								const centerOffsetX = Math.sin(centerFromPortAngleRad) * lightPortOffsetMeters
								const centerOffsetZ = -Math.cos(centerFromPortAngleRad) * lightPortOffsetMeters
								
								// Position light bar center so its port aligns with parent port
								finalPos = [
									parentPortX + centerOffsetX,
									pos[1],
									parentPortZ + centerOffsetZ
								]
								
								console.log(`  → Light bar calc: rotation=${compPos.rotation}°, portOffset=${lightPortOffsetMeters.toFixed(3)}m`)
								console.log(`  → Light bar repositioned: parent port=(${parentPortX.toFixed(3)},${parentPortZ.toFixed(3)}), final center=(${finalPos[0].toFixed(3)},${finalPos[2].toFixed(3)})`)
								
								// Verify: calculate where the port would be with this center position
								const verifyPortX = finalPos[0] + Math.sin(lightPortAngleRad) * lightPortOffsetMeters
								const verifyPortZ = finalPos[2] - Math.cos(lightPortAngleRad) * lightPortOffsetMeters
								console.log(`  → Verification: light bar port should be at (${verifyPortX.toFixed(3)},${verifyPortZ.toFixed(3)})`)
							}
						}
					}
					
					return (
						<group key={comp.id}>
							<ModelComponent
								source={lb.length === 18 ? lb18Src : lb36Src}
								scale={barLengthMeters}
								color={color}
								position={finalPos}
								rotation={rotRad}
								componentType="light-bar"
								ceilingNormal={comp.ceilingNormal}
							/>
							<pointLight
								position={[finalPos[0], finalPos[1] - 0.1, finalPos[2]]}
								intensity={0.4}
								distance={2}
								color={lightColor}
							/>
						</group>
					)
				}

				const src = fbxByType[comp.type]
				if (!src) return null

				// Use hub scale for hub, connector scale for others
				const modelScale = comp.type === 'hub' ? hubScaleM : connectorScaleM

				// For hub, we need to offset the position so the PORT (not center) is at the connection point
				let hubPos = pos
				if (comp.type === 'hub' && comp.childIds.length > 0) {
					// Hub is positioned at its center, but we need to account for port offset
					// The port is at HUB_RADIUS + 4 = 28px from center
					// We DON'T move the hub - it stays at its center position
					// The child components will connect to the hub's port
					hubPos = pos
				}

				return (
					<ModelComponent
						key={comp.id}
						source={src}
						scale={modelScale}
						color={color}
						position={hubPos}
						rotation={rotRad}
						componentType={comp.type}
						ceilingNormal={comp.ceilingNormal}
					/>
				)
			})}
		</group>
	)
}

export function CeilingLights3D() {
	return (
		<Suspense fallback={null}>
			<CeilingLights3DContent />
		</Suspense>
	)
}
