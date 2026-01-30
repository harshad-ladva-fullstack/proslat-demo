import type { IModel } from '@/constants/model-list'
import _apiClient from '../apiClient'
import { ApiEndpoints } from '../endpoints'

export const fetchGetModelsCatalog = async (): Promise<IModel[]> => {
	const response = await _apiClient.get(`${ApiEndpoints.MODELS.CATALOG}`)
	return response.data as IModel[]
}
