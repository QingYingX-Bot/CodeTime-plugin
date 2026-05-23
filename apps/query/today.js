import plugin from '../../../../lib/plugins/plugin.js'
import {
  formatNumber,
  formatDateTime,
  formatMinutes,
  getDefaultTimezone
} from '../../model/codetimeApi.js'
import {
  formatTopItems,
  getApiContext,
  getCalendarTimeWindow,
  getTimeRange,
  replyError,
  sumMinutes
} from '../../model/codetimeUtils.js'

function formatHourDistribution(items = []) {
  if (!Array.isArray(items) || items.length === 0) return '暂无'

  const hourMap = new Map()
  for (const item of items) {
    const hour = Number(item.hour || 0)
    hourMap.set(hour, (hourMap.get(hour) || 0) + Number(item.count || 0))
  }

  return Array.from(hourMap.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([hour, count]) => `${String(hour).padStart(2, '0')}点：${count}次`)
    .join('，')
}

function formatDurationMs(ms = 0) {
  const totalMinutes = Math.max(0, Math.round(Number(ms || 0) / 60000))
  const days = Math.floor(totalMinutes / 1440)
  const hours = Math.floor((totalMinutes % 1440) / 60)
  const minutes = totalMinutes % 60
  const parts = []
  if (days > 0) parts.push(`${days}天`)
  if (hours > 0) parts.push(`${hours}小时`)
  if (minutes > 0 || parts.length === 0) parts.push(`${minutes}分钟`)
  return parts.join('')
}

function trimDecimals(text) {
  return String(text).replace(/\.0+$/, '').replace(/(\.\d*[1-9])0+$/, '$1')
}

function formatTokenValue(value = 0) {
  const num = Number(value || 0)
  const abs = Math.abs(num)
  let scaled = num
  let unit = ''

  if (abs >= 1e9) {
    scaled = num / 1e9
    unit = 'B'
  } else if (abs >= 1e6) {
    scaled = num / 1e6
    unit = 'M'
  } else if (abs >= 1e3) {
    scaled = num / 1e3
    unit = 'K'
  }

  if (!unit) return formatNumber(num)

  return `${trimDecimals(scaled.toFixed(abs >= 100 ? 0 : abs >= 10 ? 1 : 2))}${unit}(${formatNumber(num)})`
}

function formatUsd(value = 0) {
  const num = Number(value || 0)
  return `$${num.toFixed(2)}`
}

function sumEstimatedCost(data = {}) {
  const summaryCost = Number(data.summary?.estimatedCostUsd)
  if (!Number.isNaN(summaryCost) && summaryCost > 0) return summaryCost

  return (data.tokenBuckets || []).reduce((sum, item) => sum + Number(item.estimatedCostUsd || 0), 0)
}

function getModelTokenCount(item = {}) {
  const direct = Number(item.totalTokens)
  if (!Number.isNaN(direct) && direct > 0) return direct

  return [item.inputTokens, item.outputTokens, item.reasoningOutputTokens]
    .reduce((sum, value) => sum + Number(value || 0), 0)
}

function formatTopList(title, items = [], nameKeys = [], valueKeys = ['totalTokens', 'tokens'], formatter = formatTokenValue) {
  if (!Array.isArray(items) || items.length === 0) return []

  const lines = [title]
  items
    .slice()
    .sort((a, b) => Number(b[valueKeys[0]] || 0) - Number(a[valueKeys[0]] || 0))
    .slice(0, 3)
    .forEach((item, index) => {
      const name = nameKeys.map((key) => item[key]).find(Boolean) || '未知'
      const value = valueKeys.map((key) => Number(item[key] || 0)).find((num) => num > 0) || 0
      lines.push(`${index + 1}. ${name} - ${formatter(value)}`)
    })
  return lines
}

function formatModelTop(items = []) {
  if (!Array.isArray(items) || items.length === 0) return []

  const lines = ['模型Top']
  items
    .slice()
    .sort((a, b) => getModelTokenCount(b) - getModelTokenCount(a))
    .slice(0, 3)
    .forEach((item, index) => {
      const name = item.pricing?.displayName || item.model || '未知'
      lines.push(`${index + 1}. ${name} - ${formatTokenValue(getModelTokenCount(item))}`)
    })
  return lines
}

export class today extends plugin {
  constructor() {
    super({
      name: 'CodeTime',
      dsc: 'CodeTime 今日总览',
      event: 'message',
      priority: 50,
      rule: [
        { reg: '^#ct今日$', fnc: 'today' }
      ]
    })
  }

  async today(e) {
    const ctx = await getApiContext(e)
    if (!ctx) return false

    try {
      const range = getTimeRange('日')
      const agentRange = getCalendarTimeWindow('日')
      const [timeStats, languageStats, workspaceStats, distributionStats] = await Promise.all([
        ctx.api.getStatsTime({ tz: ctx.tz, startTime: range.startTime, endTime: range.endTime }),
        ctx.api.getStats({ by: 'language', tz: ctx.tz, startTime: range.startTime, endTime: range.endTime }),
        ctx.api.getStats({ by: 'workspace', tz: ctx.tz, startTime: range.startTime, endTime: range.endTime }),
        ctx.api.getTimeDistribution({ tz: ctx.tz, startTime: range.startTime, endTime: range.endTime })
      ])
      let agentData
      try {
        agentData = await ctx.api.getAgentDashboard({
          tz: ctx.tz || getDefaultTimezone(),
          since: range.startTime,
          until: range.endTime
        })
      } catch (err) {
        if (err.message !== '请升级订阅计划') throw err
        agentData = await ctx.api.getAgentDashboard({
          tz: ctx.tz || getDefaultTimezone(),
          days: agentRange.days
        })
      }

      const timeList = timeStats?.data || []
      const languageList = languageStats?.data || []
      const workspaceList = workspaceStats?.data || []
      const distributionList = distributionStats?.data || []
      const agentSummary = agentData?.summary || {}
      const agentSources = Array.isArray(agentData?.availableSources) ? agentData.availableSources.filter(Boolean) : []

      if (
        timeList.length === 0 &&
        languageList.length === 0 &&
        workspaceList.length === 0 &&
        distributionList.length === 0 &&
        Number(agentSummary.totalSessions || 0) === 0 &&
        Number(agentSummary.totalTokens || 0) === 0
      ) {
        return e.reply('暂无今日数据')
      }

      const lines = [
        'CodeTime 今日',
        `账号：${ctx.account.username || '未知'}`,
        `日期：${formatDateTime(range.startTime).slice(0, 10)}`,
        `总时长：${formatMinutes(sumMinutes(timeList))}`
      ]

      if (languageList.length > 0) {
        lines.push('语言Top')
        lines.push(formatTopItems(languageList))
      }

      if (workspaceList.length > 0) {
        lines.push('项目Top')
        lines.push(formatTopItems(workspaceList))
      }

      if (distributionList.length > 0) {
        lines.push('时间分布')
        lines.push(formatHourDistribution(distributionList))
      }

      lines.push('AI概览')
      lines.push(`会话：${formatNumber(agentSummary.totalSessions || 0)}`)
      lines.push(`Token：${formatTokenValue(agentSummary.totalTokens || 0)}`)
      lines.push(`成本：${formatUsd(sumEstimatedCost(agentData))}`)
      lines.push(`持续时间：${formatDurationMs(agentSummary.totalDurationMs || 0)}`)
      if (agentSources.length > 0) lines.push(`来源：${agentSources.join('、')}`)
      lines.push(...formatTopList('项目Top', agentData?.projectTokens, ['project', 'name']))
      lines.push(...formatModelTop(agentData?.modelCosts))
      lines.push(...formatTopList('Agent Top', agentData?.agentCosts, ['source', 'agent', 'name']))

      return e.reply(lines.join('\n'))
    } catch (err) {
      return replyError(e, err)
    }
  }
}
