export const TOP_LABELS = {
  language: '语言 TOP',
  project: '项目 TOP',
  topLanguage: 'TOP 语言',
  topProject: 'TOP 项目',
  tools: '工具调用 TOP'
}

export function formatTopBadge(count = 20) {
  return `TOP ${Math.max(0, Number(count) || 0)}`
}

export const VIBE_LABELS = {
  duration: 'AI时长',
  sessions: 'AI会话',
  token: 'AI Token',
  cost: 'AI成本',
  overview: 'AI概览',
  projectTop: 'AI项目 TOP',
  modelTop: 'AI模型 TOP',
  agentTop: 'AI Agent TOP',
  statsTitle: 'CodeTime AI统计',
  recordsTitle: 'CodeTime AI记录',
  queryTitle: 'AI 查询',
  usageStats: 'AI 使用统计',
  sessionRecords: 'AI 会话记录',
  projectTokenTop: 'AI项目 TOP',
  modelTokenTop: 'AI模型 TOP',
  agentTokenTop: 'AI Agent TOP',
  agentDetail: 'AI Agent 明细',
  projectDetail: 'AI项目明细',
  modelDetail: 'AI模型明细',
  toolDetail: 'AI工具明细',
  statsSubtitle: '按日、周、月、年查看 AI 统计',
  recordsSubtitle: '最新 AI 会话记录',
  noRecords: '暂无 AI 记录'
}

export function vibeStatsTitle(scope = '') {
  return scope ? `CodeTime AI ${scope}统计` : VIBE_LABELS.statsTitle
}

const SECTION_META_MAP = {
  density: '密度分布',
  duration: '按时长',
  'daily · 7d window': '按日 · 7 天窗口',
  'language · dots': '语言 · 热力',
  'workspace · dots': '项目 · 热力',
  'summary · segments': '汇总 · 分段对比',
  'weekday / hour': '星期 · 小时',
  estimatedCostUsd: '预估费用',
  inputTokens: '输入 Token'
}

export function formatSectionMeta(meta = '') {
  const text = String(meta || '').trim()
  if (!text) return ''

  const intervalDensity = text.match(/^(\d+)m\s*·\s*density$/i)
  if (intervalDensity) return `${intervalDensity[1]} 分钟 · 密度分布`

  return SECTION_META_MAP[text] || text
}

export function formatDistributionMeta(interval = 10) {
  return `${Math.max(1, Number(interval || 10))} 分钟 · 密度分布`
}