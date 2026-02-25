import type { RoomParams } from '@/store/useRoomBuilderStore'
import { BoxGeometry, Group, Mesh, MeshStandardMaterial } from 'three'

export function generateRoom({
	width,
	depth,
	height,
	wallThickness,
	wallColor,
	floorColor,
}: RoomParams): Group {
	const group = new Group()

	const floor = new Mesh(
		new BoxGeometry(width, wallThickness, depth),
		new MeshStandardMaterial({ color: floorColor })
	)
	floor.name = 'floor'
	floor.position.set(0, -wallThickness / 2, 0)
	group.add(floor)

	const frontWall = new Mesh(
		new BoxGeometry(width - 2 * wallThickness, height, wallThickness),
		new MeshStandardMaterial({ color: wallColor })
	)
	frontWall.name = 'wall_1'
	frontWall.position.set(0, height / 2, -depth / 2 + wallThickness / 2)
	group.add(frontWall)

	const backWall = new Mesh(
		new BoxGeometry(width - 2 * wallThickness, height, wallThickness),
		new MeshStandardMaterial({ color: wallColor })
	)
	backWall.name = 'wall_2'
	backWall.position.set(0, height / 2, depth / 2 - wallThickness / 2)
	group.add(backWall)

	const leftWall = new Mesh(
		new BoxGeometry(wallThickness, height, depth - 2 * wallThickness),
		new MeshStandardMaterial({ color: wallColor })
	)
	leftWall.name = 'wall_3'
	leftWall.position.set(-width / 2 + wallThickness / 2, height / 2, 0)
	group.add(leftWall)

	const rightWall = new Mesh(
		new BoxGeometry(wallThickness, height, depth - 2 * wallThickness),
		new MeshStandardMaterial({ color: wallColor })
	)
	rightWall.name = 'wall_4'
	rightWall.position.set(width / 2 - wallThickness / 2, height / 2, 0)
	group.add(rightWall)

	// Ceiling
	const ceiling = new Mesh(
		new BoxGeometry(width, wallThickness, depth),
		new MeshStandardMaterial({
			color: '#ffffff',
			transparent: true,
			opacity: 0.35,
			depthWrite: false,
		})
	)
	ceiling.name = 'ceiling'
	ceiling.position.set(0, height + wallThickness / 2, 0)
	group.add(ceiling)

	group.userData = { width, depth, height, isGeneratedByRoomGenerator: true }

	return group
}
