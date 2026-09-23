# Parent app — Student Conduct API

Short handoff for Android. Auth: family login token (`Authorization: Bearer …`).  
Campus on login via `X-Campus`.

---

## Endpoints

| Method | URL | Use |
|--------|-----|-----|
| — | Login response field `conductInbox` | Popup / badge after login |
| GET | `/api/parent/conduct/inbox` | Refresh unread (sibling switch) |
| GET | `/api/parent/conduct/students/{studentId}?month=&year=` | Conduct screen (month) |
| POST | `/api/parent/conduct/acknowledge` | Mark notes as seen |

`month` / `year` optional → current Pakistan month.

---

## Login / inbox

```json
"conductInbox": {
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

Show login popup when `shouldPrompt` is true.

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

```http
POST /api/parent/conduct/acknowledge
```

```json
{ "noteIds": [123, 124] }
```

Send unread note `id`s. Safe to repeat.

---

## Suggested flow

1. Login → if `conductInbox.shouldPrompt` → popup  
2. Conduct screen → GET month for selected student  
3. Acknowledge → POST `noteIds` → refresh inbox  
