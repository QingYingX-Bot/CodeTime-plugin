import plugin from '../../../../lib/plugins/plugin.js'
import {
  formatNumber,
  formatDateTime,
  formatMinutes,
  formatTokenListValue,
  formatTokenValue,
  getDefaultTimezone
} from '../../model/codetimeApi.js'
import {
  buildHeroUser,
  formatTopItems,
  getApiContext,
  getCalendarTimeWindow,
  getTimeRange,
  replyError,
  sumMinutes
} from '../../model/codetimeUtils.js'
import { TOP_LABELS, VIBE_LABELS } from '../../model/codetimeLabels.js'
import { renderCodeTimeCard } from '../../model/codetimeRender.js'

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

function formatHourDistributionItems(items = []) {
  if (!Array.isArray(items) || items.length === 0) return []

  const hourMap = new Map()
  for (const item of items) {
    const hour = Number(item.hour || 0)
    hourMap.set(hour, (hourMap.get(hour) || 0) + Number(item.count || 0))
  }

  return Array.from(hourMap.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([hour, count]) => `${String(hour).padStart(2, '0')}点 ${count}次`)
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

  const lines = [VIBE_LABELS.modelTop]
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

function formatDurationRows(items = [], limit = 3) {
  return (items || []).slice(0, limit).map((item, index) => ({
    name: `${index + 1}. ${item.field || item.by || item.language || item.project || '未知'}`,
    value: formatMinutes(item.minutes || item.duration || item.totalMinutes),
    sub: item.time || ''
  }))
}

function formatTokenRows(items = [], nameKeys = [], valueKeys = ['totalTokens', 'tokens'], limit = 3) {
  return (items || [])
    .slice()
    .sort((a, b) => Number(b[valueKeys[0]] || 0) - Number(a[valueKeys[0]] || 0))
    .slice(0, limit)
    .map((item, index) => ({
      name: `${index + 1}. ${nameKeys.map((key) => item[key]).find(Boolean) || '未知'}`,
      value: formatTokenListValue(valueKeys.map((key) => Number(item[key] || 0)).find((num) => num > 0) || 0)
    }))
}

function formatModelRows(items = [], limit = 3) {
  return (items || [])
    .slice()
    .sort((a, b) => getModelTokenCount(b) - getModelTokenCount(a))
    .slice(0, limit)
    .map((item, index) => ({
      name: `${index + 1}. ${item.pricing?.displayName || item.model || '未知'}`,
      value: formatTokenListValue(getModelTokenCount(item))
    }))
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
        lines.push(TOP_LABELS.language)
        lines.push(formatTopItems(languageList))
      }

      if (workspaceList.length > 0) {
        lines.push(TOP_LABELS.project)
        lines.push(formatTopItems(workspaceList))
      }

      if (distributionList.length > 0) {
        lines.push('时间分布')
        lines.push(formatHourDistribution(distributionList))
      }

      lines.push(VIBE_LABELS.overview)
      lines.push(`会话：${formatNumber(agentSummary.totalSessions || 0)}`)
      lines.push(`Token：${formatTokenValue(agentSummary.totalTokens || 0)}`)
      lines.push(`成本：${formatUsd(sumEstimatedCost(agentData))}`)
      lines.push(`持续时间：${formatDurationMs(agentSummary.totalDurationMs || 0)}`)
      if (agentSources.length > 0) lines.push(`来源：${agentSources.join('、')}`)
      lines.push(...formatTopList(TOP_LABELS.project, agentData?.projectTokens, ['project', 'name']))
      lines.push(...formatModelTop(agentData?.modelCosts))
      lines.push(...formatTopList(VIBE_LABELS.agentTop, agentData?.agentCosts, ['source', 'agent', 'name']))

      const sections = []
      if (languageList.length > 0) sections.push({ title: TOP_LABELS.language, items: formatDurationRows(languageList) })
      if (workspaceList.length > 0) sections.push({ title: TOP_LABELS.project, items: formatDurationRows(workspaceList) })
      if (distributionList.length > 0) sections.push({ title: '时间分布', type: 'time-distribution', points: distributionList })
      if ((agentData?.projectTokens || []).length > 0) sections.push({ title: VIBE_LABELS.projectTop, items: formatTokenRows(agentData.projectTokens, ['project', 'name']) })
      if ((agentData?.modelCosts || []).length > 0) sections.push({ title: VIBE_LABELS.modelTop, items: formatModelRows(agentData.modelCosts) })
      if ((agentData?.agentCosts || []).length > 0) sections.push({ title: VIBE_LABELS.agentTop, items: formatTokenRows(agentData.agentCosts, ['source', 'agent', 'name']) })

      const view = {
        title: 'CodeTime Today',
        user: await buildHeroUser(ctx.account, `日期：${formatDateTime(range.startTime).slice(0, 10)}`),
        metrics: [
          { label: '编程总时长', value: formatMinutes(sumMinutes(timeList)) },
          { label: VIBE_LABELS.sessions, value: formatNumber(agentSummary.totalSessions || 0) },
          { label: VIBE_LABELS.token, value: formatTokenValue(agentSummary.totalTokens || 0) },
          { label: VIBE_LABELS.cost, value: formatUsd(sumEstimatedCost(agentData)) },
          { label: VIBE_LABELS.duration, value: formatDurationMs(agentSummary.totalDurationMs || 0) },
          { label: '工具调用', value: formatNumber(agentSummary.totalToolCalls || 0) },
          { label: '事件', value: formatNumber(agentSummary.totalEvents || 0) },
          { label: '代码变更', value: `+${formatNumber(agentSummary.totalLinesAdded || 0)} / -${formatNumber(agentSummary.totalLinesRemoved || 0)}` }
        ],
        sections
      }

      try {
        const img = await renderCodeTimeCard('today', { view })
        if (img) return e.reply(img)
      } catch (err) {
        logger.error(`[CodeTime] 今日渲染失败: ${err}`)
      }

      return e.reply(lines.join('\n'))
    } catch (err) {
      return replyError(e, err)
    }
  }
}
