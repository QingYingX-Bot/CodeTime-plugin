import common from '../../../lib/common/common.js'
import {
  CodeTimeApi,
  formatDateTime,
  formatMinutes,
  getCurrentAccount,
  getDefaultTimezone
} from './codetimeApi.js'

export const CODETIME_FIELDS = {
  语言: { value: 'language', label: '语言' },
  项目: { value: 'workspace', label: '项目' },
  平台: { value: 'platform', label: '平台' }
}

const SHANGHAI_OFFSET_MS = 8 * 60 * 60 * 1000

function formatDatePart(year, month, day) {
  return [
    year,
    String(month + 1).padStart(2, '0'),
    String(day).padStart(2, '0')
  ].join('-')
}

export function getMsg(e) {
  return String(e.msg || e.raw_message || '').trim()
}

export function getLastNumber(e, fallback = 0) {
  return Number(getMsg(e).match(/(\d+)\s*$/)?.[1] || fallback)
}

export function parseField(message = '') {
  const text = String(message)
  for (const [label, info] of Object.entries(CODETIME_FIELDS)) {
    if (text.includes(label)) return info.value
  }
  return null
}

export function getFieldLabel(field = '') {
  return Object.values(CODETIME_FIELDS).find((info) => info.value === field)?.label || ''
}

export function parseFieldLabel(message = '') {
  return getFieldLabel(parseField(message))
}

function getShanghaiParts(date = new Date()) {
  const shanghai = new Date(date.getTime() + SHANGHAI_OFFSET_MS)
  return {
    year: shanghai.getUTCFullYear(),
    month: shanghai.getUTCMonth(),
    day: shanghai.getUTCDate(),
    weekday: shanghai.getUTCDay()
  }
}

export function parseTimeScope(message = '') {
  return String(message).match(/#ct(?:编程)?([日周月年])(?:时间分布|时间|详情)/)?.[1] || '月'
}

export function getTimeWindow(scope = '月') {
  const now = new Date()
  const { year, month, day, weekday } = getShanghaiParts(now)
  let start

  switch (scope) {
    case '日':
      start = Date.UTC(year, month, day) - SHANGHAI_OFFSET_MS
      break
    case '周': {
      const offset = weekday === 0 ? -6 : 1 - weekday
      start = Date.UTC(year, month, day + offset) - SHANGHAI_OFFSET_MS
      break
    }
    case '年':
      start = Date.UTC(year, 0, 1) - SHANGHAI_OFFSET_MS
      break
    case '月':
    default:
      start = Date.UTC(year, month, 1) - SHANGHAI_OFFSET_MS
      break
  }

  const todayStart = Date.UTC(year, month, day) - SHANGHAI_OFFSET_MS
  const startParts = getShanghaiParts(new Date(start))
  const startTime = new Date(start).toISOString()
  const endTime = now.toISOString()
  const days = Math.max(1, Math.round((todayStart - start) / 86400000) + 1)

  return {
    startTime,
    endTime,
    days,
    startDate: formatDatePart(startParts.year, startParts.month, startParts.day),
    endDate: formatDatePart(year, month, day)
  }
}

export function getTimeRange(scope = '月') {
  const { startTime, endTime } = getTimeWindow(scope)
  return { startTime, endTime }
}

export async function getApiContext(e) {
  const account = await getCurrentAccount(e.user_id)
  if (!account) {
    e.reply('请先发送 #ct绑定 [cookie] 绑定 CodeTime 账号', true)
    return null
  }

  return {
    account,
    tz: account.timezone || getDefaultTimezone(),
    api: new CodeTimeApi(account.cookie)
  }
}

export async function replyForward(e, title, messages = []) {
  return e.reply(await common.makeForwardMsg(e, messages, title), true)
}

export function replyError(e, err) {
  logger.error(`[CodeTime] 请求失败: ${err}`)
  return e.reply(`请求失败：${err.message}`, true)
}

export function formatTopItems(items = []) {
  if (!Array.isArray(items) || items.length === 0) return '暂无'
  return items
    .slice(0, 5)
    .map((item, index) => `${index + 1}. ${item.field || item.by || item.language || item.project || '未知'} - ${formatMinutes(item.minutes || item.duration || item.totalMinutes)}`)
    .join('\n')
}

export function sumMinutes(items = []) {
  return (items || []).reduce((sum, item) => sum + Number(item.duration || item.minutes || item.totalMinutes || 0), 0)
}

export function groupByTime(items = []) {
  const groups = new Map()
  for (const item of items || []) {
    const key = item.time || '未知日期'
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(item)
  }

  return [...groups.entries()].map(([time, list]) => ({
    time,
    items: list.slice().sort((a, b) => Number(b.duration || 0) - Number(a.duration || 0))
  }))
}

export function formatStatsLines(title, data = []) {
  const lines = [title]
  for (const day of groupByTime(data)) {
    lines.push(day.time)
    for (const item of day.items) {
      const name = item.by || item.field || ''
      const value = formatMinutes(item.duration || item.minutes || item.totalMinutes)
      lines.push(name ? `  ${name} - ${value}` : `  ${value}`)
    }
  }
  return lines.join('\n')
}

export function formatProfileLines(user = {}) {
  return [
    'CodeTime 资料',
    `昵称：${user.username || '未知'}`,
    `ID：${user.id || '未知'}`,
    `邮箱：${user.email || '未知'}`,
    `时区：${user.timezone || getDefaultTimezone()}`,
    `计划：${user.plan || '未知'}`,
    `创建：${formatDateTime(user.createdAt)}`,
    `更新：${formatDateTime(user.updatedAt)}`
  ].join('\n')
}
