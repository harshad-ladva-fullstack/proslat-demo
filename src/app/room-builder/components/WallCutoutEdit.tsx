import { useState, useEffect, useRef } from 'react'
import { BoxGeometry, Box3, Mesh } from 'three'
import { useRoomBuilderStore } from '@/store/useRoomBuilderStore'
import {
	DEFAULT_CUTOUT_WIDTH,
	DEFAULT_DOOR_HEIGHT,
	DEFAULT_WINDOW_HEIGHT,
	DEFAULT_DOOR_FIXED_Y,
	DEFAULT_WINDOW_FIXED_Y,
	DEFAULT_CUTOUT_DEPTH,
} from '@/lib/wall-actions'
import { Button } from '@/components/ui/button'

export const WallCutoutEdit = () => {
	const {
		editingCutoutMesh,
		editingCutoutPosition,
		editingCutoutType,
		setIsWallContextMenuOpen,
		setEditingCutoutMesh,
		setEditingCutoutPosition,
		setEditingCutoutType,
	} = useRoomBuilderStore()

	const mesh = editingCutoutMesh
	const pos = editingCutoutPosition
	const type = (editingCutoutType as 'door' | 'window') || 'door'

	const [width, setWidth] = useState<number>(
		mesh?.userData.logicalWidth ??
			mesh?.userData.originalWidth ??
			DEFAULT_CUTOUT_WIDTH
	)
	const [height, setHeight] = useState<number>(
		mesh?.userData.logicalHeight ??
			mesh?.userData.originalHeight ??
			(type === 'window' ? DEFAULT_WINDOW_HEIGHT : DEFAULT_DOOR_HEIGHT)
	)
	// flag to avoid applying previous state's width/height/y to a newly selected mesh
	const justSwitchedRef = useRef(false)

	// ensure the flag is set immediately when mesh changes (runs before other effects declared after)
	useEffect(() => {
		justSwitchedRef.current = true
	}, [mesh?.uuid])

	const [y, setY] = useState<number>(() => {
		if (
			mesh?.userData?.originalFixedY !== undefined &&
			mesh?.userData?.originalFixedY !== null
		)
			return mesh.userData.originalFixedY

		if (mesh && mesh.parent) {
			const parent = mesh.parent as Mesh
			const wallBox = new Box3().setFromObject(parent)
			const wallBottomWorld = wallBox.min.clone()
			const wallBottomLocal = parent.worldToLocal(wallBottomWorld)
			const originalHeight =
				mesh.userData?.originalHeight ??
				(type === 'window' ? DEFAULT_WINDOW_HEIGHT : DEFAULT_DOOR_HEIGHT)
			return mesh.position.y - wallBottomLocal.y - originalHeight / 2
		}

		return (
			pos?.y ??
			(type === 'window' ? DEFAULT_WINDOW_FIXED_Y : DEFAULT_DOOR_FIXED_Y)
		)
	})

	useEffect(() => {
		if (!mesh) return
		console.log(
			'WallCutoutEdit: apply effect run for mesh',
			mesh?.uuid,
			'state',
			{ width, height, y },
			'userData before',
			mesh?.userData
		)
		// if we just switched selection, skip one apply to avoid overwriting new mesh with old values
		if (justSwitchedRef.current) {
			justSwitchedRef.current = false
			return
		}
		if (mesh.geometry) mesh.geometry.dispose()
		mesh.geometry = new BoxGeometry(width, height, DEFAULT_CUTOUT_DEPTH)
		// persist edited values into userData - logical fields are the source of truth
		mesh.userData.logicalWidth = width
		mesh.userData.logicalHeight = height
		mesh.userData.originalWidth = width
		mesh.userData.originalHeight = height
		mesh.userData.originalFixedY = y

		const parent = mesh.parent as Mesh | undefined
		if (parent) {
			const wallBox = new Box3().setFromObject(parent)
			const wallBottomWorld = wallBox.min.clone()
			const wallBottomLocal = parent.worldToLocal(wallBottomWorld)
			mesh.position.y = wallBottomLocal.y + y + height / 2
		} else {
			mesh.position.y = y
		}

		mesh.updateMatrixWorld(true)
		if (mesh.parent) mesh.parent.updateMatrixWorld(true)

		// round stored values slightly for cleaner display
		const round = (v: number) => Math.round(v * 100) / 100
		if (typeof mesh.userData.logicalWidth === 'number')
			mesh.userData.logicalWidth = round(mesh.userData.logicalWidth)
		if (typeof mesh.userData.logicalHeight === 'number')
			mesh.userData.logicalHeight = round(mesh.userData.logicalHeight)
		if (typeof mesh.userData.originalFixedY === 'number')
			mesh.userData.originalFixedY = round(mesh.userData.originalFixedY)
	}, [mesh, width, height, y])

	// when a new mesh is selected, initialize inputs from it
	useEffect(() => {
		console.log(
			'WallCutoutEdit: selection changed -> mesh',
			mesh?.uuid,
			'userData',
			mesh?.userData
		)
		if (!mesh) return
		setWidth(
			mesh.userData.logicalWidth ??
				mesh.userData.originalWidth ??
				DEFAULT_CUTOUT_WIDTH
		)
		setHeight(
			mesh.userData.logicalHeight ??
				mesh.userData.originalHeight ??
				(type === 'window' ? DEFAULT_WINDOW_HEIGHT : DEFAULT_DOOR_HEIGHT)
		)
		if (
			mesh.userData?.originalFixedY !== undefined &&
			mesh.userData?.originalFixedY !== null
		) {
			setY(mesh.userData.originalFixedY)
		} else if (mesh.parent) {
			const parent = mesh.parent as Mesh
			const wallBox = new Box3().setFromObject(parent)
			const wallBottomWorld = wallBox.min.clone()
			const wallBottomLocal = parent.worldToLocal(wallBottomWorld)
			const originalHeight =
				mesh.userData?.originalHeight ??
				(type === 'window' ? DEFAULT_WINDOW_HEIGHT : DEFAULT_DOOR_HEIGHT)
			setY(mesh.position.y - wallBottomLocal.y - originalHeight / 2)
		} else {
			setY(
				pos?.y ??
					(type === 'window' ? DEFAULT_WINDOW_FIXED_Y : DEFAULT_DOOR_FIXED_Y)
			)
		}
	}, [mesh?.uuid, mesh, pos?.y, type])

	if (!mesh) return null

	return (
		<div>
			<h4 className='font-semibold mb-2'>
				Edit {type === 'door' ? 'Door' : 'Window'}
			</h4>

			<label className='block text-sm mb-1'>Width</label>
			<input
				className='w-full mb-2 p-1 border rounded'
				type='number'
				step='0.01'
				value={width}
				onChange={e => {
					const v = Number(e.target.value)
					setWidth(v)
					if (mesh) mesh.userData.logicalWidth = v
				}}
			/>

			<label className='block text-sm mb-1'>Height</label>
			<input
				className='w-full mb-2 p-1 border rounded'
				type='number'
				step='0.01'
				value={height}
				onChange={e => {
					const v = Number(e.target.value)
					setHeight(v)
					if (mesh) {
						mesh.userData.logicalHeight = v
						mesh.userData.originalHeight = v
						const parent = mesh.parent as Mesh | undefined
						if (parent) {
							const wallBox = new Box3().setFromObject(parent)
							const wallBottomWorld = wallBox.min.clone()
							const wallBottomLocal = parent.worldToLocal(wallBottomWorld)
							mesh.position.y = wallBottomLocal.y + y + v / 2
						} else {
							mesh.position.y = y + v / 2
						}
					}
				}}
			/>

			<label className='block text-sm mb-1'>Y position</label>
			<input
				className='w-full mb-3 p-1 border rounded'
				type='number'
				step='0.01'
				value={y}
				onChange={e => {
					const v = Number(e.target.value)
					setY(v)
					if (mesh) {
						mesh.userData.originalFixedY = v
						// recompute actual mesh.position.y relative to wall bottom using current height
						const parent = mesh.parent as Mesh | undefined
						if (parent) {
							const wallBox = new Box3().setFromObject(parent)
							const wallBottomWorld = wallBox.min.clone()
							const wallBottomLocal = parent.worldToLocal(wallBottomWorld)
							mesh.position.y = wallBottomLocal.y + v + (height ?? 0) / 2
						} else {
							mesh.position.y = v + (height ?? 0) / 2
						}
					}
				}}
			/>

			<div className='flex gap-2'>
				<Button
					className='w-full'
					onClick={() => {
						setEditingCutoutMesh(null)
						setEditingCutoutPosition(null)
						setEditingCutoutType(null)
						setIsWallContextMenuOpen(false)
					}}
				>
					Close
				</Button>
			</div>
		</div>
	)
}
