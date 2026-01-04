import api from './api'
import type { Backup, BackupStatsResponse, BackupListResponse } from '../types/backup'

// Retry helper function
const retryRequest = async <T>(
  requestFn: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 500
): Promise<T> => {
  let lastError: Error | null = null
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await requestFn()
    } catch (error) {
      lastError = error as Error
      if (attempt < maxRetries - 1) {
        // Exponential backoff
        const waitTime = delay * Math.pow(2, attempt)
        await new Promise((resolve) => setTimeout(resolve, waitTime))
      }
    }
  }
  
  throw lastError || new Error('Request failed after retries')
}

export const backupAPI = {
  getStats: async (node?: string): Promise<BackupStatsResponse> => {
    return retryRequest(async () => {
      const response = await api.get<BackupStatsResponse>('/backups/stats', {
        params: node ? { node } : {},
      })
      return response.data
    })
  },

  getInProgress: async (node?: string): Promise<Backup[]> => {
    return retryRequest(async () => {
      const response = await api.get<{ items: Backup[] }>('/backups/in-progress', {
        params: node ? { node } : {},
      })
      return response.data.items
    })
  },

  getCompleted: async (node?: string, limit: number = 10, offset: number = 0): Promise<BackupListResponse> => {
    return retryRequest(async () => {
      const response = await api.get<BackupListResponse>('/backups/completed', {
        params: {
          ...(node ? { node } : {}),
          limit,
          offset,
        },
      })
      return response.data
    })
  },

  getById: async (id: string, node?: string): Promise<Backup> => {
    return retryRequest(async () => {
      const response = await api.get<Backup>(`/backups/${id}`, {
        params: node ? { node } : {},
      })
      return response.data
    })
  },
}

