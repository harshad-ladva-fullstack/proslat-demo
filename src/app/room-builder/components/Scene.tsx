import { useEffect, useMemo, Suspense, useRef } from 'react'
import { useLocation, useMatch } from 'react-router-dom'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera } from '@react-three/drei'
import {
	ACESFilmicToneMapping,
	Box3,
	Object3D,
	Quaternion,
	SRGBColorSpace,
	Vector3,
} from 'three'
import { Loader } from '@react-three/drei'

import { useRoomBuilderStore } from '@/store/useRoomBuilderStore'
import { TILE_SIZE, FLOOR_TILES } from '@/constants/floor-tiles'
import { loadModelFromBlob } from '@/lib/utils'
import { generateRoom } from '@/lib/roomGenerator'
import { DropControl } from './DropControl'
import { SceneSaver } from './SceneSaver'
import { PreloadAllModels } from './ModelLoader'
import { WallContextMenu } from '@/components/wall-context-menu/WallContextMenu'
import { CutoutClickHandler } from '@/components/cutouts/CutoutClickHandler'
import { CutoutDragControls } from '@/components/cutouts/CutoutDragControls'

import { DragControlsWrapper } from './DragControls'
import { ModelContainer } from '@/components/models/ModelContainer'
import { RoomDimensions } from '@/components/models/RoomDimensions'
import {
	FloorTilesRenderer,
	FloorClickHandler,
	PreloadAllTileTextures,
} from '@/components/floor-tiles'
import { QUERY_KEYS } from '@/constants/query-keys'
import { useQuery } from '@tanstack/react-query'
import { fetchGetProjectById } from '@/api/project'
import { SceneExporter } from './SceneExport'
import { transformToInches } from '@/lib/functions'
import { Button } from '@/components/ui/button'
import { CollisionChecker } from '@/modules/collision-checker/CollisionChecker'
import { CameraControls } from '@/modules/camera-controls/CameraControls'
import { SceneLighting } from '@/modules/lighting/SceneLighting'
import { CeilingLights3D } from '@/modules/ceiling-designer/components/canvas/CeilingLights3D'
import { WallIndicator } from '@/components/wall-indicator/WallIndicator'
import type { ITile } from '@/types/tiles'
import { fetchGetTiles } from '@/api/tiles'

interface SceneProps {
	id?: string
}

export const Scene = ({ id }: SceneProps) => {
	const roomRef = useRef<Object3D>(null)

	const location = useLocation()

	const {
		roomGroup,
		addRoomModel,
		clearRoomModel,
		isCustomRoom,
		roomModel,
		cabinets,
		camControlDisabled,
		selectedCabinetId,
		setCabinets,
		setSelectedCabinetId,
		setSelectedModelRef,
		toggleShowDimensions,
		showDimensions,
		ghostDistances,
		selectSceneSetting,
		setFloorTiles,
		floorTilesEnabled,
		toggleFloorTilesEnabled,
		floorMesh,
		resetProjectState,
		// floorTiles (intentionally not read here)
	} = useRoomBuilderStore()

	const containerWidth = useMemo(() => {
		if (selectSceneSetting !== 'default' || selectedCabinetId !== null) {
			return 'calc(100vw - 430px)'
		}
		return '100vw'
	}, [selectSceneSetting, selectedCabinetId])
	// location needed

	const offsetY = useMemo(() => {
		if (!roomModel) return 0
		const box = new Box3().setFromObject(roomModel)
		const size = new Vector3()
		box.getSize(size)
		return -box.min.y - 0.1
	}, [roomModel])

	const currentRoomModel = useMemo(() => {
		if (isCustomRoom && roomGroup) {
			return { model: roomGroup, position: [0, 0, 0] as const }
		}
		if (!isCustomRoom && roomModel) {
			return { model: roomModel, position: [0, offsetY, 0] as const }
		}
		return null
	}, [isCustomRoom, roomGroup, roomModel, offsetY])

	// When in create-tiles or ramps editor we want to render ONLY the floor mesh
	// (hide walls and other room elements). Collect floor meshes for conditional rendering.
	const floorOnlyMeshes = useMemo(() => {
		if (!currentRoomModel?.model) return [] as Object3D[]
		const out: Object3D[] = []
		currentRoomModel.model.traverse((child: Object3D) => {
			if (child.name && child.name.includes('floor') && child.type === 'Mesh') {
				out.push(child)
			}
		})
		return out
	}, [currentRoomModel])

	const { data: projectData } = useQuery({
		queryKey: [id, QUERY_KEYS.project],
		queryFn: () => fetchGetProjectById(Number(id)),
		enabled: !!id,
	})

	useMemo(() => {
		if (isCustomRoom && roomGroup) {
			return {
				roomWidth: roomGroup.userData?.width || 5,
				roomDepth: roomGroup.userData?.depth || 5,
			}
		}

		if (currentRoomModel?.model) {
			let floorMesh: Object3D | null = null
			currentRoomModel.model.traverse(child => {
				if (child.name?.includes('floor') && child.type === 'Mesh') {
					floorMesh = child
				}
			})

			if (floorMesh) {
				const box = new Box3().setFromObject(floorMesh)
				const size = new Vector3()
				box.getSize(size)

				return {
					roomWidth: Math.abs(size.x),
					roomDepth: Math.abs(size.z),
				}
			}

			if (
				currentRoomModel.model.userData?.width &&
				currentRoomModel.model.userData?.depth
			) {
				return {
					roomWidth: currentRoomModel.model.userData.width,
					roomDepth: currentRoomModel.model.userData.depth,
				}
			}

			const box = new Box3().setFromObject(currentRoomModel.model)
			const size = new Vector3()
			box.getSize(size)

			return {
				roomWidth: Math.abs(size.x),
				roomDepth: Math.abs(size.z),
			}
		}

		return { roomWidth: 5, roomDepth: 5 }
	}, [isCustomRoom, roomGroup, currentRoomModel])

	useEffect(() => {
		if (id) {
			// Reset store to a clean state similar to a full page reload so
			// state from the previous project doesn't leak in.
			resetProjectState()
			clearRoomModel()
			setCabinets([])
		}
	}, [id, clearRoomModel, setCabinets, setFloorTiles, resetProjectState])

	useEffect(() => {
		if (!id) {
			setFloorTiles([])
		}
	}, [id, location.pathname, setFloorTiles])

	useEffect(() => {
		const loadModelFromServer = async () => {
			if (projectData?.glbUrl) {
				try {
					clearRoomModel()
					const response = await fetch(projectData.glbUrl)
					const modelBlob = await response.blob()
					const renderedGroup = await loadModelFromBlob(modelBlob)
					addRoomModel(renderedGroup)
				} catch (error) {
					console.error('Failed to load model from server:', error)
				}
			} else if (projectData && !projectData.glbUrl) {
				// No glbUrl - generate a default room
				const defaultRoom = generateRoom({
					width: 5,
					depth: 5,
					height: 3,
					wallThickness: 0.1,
					wallColor: '#ffffff',
					floorColor: '#cccccc',
				})
				addRoomModel(defaultRoom)
			}
		}
		loadModelFromServer()
	}, [addRoomModel, clearRoomModel, projectData?.glbUrl, projectData, id])

	useEffect(() => {
		if (projectData) {
			setCabinets(projectData?.models || [])
		}
	}, [projectData, setCabinets])

	// route-driven: check if we're on the ramps editor route
	const isEditRamps = !!useMatch('/room-builder/edit-room/:id/tiles/ramps')
	const isCreateTiles = !!useMatch(
		'/room-builder/edit-room/:id/tiles/create-tiles'
	)
	const match = useMatch('/room-builder/edit-room/:id/*')
	const projectId = match?.params?.id

	// store fields already destructured above (avoid redeclaration)

	// When the query returns, set the floor tiles once.
	const tilesQuery = useQuery<ITile[] | null>({
		queryKey: ['tiles', projectId],
		queryFn: async () => {
			if (!projectId) return null
			const res = await fetchGetTiles(projectId)
			return res as ITile[]
		},
		enabled: !!projectId,
		staleTime: Infinity,
		refetchOnWindowFocus: false,
		refetchOnMount: false,
		refetchOnReconnect: false,
	})

	useEffect(() => {
		if (tilesQuery.data) {
			setFloorTiles(tilesQuery.data)
		}

		// when entering the create-tiles route, ensure floor edit mode is enabled
		// and if there are no tiles loaded, fill the whole floor with default tiles
		if (isCreateTiles) {
			if (!floorTilesEnabled) {
				toggleFloorTilesEnabled()
			}

			// Always compute the full grid for the room and merge it with
			// any existing tiles returned from the query. This ensures any
			// missing cells are filled (maximal coverage) while preserving
			// tiles that were already present.
			if (floorMesh?.current || currentRoomModel?.model) {
				// Prefer explicit floorMesh for accurate raycasting. If not
				// available (custom rooms where the floor mesh wasn't named
				// 'floor'), fall back to the whole room model and fill the
				// bounding box (no raycasting) so the user gets a full tiled
				// surface.
				const target = floorMesh?.current ?? currentRoomModel?.model
				const box = new Box3().setFromObject(target as Object3D)
				const size = new Vector3()
				box.getSize(size)
				const min = box.min
				const max = box.max

				const grid: ITile[] = []
				const tileSize = TILE_SIZE || 0.41

				// Add a one-tile padding around the computed bounds to avoid
				// tiny rounding or bounding-box alignment gaps that can leave
				// a visible hole at the room edge.
				const startX = Math.floor((min.x - tileSize / 2) / tileSize) - 1
				const endX = Math.ceil((max.x + tileSize / 2) / tileSize) + 1
				const startZ = Math.floor((min.z - tileSize / 2) / tileSize) - 1
				const endZ = Math.ceil((max.z + tileSize / 2) / tileSize) + 1

				// Build full grid
				for (let x = startX; x <= endX; x++) {
					for (let z = startZ; z <= endZ; z++) {
						grid.push({ x, z, type: 'arcticWhite', useEdges: false })
					}
				}

				// Merge with existing tiles (from query) so we don't lose
				// any previously saved tiles. Existing tiles take
				// precedence; only missing cells are added.
				const existing: ITile[] =
					tilesQuery.data && tilesQuery.data.length > 0 ? tilesQuery.data : []

				// Build a map of known tile ids from FLOOR_TILES for
				// validation — existing tiles that reference unknown types
				// will be replaced by the default grid cell to avoid holes.
				const knownTileIds = new Set(FLOOR_TILES.map(t => t.id))

				const existingMap = new Map<string, ITile>()
				existing.forEach(t => existingMap.set(`${t.x}-${t.z}`, t))

				const merged: ITile[] = []
				for (const t of grid) {
					const key = `${t.x}-${t.z}`
					const existingTile = existingMap.get(key)
					if (
						existingTile &&
						existingTile.type &&
						knownTileIds.has(existingTile.type)
					) {
						// preserve this saved tile
						merged.push(existingTile)
					} else {
						// fill with default
						merged.push(t)
					}
				}

				setFloorTiles(merged)
			}
		}
	}, [
		tilesQuery.data,
		setFloorTiles,
		isCreateTiles,
		floorTilesEnabled,
		toggleFloorTilesEnabled,
		floorMesh,
		currentRoomModel,
	])

	return (
		<div
			className='w-full h-full relative'
			style={{ maxWidth: containerWidth }}
		>
			<Canvas
				shadows
				onPointerMissed={e => {
					setSelectedCabinetId(null)
					setSelectedModelRef(null)
					e.stopPropagation()
				}}
				onCreated={({ gl }) => {
					gl.localClippingEnabled = true
					gl.clippingPlanes = []
					gl.getContext().enable(gl.getContext().STENCIL_TEST)
					gl.outputColorSpace = SRGBColorSpace
					gl.toneMapping = ACESFilmicToneMapping
					gl.toneMappingExposure = 1.0
				}}
				gl={{ antialias: true, stencil: true }}
			>
				<Suspense fallback={null}>
					<color attach='background' args={['#D0D0D0']} />
					<DropControl />
					<WallContextMenu />
					<CutoutClickHandler />
					<CutoutDragControls />
					<PreloadAllModels />
					<SceneSaver />
					<CollisionChecker />
					<PreloadAllTileTextures />
					<PerspectiveCamera
						key={`camera-${
							isEditRamps ? 'ramps' : isCreateTiles ? 'tiles' : 'default'
						}`}
						makeDefault
						position={
							isEditRamps || isCreateTiles ? [0, 30, 0] : [-2, 1.5, 2.5]
						}
						fov={isEditRamps || isCreateTiles ? 45 : 75}
					/>

					{isEditRamps || isCreateTiles ? (
						<>
							<OrbitControls
								key='orbit-floor'
								enabled={!camControlDisabled}
								enableDamping={false}
								minPolarAngle={0}
								maxPolarAngle={0}
								minDistance={5}
								maxDistance={200}
								enablePan={true}
								enableRotate={false}
								target={[0, 0, 0]}
							/>
						</>
					) : (
						<>
							<CameraControls camControlDisabled={camControlDisabled} />
						</>
					)}
					<SceneLighting />
					{!isCreateTiles &&
						!isEditRamps &&
						projectData &&
						cabinets.map((cabinet, key) => {
							return cabinet && cabinet.catalogModel ? (
								<ModelContainer
									key={key}
									model={cabinet.catalogModel}
									id={cabinet.id}
									isInCorner={cabinet.isInCorner}
									attachedWallName={cabinet.attachedWallName}
									colors={cabinet.color}
									position={
										new Vector3(
											cabinet.position.x,
											cabinet.position.y,
											cabinet.position.z
										)
									}
									quaternion={
										new Quaternion(
											cabinet.quaternion.x,
											cabinet.quaternion.y,
											cabinet.quaternion.z,
											cabinet.quaternion.w
										)
									}
								/>
							) : null
						})}
					{selectedCabinetId && <DragControlsWrapper />}
					{currentRoomModel && (
						<group ref={roomRef} position={currentRoomModel.position}>
							{isCreateTiles || isEditRamps ? (
								// render only floor meshes when in tiles/ramps editor
								<>
									{floorOnlyMeshes.map((m, i) => (
										<primitive
											key={`floor-child-${i}`}
											object={m}
											onClick={(e: Event) => e.stopPropagation()}
										/>
									))}
								</>
							) : (
								<primitive
									object={currentRoomModel.model}
									onClick={(e: Event) => e.stopPropagation()}
								/>
							)}
						</group>
					)}
					{roomRef.current && showDimensions && !selectedCabinetId && (
						<RoomDimensions roomRef={roomRef} />
					)}
					<FloorTilesRenderer />
					<CeilingLights3D />

					{(isEditRamps || isCreateTiles) && <FloorClickHandler />}
					{(isEditRamps || isCreateTiles) && (
						<WallIndicator
							roomModel={currentRoomModel?.model ?? null}
							roomPosition={
								currentRoomModel?.position
									? ([
											currentRoomModel.position[0],
											currentRoomModel.position[1],
											currentRoomModel.position[2],
									  ] as [number, number, number])
									: null
							}
						/>
					)}
				</Suspense>
			</Canvas>
			<Loader />

			<div className='absolute bottom-2 right-2 z-10 flex gap-2'>
				{/* <Button onClick={toggleFloorTilesEnabled}>Edit floor</Button> */}
				<Button onClick={toggleShowDimensions}>
					{showDimensions ? 'Hide Dimensions' : 'Show Dimensions'}
				</Button>

				<SceneExporter />
			</div>
			{camControlDisabled && (
				<div className='absolute top-2 left-2 z-10 bg-black flex flex-col gap-2 rounded-lg py-1 px-3 text-white'>
					{ghostDistances.left?.distance && (
						<div className='flex gap-2  items-center'>
							<div className=' text-gray-500'>Left</div>
							{transformToInches(ghostDistances.left?.distance ?? 0)} inches
						</div>
					)}
					{ghostDistances.right?.distance && (
						<div className='flex gap-2 items-center'>
							<div className=' text-gray-500'>Right</div>
							{transformToInches(ghostDistances.right?.distance ?? 0)} inches
						</div>
					)}
					{ghostDistances.top?.distance && (
						<div className='flex gap-2 items-center'>
							<div className=' text-gray-500'>Top</div>
							{transformToInches(ghostDistances.top?.distance ?? 0)} inches
						</div>
					)}
				</div>
			)}
		</div>
	)
}
