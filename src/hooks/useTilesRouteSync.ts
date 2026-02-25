import { useEffect } from 'react'
import { useRoomBuilderStore } from '@/store/useRoomBuilderStore'

export const useTilesRouteSync = () => {
	const {
		setSelectedModelCategory,
		setSelectedHeaderModelCategory,
		setSelectSceneSetting,
	} = useRoomBuilderStore()

	useEffect(() => {
		// when user navigates into tiles routes we treat UI as a dedicated "tiles" mode
		setSelectedModelCategory('tiles')
		setSelectedHeaderModelCategory('tiles')
		setSelectSceneSetting('tiles')
	}, [
		setSelectedModelCategory,
		setSelectedHeaderModelCategory,
		setSelectSceneSetting,
	])
}
