import { useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { Box3 } from 'three'
import { useRoomBuilderStore } from '@/store/useRoomBuilderStore'

export const RoomPositionUpdater = () => {
	const { roomModel, isCustomRoom } = useRoomBuilderStore()
	const _box = useRef(new Box3())
	const hasInitialized = useRef(false)

	// Set the room position once when it's first loaded, then don't change it
	useEffect(() => {
		if (!roomModel || isCustomRoom || hasInitialized.current) return
		
		const box = _box.current.setFromObject(roomModel)
		const desiredY = -box.min.y - 0.1
		roomModel.position.y = desiredY
		hasInitialized.current = true
	}, [roomModel, isCustomRoom])

	// Reset the flag when room changes
	useEffect(() => {
		hasInitialized.current = false
	}, [roomModel])

	return null
}
