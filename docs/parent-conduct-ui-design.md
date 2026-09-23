# Parent app — Student Conduct UI (Android handoff)

Design-only. Matches existing SBS Parents Portal (blue header, white sheets, yellow CTAs).  
API: [`docs/parent-app-api.md`](parent-app-api.md) §10.

**One student at a time** — use the header sibling switcher (same as Dashboard). Conduct screen and popup always bind to the **currently selected** child.

---

## 1. Login / open popup

**When:** After successful login (and optionally after sibling switch), if `conductInbox.shouldPrompt` / `totalUnread > 0` for the selected student (or any sibling — prefer selected first).

**Layout (modal over Dashboard):**

```
┌─────────────────────────────┐
│         [shield icon]       │
│   New conduct updates       │
│  {Name} has {n} unread…     │
│                             │
│  ┌───────────────────────┐  │
│  │ 14 Sept · Class Beh.  │  │  ← from latest / top unread
│  │ Disruptive            │  │     use tags[].name + isGood
│  └───────────────────────┘  │
│  ┌───────────────────────┐  │
│  │ 9 Sept · Class Beh.   │  │
│  │ Talking               │  │
│  └───────────────────────┘  │
│                             │
│  [ Review & acknowledge ]   │  ← yellow primary CTA
│       Remind me later       │  ← text button
└─────────────────────────────┘
```

| Action | Behaviour |
|--------|-----------|
| **Review & acknowledge** | Navigate to Student Conduct for that student (current month). Do **not** ack yet — ack on the full screen after parent sees the list. |
| **Remind me later** | Dismiss popup for this session only. Do not call acknowledge. Show again next cold login if still unread. |

If multiple siblings have unread: popup title can say “Family updates”; show selected student’s preview, with line “Also unread for {other names}” optional. Prefer simplest: **popup for selected student only**; badge on Academics → Student Conduct if any sibling unread.

**Colors for preview rows:**

- `isGood: true` → soft green left stripe / chip  
- `isGood: false` → soft rose/red  
- Mixed note (both tag types) → amber stripe; list each tag as its own line

---

## 2. Student Conduct screen (replace empty state)

**Entry:** Academics → Student Conduct (existing card).

**Chrome:** Same as other Academics details — blue top bar + back, white rounded body, title “Student Conduct”.

### Structure (top → bottom)

1. **Context line** — `{studentName} · {className} · Reg #{id}` (from selected student / month API).
2. **Month switcher** — ‹ September 2026 ›  
   Reload: `GET /api/parent/conduct/students/{id}?month=&year=`
3. **Summary chips** (from `summary`) — four equal tiles:  
   Good | Needs work (`bad`) | Mixed | Total  
   Use same green / rose / amber / gray as campus modal.
4. **List — “What happened”** (primary content)  
   Build rows from `notes[]` → each note’s `tags[]` (fallback: one row with type only if no tags):

   | UI field | API |
   |----------|-----|
   | Day + date | `weekday` + `noteDate` |
   | Type pill | `conductTypeName` |
   | Item (WHAT) | `tags[].name` |
   | Note | `remarks` or “—” |
   | Tone | `tags[].isGood` |

   Unread notes (`isAcknowledged: false`): small blue/gold “New” badge or unread dot.
5. **Optional calendar** (if space) — from `calendarDays[]`; color by `polarity` (`good` / `bad` / `mixed`). Nice-to-have; list is mandatory.
6. **Sticky footer CTA** (only if selected student has unread in this month, or any unread for that student):  
   **Acknowledge unread ({n})** — yellow full-width button.

### Acknowledge

- Enabled when there is at least one `isAcknowledged: false` note for this student (prefer current month visible list; or all unread for student from inbox).
- On tap: `POST /api/parent/conduct/acknowledge` with those `noteIds`.
- Success: clear New badges, disable/hide button, refresh inbox cache. Toast: “Marked as seen.”
- Empty month: keep current empty illustration + copy (no acknowledge button).

### Sibling switch (while on this screen)

Re-fetch month report for new `studentId`. Update chips/list/CTA. Do not auto-ack.

---

## 3. Mapping cheatsheet for Android

```
Login → conductInbox.shouldPrompt → show popup
Popup Review → Conduct screen (selected student, current PK month)
List rows ← notes[].tags[] (name, isGood) + conductTypeName, noteDate, remarks
Summary ← summary.good / .bad / .mixed / .total
Ack ← POST noteIds where !isAcknowledged
Inbox refresh ← GET /api/parent/conduct/inbox (after ack / sibling switch)
```

---

## 4. Copy (user-facing)

| Place | Text |
|-------|------|
| Popup title | New conduct updates |
| Popup body | {Name} has {n} unread notes. |
| Primary CTA | Review & acknowledge |
| Secondary | Remind me later |
| Screen empty | No conduct records to show yet. Notes from school will appear here. |
| Footer CTA | Acknowledge unread ({n}) |
| After ack | Marked as seen. |

Avoid jargon (no “polarity”, “tag id”, “FamilyDbId”) in UI.

---

## 5. Mockups

Generated reference frames (same chat / assets):

- `parent-conduct-screen-mockup.png` — full screen with summary + list + acknowledge  
- `parent-conduct-login-popup-mockup.png` — login overlay  

Use as visual direction; match final spacing/fonts to existing portal components.
