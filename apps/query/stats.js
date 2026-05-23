import common from '../../../../lib/common/common.js'
import plugin from '../../../../lib/plugins/plugin.js'
import {
  formatTopItems,
  getApiContext,
  getFieldLabel,
  parseField,
  parseFieldLabel
} from '../../model/codetimeUtils.js'

export class stats extends plugin {
  constructor() {
    super({
      name: 'CodeTime',
      dsc: 'CodeTime 统计',
      event: 'message',
      priority: 50,
      rule: [
        { reg: '^#ct(编程)?统计\\s*(语言|项目|平台)?$', fnc: 'stats' }
      ]
    })
  }

  async stats(e) {
    const ctx = await getApiContext(e)
    if (!ctx) return false

    const field = parseField(e.msg)
    const targets = field ? [field] : ['language', 'workspace', 'platform']

    try {
      const results = await Promise.all(targets.map((target) => ctx.api.getTop({ field: target })))

      if (!field) {
        const nodes = results.map((items, index) => [
          `CodeTime ${getFieldLabel(targets[index])}统计`,
          formatTopItems(items || [])
        ].join('\n'))
        return e.reply(await common.makeForwardMsg(e, nodes, 'CodeTime 统计'))
      }

      const items = results[0] || []
      if (items.length === 0) return e.reply(`暂无${parseFieldLabel(e.msg) || '统计'}数据`)
      return e.reply([
        `CodeTime ${parseFieldLabel(e.msg) || '统计'}`,
        formatTopItems(items)
      ].join('\n'))
    } catch (err) {
      logger.error(`[CodeTime] 请求失败: ${err}`)
      return e.reply(`请求失败：${err.message}`)
    }
  }
}
