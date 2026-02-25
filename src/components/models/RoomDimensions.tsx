import { useState, type JSX, type RefObject } from 'react'
import {
	Box3,
	Vector3,
	BufferGeometry,
	LineBasicMaterial,
	Line,
	Float32BufferAttribute,
	Object3D,
} from 'three'
import { Billboard, Text3D } from '@react-three/drei'
import { METER_TO_INCH } from '@/lib/functions'
import { useFrame } from '@react-three/fiber'

interface RoomDimensionsProps {
	roomRef?: RefObject<Object3D | null>
}

type TRoomDimensionsProps = JSX.IntrinsicElements['group'] & RoomDimensionsProps

export const RoomDimensions = ({ roomRef }: TRoomDimensionsProps) => {
	const [size, setSize] = useState<Vector3 | null>(null)
	const [boxMin, setBoxMin] = useState<Vector3 | null>(null)
	const [boxMax, setBoxMax] = useState<Vector3 | null>(null)

	useFrame(() => {
		if (roomRef?.current) {
			const box = new Box3().setFromObject(roomRef.current)
			const sizeVec = new Vector3()
			box.getSize(sizeVec)

			setSize(sizeVec)
			setBoxMin(box.min.clone())
			setBoxMax(box.max.clone())
		}
	})

	if (!size || !boxMin || !boxMax) return null

	// Лінія для ширини (по осі X)
	const OFFSET = 0
	const geometryWidth = new BufferGeometry()
	geometryWidth.setAttribute(
		'position',
		new Float32BufferAttribute(
			[
				boxMin.x,
				boxMax.y + OFFSET, // Трохи вище верху кімнати
				boxMax.z,
				boxMax.x,
				boxMax.y + OFFSET,
				boxMax.z,
			],
			3
		)
	)

	// Лінія для глибини (по осі Z)
	const geometryDepth = new BufferGeometry()
	geometryDepth.setAttribute(
		'position',
		new Float32BufferAttribute(
			[
				boxMax.x + OFFSET, // Трохи правіше кімнати
				boxMax.y,
				boxMin.z,
				boxMax.x + OFFSET,
				boxMax.y,
				boxMax.z,
			],
			3
		)
	)

	// Лінія для висоти (по осі Y)
	const geometryHeight = new BufferGeometry()
	geometryHeight.setAttribute(
		'position',
		new Float32BufferAttribute(
			[
				boxMax.x + OFFSET,
				boxMin.y,
				boxMax.z + OFFSET,
				boxMax.x + OFFSET,
				boxMax.y,
				boxMax.z + OFFSET,
			],
			3
		)
	)

	const lineMaterial = new LineBasicMaterial({ color: 'blue' })

	// Позиції для тексту
	const posWidthText = new Vector3(
		(boxMin.x + boxMax.x) / 2,
		boxMax.y + OFFSET + 0.1,
		boxMax.z + 0.1
	)

	const posDepthText = new Vector3(
		boxMax.x + OFFSET + 0.1,
		boxMax.y + 0.1,
		(boxMin.z + boxMax.z) / 2
	)

	const posHeightText = new Vector3(
		boxMax.x + OFFSET + 0.1,
		(boxMin.y + boxMax.y) / 2,
		boxMax.z + OFFSET + 0.1
	)

	const sizeInches = size.clone().multiplyScalar(METER_TO_INCH)

	return (
		<>
			{/* Лінії розмірів */}
			<primitive name='ignore' object={new Line(geometryWidth, lineMaterial)} />
			<primitive name='ignore' object={new Line(geometryDepth, lineMaterial)} />
			<primitive
				name='ignore'
				object={new Line(geometryHeight, lineMaterial)}
			/>

			{/* Текст з розмірами */}
			<Billboard name='ignore' position={posWidthText} follow={true}>
				<Text3D
					font='/fonts/helvetiker_regular.typeface.json'
					size={0.06}
					height={0.01}
				>
					Room Width: {sizeInches.x.toFixed(1)}"
					<meshBasicMaterial color='blue' />
				</Text3D>
			</Billboard>

			<Billboard name='ignore' position={posDepthText} follow={true}>
				<Text3D
					font='/fonts/helvetiker_regular.typeface.json'
					size={0.06}
					height={0.01}
				>
					Room Depth: {sizeInches.z.toFixed(1)}"
					<meshBasicMaterial color='blue' />
				</Text3D>
			</Billboard>

			<Billboard name='ignore' position={posHeightText} follow={true}>
				<Text3D
					font='/fonts/helvetiker_regular.typeface.json'
					size={0.06}
					height={0.01}
				>
					Room Height: {sizeInches.y.toFixed(1)}"
					<meshBasicMaterial color='blue' />
				</Text3D>
			</Billboard>
		</>
	)
}
