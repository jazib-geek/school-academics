import EmployeeGenderAvatar from './EmployeeGenderAvatar'

function EmployeeHomeWelcomeCard({ firstName, gender, designation, subtitle }) {
  return (
    <section className="emp-home-welcome relative overflow-hidden rounded-[var(--emp-radius-lg)]">
      <svg
        className="pointer-events-none absolute -right-6 -top-8 h-32 w-32 text-[var(--emp-primary)] opacity-[0.08]"
        viewBox="0 0 120 120"
        aria-hidden
      >
        <circle cx="60" cy="60" r="52" fill="currentColor" />
      </svg>
      <svg
        className="pointer-events-none absolute -bottom-10 -left-6 h-28 w-28 text-[#7c3aed] opacity-[0.06]"
        viewBox="0 0 120 120"
        aria-hidden
      >
        <circle cx="60" cy="60" r="48" fill="currentColor" />
      </svg>
      <svg
        className="pointer-events-none absolute bottom-3 right-4 h-16 w-16 text-[var(--emp-primary)] opacity-[0.1]"
        viewBox="0 0 64 64"
        aria-hidden
      >
        <path
          fill="currentColor"
          d="M8 40c8-14 20-22 32-22s24 8 24 22c0 10-10 18-24 18S8 50 8 40z"
        />
      </svg>

      <div className="relative flex items-start gap-3.5 p-4">
        <EmployeeGenderAvatar gender={gender} size="lg" />
        <div className="min-w-0 flex-1 pt-0.5">
          <p className="text-lg font-semibold leading-tight tracking-tight text-[var(--emp-text)]">
            Hello, {firstName}
          </p>
          {designation ? (
            <p className="mt-1 text-xs font-semibold text-[var(--emp-primary)]">{designation}</p>
          ) : null}
          <p className="mt-2 text-[13px] leading-snug text-[var(--emp-text-muted)]">{subtitle}</p>
        </div>
      </div>
    </section>
  )
}

export default EmployeeHomeWelcomeCard
