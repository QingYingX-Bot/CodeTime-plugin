import plugin from '../../../../lib/plugins/plugin.js'
import { renderCodeTimeCard } from '../../model/codetimeRender.js'

export class help extends plugin {
  constructor() {
    super({
      name: 'CodeTime',
      dsc: 'CodeTime 帮助',
      event: 'message',
      priority: 50,
      rule: [
        { reg: '^#ct帮助$', fnc: 'help' }
      ]
    })
  }

  async help(e) {
    const view = {
      badges: ['#ct', '#ctai', '绑定后使用'],
      groups: [
        {
          title: '账号绑定',
          items: [
            { name: '#ct绑定 <token>' },
            { name: '#ct绑定列表 / #ct账号列表' },
            { name: '#ct切换绑定 <序号> / #ct切换账号 <序号>' },
            { name: '#ct删除绑定 <序号> / #ct删除账号 <序号>' }
          ]
        },
        {
          title: 'CodeTime 查询',
          items: [
            { name: '#ct帮助' },
            { name: '#ct今日' },
            { name: '#ct(我的)?资料' },
            { name: '#ct(近期|最近)?日志 <个数>' },
            { name: '#ct排行 / #ct排行榜 / #ct排行(日|周|月|年)榜' },
            { name: '#ct时间 / #ct(日|周|月|年)时间' },
            { name: '#ct详情 <语言|项目> / #ct(日|周|月|年)详情 <语言|项目>' },
            { name: '#ct时间分布 / #ct(日|周|月|年)时间分布' },
            { name: '#ct(编程)?统计 <语言|项目|平台>' }
          ]
        },
        {
          title: 'AI Agent 查询',
          items: [
            { name: '#ctai(日|周|月|年)统计' },
            { name: '#ctai记录 <数量>' }
          ]
        }
      ]
    }

    try {
      const img = await renderCodeTimeCard('help', {
        view: {
          badges: view.badges,
          sections: view.groups.map((group) => ({
            title: group.title,
            items: group.items.map((item) => ({
              command: item.name,
              desc: item.sub || '可直接发送该命令使用'
            }))
          }))
        }
      })
      if (img) return e.reply(img)
    } catch (err) {
      logger.error(`[CodeTime] 帮助渲染失败: ${err}`)
    }

    return e.reply(view.groups.map((group) => `${group.title}\n${group.items.map((item) => item.name).join('\n')}`).join('\n\n'))
  }
}
