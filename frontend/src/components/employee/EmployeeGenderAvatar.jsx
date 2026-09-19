function isFemaleGender(gender) {
  return `${gender || ''}`.trim().toLowerCase().startsWith('f')
}

function EmployeeGenderAvatar({ gender, size = 'lg', className = '' }) {
  const isFemale = isFemaleGender(gender)
  const dim = size === 'sm' ? 'h-10 w-10' : 'h-14 w-14'
  const icon = size === 'sm' ? 'h-7 w-7' : 'h-9 w-9'

  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full ring-2 ring-white shadow-sm ${dim} ${
        isFemale ? 'bg-gradient-to-br from-pink-200 to-rose-300' : 'bg-gradient-to-br from-sky-200 to-blue-300'
      } ${className}`}
      aria-hidden
    >
      {isFemale ? (
        <svg viewBox="0 0 100 100" className={icon}>
          <path
            fill="#5F3E20"
            stroke="#311710"
            strokeWidth="1"
            d="M24 57c7-8 1-30 4-38C32 8 36 1 47 1c13 0 20 10 24 20 1 2 0 8 2 14 2 5-1 10-1 12 0 5-1 3 3 10-7 17-40 13-51 0z"
          />
          <path
            fill="#E78FB3"
            stroke="#B85D87"
            strokeWidth="1"
            d="M40 51c-5 6-22 4-25 17-2 7-1 30 14 28-1-18-3-27-3-27s2 17 3 25c11 6 28 6 42-1 0-8-1-15 0-22 1-6 0 24 0 24s9 2 12-7c2-11 5-27-9-31-11-3-12-6-14-6z"
          />
          <path fill="#DBBFA8" stroke="#693311" strokeWidth="1" d="M50 50C33 50 22 4 49 3.4 73 5 66 50 50 50z" />
          <path fill="#5F3E20" d="M46 12c-4 5-9 9-14 10-5 1 2-20 15-20 7 0 17 4 19 18-8 1-18-5-20-8z" />
        </svg>
      ) : (
        <svg viewBox="0 0 100 100" className={icon}>
          <path
            fill="#427794"
            stroke="#2A424F"
            strokeWidth="1"
            d="M39 52c-5 6-20 3-23 16-2 7-2 30 13 28-1-18-3-27-3-27s2 17 3 25c11 6 28 6 42-1 0-8-1-15 0-22 1-6 0 24 0 24s9 2 12-7c2-11 5-29-13-33-11-2-8-3-10-3z"
          />
          <path fill="#CDA68E" stroke="#693311" strokeWidth="1" d="M50 50C33 50 21 4.1 49 3.4 79 3.3 66 50 50 50z" />
          <path
            fill="#553932"
            stroke="#311710"
            strokeWidth="1"
            d="M33 30C29 19 29 2.2 49 1.2 66 2.1 72 18 66 30c0-5 1-7-2-11-5-1-12 0-18-7-2 6-16 3-13 18z"
          />
        </svg>
      )}
    </span>
  )
}

export { isFemaleGender }
export default EmployeeGenderAvatar
