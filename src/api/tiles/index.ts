import _apiClient from '../apiClient'
import type { ITile } from '@/types/tiles'

export const fetchGetTiles = async (projectId: string) => {
	const res = await _apiClient.get(`/tiles/${projectId}`)
	return res.data
}

export const postTiles = async (
	projectId: string,
	tiles: ITile | ITile[] | unknown
) => {
	const res = await _apiClient.post(`/tiles/${projectId}`, tiles)
	return res.data
}

// Delete all tiles for a project
export const deleteAllTiles = async (projectId: string) => {
	const res = await _apiClient.delete(`/tiles/${projectId}`)
	return res.data
}

// Delete a single tile by id (projectId is kept in the path for authorization consistency)
export const deleteTile = async (projectId: string, id: number | string) => {
	const res = await _apiClient.delete(`/tiles/${projectId}/${id}`)
	return res.data
}

// Bulk patch/update tiles. Expects an array of items { id, ...fields }
export const patchTiles = async (
	projectId: string,
	items: Array<Record<string, unknown>>
) => {
	const res = await _apiClient.patch(`/tiles/${projectId}`, items)
	return res.data
}
