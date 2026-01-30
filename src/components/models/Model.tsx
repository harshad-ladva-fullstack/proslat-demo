import { useGLTF } from '@react-three/drei'
import { type JSX, type ReactElement, useMemo, useRef } from 'react'
import { Material, Mesh, MeshStandardMaterial, Object3D } from 'three'
import { getModelPath } from '@/lib/utils'
import type { IModel } from '@/constants/model-list'

type TModel = JSX.IntrinsicElements['group'] & ModelProps

interface ModelProps {
	model: IModel
}

export function Model(props: TModel): ReactElement {
	const { model, ...rest } = props
	const { scene } = useGLTF(getModelPath(model.name)) as unknown as {
		scene: Object3D
	}
	const groupRef = useRef<Object3D | null>(null)
	// positionAdjustedRef removed (unused)
	const restProps = rest as unknown as JSX.IntrinsicElements['group']

	const preparedScene = useMemo(() => {
		const s = scene.clone(true)

		s.traverse((child: Object3D) => {
			if (child instanceof Mesh) {
				const mesh = child as Mesh

				mesh.castShadow = true
				mesh.receiveShadow = true

				if (Array.isArray(mesh.material)) {
					mesh.material = mesh.material.map(mat => {
						if (mat instanceof MeshStandardMaterial) {
							const m = mat.clone()
							m.metalness = 0.3
							m.roughness = 0.6
							m.needsUpdate = true
							return m
						}
						const m = (mat as Material).clone()
						m.needsUpdate = true
						return m
					})
				} else if (mesh.material) {
					if (mesh.material instanceof MeshStandardMaterial) {
						const m = mesh.material.clone()
						m.metalness = 0.3
						m.roughness = 0.6
						m.needsUpdate = true
						mesh.material = m
					} else {
						mesh.material = (mesh.material as Material).clone()
						mesh.material.needsUpdate = true
					}
				}

				mesh.userData = {
					...(mesh.userData || {}),
					name: mesh.name,
					modelCategory: model.category,
				}
			}
		})

		return s
	}, [scene])

	// useEffect(() => {
	// 	if (groupRef.current && !positionAdjustedRef.current) {
	// 		const box = new Box3().setFromObject(groupRef.current)
	// 		const minY = box.min.y
	// 		if (minY !== 0) {
	// 			groupRef.current.position.y -= minY
	// 			positionAdjustedRef.current = true
	// 		}
	// 	}
	// }, [scene])

	return <primitive object={preparedScene} ref={groupRef} {...restProps} />
}
