import { useEffect, useCallback, useState } from 'react'
import { Object3D, Vector2, Raycaster, Camera, Vector3, Mesh } from 'three'
import { useThree } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import { useLocation } from 'react-router-dom'
import { checkIfElementISWall } from '@/lib/utils'
import {
	type WallAction,
	removeCutout,
	applyCutoutCSG,
	createWallCutout,
	removeAllCutouts,
	applyAllCutoutsCSG,
	DEFAULT_CUTOUT_WIDTH,
	DEFAULT_DOOR_HEIGHT,
	DEFAULT_WINDOW_HEIGHT,
	DEFAULT_DOOR_FIXED_Y,
	DEFAULT_WINDOW_FIXED_Y,
} from '@/lib/wall-actions'
import { useRoomBuilderStore } from '@/store/useRoomBuilderStore'

export const WallContextMenu = () => {
	const { scene, camera, gl } = useThree()
	const location = useLocation()
	const {
		setIsWallContextMenuOpen,
		setEditingCutoutMesh,
		setEditingCutoutPosition,
		setEditingCutoutType,
	} = useRoomBuilderStore()
	const [contextMenu, setContextMenu] = useState({
		visible: false,
		position: new Vector3(),
		wallObject: null as Object3D | null,
	})

	const getIntersectedWallObject = useCallback(
		(event: MouseEvent, camera: Camera): Object3D | null => {
			const canvas = gl.domElement
			const rect = canvas.getBoundingClientRect()

			const x = ((event.clientX - rect.left) / rect.width) * 2 - 1
			const y = -((event.clientY - rect.top) / rect.height) * 2 + 1

			const pointer = new Vector2(x, y)
			const raycaster = new Raycaster()
			raycaster.setFromCamera(pointer, camera)

			const intersects = raycaster.intersectObjects(scene.children, true)

			for (const intersect of intersects) {
				const obj = intersect.object
				if (obj.userData?.isCutout) return obj
				if (checkIfElementISWall(obj)) return obj
			}
			return null
		},
		[gl, scene]
	)

	const handleContextMenu = useCallback(
		(event: MouseEvent) => {
			const target = getIntersectedWallObject(event, camera)

			if (!target) return

			const wallMesh = (target as Mesh).userData?.isCutout
				? (target as Mesh).parent
				: target
			const parentGroup = wallMesh?.parent
			if (
				wallMesh &&
				parentGroup &&
				parentGroup.userData?.isGeneratedByRoomGenerator === true
			) {
				event.preventDefault()

				const canvas = gl.domElement
				const rect = canvas.getBoundingClientRect()
				const x = ((event.clientX - rect.left) / rect.width) * 2 - 1
				const y = -((event.clientY - rect.top) / rect.height) * 2 + 1

				const pointer = new Vector2(x, y)
				const raycaster = new Raycaster()
				raycaster.setFromCamera(pointer, camera)

				const intersects = raycaster.intersectObjects(scene.children, true)
				// find first intersect that's either cutout or wall
				const intersect = intersects.find(
					i => i.object.userData?.isCutout || checkIfElementISWall(i.object)
				)

				if (intersect) {
					setContextMenu({
						visible: true,
						position: intersect.point,
						wallObject: intersect.object,
					})
				}
			}
		},
		[getIntersectedWallObject, camera, gl, scene]
	)

	const handleCloseMenu = useCallback(() => {
		setContextMenu(prev => ({ ...prev, visible: false }))
	}, [])

	const handleActionClick = useCallback(
		(action: WallAction) => {
			if (contextMenu.wallObject && action.action) {
				action.action(contextMenu.wallObject, contextMenu.position)
			}
			handleCloseMenu()
		},
		[contextMenu.wallObject, contextMenu.position, handleCloseMenu]
	)

	// editing state is stored in the global store so the left bar can render the editor

	const cutoutActions: WallAction[] = [
		{
			id: 'remove_cutout',
			label: 'Remove',
			action: (obj: Object3D) => {
				if ((obj as Mesh).isMesh) removeCutout(obj as Mesh)
			},
		},
		{
			id: 'edit_cutout',
			label: 'Edit',
			action: (obj: Object3D) => {
				if ((obj as Mesh).isMesh) {
					const m = obj as Mesh
					console.log(
						'WallContextMenu: Edit clicked for mesh, userData=',
						m.userData
					)
					setEditingCutoutMesh(m)
					setEditingCutoutPosition(m.getWorldPosition(new Vector3()))
					setEditingCutoutType(m.userData.cutoutType || 'door')
					setIsWallContextMenuOpen(true)
				}
			},
		},
		{
			id: 'apply_cutout',
			label: 'Apply',
			action: (obj: Object3D) => {
				if ((obj as Mesh).isMesh) applyCutoutCSG(obj as Mesh)
			},
		},
	]

	const defaultWallActions: WallAction[] = [
		{
			id: 'door',
			label: 'Add Door',
			action: (wallObject, intersectionPoint) => {
				createWallCutout(
					wallObject,
					DEFAULT_CUTOUT_WIDTH,
					DEFAULT_DOOR_HEIGHT,
					intersectionPoint,
					DEFAULT_DOOR_FIXED_Y,
					'door'
				)
			},
		},
		{
			id: 'window',
			label: 'Add Window',
			action: (wallObject, intersectionPoint) => {
				createWallCutout(
					wallObject,
					DEFAULT_CUTOUT_WIDTH,
					DEFAULT_WINDOW_HEIGHT,
					intersectionPoint,
					DEFAULT_WINDOW_FIXED_Y,
					'window'
				)
			},
		},
		{
			id: 'remove_all',
			label: 'Remove all',
			action: wallObject => removeAllCutouts(wallObject),
		},
		{
			id: 'apply_cutout',
			label: 'Apply cutout',
			action: wallObject => applyAllCutoutsCSG(wallObject),
		},
	]

	useEffect(() => {
		const canvas = gl.domElement

		if (
			location.pathname !== '/room-builder' &&
			location.pathname !== '/room-builder/'
		) {
			if (contextMenu.visible) {
				setContextMenu(prev => ({ ...prev, visible: false }))
			}
			return
		}

		const handleClick = () => {
			if (contextMenu.visible) {
				setContextMenu(prev => ({ ...prev, visible: false }))
			}
		}

		canvas.addEventListener('contextmenu', handleContextMenu)
		canvas.addEventListener('click', handleClick)

		return () => {
			canvas.removeEventListener('contextmenu', handleContextMenu)
			canvas.removeEventListener('click', handleClick)
		}
	}, [gl, handleContextMenu, contextMenu.visible, location.pathname])

	return (
		<>
			{contextMenu.visible && (
				<Html
					position={contextMenu.position}
					distanceFactor={10}
					occlude={false}
					transform={false}
					sprite={false}
				>
					<div className='bg-white border border-gray-300 rounded shadow-lg min-w-[150px] max-w-[200px]'>
						{(contextMenu.wallObject?.userData?.isCutout
							? cutoutActions
							: defaultWallActions
						).map((action, index) => {
							if (action.id === 'separator') {
								return (
									<div key={index} className='border-t border-gray-200 my-1' />
								)
							}

							return (
								<button
									key={action.id}
									className='w-full px-4 py-2 text-left hover:bg-gray-100 first:rounded-t last:rounded-b flex items-center gap-2'
									onClick={() => handleActionClick(action)}
								>
									<span className='flex-1'>{action.label}</span>
								</button>
							)
						})}
					</div>
				</Html>
			)}
		</>
	)
}
