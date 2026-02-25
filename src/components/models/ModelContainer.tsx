import React, { type FC, type JSX, useEffect, useRef } from 'react'
import type { IModel } from '@/constants/model-list'
import { useRoomBuilderStore } from '@/store/useRoomBuilderStore'
import { Model } from './Model'
import { Box3, Group } from 'three'
import { GroupModel } from './GroupModel'
import type { ModelColors } from '@/types/model'
import { useVisualizeModelColors } from '@/hooks/useVisualizeModelColors'

interface ModelContainerProps {
	id: number
	model: IModel
	colors: ModelColors
	isInCorner?: boolean
	attachedWallName?: string
}

type TModelContainerProps = JSX.IntrinsicElements['group'] & ModelContainerProps

export const ModelContainer: FC<TModelContainerProps> = ({
	model,
	id,
	isInCorner,
	attachedWallName,
	colors,
	...props
}) => {
	const groupRef = useRef<Group>(null!)
	const lastAppliedColorsRef = useRef<{ door?: string; handle?: string }>({})
	const {
		setModelType,
		showDimensions,
		setSelectedCabinetId,
		setSelectedModelRef,
		cabinets,
		floorTilesEnabled,
	} = useRoomBuilderStore()
	const { changeColorByReference } = useVisualizeModelColors()

	// Знаходимо поточний кабінет для отримання актуальних кольорів
	const currentCabinet = cabinets.find(c => c.id === id)
	const actualColors = currentCabinet?.color || colors

	const handleClick = (e: React.MouseEvent) => {
		e.stopPropagation()
		if (floorTilesEnabled) return
		setSelectedCabinetId(id)
		setModelType(model)

		if (groupRef) {
			setSelectedModelRef(groupRef)
		}

		if (groupRef.current) {
			const box = new Box3().setFromObject(groupRef.current)
			const height = box.max.y - box.min.y
			const width = box.max.x - box.min.x
			const depth = box.max.z - box.min.z
			console.log(
				`Розміри моделі ${id}: width=${width.toFixed(
					2
				)}, height=${height.toFixed(2)}, depth=${depth.toFixed(2)}`
			)
		}
	}

	useEffect(() => {
		// Форсуємо синхронізацію кольорів при кожній зміні
		if (actualColors?.door) {
			changeColorByReference('doors', actualColors.door, groupRef)
			lastAppliedColorsRef.current.door = actualColors.door
		}

		if (actualColors?.handle) {
			changeColorByReference('handles', actualColors.handle, groupRef)
			lastAppliedColorsRef.current.handle = actualColors.handle
		}
	}, [
		actualColors?.door,
		actualColors?.handle,
		changeColorByReference,
		cabinets.length,
		id,
	])

	useEffect(() => {
		if (currentCabinet && groupRef.current) {
			if (currentCabinet.color?.door) {
				changeColorByReference('doors', currentCabinet.color.door, groupRef)
			}
			if (currentCabinet.color?.handle) {
				changeColorByReference('handles', currentCabinet.color.handle, groupRef)
			}
		}
	}, [currentCabinet, changeColorByReference])

	return (
		<>
			<group
				ref={groupRef}
				dispose={null}
				onClick={handleClick}
				name={'visualize-model_' + id}
				userData={{
					type: model.type,
					modelName: model.name,
					isInCorner,
					attachedWallName,
				}}
				{...props}
			>
				<Model model={model} />
			</group>
			{groupRef.current && showDimensions && <GroupModel groupRef={groupRef} />}
		</>
	)
}
