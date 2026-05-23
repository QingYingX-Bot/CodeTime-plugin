import plugin from '../../../../lib/plugins/plugin.js'
import {
  getApiContext,
  getLastNumber,
  replyError
} from '../../model/codetimeUtils.js'
import { formatDateTime } from '../../model/codetimeApi.js'

export class logs extends plugin {
  constructor() {
    super({
      name: 'CodeTime',
      dsc: 'CodeTime 最近日志',
      event: 'message',
      priority: 50,
      rule: [
        { reg: '^#ct(近期|最近)?日志\\s*(\\d+)?$', fnc: 'logs' }
      ]
    })
  }

  async logs(e) {
    const ctx = await getApiContext(e)
    if (!ctx) return false

    const limit = Math.max(1, getLastNumber(e, 5))

    try {
      const list = await ctx.api.getLatestLogs(limit)
      if (!Array.isArray(list) || list.length === 0) return e.reply('暂无最近日志', true)

      const lines = ['CodeTime 最近日志']
      list.forEach((log, index) => {
        lines.push(`${index + 1}. ${log.project || '未知项目'} / ${log.language || '未知语言'}`)
        lines.push(`   ${log.relativeFile || log.absoluteFile || '未知文件'}`)
        lines.push(`   ${formatDateTime(log.eventTime)}`)
      })
      return e.reply(lines.join('\n'), true)
    } catch (err) {
      return replyError(e, err)
    }
  }
}
