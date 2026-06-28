export const THEME_COLOR = '#0284c7'

const LANGUAGE_PROFILES = [
  { id: 'typescript', color: '#3178C6', icon: 'typescript-original.svg', aliases: ['typescript', 'ts'] },
  { id: 'javascript', color: '#F7DF1E', icon: 'javascript-original.svg', aliases: ['javascript', 'js', 'jsx', 'node', 'nodejs', 'node.js'] },
  { id: 'python', color: '#3776AB', icon: 'python-original.svg', aliases: ['python', 'py'] },
  { id: 'rust', color: '#000000', icon: 'rust-plain.svg', aliases: ['rust', 'rs'] },
  { id: 'go', color: '#00ADD8', icon: 'go-original.svg', aliases: ['go', 'golang'] },
  { id: 'java', color: '#E76F00', icon: 'java-original.svg', aliases: ['java'] },
  { id: 'kotlin', color: '#7F52FF', icon: 'kotlin-original.svg', aliases: ['kotlin', 'kt'] },
  { id: 'swift', color: '#F05138', icon: 'swift-original.svg', aliases: ['swift'] },
  { id: 'csharp', color: '#512BD4', icon: 'csharp-original.svg', aliases: ['csharp', 'c#', 'cs'] },
  { id: 'cpp', color: '#00599C', icon: 'cplusplus-original.svg', aliases: ['c++', 'cpp', 'cplusplus'] },
  { id: 'c', color: '#A8B9CC', icon: 'c-original.svg', aliases: ['c'] },
  { id: 'php', color: '#777BB4', icon: 'php-original.svg', aliases: ['php'] },
  { id: 'ruby', color: '#CC342D', icon: 'ruby-original.svg', aliases: ['ruby', 'rb'] },
  { id: 'html', color: '#E34F26', icon: 'html5-original.svg', aliases: ['html', 'html5'] },
  { id: 'css', color: '#1572B6', icon: 'css3-original.svg', aliases: ['css', 'css3', 'scss', 'sass', 'less'] },
  { id: 'vue', color: '#41B883', icon: 'vuejs-original.svg', aliases: ['vue', 'vuejs', 'vue.js'] },
  { id: 'react', color: '#61DAFB', icon: 'react-original.svg', aliases: ['react', 'tsx'] },
  { id: 'angular', color: '#DD0031', icon: 'angularjs-original.svg', aliases: ['angular', 'angularjs'] },
  { id: 'svelte', color: '#FF3E00', icon: 'devicon-svelte.svg', aliases: ['svelte'] },
  { id: 'dart', color: '#0175C2', icon: 'dart-original.svg', aliases: ['dart'] },
  { id: 'flutter', color: '#54C5F8', icon: 'flutter-original.svg', aliases: ['flutter'] },
  { id: 'docker', color: '#2496ED', icon: 'docker-original.svg', aliases: ['docker', 'dockerfile'] },
  { id: 'sql', color: '#336791', icon: 'postgresql-original.svg', aliases: ['sql', 'mysql', 'postgresql', 'postgres', 'sqlite', 'plsql'] },
  { id: 'shell', color: '#4EAA25', icon: 'bash-original.svg', aliases: ['shell', 'bash', 'sh', 'zsh', 'powershell', 'ps1'] },
  { id: 'markdown', color: '#083FA1', icon: 'markdown-original.svg', aliases: ['markdown', 'md'] },
  { id: 'json', color: '#F5A623', icon: 'json-plain.svg', aliases: ['json'] },
  { id: 'yaml', color: '#CB171E', icon: 'yaml-plain.svg', aliases: ['yaml', 'yml'] },
  { id: 'lua', color: '#000080', icon: 'lua-original.svg', aliases: ['lua'] },
  { id: 'r', color: '#276DC3', icon: 'r-original.svg', aliases: ['r'] },
  { id: 'scala', color: '#DC322F', icon: 'scala-original.svg', aliases: ['scala'] },
  { id: 'haskell', color: '#5E5086', icon: 'haskell-original.svg', aliases: ['haskell', 'hs'] },
  { id: 'elixir', color: '#4B275F', icon: 'elixir-original.svg', aliases: ['elixir', 'ex'] },
  { id: 'clojure', color: '#5881D8', icon: 'clojure-line.svg', aliases: ['clojure', 'clj'] },
  { id: 'perl', color: '#39457E', icon: 'perl-original.svg', aliases: ['perl', 'pl'] },
  { id: 'objectivec', color: '#4381FF', icon: 'objectivec-plain.svg', aliases: ['objective-c', 'objectivec', 'objc'] },
  { id: 'zig', color: '#F7A41D', icon: 'zig-original.svg', aliases: ['zig'] },
  { id: 'wasm', color: '#654FF0', icon: 'wasm-original.svg', aliases: ['wasm', 'webassembly'] }
]

const aliasMap = new Map()
for (const profile of LANGUAGE_PROFILES) {
  for (const alias of profile.aliases) {
    aliasMap.set(alias.toLowerCase(), profile)
  }
}

function hexToRgb(hex = '#0284c7') {
  const value = String(hex).replace('#', '').trim()
  const normalized = value.length === 3
    ? value.split('').map((char) => char + char).join('')
    : value.padStart(6, '0').slice(0, 6)
  return {
    r: Number.parseInt(normalized.slice(0, 2), 16) || 0,
    g: Number.parseInt(normalized.slice(2, 4), 16) || 0,
    b: Number.parseInt(normalized.slice(4, 6), 16) || 0
  }
}

export function normalizeListName(name = '') {
  return String(name).replace(/^\d+\.\s*/, '').trim()
}

export function resolveLanguageProfile(name = '') {
  const normalized = normalizeListName(name).toLowerCase()
  if (!normalized) return null
  return aliasMap.get(normalized) || null
}

export function isLanguageSection(section = {}) {
  if (section.kind === 'language') return true
  return /语言/.test(String(section.title || ''))
}

export function buildListAccentBackground(accentColor = THEME_COLOR, themeColor = THEME_COLOR) {
  const theme = hexToRgb(themeColor)
  const accent = hexToRgb(accentColor)
  return `linear-gradient(135deg, rgba(${accent.r}, ${accent.g}, ${accent.b}, 0.14) 0%, rgba(${theme.r}, ${theme.g}, ${theme.b}, 0.08) 100%)`
}

export function getLanguageIconUrl(resPath = '', icon = 'default-code.svg') {
  const base = String(resPath || '').replace(/\/?$/, '/')
  return `${base}icons/languages/${icon}`
}