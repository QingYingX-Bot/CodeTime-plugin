import plugin from '../../../../lib/plugins/plugin.js'
import common from '../../../../lib/common/common.js'
import {
  formatNumber,
  formatTokenValue,
  getDefaultTimezone
} from '../../model/codetimeApi.js'
import {
  buildHeroUser,
  getApiContext,
  getLastNumber,
  replyError
} from '../../model/codetimeUtils.js'
import { VIBE_LABELS } from '../../model/codetimeLabels.js'
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

function formatSessionView(session, index) {
  return {
    index: index + 1,
    project: session.project || '未知项目',
    source: session.source || session.agent || '未知来源',
    startedAt: formatDateOnly(session.startedAt),
    lastEventAt: formatDateOnly(session.lastEventAt),
    sessionId: session.sessionId || '未知',
    duration: formatDurationMs(session.durationMs || 0),
    turns: formatNumber(session.turnCount || 0),
    tools: formatNumber(session.toolCallCount || 0),
    inputTokens: formatTokenValue(session.inputTokens || 0),
    outputTokens: formatTokenValue(session.outputTokens || 0),
    totalTokens: formatTokenValue(getModelTokenCount(session)),
    linesAdded: formatNumber(session.linesAdded || 0),
    linesRemoved: formatNumber(session.linesRemoved || 0)
  }
}

export class sessions extends plugin {
  constructor() {
    super({
      name: 'CodeTime',
      dsc: VIBE_LABELS.recordsTitle,
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
      if (sessions.length === 0) return e.reply(VIBE_LABELS.noRecords)

      const messages = sessions.slice(0, limit).map((session, index) => formatSessionNode(session, index))
      const view = {
        title: VIBE_LABELS.recordsTitle,
        user: await buildHeroUser(ctx.account, `最近 ${messages.length} 条会话`),
        sessions: sessions.slice(0, limit).map((session, index) => formatSessionView(session, index))
      }

      try {
        const img = await renderCodeTimeCard('sessions', {
          view,
          saveSuffix: `${limit}-${new Date().toISOString().slice(0, 10)}`
        })
        if (img) return e.reply(img)
      } catch (err) {
        logger.error(`[CodeTime] AI 记录渲染失败: ${err}`)
      }

      if (messages.length === 1) {
        return e.reply(messages[0])
      }

      return e.reply(await common.makeForwardMsg(e, messages, VIBE_LABELS.recordsTitle))
    } catch (err) {
      return replyError(e, err)
    }
  }
}
