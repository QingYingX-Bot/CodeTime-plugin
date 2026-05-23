`#ct(我的)?资料` -> `/v3/users/self`
```json
{
  "id": 35521,
  "email": "qingying.xjc@gmail.com",
  "username": "QingYingX",
  "avatar": "https://lh3.googleusercontent.com/a/ACg8ocK29jw7K3AmSlwaZkawgIm054we4jRKY_jKIYUW8e3y2mCaXoY=s96-c",
  "githubId": null,
  "bio": null,
  "googleId": "116258528589505998773",
  "appleId": "000173.bf1da2218c95415eb2fc2fd0d001744d.1223",
  "plan": "free",
  "timezone": null,
  "uploadToken": "a4de642379d994af48c35fa7ff28cd1c23844ff0f296e6b1",
  "planExpiresAt": null,
  "planStatus": null,
  "createdAt": "2024-12-29T15:38:55.291Z",
  "updatedAt": "2026-05-21T12:23:55.191Z"
}
```

`#ct(近期|最近)?日志 <个数>` -> `/v3/users/self/latest-logs`
  默认个数为 5
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

`#ct今日` -> 聚合今日数据

`#ct(编程)?(日|周|月|年)时间` -> `/v3/users/self/stats_time`
  默认携带 tz=Asia/Shanghai
  参数 start_time 以及 end_time 使用命令的中的 日周月年 计算
  例如 start_time=2026-02-22T00:53:13.211Z&end_time=2026-05-23T00:50:49.381Z
  默认从 当前月开始 到当天  日也就是 今日到今日0点

```json
{
  "data": [
    {
      "duration": 41,
      "time": "2026-05-23"
    },
    {
      "duration": 217,
      "time": "2026-05-22"
    }
  ]
}
```

`ct(编程)?(日|周|月|年)详情 <语言|项目>` -> `/v3/users/self/stats`
  默认携带 tz=Asia/Shanghai
  必传 by 参数 语言对应 language 项目对应 workspace
  如果命令中没写 语言或者是项目 默认 都查询 使用合并转发消息发送
  参数 start_time 以及 end_time 使用命令的中的 日周月年 计算
  例如 start_time=2026-02-22T00:53:13.211Z&end_time=2026-05-23T00:50:49.381Z
  默认从 当前月开始 到当天  日也就是 今日到今日0点

语言
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
    },
    {
      "duration": 1,
      "time": "2026-05-23",
      "by": "typescript"
    },
    {
      "duration": 78,
      "time": "2026-05-22",
      "by": "javascript"
    },
    {
      "duration": 57,
      "time": "2026-05-22",
      "by": "markdown"
    },
    {
      "duration": 31,
      "time": "2026-05-22",
      "by": "go"
    },
    {
      "duration": 17,
      "time": "2026-05-22",
      "by": "ignore"
    },
    {
      "duration": 11,
      "time": "2026-05-22",
      "by": "dotenv"
    },
    {
      "duration": 10,
      "time": "2026-05-22",
      "by": "html"
    },
    {
      "duration": 9,
      "time": "2026-05-22",
      "by": "json"
    },
    {
      "duration": 2,
      "time": "2026-05-22",
      "by": "yaml"
    },
    {
      "duration": 1,
      "time": "2026-05-22",
      "by": "plaintext"
    },
    {
      "duration": 1,
      "time": "2026-05-22",
      "by": "shellscript"
    },
    {
      "duration": 83,
      "time": "2026-05-21",
      "by": "javascript"
    },
    {
      "duration": 73,
      "time": "2026-05-21",
      "by": "markdown"
    },
    {
      "duration": 12,
      "time": "2026-05-21",
      "by": "json"
    },
    {
      "duration": 5,
      "time": "2026-05-21",
      "by": "dotenv"
    },
    {
      "duration": 5,
      "time": "2026-05-21",
      "by": "go"
    },
    {
      "duration": 2,
      "time": "2026-05-21",
      "by": "yaml"
    },
    {
      "duration": 1,
      "time": "2026-05-21",
      "by": "Log"
    }
  ]
}
```
项目
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
    },
    {
      "duration": 102,
      "time": "2026-05-22",
      "by": "Yunzai [SSH: homes]"
    },
    {
      "duration": 100,
      "time": "2026-05-22",
      "by": "wegame-api-go [SSH: homes]"
    },
    {
      "duration": 13,
      "time": "2026-05-22",
      "by": "photo [SSH: homes]"
    },
    {
      "duration": 2,
      "time": "2026-05-22",
      "by": "meme-generator [SSH: homes]"
    }
  ]
}
```

`#ct(编程)?排行 <语言|项目|平台>` -> `/v3/users/self/top`
  必传 field 语言language 项目workspace 平台platform
  如果命令中没写 默认 都查询 使用合并转发消息发送
```json
[
  {
    "field": "markdown",
    "minutes": 7108
  },
  {
    "field": "javascript",
    "minutes": 5144
  },
]
```

`#ct(编程)?(日|周|月|年)时间分布` -> `/v3/users/self/time-distribution`
  默认携带 tz=Asia/Shanghai
  参数 start_time 以及 end_time 使用命令的中的 日周月年 计算
  例如 start_time=2026-02-22T00:53:13.211Z&end_time=2026-05-23T00:50:49.381Z
  默认从 当前月开始 到当天  日也就是 今日到今日0点
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
    },
    {
      "hour": 0,
      "minute": 3,
      "count": 1
    }
  ]
}
```
