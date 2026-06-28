const DEMO_AVATAR = 'https://avatars.githubusercontent.com/u/24905532?v=4'

import { formatTopBadge, TOP_LABELS, VIBE_LABELS, vibeStatsTitle } from '../model/codetimeLabels.js'

function distributionPoints(seed = 1) {
  const points = []
  for (let hour = 0; hour < 24; hour++) {
    const peak = hour >= 9 && hour <= 23
    const count = peak ? Math.round((Math.sin((hour + seed) / 3) + 1.2) * 12) : Math.round(Math.random() * 3)
    for (let minute = 0; minute < 60; minute += 10) {
      if (count > 0 && minute % 20 === 0) {
        points.push({ hour, minute, count: Math.max(1, count - minute % 30) })
      }
    }
  }
  return points
}

function trendItems(days = 14) {
  const items = []
  const now = new Date()
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now)
    date.setDate(date.getDate() - i)
    items.push({
      label: date.toISOString().slice(0, 10),
      value: Math.round(30 + Math.sin(i / 2) * 25 + Math.random() * 40)
    })
  }
  return items
}

function categoryHeatmapItems(field) {
  const items = []
  const categories = field === 'language'
    ? ['TypeScript', 'Python', 'Rust', 'Go', 'CSS']
    : ['codetime-plugin', 'web-app', 'cli-tools', 'docs']
  const now = new Date()
  for (let day = 13; day >= 0; day--) {
    const date = new Date(now)
    date.setDate(date.getDate() - day)
    const dateStr = date.toISOString().slice(0, 10)
    for (const by of categories) {
      items.push({
        time: dateStr,
        by,
        duration: Math.round(Math.random() * 180)
      })
    }
  }
  return items
}

function heatmapItems() {
  const items = []
  for (let weekday = 0; weekday < 7; weekday++) {
    for (let hour = 0; hour < 24; hour++) {
      const active = weekday >= 1 && weekday <= 5 && hour >= 9 && hour <= 22
      items.push({
        weekday,
        hour,
        value: active ? Math.round(Math.random() * 120 + 20) : Math.round(Math.random() * 8)
      })
    }
  }
  return items
}

function columnChartItems(prefix = 'D', count = 12) {
  return Array.from({ length: count }, (_, index) => ({
    label: `${prefix}${index + 1}`,
    value: Math.round(5 + Math.random() * 95),
    valueText: `$${(5 + Math.random() * 95).toFixed(2)}`
  }))
}

export const previewViews = {
  help: {
    type: 'help',
    badges: ['#ct', '#ctai', '绑定后使用'],
    sections: [
      {
        title: '账号绑定',
        items: [
          { name: '#ct绑定 <token>', desc: '绑定 CodeTime 账号' },
          { name: '#ct绑定列表 / #ct账号列表', desc: '查看绑定列表' }
        ]
      },
      {
        title: 'CodeTime 查询',
        items: [
          { name: '#ct概览 / #ct(日|周|月|年)概览', desc: '编程趋势与分布' },
          { name: '#ct今日', desc: '今日数据总览' },
          { name: '#ct排行 / #ct排行榜', desc: '公开排行榜' }
        ]
      },
      {
        title: VIBE_LABELS.queryTitle,
        items: [
          { name: '#ctai(日|周|月|年)统计', desc: VIBE_LABELS.usageStats },
          { name: '#ctai记录 <数量>', desc: VIBE_LABELS.sessionRecords }
        ]
      }
    ]
  },

  today: {
    type: 'today',
    title: 'CodeTime Today',
    user: {
      name: 'demo_user',
      meta: '日期：2026-06-28',
      avatar: DEMO_AVATAR
    },
    metrics: [
      { label: '编程总时长', value: '4小时32分钟' },
      { label: VIBE_LABELS.sessions, value: '18' },
      { label: VIBE_LABELS.token, value: '1,234,567' },
      { label: VIBE_LABELS.cost, value: '$3.42' },
      { label: VIBE_LABELS.duration, value: '2小时15分钟' },
      { label: '工具调用', value: '246' },
      { label: '事件', value: '1,024' },
      { label: '代码变更', value: '+842 / -126' }
    ],
    sections: [
      {
        title: TOP_LABELS.language,
        items: [
          { name: 'TypeScript', value: '2小时10分钟' },
          { name: 'Python', value: '1小时05分钟' },
          { name: 'CSS', value: '42分钟' }
        ]
      },
      {
        title: TOP_LABELS.project,
        items: [
          { name: 'CodeTime-plugin', value: '3小时12分钟' },
          { name: 'web-dashboard', value: '1小时20分钟' }
        ]
      },
      {
        title: '时间分布',
        type: 'time-distribution',
        points: distributionPoints(2)
      },
      {
        title: VIBE_LABELS.projectTop,
        items: [
          { name: 'CodeTime-plugin', value: '680,000 Token' },
          { name: 'api-service', value: '320,000 Token' }
        ]
      }
    ]
  },

  overview: {
    type: 'overview',
    title: 'CodeTime 周概览',
    user: {
      name: 'demo_user',
      meta: '2026-06-22 ~ 2026-06-28',
      avatar: DEMO_AVATAR
    },
    metrics: [
      { label: '总时长', value: '28小时15分钟', sub: '6 个活跃日' },
      { label: '日均', value: '4小时02分钟', sub: '按窗口天数' },
      { label: '活跃日均', value: '4小时42分钟', sub: '仅统计有记录日期' },
      { label: TOP_LABELS.topLanguage, value: 'TypeScript' },
      { label: TOP_LABELS.topProject, value: 'CodeTime-plugin' },
      { label: '时间点', value: '128', sub: '活跃分布采样' }
    ],
    sections: [
      {
        title: '编程趋势',
        type: 'trend-chart',
        meta: '按日 · 7 天窗口',
        items: trendItems(14)
      },
      {
        title: TOP_LABELS.language,
        meta: '按时长',
        items: [
          { name: 'TypeScript', value: '12小时40分钟' },
          { name: 'Python', value: '8小时20分钟' },
          { name: 'Rust', value: '4小时05分钟' }
        ]
      },
      {
        title: '语言趋势',
        type: 'category-heatmap',
        meta: '语言 · 热力',
        items: categoryHeatmapItems('language')
      },
      {
        title: TOP_LABELS.project,
        meta: '按时长',
        items: [
          { name: 'CodeTime-plugin', value: '16小时12分钟' },
          { name: 'web-dashboard', value: '7小时48分钟' }
        ]
      },
      {
        title: '活跃时间分布',
        type: 'time-distribution',
        meta: '汇总 · 分段对比',
        summaryPoints: distributionPoints(3),
        segments: [
          { points: distributionPoints(1), opacity: 0.6 },
          { points: distributionPoints(4), opacity: 0.4 }
        ]
      }
    ]
  },

  rank: {
    type: 'rank',
    title: 'CodeTime 日榜',
    subtitle: '公开编程时长榜单 · 统计 1 天',
    badges: [formatTopBadge(20), '1,284 人', '更新 2026-06-28 08:00'],
    sections: [
      {
        title: '公开排行榜',
        type: 'leaderboard',
        meta: '显示前 20 名',
        items: [
          { rank: 1, name: 'alice_dev', sub: 'Asia/Shanghai', initial: 'A', minutes: 520, minutesText: '520 分钟', duration: '8小时40分钟' },
          { rank: 2, name: 'bob_coder', sub: 'UTC', initial: 'B', minutes: 480, minutesText: '480 分钟', duration: '8小时' },
          { rank: 3, name: 'carol_ts', sub: 'Europe/Berlin', initial: 'C', minutes: 410, minutesText: '410 分钟', duration: '6小时50分钟' },
          { rank: 4, name: 'demo_user', sub: 'Asia/Shanghai', initial: 'D', minutes: 272, minutesText: '272 分钟', duration: '4小时32分钟', isSelf: true },
          { rank: 5, name: 'eve_rust', sub: 'America/Los_Angeles', initial: 'E', minutes: 240, minutesText: '240 分钟', duration: '4小时' }
        ],
        self: {
          name: 'demo_user',
          initial: 'D',
          duration: '4小时32分钟',
          minutesText: '272 分钟',
          percentile: '前 12.50%',
          days: '1天'
        }
      }
    ]
  },

  distribution: {
    type: 'distribution',
    title: 'CodeTime 时间分布',
    user: {
      name: 'demo_user',
      meta: '日期：2026-06-28',
      avatar: DEMO_AVATAR
    },
    metrics: [
      { label: '采样点', value: '96' },
      { label: '峰值时段', value: '21:30' },
      { label: '活跃小时', value: '11' }
    ],
    sections: [
      {
        title: '编程时间分布',
        type: 'time-distribution',
        meta: '10 分钟 · 密度分布',
        points: distributionPoints(5)
      }
    ]
  },

  agent: {
    type: 'agent',
    title: vibeStatsTitle('周'),
    user: {
      name: 'demo_user',
      meta: '2026-06-22 ~ 2026-06-28',
      avatar: DEMO_AVATAR
    },
    metrics: [
      { label: '会话', value: '86' },
      { label: '事件', value: '4,218' },
      { label: '项目', value: '6' },
      { label: '工具调用', value: '1,024' },
      { label: 'Token', value: '8,432,100' },
      { label: '预估成本', value: '$24.60' },
      { label: '持续时间', value: '18小时40分钟' },
      { label: '代码变更', value: '+3,420 / -812' }
    ],
    sections: [
      {
        title: '费用图',
        type: 'column-chart',
        meta: '预估费用',
        unit: 'usd',
        items: columnChartItems('W')
      },
      {
        title: 'Token 图',
        type: 'column-chart',
        meta: '输入 Token',
        unit: 'token',
        items: columnChartItems('T', 10).map((item) => ({
          ...item,
          value: item.value * 10000,
          valueText: `${(item.value * 10000).toLocaleString('zh-CN')}`
        }))
      },
      {
        title: '活跃热力',
        type: 'heatmap',
        meta: '星期 · 小时',
        items: heatmapItems()
      },
      {
        title: '项目明细',
        type: 'table',
        columns: [
          { key: 'rank', label: '#', align: 'right', width: '34px' },
          { key: 'name', label: '项目', width: '170px' },
          { key: 'sessions', label: '会话', align: 'right', width: '58px' },
          { key: 'tokens', label: 'Token', align: 'right', width: '150px' },
          { key: 'cost', label: '成本', align: 'right', width: '76px' }
        ],
        items: [
          { rank: '1', name: 'CodeTime-plugin', sessions: '32', tokens: '3,200,000', cost: '$9.80' },
          { rank: '2', name: 'api-service', sessions: '18', tokens: '1,800,000', cost: '$5.20' }
        ]
      },
      {
        title: VIBE_LABELS.modelTokenTop,
        items: [
          { name: 'claude-sonnet-4', value: '4,100,000 Token' },
          { name: 'gpt-4.1', value: '2,200,000 Token' }
        ]
      }
    ]
  },

  sessions: {
    type: 'sessions',
    title: VIBE_LABELS.recordsTitle,
    user: {
      name: 'demo_user',
      meta: '最近 10 条会话',
      avatar: DEMO_AVATAR
    },
    sessions: [
      {
        source: 'cursor',
        project: 'CodeTime-plugin',
        startedAt: '2026-06-28 14:32:10',
        duration: '18分钟',
        turns: '12',
        tools: '8',
        inputTokens: '42,100',
        outputTokens: '8,420',
        linesRemoved: '12',
        linesAdded: '86'
      },
      {
        source: 'claude-code',
        project: 'web-dashboard',
        startedAt: '2026-06-28 11:05:44',
        duration: '32分钟',
        turns: '24',
        tools: '15',
        inputTokens: '68,300',
        outputTokens: '12,100',
        linesRemoved: '45',
        linesAdded: '210'
      },
      {
        source: 'codex',
        project: 'api-service',
        startedAt: '2026-06-27 22:18:02',
        duration: '9分钟',
        turns: '6',
        tools: '4',
        inputTokens: '18,900',
        outputTokens: '3,200',
        linesRemoved: '3',
        linesAdded: '28'
      }
    ]
  }
}