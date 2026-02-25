import { Environment } from '@react-three/drei'
import type { FC } from 'react'
import * as THREE from 'three'

export const SceneLighting: FC = () => {
	return (
		<>
			<Environment preset='city' background={false} environmentIntensity={1} />

			<ambientLight intensity={1} color={new THREE.Color('#ffffff')} />
		</>
	)
}
