import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { Vector3 } from 'three'

export function CameraControls({
	camControlDisabled,
}: {
	camControlDisabled: boolean
}) {
	const controlsRef = useRef<any>(null)
	const { camera } = useThree()

	useFrame(() => {
		if (controlsRef.current) {
			const dir = new Vector3()
			camera.getWorldDirection(dir)
			controlsRef.current.target
				.copy(camera.position)
				.add(dir.multiplyScalar(10))
			controlsRef.current.update()
		}
	})

	return (
		<OrbitControls
			ref={controlsRef}
			enabled={!camControlDisabled}
			enableDamping={false}
			rotateSpeed={1}
			enableZoom={true}
			zoomToCursor={true}
			makeDefault
		/>
	)
}
