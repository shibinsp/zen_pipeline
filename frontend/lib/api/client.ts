import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios'

// Construct API URL dynamically based on current host
const getApiBaseUrl = (): string => {
  // Use environment variable if set
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL
  }
  
  // In browser, construct URL from current host
  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol
    const hostname = window.location.hostname
    // Backend runs on port 6500
    return `${protocol}//${hostname}:6500/api/v1`
  }
  
  // Fallback for server-side rendering
  return 'http://localhost:6500/api/v1'
}

// Create axios instance without baseURL initially
export const apiClient: AxiosInstance = axios.create({
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor for auth token and dynamic baseURL
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Set baseURL dynamically based on current host
    if (!config.baseURL) {
      config.baseURL = getApiBaseUrl()
    }
    
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as typeof error.config & { _retry?: boolean }

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      try {
        const refreshToken = localStorage.getItem('refresh_token')
        if (refreshToken) {
          const apiUrl = getApiBaseUrl()
          const response = await axios.post(`${apiUrl}/auth/refresh`, {
            refresh_token: refreshToken,
          })

          const { access_token, refresh_token } = response.data
          localStorage.setItem('access_token', access_token)
          localStorage.setItem('refresh_token', refresh_token)

          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${access_token}`
          }
          return apiClient(originalRequest)
        }
      } catch (refreshError) {
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        window.location.href = '/login'
        return Promise.reject(refreshError)
      }
    }

    return Promise.reject(error)
  }
)

export default apiClient
