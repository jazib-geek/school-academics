const PALETTE = [
  'bg-indigo-100 text-indigo-700',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700',
  'bg-sky-100 text-sky-700',
  'bg-violet-100 text-violet-700',
  'bg-teal-100 text-teal-700',
  'bg-orange-100 text-orange-700',
]

function initials(name) {
  const parts = String(name || '?').trim().split(/[\s._-]+/).filter(Boolean)
  if (!parts.length) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
}

function colorFor(name) {
  let hash = 0
  for (const ch of String(name || '')) hash = (hash * 31 + ch.charCodeAt(0)) | 0
  return PALETTE[Math.abs(hash) % PALETTE.length]
}

export default function ChatAvatar({ name, online, size = 'md' }) {
  const box = size === 'sm' ? 'h-8 w-8 text-[11px]' : 'h-10 w-10 text-xs'
  return (
    <span className={`relative grid shrink-0 place-items-center rounded-full font-bold ${box} ${colorFor(name)}`}>
      {initials(name)}
      {online !== undefined ? (
        <span
          className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ring-2 ring-white ${
            online ? 'bg-emerald-500' : 'bg-slate-300'
          }`}
          title={online ? 'Online' : 'Offline'}
        />
      ) : null}
    </span>
  )
}
