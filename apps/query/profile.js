import plugin from '../../../../lib/plugins/plugin.js'
import {
  formatProfileLines,
  getApiContext,
  replyError
} from '../../model/codetimeUtils.js'

export class profile extends plugin {
  constructor() {
    super({
      name: 'CodeTime',
      dsc: 'CodeTime 资料查询',
      event: 'message',
      priority: 50,
      rule: [
        { reg: '^#ct(我的)?资料$', fnc: 'profile' }
      ]
    })
  }

  async profile(e) {
    const ctx = await getApiContext(e)
    if (!ctx) return false

    try {
      const user = await ctx.api.getSelf()
      return e.reply(formatProfileLines(user), true)
    } catch (err) {
      return replyError(e, err)
    }
  }
}
