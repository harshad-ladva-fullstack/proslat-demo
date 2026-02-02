import { useState, useCallback } from 'react'
import { Object3D } from 'three'

interface ContextMenuState {
	visible: boolean
	x: number
	y: number
	wallObject: Object3D | null
}

export const useWallContextMenu = () => {
	const [contextMenu, setContextMenu] = useState<ContextMenuState>({
		visible: false,
		x: 0,
		y: 0,
		wallObject: null,
	})

	const showContextMenu = useCallback(
		(x: number, y: number, wallObject: Object3D) => {
			setContextMenu({
				visible: true,
				x,
				y,
				wallObject,
			})
		},
		[]
	)

	const hideContextMenu = useCallback(() => {
		setContextMenu(prev => ({ ...prev, visible: false }))
	}, [])

	return {
		contextMenu,
		showContextMenu,
		hideContextMenu,
	}
}
