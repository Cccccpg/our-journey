import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 30000
})

// 请求拦截器 - 添加 JWT
api.interceptors.request.use(config => {
  const token = localStorage.getItem('jwt')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// 获取所有地点数据
export const getPlaces = () => api.get('/places')

// 获取城市详情
export const getCityDetail = (id) => api.get(`/places/cities/${id}`)

// 根据经纬度反向识别地址
export const reverseGeocode = (lat, lng) => api.get('/places/reverse-geocode', {
  params: { lat, lng }
})

// 新增城市
export const addCity = (data) => api.post('/places/cities', data)

// 更新城市
export const updateCity = (id, data) => api.put(`/places/cities/${id}`, data)

// 删除城市
export const deleteCity = (id) => api.delete(`/places/cities/${id}`)

// 上传照片
export const uploadPhoto = (cityId, file) => {
  const formData = new FormData()
  formData.append('photo', file)
  formData.append('city_id', cityId)
  return api.post('/photos', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}

// 批量上传照片
export const uploadPhotos = (cityId, files) => {
  const formData = new FormData()
  files.forEach(file => formData.append('photos', file))
  formData.append('city_id', cityId)
  return api.post('/photos/batch', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}

// 删除照片
export const deletePhoto = (id) => api.delete(`/photos/${id}`)

// 设置封面照片
export const setCoverPhoto = (id) => api.put(`/photos/${id}/cover`)

// 更新照片排序
export const updatePhotoOrder = (cityId, photoIds) => api.put('/photos/order', {
  city_id: cityId,
  photo_ids: photoIds
})

// 认证
export const authLogin = (token, password) => api.post('/auth', { token, password })

// 验证 JWT
export const verifyAuth = () => api.post('/auth/verify')

// 获取主题
export const getThemes = () => api.get('/themes')

// 获取当前主题
export const getActiveTheme = () => api.get('/themes/active')

// 设置主题
export const setActiveTheme = (id) => api.put('/themes/active', { id })

// 更新主题颜色
export const updateTheme = (id, colors) => api.put(`/themes/${id}`, colors)

// 获取所有旅程
export const getJourneys = () => api.get('/journeys')

// 获取旅程详情
export const getJourneyDetail = (id) => api.get(`/journeys/${id}`)

// 新增旅程
export const addJourney = (data) => api.post('/journeys', data)

// 更新旅程
export const updateJourney = (id, data) => api.put(`/journeys/${id}`, data)

// 删除旅程
export const deleteJourney = (id) => api.delete(`/journeys/${id}`)

// AI：生成足迹标题、描述和标签
export const generateFootprintDraft = (data) => api.post('/ai/footprint-draft', data)

// AI：总结当前地图视角
export const generateMapSummary = (data) => api.post('/ai/map-summary', data)

// AI：自然语言搜索足迹
export const searchFootprintsWithAi = (data) => api.post('/ai/search', data)

// AI：生成旅程路线名称和备注
export const generateJourneyTitle = (data) => api.post('/ai/journey-title', data)

export default api
