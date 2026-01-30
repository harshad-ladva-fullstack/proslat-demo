import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import { Raycaster, Vector2, Mesh } from 'three'

export function CutoutClickHandler() {
	const { scene, camera, gl } = useThree()

	useEffect(() => {
		const canvas = gl.domElement
		const raycaster = new Raycaster()
		const mouse = new Vector2()

		let isClick = true
		let startTime = 0

		const handlePointerDown = (event: PointerEvent) => {
			if (!event.ctrlKey && !event.metaKey) {
				return
			}

			isClick = true
			startTime = Date.now()
		}

		const handlePointerMove = () => {
			isClick = false
		}

		const handleClick = (event: MouseEvent) => {
			if (!event.ctrlKey && !event.metaKey) {
				return
			}

			if (!isClick || Date.now() - startTime > 200) {
				return
			}

			const rect = canvas.getBoundingClientRect()
			mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
			mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

			raycaster.setFromCamera(mouse, camera)

			const intersects = raycaster.intersectObjects(scene.children, true)

			for (const intersect of intersects) {
				if (
					intersect.object instanceof Mesh &&
					intersect.object.userData.isCutout
				) {
					event.preventDefault()
					event.stopPropagation()

					break
				}
			}
		}

		canvas.addEventListener('pointerdown', handlePointerDown)
		canvas.addEventListener('pointermove', handlePointerMove)
		canvas.addEventListener('click', handleClick)

		return () => {
			canvas.removeEventListener('pointerdown', handlePointerDown)
			canvas.removeEventListener('pointermove', handlePointerMove)
			canvas.removeEventListener('click', handleClick)
			canvas.removeEventListener('contextmenu', handleClick)
		}
	}, [scene, camera, gl])

	return null
}
