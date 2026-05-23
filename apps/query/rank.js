import axios from 'axios'
import plugin from '../../../../lib/plugins/plugin.js'
import { CodeTimeApi, formatDateTime, formatMinutes, formatNumber, getCurrentAccount } from '../../model/codetimeApi.js'
import { renderCodeTimeCard } from '../../model/codetimeRender.js'
import { getCalendarTimeWindow } from '../../model/codetimeUtils.js'

const RANK_SCOPES = {
  日: { label: '日榜', days: 1 },
  周: { label: '周榜' },
  月: { label: '月榜' },
  年: { label: '年榜' }
}

const AVATAR_TIMEOUT_MS = 2500
const AVATAR_MAX_BYTES = 220 * 1024
const AVATAR_CONCURRENCY = 5

function parseRankScope(message = '') {
  const text = String(message || '')
  const scope = text.match(/排行([日周月年])榜/)?.[1] || '日'
  const config = RANK_SCOPES[scope] || RANK_SCOPES.日
  return {
    scope,
    label: config.label,
    days: config.days || getCalendarTimeWindow(scope).days
  }
}

function formatLeaderboard(data = {}, scope = {}, selfRank = null) {
  const entries = Array.isArray(data.entries) ? data.entries : []
  const lines = [
    `CodeTime ${scope.label}`,
    `统计天数：${scope.days}天`,
    `参与人数：${formatNumber(data.totalUsers || entries.length)}`
  ]
  if (data.updatedAt) lines.push(`更新时间：${formatDateTime(data.updatedAt)}`)
  lines.push('')

  if (entries.length === 0) {
    lines.push('暂无榜单数据')
    return lines.join('\n')
  }

  for (const item of entries.slice(0, 20)) {
    const user = item.user || {}
    const name = user.username || user.email || `用户 ${user.id || item.rank || ''}`
    lines.push(`${item.rank || '-'}. ${name} - ${formatMinutes(item.totalMinutes)}`)
  }

  if (selfRank) {
    lines.push('')
    lines.push('我的排名')
    lines.push(`${selfRank.username || '当前用户'} - ${formatMinutes(selfRank.totalMinutes)}`)
    lines.push(`位置：${formatPercentile(selfRank.percentile)}`)
    if (selfRank.updatedAt) lines.push(`更新时间：${formatDateTime(selfRank.updatedAt)}`)
  }

  return lines.join('\n')
}

function formatPercentile(value) {
  if (value === undefined || value === null || Number.isNaN(Number(value))) return '暂无'
  return `前 ${(Number(value) * 100).toFixed(2)}%`
}

async function fetchAvatarDataUri(url = '') {
  if (!/^https?:\/\//i.test(url)) return ''

  try {
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: AVATAR_TIMEOUT_MS,
      maxContentLength: AVATAR_MAX_BYTES,
      headers: {
        accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        'user-agent': 'Mozilla/5.0 CodeTime-plugin'
      },
      validateStatus: (status) => status >= 200 && status < 300
    })
    const type = String(response.headers?.['content-type'] || 'image/png').split(';')[0]
    const bytes = Buffer.from(response.data)
    if (!bytes.length || bytes.length > AVATAR_MAX_BYTES) return ''
    return `data:${type};base64,${bytes.toString('base64')}`
  } catch (err) {
    logger.debug?.(`[CodeTime] 头像加载失败: ${url} ${err.message}`)
    return ''
  }
}

async function mapLimit(items = [], limit = 4, mapper) {
  const results = new Array(items.length)
  let index = 0
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (index < items.length) {
      const current = index++
      results[current] = await mapper(items[current], current)
    }
  })
  await Promise.all(workers)
  return results
}

async function formatLeaderboardItems(entries = [], account = {}) {
  const accountId = account?.id === undefined || account?.id === null ? '' : String(account.id)
  const list = (entries || []).slice(0, 20)
  return mapLimit(list, AVATAR_CONCURRENCY, async (item) => {
    const user = item.user || {}
    const minutes = Number(item.totalMinutes || 0)
    const timezone = user.timezone || '未知时区'
    const bio = user.bio ? String(user.bio).trim() : ''
    return {
      rank: item.rank || '-',
      name: user.username || user.email || `用户 ${user.id || item.rank || ''}`,
      sub: bio || timezone,
      initial: String(user.username || user.email || user.id || '?').trim().slice(0, 1),
      avatar: await fetchAvatarDataUri(user.avatar || ''),
      isSelf: accountId && String(user.id) === accountId,
      minutes,
      minutesText: `${formatNumber(minutes)} 分钟`,
      duration: formatMinutes(minutes)
    }
  })
}

function findSelfEntry(entries = [], account = {}) {
  const accountId = account?.id === undefined || account?.id === null ? '' : String(account.id)
  if (!accountId) return null
  return (entries || []).find((item) => String(item?.user?.id) === accountId) || null
}

async function getSelfRankIfNeeded(account, entries = [], scope = {}) {
  if (!account?.cookie || findSelfEntry(entries, account)) return null

  try {
    return await new CodeTimeApi(account.cookie).getOverallRank({ days: scope.days })
  } catch (err) {
    logger.debug?.(`[CodeTime] 获取本人排名失败: ${err.message}`)
    return null
  }
}

async function formatSelfRank(rank = {}, account = {}) {
  if (!rank) return null
  const avatarUrl = account.avatar || ''
  const name = rank.username || account.username || `用户 ${rank.userId || account.id || ''}`
  return {
    name,
    initial: String(name || account.id || '?').trim().slice(0, 1),
    avatar: await fetchAvatarDataUri(avatarUrl),
    duration: formatMinutes(rank.totalMinutes),
    minutesText: `${formatNumber(rank.totalMinutes || 0)} 分钟`,
    percentile: formatPercentile(rank.percentile),
    days: rank.timeRangeDays ? `${rank.timeRangeDays}天` : ''
  }
}

async function renderLeaderboardImage(scope = {}, data = {}, account = {}, selfRank = null) {
  const entries = Array.isArray(data.entries) ? data.entries : []
  const items = await formatLeaderboardItems(entries, account)
  const self = await formatSelfRank(selfRank, account)
  return renderCodeTimeCard('rank', {
    view: {
      title: `CodeTime ${scope.label}`,
      subtitle: `公开编程时长榜单 · 统计 ${scope.days} 天`,
      badges: [
        `Top ${Math.min(20, entries.length)}`,
        `${formatNumber(data.totalUsers || entries.length)} 人`,
        data.updatedAt ? `更新 ${formatDateTime(data.updatedAt)}` : ''
      ],
      sections: [
        {
          title: '公开排行榜',
          type: 'leaderboard',
          meta: `显示前 ${Math.min(20, entries.length)} 名`,
          items,
          self
        }
      ]
    },
    saveId: `rank-${scope.scope}`,
    pageGotoParams: {
      timeout: 15000,
      waitUntil: 'domcontentloaded'
    }
  })
}

export class rank extends plugin {
  constructor() {
    super({
      name: 'CodeTime',
      dsc: 'CodeTime 排行榜',
      event: 'message',
      priority: 1,
      rule: [
        { reg: '^#ct(?:排行|排行榜|排行[日周月年]榜)$', fnc: 'leaderboard' }
      ]
    })
  }

  async leaderboard(e) {
    const scope = parseRankScope(e.msg)

    try {
      const api = new CodeTimeApi()
      const [data, account] = await Promise.all([
        api.getLeaderboard({ days: scope.days }),
        getCurrentAccount(e.user_id)
      ])
      const entries = Array.isArray(data.entries) ? data.entries : []
      const selfRank = await getSelfRankIfNeeded(account, entries, scope)
      try {
        const img = await renderLeaderboardImage(scope, data, account, selfRank)
        if (img) return e.reply(img)
      } catch (err) {
        logger.error(`[CodeTime] 排行榜渲染失败: ${err}`)
      }
      return e.reply(formatLeaderboard(data, scope, selfRank), true)
    } catch (err) {
      logger.error(`[CodeTime] 排行榜请求失败: ${err}`)
      return e.reply(`请求失败：${err.message}`, true)
    }
  }
}
