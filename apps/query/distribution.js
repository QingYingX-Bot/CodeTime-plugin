import plugin from '../../../../lib/plugins/plugin.js'
import {
  getApiContext,
  getTimeRange,
  parseTimeScope,
  replyError
} from '../../model/codetimeUtils.js'
import { formatDateTime, formatNumber } from '../../model/codetimeApi.js'

export class distribution extends plugin {
  constructor() {
    super({
      name: 'CodeTime',
      dsc: 'CodeTime 时间分布',
      event: 'message',
      priority: 50,
      rule: [
        { reg: '^#ct(编程)?(日|周|月|年)时间分布$', fnc: 'distribution' }
      ]
    })
  }

  async distribution(e) {
    const ctx = await getApiContext(e)
    if (!ctx) return false

    try {
      const scope = parseTimeScope(e.msg)
      const range = getTimeRange(scope)
      const data = await ctx.api.getTimeDistribution({
        tz: ctx.tz,
        startTime: range.startTime,
        endTime: range.endTime
      })
      const list = data?.data || []
      if (list.length === 0) return e.reply('暂无时间分布记录', true)

      const hourMap = new Map()
      for (const item of list) {
        const hour = Number(item.hour || 0)
        hourMap.set(hour, (hourMap.get(hour) || 0) + Number(item.count || 0))
      }

      const lines = [
        `CodeTime ${scope}时间分布`,
        `日期：${formatDateTime(range.startTime).slice(0, 10)}`,
        `活跃点：${list.length}`,
        `总次数：${formatNumber(list.reduce((sum, item) => sum + Number(item.count || 0), 0))}`
      ]

      Array.from(hourMap.entries())
        .sort((a, b) => a[0] - b[0])
        .forEach(([hour, count]) => {
          lines.push(`${String(hour).padStart(2, '0')}点：${count}次`)
        })

      return e.reply(lines.join('\n'), true)
    } catch (err) {
      return replyError(e, err)
    }
  }
}
