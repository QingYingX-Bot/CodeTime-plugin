import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { applyTemplate, buildRenderPage } from '../model/codetimeRender.js'
import { previewViews } from './mock-data.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')
const resourcesDir = path.join(rootDir, 'resources')
const templatePath = path.join(resourcesDir, 'template', 'card.html')
const port = Number(process.env.PORT || 4173)

const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.svg': 'image/svg+xml'
}

function renderPreviewPage(type) {
  const view = previewViews[type]
  if (!view) return null

  const template = fs.readFileSync(templatePath, 'utf8')
  const page = buildRenderPage({ ...view, resPath: '/resources/' })
  return applyTemplate(template, {
    ...page,
    ResPath: '/resources/'
  })
}

function renderIndexPage() {
  const links = Object.keys(previewViews)
    .map((type) => `<li><a href="/preview/${type}">${type}</a></li>`)
    .join('\n')

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>CodeTime Template Preview</title>
  <link rel="preload" href="/resources/fonts/inter/inter-latin-wght-normal.woff2" as="font" type="font/woff2" crossorigin />
  <link rel="preload" href="/resources/fonts/inter/inter-latin-ext-wght-normal.woff2" as="font" type="font/woff2" crossorigin />
  <link rel="stylesheet" href="/resources/common/codetime.css" />
  <style>
    body { width: auto; margin: 32px; color: #1a1d24; background: #f1f2f5; }
    main { max-width: 720px; margin: 0 auto; background: #fff; border: 1px solid #d4d8e0; padding: 24px 28px; }
    h1 { margin: 0 0 8px; font-size: 24px; }
    p { color: #525a6b; margin: 0 0 20px; }
    ul { margin: 0; padding-left: 20px; line-height: 1.8; }
    a { color: #0284c7; text-decoration: none; }
    a:hover { text-decoration: underline; }
    code { background: #f3f4f6; padding: 2px 6px; border-radius: 4px; }
  </style>
</head>
<body>
  <main>
    <h1>CodeTime 模板预览</h1>
    <p>修改 <code>resources/template/card.html</code> 与 <code>resources/common/codetime.css</code> 后刷新页面即可查看效果。</p>
    <ul>${links}</ul>
  </main>
</body>
</html>`
}

function send(res, status, body, contentType = 'text/html; charset=utf-8', headers = {}) {
  res.writeHead(status, {
    'Content-Type': contentType,
    ...headers
  })
  res.end(body)
}

function serveStatic(res, filePath) {
  if (!filePath.startsWith(resourcesDir)) {
    send(res, 403, 'Forbidden')
    return
  }

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    send(res, 404, 'Not Found')
    return
  }

  const ext = path.extname(filePath).toLowerCase()
  const content = fs.readFileSync(filePath)
  const cacheable = ext === '.woff2' || ext === '.css'
  send(res, 200, content, mimeTypes[ext] || 'application/octet-stream', cacheable
    ? { 'Cache-Control': 'public, max-age=31536000, immutable' }
    : { 'Cache-Control': 'no-store' })
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`)

  if (url.pathname === '/' || url.pathname === '/index.html') {
    send(res, 200, renderIndexPage(), 'text/html; charset=utf-8', { 'Cache-Control': 'no-store' })
    return
  }

  if (url.pathname.startsWith('/preview/')) {
    const type = decodeURIComponent(url.pathname.slice('/preview/'.length))
    const html = renderPreviewPage(type)
    if (!html) {
      send(res, 404, `Unknown preview type: ${escapeHtml(type)}`, 'text/html; charset=utf-8', { 'Cache-Control': 'no-store' })
      return
    }
    send(res, 200, html, 'text/html; charset=utf-8', { 'Cache-Control': 'no-store' })
    return
  }

  if (url.pathname.startsWith('/resources/')) {
    const relative = url.pathname.slice('/resources/'.length)
    const filePath = path.resolve(resourcesDir, relative)
    serveStatic(res, filePath)
    return
  }

  send(res, 404, 'Not Found')
})

server.listen(port, () => {
  console.log(`CodeTime preview server running`)
  console.log(`  Index:   http://localhost:${port}/`)
  console.log(`  Today:   http://localhost:${port}/preview/today`)
  console.log(`  Overview:http://localhost:${port}/preview/overview`)
  console.log(`  CSS:     ${path.join(resourcesDir, 'common', 'codetime.css')}`)
  console.log(`  HTML:    ${templatePath}`)
})