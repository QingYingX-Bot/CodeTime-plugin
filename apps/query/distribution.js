import plugin from '../../../../lib/plugins/plugin.js'
import { renderCodeTimeCard } from '../../model/codetimeRender.js'
import {
  getApiContext,
  getTimeRange,
  parseTimeScope,
  replyError
} from '../../model/codetimeUtils.js'
import { formatDateTime, getDefaultTimezone } from '../../model/codetimeApi.js'

export class distribution extends plugin {
  constructor() {
    super({
      name: 'CodeTime',
      dsc: 'CodeTime 时间分布',
      event: 'message',
      priority: 50,
      rule: [
        { reg: '^#ct(编程)?(日|周|月|年)?时间分布$', fnc: 'distribution' }
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

      const lines = [
        `CodeTime ${scope}时间分布`,
        `日期：${formatDateTime(range.startTime).slice(0, 10)}`
      ]

      const view = {
        title: `CodeTime ${scope}时间分布`,
        subtitle: `日期：${formatDateTime(range.startTime).slice(0, 10)}`,
        badges: [ctx.tz || getDefaultTimezone()],
        sections: [
          {
            title: '编程时间分布',
            type: 'time-distribution',
            points: list
          }
        ]
      }

      try {
        const img = await renderCodeTimeCard('distribution', { view })
        if (img) return e.reply(img)
      } catch (err) {
        logger.error(`[CodeTime] 时间分布渲染失败: ${err}`)
      }

      return e.reply(lines.join('\n'), true)
    } catch (err) {
      return replyError(e, err)
    }
  }
}
