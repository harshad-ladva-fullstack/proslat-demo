import { useRoomBuilderStore } from '@/store/useRoomBuilderStore'
import { useThree } from '@react-three/fiber'
import { useEffect } from 'react'

export function SceneSaver() {
	const { scene } = useThree()
	const { setScene } = useRoomBuilderStore()

	useEffect(() => {
		if (scene) {
			setScene(scene)
		}
	}, [scene, setScene])

	return null
}
