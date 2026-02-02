import { useRoomBuilderStore } from '@/store/useRoomBuilderStore'
import { useVisualizeModelColors } from './useVisualizeModelColors'

export function useEditCurrentModel() {
	const {
		selectedCabinetId,
		removeCabinet,
		setSelectedCabinetId,
		setSelectedModelRef,
		scene,
	} = useRoomBuilderStore()
	const { cleanupModelMaterials } = useVisualizeModelColors()

	const deleteModel = () => {
		// Знаходимо модель в сцені та очищуємо її матеріали перед видаленням
		if (scene && selectedCabinetId) {
			const modelName = `visualize-model_${selectedCabinetId}`
			const modelObject = scene.getObjectByName(modelName)
			if (modelObject) {
				cleanupModelMaterials(modelObject)
			}
		}

		removeCabinet(selectedCabinetId!)
		setSelectedCabinetId(null)
		setSelectedModelRef(null)
	}

	return {
		deleteModel,
	}
}
