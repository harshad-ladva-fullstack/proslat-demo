import { FloorTileSelector } from '@/components/floor-tiles'
import { SideBar } from '@/components/ui/sideBar'
import { Button } from '@/components/ui/button'
import { useNavigate, useMatch, useParams } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { useRoomBuilderStore } from '@/store/useRoomBuilderStore'
import {
	loadModelFromBlob,
	getModelPath,
	checkIfElementISWall,
} from '@/lib/utils'
import { Box3, Vector3, Object3D } from 'three'
import { useState } from 'react'

export const FloorSideBarSettings = () => {
	const navigate = useNavigate()
	const { id: paramId } = useParams<{ id?: string }>()
	const match = useMatch('/room-builder/edit-room/:id/*')
	const routeId = paramId ?? match?.params?.id

	const { roomModel } = useRoomBuilderStore()
	const [placing, setPlacing] = useState(false)

	const placeBaseboards = async () => {
		if (!roomModel) return
		setPlacing(true)
		try {
			const url = getModelPath('rampMale')
			const resp = await fetch(url)
			if (!resp.ok) throw new Error('Failed to fetch model')
			const blob = await resp.blob()
			const modelGroup = await loadModelFromBlob(blob)
			// collect walls
			const walls: Object3D[] = []
			roomModel.traverse((child: Object3D) => {
				if (checkIfElementISWall(child)) walls.push(child)
			})

			// room bounds used to compute inward direction and floor Y
			const roomBox = new Box3().setFromObject(roomModel)
			const roomCenter = roomBox.getCenter(new Vector3())
			const floorY = roomBox.min.y

			walls.forEach((wall: Object3D, idx: number) => {
				// initial placement at wall center so bounding boxes are meaningful
				const wallBox = new Box3().setFromObject(wall)
				const wallCenter = wallBox.getCenter(new Vector3())
				const wallSize = new Vector3()
				wallBox.getSize(wallSize)

				// inward direction: from wall center to room center (ignore Y)
				const inwardDir = roomCenter.clone().sub(wallCenter)
				inwardDir.y = 0
				if (inwardDir.lengthSq() === 0) return
				inwardDir.normalize()

				// tangent along the wall (XZ plane) - rotate inwardDir by 90deg
				const tangent = new Vector3(inwardDir.z, 0, -inwardDir.x)
				// ensure tangent is normalized
				tangent.normalize()

				// prepare a rotated template to measure ramp size when oriented correctly
				// add Math.PI so the ramp's back (not its front) faces the wall
				const template = modelGroup.clone(true)
				template.rotation.y = Math.atan2(inwardDir.x, inwardDir.z) + Math.PI

				// compute ramp bounds after rotation to determine proper offset and height
				const rampBox = new Box3().setFromObject(template)
				const rampSize = new Vector3()
				rampBox.getSize(rampSize)
				const rampHalf = rampSize.clone().multiplyScalar(0.5)

				// projection of ramp half-size along inwardDir on XZ plane (depth)
				const depthProj =
					Math.abs(inwardDir.x) * rampHalf.x +
					Math.abs(inwardDir.z) * rampHalf.z

				// projection of ramp full-size along wall tangent (length along wall)
				const rampLengthAlong =
					Math.abs(tangent.x) * rampSize.x + Math.abs(tangent.z) * rampSize.z

				// wall thickness approximated as the smaller of X/Z dimensions
				const wallThickness = Math.min(wallSize.x, wallSize.z)
				const gap = 0.01
				const offsetDistance = wallThickness / 2 + depthProj + gap

				// how long the wall is along the tangent direction
				const wallLengthAlong =
					Math.abs(tangent.x) * wallSize.x + Math.abs(tangent.z) * wallSize.z

				// determine number of ramps to tile along the wall
				const spacing = Math.max(rampLengthAlong - 0.01, 0.01)
				let count = 1
				if (rampLengthAlong > 0) {
					count = Math.max(1, Math.ceil(wallLengthAlong / spacing))
				}

				// start offset so ramps are centered along the wall
				const totalSpan = (count - 1) * spacing
				const startOffset = -totalSpan / 2

				for (let i = 0; i < count; i++) {
					const copy = modelGroup.clone(true)
					copy.rotation.y = template.rotation.y

					const along = startOffset + i * spacing
					const pos = wallCenter
						.clone()
						.add(tangent.clone().multiplyScalar(along))
						.add(inwardDir.clone().multiplyScalar(offsetDistance))

					// initially set Y to room floor baseline; we'll adjust precisely using the ramp bbox
					copy.position.copy(pos)
					// compute bounding box for this positioned copy and shift up so its bottom sits on the floor
					const placedBox = new Box3().setFromObject(copy)
					if (placedBox.isEmpty() === false) {
						const deltaY = floorY - placedBox.min.y + 0.1
						copy.position.y += deltaY
					} else {
						// fallback: use half height if bbox measurement failed
						copy.position.y = floorY + rampHalf.y + 0.1
					}
					copy.name = `rampMale_${idx}_${i}`
					roomModel.add(copy)
				}
			})
		} catch (e) {
			console.error(e)
		} finally {
			setPlacing(false)
		}
	}

	return (
		<SideBar className='z-2 !bg-white !border-white'>
			<div className='flex items-center justify-between mt-4 mb-4'>
				<h4 className='font-semibold text-[26px]'>Design your floor</h4>
			</div>
			<FloorTileSelector />

			<div className='side-bar-nav-btn !bg-white p-10'>
				<Button onClick={placeBaseboards} disabled={placing}>
					{placing ? 'Placing...' : 'Place Baseboards'}
				</Button>
				<Button
					onClick={() =>
						routeId &&
						navigate(`/room-builder/edit-room/${routeId}/tiles/create-tiles`)
					}
				>
					<ChevronLeft /> Back
				</Button>
			</div>
		</SideBar>
	)
}
