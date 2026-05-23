import puppeteer from '../../../lib/puppeteer/puppeteer.js'
import { formatNumber, getDefaultTimezone } from './codetimeApi.js'

export async function renderCodeTimeCard(name, data = {}) {
  const page = buildRenderPage({ type: name, ...(data.view || {}) })

  return puppeteer.screenshot(`CodeTime-plugin/${name}`, {
    tplFile: `${process.cwd()}/plugins/CodeTime-plugin/resources/template/card.html`,
    ResPath: `${process.cwd().replace(/\\/g, '/')}/plugins/CodeTime-plugin/resources/`,
    saveId: data.saveId || name,
    ...data,
    ...page
  })
}

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function renderBadges(items = []) {
  return (items || [])
    .filter((item) => item !== undefined && item !== null && item !== '')
    .map((item) => `<span class="badge">${escapeHtml(item)}</span>`)
    .join('')
}

function renderMetrics(items = []) {
  return (items || [])
    .map((item) => `
      <div class="metric">
        <div class="metric-label">${escapeHtml(item.label)}</div>
        <div class="metric-value">${escapeHtml(item.value)}</div>
      </div>
    `)
    .join('')
}

function formatChartLabel(hour, minute = 0) {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

function normalizeChartPoints(points = []) {
  const map = new Map()
  for (const item of points || []) {
    const hour = Math.max(0, Math.min(23, Number(item.hour || 0)))
    map.set(hour, (map.get(hour) || 0) + Number(item.count || 0))
  }

  return Array.from({ length: 24 }, (_, hour) => ({
    hour,
    minute: 0,
    count: map.get(hour) || 0
  }))
}

function renderTimeDistribution(section = {}) {
  const points = normalizeChartPoints(section.points || section.items)
  if (points.length === 0) return ''
  const max = Math.max(1, ...points.map((item) => item.count))
  const width = 760
  const height = 220
  const left = 28
  const right = 22
  const top = 28
  const bottom = 34
  const graphWidth = width - left - right
  const graphHeight = height - top - bottom
  const baseY = top + graphHeight
  const coords = points.map((item) => {
    const x = left + (graphWidth * item.hour) / 23
    const y = baseY - (graphHeight * item.count) / max
    return { ...item, x, y }
  })
  const peak = coords.reduce((prev, item) => item.count > prev.count ? item : prev, coords[0])
  const chartCoords = [
    { x: left, y: baseY },
    ...coords,
    { x: left + graphWidth, y: baseY }
  ]
  const linePoints = chartCoords.map((item) => `${item.x.toFixed(1)},${item.y.toFixed(1)}`).join(' ')
  const areaPoints = `${linePoints}`
  const labels = [0, 3, 6, 10, 13, 16, 20, 23]
  const peakLabel = formatChartLabel(peak.hour, peak.minute)

  return `
    <div class="section chart-section">
      <div class="chart-head">
        <div class="chart-title">${escapeHtml(section.title || '编程时间分布')}</div>
      </div>
      <svg class="distribution-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHtml(section.title || '编程时间分布')}">
        ${[0.25, 0.5, 0.75, 1].map((ratio) => {
          const y = baseY - graphHeight * ratio
          return `<line class="chart-grid-line" x1="${left}" y1="${y.toFixed(1)}" x2="${left + graphWidth}" y2="${y.toFixed(1)}" />`
        }).join('')}
        <polygon class="chart-area" points="${areaPoints}" />
        <polyline class="chart-line" points="${linePoints}" />
        ${peak.count > 0 ? `
          <line class="chart-peak-line" x1="${peak.x.toFixed(1)}" y1="${top}" x2="${peak.x.toFixed(1)}" y2="${baseY}" />
          <text class="chart-peak-label" x="${(peak.x + 8).toFixed(1)}" y="${(top + 10).toFixed(1)}">${peakLabel}</text>
        ` : ''}
        ${labels.map((hour) => {
          const x = left + (graphWidth * hour) / 23
          return `<text class="chart-axis-label" x="${x.toFixed(1)}" y="${height - 8}">${formatChartLabel(hour, 0)}</text>`
        }).join('')}
      </svg>
    </div>
  `
}

function renderSessionTable(items = []) {
  const rows = (items || [])
    .map((item) => `
      <tr>
        <td><strong>${escapeHtml(item.source || '')}</strong></td>
        <td><strong>${escapeHtml(item.project || '')}</strong></td>
        <td>${escapeHtml(item.startedAt || '')}</td>
        <td><strong>${escapeHtml(item.duration || '')}</strong></td>
        <td>${escapeHtml(item.turns || '')}</td>
        <td>${escapeHtml(item.tools || '')}</td>
        <td>${escapeHtml(item.inputTokens || '')}</td>
        <td>${escapeHtml(item.outputTokens || '')}</td>
        <td class="delta minus">-${escapeHtml(item.linesRemoved || '0')}</td>
        <td class="delta plus">+${escapeHtml(item.linesAdded || '0')}</td>
      </tr>
    `)
    .join('')

  if (!rows) return ''

  return `
    <div class="section">
      <div class="section-title">
        <span>会话 · 列表</span>
        <span class="section-meta">已加载 ${escapeHtml(items.length)} 条</span>
      </div>
      <div class="table-wrap">
        <table class="data-table session-table">
          <thead>
            <tr>
              <th>来源</th>
              <th>项目</th>
              <th>开始时间</th>
              <th>时长</th>
              <th>回合</th>
              <th>工具</th>
              <th>输入 tok</th>
              <th>输出 tok</th>
              <th>行数 -</th>
              <th>行数 +</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>
  `
}

function renderGenericTable(section = {}) {
  const columns = Array.isArray(section.columns) ? section.columns : []
  const items = Array.isArray(section.items) ? section.items : []
  if (columns.length === 0 || items.length === 0) return ''

  const colgroup = columns
    .map((column) => `<col${column.width ? ` style="width:${escapeHtml(column.width)}"` : ''}>`)
    .join('')
  const header = columns.map((column) => `<th class="${escapeHtml(column.align || '')}">${escapeHtml(column.label || column.key || '')}</th>`).join('')
  const rows = items.map((item) => `
    <tr>
      ${columns.map((column) => `
        <td class="${escapeHtml(column.align || '')} ${escapeHtml(column.className || '')}">${escapeHtml(item[column.key] ?? '')}</td>
      `).join('')}
    </tr>
  `).join('')

  return `
    <div class="section">
      <div class="section-title">
        <span>${escapeHtml(section.title || '')}</span>
        ${section.meta ? `<span class="section-meta">${escapeHtml(section.meta)}</span>` : ''}
      </div>
      <div class="table-wrap">
        <table class="data-table generic-table">
          <colgroup>${colgroup}</colgroup>
          <thead><tr>${header}</tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>
  `
}

function renderLeaderboard(section = {}) {
  const items = Array.isArray(section.items) ? section.items : []
  if (items.length === 0) return ''
  const max = Math.max(1, ...items.map((item) => Number(item.minutes || 0)))

  const rows = items.map((item) => {
    const rank = Number(item.rank || 0)
    const rankClass = rank > 0 && rank <= 3 ? `rank-${rank}` : 'rank-normal'
    const selfClass = item.isSelf ? ' is-self' : ''
    const percent = Math.max(4, Math.min(100, (Number(item.minutes || 0) / max) * 100))
    const initial = String(item.initial || item.name || '?').trim().slice(0, 1).toUpperCase() || '?'
    const avatar = item.avatar
      ? `<img class="leaderboard-avatar-img" src="${escapeHtml(item.avatar)}" alt="" loading="eager" referrerpolicy="no-referrer" onerror="this.remove()" />`
      : ''

    return `
      <div class="leaderboard-row${selfClass}">
        <div class="leaderboard-rank ${rankClass}">#${escapeHtml(item.rank || '-')}</div>
        <div class="leaderboard-avatar">
          <div class="leaderboard-avatar-fallback">${escapeHtml(initial)}</div>
          ${avatar}
        </div>
        <div class="leaderboard-user">
          <div class="leaderboard-name">${escapeHtml(item.name || '未知用户')}</div>
          <div class="leaderboard-sub">${escapeHtml(item.sub || '')}</div>
          <div class="leaderboard-track">
            <div class="leaderboard-fill" style="width:${percent.toFixed(1)}%"></div>
          </div>
        </div>
        <div class="leaderboard-time">
          <strong>${escapeHtml(item.duration || '')}</strong>
          <span>${escapeHtml(item.minutesText || '')}</span>
        </div>
      </div>
    `
  }).join('')

  const self = section.self || null
  const selfBlock = self ? (() => {
    const initial = String(self.initial || self.name || '?').trim().slice(0, 1).toUpperCase() || '?'
    const avatar = self.avatar
      ? `<img class="leaderboard-avatar-img" src="${escapeHtml(self.avatar)}" alt="" loading="eager" referrerpolicy="no-referrer" onerror="this.remove()" />`
      : ''
    return `
      <div class="leaderboard-self">
        <div class="leaderboard-self-label">我的排名</div>
        <div class="leaderboard-self-row">
          <div class="leaderboard-avatar">
            <div class="leaderboard-avatar-fallback">${escapeHtml(initial)}</div>
            ${avatar}
          </div>
          <div class="leaderboard-self-user">
            <div class="leaderboard-name">${escapeHtml(self.name || '当前用户')}</div>
            <div class="leaderboard-self-sub">
              <span>${escapeHtml(self.percentile || '')}</span>
              ${self.minutesText ? `<span>${escapeHtml(self.minutesText)}</span>` : ''}
              ${self.days ? `<span>${escapeHtml(self.days)}</span>` : ''}
            </div>
          </div>
          <div class="leaderboard-time">
            <strong>${escapeHtml(self.duration || '')}</strong>
            <span>${escapeHtml(self.minutesText || '')}</span>
          </div>
        </div>
      </div>
    `
  })() : ''

  return `
    <div class="section">
      <div class="section-title">
        <span>${escapeHtml(section.title || '排行榜')}</span>
        ${section.meta ? `<span class="section-meta">${escapeHtml(section.meta)}</span>` : ''}
      </div>
      <div class="leaderboard-list">${rows}</div>
      ${selfBlock}
    </div>
  `
}

function renderBarChart(section = {}) {
  const items = Array.isArray(section.items) ? section.items : []
  if (items.length === 0) return ''
  const max = Math.max(1, ...items.map((item) => Number(item.value || 0)))
  const width = 760
  const height = 280
  const left = 48
  const right = 18
  const top = 20
  const bottom = 46
  const graphWidth = width - left - right
  const graphHeight = height - top - bottom
  const step = graphWidth / items.length
  const barWidth = Math.max(4, Math.min(28, step * 0.72))
  const tickCount = 5
  const formatY = (value) => {
    if (section.format === 'usd') return `$${Number(value || 0).toFixed(2)}`
    if (section.format === 'token') return formatTokenValue(value)
    return formatNumber(value)
  }
  const tickValues = Array.from({ length: tickCount + 1 }, (_, index) => max * (index / tickCount))
  const labelStep = items.length > 12 ? Math.ceil(items.length / 8) : 1

  return `
    <div class="section chart-section">
      <div class="section-title">
        <span>${escapeHtml(section.title || '')}</span>
        ${section.meta ? `<span class="section-meta">${escapeHtml(section.meta)}</span>` : ''}
      </div>
      <svg class="column-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHtml(section.title || '')}">
        <text class="column-unit" x="10" y="14">${escapeHtml(section.yLabel || '')}</text>
        ${tickValues.map((value) => {
          const y = top + graphHeight - (graphHeight * value) / max
          return `
            <line class="column-grid-line" x1="${left}" y1="${y.toFixed(1)}" x2="${left + graphWidth}" y2="${y.toFixed(1)}" />
            <text class="column-y-label" x="${left - 8}" y="${(y + 4).toFixed(1)}">${escapeHtml(formatY(value))}</text>
          `
        }).join('')}
        ${items.map((item, index) => {
          const value = Math.max(0, Number(item.value || 0))
          const barHeight = max === 0 ? 0 : (value / max) * graphHeight
          const x = left + index * step + (step - barWidth) / 2
          const y = top + graphHeight - barHeight
          const label = item.label || ''
          return `
            <rect class="column-bar" x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barWidth.toFixed(1)}" height="${Math.max(0, barHeight).toFixed(1)}" rx="2" />
            ${value > 0 ? `<text class="column-bar-value" x="${(x + barWidth / 2).toFixed(1)}" y="${(y - 6).toFixed(1)}">${escapeHtml(item.valueText ?? formatY(value))}</text>` : ''}
            ${index % labelStep === 0 || index === items.length - 1 ? `<text class="column-x-label" x="${(x + barWidth / 2).toFixed(1)}" y="${height - 10}">${escapeHtml(label)}</text>` : ''}
          `
        }).join('')}
      </svg>
    </div>
  `
}

function compactAxisValue(value = 0, unit = '') {
  const num = Number(value || 0)
  const abs = Math.abs(num)
  if (unit === 'usd') return `$${trimDecimals(num.toFixed(abs >= 10 ? 0 : 2))}`
  if (abs >= 1e9) return `${trimDecimals((num / 1e9).toFixed(1))}B`
  if (abs >= 1e6) return `${trimDecimals((num / 1e6).toFixed(1))}M`
  if (abs >= 1e3) return `${trimDecimals((num / 1e3).toFixed(1))}K`
  return formatNumber(num)
}

function renderColumnChart(section = {}) {
  const items = Array.isArray(section.items) ? section.items : []
  if (items.length === 0) return ''

  const width = 760
  const height = 260
  const left = 48
  const right = 20
  const top = 24
  const bottom = 44
  const graphWidth = width - left - right
  const graphHeight = height - top - bottom
  const baseY = top + graphHeight
  const max = Math.max(1, ...items.map((item) => Number(item.value || 0)))
  const slotWidth = graphWidth / items.length
  const barWidth = Math.max(4, Math.min(28, slotWidth * 0.58))
  const labelStep = Math.max(1, Math.ceil(items.length / 8))
  const ticks = [0, 0.25, 0.5, 0.75, 1]

  return `
    <div class="section chart-section">
      <div class="chart-head">
        <div class="chart-title">${escapeHtml(section.title || '')}</div>
        ${section.meta ? `<div class="section-meta">${escapeHtml(section.meta)}</div>` : ''}
      </div>
      <svg class="column-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHtml(section.title || '')}">
        ${ticks.map((ratio) => {
          const y = baseY - graphHeight * ratio
          const value = max * ratio
          return `
            <line class="chart-grid-line" x1="${left}" y1="${y.toFixed(1)}" x2="${left + graphWidth}" y2="${y.toFixed(1)}" />
            <text class="chart-axis-y" x="${left - 8}" y="${(y + 4).toFixed(1)}">${compactAxisValue(value, section.unit)}</text>
          `
        }).join('')}
        ${items.map((item, index) => {
          const value = Math.max(0, Number(item.value || 0))
          const barHeight = value <= 0 ? 0 : Math.max(2, (value / max) * graphHeight)
          const x = left + slotWidth * index + (slotWidth - barWidth) / 2
          const y = baseY - barHeight
          return `<rect class="column-bar" x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barWidth.toFixed(1)}" height="${barHeight.toFixed(1)}"><title>${escapeHtml(item.label || '')} ${escapeHtml(item.valueText ?? value)}</title></rect>`
        }).join('')}
        <line class="chart-axis-line" x1="${left}" y1="${baseY}" x2="${left + graphWidth}" y2="${baseY}" />
        ${items.map((item, index) => {
          if (index % labelStep !== 0 && index !== items.length - 1) return ''
          const x = left + slotWidth * index + slotWidth / 2
          return `<text class="chart-axis-label" x="${x.toFixed(1)}" y="${height - 12}">${escapeHtml(item.label || '')}</text>`
        }).join('')}
      </svg>
    </div>
  `
}

function renderHeatmap(section = {}) {
  const items = Array.isArray(section.items) ? section.items : []
  if (items.length === 0) return ''
  const max = Math.max(1, ...items.map((item) => Number(item.value || 0)))
  const weekdays = [
    { index: 1, label: '一' },
    { index: 2, label: '二' },
    { index: 3, label: '三' },
    { index: 4, label: '四' },
    { index: 5, label: '五' },
    { index: 6, label: '六' },
    { index: 0, label: '日' }
  ]
  const itemMap = new Map(items.map((item) => [`${item.weekday}:${item.hour}`, item]))

  return `
    <div class="section">
      <div class="section-title">
        <span>${escapeHtml(section.title || '')}</span>
        ${section.meta ? `<span class="section-meta">${escapeHtml(section.meta)}</span>` : ''}
      </div>
      <div class="heatmap">
        <div class="heatmap-corner"></div>
        ${Array.from({ length: 24 }, (_, hour) => `<div class="heatmap-hour">${hour}</div>`).join('')}
        ${weekdays.map(({ index, label }) => `
          <div class="heatmap-day">${label}</div>
          ${Array.from({ length: 24 }, (_, hour) => {
            const item = itemMap.get(`${index}:${hour}`)
            const value = Number(item?.value || 0)
            const level = value <= 0 ? 0 : Math.max(1, Math.ceil((value / max) * 5))
            return `<div class="heatmap-cell heatmap-l${level}" title="${escapeHtml(label)} ${hour}:00 ${value}"></div>`
          }).join('')}
        `).join('')}
      </div>
    </div>
  `
}

function renderSection(section = {}) {
  if (section.type === 'time-distribution') return renderTimeDistribution(section)
  if (section.type === 'session-table') return renderSessionTable(section.items || [])
  if (section.type === 'table') return renderGenericTable(section)
  if (section.type === 'leaderboard') return renderLeaderboard(section)
  if (section.type === 'bar-chart') return renderBarChart(section)
  if (section.type === 'column-chart') return renderColumnChart(section)
  if (section.type === 'heatmap') return renderHeatmap(section)

  const title = `<div class="section-title">${escapeHtml(section.title)}</div>`

  if (section.type === 'chips') {
    const chips = (section.items || [])
      .map((item) => `<span class="chip">${escapeHtml(item)}</span>`)
      .join('')
    return `<div class="section">${title}<div class="chips">${chips}</div></div>`
  }

  const rows = (section.items || [])
    .map((item) => `
      <div class="list-item">
        <div class="list-left">
          <div class="list-name">${escapeHtml(item.name || item.command || '')}</div>
          ${item.sub || item.desc ? `<div class="list-sub">${escapeHtml(item.sub || item.desc)}</div>` : ''}
        </div>
        ${item.value ? `<div class="list-value">${escapeHtml(item.value)}</div>` : ''}
      </div>
    `)
    .join('')

  return `<div class="section">${title}<div class="list">${rows}</div></div>`
}

function renderSections(items = []) {
  return (items || []).map((section) => renderSection(section)).join('')
}

function renderSessionCards(items = []) {
  return renderSessionTable(items)
}

function buildRenderPage(view = {}) {
  const defaultTitle = {
    help: 'CodeTime 帮助',
    today: 'CodeTime 今日',
    agent: 'CodeTime AI 统计',
    sessions: 'CodeTime AI 记录',
    distribution: 'CodeTime 时间分布',
    rank: 'CodeTime 排行榜'
  }
  const defaultSubtitle = {
    help: '绑定账号后可查询编程统计、多维统计、日志和 AI Agent 使用记录。',
    today: '今日数据总览',
    agent: '按日、周、月、年查看 AI 统计',
    sessions: '最新 AI 会话记录',
    distribution: '按小时查看编程活跃分布',
    rank: '公开编程时长榜单'
  }
  const title = view.title || defaultTitle[view.type] || ''
  const metricsHtml = renderMetrics(view.metrics)

  return {
    pageTitle: title,
    title,
    subtitle: view.subtitle || defaultSubtitle[view.type] || '',
    badgesHtml: renderBadges(view.badges),
    metricsBlockHtml: metricsHtml ? `<div class="grid">${metricsHtml}</div>` : '',
    sectionsHtml: renderSections(view.sections),
    sessionsHtml: renderSessionCards(view.sessions)
  }
}

function trimDecimals(text) {
  return String(text).replace(/\.0+$/, '').replace(/(\.\d*[1-9])0+$/, '$1')
}

export function formatDurationMs(ms = 0) {
  const totalMinutes = Math.max(0, Math.round(Number(ms || 0) / 60000))
  const days = Math.floor(totalMinutes / 1440)
  const hours = Math.floor((totalMinutes % 1440) / 60)
  const minutes = totalMinutes % 60
  const parts = []
  if (days > 0) parts.push(`${days}天`)
  if (hours > 0) parts.push(`${hours}小时`)
  if (minutes > 0 || parts.length === 0) parts.push(`${minutes}分钟`)
  return parts.join('')
}

export function formatUsd(value = 0, digits = 2) {
  const num = Number(value || 0)
  return `$${num.toFixed(digits)}`
}

export function formatTokenValue(value = 0) {
  const num = Number(value || 0)
  const abs = Math.abs(num)
  let scaled = num
  let unit = ''

  if (abs >= 1e9) {
    scaled = num / 1e9
    unit = 'B'
  } else if (abs >= 1e6) {
    scaled = num / 1e6
    unit = 'M'
  } else if (abs >= 1e3) {
    scaled = num / 1e3
    unit = 'K'
  }

  if (!unit) return formatNumber(num)
  return `${trimDecimals(scaled.toFixed(abs >= 100 ? 0 : abs >= 10 ? 1 : 2))}${unit}(${formatNumber(num)})`
}

export function formatDateTime(value) {
  if (!value) return '未知'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleString('zh-CN', {
    timeZone: getDefaultTimezone(),
    hour12: false
  })
}

export function formatDateOnly(value) {
  if (!value) return '未知'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10)
  return date.toLocaleDateString('sv-SE', {
    timeZone: getDefaultTimezone()
  })
}

export function sumEstimatedCost(data = {}) {
  const summaryCost = Number(data.summary?.estimatedCostUsd)
  if (!Number.isNaN(summaryCost) && summaryCost > 0) return summaryCost

  return (data.tokenBuckets || []).reduce((sum, item) => sum + Number(item.estimatedCostUsd || 0), 0)
}

export function getModelTokenCount(item = {}) {
  const direct = Number(item.totalTokens)
  if (!Number.isNaN(direct) && direct > 0) return direct

  return [item.inputTokens, item.outputTokens, item.reasoningOutputTokens]
    .reduce((sum, value) => sum + Number(value || 0), 0)
}

export function pickNumber(item = {}, keys = []) {
  for (const key of keys) {
    const value = Number(item[key])
    if (!Number.isNaN(value) && value > 0) return value
  }
  return 0
}
