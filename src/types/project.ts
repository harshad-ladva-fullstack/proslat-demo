import type { Model } from './model'
import type { ITile } from './tiles'

export interface Project {
	id?: number
	name: string
	glbUrl?: string
	userId?: number
	createdAt?: string
	updatedAt?: string
	models?: Model[]
	tiles?: ITile[]
	roomWidth?: number
	roomDepth?: number
	roomHeight?: number
	wallColor?: string
	floorColor?: string
}
