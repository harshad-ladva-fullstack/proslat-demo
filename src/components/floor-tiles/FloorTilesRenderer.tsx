import { useRef, useMemo } from 'react'
import {
	Mesh,
	RepeatWrapping,
	LinearMipmapLinearFilter,
	LinearFilter,
	Group,
	Box3,
	Vector3,
	BufferGeometry,
	Float32BufferAttribute,
	LineBasicMaterial,
	LineSegments,
	DoubleSide,
} from 'three'
import { useTexture } from '@react-three/drei'
import { useRoomBuilderStore } from '@/store/useRoomBuilderStore'
import { FLOOR_TILES, TILE_SIZE } from '@/constants/floor-tiles'
import { useThree } from '@react-three/fiber'
import { Billboard, Text3D } from '@react-three/drei'
import { METER_TO_INCH } from '@/lib/functions'

interface FloorTileProps {
	x: number
	z: number
	type: string
}

export const FloorTile = ({ x, z, type }: FloorTileProps) => {
	const meshRef = useRef<Mesh>(null)
	const gl = useThree(state => state.gl)
	const tileConfig = FLOOR_TILES.find(tile => tile.id === type)
	const texture = useTexture(tileConfig?.texture || '/images/newtile.png')
	texture.wrapS = texture.wrapT = RepeatWrapping
	texture.generateMipmaps = true
	texture.minFilter = LinearMipmapLinearFilter
	texture.magFilter = LinearFilter
	texture.anisotropy = gl.capabilities.getMaxAnisotropy()

	// No clipping: always render the tile. Trimming/clip logic removed.

	return (
		<group position={[x * TILE_SIZE, 0.01, z * TILE_SIZE]} name={`ignore`}>
			<mesh
				ref={meshRef}
				position={[0, 0.01, 0]}
				rotation={[-Math.PI / 2, 0, 0]}
				name={`ignore`}
				userData={{ name: 'tile', x, z }}
			>
				<planeGeometry args={[TILE_SIZE, TILE_SIZE]} />
				<meshStandardMaterial
					map={texture}
					transparent
					alphaTest={0.1}
					side={DoubleSide}
				/>
			</mesh>

			{/* edges primitive omitted - legacy optional GLTF rendering removed */}
		</group>
	)
}

export const FloorTilesRenderer = () => {
	const { floorTiles } = useRoomBuilderStore()
	const { showDimensions } = useRoomBuilderStore()
	const roomRef = useRef<Group | null>(null)

	// Remove duplicate tiles (same x,z). If multiple entries exist for the
	// same cell, the last one wins. This prevents rendering overlapping
	// tiles that occupy identical coordinates.
	const uniqueTiles = useMemo(() => {
		const map = new Map<string, (typeof floorTiles)[number]>()
		for (const t of floorTiles) {
			map.set(`${t.x}-${t.z}`, t)
		}
		return Array.from(map.values())
	}, [floorTiles])

	return (
		<group ref={roomRef} name='ignore'>
			{uniqueTiles.map((tile, index) => (
				<FloorTile
					key={`${tile.x}-${tile.z}-${index}`}
					x={tile.x}
					z={tile.z}
					type={tile.type}
				/>
			))}

			{showDimensions &&
				uniqueTiles.length > 0 &&
				(() => {
					// compute bounding box in world coordinates for the tile centers
					const box = new Box3()
					let first = true
					uniqueTiles.forEach(t => {
						const cx = t.x * TILE_SIZE
						const cz = t.z * TILE_SIZE
						const half = TILE_SIZE / 2
						const min = new Vector3(cx - half, 0, cz - half)
						const max = new Vector3(cx + half, 0.02, cz + half)
						if (first) {
							box.min.copy(min)
							box.max.copy(max)
							first = false
						} else {
							box.expandByPoint(min)
							box.expandByPoint(max)
						}
					})

					const size = new Vector3()
					box.getSize(size)

					// Build perimeter segments from tile occupancy. For each tile edge that
					// borders empty space, add that edge. Then merge collinear contiguous
					// segments so we end up with minimal straight runs (rect -> 4, L-shape -> 6).
					const occupied = new Set<string>()
					uniqueTiles.forEach(t => occupied.add(`${t.x},${t.z}`))

					const half = TILE_SIZE / 2
					const y = box.max.y + 0.02

					type RawSeg = {
						x1: number
						z1: number
						x2: number
						z2: number
						dir: 'h' | 'v'
					}
					const raw: RawSeg[] = []
					uniqueTiles.forEach(t => {
						const cx = t.x * TILE_SIZE
						const cz = t.z * TILE_SIZE
						const left = cx - half
						const right = cx + half
						const top = cz - half
						const bottom = cz + half

						// north (top) edge
						if (!occupied.has(`${t.x},${t.z - 1}`)) {
							raw.push({ x1: left, z1: top, x2: right, z2: top, dir: 'h' })
						}
						// east (right) edge
						if (!occupied.has(`${t.x + 1},${t.z}`)) {
							raw.push({ x1: right, z1: top, x2: right, z2: bottom, dir: 'v' })
						}
						// south (bottom) edge
						if (!occupied.has(`${t.x},${t.z + 1}`)) {
							raw.push({
								x1: right,
								z1: bottom,
								x2: left,
								z2: bottom,
								dir: 'h',
							})
						}
						// west (left) edge
						if (!occupied.has(`${t.x - 1},${t.z}`)) {
							raw.push({ x1: left, z1: bottom, x2: left, z2: top, dir: 'v' })
						}
					})

					// Merge horizontal segments by z, vertical by x
					const merged: { a: Vector3; b: Vector3; len: number }[] = []

					// horizontals
					const horiz = new Map<number, Array<[number, number]>>()
					raw
						.filter(r => r.dir === 'h')
						.forEach(r => {
							const z = r.z1
							const x1 = Math.min(r.x1, r.x2)
							const x2 = Math.max(r.x1, r.x2)
							if (!horiz.has(z)) horiz.set(z, [])
							horiz.get(z)!.push([x1, x2])
						})
					horiz.forEach((segs, z) => {
						segs.sort((a, b) => a[0] - b[0])
						let cur = segs[0]
						for (let i = 1; i < segs.length; i++) {
							const s = segs[i]
							if (s[0] <= cur[1] + 1e-6) {
								cur[1] = Math.max(cur[1], s[1])
							} else {
								merged.push({
									a: new Vector3(cur[0], y, z),
									b: new Vector3(cur[1], y, z),
									len: cur[1] - cur[0],
								})
								cur = s
							}
						}
						merged.push({
							a: new Vector3(cur[0], y, z),
							b: new Vector3(cur[1], y, z),
							len: cur[1] - cur[0],
						})
					})

					// verticals
					const vert = new Map<number, Array<[number, number]>>()
					raw
						.filter(r => r.dir === 'v')
						.forEach(r => {
							const x = r.x1
							const z1 = Math.min(r.z1, r.z2)
							const z2 = Math.max(r.z1, r.z2)
							if (!vert.has(x)) vert.set(x, [])
							vert.get(x)!.push([z1, z2])
						})
					vert.forEach((segs, x) => {
						segs.sort((a, b) => a[0] - b[0])
						let cur = segs[0]
						for (let i = 1; i < segs.length; i++) {
							const s = segs[i]
							if (s[0] <= cur[1] + 1e-6) {
								cur[1] = Math.max(cur[1], s[1])
							} else {
								merged.push({
									a: new Vector3(x, y, cur[0]),
									b: new Vector3(x, y, cur[1]),
									len: cur[1] - cur[0],
								})
								cur = s
							}
						}
						merged.push({
							a: new Vector3(x, y, cur[0]),
							b: new Vector3(x, y, cur[1]),
							len: cur[1] - cur[0],
						})
					})

					// Build geometry for all merged segments
					const positions: number[] = []
					merged.forEach(s => {
						positions.push(s.a.x, s.a.y, s.a.z, s.b.x, s.b.y, s.b.z)
					})

					const geom = new BufferGeometry()
					geom.setAttribute(
						'position',
						new Float32BufferAttribute(positions, 3)
					)

					const mat = new LineBasicMaterial({ color: 'red' })

					return (
						<>
							<primitive name='ignore' object={new LineSegments(geom, mat)} />
							{merged.map((s, idx) => {
								const mid = s.a
									.clone()
									.lerp(s.b, 0.5)
									.add(new Vector3(0, 0.05, 0))
								return (
									<Billboard
										key={`dim-${idx}`}
										name='ignore'
										position={mid}
										follow={true}
									>
										<Text3D
											font='/fonts/helvetiker_regular.typeface.json'
											size={0.04}
											height={0.01}
										>
											{(s.len * METER_TO_INCH).toFixed(1)}"
											<meshBasicMaterial color='black' />
										</Text3D>
									</Billboard>
								)
							})}
						</>
					)
				})()}
		</group>
	)
}
