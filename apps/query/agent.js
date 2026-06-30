import plugin from '../../../../lib/plugins/plugin.js'
import {
  formatNumber,
  formatTokenListValue,
  formatTokenValue,
  getDefaultTimezone
} from '../../model/codetimeApi.js'
import {
  buildHeroUser,
  getApiContext,
  getCalendarTimeWindow,
  parseAgentTimeScope,
  replyError
} from '../../model/codetimeUtils.js'
import { TOP_LABELS, VIBE_LABELS, vibeStatsTitle } from '../../model/codetimeLabels.js'
import { renderCodeTimeCard } from '../../model/codetimeRender.js'

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
  return `$${num.toFixed(4)}`
}

function formatDateOnly(value) {
  if (!value) return '未知'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10)
  return date.toLocaleDateString('sv-SE', {
    timeZone: getDefaultTimezone()
  })
}

function sumEstimatedCost(data = {}) {
  const summaryCost = Number(data.summary?.estimatedCostUsd)
  if (!Number.isNaN(summaryCost) && summaryCost > 0) return summaryCost

  return (data.tokenBuckets || []).reduce((sum, item) => sum + Number(item.estimatedCostUsd || 0), 0)
}

function pickNumber(item = {}, keys = []) {
  for (const key of keys) {
    const value = Number(item[key])
    if (!Number.isNaN(value) && value > 0) return value
  }
  return 0
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
    .sort((a, b) => pickNumber(b, valueKeys) - pickNumber(a, valueKeys))
    .slice(0, 5)
    .forEach((item, index) => {
      const name = nameKeys.map((key) => item[key]).find(Boolean) || '未知'
      lines.push(`${index + 1}. ${name} - ${formatter(pickNumber(item, valueKeys))}`)
    })
  return lines
}

function formatModelTop(items = []) {
  if (!Array.isArray(items) || items.length === 0) return []

  const lines = [VIBE_LABELS.modelTokenTop]
  items
    .slice()
    .sort((a, b) => getModelTokenCount(b) - getModelTokenCount(a))
    .slice(0, 5)
    .forEach((item, index) => {
      const name = item.pricing?.displayName || item.model || '未知'
      lines.push(`${index + 1}. ${name} - ${formatTokenValue(getModelTokenCount(item))}`)
    })
  return lines
}

function formatTopRows(items = [], nameKeys = [], valueKeys = ['totalTokens', 'tokens'], limit = 5, formatter = formatTokenListValue) {
  return (items || [])
    .slice()
    .sort((a, b) => pickNumber(b, valueKeys) - pickNumber(a, valueKeys))
    .slice(0, limit)
    .map((item, index) => ({
      name: `${index + 1}. ${nameKeys.map((key) => item[key]).find(Boolean) || '未知'}`,
      value: formatter(pickNumber(item, valueKeys))
    }))
}

function formatCost(value = 0) {
  return `$${Number(value || 0).toFixed(2)}`
}

function formatBucketLabel(value, bucket = 'day') {
  if (!value) return '未知'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10)
  if (bucket === 'hour') {
    return date.toLocaleTimeString('zh-CN', {
      timeZone: getDefaultTimezone(),
      hour12: false,
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return date.toLocaleDateString('sv-SE', {
    timeZone: getDefaultTimezone()
  }).slice(5)
}

function formatOverviewBars(items = [], limit = 12) {
  return (items || [])
    .slice(-limit)
    .map((item) => ({
      label: formatBucketLabel(item.ts),
      value: Number(item.tokens || item.activity || 0),
      valueText: formatTokenValue(item.tokens || 0),
      sub: `会话 ${formatNumber(item.sessions || 0)} · 活动 ${formatNumber(item.activity || 0)} · 成本 ${formatCost(item.estimatedCostUsd)}`
    }))
}

function formatActivityBars(items = [], limit = 12) {
  return (items || [])
    .slice(-limit)
    .map((item) => ({
      label: formatBucketLabel(item.ts),
      value: Number(item.activity || 0),
      valueText: formatNumber(item.activity || 0),
      sub: `Token ${formatTokenValue(item.tokens || 0)} · 变更 ${formatNumber(item.linesChanged || 0)} 行`
    }))
}

function formatCostChart(items = [], limit = 24, bucket = 'day') {
  return (items || [])
    .slice(-limit)
    .map((item) => ({
      label: formatBucketLabel(item.ts, bucket),
      value: Number(item.estimatedCostUsd || 0),
      valueText: formatCost(item.estimatedCostUsd),
      sub: `${formatNumber(item.sessions || 0)} 会话 · ${formatNumber(item.activity || 0)} 活动`
    }))
}

function formatTokenChart(items = [], limit = 24, bucket = 'day') {
  return (items || [])
    .slice(-limit)
    .map((item) => ({
      label: formatBucketLabel(item.ts, bucket),
      value: Number(item.inputTokens || 0),
      valueText: formatTokenValue(item.inputTokens || 0),
      sub: `${formatNumber(item.modelCalls || 0)} 调用 · ${formatTokenValue(item.cachedInputTokens || 0)} 缓存`
    }))
}

function formatProjectTable(items = [], limit = 8) {
  return (items || [])
    .slice()
    .sort((a, b) => pickNumber(b, ['totalTokens']) - pickNumber(a, ['totalTokens']))
    .slice(0, limit)
    .map((item, index) => ({
      rank: index + 1,
      name: item.project || item.name || '未知',
      sessions: formatNumber(item.sessions || 0),
      calls: formatNumber(item.modelCalls || 0),
      tokens: formatTokenValue(item.totalTokens || 0),
      duration: formatDurationMs(item.agentDurationMs || 0),
      cost: formatCost(item.estimatedCostUsd)
    }))
}

function formatModelTable(items = [], limit = 8) {
  return (items || [])
    .slice()
    .sort((a, b) => getModelTokenCount(b) - getModelTokenCount(a))
    .slice(0, limit)
    .map((item, index) => ({
      rank: index + 1,
      name: item.pricing?.displayName || item.model || '未知',
      calls: formatNumber(item.modelCalls || 0),
      input: formatTokenValue(item.inputTokens || 0),
      output: formatTokenValue(item.outputTokens || 0),
      reasoning: formatTokenValue(item.reasoningOutputTokens || 0),
      cost: formatCost(item.estimatedCostUsd)
    }))
}

function formatAgentTable(items = [], limit = 8) {
  return (items || [])
    .slice()
    .sort((a, b) => pickNumber(b, ['totalTokens']) - pickNumber(a, ['totalTokens']))
    .slice(0, limit)
    .map((item, index) => ({
      rank: index + 1,
      source: item.source || item.agent || '未知',
      sessions: formatNumber(item.sessions || 0),
      calls: formatNumber(item.modelCalls || 0),
      tokens: formatTokenValue(item.totalTokens || 0),
      duration: formatDurationMs(item.agentDurationMs || 0),
      cost: formatCost(item.estimatedCostUsd)
    }))
}

function formatToolTable(items = [], limit = 8) {
  return (items || [])
    .slice()
    .sort((a, b) => pickNumber(b, ['calls', 'count', 'totalCalls']) - pickNumber(a, ['calls', 'count', 'totalCalls']))
    .slice(0, limit)
    .map((item, index) => ({
      rank: index + 1,
      name: item.tool || item.name || '未知',
      calls: formatNumber(item.calls || item.count || item.totalCalls || 0),
      failures: formatNumber(item.failures || 0),
      duration: formatDurationMs(item.totalDurationMs || 0),
      avg: `${formatNumber(Math.round(Number(item.avgDurationMs || 0)))}ms`
    }))
}

function formatHeatmap(items = []) {
  return (items || []).map((item) => ({
    weekday: Number(item.weekday || 0),
    hour: Number(item.hour || 0),
    value: Number(item.count || 0)
  }))
}

function formatModelRows(items = [], limit = 5) {
  return (items || [])
    .slice()
    .sort((a, b) => getModelTokenCount(b) - getModelTokenCount(a))
    .slice(0, limit)
    .map((item, index) => ({
      name: `${index + 1}. ${item.pricing?.displayName || item.model || '未知'}`,
      value: formatTokenListValue(getModelTokenCount(item))
    }))
}

function formatRangeLine(dataRange = {}, fallbackWindow = {}) {
  const since = dataRange.since || fallbackWindow.since
  const until = dataRange.until || fallbackWindow.until
  const key = dataRange.key || ''
  const parts = []
  if (key) parts.push(key)
  if (since && until) parts.push(`${formatDateOnly(since)} 至 ${formatDateOnly(until)}`)
  if (parts.length === 0) return `范围：${fallbackWindow.startDate} 至 ${fallbackWindow.endDate}`
  return `范围：${parts.join('（')}${since && until ? '）' : ''}`
}

function formatAgentDashboard(scope, account, window, data = {}) {
  const summary = data.summary || {}
  const lines = [
    vibeStatsTitle(scope),
    `账号：${account.username || '未知'}`,
    formatRangeLine(data.range, window),
    `会话：${formatNumber(summary.totalSessions || 0)}`,
    `事件：${formatNumber(summary.totalEvents || 0)}`,
    `项目：${formatNumber(summary.totalProjects || 0)}`,
    `工具调用：${formatNumber(summary.totalToolCalls || 0)}`,
    `命令调用：${formatNumber(summary.totalCommandCalls || 0)}`,
    `Token：${formatTokenValue(summary.totalTokens || 0)}`,
    `输入Token：${formatTokenValue(summary.totalInputTokens || 0)}`,
    `输出Token：${formatTokenValue(summary.totalOutputTokens || 0)}`,
    `推理Token：${formatTokenValue(summary.totalReasoningOutputTokens || 0)}`,
    `${VIBE_LABELS.duration}：${formatDurationMs(summary.totalDurationMs || 0)}`,
    `代码变更：+${formatNumber(summary.totalLinesAdded || 0)} / -${formatNumber(summary.totalLinesRemoved || 0)}`,
    `预估成本：${formatUsd(sumEstimatedCost(data))}`
  ]

  const sources = Array.isArray(data.availableSources) ? data.availableSources.filter(Boolean) : []
  if (sources.length > 0) lines.push(`来源：${sources.join('、')}`)

  lines.push(...formatTopList(VIBE_LABELS.projectTokenTop, data.projectTokens, ['project', 'name']))
  lines.push(...formatModelTop(data.modelCosts))
  lines.push(...formatTopList(VIBE_LABELS.agentTokenTop, data.agentCosts, ['source', 'agent', 'name']))
  lines.push(...formatTopList(TOP_LABELS.tools, data.tools, ['tool', 'name'], ['count', 'calls', 'totalCalls'], formatNumber))

  return lines.join('\n')
}

export class agent extends plugin {
  constructor() {
    super({
      name: 'CodeTime',
      dsc: VIBE_LABELS.statsTitle,
      event: 'message',
      priority: 50,
      rule: [
        { reg: '^#ctai(日|周|月|年)统计$', fnc: 'agentStats' }
      ]
    })
  }

  async agentStats(e) {
    const ctx = await getApiContext(e)
    if (!ctx) return false

    const scope = parseAgentTimeScope(e.msg)
    const window = getCalendarTimeWindow(scope)
    const tz = getDefaultTimezone()

    try {
      let data
      try {
        data = await ctx.api.getAgentDashboard({
          tz,
          since: window.since,
          until: window.until
        })
      } catch (err) {
        if (err.message !== '请升级订阅计划') throw err
        data = await ctx.api.getAgentDashboard({
          tz,
          days: window.days
        })
      }

      const summary = data.summary || {}
      const sources = Array.isArray(data.availableSources) ? data.availableSources.filter(Boolean) : []
      const bucket = data.bucket || 'day'
      const sections = []
      if ((data.overviewBuckets || []).length > 0) sections.push({ title: '费用图', type: 'column-chart', meta: '预估费用', unit: 'usd', items: formatCostChart(data.overviewBuckets, 24, bucket) })
      if ((data.tokenBuckets || []).length > 0) sections.push({ title: 'Token 图', type: 'column-chart', meta: '输入 Token', unit: 'token', items: formatTokenChart(data.tokenBuckets, 24, bucket) })
      if ((data.heatmap || []).length > 0) sections.push({ title: '活跃热力', type: 'heatmap', meta: '星期 · 小时', items: formatHeatmap(data.heatmap) })
      if ((data.projectTokens || []).length > 0) sections.push({
        title: VIBE_LABELS.projectDetail,
        type: 'table',
        columns: [
          { key: 'rank', label: '#', align: 'right', width: '34px' },
          { key: 'name', label: '项目', width: '170px' },
          { key: 'sessions', label: '会话', align: 'right', width: '58px' },
          { key: 'calls', label: '调用', align: 'right', width: '72px' },
          { key: 'tokens', label: 'Token', align: 'right', width: '150px' },
          { key: 'duration', label: '时长', align: 'right', width: '110px' },
          { key: 'cost', label: '成本', align: 'right', width: '76px' }
        ],
        items: formatProjectTable(data.projectTokens)
      })
      if ((data.modelCosts || []).length > 0) sections.push({
        title: VIBE_LABELS.modelDetail,
        type: 'table',
        columns: [
          { key: 'rank', label: '#', align: 'right', width: '34px' },
          { key: 'name', label: '模型', width: '190px' },
          { key: 'calls', label: '调用', align: 'right', width: '66px' },
          { key: 'input', label: '输入', align: 'right', width: '125px' },
          { key: 'output', label: '输出', align: 'right', width: '105px' },
          { key: 'reasoning', label: '推理', align: 'right', width: '92px' },
          { key: 'cost', label: '成本', align: 'right', width: '78px' }
        ],
        items: formatModelTable(data.modelCosts)
      })
      if ((data.agentCosts || []).length > 0) sections.push({
        title: VIBE_LABELS.agentDetail,
        type: 'table',
        columns: [
          { key: 'rank', label: '#', align: 'right', width: '34px' },
          { key: 'source', label: '来源', width: '150px' },
          { key: 'sessions', label: '会话', align: 'right', width: '58px' },
          { key: 'calls', label: '调用', align: 'right', width: '76px' },
          { key: 'tokens', label: 'Token', align: 'right', width: '150px' },
          { key: 'duration', label: '时长', align: 'right', width: '115px' },
          { key: 'cost', label: '成本', align: 'right', width: '80px' }
        ],
        items: formatAgentTable(data.agentCosts)
      })
      if ((data.tools || []).length > 0) sections.push({
        title: VIBE_LABELS.toolDetail,
        type: 'table',
        columns: [
          { key: 'rank', label: '#', align: 'right', width: '34px' },
          { key: 'name', label: '工具', width: '190px' },
          { key: 'calls', label: '调用', align: 'right', width: '86px' },
          { key: 'failures', label: '失败', align: 'right', width: '72px' },
          { key: 'duration', label: '总时长', align: 'right', width: '125px' },
          { key: 'avg', label: '平均', align: 'right', width: '88px' }
        ],
        items: formatToolTable(data.tools)
      })
      if ((data.projectTokens || []).length > 0) sections.push({ title: VIBE_LABELS.projectTokenTop, items: formatTopRows(data.projectTokens, ['project', 'name']) })
      if ((data.modelCosts || []).length > 0) sections.push({ title: VIBE_LABELS.modelTokenTop, items: formatModelRows(data.modelCosts) })
      if ((data.agentCosts || []).length > 0) sections.push({ title: VIBE_LABELS.agentTokenTop, items: formatTopRows(data.agentCosts, ['source', 'agent', 'name']) })

      const view = {
        title: vibeStatsTitle(scope),
        user: await buildHeroUser(ctx.account, formatRangeLine(data.range, window).replace('范围：', '')),
        metrics: [
          { label: '会话', value: formatNumber(summary.totalSessions || 0) },
          { label: '事件', value: formatNumber(summary.totalEvents || 0) },
          { label: '项目', value: formatNumber(summary.totalProjects || 0) },
          { label: '工具调用', value: formatNumber(summary.totalToolCalls || 0) },
          { label: 'Token', value: formatTokenValue(summary.totalTokens || 0) },
          { label: '输入 Token', value: formatTokenValue(summary.totalInputTokens || 0) },
          { label: '输出 Token', value: formatTokenValue(summary.totalOutputTokens || 0) },
          { label: '推理 Token', value: formatTokenValue(summary.totalReasoningOutputTokens || 0) },
          { label: VIBE_LABELS.duration, value: formatDurationMs(summary.totalDurationMs || 0) },
          { label: '代码变更', value: `+${formatNumber(summary.totalLinesAdded || 0)} / -${formatNumber(summary.totalLinesRemoved || 0)}` },
          { label: '预估成本', value: formatUsd(sumEstimatedCost(data)) },
          { label: '命令调用', value: formatNumber(summary.totalCommandCalls || 0) }
        ],
        sections
      }

      try {
        const img = await renderCodeTimeCard('agent', { view, scope })
        if (img) return e.reply(img)
      } catch (err) {
        logger.error(`[CodeTime] AI 统计渲染失败: ${err}`)
      }

      return e.reply(formatAgentDashboard(scope, ctx.account, window, data))
    } catch (err) {
      if (err.message === '请升级订阅计划') return e.reply('请升级订阅计划')
      return replyError(e, err)
    }
  }
}
