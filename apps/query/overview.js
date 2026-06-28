import plugin from '../../../../lib/plugins/plugin.js'
import { formatMinutes, getDefaultTimezone } from '../../model/codetimeApi.js'
import {
  buildHeroUser,
  getApiContext,
  getTimeWindow,
  parseTimeScope,
  replyError,
  sumMinutes
} from '../../model/codetimeUtils.js'
import { TOP_LABELS } from '../../model/codetimeLabels.js'
import { formatDateOnly, renderCodeTimeCard } from '../../model/codetimeRender.js'

function parseOverviewScope(message = '') {
  return String(message).match(/#ct(?:编程)?([日周月年])?概览/)?.[1] || parseTimeScope(message)
}

function fallbackLimit(window) {
  return Math.max(1, window.days)
}

async function getStatsTime(ctx, window) {
  try {
    return await ctx.api.getStatsTime({
      tz: ctx.tz,
      startTime: window.startTime,
      endTime: window.endTime
    })
  } catch (err) {
    if (err.message !== '请升级订阅计划') throw err
    return ctx.api.getStatsTime({
      tz: ctx.tz,
      limit: Math.min(90, fallbackLimit(window))
    })
  }
}

async function getStats(ctx, by, window) {
  try {
    return await ctx.api.getStats({
      by,
      tz: ctx.tz,
      startTime: window.startTime,
      endTime: window.endTime
    })
  } catch (err) {
    if (err.message !== '请升级订阅计划') throw err
    return ctx.api.getStats({
      by,
      tz: ctx.tz,
      limit: Math.min(90, fallbackLimit(window))
    })
  }
}

async function getDistribution(ctx, window) {
  try {
    return await ctx.api.getTimeDistribution({
      tz: ctx.tz,
      startTime: window.startTime,
      endTime: window.endTime
    })
  } catch (err) {
    if (err.message !== '请升级订阅计划') throw err
    return ctx.api.getTimeDistribution({
      tz: ctx.tz,
      days: Math.min(90, fallbackLimit(window))
    })
  }
}

async function getDistributionSegments(ctx, window, segments = 5) {
  const start = new Date(window.startTime).getTime()
  const end = new Date(window.endTime).getTime()
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return []

  const segmentMs = Math.max(60_000, Math.floor((end - start) / segments))
  const tasks = []
  for (let i = 0; i < segments; i++) {
    const segmentEnd = new Date(end - i * segmentMs)
    const segmentStart = new Date(Math.max(start, segmentEnd.getTime() - segmentMs))
    if (segmentEnd.getTime() <= segmentStart.getTime()) continue
    tasks.push(
      ctx.api.getTimeDistribution({
        tz: ctx.tz,
        startTime: segmentStart.toISOString(),
        endTime: segmentEnd.toISOString()
      }).then(data => ({
        label: `${formatDateOnly(segmentStart)}~${formatDateOnly(segmentEnd)}`,
        points: data?.data || [],
        opacity: Math.max(0.28, 0.72 - i * 0.12)
      })).catch((err) => {
        if (err.message === '请升级订阅计划') return null
        throw err
      })
    )
  }

  const results = await Promise.all(tasks)
  return results.filter(Boolean)
}

function topRows(items = [], limit = 5) {
  return (items || [])
    .slice()
    .sort((a, b) => Number(b.duration || b.minutes || 0) - Number(a.duration || a.minutes || 0))
    .slice(0, limit)
    .map((item, index) => ({
      name: `${index + 1}. ${item.by || item.field || '未知'}`,
      value: formatMinutes(item.duration || item.minutes || 0),
      sub: item.time || ''
    }))
}

function topName(items = []) {
  const row = (items || [])
    .slice()
    .sort((a, b) => Number(b.duration || b.minutes || 0) - Number(a.duration || a.minutes || 0))[0]
  return row?.by || row?.field || '暂无'
}

function activeDays(items = []) {
  return new Set((items || []).filter(item => Number(item.duration || 0) > 0).map(item => String(item.time || '').slice(0, 10))).size
}

export class overview extends plugin {
  constructor() {
    super({
      name: 'CodeTime',
      dsc: 'CodeTime 编程概览',
      event: 'message',
      priority: 50,
      rule: [
        { reg: '^#ct(?:编程)?([日周月年])?概览$', fnc: 'overview' }
      ]
    })
  }

  async overview(e) {
    const ctx = await getApiContext(e)
    if (!ctx) return false

    const scope = parseOverviewScope(e.msg)
    const window = getTimeWindow(scope)

    try {
      const [timeStats, languageStats, workspaceStats, distribution, segments] = await Promise.all([
        getStatsTime(ctx, window),
        getStats(ctx, 'language', window),
        getStats(ctx, 'workspace', window),
        getDistribution(ctx, window),
        getDistributionSegments(ctx, window)
      ])

      const timeList = timeStats?.data || []
      const languageList = languageStats?.data || []
      const workspaceList = workspaceStats?.data || []
      const distributionList = distribution?.data || []

      if (
        timeList.length === 0 &&
        languageList.length === 0 &&
        workspaceList.length === 0 &&
        distributionList.length === 0
      ) {
        return e.reply(`暂无${scope}概览数据`, true)
      }

      const total = sumMinutes(timeList)
      const days = activeDays(timeList)
      const sections = []
      if (timeList.length > 0) {
        sections.push({
          title: '编程趋势',
          type: 'trend-chart',
          meta: '按日 · 7 天窗口',
          items: timeList.map(item => ({
            label: String(item.time || '').slice(0, 10),
            value: Number(item.duration || 0)
          }))
        })
      }
      if (languageList.length > 0) {
        sections.push({ title: TOP_LABELS.language, meta: '按时长', items: topRows(languageList) })
        sections.push({ title: '语言趋势', type: 'category-heatmap', meta: '语言 · 热力', items: languageList })
      }
      if (workspaceList.length > 0) {
        sections.push({ title: TOP_LABELS.project, meta: '按时长', items: topRows(workspaceList) })
        sections.push({ title: '项目趋势', type: 'category-heatmap', meta: '项目 · 热力', items: workspaceList })
      }
      if (distributionList.length > 0) {
        sections.push({
          title: '活跃时间分布',
          type: 'time-distribution',
          meta: '汇总 · 分段对比',
          summaryPoints: distributionList,
          segments
        })
      }

      const view = {
        type: 'overview',
        title: `CodeTime ${scope}概览`,
        user: await buildHeroUser(ctx.account, `${window.startDate} ~ ${window.endDate}`),
        metrics: [
          { label: '总时长', value: formatMinutes(total), sub: `${days} 个活跃日` },
          { label: '日均', value: formatMinutes(total / Math.max(1, window.days)), sub: '按窗口天数' },
          { label: '活跃日均', value: formatMinutes(total / Math.max(1, days)), sub: '仅统计有记录日期' },
          { label: TOP_LABELS.topLanguage, value: topName(languageList) },
          { label: TOP_LABELS.topProject, value: topName(workspaceList) },
          { label: '时间点', value: `${distributionList.length}`, sub: '活跃分布采样' },
          { label: '语言记录', value: `${languageList.length}` },
          { label: '项目记录', value: `${workspaceList.length}` }
        ],
        sections
      }

      const img = await renderCodeTimeCard('overview', { view })
      if (img) return e.reply(img)

      return e.reply([
        `CodeTime ${scope}概览`,
        `账号：${ctx.account.username || '未知'}`,
        `范围：${window.startDate} ~ ${window.endDate}`,
        `总时长：${formatMinutes(total)}`,
        `${TOP_LABELS.topLanguage}：${topName(languageList)}`,
        `${TOP_LABELS.topProject}：${topName(workspaceList)}`
      ].join('\n'), true)
    } catch (err) {
      return replyError(e, err)
    }
  }
}
