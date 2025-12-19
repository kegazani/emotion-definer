import axios from 'axios'

const apiClient = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

export interface DiaryEntry {
  id: number
  created_at: string
  content: string
  emotion: string
  intensity: number
  sentiment_score: number
}

export interface HealthData {
  id: number
  timestamp: string
  heart_rate?: number
  steps?: number
  sleep_hours?: number
  calories?: number
}

export interface WatchData {
  id: number
  device_id?: string
  timestamp: string
  heart_rate?: number
  hrv?: number
  spo2?: number
  stress_level?: number
  steps?: number
  calories?: number
  distance?: number
  active_minutes?: number
  sleep_hours?: number
  sleep_quality?: number
  body_battery?: number
  skin_temperature?: number
  respiratory_rate?: number
}

export interface WatchAnalytics {
  period_start: string
  period_end: string
  total_records: number
  avg_heart_rate?: number
  min_heart_rate?: number
  max_heart_rate?: number
  avg_hrv?: number
  avg_spo2?: number
  avg_stress_level?: number
  total_steps: number
  total_calories: number
  total_distance: number
  total_active_minutes: number
  avg_sleep_hours?: number
  avg_sleep_quality?: number
  avg_body_battery?: number
  heart_rate_trend: Array<{ time: string; value: number }>
  stress_trend: Array<{ time: string; value: number }>
  activity_trend: Array<{ time: string; steps: number; calories: number }>
}

export interface DailyStats {
  date: string
  total_entries: number
  dominant_emotion: string
  avg_intensity: number
  emotion_distribution: Record<string, number>
}

export interface WeeklyStats {
  week_start: string
  week_end: string
  total_entries: number
  daily_stats: DailyStats[]
  emotion_trend: Record<string, number[]>
}

export interface MonthlyStats {
  month: number
  year: number
  total_entries: number
  weekly_stats: WeeklyStats[]
  emotion_patterns: Record<string, number>
}

export const diaryApi = {
  createEntry: async (content: string): Promise<DiaryEntry> => {
    const response = await apiClient.post<DiaryEntry>('/entries', { content })
    return response.data
  },
  
  getEntries: async (startDate?: string, endDate?: string): Promise<DiaryEntry[]> => {
    const params: any = {}
    if (startDate) params.start_date = startDate
    if (endDate) params.end_date = endDate
    const response = await apiClient.get<DiaryEntry[]>('/entries', { params })
    return response.data
  },
}

export const statsApi = {
  getDailyStats: async (date?: string): Promise<DailyStats> => {
    const params: any = {}
    if (date) params.target_date = date
    const response = await apiClient.get<DailyStats>('/stats/daily', { params })
    return response.data
  },
  
  getWeeklyStats: async (date?: string): Promise<WeeklyStats> => {
    const params: any = {}
    if (date) params.target_date = date
    const response = await apiClient.get<WeeklyStats>('/stats/weekly', { params })
    return response.data
  },
  
  getMonthlyStats: async (date?: string): Promise<MonthlyStats> => {
    const params: any = {}
    if (date) params.target_date = date
    const response = await apiClient.get<MonthlyStats>('/stats/monthly', { params })
    return response.data
  },
}

export const healthApi = {
  createHealthData: async (data: {
    heart_rate?: number
    steps?: number
    sleep_hours?: number
    calories?: number
  }): Promise<HealthData> => {
    const response = await apiClient.post<HealthData>('/health-data', data)
    return response.data
  },
  
  getHealthData: async (startDate?: string, endDate?: string): Promise<HealthData[]> => {
    const params: any = {}
    if (startDate) params.start_date = startDate
    if (endDate) params.end_date = endDate
    const response = await apiClient.get<HealthData[]>('/health-data', { params })
    return response.data
  },
}

export const watchApi = {
  getWatchData: async (params?: {
    start_date?: string
    end_date?: string
    device_id?: string
    limit?: number
  }): Promise<WatchData[]> => {
    const response = await apiClient.get<WatchData[]>('/watch', { params })
    return response.data
  },

  getLatestWatchData: async (deviceId?: string): Promise<WatchData | null> => {
    const params: any = {}
    if (deviceId) params.device_id = deviceId
    const response = await apiClient.get<WatchData | null>('/watch/latest', { params })
    return response.data
  },

  getWatchAnalytics: async (params?: {
    period?: 'day' | 'week' | 'month'
    target_date?: string
    device_id?: string
  }): Promise<WatchAnalytics> => {
    const response = await apiClient.get<WatchAnalytics>('/watch/analytics', { params })
    return response.data
  },

  createWatchData: async (data: Partial<WatchData>): Promise<WatchData> => {
    const response = await apiClient.post<WatchData>('/watch', data)
    return response.data
  },
}

export interface EmotionLabel {
  id: number
  device_id?: string
  timestamp: string
  emotion: string
  intensity: number
  note?: string
}

export interface EmotionPrediction {
  emotion: string
  confidence: number
  probabilities: Record<string, number>
  timestamp: string
}

export const emotionApi = {
  createEmotionLabel: async (data: {
    device_id?: string
    emotion: string
    intensity: number
    note?: string
  }): Promise<EmotionLabel> => {
    const response = await apiClient.post<EmotionLabel>('/emotions', data)
    return response.data
  },

  getEmotionLabels: async (params?: {
    device_id?: string
    start_date?: string
    end_date?: string
    limit?: number
  }): Promise<EmotionLabel[]> => {
    const response = await apiClient.get<EmotionLabel[]>('/emotions', { params })
    return response.data
  },

  predictEmotion: async (deviceId?: string): Promise<EmotionPrediction> => {
    const params: any = {}
    if (deviceId) params.device_id = deviceId
    const response = await apiClient.get<EmotionPrediction>('/emotions/predict', { params })
    return response.data
  },
}

