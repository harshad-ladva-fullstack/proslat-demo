import type { Project } from '@/types/project'
import type { Model } from '@/types/model'
import _apiClient from '../apiClient'
import { ApiEndpoints } from '../endpoints'

export const fetchGetAllProjects = async (): Promise<Project[]> => {
	const response = await _apiClient.get(`${ApiEndpoints.PROJECTS.PROJECTS}`)
	return response.data as Project[]
}

export const fetchGetProjectById = async (id: number): Promise<Project> => {
	const response = await _apiClient.get(
		`${ApiEndpoints.PROJECTS.PROJECTS}/${id}`
	)

	return response.data as Project
}

export const fetchCreateProject = async (
	projectData: Project
): Promise<Project> => {
	const response = await _apiClient.post(
		`${ApiEndpoints.PROJECTS.PROJECTS}`,
		projectData
	)
	return response.data as Project
}

export const fetchUpdateProject = async (
	id: number,
	projectData: Project
): Promise<Project> => {
	const response = await _apiClient.patch(
		`${ApiEndpoints.PROJECTS.PROJECTS}/${id}`,
		projectData
	)
	return response.data as Project
}
export const fetchDeleteProject = async (id: number): Promise<void> => {
	await _apiClient.delete(`${ApiEndpoints.PROJECTS.PROJECTS}/${id}`)
}

export const fetchCreateProjectModel = async (
	projectId: number,
	modelData: Partial<Model>
): Promise<Model> => {
	const response = await _apiClient.post(
		`${ApiEndpoints.PROJECTS.PROJECTS}/${projectId}/model`,
		modelData
	)
	return response.data as Model
}

export const fetchUpdateProjectModel = async (
	projectId: number,
	modelId: number,
	modelData: Partial<Model>
): Promise<Model> => {
	const response = await _apiClient.patch(
		`${ApiEndpoints.PROJECTS.PROJECTS}/${projectId}/model/${modelId}`,
		modelData
	)
	return response.data as Model
}

export const fetchDeleteProjectModel = async (
	projectId: number,
	modelId: number
): Promise<void> => {
	await _apiClient.delete(
		`${ApiEndpoints.PROJECTS.PROJECTS}/${projectId}/model/${modelId}`
	)
}

export const fetchUploadProjectModel = async (
	projectId: number,
	file: File
): Promise<Project> => {
	const formData = new FormData()
	formData.append('file', file)

	const response = await _apiClient.post(
		`${ApiEndpoints.PROJECTS.PROJECTS}/${projectId}/upload-model`,
		formData,
		{
			headers: {
				'Content-Type': 'multipart/form-data',
			},
		}
	)
	return response.data as Project
}
