import plugin from '../../../../lib/plugins/plugin.js'
import {
  formatStatsLines,
  getApiContext,
  getTimeWindow,
  parseTimeScope,
  sumMinutes
} from '../../model/codetimeUtils.js'
import { formatMinutes } from '../../model/codetimeApi.js'

export class stats extends plugin {
  constructor() {
    super({
      name: 'CodeTime',
      dsc: 'CodeTime 编程时间',
      event: 'message',
      priority: 50,
      rule: [
        { reg: '^#ct(编程)?(日|周|月|年)时间$', fnc: 'programmingTime' }
      ]
    })
  }

  async programmingTime(e) {
    const ctx = await getApiContext(e)
    if (!ctx) return false

    const scope = parseTimeScope(e.msg)
    const window = getTimeWindow(scope)

    try {
      let data
      try {
        data = await ctx.api.getStatsTime({
          tz: ctx.tz,
          startTime: window.startTime,
          endTime: window.endTime
        })
      } catch (err) {
        if (err.message !== '请升级订阅计划') throw err
        data = await ctx.api.getStatsTime({
          tz: ctx.tz,
          limit: window.days
        })
      }

      const list = data?.data || []
      if (list.length === 0) return e.reply('暂无编程时间记录', true)

      return e.reply([
        `CodeTime ${scope}时间`,
        `账号：${ctx.account.username || '未知'}`,
        `总时长：${formatMinutes(sumMinutes(list))}`,
        formatStatsLines('按日期明细', list)
      ].join('\n'), true)
    } catch (err) {
      if (err.message === '请升级订阅计划') return e.reply('请升级订阅计划', true)
      return e.reply(`请求失败：${err.message}`, true)
    }
  }
}
