import { useEffect, useState, useRef } from 'react'
import { Vector3, Quaternion, Object3D, Group } from 'three'
import { useThree } from '@react-three/fiber'
import { useRoomBuilderStore } from '@/store/useRoomBuilderStore'
import { getMousePoint, getPositionYByModelType, slapObject } from '@/lib/utils'
import { GhostModel } from '@/components/models/GhostModel'
import { useParams } from 'react-router-dom'
import { fetchCreateProjectModel } from '@/api/project'
import { QUERY_KEYS } from '@/constants/query-keys'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { IModel } from '@/constants/model-list'

export const DropControl = () => {
	const [isShow, setIsShow] = useState<boolean>(false)
	const { id } = useParams<{ id: string }>()
	const queryClient = useQueryClient()

	const { camera, gl, scene } = useThree()
	const {
		cabinets,
		addCabinet,
		modelType,
		draggingModelRef,
		isModelPositionValid,
		setCamControlDisabled,
		setDraggingModelRef,
		currentColors,
	} = useRoomBuilderStore()

	const isShowRef = useRef(false)
	const camControlDisabledRef = useRef(false)
	const rafIdRef = useRef<number | null>(null)
	const lastPointRef = useRef<{ x: number; y: number; z: number } | null>(null)

	const createProjectModelMutation = useMutation({
		mutationFn: async ({
			id,
			modelType,
			draggingModel,
		}: {
			id: string | number
			modelType: IModel
			draggingModel:
				| {
						position: { clone: () => Vector3 }
						quaternion: { clone: () => Quaternion }
						attachedWallName: string | null
						isInCorner: boolean | null
				  }
				| Object3D
		}) => {
			if (!id || !modelType || !draggingModel) {
				return null
			}
			console.log('Creating model in project:', modelType)

			// Перевіряємо чи це Object3D чи наш кастомний тип
			const position =
				'position' in draggingModel &&
				typeof draggingModel.position.clone === 'function'
					? draggingModel.position.clone()
					: draggingModel.position.clone()

			const quaternion =
				'quaternion' in draggingModel &&
				typeof draggingModel.quaternion.clone === 'function'
					? draggingModel.quaternion.clone()
					: draggingModel.quaternion.clone()

			// Визначаємо чи це lux модель
			const isLuxModel = modelType.category === 'lux-cabinet'

			// Отримуємо відповідні кольори в залежності від типу моделі
			const modelColors = isLuxModel
				? {
						door: currentColors?.lux?.door || undefined,
						handle: undefined, // lux моделі не мають ручок
				  }
				: {
						door: currentColors?.regular?.door || undefined,
						handle: currentColors?.regular?.handle || undefined,
				  }

			const response = await fetchCreateProjectModel(Number(id), {
				modelName: modelType.name,
				position: position,
				attachedWallName: draggingModelRef?.current.userData.attachedWallName,
				isInCorner: draggingModelRef?.current.userData.isInCorner,
				quaternion: {
					x: quaternion.x,
					y: quaternion.y,
					z: quaternion.z,
					w: quaternion.w,
				},
				color: modelColors,
			})

			if (response) {
				const cabinet = {
					id: response.id,
					projectId: response.projectId,
					modelName: response.modelName,
					position: position,
					quaternion: {
						x: quaternion.x,
						y: quaternion.y,
						z: quaternion.z,
						w: quaternion.w,
					},
					catalogModel: modelType,
					color: modelColors,
				}
				addCabinet(cabinet)
			}

			return response
		},

		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.project] })
		},
	})

	useEffect(() => {
		const canvas = gl.domElement
		if (!canvas || !camera) return

		const handleDragOver = (e: DragEvent) => {
			e.preventDefault()
			if (!isShowRef.current) {
				setIsShow(true)
				isShowRef.current = true
			}
			if (!camControlDisabledRef.current) {
				setCamControlDisabled(true)
				camControlDisabledRef.current = true
			}
			if (!modelType || !draggingModelRef?.current) return
			const point = getMousePoint(canvas, camera, e)
			lastPointRef.current = {
				x: point.x,
				y: getPositionYByModelType(modelType.type),
				z: point.z,
			}

			if (rafIdRef.current == null) {
				rafIdRef.current = requestAnimationFrame(() => {
					if (draggingModelRef.current && lastPointRef.current) {
						draggingModelRef.current.position.copy(lastPointRef.current)
					}
					rafIdRef.current = null
				})
			}
		}

		const handleDrop = async (e: DragEvent) => {
			e.preventDefault()
			setCamControlDisabled(false)
			camControlDisabledRef.current = false
			setIsShow(false)
			isShowRef.current = false

			if (rafIdRef.current != null) {
				cancelAnimationFrame(rafIdRef.current)
				rafIdRef.current = null
				lastPointRef.current = null
			}

			// Якщо draggingModelRef.current є null, спробуємо знайти ghost-model на сцені
			if (!draggingModelRef?.current) {
				const ghostModel = scene.getObjectByName('ghost-model') as Group
				if (ghostModel) {
					// Зберігаємо існуючі userData перед створенням нового рефа
					const existingUserData = { ...ghostModel.userData }

					// Створюємо ref object і встановлюємо його
					const ghostRef = { current: ghostModel }
					setDraggingModelRef(ghostRef)

					// Відновлюємо userData після встановлення рефа
					if (ghostRef.current) {
						ghostRef.current.userData = {
							...ghostRef.current.userData,
							...existingUserData,
						}
					}
				}
			}

			console.log('draggingModelRef', draggingModelRef?.current)
			console.log('modelType?.type', modelType?.type)
			console.log('isModelPositionValid', isModelPositionValid)

			if (
				isModelPositionValid &&
				modelType?.type &&
				draggingModelRef?.current
			) {
				slapObject(draggingModelRef.current)

				if (id && modelType) {
					createProjectModelMutation.mutate({
						id,
						modelType: modelType,
						draggingModel: draggingModelRef.current,
					})
				}
			}

			setDraggingModelRef(null)
		}

		const handleDragLeave = () => {
			setIsShow(false)
			isShowRef.current = false
			setCamControlDisabled(false)
			camControlDisabledRef.current = false
			if (rafIdRef.current != null) {
				cancelAnimationFrame(rafIdRef.current)
				rafIdRef.current = null
				lastPointRef.current = null
			}
		}

		const handleDragStart = (e: DragEvent) => {
			if (e?.target && e.dataTransfer) {
				e.dataTransfer.setDragImage(
					e.target as Element,
					window.outerWidth,
					window.outerHeight
				)
			}
		}

		canvas.addEventListener('dragover', handleDragOver)
		canvas.addEventListener('drop', handleDrop)
		canvas.addEventListener('dragleave', handleDragLeave)
		document.addEventListener('dragstart', handleDragStart)

		return () => {
			canvas.removeEventListener('dragover', handleDragOver)
			canvas.removeEventListener('drop', handleDrop)
			canvas.removeEventListener('dragleave', handleDragLeave)
			document.removeEventListener('dragstart', handleDragStart)

			if (rafIdRef.current != null) {
				cancelAnimationFrame(rafIdRef.current)
				rafIdRef.current = null
				lastPointRef.current = null
			}
		}
	}, [
		camera,
		gl,
		addCabinet,
		modelType,
		draggingModelRef,
		isModelPositionValid,
		scene,
		cabinets.length,
		id,
		createProjectModelMutation,
		setCamControlDisabled,
		setDraggingModelRef,
	])

	return isShow && modelType?.type ? (
		<GhostModel
			showGhost={isShow}
			model={modelType!}
			position={[1000, 0, 1000]}
		/>
	) : null
}
