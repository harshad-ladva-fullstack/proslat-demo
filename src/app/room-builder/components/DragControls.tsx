import { useEffect, useState, useRef } from 'react'
import { Quaternion, Vector3 } from 'three'
import { useRoomBuilderStore } from '@/store/useRoomBuilderStore'
import { slapObject } from '@/lib/utils'
import { GhostModel } from '@/components/models/GhostModel'
import { DragControls } from '@react-three/drei'
import { fetchUpdateProjectModel } from '@/api/project'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { QUERY_KEYS } from '@/constants/query-keys'
import { useParams } from 'react-router-dom'
import type { IModel } from '@/constants/model-list'
import type { Model } from '@/types/model'

export function DragControlsWrapper() {
	const {
		modelType,
		cabinets,
		selectedCabinetId,
		setCamControlDisabled,
		setSelectedCabinetId,
		isModelPositionValid,
		changeCabinetById,
		draggingModelRef,
		setSelectedModelRef,
		setDraggingModelRef,
	} = useRoomBuilderStore()

	const [cabinet, setCabinet] = useState<Model | null>(null)
	const [show, setShow] = useState<boolean>(true)
	const queryClient = useQueryClient()
	const { id } = useParams<{ id: string }>()

	const rafIdRef = useRef<number | null>(null)
	const lastPositionRef = useRef<Vector3 | null>(null)

	useEffect(() => {
		setCabinet(cabinets.find(cab => cab.id === selectedCabinetId) || null)
	}, [cabinets, selectedCabinetId])

	const updateProjectModelMutation = useMutation({
		mutationFn: async ({
			id,
			modelType,
			draggingModel,
		}: {
			id: string | number
			modelType: IModel
			draggingModel: {
				position: Vector3
				quaternion: Quaternion
			}
		}) => {
			if (!isModelPositionValid || !draggingModelRef?.current) return null

			const currentCabinet = cabinets.find(c => c.id === selectedCabinetId)

			const response = await fetchUpdateProjectModel(
				Number(id),
				selectedCabinetId!,
				{
					modelName: modelType.name,
					position: draggingModel.position.clone(),
					attachedWallName: draggingModelRef.current.userData.attachedWallName,
					isInCorner: draggingModelRef.current.userData.isInCorner,
					quaternion: {
						x: draggingModel.quaternion.clone().x,
						y: draggingModel.quaternion.clone().y,
						z: draggingModel.quaternion.clone().z,
						w: draggingModel.quaternion.clone().w,
					},
					color: {
						door: currentCabinet?.color?.door,
						handle: currentCabinet?.color?.handle,
					},
				}
			)

			if (response) {
				const currentCabinet = cabinets.find(c => c.id === selectedCabinetId)
				if (!currentCabinet?.catalogModel) return response

				const cabinetNew = {
					id: selectedCabinetId!,
					projectId: response.projectId,
					modelName: response.modelName,
					position: draggingModel.position.clone(),
					quaternion: {
						x: draggingModel.quaternion.clone().x,
						y: draggingModel.quaternion.clone().y,
						z: draggingModel.quaternion.clone().z,
						w: draggingModel.quaternion.clone().w,
					},
					catalogModel: currentCabinet.catalogModel,
					color: {
						door: currentCabinet?.color?.door || undefined,
						handle: currentCabinet?.color?.handle || undefined,
					},
				}
				changeCabinetById(selectedCabinetId!, cabinetNew)
				setCabinet(cabinetNew)
			}
			return response
		},
		onSuccess: () =>
			queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.project] }),
	})

	const syncPosition = () => {
		if (!draggingModelRef?.current || !isModelPositionValid) return
		const position = draggingModelRef.current.getWorldPosition(new Vector3())
		const quaternion = draggingModelRef.current.getWorldQuaternion(
			new Quaternion()
		)

		updateProjectModelMutation.mutate({
			id: id!,
			modelType: modelType!,
			draggingModel: { position, quaternion },
		})
	}

	const handleDrag = () => {
		if (!draggingModelRef?.current) return
		lastPositionRef.current = draggingModelRef.current.position.clone()
		if (rafIdRef.current === null) {
			rafIdRef.current = requestAnimationFrame(() => {
				if (draggingModelRef.current && lastPositionRef.current) {
					draggingModelRef.current.position.copy(lastPositionRef.current)
				}
				rafIdRef.current = null
			})
		}
	}

	const handleDragEnd = () => {
		setShow(false)
		setCamControlDisabled(false)

		if (draggingModelRef?.current && isModelPositionValid) {
			slapObject(draggingModelRef.current)
			syncPosition()
		}

		if (rafIdRef.current !== null) {
			cancelAnimationFrame(rafIdRef.current)
			rafIdRef.current = null
		}

		setDraggingModelRef(null)
		setSelectedCabinetId(null)
		setSelectedModelRef(null)
	}

	return (
		cabinet && (
			<DragControls
				axisLock='y'
				onDrag={handleDrag}
				onDragStart={() => {
					setCamControlDisabled(true)
					setShow(true)
				}}
				onDragEnd={handleDragEnd}
			>
				<GhostModel
					showGhost={show}
					position={
						new Vector3(
							cabinet.position?.x ?? 1000,
							cabinet.position?.y ?? 0,
							cabinet.position?.z ?? 1000
						)
					}
					quaternion={
						new Quaternion(
							cabinet.quaternion.x,
							cabinet.quaternion.y,
							cabinet.quaternion.z,
							cabinet.quaternion.w
						)
					}
					model={modelType!}
				/>
			</DragControls>
		)
	)
}
