import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useRoomBuilderStore } from '@/store/useRoomBuilderStore'
import { SCENE_SETTINGS } from '@/constants/constants'

export const useRouteSync = () => {
	const { category } = useParams<{ category: string }>()
	const {
		setSelectedModelCategory,
		setSelectedHeaderModelCategory,
		setSelectSceneSetting,
	} = useRoomBuilderStore()

	useEffect(() => {
		if (category) {
			// If category is one of the special scene settings (textures, colors, roomSettings)
			// treat it as a settings page rather than a model category
			const specialSettings = SCENE_SETTINGS.map(s => s.value)
			if (specialSettings.includes(category)) {
				setSelectSceneSetting(category)
			} else {
				setSelectedModelCategory(category)
				setSelectedHeaderModelCategory(category)
				setSelectSceneSetting('models')
			}
		} else {
			setSelectSceneSetting('default')
		}
	}, [
		category,
		setSelectedModelCategory,
		setSelectedHeaderModelCategory,
		setSelectSceneSetting,
	])
}
