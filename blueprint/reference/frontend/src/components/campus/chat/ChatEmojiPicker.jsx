import { useEffect, useRef, useState } from 'react'
import { Smile } from 'lucide-react'

const EMOJIS = [
  '😀', '😁', '😂', '🤣', '😊', '😍', '😘', '😎',
  '🙂', '😉', '😅', '😢', '😭', '😤', '🤔', '😴',
  '👍', '👎', '👏', '🙏', '🤝', '👋', '✌️', '👌',
  '❤️', '💙', '💚', '💛', '🔥', '⭐', '✅', '❌',
  '🎉', '🎂', '📎', '📌', '📝', '📅', '⏰', '📞',
  '📚', '🏫', '🚌', '☕', '🌸', '☀️', '🌧️', '💯',
]

export default function ChatEmojiPicker({ onPick, disabled }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const onPointer = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false)
    }
    const onKey = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((value) => !value)}
        className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-slate-50 text-slate-500 transition hover:bg-white hover:text-slate-800 disabled:opacity-50"
        title="Emoji"
        aria-label="Add emoji"
        aria-expanded={open}
      >
        <Smile size={18} />
      </button>
      {open ? (
        <div className="absolute bottom-12 left-0 z-20 w-[15.5rem] rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
          <div className="grid grid-cols-8 gap-0.5">
            {EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => {
                  onPick(emoji)
                  setOpen(false)
                }}
                className="grid h-7 w-7 place-items-center rounded-md text-lg leading-none hover:bg-slate-100"
                aria-label={emoji}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
