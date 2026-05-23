# CodeTime Bot 命令

所有命令使用 `#ct` 前缀。需要用户先通过 `#ct绑定 [cookie]` 绑定 CodeTime 登录态。

## 资料

`#ct(我的)?资料` -> `/v3/users/self`

查询当前绑定账号资料。

```json
{
  "id": 35521,
  "email": "qingying.xjc@gmail.com",
  "username": "QingYingX",
  "avatar": "https://lh3.googleusercontent.com/a/ACg8ocK29jw7K3AmSlwaZkawgIm054we4jRKY_jKIYUW8e3y2mCaXoY=s96-c",
  "plan": "free",
  "timezone": null,
  "createdAt": "2024-12-29T15:38:55.291Z",
  "updatedAt": "2026-05-21T12:23:55.191Z"
}
```

## 最近日志

`#ct(近期|最近)?日志 <个数>` -> `/v3/users/self/latest-logs`

- 默认个数为 `5`
- 请求参数：`limit`

```json
[
  {
    "eventTime": 1779493874310,
    "language": "javascript",
    "project": "Yunzai [SSH: homes]",
    "relativeFile": "plugins/CodeTime-plugin/model/codetimeApi.js",
    "editor": "Visual Studio Code",
    "platform": "Linux 6.8",
    "absoluteFile": "/qy/Yunzai/plugins/CodeTime-plugin/model/codetimeApi.js",
    "gitOrigin": "git@github.com:QingYingX-Bot/Yunzai-QY.git",
    "gitBranch": "QY"
  }
]
```

## 今日总览

`#ct今日` -> 聚合今日数据

聚合以下接口的今日范围数据：

- `/v3/users/self/stats_time`
- `/v3/users/self/stats?by=language`
- `/v3/users/self/stats?by=workspace`
- `/v3/users/self/time-distribution`
- `/v3/agent/dashboard`

请求参数只带：

- `tz`
- `start_time`
- `end_time`
- `by`，仅 `stats` 接口携带
- `since` / `until`，仅 `agent/dashboard` 接口携带

## 帮助

`#ct帮助`

查看当前插件命令列表。

## AI 统计

`#ctai(日|周|月|年)统计` -> `/v3/agent/dashboard`

默认携带 `tz=Asia/Shanghai`。

优先请求参数：

- `tz`
- `since`
- `until`

范围规则：

- `日`：当天 00:00 到当天 23:59:59.999
- `周`：本周一 00:00 到今天 23:59:59.999
- `月`：本月 1 日 00:00 到今天 23:59:59.999
- `年`：今年 1 月 1 日 00:00 到今天 23:59:59.999

如果免费计划触发：

```json
{
  "status_code": 403,
  "detail": "Free plan can only fetch logs for 90 days"
}
```

则改用 `days` 重试。`days` 按当前范围天数计算，包含当天。

## AI 记录

`#ctai记录 <数量>` -> `/v3/agent/sessions`

- `limit` 默认值为 `10`

```json
{
  "sessions": [
    {
      "sessionId": "019e520c-3190-7782-9a56-813d766ac6f7",
      "project": "Yunzai",
      "source": "codex",
      "startedAt": "2026-05-22T23:36:36.524Z",
      "lastEventAt": "2026-05-23T03:14:12.055Z",
      "eventCount": 1260,
      "turnCount": 22,
      "toolCallCount": 313,
      "inputTokens": 16566096,
      "outputTokens": 160858,
      "totalTokens": 16742884,
      "linesAdded": 491,
      "linesRemoved": 206,
      "durationMs": 13055531
    }
  ],
  "nextCursor": "..."
}
```

## 编程时间

`#ct时间` -> `/v3/users/self/stats_time`

`#ct(日|周|月|年)时间` -> `/v3/users/self/stats_time`

默认携带 `tz=Asia/Shanghai`。

范围规则：

- `日`：今日 00:00 到当前时间
- `周`：本周一 00:00 到当前时间
- `月`：本月 1 日 00:00 到当前时间
- `年`：今年 1 月 1 日 00:00 到当前时间

优先请求参数：

- `tz`
- `start_time`
- `end_time`

如果免费计划触发：

```json
{
  "status_code": 403,
  "detail": "Free plan can only fetch logs for 90 days"
}
```

则改用 `limit` 重试。`stats_time` 的 `limit` 按范围天数计算，包含当天。

```json
{
  "data": [
    {
      "duration": 41,
      "time": "2026-05-23"
    }
  ]
}
```

展示格式：

```text
2026-05-23
  41分钟
```

## 编程详情

`#ct详情 <语言|项目>` -> `/v3/users/self/stats`

`#ct(日|周|月|年)详情 <语言|项目>` -> `/v3/users/self/stats`

默认携带 `tz=Asia/Shanghai`。

字段映射：

- `语言` -> `by=language`
- `项目` -> `by=workspace`

如果命令中没有写 `语言` 或 `项目`，默认两个都查询，并使用合并转发消息发送。

范围规则同“编程时间”。

优先请求参数：

- `by`
- `tz`
- `start_time`
- `end_time`

如果免费计划触发 90 天限制，则改用 `limit` 重试。`stats` 的 `limit` 按范围天数减 1 计算，但最小为 `1`。例如 `#ct日详情` 会 fallback 到 `limit=1`，然后只展示当天 `time` 的记录。

语言示例：

```json
{
  "data": [
    {
      "duration": 40,
      "time": "2026-05-23",
      "by": "markdown"
    },
    {
      "duration": 6,
      "time": "2026-05-23",
      "by": "javascript"
    }
  ]
}
```

项目示例：

```json
{
  "data": [
    {
      "duration": 36,
      "time": "2026-05-23",
      "by": "codetime-api [SSH: homes]"
    },
    {
      "duration": 13,
      "time": "2026-05-23",
      "by": "Yunzai [SSH: homes]"
    }
  ]
}
```

## 统计

`#ct(编程)?统计 <语言|项目|平台>` -> `/v3/users/self/top`

字段映射：

- `语言` -> `field=language`
- `项目` -> `field=workspace`
- `平台` -> `field=platform`

如果命令中没有写字段，默认三个都查询，并使用合并转发消息发送。

请求参数只带：

- `field`

```json
[
  {
    "field": "markdown",
    "minutes": 7108
  },
  {
    "field": "javascript",
    "minutes": 5144
  }
]
```

## 排行榜

`#ct排行` -> `/v3/public/leaderboard?days=1`

`#ct排行榜` -> `/v3/public/leaderboard?days=1`

`#ct排行日榜` -> `/v3/public/leaderboard?days=1`

`#ct排行周榜` -> `/v3/public/leaderboard?days=<当周到今天的天数>`

`#ct排行月榜` -> `/v3/public/leaderboard?days=<当月到今天的天数>`

`#ct排行年榜` -> `/v3/public/leaderboard?days=<当年到今天的天数>`

## 时间分布

`#ct时间分布` -> `/v3/users/self/time-distribution`

`#ct(日|周|月|年)时间分布` -> `/v3/users/self/time-distribution`

默认携带 `tz=Asia/Shanghai`。

范围规则同“编程时间”。

请求参数只带：

- `tz`
- `start_time`
- `end_time`

```json
{
  "data": [
    {
      "hour": 0,
      "minute": 0,
      "count": 1
    },
    {
      "hour": 0,
      "minute": 2,
      "count": 1
    }
  ]
}
```
