export const SIDEBAR_THEME_STORAGE_KEY = 'sidebarTheme'
export const SIDEBAR_THEME_CHANGED_EVENT = 'sidebar-theme-change'

const darkBase = {
  mode: 'gradient',
  bg3: '',
  angle: 280,
  text: '#e0e7ff',
  mutedText: '#c7d2fe',
  activeText: '#ffffff',
  activeBg: '#ffffff',
  activeAlpha: 15,
  hoverBg: '#ffffff',
  hoverAlpha: 10,
  border: '#ffffff',
  borderAlpha: 15,
  iconColor: '',
}

const lightBase = {
  ...darkBase,
  text: '#334155',
  mutedText: '#64748b',
  activeText: '#1e293b',
  activeBg: '#0f172a',
  activeAlpha: 8,
  hoverBg: '#0f172a',
  hoverAlpha: 5,
  border: '#0f172a',
  borderAlpha: 10,
}

export const SIDEBAR_GRADIENT_PRESETS = [
  { id: 'default', name: 'Default Indigo', ...darkBase, bg: '#405189', bg2: '#283357' },
  { id: 'midnight', name: 'Midnight', ...darkBase, bg: '#1e293b', bg2: '#020617', text: '#e2e8f0', mutedText: '#94a3b8' },
  { id: 'slate', name: 'Slate', ...darkBase, bg: '#475569', bg2: '#1e293b', text: '#f1f5f9', mutedText: '#cbd5e1' },
  { id: 'emerald', name: 'Emerald', ...darkBase, bg: '#059669', bg2: '#064e3b', text: '#ecfdf5', mutedText: '#a7f3d0' },
  { id: 'teal', name: 'Teal', ...darkBase, bg: '#0d9488', bg2: '#134e4a', text: '#f0fdfa', mutedText: '#99f6e4' },
  { id: 'ocean', name: 'Ocean', ...darkBase, bg: '#0284c7', bg2: '#1e3a8a', text: '#f0f9ff', mutedText: '#bae6fd' },
  { id: 'royal', name: 'Royal Purple', ...darkBase, bg: '#7c3aed', bg2: '#3b0764', text: '#f5f3ff', mutedText: '#ddd6fe' },
  { id: 'rose', name: 'Rose', ...darkBase, bg: '#e11d48', bg2: '#881337', text: '#fff1f2', mutedText: '#fecdd3' },
  { id: 'sunset', name: 'Sunset', ...darkBase, bg: '#f97316', bg2: '#db2777', angle: 200, text: '#fff7ed', mutedText: '#fed7aa' },
  { id: 'crimson', name: 'Crimson', ...darkBase, bg: '#b91c1c', bg2: '#450a0a', text: '#fef2f2', mutedText: '#fecaca' },
  { id: 'forest', name: 'Forest', ...darkBase, bg: '#3f6212', bg2: '#14532d', text: '#f7fee7', mutedText: '#d9f99d' },
  { id: 'charcoal', name: 'Charcoal', ...darkBase, bg: '#3f3f46', bg2: '#09090b', text: '#e4e4e7', mutedText: '#a1a1aa' },
  { id: 'light', name: 'Light', ...lightBase, bg: '#ffffff', bg2: '#e2e8f0' },
  { id: 'sky', name: 'Sky', ...lightBase, bg: '#e0f2fe', bg2: '#bae6fd', text: '#0c4a6e', mutedText: '#0369a1', activeText: '#082f49' },
  { id: 'gold', name: 'Gold', ...darkBase, bg: '#ca8a04', bg2: '#713f12', text: '#fefce8', mutedText: '#fef08a' },
  { id: 'aurora', name: 'Aurora', ...darkBase, bg: '#0ea5e9', bg2: '#8b5cf6', bg3: '#ec4899', angle: 160, text: '#ffffff', mutedText: '#f5f3ff' },
]

const solidDark = { ...darkBase, mode: 'solid', bg2: '', bg3: '' }
const solidLight = { ...lightBase, mode: 'solid', bg2: '', bg3: '' }

export const SIDEBAR_SOLID_PRESETS = [
  { id: 'default', name: 'Indigo', ...solidDark, bg: '#405189' },
  { id: 'navy', name: 'Navy', ...solidDark, bg: '#1e3a8a', text: '#e0e7ff', mutedText: '#bfdbfe' },
  { id: 'midnight', name: 'Midnight', ...solidDark, bg: '#0f172a', text: '#e2e8f0', mutedText: '#94a3b8' },
  { id: 'slate', name: 'Slate', ...solidDark, bg: '#334155', text: '#f1f5f9', mutedText: '#cbd5e1' },
  { id: 'charcoal', name: 'Charcoal', ...solidDark, bg: '#18181b', text: '#e4e4e7', mutedText: '#a1a1aa' },
  { id: 'emerald', name: 'Emerald', ...solidDark, bg: '#047857', text: '#ecfdf5', mutedText: '#a7f3d0' },
  { id: 'teal', name: 'Teal', ...solidDark, bg: '#0f766e', text: '#f0fdfa', mutedText: '#99f6e4' },
  { id: 'ocean', name: 'Ocean', ...solidDark, bg: '#0369a1', text: '#f0f9ff', mutedText: '#bae6fd' },
  { id: 'royal', name: 'Royal Purple', ...solidDark, bg: '#6d28d9', text: '#f5f3ff', mutedText: '#ddd6fe' },
  { id: 'plum', name: 'Plum', ...solidDark, bg: '#86198f', text: '#fdf4ff', mutedText: '#f5d0fe' },
  { id: 'rose', name: 'Rose', ...solidDark, bg: '#be123c', text: '#fff1f2', mutedText: '#fecdd3' },
  { id: 'crimson', name: 'Crimson', ...solidDark, bg: '#991b1b', text: '#fef2f2', mutedText: '#fecaca' },
  { id: 'forest', name: 'Forest', ...solidDark, bg: '#166534', text: '#f0fdf4', mutedText: '#bbf7d0' },
  { id: 'coffee', name: 'Coffee', ...solidDark, bg: '#57402c', text: '#fef3c7', mutedText: '#e7d3b0' },
  { id: 'light', name: 'Light', ...solidLight, bg: '#ffffff' },
  { id: 'sky', name: 'Sky', ...solidLight, bg: '#e0f2fe', text: '#0c4a6e', mutedText: '#0369a1', activeText: '#082f49' },
]

export const DEFAULT_SIDEBAR_THEME = { presetId: 'default', ...SIDEBAR_GRADIENT_PRESETS[0] }

export function presetsForMode(mode) {
  return mode === 'solid' ? SIDEBAR_SOLID_PRESETS : SIDEBAR_GRADIENT_PRESETS
}

export function themeFromPreset(preset) {
  const { id, name: _name, ...rest } = preset
  return { ...DEFAULT_SIDEBAR_THEME, ...rest, presetId: id }
}

export function loadSidebarTheme() {
  try {
    const raw = localStorage.getItem(SIDEBAR_THEME_STORAGE_KEY)
    if (!raw) return { ...DEFAULT_SIDEBAR_THEME }
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? { ...DEFAULT_SIDEBAR_THEME, ...parsed } : { ...DEFAULT_SIDEBAR_THEME }
  } catch {
    return { ...DEFAULT_SIDEBAR_THEME }
  }
}

export function saveSidebarTheme(theme) {
  localStorage.setItem(SIDEBAR_THEME_STORAGE_KEY, JSON.stringify(theme))
  window.dispatchEvent(new Event(SIDEBAR_THEME_CHANGED_EVENT))
}

export function resetSidebarTheme() {
  localStorage.removeItem(SIDEBAR_THEME_STORAGE_KEY)
  window.dispatchEvent(new Event(SIDEBAR_THEME_CHANGED_EVENT))
}

export function hexToRgba(hex, alphaPercent = 100) {
  const clean = String(hex || '').replace('#', '')
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return hex
  const r = parseInt(full.slice(0, 2), 16)
  const g = parseInt(full.slice(2, 4), 16)
  const b = parseInt(full.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(100, Number(alphaPercent))) / 100})`
}

export function sidebarBackground(theme) {
  if (theme.mode !== 'gradient') return theme.bg
  const stops = [theme.bg, theme.bg2, theme.bg3].filter(Boolean)
  if (stops.length < 2) return theme.bg
  return `linear-gradient(${Number(theme.angle) || 0}deg, ${stops.join(', ')})`
}

export function applyTableHeaderTheme(theme) {
  const root = document.documentElement.style
  root.setProperty('--brand-bg', sidebarBackground(theme))
  root.setProperty('--brand-text', theme.activeText)
}

export function toCssVars(theme) {
  return {
    '--sb-bg': sidebarBackground(theme),
    '--sb-text': theme.text,
    '--sb-muted': theme.mutedText,
    '--sb-active-bg': hexToRgba(theme.activeBg, theme.activeAlpha),
    '--sb-active-text': theme.activeText,
    '--sb-hover-bg': hexToRgba(theme.hoverBg, theme.hoverAlpha),
    '--sb-border': hexToRgba(theme.border, theme.borderAlpha),
    '--sb-icon': theme.iconColor || 'currentColor',
  }
}
