import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Box3 } from 'three'
import { useRoomBuilderStore } from '@/store/useRoomBuilderStore'

export const RoomPositionUpdater = () => {
	const { roomModel, isCustomRoom } = useRoomBuilderStore()
	const _box = useRef(new Box3())

	useFrame(() => {
		if (!roomModel) return
		if (isCustomRoom) return

		const box = _box.current.setFromObject(roomModel)
		const desiredY = -box.min.y - 0.1

		if (Math.abs((roomModel.position.y ?? 0) - -0.1) > 1e-4) {
			roomModel.position.y = desiredY
		}
	})

	return null
}
