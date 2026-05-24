# CodeTime-plugin

`CodeTime-plugin` 是适用于 Yunzai-Bot 的 CodeTime 查询插件，支持账号绑定、编程时间统计、多维统计、公开排行榜、时间分布、最近日志以及 AI Agent 使用统计。

插件命令统一使用 `#ct` / `#ctai` 前缀，使用查询功能前需要先绑定 CodeTime token。

## 安装插件

在 Yunzai-Bot 根目录下执行：

```bash
git clone https://github.com/QingYingX-Bot/CodeTime-plugin.git ./plugins/CodeTime-plugin/
```

安装完成后重启 Yunzai-Bot，或按当前环境的插件重载方式重新载入。

## 使用说明

### 账号绑定

- `#ct绑定 <token>`：绑定 CodeTime 账号
- `#ct绑定列表`：查看绑定列表
- `#ct账号列表`：查看绑定列表
- `#ct切换绑定 <序号>`：切换当前使用的绑定账号
- `#ct切换账号 <序号>`：切换当前使用的绑定账号
- `#ct删除绑定 <序号>`：删除指定绑定账号
- `#ct删除账号 <序号>`：删除指定绑定账号

### CodeTime 查询

- `#ct帮助`：查看帮助
- `#ct今日`：查看今日编程与 AI 概览
- `#ct(我的)?资料`：查看当前绑定账号资料
- `#ct(近期|最近)?日志 <个数>`：查看最近编码日志，默认 `5` 条
- `#ct排行 / #ct排行榜 / #ct排行(日|周|月|年)榜`：查看公开排行榜，默认日榜；已绑定账号时会标记本人，未进入前 20 时显示我的排名
- `#ct时间 / #ct(编程)?(日|周|月|年)时间`：查看指定周期编程时长，默认当天
- `#ct详情 <语言|项目> / #ct(编程)?(日|周|月|年)详情 <语言|项目>`：查看指定周期语言或项目详情，默认当天
- `#ct时间分布 / #ct(编程)?(日|周|月|年)时间分布`：查看指定周期时间分布，默认当天
- `#ct(编程)?统计 <语言|项目|平台>`：查看语言、项目或平台统计

### AI Agent 查询

- `#ctai(日|周|月|年)统计`：查看指定周期 AI Agent 统计，包含费用、Token、热力图、项目、模型、Agent 与工具明细
- `#ctai记录 <数量>`：查看 AI Agent 会话记录，默认 `10` 条

## 项目结构

```text
CodeTime-plugin/
├── apps/
│   ├── bind/       # 账号绑定管理命令
│   └── query/      # 查询类命令
├── model/          # API、账号存储、时间范围、格式化与卡片渲染
├── resources/
│   ├── common/     # 通用卡片样式
│   └── template/   # 通用渲染模板
├── API.md          # CodeTime API 记录
├── bot.md          # Bot 命令与接口对应关系
├── index.js        # 插件入口
└── README.md
```

`apps/query` 中主要命令文件：

- `today.js`：`#ct今日`
- `rank.js`：公开排行榜
- `time.js`：编程时长
- `detail.js`：语言 / 项目详情
- `distribution.js`：时间分布图
- `stats.js`：语言 / 项目 / 平台统计
- `agent.js`：AI Agent 统计
- `sessions.js`：AI Agent 会话记录

## 注意事项

- 绑定信息存储在 Redis：`CODETIME:USER:{QQ}`，其中鉴权字段为 `token`。
- CodeTime 免费计划查询超过可用范围时，插件会按接口规则回退到 `limit` 或 `days` 查询。
- 图片卡片统一使用 `resources/template/card.html` 和 `resources/common/codetime.css` 渲染。
- 更详细的命令参数和接口对应关系见 [bot.md](./bot.md)。
