import fs from 'node:fs'
import { formatNumber, formatTokenValue, getDefaultTimezone } from './codetimeApi.js'

export { formatTokenValue } from './codetimeApi.js'
import {
  buildListAccentBackground,
  getLanguageIconUrl,
  isLanguageSection,
  normalizeListName,
  resolveLanguageProfile,
  THEME_COLOR
} from './codetimeLanguages.js'
import { formatDistributionMeta, formatSectionMeta, VIBE_LABELS } from './codetimeLabels.js'

function sanitizeSaveIdSegment(value = '') {
  return String(value)
    .replace(/[\\/:*?"<>|]/g, '_')
    .replace(/\.\./g, '_')
}

function resolveSaveId(name, data = {}) {
  if (data.saveId) return sanitizeSaveIdSegment(data.saveId)

  const parts = [name]
  const accountId = data.accountId ?? data.view?.user?.accountId
  if (accountId !== undefined && accountId !== null && accountId !== '') {
    parts.push(String(accountId))
  }
  if (data.scope) parts.push(String(data.scope))
  if (data.saveSuffix) parts.push(String(data.saveSuffix))

  if (parts.length === 1 && name === 'help') return name

  if (parts.length === 1) {
    return `${sanitizeSaveIdSegment(name)}-${Date.now()}`
  }

  return parts.map(sanitizeSaveIdSegment).join('-')
}

export async function renderCodeTimeCard(name, data = {}) {
  const { default: puppeteer } = await import('../../../lib/puppeteer/puppeteer.js')
  const resPath = `${process.cwd().replace(/\\/g, '/')}/plugins/CodeTime-plugin/resources/`
  const page = buildRenderPage({ type: name, resPath, ...(data.view || {}) })
  const renderName = `CodeTime-plugin/${name}`
  const saveId = resolveSaveId(name, data)
  const tplPath = `${process.cwd()}/plugins/CodeTime-plugin/resources/template/card.html`
  const template = fs.readFileSync(tplPath, 'utf8')
  const htmlDir = `${process.cwd()}/temp/html/${renderName}/${saveId}`
  const htmlFile = `${htmlDir}/render.html`

  fs.mkdirSync(htmlDir, { recursive: true })
  fs.writeFileSync(htmlFile, applyTemplate(template, {
    ResPath: resPath,
    ...page
  }), 'utf8')

  return puppeteer.screenshot(renderName, {
    tplFile: htmlFile,
    ResPath: resPath,
    ...data,
    ...page,
    saveId
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

export function applyTemplate(template, data = {}) {
  let html = template
  for (const [key, value] of Object.entries(data)) {
    const raw = String(value ?? '')
    html = html.replaceAll(`{{@ ${key}}}`, raw)
    html = html.replaceAll(`{{@${key}}}`, raw)
    html = html.replaceAll(`{{${key}}}`, escapeHtml(raw))
  }
  return html
}

function renderSectionTitle(title = '', meta = '') {
  const metaText = formatSectionMeta(meta)
  const metaHtml = metaText
    ? `<span class="section-meta">${escapeHtml(metaText)}</span>`
    : ''
  return `<div class="section-title">${escapeHtml(title)}${metaHtml}</div>`
}

function renderChartHead(title = '', meta = '') {
  const metaText = formatSectionMeta(meta)
  const metaHtml = metaText
    ? `<span class="section-meta">${escapeHtml(metaText)}</span>`
    : ''
  return `<div class="chart-head"><div class="chart-title">${escapeHtml(title)}</div>${metaHtml}</div>`
}

function buildHeroUserFields(user = null) {
  if (!user || (!user.name && !user.meta)) {
    return {
      heroAsideClass: ' is-hidden',
      heroUserInitial: '',
      heroUserAvatarHtml: '',
      heroUserName: ''
    }
  }

  const initial = String(user.name || '?').trim().slice(0, 1).toUpperCase() || '?'
  return {
    heroAsideClass: '',
    heroUserInitial: initial,
    heroUserAvatarHtml: user.avatar
      ? `<img class="hero-avatar-img" src="${escapeHtml(user.avatar)}" alt="" loading="eager" referrerpolicy="no-referrer" onerror="this.remove()" />`
      : '',
    heroUserName: String(user.name || '')
  }
}

function renderMetrics(items = []) {
  return (items || [])
    .map((item) => `
      <div class="metric">
        <div class="metric-label">${escapeHtml(item.label)}</div>
        <div class="metric-value">${escapeHtml(item.value)}</div>
        ${item.sub || item.meta ? `<div class="metric-sub">${escapeHtml(item.sub || item.meta)}</div>` : ''}
      </div>
    `)
    .join('')
}

function formatChartLabel(hour, minute = 0) {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

function normalizeHourlyPoints(points = []) {
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

function normalizeDistributionSeries(points = [], interval = 10) {
  const minuteMap = new Map()
  for (const item of points || []) {
    const hour = Math.max(0, Math.min(23, Number(item.hour || 0)))
    const minute = Math.max(0, Math.min(59, Number(item.minute || 0)))
    const key = hour * 60 + minute
    minuteMap.set(key, (minuteMap.get(key) || 0) + Number(item.count || 0))
  }

  if (minuteMap.size === 0) {
    return []
  }

  const filled = Array.from({ length: 1440 }, (_, time) => ({
    time,
    count: minuteMap.get(time) || 0
  }))
  const aggregated = []
  for (let i = 0; i < filled.length; i += interval) {
    const chunk = filled.slice(i, i + interval)
    const count = Math.max(0, ...chunk.map(item => item.count))
    aggregated.push({ time: i, count })
  }
  const max = Math.max(1, ...aggregated.map(item => item.count))
  return aggregated.map(item => ({
    ...item,
    ratio: item.count / max
  }))
}

function smoothSeriesRatios(series = [], windowSize = 5) {
  if (series.length <= 2) return series
  const half = Math.floor(windowSize / 2)
  return series.map((item, index) => {
    const start = Math.max(0, index - half)
    const end = Math.min(series.length - 1, index + half)
    const slice = series.slice(start, end + 1)
    const avgRatio = slice.reduce((sum, row) => sum + Number(row.ratio || 0), 0) / slice.length
    return { ...item, ratio: avgRatio }
  })
}

function buildSmoothLinePath(points = []) {
  if (points.length === 0) return ''
  if (points.length === 1) {
    const point = points[0]
    return `M ${point.x.toFixed(1)} ${point.y.toFixed(1)}`
  }

  let path = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`
  for (let index = 0; index < points.length - 1; index++) {
    const p0 = points[Math.max(0, index - 1)]
    const p1 = points[index]
    const p2 = points[index + 1]
    const p3 = points[Math.min(points.length - 1, index + 2)]
    const cp1x = p1.x + (p2.x - p0.x) / 6
    const cp1y = p1.y + (p2.y - p0.y) / 6
    const cp2x = p2.x - (p3.x - p1.x) / 6
    const cp2y = p2.y - (p3.y - p1.y) / 6
    path += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`
  }
  return path
}

function buildSmoothAreaPath(points = [], baseY = 0) {
  if (points.length === 0) return ''
  const linePath = buildSmoothLinePath(points)
  const last = points[points.length - 1]
  const first = points[0]
  return `${linePath} L ${last.x.toFixed(1)} ${baseY.toFixed(1)} L ${first.x.toFixed(1)} ${baseY.toFixed(1)} Z`
}

function renderDistributionLine(series = [], {
  left,
  graphWidth,
  top,
  graphHeight,
  baseY,
  className = 'chart-line',
  opacity = 1,
  area = false
} = {}) {
  if (series.length === 0) return ''
  const smoothed = smoothSeriesRatios(series, Math.min(7, Math.max(3, Math.floor(series.length / 12))))
  const coords = smoothed.map((item) => {
    const x = left + (graphWidth * item.time) / 1439
    const y = baseY - graphHeight * Math.max(0, Math.min(1, Number(item.ratio || 0)))
    return { ...item, x, y }
  })
  const linePath = buildSmoothLinePath(coords)
  const areaPath = buildSmoothAreaPath(coords, baseY)
  return `
    ${area ? `<path class="chart-area" d="${areaPath}" />` : ''}
    <path class="${className}" style="opacity:${Number(opacity).toFixed(2)}" d="${linePath}" />
  `
}

function renderTimeDistribution(section = {}) {
  const interval = Math.max(1, Number(section.interval || 10))
  const summary = normalizeDistributionSeries(section.summaryPoints || section.points || section.items, interval)
  const segments = (section.segments || [])
    .map((segment, index) => ({
      ...segment,
      series: normalizeDistributionSeries(segment.points || segment.items || segment.data, interval),
      opacity: segment.opacity ?? Math.max(0.28, 0.72 - index * 0.12)
    }))
    .filter(segment => segment.series.length > 0)

  if (summary.length === 0 && segments.length === 0) {
    const hourly = normalizeHourlyPoints(section.points || section.items)
    if (hourly.every(item => item.count <= 0)) return ''
  }

  const width = 760
  const height = 220
  const left = 32
  const right = 22
  const top = 28
  const bottom = 34
  const graphWidth = width - left - right
  const graphHeight = height - top - bottom
  const baseY = top + graphHeight
  const mainSeries = summary.length > 0 ? summary : segments[0]?.series || []
  const peak = mainSeries.reduce((prev, item) => item.count > prev.count ? item : prev, mainSeries[0] || { time: 0, count: 0, ratio: 0 })
  const labels = [0, 360, 720, 1080, 1439]
  const peakHour = Math.floor(Number(peak.time || 0) / 60)
  const peakMinute = Number(peak.time || 0) % 60
  const peakX = left + (graphWidth * Number(peak.time || 0)) / 1439
  const peakLabel = formatChartLabel(peakHour, peakMinute)

  return `
    <div class="section chart-section">
      ${renderChartHead(section.title || '编程时间分布', section.meta || formatDistributionMeta(interval))}
      <svg class="distribution-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHtml(section.title || '编程时间分布')}">
        ${[0.25, 0.5, 0.75, 1].map((ratio) => {
          const y = baseY - graphHeight * ratio
          return `<line class="chart-grid-line" x1="${left}" y1="${y.toFixed(1)}" x2="${left + graphWidth}" y2="${y.toFixed(1)}" />`
        }).join('')}
        ${segments.map(segment => renderDistributionLine(segment.series, {
          left,
          graphWidth,
          top,
          graphHeight,
          baseY,
          className: 'chart-line chart-line-muted',
          opacity: segment.opacity
        })).join('')}
        ${renderDistributionLine(summary, {
          left,
          graphWidth,
          top,
          graphHeight,
          baseY,
          className: 'chart-line',
          opacity: 1,
          area: true
        })}
        ${peak.count > 0 ? `
          <line class="chart-peak-line" x1="${peakX.toFixed(1)}" y1="${top}" x2="${peakX.toFixed(1)}" y2="${baseY}" />
          <text class="chart-peak-label" x="${(peakX + 8).toFixed(1)}" y="${(top + 10).toFixed(1)}">${peakLabel}</text>
        ` : ''}
        ${labels.map((minuteOfDay) => {
          const x = left + (graphWidth * minuteOfDay) / 1439
          return `<text class="chart-axis-label" x="${x.toFixed(1)}" y="${height - 8}">${formatChartLabel(Math.floor(minuteOfDay / 60), minuteOfDay % 60)}</text>`
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
      ${renderSectionTitle('会话 · 列表', `已加载 ${items.length} 条`)}
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
      ${renderSectionTitle(section.title || '', section.meta || '')}
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
      ${renderSectionTitle(section.title || '排行榜', section.meta || '')}
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
      ${renderChartHead(section.title || '', section.meta || '')}
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
            <rect class="column-bar" x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barWidth.toFixed(1)}" height="${Math.max(0, barHeight).toFixed(1)}"  />
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
      ${renderChartHead(section.title || '', section.meta || '')}
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
          return `<rect class="column-bar" x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barWidth.toFixed(1)}" height="${barHeight.toFixed(1)}" ><title>${escapeHtml(item.label || '')} ${escapeHtml(item.valueText ?? value)}</title></rect>`
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

function movingAverage(items = [], windowSize = 7) {
  const size = Math.max(3, windowSize)
  const half = Math.floor(size / 2)
  return items.map((item, index) => {
    const start = Math.max(0, index - half)
    const end = Math.min(items.length - 1, index + half)
    const slice = items.slice(start, end + 1)
    const avg = slice.reduce((sum, row) => sum + Number(row.value || 0), 0) / Math.max(1, slice.length)
    return { ...item, value: avg }
  })
}

function renderTrendChart(section = {}) {
  const items = (section.items || [])
    .map(item => ({
      label: String(item.label || item.time || '').slice(5, 10) || String(item.label || ''),
      value: Number(item.value ?? item.duration ?? item.minutes ?? 0)
    }))
    .filter(item => item.label)

  if (items.length === 0) return ''

  const width = 760
  const height = 240
  const left = 44
  const right = 22
  const top = 24
  const bottom = 42
  const graphWidth = width - left - right
  const graphHeight = height - top - bottom
  const baseY = top + graphHeight
  const max = Math.max(1, ...items.map(item => item.value))
  const smoothWindow = Math.min(9, Math.max(3, Math.floor(items.length / 3)))
  const smooth = movingAverage(items, smoothWindow)
  const xFor = index => left + (items.length === 1 ? graphWidth / 2 : (graphWidth * index) / (items.length - 1))
  const yFor = value => baseY - (graphHeight * Math.max(0, Number(value || 0))) / max
  const smoothCoords = smooth.map((item, index) => ({
    x: xFor(index),
    y: yFor(item.value)
  }))
  const linePath = buildSmoothLinePath(smoothCoords)
  const areaPath = buildSmoothAreaPath(smoothCoords, baseY)
  const labelStep = Math.max(1, Math.ceil(items.length / 8))

  return `
    <div class="section chart-section">
      ${renderChartHead(section.title || '编程趋势', section.meta || '')}
      <svg class="trend-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHtml(section.title || '编程趋势')}">
        ${[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
          const y = baseY - graphHeight * ratio
          return `
            <line class="chart-grid-line" x1="${left}" y1="${y.toFixed(1)}" x2="${left + graphWidth}" y2="${y.toFixed(1)}" />
            <text class="chart-axis-y" x="${left - 8}" y="${(y + 4).toFixed(1)}">${compactAxisValue(max * ratio)}</text>
          `
        }).join('')}
        <path class="chart-area" d="${areaPath}" />
        <path class="chart-line" d="${linePath}" />
        ${items.map((item, index) => {
          const x = xFor(index)
          const y = yFor(item.value)
          return `<circle class="trend-dot" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${item.value > 0 ? 2.6 : 1.7}"><title>${escapeHtml(item.label)} ${escapeHtml(formatNumber(item.value))}</title></circle>`
        }).join('')}
        <line class="chart-axis-line" x1="${left}" y1="${baseY}" x2="${left + graphWidth}" y2="${baseY}" />
        ${items.map((item, index) => {
          if (index % labelStep !== 0 && index !== items.length - 1) return ''
          return `<text class="chart-axis-label" x="${xFor(index).toFixed(1)}" y="${height - 10}">${escapeHtml(item.label)}</text>`
        }).join('')}
      </svg>
    </div>
  `
}

function renderCategoryHeatmap(section = {}) {
  const raw = Array.isArray(section.items) ? section.items : []
  if (raw.length === 0) return ''

  const dateSet = new Set()
  const categoryTotals = new Map()
  for (const item of raw) {
    const date = String(item.time || item.date || '').slice(0, 10)
    const by = String(item.by || item.name || item.field || '未知')
    if (!date || !by) continue
    dateSet.add(date)
    categoryTotals.set(by, (categoryTotals.get(by) || 0) + Number(item.duration || item.minutes || item.value || 0))
  }

  const dates = [...dateSet].sort()
  const categories = [...categoryTotals.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, Number(section.limit || 8))
    .map(([name]) => name)
  if (dates.length === 0 || categories.length === 0) return ''

  const valueMap = new Map()
  for (const item of raw) {
    const date = String(item.time || item.date || '').slice(0, 10)
    const by = String(item.by || item.name || item.field || '未知')
    if (!categories.includes(by)) continue
    const key = `${date}__${by}`
    valueMap.set(key, (valueMap.get(key) || 0) + Number(item.duration || item.minutes || item.value || 0))
  }
  const max = Math.max(1, ...valueMap.values())
  const labelStep = Math.max(1, Math.ceil(dates.length / 8))

  return `
    <div class="section">
      ${renderSectionTitle(section.title || '分类趋势', section.meta || '')}
      <div class="matrix" style="--matrix-cols:${dates.length}">
        <div class="matrix-corner"></div>
        ${dates.map((date, index) => `<div class="matrix-date">${index % labelStep === 0 || index === dates.length - 1 ? escapeHtml(date.slice(5)) : ''}</div>`).join('')}
        ${categories.map(category => `
          <div class="matrix-label">${escapeHtml(category)}</div>
          ${dates.map((date) => {
            const value = valueMap.get(`${date}__${category}`) || 0
            const level = value <= 0 ? 0 : Math.max(1, Math.ceil((value / max) * 5))
            return `<div class="matrix-cell matrix-l${level}" title="${escapeHtml(category)} ${escapeHtml(date)} ${escapeHtml(formatNumber(value))}"></div>`
          }).join('')}
        `).join('')}
      </div>
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
      ${renderSectionTitle(section.title || '', section.meta || '')}
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

function renderListItem(item = {}, options = {}) {
  const { resPath = '', languageSection = false } = options
  const rawName = item.name || item.command || ''
  const displayName = languageSection ? normalizeListName(rawName) : rawName
  const profile = languageSection ? resolveLanguageProfile(rawName) : null
  const accentColor = profile?.color || THEME_COLOR
  const iconUrl = getLanguageIconUrl(resPath, profile?.icon || 'default-code.svg')
  const accentStyle = languageSection
    ? ` style="--list-accent: ${accentColor}; background: ${buildListAccentBackground(accentColor)};"`
    : ''
  const iconHtml = languageSection
    ? `<div class="list-icon" aria-hidden="true"><img src="${escapeHtml(iconUrl)}" alt="" loading="eager" /></div>`
    : ''

  return `
    <div class="list-item${languageSection ? ' list-item--accent' : ''}"${accentStyle}>
      ${iconHtml}
      <div class="list-left">
        <div class="list-name">${escapeHtml(displayName)}</div>
        ${item.sub || item.desc ? `<div class="list-sub">${escapeHtml(item.sub || item.desc)}</div>` : ''}
      </div>
      ${item.value ? `<div class="list-value">${escapeHtml(item.value)}</div>` : ''}
    </div>
  `
}

function renderSection(section = {}, resPath = '') {
  if (section.type === 'time-distribution') return renderTimeDistribution(section)
  if (section.type === 'session-table') return renderSessionTable(section.items || [])
  if (section.type === 'table') return renderGenericTable(section)
  if (section.type === 'leaderboard') return renderLeaderboard(section)
  if (section.type === 'bar-chart') return renderBarChart(section)
  if (section.type === 'column-chart') return renderColumnChart(section)
  if (section.type === 'trend-chart') return renderTrendChart(section)
  if (section.type === 'category-heatmap') return renderCategoryHeatmap(section)
  if (section.type === 'heatmap') return renderHeatmap(section)

  const title = renderSectionTitle(section.title || '', section.meta || '')

  if (section.type === 'chips') {
    const chips = (section.items || [])
      .map((item) => `<span class="chip">${escapeHtml(item)}</span>`)
      .join('')
    return `<div class="section">${title}<div class="chips">${chips}</div></div>`
  }

  const languageSection = isLanguageSection(section)
  const rows = (section.items || [])
    .map((item) => renderListItem(item, { resPath, languageSection }))
    .join('')

  return `<div class="section">${title}<div class="list">${rows}</div></div>`
}

function renderSections(items = [], resPath = '') {
  return (items || []).map((section) => renderSection(section, resPath)).join('')
}

function renderSessionCards(items = []) {
  return renderSessionTable(items)
}

export function buildRenderPage(view = {}) {
  const defaultTitle = {
    help: 'CodeTime 帮助',
    today: 'CodeTime Today',
    overview: 'CodeTime 概览',
    agent: VIBE_LABELS.statsTitle,
    sessions: VIBE_LABELS.recordsTitle,
    distribution: 'CodeTime 时间分布',
    rank: 'CodeTime 排行榜'
  }
  const defaultSubtitle = {
    help: '绑定账号后可查询编程统计、多维统计、日志和 AI 使用记录。',
    today: '今日数据总览',
    overview: '与网页概览页一致的编程趋势、语言、项目和时间分布聚合。',
    agent: VIBE_LABELS.statsSubtitle,
    sessions: VIBE_LABELS.recordsSubtitle,
    distribution: '按小时查看编程活跃分布',
    rank: '公开编程时长榜单'
  }
  const title = view.title || defaultTitle[view.type] || ''
  const metricsHtml = renderMetrics(view.metrics)
  const heroUserFields = buildHeroUserFields(view.user)
  const subtitle = heroUserFields.heroAsideClass
    ? (view.subtitle || defaultSubtitle[view.type] || '')
    : ''

  return {
    pageTitle: title,
    title,
    subtitle,
    ...heroUserFields,
    metricsBlockHtml: metricsHtml ? `<div class="grid">${metricsHtml}</div>` : '',
    sectionsHtml: renderSections(view.sections, view.resPath),
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
