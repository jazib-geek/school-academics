import { stemImageSrc } from './stemImageUtils.js'

/** Renders an optional structure diagram under question text. */
export function QuestionStemImage({ src, className = '', alt = 'Structure diagram' }) {
  const resolved = stemImageSrc(src)
  if (!resolved) return null
  return (
    <img
      src={resolved}
      alt={alt}
      className={`academic-stem-image max-h-56 max-w-full object-contain ${className}`.trim()}
    />
  )
}

export default QuestionStemImage
