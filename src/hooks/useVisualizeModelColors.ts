import { useRoomBuilderStore } from '@/store/useRoomBuilderStore'
import { useCallback, type RefObject } from 'react'
import { Mesh, MeshStandardMaterial, Object3D, Color, Scene } from 'three'
import { checkIfElementIS, checkIfElementISModel } from '@/lib/utils'
import { fetchUpdateProjectModel } from '@/api/project'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { QUERY_KEYS } from '@/constants/query-keys'
import { useParams } from 'react-router-dom'

const MODEL_COLORS: Record<string, string> = {
	doors: 'rgb(255,255,255)',
	handles: 'rgb(188,188,188)',
}

function forEachMeshInModel(
	model: Object3D | null,
	type: string,
	applyFn: (mat: MeshStandardMaterial, mesh: Mesh, realName?: string) => void
) {
	if (!model) return

	model.traverse((child: Object3D) => {
		if (!(child instanceof Mesh)) return

		const realName = child.userData?.name

		const isMatch =
			checkIfElementIS(realName, type) ||
			(type === 'doors' &&
				(checkIfElementIS(realName, 'baseShell') ||
					checkIfElementIS(realName, 'drawers') ||
					checkIfElementIS(realName, 'baseDrawerShell') ||
					checkIfElementIS(realName, 'upperShell'))) ||
			(type === 'handles' && checkIfElementIS(realName, 'handlesFp'))

		if (!isMatch) return
		const materials = Array.isArray(child.material)
			? child.material
			: [child.material]

		materials.forEach(mat => {
			if (mat instanceof MeshStandardMaterial) {
				applyFn(mat, child, realName)
			}
		})
	})
}

function forEachMeshInScene(
	scene: Scene,
	type: string,
	luxOnly: boolean,
	applyFn: (mat: MeshStandardMaterial, mesh: Mesh) => void
) {
	console.log('forEachMeshInScene called:', { type, luxOnly })

	console.log('forEachMeshInScene called:', { type, luxOnly })

	scene.traverse((child: Object3D) => {
		if (!(child instanceof Mesh)) return

		const realName = child.userData?.name
		const modelCategory = child.userData?.modelCategory

		const isLuxModel = modelCategory === 'lux-cabinet'
		const isFusionModel = modelCategory === 'fusion-cabinet'

		if (!isLuxModel && !isFusionModel) return

		if (luxOnly && !isLuxModel) return
		if (!luxOnly && isLuxModel) return

		const isMatch =
			checkIfElementIS(realName, type) ||
			(type === 'doors' &&
				modelCategory === 'lux-cabinet' &&
				(checkIfElementIS(realName, 'baseShell') ||
					realName.includes('Mesh_') ||
					realName.includes('mesh_') ||
					checkIfElementIS(realName, 'drawers') ||
					checkIfElementIS(realName, 'baseDrawerShell') ||
					checkIfElementIS(realName, 'upperShell'))) ||
			(type === 'handles' && checkIfElementIS(realName, 'handlesFp'))

		console.log('Match check:', { realName, type, isMatch })

		if (!isMatch) return

		console.log('Applying color to mesh:', realName)

		const materials = Array.isArray(child.material)
			? child.material
			: [child.material]

		materials.forEach(mat => {
			if (mat instanceof MeshStandardMaterial) {
				applyFn(mat, child)
			}
		})
	})
}

export function useVisualizeModelColors() {
	const {
		selectedModelRef,
		scene,
		selectedCabinetId,
		changeCabinetById,
		cabinets,
		setCurrentColors,
	} = useRoomBuilderStore()
	const { id } = useParams<{ id: string }>()
	const queryClient = useQueryClient()

	const updateMultipleColorsMutation = useMutation({
		mutationFn: async ({
			updates,
		}: {
			updates: Array<{
				cabinetId: number
				colorType: 'door' | 'handle'
				color: string
			}>
		}) => {
			if (!id) return null

			// Виконуємо всі оновлення паралельно
			const promises = updates.map(update => {
				const cabinet = cabinets.find(c => c.id === update.cabinetId)
				if (!cabinet) return null

				const updatedColors = {
					...cabinet.color,
					[update.colorType]: update.color || undefined,
				}

				return fetchUpdateProjectModel(Number(id), update.cabinetId, {
					color: updatedColors,
				})
			})

			const results = await Promise.allSettled(promises.filter(Boolean))
			return results
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.project] })
		},
	})

	const updateColorMutation = useMutation({
		mutationFn: async ({
			cabinetId,
			colorType,
			color,
		}: {
			cabinetId: number
			colorType: 'door' | 'handle'
			color: string
		}) => {
			const cabinet = cabinets.find(c => c.id === cabinetId)
			if (!cabinet || !id) return null

			const updatedColors = {
				...cabinet.color,
				[colorType]: color || undefined,
			}

			const response = await fetchUpdateProjectModel(Number(id), cabinetId, {
				color: updatedColors,
			})

			if (response) {
				changeCabinetById(cabinetId, {
					color: updatedColors,
				})
			}

			return response
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.project] })
		},
	})

	const changeColor = useCallback(
		(type: string, newColor: string) => {
			if (!selectedModelRef?.current) return
			const model = selectedModelRef.current
			const color = new Color(newColor.trim())

			forEachMeshInModel(model, type, (mat, mesh) => {
				if (!mat.userData.cloned) {
					const clonedMat = mat.clone()
					clonedMat.userData.originalColor =
						mat.userData.originalColor || `#${mat.color.getHexString()}`
					clonedMat.userData.cloned = true

					if (Array.isArray(mesh.material)) {
						const mats = mesh.material.slice()
						const idx = mats.indexOf(mat)
						if (idx !== -1) mats[idx] = clonedMat
						mesh.material = mats
					} else {
						mesh.material = clonedMat
					}

					mat = clonedMat
				}

				mat.userData.customColor = `#${color.getHexString()}`
				mat.color.copy(color)
				mat.needsUpdate = true
			})

			// Зберігаємо колір в стор і відправляємо на бекенд якщо є вибраний кабінет
			if (selectedCabinetId && (type === 'doors' || type === 'handles')) {
				const colorType = type === 'doors' ? 'door' : 'handle'
				updateColorMutation.mutate({
					cabinetId: selectedCabinetId,
					colorType,
					color: `#${color.getHexString()}`,
				})
			}
		},
		[selectedModelRef, selectedCabinetId, updateColorMutation]
	)

	const changeColorByReference = (
		type: string,
		newColor: string,
		ref: RefObject<Object3D>
	) => {
		if (!ref.current) return
		const model = ref.current
		const color = new Color(newColor.trim())
		const targetColorHex = `#${color.getHexString()}`

		// Завжди застосовуємо колір для надійної синхронізації
		forEachMeshInModel(model, type, (mat, mesh) => {
			if (!mat.userData.cloned) {
				const clonedMat = mat.clone()
				clonedMat.userData.originalColor =
					mat.userData.originalColor || `#${mat.color.getHexString()}`
				clonedMat.userData.cloned = true

				if (Array.isArray(mesh.material)) {
					const mats = mesh.material.slice()
					const idx = mats.indexOf(mat)
					if (idx !== -1) mats[idx] = clonedMat
					mesh.material = mats
				} else {
					mesh.material = clonedMat
				}

				mat = clonedMat
			}

			mat.userData.customColor = targetColorHex
			mat.color.copy(color)
			mat.needsUpdate = true
		})
	}

	const resetColorsToDefault = useCallback(() => {
		if (!scene) return

		const updates: Array<{
			cabinetId: number
			colorType: 'door' | 'handle'
			color: string
		}> = []

		const applyColor = (mat: MeshStandardMaterial, obj?: Mesh) => {
			if (!obj) return
			const realName = obj.userData?.name
			const modelCategory = obj.userData?.modelCategory
			if (!realName) return

			let key = realName.split('_')[0]
			if (
				modelCategory === 'lux-cabinet' &&
				checkIfElementIS(realName, 'baseShell')
			) {
				key = 'doors'
			}

			const defaultColor = MODEL_COLORS[key]
			if (!defaultColor) return

			const color = new Color(defaultColor)
			mat.color.copy(color)
			mat.needsUpdate = true
		}

		const processModel = (model: Object3D) => {
			model.traverse(obj => {
				if (!(obj instanceof Mesh)) return
				const realName = obj.userData?.name
				if (!realName) return
				const materials = Array.isArray(obj.material)
					? obj.material
					: [obj.material]

				materials.forEach(mat => {
					if (mat instanceof MeshStandardMaterial) {
						applyColor(mat, obj)
					}
				})
			})
		}

		if (selectedModelRef?.current) {
			processModel(selectedModelRef.current)

			// Скидаємо кольори вибраної моделі на бекенді
			if (selectedCabinetId) {
				const cabinet = cabinets.find(c => c.id === selectedCabinetId)
				if (cabinet) {
					const resetColors = { door: undefined, handle: undefined }
					changeCabinetById(selectedCabinetId, { color: resetColors })

					if (id) {
						updateColorMutation.mutate({
							cabinetId: selectedCabinetId,
							colorType: 'door',
							color: '',
						})
						updateColorMutation.mutate({
							cabinetId: selectedCabinetId,
							colorType: 'handle',
							color: '',
						})
					}
				}
			}
		} else {
			scene.traverse(obj => {
				if (checkIfElementISModel(obj)) {
					processModel(obj)
				}
			})

			// Скидаємо кольори всіх моделей на бекенді
			cabinets.forEach(cabinet => {
				// Перевіряємо тип моделі для фільтрації - обробляємо тільки lux-cabinet та fusion-cabinet
				const isLuxCabinet = cabinet.catalogModel?.category === 'lux-cabinet'
				const isFusionCabinet =
					cabinet.catalogModel?.category === 'fusion-cabinet'

				// Ігноруємо всі кабінети, які не є lux-cabinet або fusion-cabinet
				if (!isLuxCabinet && !isFusionCabinet) return

				const resetColors = { door: undefined, handle: undefined }
				changeCabinetById(cabinet.id, { color: resetColors })

				updates.push(
					{
						cabinetId: cabinet.id,
						colorType: 'door',
						color: '',
					},
					{
						cabinetId: cabinet.id,
						colorType: 'handle',
						color: '',
					}
				)
			})

			// Відправляємо масове оновлення
			if (updates.length > 0) {
				updateMultipleColorsMutation.mutate({ updates })
			}

			// Очищаємо глобальні вибрані кольори
			setCurrentColors({
				regular: {},
				lux: {},
			})
		}
	}, [
		selectedModelRef,
		scene,
		selectedCabinetId,
		cabinets,
		changeCabinetById,
		id,
		updateColorMutation,
		updateMultipleColorsMutation,
		setCurrentColors,
	])

	const changeColorOnScene = useCallback(
		(type: string, newColor: string, luxOnly: boolean = false) => {
			if (!scene) return
			const color = new Color(newColor.trim())

			forEachMeshInScene(scene, type, luxOnly, (mat, mesh) => {
				if (!mat.userData.cloned) {
					const clonedMat = mat.clone()
					clonedMat.userData.originalColor =
						mat.userData.originalColor || `#${mat.color.getHexString()}`
					clonedMat.userData.cloned = true

					if (Array.isArray(mesh.material)) {
						const mats = mesh.material.slice()
						const idx = mats.indexOf(mat)
						if (idx !== -1) mats[idx] = clonedMat
						mesh.material = mats
					} else {
						mesh.material = clonedMat
					}

					mat = clonedMat
				}

				// Зберігаємо кастомний колір
				mat.userData.customColor = `#${color.getHexString()}`
				mat.color.copy(color)
				mat.needsUpdate = true
			})

			// Оновлюємо кольори всіх кабінетів на сцені
			const colorType = type === 'doors' ? 'door' : 'handle'
			const colorValue = `#${color.getHexString()}`

			// Збираємо всі оновлення для масового запиту
			const updates: Array<{
				cabinetId: number
				colorType: 'door' | 'handle'
				color: string
			}> = []

			cabinets.forEach(cabinet => {
				// Перевіряємо тип моделі для фільтрації
				const isLuxCabinet = cabinet.catalogModel?.category === 'lux-cabinet'
				const isFusionCabinet =
					cabinet.catalogModel?.category === 'fusion-cabinet'

				// Ігноруємо всі кабінети, які не є lux-cabinet або fusion-cabinet
				if (!isLuxCabinet && !isFusionCabinet) return

				if (luxOnly && !isLuxCabinet) return
				if (!luxOnly && isLuxCabinet) return

				// Оновлюємо колір в стор
				const updatedColors = {
					...cabinet.color,
					[colorType]: colorValue,
				}

				changeCabinetById(cabinet.id, { color: updatedColors })

				// Додаємо до списку оновлень для бекенду
				updates.push({
					cabinetId: cabinet.id,
					colorType,
					color: colorValue,
				})
			})

			console.log('Updates to send:', updates)

			console.log('Updates to send:', updates)

			// Відправляємо всі оновлення одним запитом
			if (updates.length > 0) {
				updateMultipleColorsMutation.mutate({ updates })
			}
		},
		[scene, cabinets, updateMultipleColorsMutation, changeCabinetById]
	)

	const changeColorOnLuxModels = useCallback(
		(type: string, newColor: string) => {
			changeColorOnScene(type, newColor, true)
		},
		[changeColorOnScene]
	)

	const changeColorOnRegularModels = useCallback(
		(type: string, newColor: string) => {
			changeColorOnScene(type, newColor, false)
		},
		[changeColorOnScene]
	)

	const cleanupModelMaterials = useCallback((model: Object3D) => {
		if (!model) return

		model.traverse((child: Object3D) => {
			if (!(child instanceof Mesh)) return

			const materials = Array.isArray(child.material)
				? child.material
				: [child.material]

			materials.forEach(mat => {
				if (mat instanceof MeshStandardMaterial) {
					// Відновлюємо оригінальний колір якщо він був збережений
					if (mat.userData.originalColor) {
						mat.color.set(mat.userData.originalColor)
					} else if (mat.userData.customColor) {
						// Якщо originalColor не збережений, але є customColor,
						// спробуємо відновити дефолтний колір
						const realName = child.userData?.name
						if (realName) {
							let key = realName.split('_')[0]
							if (
								child.userData?.modelCategory === 'lux-cabinet' &&
								checkIfElementIS(realName, 'baseShell')
							) {
								key = 'doors'
							}

							const defaultColor = MODEL_COLORS[key]
							if (defaultColor) {
								mat.color.set(defaultColor)
							}
						}
					}

					// Очищуємо всі користувацькі дані пов'язані з кольорами
					delete mat.userData.customColor
					delete mat.userData.originalColor
					delete mat.userData.cloned
					mat.needsUpdate = true
				}
			})
		})
	}, [])

	const applySavedColors = useCallback(
		(model: Object3D, savedColors: { door?: string; handle?: string }) => {
			if (!model || !savedColors) return

			if (savedColors.door) {
				forEachMeshInModel(model, 'doors', (mat, mesh) => {
					const color = new Color(savedColors.door!)

					if (!mat.userData.cloned) {
						const clonedMat = mat.clone()
						clonedMat.userData.originalColor =
							mat.userData.originalColor || `#${mat.color.getHexString()}`
						clonedMat.userData.cloned = true

						if (Array.isArray(mesh.material)) {
							const mats = mesh.material.slice()
							const idx = mats.indexOf(mat)
							if (idx !== -1) mats[idx] = clonedMat
							mesh.material = mats
						} else {
							mesh.material = clonedMat
						}

						mat = clonedMat
					}

					mat.userData.customColor = savedColors.door
					mat.color.copy(color)
					mat.needsUpdate = true
				})
			}

			if (savedColors.handle) {
				forEachMeshInModel(model, 'handles', (mat, mesh) => {
					const color = new Color(savedColors.handle!)

					if (!mat.userData.cloned) {
						const clonedMat = mat.clone()
						clonedMat.userData.originalColor =
							mat.userData.originalColor || `#${mat.color.getHexString()}`
						clonedMat.userData.cloned = true

						if (Array.isArray(mesh.material)) {
							const mats = mesh.material.slice()
							const idx = mats.indexOf(mat)
							if (idx !== -1) mats[idx] = clonedMat
							mesh.material = mats
						} else {
							mesh.material = clonedMat
						}

						mat = clonedMat
					}

					mat.userData.customColor = savedColors.handle
					mat.color.copy(color)
					mat.needsUpdate = true
				})
			}
		},
		[]
	)

	return {
		changeColor,
		resetColorsToDefault,
		changeColorOnScene,
		changeColorOnLuxModels,
		changeColorOnRegularModels,
		cleanupModelMaterials,
		changeColorByReference,
		applySavedColors,
	}
}
