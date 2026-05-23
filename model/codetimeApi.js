import axios from 'axios'

const BASE_URL = 'https://codetime.dev'
const API_PREFIX = '/v3'
const DEFAULT_TZ = 'Asia/Shanghai'

export const REDIS_KEY = (userId) => `CODETIME:USER:${userId}`

function nowIso() {
  return new Date().toISOString()
}

function normalizeCookie(cookie = '') {
  return String(cookie || '').trim()
}

function normalizeAccount(account = {}) {
  const cookie = normalizeCookie(account.cookie)
  if (!cookie) return null

  return {
    id: account.id,
    username: account.username || account.email || String(account.id || ''),
    avatar: account.avatar || '',
    timezone: account.timezone || DEFAULT_TZ,
    cookie,
    bindTime: account.bindTime || nowIso(),
    isPrimary: account.isPrimary === true
  }
}

function normalizeResponseDetail(data) {
  if (!data) return ''
  if (typeof data === 'string') return data
  if (typeof data.detail === 'string') return data.detail
  if (typeof data.message === 'string') return data.message
  return JSON.stringify(data)
}

function isPlanLimitError(data) {
  const detail = normalizeResponseDetail(data)
  return detail.includes('Free plan can only fetch logs for 90 days')
}

export function formatMinutes(minutes = 0) {
  const value = Math.max(0, Math.round(Number(minutes) || 0))
  const hours = Math.floor(value / 60)
  const mins = value % 60
  if (hours <= 0) return `${mins}分钟`
  if (mins <= 0) return `${hours}小时`
  return `${hours}小时${mins}分钟`
}

export function formatNumber(num = 0) {
  return Number(num || 0).toLocaleString('zh-CN')
}

export function formatPercent(percentile) {
  if (percentile === undefined || percentile === null || Number.isNaN(Number(percentile))) return '暂无'
  return `前 ${(Number(percentile) * 100).toFixed(2)}%`
}

export function formatDateTime(value) {
  if (!value) return '暂无'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleString('zh-CN', {
    timeZone: DEFAULT_TZ,
    hour12: false
  })
}

export function getDefaultTimezone() {
  return DEFAULT_TZ
}

export async function getAccounts(userId) {
  const text = await redis.get(REDIS_KEY(userId))
  if (!text) return []

  try {
    const parsed = JSON.parse(text)
    const source = Array.isArray(parsed) ? parsed : [parsed]
    const accounts = source.map(normalizeAccount).filter(Boolean)
    if (accounts.length > 0 && !accounts.some((account) => account.isPrimary)) {
      accounts[0].isPrimary = true
      await saveAccounts(userId, accounts)
    }
    return accounts
  } catch (err) {
    logger.error(`[CodeTime] 解析用户绑定失败: ${err}`)
    return []
  }
}

export async function saveAccounts(userId, accounts = []) {
  const normalized = accounts.map(normalizeAccount).filter(Boolean)
  if (normalized.length === 0) {
    await redis.del(REDIS_KEY(userId))
    return []
  }

  if (!normalized.some((account) => account.isPrimary)) {
    normalized[0].isPrimary = true
  }

  await redis.set(REDIS_KEY(userId), JSON.stringify(normalized))
  return normalized
}

export async function getCurrentAccount(userId) {
  const accounts = await getAccounts(userId)
  if (accounts.length === 0) return null
  return accounts.find((account) => account.isPrimary) || accounts[0]
}

export async function bindAccount(userId, cookie) {
  const api = new CodeTimeApi(cookie)
  const user = await api.getSelf()
  const accounts = await getAccounts(userId)

  const nextAccount = normalizeAccount({
    id: user.id,
    username: user.username,
    avatar: user.avatar,
    timezone: user.timezone || DEFAULT_TZ,
    cookie,
    bindTime: nowIso(),
    isPrimary: accounts.length === 0
  })

  const index = accounts.findIndex((account) => String(account.id) === String(nextAccount.id))
  if (index >= 0) {
    nextAccount.isPrimary = accounts[index].isPrimary
    accounts[index] = nextAccount
  } else {
    accounts.push(nextAccount)
  }

  await saveAccounts(userId, accounts)
  return nextAccount
}

export async function switchAccount(userId, index) {
  const accounts = await getAccounts(userId)
  const targetIndex = Number(index) - 1
  if (targetIndex < 0 || targetIndex >= accounts.length) return null

  const updated = accounts.map((account, i) => ({
    ...account,
    isPrimary: i === targetIndex
  }))
  await saveAccounts(userId, updated)
  return updated[targetIndex]
}

export async function deleteAccount(userId, index) {
  const accounts = await getAccounts(userId)
  const targetIndex = Number(index) - 1
  if (targetIndex < 0 || targetIndex >= accounts.length) return null

  const [removed] = accounts.splice(targetIndex, 1)
  if (accounts.length > 0 && !accounts.some((account) => account.isPrimary)) {
    accounts[0].isPrimary = true
  }
  await saveAccounts(userId, accounts)
  return removed
}

export class CodeTimeApi {
  constructor(cookie = '') {
    this.cookie = normalizeCookie(cookie)
  }

  buildUrl(path, query = {}) {
    const url = new URL(`${BASE_URL}${API_PREFIX}${path}`)
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === '') continue
      url.searchParams.set(key, String(value))
    }
    return url.toString()
  }

  async request(path, query = {}) {
    const headers = {
      accept: 'application/json'
    }
    if (this.cookie) headers.cookie = this.cookie

    try {
      const response = await axios.get(this.buildUrl(path, query), {
        headers,
        timeout: 25000,
        validateStatus: () => true
      })

      if (response.status === 403 && isPlanLimitError(response.data)) {
        throw new Error('请升级订阅计划')
      }

      if (response.status === 401 || response.status === 403) {
        throw new Error('鉴权失败，请确认 cookie 是否有效')
      }

      if (response.status < 200 || response.status >= 300) {
        const detail = typeof response.data === 'string'
          ? response.data.slice(0, 120)
          : JSON.stringify(response.data || {}).slice(0, 120)
        throw new Error(`接口异常：${response.status}${detail && detail !== '{}' ? ` - ${detail}` : ''}`)
      }

      return response.data
    } catch (err) {
      if (err.message === '请升级订阅计划') {
        throw err
      }

      if (err.response?.status === 401 || err.response?.status === 403) {
        if (isPlanLimitError(err.response?.data)) {
          throw new Error('请升级订阅计划')
        }
        throw new Error('鉴权失败，请确认 cookie 是否有效')
      }

      if (err.code === 'ECONNABORTED') {
        throw new Error('请求超时，请稍后再试')
      }

      throw new Error(err.message || '请求失败')
    }
  }

  getSelf() {
    return this.request('/users/self')
  }

  getLatestLogs(limit = 1) {
    return this.request('/users/self/latest-logs', { limit })
  }

  getStatsTime({ tz = DEFAULT_TZ, startTime, endTime, limit } = {}) {
    return this.request('/users/self/stats_time', {
      tz,
      start_time: startTime,
      end_time: endTime,
      limit
    })
  }

  getStats({ by, tz = DEFAULT_TZ, startTime, endTime, limit } = {}) {
    return this.request('/users/self/stats', {
      by,
      tz,
      start_time: startTime,
      end_time: endTime,
      limit
    })
  }

  getTop({ field } = {}) {
    return this.request('/users/self/top', { field })
  }

  getTimeDistribution({ startTime, endTime, tz = DEFAULT_TZ } = {}) {
    return this.request('/users/self/time-distribution', {
      start_time: startTime,
      end_time: endTime,
      tz
    })
  }

  getAgentDashboard({ tz = DEFAULT_TZ, since, until, days } = {}) {
    return this.request('/agent/dashboard', {
      tz,
      since,
      until,
      days
    })
  }

  getAgentSessions({ limit = 10, cursor } = {}) {
    return this.request('/agent/sessions', {
      limit,
      cursor
    })
  }
}
