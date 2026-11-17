# Parent app — Student Conduct API

Short handoff for Android. Auth: family login token (`Authorization: Bearer …`).  
Campus on login via `X-Campus`.

Login does **not** include conduct data — fetch unread after sign-in.

---

## Endpoints

| Method | URL | Use |
|--------|-----|-----|
| GET | `/api/parent/conduct/students/{studentId}/unread-count` | Badge / login popup for one child |
| GET | `/api/parent/conduct/inbox` | All siblings unread (optional) |
| GET | `/api/parent/conduct/students/{studentId}?month=&year=` | Conduct screen (month) |
| POST | `/api/parent/conduct/acknowledge` | Mark specific notes as read |
| POST | `/api/parent/conduct/students/{studentId}/acknowledge-all` | Mark all unread notes for child as read |

`month` / `year` optional → current Pakistan month.

---

## Unread count (`data`)

```json
{
  "studentId": 79,
  "unreadCount": 2,
  "unreadNoteIds": [123, 456]
}
```

`unreadNoteIds` are conduct note ids — pass them as `noteIds` on acknowledge.

Show login popup when `unreadCount > 0` for the selected student.

---

## Inbox (`data`)

```json
{
  "totalUnread": 2,
  "shouldPrompt": true,
  "students": [
    {
      "studentId": 79,
      "studentName": "Hamdan Mohsin",
      "unreadCount": 2,
      "latest": {
        "noteId": 123,
        "noteDate": "2026-09-14",
        "polarity": "bad",
        "conductTypeName": "Class Behaviour",
        "itemLabels": ["Disruptive"],
        "remarks": null
      }
    }
  ]
}
```

---

## Month report (`data`)

```json
{
  "studentId": 79,
  "studentName": "Hamdan Mohsin",
  "className": "Five-Blue",
  "familyId": 45,
  "year": 2026,
  "month": 9,
  "summary": { "good": 0, "bad": 2, "mixed": 0, "total": 2, "unread": 2 },
  "notes": [
    {
      "id": 123,
      "noteDate": "2026-09-14",
      "weekday": "Mon",
      "polarity": "bad",
      "conductTypeName": "Class Behaviour",
      "tags": [{ "id": 10, "name": "Disruptive", "isGood": false }],
      "remarks": null,
      "isAcknowledged": false
    }
  ],
  "calendarDays": [{ "date": "2026-09-14", "polarity": "bad" }]
}
```

**UI mapping**

| Screen | Fields |
|--------|--------|
| Summary chips | `summary.good` / `.bad` / `.mixed` / `.total` |
| List (WHAT) | `notes[].conductTypeName` + `tags[].name` + `tags[].isGood` |
| Date | `notes[].weekday` + `noteDate` |
| Note text | `notes[].remarks` |
| New / unread | `!isAcknowledged` |
| Colors | `isGood: true` → good (green); `false` → needs work (red) |

`polarity`: `good` | `bad` | `mixed` | `none` (whole note).

---

## Acknowledge

Read/unread is stored on each note (server column `ParentAcknowledgedAtPkt`; `null` = unread).

```http
POST /api/parent/conduct/acknowledge
```

```json
{ "noteIds": [123, 124] }
```

```http
POST /api/parent/conduct/students/{studentId}/acknowledge-all
```

```json
{ "acknowledgedCount": 4 }
```

---

## Suggested flow

1. Login → `GET …/students/{regId}/unread-count` → if `unreadCount > 0` → popup  
2. Conduct screen → GET month for selected student  
3. Acknowledge → POST `noteIds` or POST `acknowledge-all` → refresh unread-count or inbox  
