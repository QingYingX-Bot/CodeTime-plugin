import plugin from '../../../../lib/plugins/plugin.js'

const HELP_TEXT = [
  'CodeTime 帮助',
  '账号绑定',
  '#ct绑定 <cookie>',
  '#ct绑定列表 / #ct账号列表',
  '#ct切换绑定 <序号> / #ct切换账号 <序号>',
  '#ct删除绑定 <序号> / #ct删除账号 <序号>',
  '',
  'CodeTime 查询',
  '#ct帮助',
  '#ct今日',
  '#ct资料 / #ct我的资料',
  '#ct日志 <个数>',
  '#ct(日|周|月|年)时间',
  '#ct(日|周|月|年)详情 <语言|项目>',
  '#ct(日|周|月|年)时间分布',
  '#ct排行 <语言|项目|平台>',
  '',
  'AI Agent 查询',
  '#ctai(日|周|月|年)统计',
  '#ctai记录 <数量>'
].join('\n')

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
    return e.reply(HELP_TEXT)
  }
}
