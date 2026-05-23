import plugin from '../../../../lib/plugins/plugin.js'
import {
  formatDateTime,
  formatMinutes
} from '../../model/codetimeApi.js'
import {
  formatTopItems,
  getApiContext,
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
      const [timeStats, languageStats, workspaceStats, distributionStats] = await Promise.all([
        ctx.api.getStatsTime({ tz: ctx.tz, startTime: range.startTime, endTime: range.endTime }),
        ctx.api.getStats({ by: 'language', tz: ctx.tz, startTime: range.startTime, endTime: range.endTime }),
        ctx.api.getStats({ by: 'workspace', tz: ctx.tz, startTime: range.startTime, endTime: range.endTime }),
        ctx.api.getTimeDistribution({ tz: ctx.tz, startTime: range.startTime, endTime: range.endTime })
      ])

      const timeList = timeStats?.data || []
      const languageList = languageStats?.data || []
      const workspaceList = workspaceStats?.data || []
      const distributionList = distributionStats?.data || []

      if (
        timeList.length === 0 &&
        languageList.length === 0 &&
        workspaceList.length === 0 &&
        distributionList.length === 0
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

      return e.reply(lines.join('\n'))
    } catch (err) {
      return replyError(e, err)
    }
  }
}
