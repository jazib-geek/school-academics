import {
  BadgeCheck,
  BookOpen,
  Briefcase,
  Building2,
  Calendar,
  CalendarDays,
  Flag,
  GraduationCap,
  Home,
  IdCard,
  Languages,
  Loader2,
  MapPin,
  Phone,
  Printer,
  Receipt,
  School,
  StickyNote,
  User,
  UserRound,
  Users,
  Wallet,
  X,
} from 'lucide-react'
import { getCampusLabel } from '../../../constants/branding'
import { getCampusPrintMeta } from '../../../utils/campusProfile'

const dash = (value) => {
  if (value == null || value === '') return '—'
  return String(value)
}

const formatDate = (value) => {
  if (!value) return '—'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return '—'
  return parsed.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

const formatAmount = (value) => {
  if (value === '' || value == null) return '—'
  const num = Number(value)
  if (Number.isNaN(num)) return '—'
  return num.toLocaleString('en-PK')
}

const formatDateTime = (value = new Date()) => {
  const parsed = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(parsed.getTime())) return '—'
  const date = parsed.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  const time = parsed.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
  return `${date} • ${time}`
}

function ProfileAvatar({ gender, size = 'lg' }) {
  const normalized = String(gender || '').toLowerCase()
  const isFemale = normalized === 'female'
  const sizeClass = size === 'lg' ? 'h-20 w-20 sm:h-24 sm:w-24' : 'h-12 w-12'
  const svgClass = size === 'lg' ? 'h-14 w-14 sm:h-16 sm:w-16' : 'h-8 w-8'

  return (
    <span
      className={`inline-flex items-center justify-center rounded-full ring-4 ring-white shadow-md ${sizeClass} ${
        isFemale ? 'bg-pink-100' : 'bg-sky-100'
      }`}
      title={gender || 'Student'}
    >
      {isFemale ? (
        <svg viewBox="0 0 100 100" className={svgClass} aria-hidden="true">
          <path style={{ fill: '#5F3E20', stroke: '#311710' }} d="M 24,57 C 31,49 25,27 28,19 32,8 36,1 47,1 c 13,0 20,10 24,20 1,2 0,8 2,14 2,5 -1,10 -1,12 0,5 -1,3 3,10 -7,17 -40,13 -51,0 z" />
          <path style={{ fill: '#E78FB3', stroke: '#B85D87' }} d="m 40,51 c -5,6 -22,4 -25,17 -2,7 -1,30 14,28 -1,-18 -3,-27 -3,-27 0,0 2,17 3,25 11,6 28,6 42,-1 0,-8 -1,-15 0,-22 1,-6 0,24 0,24 0,0 9,2 12,-7 C 85,77 88,61 74,57 63,54 62,51 60,51 58,51 40,51 40,51 z" />
          <path style={{ fill: '#DEB89F', stroke: '#693311' }} d="m 40,45 c 0,0 1,4 -1,7 4,4 13,10 21,0 -1,-3 -1,-3 -1,-7 0,0 -19,0 -19,0 z" />
          <path style={{ fill: '#DBBFA8', stroke: '#693311' }} d="M 50,50 C 33,50 22,4 49,3.4 73,5 66,50 50,50 z" />
          <path style={{ fill: '#5F3E20' }} d="M 46,12 C 42,17 37,21 32,22 27,23 34,2 47,2 54,2 64,6 66,20 58,21 48,15 46,12" />
        </svg>
      ) : (
        <svg viewBox="0 0 100 100" className={svgClass} aria-hidden="true">
          <path style={{ fill: '#427794', stroke: '#2A424F' }} d="m 39,52 c -5,6 -20,3 -23,16 -2,7 -2,30 13,28 -1,-18 -3,-27 -3,-27 0,0 2,17 3,25 11,6 28,6 42,-1 0,-8 -1,-15 0,-22 1,-6 0,24 0,24 0,0 9,2 12,-7 C 85,77 88,59 70,55 59,53 62,52 60,52 58,52 39,52 39,52 z" />
          <path style={{ fill: '#C29B82', stroke: '#693311' }} d="m 40,45 c 0,0 1,4 -1,7 4,4 13,10 21,0 -1,-3 -1,-3 -1,-7 0,0 -19,0 -19,0 z" />
          <path style={{ fill: '#CDA68E', stroke: '#693311' }} d="M 50,50 C 33,50 21,4.1 49,3.4 79,3.3 66,50 50,50 z" />
          <path style={{ fill: '#553932', stroke: '#311710' }} d="M 33,30 C 29,19 29,2.2 49,1.2 66,2.1 72,18 66,30 66,25 67,23 64,19 59,18 52,19 46,12 44,18 30,15 33,30 z" />
        </svg>
      )}
    </span>
  )
}

function MosqueIcon({ size = 14 }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 20h16" />
      <path d="M6 20V12l6-4 6 4v8" />
      <path d="M12 8V5" />
      <circle cx="12" cy="4" r="1" fill="currentColor" stroke="none" />
      <path d="M9 20v-4h6v4" />
      <path d="M8 12h8" />
    </svg>
  )
}

function FieldRow({ icon: Icon, label, value, tone = 'slate', dir }) {
  const tones = {
    slate: 'bg-slate-100 text-slate-600',
    sky: 'bg-sky-100 text-sky-700',
    emerald: 'bg-emerald-100 text-emerald-700',
    violet: 'bg-violet-100 text-violet-700',
    amber: 'bg-amber-100 text-amber-700',
  }

  return (
    <div className="flex items-start gap-2.5">
      <span className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg ${tones[tone] || tones.slate}`}>
        <Icon size={14} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
        <p className="mt-0.5 break-words text-sm font-semibold text-slate-800" dir={dir || undefined}>
          {dash(value)}
        </p>
      </div>
    </div>
  )
}

function SectionCard({ title, icon: Icon, tone, children, className = '' }) {
  const tones = {
    sky: {
      border: 'border-sky-100',
      head: 'bg-sky-50 border-sky-100 text-sky-800',
      icon: 'bg-sky-600 text-white',
    },
    emerald: {
      border: 'border-emerald-100',
      head: 'bg-emerald-50 border-emerald-100 text-emerald-800',
      icon: 'bg-emerald-600 text-white',
    },
    violet: {
      border: 'border-violet-100',
      head: 'bg-violet-50 border-violet-100 text-violet-800',
      icon: 'bg-violet-600 text-white',
    },
    indigo: {
      border: 'border-indigo-100',
      head: 'bg-indigo-50 border-indigo-100 text-indigo-800',
      icon: 'bg-indigo-600 text-white',
    },
    amber: {
      border: 'border-amber-100',
      head: 'bg-amber-50 border-amber-100 text-amber-800',
      icon: 'bg-amber-500 text-white',
    },
  }
  const t = tones[tone] || tones.sky

  return (
    <section className={`overflow-hidden rounded-2xl border bg-white shadow-sm ${t.border} ${className}`}>
      <div className={`flex items-center gap-2.5 border-b px-4 py-3 ${t.head}`}>
        <span className={`grid h-8 w-8 place-items-center rounded-lg ${t.icon}`}>
          <Icon size={16} />
        </span>
        <h3 className="text-sm font-bold tracking-wide">{title}</h3>
      </div>
      <div className="p-4">{children}</div>
    </section>
  )
}

function QuickAttr({ icon: Icon, label, value, className = '', compact = false, tone = 'sky' }) {
  const tones = {
    sky: 'bg-sky-100 text-sky-700',
    violet: 'bg-violet-100 text-violet-700',
    emerald: 'bg-emerald-100 text-emerald-700',
    amber: 'bg-amber-100 text-amber-700',
  }

  return (
    <div
      className={`flex min-w-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm ${
        compact ? 'max-w-[7.5rem] shrink-0' : ''
      } ${className}`.trim()}
    >
      <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${tones[tone] || tones.sky}`}>
        <Icon size={15} />
      </span>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
        <p className={`text-sm font-semibold text-slate-800 ${compact ? 'truncate' : 'break-words'}`}>
          {dash(value)}
        </p>
      </div>
    </div>
  )
}

export default function StudentProfileModal({
  detail,
  ledgerItems = [],
  includeLedger = false,
  isLedgerLoading = false,
  onToggleLedger,
  onClose,
  onPrint,
}) {
  if (!detail) return null

  const campusCode = localStorage.getItem('campus') || ''
  const printMeta = getCampusPrintMeta()
  const campusLabel = printMeta.campusLabel || getCampusLabel(campusCode)
  const campusPhone = printMeta.phonesDisplay
  const schoolName = printMeta.schoolName
  const logoSrc = printMeta.logoSrc
  const preparedBy = localStorage.getItem('username') || 'Admin'
  const isActive = detail.isActive !== false

  const totalDue = (ledgerItems || []).reduce((sum, row) => sum + Number(row.debit || 0), 0)
  const totalReceived = (ledgerItems || []).reduce((sum, row) => sum + Number(row.credit || 0), 0)
  const outstanding = totalDue - totalReceived

  const ledgerRows = (ledgerItems || []).map((entry, index) => {
    const fundTypeName = entry.fundTypeName || entry.FundTypeName || ''
    let feeMonth = entry.feeMonth || entry.FeeMonth || ''
    let description = entry.description || fundTypeName || '—'
    if (!fundTypeName && entry.description) {
      const parts = String(entry.description).split(' - ')
      description = parts[0] || description
      if (!feeMonth && parts.length > 1) feeMonth = parts.slice(1).join(' - ')
    }
    return {
      key: `${entry.date}-${description}-${index}`,
      date: formatDate(entry.date),
      description,
      feeMonth: feeMonth || '—',
      receiptNo: entry.receiptNo || entry.ReceiptNo || '—',
      due: formatAmount(entry.debit),
      received: formatAmount(entry.credit),
      balance: formatAmount(entry.balance),
    }
  })

  return (
    <div className="fixed inset-0 z-[86] flex items-center justify-center bg-slate-950/50 p-3 backdrop-blur-sm sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="student-profile-title"
        className="flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-slate-100 shadow-2xl"
      >
        {/* Sticky chrome */}
        <div className="shrink-0 border-b border-slate-200 bg-white px-4 py-3 sm:px-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <img
                src={logoSrc}
                alt=""
                className="h-12 w-12 shrink-0 rounded-full object-contain sm:h-14 sm:w-14"
              />
              <div className="min-w-0">
                <h2 id="student-profile-title" className="text-base font-bold uppercase tracking-wide text-[var(--campus-primary)] sm:text-lg">
                  {schoolName}
                </h2>
                <p className="text-xs text-slate-500 sm:text-sm">{campusLabel}</p>
                <p className="text-xs text-slate-500">Tel: {campusPhone}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              {typeof onToggleLedger === 'function' ? (
                <button
                  type="button"
                  role="switch"
                  aria-checked={includeLedger}
                  aria-label="Fee ledger"
                  disabled={isLedgerLoading}
                  onClick={onToggleLedger}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 disabled:opacity-60"
                >
                  <span className="text-xs font-semibold text-slate-600 sm:text-sm">Fee ledger</span>
                  {isLedgerLoading ? (
                    <Loader2 size={16} className="animate-spin text-[var(--campus-primary)]" aria-hidden="true" />
                  ) : (
                    <span
                      className={`relative h-5 w-9 shrink-0 rounded-full transition ${
                        includeLedger ? 'bg-[var(--campus-primary)]' : 'bg-slate-300'
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition ${
                          includeLedger ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </span>
                  )}
                </button>
              ) : null}
              <button
                type="button"
                onClick={onPrint}
                className="inline-flex items-center gap-2 rounded-lg bg-[var(--campus-primary)] px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#34457c]"
              >
                <Printer size={16} />
                Print Profile
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-y-auto p-3 sm:p-5">
          <div className="space-y-4">
            {/* Hero summary */}
            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch lg:justify-between">
                <div className="flex min-w-0 flex-1 flex-col gap-4 sm:flex-row sm:items-start">
                  <div className="flex flex-col items-center gap-2 sm:items-start">
                    <ProfileAvatar gender={detail.gender} />
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                        isActive
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1 space-y-3 text-center sm:text-left">
                    <div>
                      <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                        <h3 className="text-2xl font-bold text-slate-900 sm:text-3xl">
                          {dash(detail.fullName)}
                        </h3>
                        {detail.isHafiz ? (
                          <span
                            className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-emerald-700"
                            title="Hafiz-e-Quran"
                          >
                            <MosqueIcon size={13} />
                            <span className="text-[11px] font-bold tracking-wide">Hafiz</span>
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-sm font-medium text-slate-500">
                        Reg #{detail.regId}
                        {detail.className ? ` • ${detail.className}` : ''}
                      </p>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
                      <QuickAttr
                        icon={Calendar}
                        label="Date of Birth"
                        value={formatDate(detail.dateOfBirth)}
                        tone="sky"
                        className="sm:w-[9.5rem] sm:shrink-0"
                      />
                      <QuickAttr
                        icon={User}
                        label="Gender"
                        value={detail.gender}
                        tone="violet"
                        compact
                      />
                      <QuickAttr
                        icon={Users}
                        label="Father Name"
                        value={detail.fatherName}
                        tone="emerald"
                        className="sm:min-w-0 sm:flex-1"
                      />
                    </div>
                  </div>
                </div>

                <div className="w-full shrink-0 rounded-2xl border border-sky-100 bg-gradient-to-br from-sky-50 to-indigo-50 p-4 lg:w-64">
                  <div className="mb-3 flex items-center gap-2 text-[var(--campus-primary)]">
                    <span className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--campus-primary)] text-white">
                      <GraduationCap size={16} />
                    </span>
                    <p className="text-xs font-bold uppercase tracking-wide">Academic</p>
                  </div>
                  <div className="space-y-2.5">
                    <div>
                      <p className="text-[10px] font-semibold uppercase text-slate-500">Class</p>
                      <p className="text-sm font-bold text-slate-800">{dash(detail.className)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase text-slate-500">Medium</p>
                      <p className="text-sm font-bold text-slate-800">{dash(detail.medium)}</p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Personal + Family */}
            <div className="grid gap-4 lg:grid-cols-2">
              <SectionCard title="Personal Information" icon={UserRound} tone="sky">
                <div className="grid gap-3 sm:grid-cols-2">
                  <FieldRow icon={User} label="Full Name" value={detail.fullName} tone="sky" />
                  <FieldRow icon={Languages} label="Name (Urdu)" value={detail.nameInUrdu} tone="sky" dir="rtl" />
                  <div className="sm:col-span-2">
                    <FieldRow icon={Home} label="Address" value={detail.homeAddress} tone="sky" />
                  </div>
                  <FieldRow icon={MapPin} label="Locality" value={detail.localityName} tone="sky" />
                  <FieldRow icon={Flag} label="Caste" value={detail.caste} tone="sky" />
                  <FieldRow icon={Calendar} label="Date of Birth" value={formatDate(detail.dateOfBirth)} tone="sky" />
                  <FieldRow icon={IdCard} label="Form-B No." value={detail.bFormNum} tone="sky" />
                  <FieldRow icon={User} label="Gender" value={detail.gender} tone="sky" />
                  <FieldRow icon={GraduationCap} label="Subject Group" value={detail.subjectGroupName} tone="sky" />
                  <FieldRow icon={School} label="Previous School" value={detail.prevSchoolName} tone="sky" />
                  <FieldRow icon={BookOpen} label="Previous Class" value={detail.prevSchoolClass} tone="sky" />
                </div>
              </SectionCard>

              <SectionCard title="Family Information" icon={Users} tone="emerald">
                <div className="grid gap-3 sm:grid-cols-2">
                  <FieldRow icon={User} label="Father Name" value={detail.fatherName} tone="emerald" />
                  <FieldRow icon={User} label="Mother Name" value={detail.motherName} tone="emerald" />
                  <FieldRow icon={IdCard} label="Father CNIC" value={detail.fatherCNIC} tone="emerald" />
                  <FieldRow icon={IdCard} label="Mother CNIC" value={detail.motherCNIC} tone="emerald" />
                  <FieldRow icon={Phone} label="Father Mobile" value={detail.fatherMobileNo} tone="emerald" />
                  <FieldRow icon={Phone} label="Mother Mobile" value={detail.motherPhoneNo} tone="emerald" />
                  <FieldRow icon={Briefcase} label="Father Occupation" value={detail.fatherOccupationName} tone="emerald" />
                  <FieldRow icon={Briefcase} label="Mother Occupation" value={detail.motherOccupationName} tone="emerald" />
                  <FieldRow icon={GraduationCap} label="Father Qualification" value={detail.fatherQualificationName} tone="emerald" />
                  <FieldRow icon={GraduationCap} label="Mother Qualification" value={detail.motherQualificationName} tone="emerald" />
                  <FieldRow icon={Phone} label="Home Phone" value={detail.homePhone} tone="emerald" />
                </div>
              </SectionCard>
            </div>

            {/* Office */}
            <SectionCard title="Office / Academic Information" icon={Building2} tone="violet">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                <FieldRow icon={Calendar} label="Reg Date" value={formatDate(detail.regDate)} tone="violet" />
                <FieldRow icon={IdCard} label="Reg No." value={detail.regId} tone="violet" />
                <FieldRow icon={Users} label="Family Code" value={detail.familyCode} tone="violet" />
                <FieldRow icon={GraduationCap} label="Class" value={detail.className} tone="violet" />
                <FieldRow icon={CalendarDays} label="Session" value={detail.sessionSpan} tone="violet" />
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border border-violet-100 bg-violet-50/60 px-3 py-2.5">
                  <p className="text-[10px] font-semibold uppercase text-violet-600">Class Fee</p>
                  <p className="mt-0.5 text-lg font-bold text-slate-900">{formatAmount(detail.classFee)}</p>
                </div>
                <div className="rounded-xl border border-violet-100 bg-violet-50/60 px-3 py-2.5">
                  <p className="text-[10px] font-semibold uppercase text-violet-600">Tuition Fee</p>
                  <p className="mt-0.5 text-lg font-bold text-slate-900">{formatAmount(detail.tuitionFee)}</p>
                </div>
                <div className="rounded-xl border border-violet-100 bg-violet-50/60 px-3 py-2.5">
                  <p className="text-[10px] font-semibold uppercase text-violet-600">Concession</p>
                  <p className="mt-0.5 text-lg font-bold text-slate-900">{formatAmount(detail.feeConcession)}</p>
                </div>
                <div className="rounded-xl border border-violet-100 bg-violet-50/60 px-3 py-2.5">
                  <p className="text-[10px] font-semibold uppercase text-violet-600">Status</p>
                  <span
                    className={`mt-1 inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ${
                      isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            </SectionCard>

            {/* Ledger + Notes */}
            <div className={`grid gap-4 ${includeLedger ? 'lg:grid-cols-5' : ''}`}>
              {includeLedger ? (
                <SectionCard title="Fee Ledger" icon={Receipt} tone="indigo" className="lg:col-span-3">
                  {ledgerRows.length === 0 ? (
                    <p className="py-6 text-center text-sm text-slate-500">No ledger entries found.</p>
                  ) : (
                    <div className="overflow-x-auto rounded-xl border border-slate-200">
                      <table className="min-w-full text-[12px] leading-snug">
                        <thead className="bg-slate-50 text-left text-slate-600">
                          <tr>
                            <th className="px-2.5 py-2 font-semibold">Date</th>
                            <th className="px-2.5 py-2 font-semibold">Description</th>
                            <th className="px-2.5 py-2 font-semibold">Fee Month</th>
                            <th className="px-2.5 py-2 font-semibold">Receipt #</th>
                            <th className="px-2.5 py-2 text-right font-semibold">Due</th>
                            <th className="px-2.5 py-2 text-right font-semibold">Received</th>
                            <th className="px-2.5 py-2 text-right font-semibold">Balance</th>
                          </tr>
                        </thead>
                        <tbody>
                          {ledgerRows.map((row) => (
                            <tr key={row.key} className="border-t border-slate-100">
                              <td className="px-2.5 py-1.5 whitespace-nowrap text-slate-700">{row.date}</td>
                              <td className="px-2.5 py-1.5 text-slate-800">{row.description}</td>
                              <td className="px-2.5 py-1.5 text-slate-600">{row.feeMonth}</td>
                              <td className="px-2.5 py-1.5 text-slate-600">{row.receiptNo}</td>
                              <td className="px-2.5 py-1.5 text-right text-rose-600">{row.due === '—' ? '' : row.due}</td>
                              <td className="px-2.5 py-1.5 text-right text-emerald-700">{row.received === '—' ? '' : row.received}</td>
                              <td className="px-2.5 py-1.5 text-right font-semibold text-slate-800">{row.balance === '—' ? '' : row.balance}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  <div className="mt-3 grid gap-2 sm:grid-cols-3">
                    <div className="rounded-xl border border-rose-100 bg-rose-50 px-3 py-2.5">
                      <p className="text-[10px] font-semibold uppercase text-rose-600">Total Due</p>
                      <p className="text-base font-bold text-rose-700">{formatAmount(totalDue)}</p>
                    </div>
                    <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2.5">
                      <p className="text-[10px] font-semibold uppercase text-emerald-600">Total Received</p>
                      <p className="text-base font-bold text-emerald-700">{formatAmount(totalReceived)}</p>
                    </div>
                    <div className="rounded-xl border border-rose-200 bg-white px-3 py-2.5 shadow-sm">
                      <p className="flex items-center gap-1 text-[10px] font-semibold uppercase text-rose-600">
                        <Wallet size={12} /> Outstanding Balance
                      </p>
                      <p className="text-base font-bold text-rose-700">{formatAmount(outstanding)}</p>
                    </div>
                  </div>
                </SectionCard>
              ) : null}

              <SectionCard
                title="Notes"
                icon={StickyNote}
                tone="amber"
                className={includeLedger ? 'lg:col-span-2' : ''}
              >
                <div className="min-h-[140px] rounded-xl border border-dashed border-amber-200 bg-amber-50/50 px-4 py-3">
                  {detail.specialNotes ? (
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                      {detail.specialNotes}
                    </p>
                  ) : (
                    <p className="text-sm italic text-slate-500">No special notes added.</p>
                  )}
                </div>
              </SectionCard>
            </div>

            {/* Footer */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-500 shadow-sm">
              <p className="inline-flex items-center gap-1.5">
                <CalendarDays size={14} className="text-slate-400" />
                Profile Generated On: {formatDateTime()}
              </p>
              <p className="inline-flex items-center gap-1.5">
                Prepared By:
                <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 font-semibold text-[var(--campus-primary)]">
                  <BadgeCheck size={13} />
                  {preparedBy}
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
