import { Suspense, useMemo } from 'react'
import { useLoader } from '@react-three/fiber'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js'
import { Box3, Group, Mesh, MeshStandardMaterial, Vector3 } from 'three'
import { useCeilingDesignerStore } from '../../store'
import { useRoomBuilderStore } from '@/store/useRoomBuilderStore'
import type { LightBarComponent } from '../../types'

// ── FBX model paths (served from /public) ────────────────────────────────────
const ALL_PATHS = [
	'/ceiling-light-models/hub.fbx',
	'/ceiling-light-models/light-18in.fbx',
	'/ceiling-light-models/light-36in.fbx',
	'/ceiling-light-models/t-connector.fbx',
	'/ceiling-light-models/cross-connector.fbx',
	'/ceiling-light-models/left-45-degree.fbx',
	'/ceiling-light-models/right-45-degree.fbx',
	'/ceiling-light-models/left-angle-connector.fbx',
	'/ceiling-light-models/right-angle-connector.fbx',
	'/ceiling-light-models/y-connector.fbx',
] as const

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Clone an FBX group, scale its longest dimension to targetMeters, and apply color.
 *  FBX files already have a ±90° X rotation baked in by Blender to orient them
 *  correctly for ceiling mounting — we must NOT override clone.rotation so those
 *  baked rotations are preserved.  We call updateMatrixWorld before computing bbox
 *  so the bounding box accounts for all child-node transforms. */
function cloneScaled(source: Group, targetMeters: number, hex: string): Group {
	const clone = source.clone(true) as Group

	// Ensure all child matrices are up-to-date before bbox computation
	clone.updateMatrixWorld(true)

	// Scale to fit targetMeters on the longest axis
	const box = new Box3().setFromObject(clone)
	const size = box.getSize(new Vector3())
	const maxDim = Math.max(size.x, size.y, size.z)
	if (maxDim > 0.0001) clone.scale.multiplyScalar(targetMeters / maxDim)

	// Re-center after scaling so bounding-box centre sits at origin
	clone.updateMatrixWorld(true)
	const box2 = new Box3().setFromObject(clone)
	const centre = box2.getCenter(new Vector3())
	clone.position.sub(centre)

	// Override every mesh's material with the chosen colour
	const mat = new MeshStandardMaterial({ color: hex, metalness: 0.4, roughness: 0.5 })
	clone.traverse((child) => {
		if ((child as Mesh).isMesh) (child as Mesh).material = mat
	})

	return clone
}

// ── Single model instance ─────────────────────────────────────────────────────

/** Renders one FBX model at ceiling position.
 *  Models are authored flat (ceiling-mount orientation) so no X/Z tilt is needed.
 *  rotY spins the piece around the vertical axis to match its canvas rotation. */
function CeilingFbxModel({
	source,
	targetMeters,
	color,
	position,
	rotY,
}: {
	source: Group
	targetMeters: number
	color: string
	position: [number, number, number]
	rotY: number
}) {
	const obj = useMemo(
		() => cloneScaled(source, targetMeters, color),
		[source, targetMeters, color],
	)

	return (
		<group position={position} rotation={[0, rotY, 0]}>
			<primitive object={obj} />
		</group>
	)
}

// ── Main renderer (needs Suspense) ────────────────────────────────────────────

function CeilingLights3DContent() {
	const components   = useCeilingDesignerStore((s) => s.components)
	const ceilingWidth = useCeilingDesignerStore((s) => s.ceilingWidth)
	const ceilingHeight = useCeilingDesignerStore((s) => s.ceilingHeight)
	const roomParams   = useRoomBuilderStore((s) => s.roomParams)

	// Load all models in one batch (hook always called – satisfies Rules of Hooks)
	const [
		hubSrc, lb18Src, lb36Src,
		tSrc, crossSrc,
		l45Src, r45Src,
		l90Src, r90Src,
		ySrc,
	] = useLoader(FBXLoader, ALL_PATHS as unknown as string[]) as Group[]

	// 2D-canvas-px → 3D-world-meters mapping
	const toWorld = useMemo(() => {
		const sx   = roomParams.width  / (ceilingWidth  || 1)
		const sz   = roomParams.depth  / (ceilingHeight || 1)
		const yPos = roomParams.height - 0.02  // just below ceiling mesh
		return (px: number, py: number) => ({
			x: px * sx - roomParams.width  / 2,
			y: yPos,
			z: py * sz - roomParams.depth  / 2,
		})
	}, [roomParams, ceilingWidth, ceilingHeight])

	// Connector target size in metres (scaled from canvas CONNECTOR_SIZE=28px)
	const connectorM = (28 / (ceilingWidth || 1)) * roomParams.width

	const fbxByType: Record<string, Group> = useMemo(
		() => ({
			hub:                  hubSrc,
			't-connector':        tSrc,
			'cross-connector':    crossSrc,
			'45-left-elbow':      l45Src,
			'45-right-elbow':     r45Src,
			'90-connector-left':  l90Src,
			'90-connector-right': r90Src,
			'y-connector':        ySrc,
		}),
		[hubSrc, tSrc, crossSrc, l45Src, r45Src, l90Src, r90Src, ySrc],
	)

	if (components.length === 0) return null

	return (
		<group name='ceiling-lights'>
			{components.map((comp) => {
				const wpos  = toWorld(comp.x, comp.y)
				const color = comp.color === 'black' ? '#1a1a1a' : '#f0f0f0'
				const rotY  = -(comp.rotation * Math.PI) / 180
				const pos: [number, number, number] = [wpos.x, wpos.y, wpos.z]

				if (comp.type === 'light-bar') {
					const lb = comp as LightBarComponent
					// Canvas INCHES_TO_PX = 4, so px length = length * 4
					const lengthM     = ((lb.length * 4) / (ceilingWidth || 1)) * roomParams.width
					const src         = lb.length === 18 ? lb18Src : lb36Src
					const lightColor  = lb.lightMode === 'rgb' ? '#ffccff' : '#fffde0'

					return (
						<group key={comp.id} position={pos} rotation={[0, rotY, 0]}>
							<CeilingFbxModel
								source={src}
								targetMeters={lengthM}
								color={color}
								position={[0, 0, 0]}
								rotY={0}
							/>
							<pointLight
								position={[0, -0.1, 0]}
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
					<CeilingFbxModel
						key={comp.id}
						source={src}
						targetMeters={connectorM}
						color={color}
						position={pos}
						rotY={rotY}
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

// ── Public export (self-contained Suspense) ───────────────────────────────────

export function CeilingLights3D() {
	return (
		<Suspense fallback={null}>
			<CeilingLights3DContent />
		</Suspense>
	)
}
