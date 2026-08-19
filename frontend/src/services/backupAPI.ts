import api, { retryRequest } from './api'
import type { Backup, BackupStatsResponse, BackupListResponse } from '../types/backup'

export const backupAPI = {
  getStats: async (node?: string): Promise<BackupStatsResponse> => {
    return retryRequest(async () => {
      const response = await api.get<BackupStatsResponse>('/clickhouse/backups/stats', {
        params: node ? { node } : {},
      })
      return response.data
    })
  },

  getInProgress: async (node?: string): Promise<Backup[]> => {
    return retryRequest(async () => {
      const response = await api.get<{ items: Backup[] }>('/clickhouse/backups/in-progress', {
        params: node ? { node } : {},
      })
      return response.data.items
    })
  },

  getCompleted: async (node?: string, limit: number = 10, offset: number = 0): Promise<BackupListResponse> => {
    return retryRequest(async () => {
      const response = await api.get<BackupListResponse>('/clickhouse/backups/completed', {
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
      const response = await api.get<Backup>(`/clickhouse/backups/${id}`, {
        params: node ? { node } : {},
      })
      return response.data
    })
  },
}

