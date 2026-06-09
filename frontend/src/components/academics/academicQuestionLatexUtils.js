export const chemistryEquationTemplate = '\\ce{}'

const CHEMISTRY_ELEMENT_PATTERN =
  '(?:Ac|Ag|Al|Am|Ar|As|At|Au|B|Ba|Be|Bh|Bi|Bk|Br|C|Ca|Cd|Ce|Cf|Cl|Cm|Cn|Co|Cr|Cs|Cu|Db|Ds|Dy|Er|Es|Eu|F|Fe|Fl|Fm|Fr|Ga|Gd|Ge|H|He|Hf|Hg|Ho|Hs|I|In|Ir|K|Kr|La|Li|Lr|Lu|Lv|Mc|Md|Mg|Mn|Mo|Mt|N|Na|Nb|Nd|Ne|Nh|Ni|No|Np|O|Og|Os|P|Pa|Pb|Pd|Pm|Po|Pr|Pt|Pu|Ra|Rb|Re|Rf|Rg|Rh|Rn|Ru|S|Sb|Sc|Se|Sg|Si|Sm|Sn|Sr|Ta|Tb|Tc|Te|Th|Ti|Tl|Tm|Ts|U|V|W|Xe|Y|Yb|Zn|Zr)'
const chemistryElementRegex = new RegExp(`\\b${CHEMISTRY_ELEMENT_PATTERN}\\s*\\d*`, 'g')
const chemistryTokenRegex = new RegExp(
  `\\b\\d*${CHEMISTRY_ELEMENT_PATTERN}(?:\\s*\\d+)?(?:\\s*${CHEMISTRY_ELEMENT_PATTERN}(?:\\s*\\d+)?)*\\b`,
)
const unitPowerRegex = /(\d+(?:\.\d+)?)?\s*(KJ|kJ|J|cal)?\s*mol\s*-\s*1\b/gi

/**
 * MathLive / paste sometimes wraps TeX in `$...$` or `\(...\)`. KaTeX `renderToString`
 * expects raw TeX (no `$`), otherwise it renders red error nodes.
 */
export function stripLatexDelimitersForKatex(input) {
  let t = `${input ?? ''}`.trim()
  if (!t) return ''

  if (t.startsWith('$$') && t.endsWith('$$') && t.length > 4) {
    t = t.slice(2, -2).trim()
  }

  if (t.startsWith('\\[') && t.endsWith('\\]') && t.length > 4) {
    t = t.slice(2, -2).trim()
  }

  const inlineWrapped = t.match(/^\\\(([\s\S]*)\\\)$/)
  if (inlineWrapped) t = inlineWrapped[1].trim()

  while (t.startsWith('$') && t.endsWith('$') && t.length > 2) {
    t = t.slice(1, -1).trim()
  }
  t = t.replace(/^\$+\s*/, '').replace(/\s*\$+$/, '').trim()

  return t
}

function normalizeChemistryExpression(value) {
  return `${value || ''}`
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[−–—]/g, '-')
    .replace(/[⟶→]/g, '->')
    .replace(/[←]/g, '<-')
    .replace(/[⇌]/g, '<->')
    .replace(/½/g, '1/2')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s*\+\s*/g, ' + ')
    .replace(/\s*(<->|<-|->|=>|=)\s*/g, ' $1 ')
    .replace(/_\s*\(\s*(aq|s|l|g|i)\s*\)/gi, (_, state) => `_{(${state.toLowerCase() === 'i' ? 'l' : state.toLowerCase()})}`)
    .replace(/\(\s*(aq|s|l|g|i)\s*\)/gi, (_, state) => `(${state.toLowerCase() === 'i' ? 'l' : state.toLowerCase()})`)
    .replace(/([A-Z][a-z]?)(?:\s+)(\d+)(?=\b|\()/g, '$1$2')
    .replace(/(\d+)\s+([A-Z][a-z]?)/g, '$1$2')
    .replace(/(^|[^_{])\((aq|s|l|g)\)/gi, '$1_{($2)}')
    .replace(/\s+_\{\((aq|s|l|g)\)\}/gi, '_{($1)}')
    .replace(/([A-Za-z0-9)}])\s*([+-])\s*(_\{\((?:aq|s|l|g)\)\})/gi, '$1^{$2}$3')
    .replace(/([A-Za-z0-9)}])([+-])(?=\s|$)/g, '$1^{$2}')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

export function normalizeChemistryNotation(value) {
  return normalizeChemistryExpression(value)
}

function looksLikeStandaloneChemistryExpression(value) {
  const text = `${value || ''}`.trim()
  if (!text) return false
  if (/\\(?:ce|pu)\s*\{/.test(text)) return true
  const proseWords = text.match(/\b[a-zA-Z]{3,}\b/g) || []
  if (proseWords.length >= 4 && !new RegExp(`^\\d*${CHEMISTRY_ELEMENT_PATTERN}`).test(text)) return false
  if (!chemistryTokenRegex.test(text)) return false
  return /(?:->|<-|<->|=>|=|→|←|⇌|⟶|\+|\((?:aq|s|l|g)\)|\b(?:acid|base|salt|oxide|chloride)\b)/i.test(
    text,
  )
}

export function looksLikeChemistryText(value) {
  const text = `${value || ''}`
  if (!text.trim()) return false
  if (/\\(?:ce|pu)\s*\{/.test(text)) return true
  if (text.split(/\r?\n/).some((line) => looksLikeStandaloneChemistryExpression(line))) {
    return true
  }
  const matches = text.match(chemistryElementRegex) || []
  return (
    matches.length >= 2 &&
    text.split(/\r?\n/).length > 1 &&
    /\b(?:acid|base|salt|reaction|oxide|chloride|hydrogen|oxygen|carbon|molecule|compound)\b/i.test(text)
  )
}

function escapeLatexText(value) {
  return `${value || ''}`
    .replace(/\\/g, '\\textbackslash{}')
    .replace(/{/g, '\\{')
    .replace(/}/g, '\\}')
    .replace(/\$/g, '\\$')
    .replace(/&/g, '\\&')
    .replace(/%/g, '\\%')
    .replace(/#/g, '\\#')
    .replace(/_/g, '\\_')
    .replace(/\^/g, '\\textasciicircum{}')
}

function textSegmentToLatex(value) {
  if (!value) return ''
  return `\\text{${escapeLatexText(value)}}`
}

function unitPowerToLatex(value) {
  const match = `${value || ''}`.trim().match(/^(\d+(?:\.\d+)?)?\s*(KJ|kJ|J|cal)?\s*mol\s*-\s*1$/i)
  if (!match) return textSegmentToLatex(value)
  const [, amount = '', unit = ''] = match
  const unitLatex = unit ? `${unit}\\,mol` : 'mol'
  return `${amount}\\mathrm{${unitLatex}}^{-1}`
}

export function looksLikeScientificProseText(value) {
  const text = `${value || ''}`.normalize('NFKC')
  if (!text.trim() || /\\[a-zA-Z]+/.test(text)) return false
  return /\b(?:KJ|kJ|J|cal)?\s*mol\s*-\s*1\b/i.test(text)
}

export function normalizePastedScientificProseText(value) {
  const normalized = `${value || ''}`
    .normalize('NFKC')
    .replace(/[−–—]/g, '-')
    .replace(/\r\n/g, '\n')
    .replace(/\n+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
  if (!normalized) return ''

  const parts = []
  let lastIndex = 0
  normalized.replace(unitPowerRegex, (match, _amount, _unit, offset) => {
    parts.push(textSegmentToLatex(normalized.slice(lastIndex, offset)))
    parts.push(unitPowerToLatex(match))
    lastIndex = offset + match.length
    return match
  })
  parts.push(textSegmentToLatex(normalized.slice(lastIndex)))

  return parts.filter(Boolean).join('')
}

export function normalizePastedChemistryText(value) {
  let normalized = `${value || ''}`.normalize('NFKC').trim()
  if (!normalized) return ''
  normalized = stripLatexDelimitersForKatex(normalized)
  const wrappedChemistry = normalized.match(/^\\(ce|pu)\s*\{([\s\S]*)\}$/)
  if (wrappedChemistry) {
    return `\\${wrappedChemistry[1]}{${normalizeChemistryExpression(wrappedChemistry[2])}}`
  }

  const lines = normalized.replace(/\r\n/g, '\n').split('\n')
  if (lines.length > 1) {
    return lines
      .map((line) => {
        const trimmed = line.trim()
        if (!trimmed) return ''
        return looksLikeStandaloneChemistryExpression(trimmed)
          ? `\\ce{${normalizeChemistryExpression(trimmed)}}`
          : trimmed
      })
      .filter(Boolean)
      .join('\n')
  }

  return `\\ce{${normalizeChemistryExpression(normalized)}}`
}
