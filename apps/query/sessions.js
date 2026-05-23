import plugin from '../../../../lib/plugins/plugin.js'
import common from '../../../../lib/common/common.js'
import {
  formatNumber,
  formatDateTime,
  getDefaultTimezone
} from '../../model/codetimeApi.js'
import {
  getApiContext,
  getLastNumber,
  replyError
} from '../../model/codetimeUtils.js'

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

function getModelTokenCount(session = {}) {
  const direct = Number(session.totalTokens)
  if (!Number.isNaN(direct) && direct > 0) return direct

  return [session.inputTokens, session.outputTokens].reduce((sum, value) => sum + Number(value || 0), 0)
}

function formatDateOnly(value) {
  if (!value) return '未知'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10)
  return date.toLocaleString('zh-CN', {
    timeZone: getDefaultTimezone(),
    hour12: false
  })
}

function formatSessionNode(session, index) {
  return [
    `#${index + 1} ${session.project || '未知项目'} / ${session.source || session.agent || '未知来源'}`,
    `开始：${formatDateOnly(session.startedAt)}`,
    `结束：${formatDateOnly(session.lastEventAt)}`,
    `事件：${formatNumber(session.eventCount || 0)} 轮次：${formatNumber(session.turnCount || 0)} 工具：${formatNumber(session.toolCallCount || 0)}`,
    `Token：${formatTokenValue(getModelTokenCount(session))} 输入：${formatTokenValue(session.inputTokens || 0)} 输出：${formatTokenValue(session.outputTokens || 0)}`,
    `时长：${formatDurationMs(session.durationMs || 0)}`,
    `代码：+${formatNumber(session.linesAdded || 0)} / -${formatNumber(session.linesRemoved || 0)}`,
    `会话ID：${session.sessionId || '未知'}`
  ].join('\n')
}

export class sessions extends plugin {
  constructor() {
    super({
      name: 'CodeTime',
      dsc: 'CodeTime AI 记录',
      event: 'message',
      priority: 50,
      rule: [
        { reg: '^#ctai记录(?:\\s*(\\d+))?$', fnc: 'agentSessions' }
      ]
    })
  }

  async agentSessions(e) {
    const ctx = await getApiContext(e)
    if (!ctx) return false

    const limit = Math.max(1, getLastNumber(e, 10))

    try {
      const data = await ctx.api.getAgentSessions({ limit })
      const sessions = Array.isArray(data?.sessions) ? data.sessions : []
      if (sessions.length === 0) return e.reply('暂无 AI 记录')

      const messages = sessions.slice(0, limit).map((session, index) => formatSessionNode(session, index))

      if (messages.length === 1) {
        return e.reply(messages[0])
      }

      return e.reply(await common.makeForwardMsg(e, messages, 'CodeTime AI 记录'))
    } catch (err) {
      return replyError(e, err)
    }
  }
}
