import api from './api'

/** One row from GET /clickhouse/settings/all */
export interface DBSettingItem {
  name: string
  description: string
  value: string
  type: string
  changed: boolean
  changeable_without_restart: string
  server: boolean
  tier: string
}

export interface AllDBSettingsResponse {
  settings: DBSettingItem[]
  total: number
  limit: number
  offset: number
}

/** GET /clickhouse/settings/one */
export interface DBSettingDetailItem extends DBSettingItem {
  min?: string
  max?: string
  readonly: boolean
}

export interface AllSettingsParams {
  node?: string
  limit?: number
  offset?: number
  sort?: 'name' | 'changed' | 'server'
  order?: 'asc' | 'desc'
  tier?: string
  type?: string
  server?: boolean
  q?: string
}

function toQuery(params: AllSettingsParams): Record<string, string | number> {
  const q: Record<string, string | number> = {}
  if (params.node) q.node = params.node
  if (params.limit != null) q.limit = params.limit
  if (params.offset != null) q.offset = params.offset
  if (params.sort) q.sort = params.sort
  if (params.order) q.order = params.order
  if (params.tier) q.tier = params.tier
  if (params.type) q.type = params.type
  if (params.server !== undefined) q.server = params.server ? 'true' : 'false'
  if (params.q) q.q = params.q
  return q
}

export const settingsAPI = {
  async getAll(params: AllSettingsParams): Promise<AllDBSettingsResponse> {
    const { data } = await api.get<AllDBSettingsResponse>('/clickhouse/settings/all', {
      params: toQuery(params),
    })
    return data
  },

  async getOne(node: string | undefined, name: string): Promise<DBSettingDetailItem> {
    const params: Record<string, string> = { name }
    if (node) params.node = node
    const { data } = await api.get<DBSettingDetailItem>('/clickhouse/settings/one', { params })
    return data
  },
}
