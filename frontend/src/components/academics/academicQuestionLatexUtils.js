export const chemistryEquationTemplate = '\\ce{#?}'

const CHEMISTRY_ELEMENT_PATTERN =
  '(?:Ac|Ag|Al|Am|Ar|As|At|Au|B|Ba|Be|Bh|Bi|Bk|Br|C|Ca|Cd|Ce|Cf|Cl|Cm|Cn|Co|Cr|Cs|Cu|Db|Ds|Dy|Er|Es|Eu|F|Fe|Fl|Fm|Fr|Ga|Gd|Ge|H|He|Hf|Hg|Ho|Hs|I|In|Ir|K|Kr|La|Li|Lr|Lu|Lv|Mc|Md|Mg|Mn|Mo|Mt|N|Na|Nb|Nd|Ne|Nh|Ni|No|Np|O|Og|Os|P|Pa|Pb|Pd|Pm|Po|Pr|Pt|Pu|Ra|Rb|Re|Rf|Rg|Rh|Rn|Ru|S|Sb|Sc|Se|Sg|Si|Sm|Sn|Sr|Ta|Tb|Tc|Te|Th|Ti|Tl|Tm|Ts|U|V|W|Xe|Y|Yb|Zn|Zr)'
const chemistryElementRegex = new RegExp(`\\b${CHEMISTRY_ELEMENT_PATTERN}\\s*\\d*`, 'g')
const chemistryTokenRegex = new RegExp(
  `\\b\\d*${CHEMISTRY_ELEMENT_PATTERN}(?:\\s*\\d+)?(?:\\s*${CHEMISTRY_ELEMENT_PATTERN}(?:\\s*\\d+)?)*\\b`,
)
const unitPowerRegex = /(\d+(?:\.\d+)?)?\s*(KJ|kJ|J|cal)?\s*mol\s*-\s*1\b/gi

const unicodeSubscriptMap = {
  '₀': '0',
  '₁': '1',
  '₂': '2',
  '₃': '3',
  '₄': '4',
  '₅': '5',
  '₆': '6',
  '₇': '7',
  '₈': '8',
  '₉': '9',
}

const unicodeSuperscriptMap = {
  '⁰': '0',
  '¹': '1',
  '²': '2',
  '³': '3',
  '⁴': '4',
  '⁵': '5',
  '⁶': '6',
  '⁷': '7',
  '⁸': '8',
  '⁹': '9',
  '⁺': '+',
  '⁻': '-',
}

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

/**
 * MathLive stores multi-line as `\displaylines{a \\ b}` (visual rows).
 * KaTeX / our catalog store `\newline` (renders as a real break in papers).
 */
export function mathliveLatexToStorage(input) {
  let t = stripLatexDelimitersForKatex(input)
  if (!t) return ''

  const displaylines = t.match(/^\\displaylines\{([\s\S]*)\}$/)
  if (displaylines) {
    return displaylines[1]
      .split(/\\\\\s*/)
      .map((line) => line.trim())
      .filter((line, index, lines) => line.length > 0 || (index > 0 && index < lines.length - 1))
      .join(' \\newline ')
      .trim()
  }

  // Legacy / pasted unknown command shown as pink in the editor.
  return t.replace(/\\newline\b/g, '\\newline').trim()
}

/**
 * Convert stored `\newline` stems into MathLive multiline so the editor shows real rows.
 */
export function storageLatexToMathlive(input) {
  let t = stripLatexDelimitersForKatex(input)
  if (!t) return ''
  if (/^\\displaylines\{/.test(t)) return t
  if (!/\\newline\b/.test(t)) return t

  const lines = t
    .split(/\s*\\newline\b\s*/)
    .map((line) => line.trim())
    .filter((line, index, all) => line.length > 0 || index === 0 || index === all.length - 1)

  if (lines.length <= 1) return lines[0] || ''
  return `\\displaylines{${lines.join(' \\\\ ')}}`
}

const FRACTION_TOKEN_PATTERN =
  String.raw`(?:[a-zA-Z]|\\[a-zA-Z]+)(?:_\{[^}]+\}|\^\{[^}]+\}|[a-zA-Z0-9])*|\d+(?:\.\d+)?`

/**
 * Turn plain-text fractions (x/3, (a+b)/(c+d)) into \frac{}{} for KaTeX / MathLive.
 */
export function convertSimpleFractionsToLatex(value) {
  const input = `${value ?? ''}`
  if (!input.trim() || /\\frac\b/.test(input)) return input

  let result = input.replace(/\(([^()]+)\)\s*\/\s*\(([^()]+)\)/g, '\\frac{$1}{$2}')
  const simpleFractionRegex = new RegExp(
    String.raw`(^|[\s=+\-×÷·(,])(${FRACTION_TOKEN_PATTERN})\s*\/\s*(${FRACTION_TOKEN_PATTERN})(?=[\s=+\-×÷·),:;.?!\]]|$)`,
    'g',
  )
  result = result.replace(simpleFractionRegex, (match, prefix, numerator, denominator) => {
    if (numerator.includes('\\frac') || denominator.includes('\\frac')) return match
    return `${prefix}\\frac{${numerator}}{${denominator}}`
  })
  return result
}

function mapUnicodeDigits(chars, map) {
  return `${chars || ''}`
    .split('')
    .map((ch) => map[ch] || ch)
    .join('')
}

function preserveChemUnicodeThenNfkc(value) {
  // Protect unicode charges/subscripts before NFKC (which flattens ²→2, ⁺→+).
  return `${value || ''}`
    .replace(/([A-Za-z)])([₀₁₂₃₄₅₆₇₈₉]+)/g, (_, base, subs) => `${base}${mapUnicodeDigits(subs, unicodeSubscriptMap)}`)
    .replace(/[₀₁₂₃₄₅₆₇₈₉]/g, (ch) => unicodeSubscriptMap[ch] || ch)
    .replace(
      /([A-Za-z0-9)])([⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻]+)/g,
      (_, base, sups) => `${base}§SUP§${mapUnicodeDigits(sups, unicodeSuperscriptMap)}§ENDSUP§`,
    )
    .normalize('NFKC')
}

function normalizeChemistryExpression(value) {
  let normalized = preserveChemUnicodeThenNfkc(value)
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[−–—]/g, '-')
    .replace(/[⟶→]/g, '->')
    .replace(/[←]/g, '<-')
    .replace(/[⇌]/g, '<->')
    .replace(/½/g, '1/2')

  // Park protected charges and {...} groups so ASCII + spacing cannot touch them
  // (avoids breaking math like C_nH_{2n+1} when this runs from convertTextToLatex).
  const supers = []
  normalized = normalized.replace(/§SUP§([^§]*)§ENDSUP§/g, (_, content) => {
    supers.push(`${content}`.replace(/\s+/g, ''))
    return `§SUP${supers.length - 1}§`
  })
  const braces = []
  normalized = normalized.replace(/\{([^{}]*)\}/g, (_, inner) => {
    braces.push(inner)
    return `§BRACE${braces.length - 1}§`
  })

  normalized = normalized
    .replace(/\s*\+\s*/g, ' + ')
    .replace(/\s*(<->|<-|->|=>|=)\s*/g, ' $1 ')
    .replace(/_\s*\(\s*(aq|s|l|g|i)\s*\)/gi, (_, state) => `_{(${state.toLowerCase() === 'i' ? 'l' : state.toLowerCase()})}`)
    .replace(/\(\s*(aq|s|l|g|i)\s*\)/gi, (_, state) => `(${state.toLowerCase() === 'i' ? 'l' : state.toLowerCase()})`)
    .replace(/([A-Z][a-z]?)(?:\s+)(\d+)(?=\b|\()/g, '$1$2')
    .replace(/(\d+)\s+([A-Z][a-z]?)/g, '$1$2')
    .replace(/(^|[^_{])\((aq|s|l|g)\)/gi, '$1_{($2)}')
    .replace(/\s+_\{\((aq|s|l|g)\)\}/gi, '_{($1)}')

  normalized = normalized.replace(/§BRACE(\d+)§/g, (_, index) => `{${braces[Number(index)]}}`)
  normalized = normalized.replace(/§SUP(\d+)§/g, (_, index) => `^{${supers[Number(index)]}}`)

  return normalized
    .replace(/([A-Za-z0-9)}])\s*([+-])\s*(_\{\((?:aq|s|l|g)\)\})/gi, '$1^{$2}$3')
    .replace(/([A-Za-z])\s*([+-])\s*$/g, '$1^{$2}')
    .replace(/([A-Za-z0-9)}])([+-])(?=\s|$)/g, '$1^{$2}')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

export function normalizeChemistryNotation(value) {
  return normalizeChemistryExpression(value)
}

/** Reaction arrows / state markers — not bare +/= (those appear in algebra). */
function hasChemistryEquationMarkers(text) {
  return /(?:->|<-|<->|=>|→|←|⇌|⟶|\((?:aq|s|l|g)\))/i.test(text)
}

/** True chem species: H2O, CO2, Na+, not math acronyms like HCF / LCM. */
function looksLikeRealChemistrySpecies(text) {
  const normalized = stripUnicodeChemDigits(text)
  if (looksLikeCompactChemistryFormula(normalized) || looksLikeCompactChemistryFormula(text)) return true
  if (hasChemistryEquationMarkers(text) && chemistryTokenRegex.test(normalized)) return true
  // Element + digit (H2, O2) or charged ion — excludes all-letter acronyms (HCF).
  if (/(?:[A-Z][a-z]?\d|\([^)]+\)\d|[A-Z][a-z]?\^[0-9+-]|[A-Z][a-z]?\^\{)/.test(normalized)) {
    return chemistryTokenRegex.test(normalized)
  }
  return false
}

/** MathLive / editor output already has TeX — do not wrap again as chemistry. */
function alreadyStructuredLatex(text) {
  return /\\(?:text|textrm|textsf|textit|textbf|frac|dfrac|sqrt|log|ln|sum|int|lim|cdot|times|mathrm|mathbf|mathbb|left|right|overline|underline|ce|pu)\b/.test(
    `${text || ''}`,
  )
}

function stripUnicodeChemDigits(text) {
  return `${text || ''}`
    .replace(/([A-Za-z)])([₀₁₂₃₄₅₆₇₈₉]+)/g, (_, base, subs) => `${base}${mapUnicodeDigits(subs, unicodeSubscriptMap)}`)
    .replace(/[₀₁₂₃₄₅₆₇₈₉]/g, (ch) => unicodeSubscriptMap[ch] || ch)
    .replace(
      /([A-Za-z0-9)])([⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻]+)/g,
      (_, base, sups) => `${base}^{${mapUnicodeDigits(sups, unicodeSuperscriptMap)}}`,
    )
}

/** Compact formulas like H2O, K2Cr2O7, (NH4)2SO4, H₂O, Cu²⁺ — not prose sentences. */
function looksLikeCompactChemistryFormula(value) {
  const raw = `${value || ''}`.trim()
  if (!raw || raw.length > 64) return false
  if (/\b(?:the|and|with|from|what|name|select|balance|write|following|compound)\b/i.test(raw)) {
    return false
  }
  if (/\\(?:ce|pu)\s*\{/.test(raw)) return true
  const normalized = stripUnicodeChemDigits(raw)
  if (!chemistryTokenRegex.test(normalized)) return false
  // Mostly formula characters
  if (!/^[A-Za-z0-9()[\]{}^+\-→←⇌⟶\s\\=._]+$/.test(normalized)) return false
  return (
    /(?:[A-Z][a-z]?\d|\([^)]+\)\d|[A-Za-z]\^{|[A-Za-z]\^[0-9+-])/.test(normalized) ||
    /[₀₁₂₃₄₅₆₇₈₉⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻]/.test(raw)
  )
}

function looksLikeStandaloneChemistryExpression(value) {
  const text = `${value || ''}`.trim()
  if (!text) return false
  if (/\\(?:ce|pu)\s*\{/.test(text)) return true
  if (looksLikeCompactChemistryFormula(text)) return true
  if (!chemistryTokenRegex.test(stripUnicodeChemDigits(text))) return false
  if (hasChemistryEquationMarkers(text)) return true
  const proseWords = text.match(/\b[a-zA-Z]{3,}\b/g) || []
  if (proseWords.length >= 4 && !new RegExp(`^\\d*${CHEMISTRY_ELEMENT_PATTERN}`).test(text)) return false
  return /\b(?:acid|base|salt|oxide|chloride)\b/i.test(text)
}

/** Split leading/trailing prose from an embedded chem equation on one line. */
function splitProseAndChemistry(text) {
  const trimmed = `${text || ''}`.trim()
  if (!trimmed || /\\(?:ce|pu)\s*\{/.test(trimmed)) return null
  if (alreadyStructuredLatex(trimmed)) return null

  // Common pattern: "Balance: H2 + O2 → H2O"
  const afterColon = trimmed.match(/^(.+?):\s*(.+)$/)
  if (afterColon && looksLikeRealChemistrySpecies(afterColon[2])) {
    return { prose: afterColon[1].trim(), chem: afterColon[2].trim() }
  }

  if (!hasChemistryEquationMarkers(trimmed) && !/\+/.test(trimmed)) return null

  // Prefer element+digit (H2) over bare letters so "HCF" is not treated as chemistry.
  const elementDigitAt = trimmed.search(new RegExp(`\\d*${CHEMISTRY_ELEMENT_PATTERN}\\d`))
  const elementAt =
    elementDigitAt >= 0
      ? elementDigitAt
      : hasChemistryEquationMarkers(trimmed)
        ? trimmed.search(new RegExp(`\\d*${CHEMISTRY_ELEMENT_PATTERN}`))
        : -1
  if (elementAt <= 0) return null

  const prosePart = trimmed.slice(0, elementAt).trim().replace(/[:\-–—]\s*$/, '').trim()
  const chemPart = trimmed.slice(elementAt).replace(/[.?!:;,]+\s*$/, '').trim()
  if (!prosePart || !chemPart || !looksLikeRealChemistrySpecies(chemPart)) return null
  return { prose: prosePart, chem: chemPart }
}

export function looksLikeChemistryText(value) {
  const text = `${value || ''}`
  if (!text.trim()) return false
  if (/\\(?:ce|pu)\s*\{/.test(text)) return true
  // Already MathLive / formula-editor TeX — never re-wrap as chemistry.
  if (alreadyStructuredLatex(text) && !/\\(?:ce|pu)\s*\{/.test(text)) return false
  if (text.split(/\r?\n/).some((line) => looksLikeStandaloneChemistryExpression(line))) {
    return true
  }
  if (text.split(/\r?\n/).some((line) => splitProseAndChemistry(line))) {
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

function wrapChemistryLine(line) {
  const trimmed = line.trim()
  if (!trimmed) return ''
  const split = splitProseAndChemistry(trimmed)
  if (split) {
    const proseLabel = /[:：]$/.test(split.prose) ? `${split.prose} ` : `${split.prose}: `
    return `${textSegmentToLatex(proseLabel)}\\ce{${normalizeChemistryExpression(split.chem)}}`
  }
  if (looksLikeStandaloneChemistryExpression(trimmed) || looksLikeCompactChemistryFormula(trimmed)) {
    return `\\ce{${normalizeChemistryExpression(trimmed)}}`
  }
  return trimmed
}

export function normalizePastedChemistryText(value) {
  let normalized = `${value || ''}`.trim()
  if (!normalized) return ''
  // Do not NFKC here — normalizeChemistryExpression preserves chem unicode first.
  normalized = stripLatexDelimitersForKatex(normalized)
  const wrappedChemistry = normalized.match(/^\\(ce|pu)\s*\{([\s\S]*)\}$/)
  if (wrappedChemistry) {
    return `\\${wrappedChemistry[1]}{${normalizeChemistryExpression(wrappedChemistry[2])}}`
  }

  const lines = normalized.replace(/\r\n/g, '\n').split('\n')
  if (lines.length > 1) {
    return lines.map(wrapChemistryLine).filter(Boolean).join('\n')
  }

  const split = splitProseAndChemistry(normalized)
  if (split) {
    const proseLabel = /[:：]$/.test(split.prose) ? `${split.prose} ` : `${split.prose}: `
    return `${textSegmentToLatex(proseLabel)}\\ce{${normalizeChemistryExpression(split.chem)}}`
  }

  return `\\ce{${normalizeChemistryExpression(normalized)}}`
}
