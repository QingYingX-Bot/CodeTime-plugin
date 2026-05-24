# CodeTime API 文档

本文档仅基于当前 `API.md` 已记录的信息整理，覆盖范围包括：概览、Agent、排行榜、年报。接口示例中的用户、时间、统计值均来自已有记录，仅用于说明响应结构。

## 1. 通用说明

### 1.1 基础信息

| 项目 | 说明 |
| --- | --- |
| Base URL | `https://codetime.dev` |
| API 前缀 | `/v3` |
| 响应格式 | JSON |
| 时间格式 | ISO 8601 UTC 字符串，例如 `2026-05-21T01:46:07.195Z` |
| 日期格式 | `YYYY-MM-DD`，例如 `2026-05-21` |
| 时区格式 | IANA 时区名，例如 `Asia/Shanghai` |
| 时长单位 | `duration`、`minutes`、`totalMinutes` 均为分钟 |

### 1.2 鉴权说明

当前用户数据接口使用 Bearer token 鉴权：

```http
Authorization: Bearer <token>
```

以下接口属于当前用户数据接口，调用时需要携带该请求头：

- `/v3/users/self/*`
- `/v3/agent/*`
- `/v3/machines`

公开接口通常位于 `/v3/public/*` 或使用公开用户 ID 查询，例如 `/v3/users/{userId}`。

### 1.3 空值说明

`null` 表示接口返回了该字段，但当前记录没有值。例如：

- 未绑定 GitHub 时，`githubId` 为 `null`。
- 未设置个人简介时，`bio` 为 `null`。
- 未设置用户时区时，`timezone` 为 `null`。

### 1.4 常见统计范围

已有记录中出现过的统计范围如下：

| 参数 | 示例值 | 说明 |
| --- | --- | --- |
| `days` | `1`、`7`、`28`、`30`、`90` | 最近 N 天 |
| `limit` | `1`、`5`、`50`、`90` | 返回数量或最近 N 个统计单位 |
| `minutes` | `1440`、`10080`、`129600` | 最近 N 分钟，分别约等于 1 天、7 天、90 天 |

### 1.5 常见字段约定

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | number/string | 资源 ID。用户 ID 为 number，机器、项目、会话等通常为 string |
| `userId` | number | 用户 ID |
| `username` | string | 用户名 |
| `avatar` | string/null | 头像 URL |
| `createdAt` | string | 创建时间 |
| `updatedAt` | string | 更新时间 |
| `eventTime` | number | 毫秒时间戳 |
| `duration` | number | 编码时长，单位分钟 |
| `minutes` | number | 编码时长，单位分钟 |
| `totalMinutes` | number | 总编码时长，单位分钟 |
| `durationMs` | number | 持续时间，单位毫秒 |

## 2. 接口总览

| 模块 | 方法 | 路径 | 说明 |
| --- | --- | --- | --- |
| 概览 | GET | `/v3/users/self` | 当前用户信息 |
| 概览 | GET | `/v3/users/self/latest-logs` | 最近编码日志 |
| 概览 | GET | `/v3/users/self/stats_time` | 按日期聚合总时长 |
| 概览 | GET | `/v3/users/self/stats` | 按语言、工作区等维度聚合时长 |
| 概览 | GET | `/v3/users/self/top` | 指定维度 Top 列表 |
| 概览 | GET | `/v3/users/self/time-distribution` | 分钟粒度活跃分布 |
| Agent | GET | `/v3/agent/dashboard` | Agent 仪表盘统计 |
| Agent | GET | `/v3/agent/sessions` | Agent 会话列表 |
| Agent | GET | `/v3/machines` | 机器列表 |
| 排行榜 | GET | `/v3/public/leaderboard` | 公开排行榜 |
| 排行榜 | GET | `/v3/users/self/overall-rank` | 当前用户总榜排名 |
| 排行榜 | GET | `/v3/public/users/{userId}/top-languages-rank` | 指定用户语言排名 |
| 年报 | GET | `/v3/users/{userId}` | 年报页使用的公开用户信息 |
| 年报 | GET | `/v3/logs/yearly-report-data` | 用户年度编码报告数据 |

## 3. 概览接口

### 3.1 当前用户信息

```http
GET /v3/users/self
```

获取当前登录用户的基础信息、登录绑定信息、订阅计划与上传令牌。

#### 查询参数

无。

#### 响应字段

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | number | 用户 ID |
| `email` | string/null | 邮箱。当前用户接口中可能返回真实邮箱 |
| `username` | string | 用户名 |
| `avatar` | string/null | 头像 URL |
| `githubId` | string/null | GitHub 账号 ID |
| `bio` | string/null | 个人简介 |
| `googleId` | string/null | Google 账号 ID |
| `appleId` | string/null | Apple 账号 ID |
| `plan` | string | 当前套餐，例如 `free` |
| `timezone` | string/null | 用户设置的时区 |
| `uploadToken` | string | 客户端上传日志使用的令牌 |
| `planExpiresAt` | string/null | 套餐过期时间 |
| `planStatus` | string/null | 套餐状态 |
| `createdAt` | string | 创建时间 |
| `updatedAt` | string | 更新时间 |

#### 响应示例

```json
{
  "id": 35521,
  "email": "qingying.xjc@gmail.com",
  "username": "qingying.xjc",
  "avatar": "https://lh3.googleusercontent.com/a/ACg8ocK29jw7K3AmSlwaZkawgIm054we4jRKY_jKIYUW8e3y2mCaXoY=s96-c",
  "githubId": null,
  "bio": null,
  "googleId": "116258528589505998773",
  "appleId": null,
  "plan": "free",
  "timezone": null,
  "uploadToken": "a4de642379d994af48c35fa7ff28cd1c23844ff0f296e6b1",
  "planExpiresAt": null,
  "planStatus": null,
  "createdAt": "2024-12-29T15:38:55.291Z",
  "updatedAt": "2024-12-29T15:38:55.291Z"
}
```

### 3.2 最近编码日志

```http
GET /v3/users/self/latest-logs
```

获取当前用户最近上传的编码日志。返回值为数组，按最近时间排序。

#### 查询参数

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `limit` | number | 否 | 返回数量。已有记录中为 `1` |

#### 响应字段

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `eventTime` | number | 日志发生时间，毫秒时间戳 |
| `language` | string | 文件语言 |
| `project` | string | 项目或工作区名称 |
| `relativeFile` | string | 相对文件路径或文件名 |
| `editor` | string | 编辑器名称 |
| `platform` | string | 操作系统平台 |
| `absoluteFile` | string | 绝对文件路径 |
| `gitOrigin` | string | Git 远端地址。没有记录时为空字符串 |
| `gitBranch` | string | Git 分支。没有记录时为空字符串 |

#### 响应示例

```json
[
  {
    "eventTime": 1779327961665,
    "language": "json",
    "project": "codetime-api [SSH: homes]",
    "relativeFile": "codetime.dev.har",
    "editor": "Visual Studio Code",
    "platform": "Linux 6.8",
    "absoluteFile": "/qy/QingYingX-Org/codetime-api/codetime.dev.har",
    "gitOrigin": "",
    "gitBranch": ""
  }
]
```

### 3.3 按日期聚合总时长

```http
GET /v3/users/self/stats_time
```

按时间单位聚合当前用户的总编码时长。已有记录中主要用于按天展示趋势图。

#### 查询参数

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `unit` | string | 是 | 聚合单位。已有记录中为 `days` |
| `tz` | string | 是 | 时区，例如 `Asia/Shanghai` |
| `limit` | number | 否 | 最近 N 个单位。已有记录中出现 `1`、`90` |
| `start_time` | string | 否 | 开始时间，ISO 8601 |
| `end_time` | string | 否 | 结束时间，ISO 8601 |

#### 响应字段

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `data` | array | 聚合结果列表 |
| `data[].duration` | number | 该时间点累计编码分钟数 |
| `data[].time` | string | 统计日期，格式通常为 `YYYY-MM-DD` |

#### 响应示例

```json
{
  "data": [
    {
      "duration": 69,
      "time": "2026-05-21"
    }
  ]
}
```

### 3.4 按维度聚合时长

```http
GET /v3/users/self/stats
```

按指定维度聚合编码时长。已有记录中出现的维度包括语言和工作区。

#### 查询参数

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `by` | string | 是 | 聚合维度。已有记录中出现 `language`、`workspace` |
| `unit` | string | 是 | 聚合单位。已有记录中为 `days` |
| `tz` | string | 是 | 时区 |
| `limit` | number | 否 | 最近 N 个单位。已有记录中出现 `1`、`90` |
| `start_time` | string | 否 | 开始时间，ISO 8601 |
| `end_time` | string | 否 | 结束时间，ISO 8601 |

#### 响应字段

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `data` | array | 聚合结果列表 |
| `data[].duration` | number | 该时间点、该维度值的累计编码分钟数 |
| `data[].time` | string | 统计日期，格式通常为 `YYYY-MM-DD` |
| `data[].by` | string | 维度值，例如语言名或工作区名 |

#### 响应示例

```json
{
  "data": [
    {
      "duration": 31,
      "time": "2026-05-21",
      "by": "markdown"
    }
  ]
}
```

### 3.5 Top 列表

```http
GET /v3/users/self/top
```

获取指定统计范围内某个维度的 Top 列表。

#### 查询参数

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `field` | string | 是 | 统计维度。已有记录中出现 `language`、`workspace`、`platform` |
| `minutes` | number | 是 | 统计范围，单位分钟。已有记录中出现 `1440`、`10080`、`129600` |
| `limit` | number | 是 | 返回数量。已有记录中为 `5` |

#### 响应字段

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `field` | string | 维度值，例如语言名、工作区名或平台名 |
| `minutes` | number | 该维度值累计编码分钟数 |

#### 响应示例

```json
[
  {
    "field": "markdown",
    "minutes": 6955
  }
]
```

### 3.6 活跃时间分布

```http
GET /v3/users/self/time-distribution
```

获取指定时间范围内的分钟粒度活跃分布，可用于绘制一天内的活跃点位图。

#### 查询参数

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `start_time` | string | 是 | 开始时间，ISO 8601 |
| `end_time` | string | 是 | 结束时间，ISO 8601 |
| `tz` | string | 是 | 时区 |

#### 响应字段

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `data` | array | 活跃分布列表 |
| `data[].hour` | number | 小时，范围 `0-23` |
| `data[].minute` | number | 分钟，范围 `0-59` |
| `data[].count` | number | 该分钟点的活跃计数 |

#### 响应示例

```json
{
  "data": [
    {
      "hour": 7,
      "minute": 25,
      "count": 1
    }
  ]
}
```

## 4. Agent 接口

### 4.1 Agent 仪表盘

```http
GET /v3/agent/dashboard
```

获取 Agent 使用统计，包括会话数、事件数、Token、工具调用、命令调用、代码变更、成本估算和热力图等。

#### 查询参数

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `tz` | string | 是 | 时区 |
| `days` | number | 否 | 最近 N 天。已有记录中出现 `28`、`30`、`90` |
| `since` | string | 否 | 自定义开始时间，ISO 8601 |
| `until` | string | 否 | 自定义结束时间，ISO 8601 |

`days` 与 `since`/`until` 都可用于限定时间范围。已有响应中 `range.key` 可能为 `custom`。

#### 响应字段

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `availableSources` | string[] | 可用 Agent 来源，例如 `claude-code`、`codex` |
| `range` | object | 当前统计时间范围 |
| `range.key` | string | 时间范围类型 |
| `range.since` | string | 统计开始时间 |
| `range.until` | string | 统计结束时间 |
| `bucket` | string | 时间桶粒度，已有记录中为 `day` |
| `summary` | object | 总计统计 |
| `overviewBuckets` | array | 按时间桶聚合的活跃、会话、Token、代码变更 |
| `tokenBuckets` | array | 按时间桶聚合的 Token、模型调用和成本 |
| `heatmap` | array | 按星期和小时聚合的热力图数据 |
| `projectTokens` | array | 按项目聚合的 Token、会话、时长和成本 |
| `modelCosts` | array | 按模型聚合的 Token 和成本 |
| `agentCosts` | array | 按 Agent 来源聚合的 Token 和成本 |
| `tools` | array | 工具调用统计 |
| `pricing` | object | 价格表加载状态 |

#### `summary` 字段

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `totalSessions` | number | 会话总数 |
| `totalEvents` | number | 事件总数 |
| `totalProjects` | number | 项目总数 |
| `totalToolCalls` | number | 工具调用总数 |
| `totalCommandCalls` | number | 命令调用总数 |
| `totalInputTokens` | number | 输入 Token 总数 |
| `totalCachedInputTokens` | number | 缓存输入 Token 总数 |
| `totalOutputTokens` | number | 输出 Token 总数 |
| `totalReasoningOutputTokens` | number | 推理输出 Token 总数 |
| `totalTokens` | number | Token 总数 |
| `totalDurationMs` | number | 总持续时间，单位毫秒 |
| `totalLinesAdded` | number | 新增代码行数 |
| `totalLinesRemoved` | number | 删除代码行数 |

#### 时间桶字段

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `overviewBuckets[].ts` | string | 时间桶起点 |
| `overviewBuckets[].activity` | number | 活跃量 |
| `overviewBuckets[].sessions` | number | 会话数 |
| `overviewBuckets[].tokens` | number | Token 数 |
| `overviewBuckets[].linesChanged` | number | 变更代码行数 |
| `overviewBuckets[].estimatedCostUsd` | number | 预估成本，美元 |
| `tokenBuckets[].inputTokens` | number | 输入 Token 数 |
| `tokenBuckets[].cachedInputTokens` | number | 缓存输入 Token 数 |
| `tokenBuckets[].outputTokens` | number | 输出 Token 数 |
| `tokenBuckets[].reasoningOutputTokens` | number | 推理输出 Token 数 |
| `tokenBuckets[].modelCalls` | number | 模型调用次数 |
| `tokenBuckets[].estimatedCostUsd` | number | 预估成本，美元 |
| `tokenBuckets[].bySource` | object | 按 Agent 来源拆分的 Token 与成本 |

#### 响应示例

```json
{
  "availableSources": ["claude-code", "codex"],
  "range": {
    "key": "custom",
    "since": "2026-04-23T01:46:25.742Z",
    "until": "2026-05-21T01:46:25.742Z"
  },
  "bucket": "day",
  "summary": {
    "totalSessions": 144,
    "totalEvents": 134594,
    "totalProjects": 14,
    "totalToolCalls": 44381,
    "totalCommandCalls": 11001,
    "totalInputTokens": 1504889898,
    "totalCachedInputTokens": 1356569856,
    "totalOutputTokens": 6200656,
    "totalReasoningOutputTokens": 1800351,
    "totalTokens": 1513011946,
    "totalDurationMs": 2453937584,
    "totalLinesAdded": 44078,
    "totalLinesRemoved": 15143
  },
  "overviewBuckets": [
    {
      "ts": "2026-04-22T16:00:00.000Z",
      "activity": 571,
      "sessions": 6,
      "tokens": 6979437,
      "linesChanged": 1348,
      "estimatedCostUsd": 0
    }
  ],
  "tokenBuckets": [
    {
      "ts": "2026-04-22T16:00:00.000Z",
      "inputTokens": 10413413,
      "cachedInputTokens": 9223296,
      "outputTokens": 79408,
      "reasoningOutputTokens": 35774,
      "modelCalls": 97,
      "estimatedCostUsd": 7.0088465,
      "bySource": {
        "codex": {
          "inputTokens": 10413413,
          "cachedInputTokens": 9223296,
          "outputTokens": 79408,
          "reasoningOutputTokens": 35774,
          "modelCalls": 97,
          "estimatedCostUsd": 7.0088465
        }
      }
    }
  ],
  "heatmap": [
    {
      "weekday": 0,
      "hour": 0,
      "count": 10,
      "estimatedCostUsd": 0
    }
  ],
  "projectTokens": [],
  "modelCosts": [],
  "agentCosts": [],
  "tools": [],
  "pricing": {
    "status": "ready",
    "loadedAt": 1779327985875,
    "source": "openrouter",
    "size": 358
  }
}
```

### 4.2 Agent 会话列表

```http
GET /v3/agent/sessions
```

获取当前用户的 Agent 会话列表。接口支持游标分页。

#### 查询参数

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `limit` | number | 否 | 返回数量。已有记录中为 `50` |
| `cursor` | string | 否 | 分页游标，使用上一页响应中的 `nextCursor` |

#### 响应字段

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `sessions` | array | 会话列表 |
| `nextCursor` | string/null | 下一页游标。没有更多数据时可能为空或不存在 |

#### `sessions[]` 字段

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `rollupKey` | string | 聚合键 |
| `sessionId` | string | 会话 ID |
| `source` | string | 来源，例如 `codex` |
| `agent` | string | Agent 名称 |
| `project` | string | 项目名称 |
| `projectId` | string | 项目 ID |
| `machineId` | string | 机器 ID |
| `startedAt` | string | 会话开始时间 |
| `lastEventAt` | string | 最后事件时间 |
| `eventCount` | number | 事件数量 |
| `turnCount` | number | 对话轮数 |
| `toolCallCount` | number | 工具调用次数 |
| `inputTokens` | number | 输入 Token 数 |
| `outputTokens` | number | 输出 Token 数 |
| `totalTokens` | number | Token 总数 |
| `linesAdded` | number | 新增代码行数 |
| `linesRemoved` | number | 删除代码行数 |
| `durationMs` | number | 会话持续时间，单位毫秒 |

#### 响应示例

```json
{
  "sessions": [
    {
      "rollupKey": "rollup:codex:sha256%3A...:019e4835-f24b-7ee2-9213-c20e8292235d",
      "sessionId": "019e4835-f24b-7ee2-9213-c20e8292235d",
      "source": "codex",
      "agent": "codex",
      "project": "codetime-api",
      "projectId": "f3fd2544-1c0d-4133-a751-0a078f48a305",
      "machineId": "70400552-5aee-4d26-a3e7-0c64184d4b2e",
      "startedAt": "2026-05-21T01:46:01.176Z",
      "lastEventAt": "2026-05-21T01:46:01.356Z",
      "eventCount": 4,
      "turnCount": 1,
      "toolCallCount": 0,
      "inputTokens": 0,
      "outputTokens": 0,
      "totalTokens": 0,
      "linesAdded": 0,
      "linesRemoved": 0,
      "durationMs": 180
    }
  ],
  "nextCursor": "2026-05-12T04:52:24.491Z_rollup:codex:sha256%3A..."
}
```

### 4.3 机器列表

```http
GET /v3/machines
```

获取当前用户关联的机器列表。

#### 查询参数

无。

#### 响应字段

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `machines` | array | 机器列表 |
| `machines[].id` | string | 机器 ID |
| `machines[].hostname` | string | 主机名 |
| `machines[].displayName` | string | 展示名称 |
| `machines[].platform` | string | 平台，例如 `linux` |
| `machines[].source` | string | 来源，例如 `agent` |
| `machines[].lastSeenAt` | string | 最近在线或上报时间 |
| `machines[].createdAt` | string | 创建时间 |

#### 响应示例

```json
{
  "machines": [
    {
      "id": "70400552-5aee-4d26-a3e7-0c64184d4b2e",
      "hostname": "ubuntu",
      "displayName": "ubuntu",
      "platform": "linux",
      "source": "agent",
      "lastSeenAt": "2026-05-21T01:46:02.396Z",
      "createdAt": "2026-05-19T11:37:22.551Z"
    }
  ]
}
```

## 5. 排行榜接口

### 5.1 公开排行榜

```http
GET /v3/public/leaderboard
```

获取公开排行榜，按指定天数统计用户编码总时长并返回排名。

#### 查询参数

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `days` | number | 是 | 统计天数。已有记录中出现 `1`、`7`、`28` |

#### 响应字段

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `entries` | array | 排行榜条目 |
| `entries[].user` | object | 用户公开信息 |
| `entries[].totalMinutes` | number | 统计范围内的编码总分钟数 |
| `entries[].rank` | number | 排名，从 `1` 开始 |
| `totalUsers` | number | 参与统计的用户总数 |
| `updatedAt` | string | 排行榜更新时间 |

备注：已有记录中该接口响应内容以 base64 存储，下面示例为解码后的 JSON。

#### 响应示例

```json
{
  "entries": [
    {
      "user": {
        "id": 1656,
        "email": null,
        "username": "fomoweth",
        "avatar": "https://avatars.githubusercontent.com/u/24905532?v=4",
        "githubId": null,
        "bio": "",
        "googleId": null,
        "plan": "free",
        "timezone": "America/Los_Angeles",
        "createdAt": "2001-01-01T00:00:00.000Z",
        "updatedAt": "2025-10-03T02:08:33.354Z"
      },
      "totalMinutes": 15573,
      "rank": 1
    }
  ],
  "totalUsers": 18606,
  "updatedAt": "2026-05-21T01:46:58.503Z"
}
```

### 5.2 当前用户总榜排名

```http
GET /v3/users/self/overall-rank
```

获取当前用户在指定统计周期内的整体排名信息。

#### 查询参数

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `days` | number | 是 | 统计天数。已有记录中出现 `1`、`7`、`28` |

#### 响应字段

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `userId` | number | 当前用户 ID |
| `username` | string | 当前用户名 |
| `totalMinutes` | number | 统计范围内的编码总分钟数 |
| `percentile` | number | 百分位。数值越小通常表示排名越靠前 |
| `timeRangeDays` | number | 实际统计天数 |
| `updatedAt` | string | 数据更新时间 |

#### 响应示例

```json
{
  "userId": 35521,
  "username": "qingying.xjc",
  "totalMinutes": 5244,
  "percentile": 0.05374610340750295,
  "timeRangeDays": 28,
  "updatedAt": "2026-05-21T01:46:58.607Z"
}
```

### 5.3 指定用户语言排名

```http
GET /v3/public/users/{userId}/top-languages-rank
```

获取指定用户在常用语言维度上的排名表现。

#### 路径参数

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `userId` | number | 用户 ID。已有记录中为 `35521` |

#### 响应字段

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `userId` | number | 用户 ID |
| `username` | string | 用户名 |
| `entries` | array | 语言排名列表 |
| `entries[].language` | string | 语言名 |
| `entries[].totalMinutes` | number | 该语言累计编码分钟数 |
| `entries[].percentile` | number | 该语言排名百分位。数值越小通常表示排名越靠前 |
| `timeRangeDays` | number | 统计天数 |
| `updatedAt` | string | 数据更新时间 |

#### 响应示例

```json
{
  "userId": 35521,
  "username": "qingying.xjc",
  "entries": [
    {
      "language": "markdown",
      "totalMinutes": 2317,
      "percentile": 0.009213617727000507
    }
  ],
  "timeRangeDays": 30,
  "updatedAt": "2026-05-21T01:46:06.914Z"
}
```

## 6. 年报接口

### 6.1 公开用户信息

```http
GET /v3/users/{userId}
```

年报页会先调用该接口确认用户存在，并读取 `username`、`avatar`、`timezone` 等展示信息。

#### 路径参数

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `userId` | number | 用户 ID |

#### 响应字段

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | number | 用户 ID |
| `email` | string/null | 邮箱。公开用户接口中通常为 `null` |
| `username` | string | 用户名 |
| `avatar` | string/null | 头像 URL |
| `githubId` | string/null | GitHub 账号 ID |
| `bio` | string/null | 个人简介 |
| `googleId` | string/null | Google 账号 ID。公开用户接口中通常为 `null` |
| `plan` | string | 当前套餐，例如 `free` |
| `timezone` | string/null | 用户设置的时区 |
| `createdAt` | string | 创建时间 |
| `updatedAt` | string | 更新时间 |

#### 响应示例

```json
{
  "id": 35521,
  "email": null,
  "username": "QingYingX",
  "avatar": "https://lh3.googleusercontent.com/a/ACg8ocK29jw7K3AmSlwaZkawgIm054we4jRKY_jKIYUW8e3y2mCaXoY=s96-c",
  "githubId": null,
  "bio": null,
  "googleId": null,
  "plan": "free",
  "timezone": null,
  "createdAt": "2024-12-29T15:38:55.291Z",
  "updatedAt": "2026-05-21T12:23:55.191Z"
}
```

### 6.2 用户年度编码报告

```http
GET /v3/logs/yearly-report-data
```

获取指定用户某一年的编码报告数据。年报页会先调用 `GET /v3/users/{userId}` 获取公开用户信息，再调用本接口获取年度统计。

页面来源记录：`codetime-web/app/pages/[locale]/user/[uid]/annual-report.vue`

#### 查询参数

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `user_id` | number | 是 | 用户 ID |
| `year` | number | 否 | 年份，例如 `2026` |
| `timezone` | string | 否 | 时区，例如 `Asia/Shanghai` |

#### 响应字段

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `topLanguages` | array | 年度语言 Top 列表 |
| `topLanguages[].field` | string | 语言名 |
| `topLanguages[].minutes` | number | 该语言年度累计编码分钟数 |
| `hourlyDistribution` | array | 0-23 点每小时累计编码分钟数 |
| `hourlyDistribution[].field` | string | 小时，字符串形式，例如 `0` |
| `hourlyDistribution[].minutes` | number | 该小时累计编码分钟数 |
| `dailyDistribution` | array | 每日累计编码分钟数 |
| `dailyDistribution[].field` | string | 日期，格式为 `YYYY-MM-DD` |
| `dailyDistribution[].minutes` | number | 该日累计编码分钟数 |

#### 响应示例

```json
{
  "topLanguages": [
    {
      "field": "javascript",
      "minutes": 10754
    }
  ],
  "hourlyDistribution": [
    {
      "field": "0",
      "minutes": 885
    }
  ],
  "dailyDistribution": [
    {
      "field": "2026-01-01",
      "minutes": 324
    }
  ]
}
```

#### 已验证请求

```bash
curl 'https://codetime.dev/v3/logs/yearly-report-data?user_id=35521&year=2026&timezone=Asia%2FShanghai' \
  -H 'accept: application/json'
```

已记录结果：`200 application/json`。本次测试返回 `topLanguages` 5 项、`hourlyDistribution` 24 项、`dailyDistribution` 119 项，总计约 `34292` 分钟。

## 7. 调用示例

### 7.1 查询 90 天每日总时长

```bash
curl 'https://codetime.dev/v3/users/self/stats_time?unit=days&tz=Asia%2FShanghai&limit=90' \
  -H 'accept: */*'
```

### 7.2 查询 Agent 28 天仪表盘

```bash
curl 'https://codetime.dev/v3/agent/dashboard?tz=Asia%2FShanghai&days=28' \
  -H 'accept: */*'
```

### 7.3 查询 28 天公开排行榜

```bash
curl 'https://codetime.dev/v3/public/leaderboard?days=28' \
  -H 'accept: */*'
```

### 7.4 查询用户年度编码报告

```bash
curl 'https://codetime.dev/v3/logs/yearly-report-data?user_id=35521&year=2026&timezone=Asia%2FShanghai' \
  -H 'accept: application/json'
```
