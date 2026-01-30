import type { IModel } from '@/constants/model-list'
import { useRoomBuilderStore } from '@/store/useRoomBuilderStore'
import { useCursor } from '@react-three/drei'
import { type FC, type JSX, useEffect, useRef } from 'react'
import {
	Color,
	Group,
	Mesh,
	MeshStandardMaterial,
	Object3D,
	Quaternion,
} from 'three'
import { useThree } from '@react-three/fiber'
import { Model } from './Model'
import { GhostModelDistances } from './GhostModelDistances'

interface GhostModelProps {
	showGhost: boolean
	dropping?: boolean
	model: IModel
}

type TGhostModelProps = JSX.IntrinsicElements['group'] & GhostModelProps

export const GhostModel: FC<TGhostModelProps> = ({
	showGhost,
	model,
	...props
}) => {
	const ghostRef = useRef<Group>(null!)

	const { isModelPositionValid, setDraggingModelRef, selectedCabinetId } =
		useRoomBuilderStore()
	const { scene } = useThree()

	useCursor(showGhost, 'move', 'auto')

	useEffect(() => {
		if (ghostRef.current) {
			const existingUserData = ghostRef.current.userData || {}

			if (selectedCabinetId != null) {
				const name = `visualize-model_${selectedCabinetId}`
				const source = scene.getObjectByName(name) as Object3D | null

				ghostRef.current.userData = {
					...existingUserData,
					type: model.type,
					modelName: model.name,
					selectedCabinetId: selectedCabinetId,
					sourceVisualizeName: name,
					sourceVisualizeRef: source,
					// copy only these two fields from the source model when available
					isInCorner: source?.userData?.isInCorner ?? null,
					attachedWallName: source?.userData?.attachedWallName ?? null,
				}
			} else {
				ghostRef.current.userData = {
					...existingUserData,
					type: model.type,
					modelName: model.name,
					selectedCabinetId: selectedCabinetId,
					// Зберігаємо існуючі значення collision checker
					closestWall: existingUserData.closestWall || null,
					attachedWall: existingUserData.attachedWall || null,
					closestModel: existingUserData.closestModel || null,
					closestBottomModel: existingUserData.closestBottomModel || null,
					// preserve any explicit corner fields if they were already present
					isInCorner: existingUserData.isInCorner ?? null,
					attachedWallName: existingUserData.attachedWallName ?? null,
				}
			}

			setDraggingModelRef(ghostRef)

			try {
				const savedQ = existingUserData.savedQuaternion
				const potentialQ = existingUserData.potentialQuaternion
				if (savedQ && savedQ.isQuaternion) {
					ghostRef.current.quaternion.copy(savedQ as Quaternion)
				} else if (potentialQ && potentialQ.isQuaternion) {
					ghostRef.current.quaternion.copy(potentialQ as Quaternion)
				} else if (selectedCabinetId != null && scene) {
					const sourceName = `visualize-model_${selectedCabinetId}`
					const source = scene.getObjectByName(sourceName) as Object3D | null
					if (source) {
						ghostRef.current.quaternion.copy(
							source.getWorldQuaternion(new Quaternion())
						)
					} else {
						// default to identity quaternion (no rotation)
						ghostRef.current.quaternion.set(0, 0, 0, 1)
					}
				} else {
					// default to identity quaternion (no rotation)
					ghostRef.current.quaternion.set(0, 0, 0, 1)
				}
			} catch {
				// defensive - don't crash if quaternion isn't present
			}
		}
	}, [ghostRef, selectedCabinetId, scene, setDraggingModelRef, model.type])

	// eslint-disable-next-line react-hooks/exhaustive-deps
	const setGhostColor = () => {
		if (!isModelPositionValid) {
			return new Color(0xff0000)
		} else {
			return new Color(0x00ff00)
		}
	}

	useEffect(() => {
		if (!ghostRef?.current) return

		ghostRef.current.traverse(child => {
			if (child instanceof Mesh) {
				child.material = new MeshStandardMaterial({
					color: setGhostColor(),
					transparent: true,
					opacity: 0.5,
				})
			}
		})
	}, [isModelPositionValid, setGhostColor])

	return (
		<group>
			<group
				dispose={null}
				visible={showGhost}
				{...props}
				ref={ghostRef}
				name='ghost-model'
				onClick={e => {
					e.stopPropagation()
				}}
			>
				<Model model={model!} />
			</group>
			<GhostModelDistances ghostRef={ghostRef} />
		</group>
	)
}
