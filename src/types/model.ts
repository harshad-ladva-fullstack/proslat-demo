import type { IModel } from '@/constants/model-list'

export interface ModelColors {
	door?: string
	handle?: string
}

export interface Model {
	id: number
	projectId: number
	modelName: string
	position: any
	quaternion: any
	scale?: any
	material?: any
	catalogModel: IModel
	color: ModelColors
	isInCorner?: boolean
	attachedWallName?: string
}
