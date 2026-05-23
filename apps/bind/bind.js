import plugin from '../../../../lib/plugins/plugin.js'
import {
  bindAccount,
  deleteAccount,
  getAccounts,
  switchAccount
} from '../../model/codetimeApi.js'

export class bind extends plugin {
  constructor() {
    super({
      name: 'CodeTime',
      dsc: 'CodeTime 绑定管理',
      event: 'message',
      priority: 50,
      rule: [
        { reg: '^#ct绑定\\s+([\\s\\S]+)$', fnc: 'bind' },
        { reg: '^#ct(绑定|账号)列表$', fnc: 'accountList' },
        { reg: '^#ct切换(绑定|账号)\\s*(\\d+)$', fnc: 'switchBind' },
        { reg: '^#ct删除(绑定|账号)\\s*(\\d+)$', fnc: 'deleteBind' }
      ]
    })
  }

  async bind(e) {
    const cookie = this.getMsg(e).replace(/^#ct绑定\s+/i, '').trim()
    if (!cookie) return e.reply('请发送：#ct绑定 [cookie]', true)

    try {
      const account = await bindAccount(e.user_id, cookie)
      return e.reply(`绑定成功\n昵称：${account.username || '未知'}\nID：${account.id}`, true)
    } catch (err) {
      logger.error(`[CodeTime] 绑定失败: ${err}`)
      return e.reply(`绑定失败：${err.message}`, true)
    }
  }

  async accountList(e) {
    const accounts = await getAccounts(e.user_id)
    if (accounts.length === 0) return e.reply('暂无绑定账号，请发送 #ct绑定 [cookie]', true)

    const lines = ['CodeTime 绑定列表']
    accounts.forEach((account, index) => {
      lines.push(`${account.isPrimary ? '>' : ' '} ${index + 1}. ${account.username || '未知'} (${account.id})`)
    })
    lines.push('使用 #ct切换绑定 [序号] 切换当前账号')
    return e.reply(lines.join('\n'), true)
  }

  async switchBind(e) {
    const index = this.getLastNumber(e)
    const account = await switchAccount(e.user_id, index)
    if (!account) return e.reply('切换失败：序号不存在', true)

    return e.reply(`切换成功\n昵称：${account.username || '未知'}\nID：${account.id}`, true)
  }

  async deleteBind(e) {
    const index = this.getLastNumber(e)
    const account = await deleteAccount(e.user_id, index)
    if (!account) return e.reply('删除失败：序号不存在', true)

    return e.reply(`删除成功\n昵称：${account.username || '未知'}\nID：${account.id}`, true)
  }

  getMsg(e) {
    return String(e.msg || e.raw_message || '').trim()
  }

  getLastNumber(e) {
    return Number(this.getMsg(e).match(/(\d+)\s*$/)?.[1] || 0)
  }
}
