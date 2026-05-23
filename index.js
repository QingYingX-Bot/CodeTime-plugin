import fs from 'node:fs'
import path from 'node:path'

const appDir = './plugins/CodeTime-plugin/apps'

function readAppFiles(dir = appDir, prefix = '') {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name
    const fullPath = path.join(dir, entry.name)

    if (entry.isDirectory()) {
      files.push(...readAppFiles(fullPath, relative))
      continue
    }

    if (entry.isFile() && entry.name.endsWith('.js')) {
      files.push(relative)
    }
  }

  return files.sort()
}

const files = readAppFiles()

logger.info('CodeTime-plugin 载入成功')

const loaded = await Promise.allSettled(files.map((file) => import(`./apps/${file}`)))
const apps = {}

for (const i in files) {
  const name = path.basename(files[i], '.js')
  if (loaded[i].status !== 'fulfilled') {
    logger.error(`CodeTime-plugin 载入失败：${logger.red(name)}`)
    logger.error(loaded[i].reason)
    continue
  }
  apps[name] = loaded[i].value[Object.keys(loaded[i].value)[0]]
}

export { apps }
