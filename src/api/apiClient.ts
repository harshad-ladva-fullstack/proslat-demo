import axios from 'axios'

const { VITE_BASE_URL } = import.meta.env

const _apiClient = axios.create({
	baseURL: `${(VITE_BASE_URL || '').replace(/\/$/, '')}/api`,
	timeout: 300000,
	withCredentials: false,
})

let isRefreshing = false
let refreshSubscribers: ((token: string) => void)[] = []

const onRefreshed = (token: string) => {
	refreshSubscribers.forEach(callback => callback(token))
	refreshSubscribers = []
}

_apiClient.interceptors.request.use(config => {
	const token = localStorage.getItem('accessToken')
	if (token) {
		if (!config.headers) {
			config.headers = {}
		}
		config.headers.Authorization = `Bearer ${token}`
	}
	return config
})

_apiClient.interceptors.response.use(
	response => response,
	async error => {
		const originalRequest = error.config

		if (error.response?.status === 401 && !originalRequest._retry) {
			originalRequest._retry = true

			if (!localStorage.getItem('refreshToken')) {
				localStorage.removeItem('accessToken')
				// window.location.href = '/auth/sign-in'
				return Promise.reject(error)
			}

			if (isRefreshing) {
				return new Promise(resolve => {
					refreshSubscribers.push((token: string) => {
						originalRequest.headers.Authorization = `Bearer ${token}`
						resolve(_apiClient(originalRequest))
					})
				})
			}

			isRefreshing = true

			try {
				const response = await axios.post<{ token: string }>(
					`${VITE_BASE_URL}/api/token/refresh`,
					{
						refreshToken: localStorage.getItem('refreshToken'),
					}
				)
				const { token } = response.data

				localStorage.setItem('accessToken', token)
				isRefreshing = false
				onRefreshed(token)
				originalRequest.headers.Authorization = `Bearer ${token}`
				return _apiClient(originalRequest)
			} catch (refreshError) {
				isRefreshing = false
				localStorage.removeItem('accessToken')
				localStorage.removeItem('refreshToken')
				// window.location.href = '/auth/sign-in'
				return Promise.reject(refreshError)
			}
		}

		if (error.response?.status === 403) {
			console.error('Access denied:', error.response?.data?.message)
			window.location.href = '/403'
		}

		return Promise.reject(error)
	}
)

export default _apiClient
