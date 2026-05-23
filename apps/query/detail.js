import common from '../../../../lib/common/common.js'
import plugin from '../../../../lib/plugins/plugin.js'
import {
  formatStatsLines,
  getApiContext,
  getFieldLabel,
  getMsg,
  getTimeWindow,
  parseField,
  parseTimeScope,
  parseFieldLabel
} from '../../model/codetimeUtils.js'

export class detail extends plugin {
  constructor() {
    super({
      name: 'CodeTime',
      dsc: 'CodeTime 编程详情',
      event: 'message',
      priority: 50,
      rule: [
        { reg: '^#ct(编程)?(日|周|月|年)详情\\s*(语言|项目)?$', fnc: 'detail' }
      ]
    })
  }

  async detail(e) {
    const ctx = await getApiContext(e)
    if (!ctx) return false

    const message = getMsg(e)
    const scope = parseTimeScope(message)
    const window = getTimeWindow(scope)
    const field = parseField(message)
    const targets = field ? [field] : ['language', 'workspace']

    try {
      const results = await Promise.all(targets.map((by) => this.getStatsWithFallback(ctx, by, window)))

      if (!field) {
        const nodes = results.map((data, index) => formatStatsLines(`CodeTime ${scope}${getFieldLabel(targets[index])}详情`, filterRowsInWindow(data?.data || [], window)))
        return e.reply(await common.makeForwardMsg(e, nodes))
      }

      const data = filterRowsInWindow(results[0]?.data || [], window)
      if (data.length === 0) return e.reply(`暂无${parseFieldLabel(message) || '详情'}记录`)
      return e.reply([
        `CodeTime ${scope}${parseFieldLabel(message) || '详情'}`,
        formatStatsLines('按日期明细', data)
      ].join('\n'))
    } catch (err) {
      if (err.message === '请升级订阅计划') return e.reply('请升级订阅计划', true)
      logger.error(`[CodeTime] 请求失败: ${err}`)
      return e.reply(`请求失败：${err.message}`, true)
    }
  }

  async getStatsWithFallback(ctx, by, window) {
    try {
      return await ctx.api.getStats({
        by,
        tz: ctx.tz,
        startTime: window.startTime,
        endTime: window.endTime
      })
    } catch (err) {
      if (err.message !== '请升级订阅计划') throw err
      return ctx.api.getStats({
        by,
        tz: ctx.tz,
        limit: getStatsFallbackLimit(window)
      })
    }
  }
}

function getStatsFallbackLimit(window) {
  return Math.max(1, window.days - 1)
}

function filterRowsInWindow(items = [], window) {
  return (items || []).filter((item) => {
    const date = String(item.time || '').slice(0, 10)
    return date >= window.startDate && date <= window.endDate
  })
}
