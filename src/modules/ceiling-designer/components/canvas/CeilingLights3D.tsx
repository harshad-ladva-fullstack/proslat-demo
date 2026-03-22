import { Suspense, useMemo } from 'react'
import { useLoader } from '@react-three/fiber'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js'
import { Group, Mesh, MeshStandardMaterial, Vector3, Box3, Quaternion } from 'three'
import { useCeilingDesignerStore } from '../../store'
import { useRoomBuilderStore } from '@/store/useRoomBuilderStore'
import type { LightBarComponent } from '../../types'

const ALL_PATHS = [
	'/New/Hub.fbx',
	'/New/18in Light.fbx',
	'/New/36in Light.fbx',
	'/New/T Connector.fbx',
	'/New/Cross Connector.fbx',
	'/New/45Degree Left.fbx',
	'/New/45Degree Rightt.fbx',
	'/New/Left Angle Connector.fbx',
	'/New/Right Angle Connector.fbx',
	'/New/Y Connector.fbx',
] as const

function cloneAndScale(source: Group, targetMeters: number, color: string): Group {
	const clone = source.clone(true) as Group
	clone.updateMatrixWorld(true)

	const box = new Box3().setFromObject(clone)
	const size = box.getSize(new Vector3())
	const maxDim = Math.max(size.x, size.y, size.z)
	if (maxDim > 0.0001) {
		clone.scale.multiplyScalar(targetMeters / maxDim)
	}

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

function getCenterOffset(model: Group): [number, number, number] {
	const box = new Box3().setFromObject(model)
	const center = box.getCenter(new Vector3())
	return [-center.x, -center.y, -center.z]
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
			return [0, 0, canvasRot]
		} else {
			// Light bars and cross-connectors need 90° X-tilt to lie horizontally
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
	const model = useMemo(
		() => cloneAndScale(source, scale, color),
		[source, scale, color]
	)

	const fixRotation = getFixtureRotationFromNormal(componentType, ceilingNormal, rotation)

	return (
		<group position={position} rotation={fixRotation}>
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

	const connectorScaleM = (28 / (ceilingWidth || 1)) * roomParams.width

	return (
		<group name='ceiling-lights'>
			{components.map((comp) => {
				const compPos = getComponentPosition(comp.id)
				if (!compPos) return null

				const wpos = toWorld(compPos.x, compPos.y)
				const rotRad = (compPos.rotation * Math.PI) / 180
				const color = comp.color === 'black' ? '#1a1a1a' : '#f0f0f0'

				// DEBUG: Log child component positioning
				if (comp.parentId) {
					console.log(`Component ${comp.id} (${comp.type}): canvas=${compPos.x},${compPos.y} → world=${wpos.x},${wpos.z} rot=${compPos.rotation}°`)
				}

				// Position offset: for light bars, shift back so p0 port aligns at calculated position
				// p0 is at 180°, so we offset backward (opposite to rotation direction)
				let pos: [number, number, number] = [wpos.x, wpos.y, wpos.z]

				if (comp.type === 'light-bar') {
					const lb = comp as LightBarComponent
					const barScaleM = ((lb.length * 4) / (ceilingWidth || 1)) * roomParams.width
					const lightColor = lb.lightMode === 'rgb' ? '#ffccff' : '#fffde0'

					// Position is already calculated correctly by store (includes offset)
					// No additional offset needed here

					return (
						<group key={comp.id}>
							<ModelComponent
								source={lb.length === 18 ? lb18Src : lb36Src}
								scale={barScaleM}
								color={color}
								position={pos}
								rotation={rotRad}
								componentType="light-bar"
								ceilingNormal={comp.ceilingNormal}
							/>
							<pointLight
								position={[pos[0], pos[1] - 0.1, pos[2]]}
								intensity={0.4}
								distance={2}
								color={lightColor}
							/>
						</group>
					)
				}

				const src = fbxByType[comp.type]
				if (!src) return null

				return (
					<ModelComponent
						key={comp.id}
						source={src}
						scale={connectorScaleM}
						color={color}
						position={pos}
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
