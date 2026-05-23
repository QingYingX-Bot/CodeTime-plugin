import plugin from '../../../../lib/plugins/plugin.js'
import {
  formatNumber,
  getDefaultTimezone
} from '../../model/codetimeApi.js'
import {
  getApiContext,
  getCalendarTimeWindow,
  parseAgentTimeScope,
  replyError
} from '../../model/codetimeUtils.js'

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

  const lines = ['模型Token Top']
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
    `CodeTime AI ${scope}统计`,
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
    `持续时间：${formatDurationMs(summary.totalDurationMs || 0)}`,
    `代码变更：+${formatNumber(summary.totalLinesAdded || 0)} / -${formatNumber(summary.totalLinesRemoved || 0)}`,
    `预估成本：${formatUsd(sumEstimatedCost(data))}`
  ]

  const sources = Array.isArray(data.availableSources) ? data.availableSources.filter(Boolean) : []
  if (sources.length > 0) lines.push(`来源：${sources.join('、')}`)

  lines.push(...formatTopList('项目Token Top', data.projectTokens, ['project', 'name']))
  lines.push(...formatModelTop(data.modelCosts))
  lines.push(...formatTopList('Agent Token Top', data.agentCosts, ['source', 'agent', 'name']))
  lines.push(...formatTopList('工具调用 Top', data.tools, ['tool', 'name'], ['count', 'calls', 'totalCalls'], formatNumber))

  return lines.join('\n')
}

export class agent extends plugin {
  constructor() {
    super({
      name: 'CodeTime',
      dsc: 'CodeTime AI 统计',
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

      return e.reply(formatAgentDashboard(scope, ctx.account, window, data))
    } catch (err) {
      if (err.message === '请升级订阅计划') return e.reply('请升级订阅计划')
      return replyError(e, err)
    }
  }
}
