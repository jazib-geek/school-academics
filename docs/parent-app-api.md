# Parent (Android) App API

Intended API surface for the family/parent mobile app.  
Login: **Family ID + password**. There is no separate parent app area in code — these are the endpoints that match typical parent screens (children, attendance, fees, results, diary, news).

> **Status:** Contract for Android developers. Not derived from a client in this repo.

---

## Base

| Item | Value |
|------|--------|
| Base URL | Hosted School API root (e.g. `https://{host}/`) |
| Content-Type | `application/json` |
| Auth | `Authorization: Bearer {token}` on all endpoints except login |
| Campus | Send `X-Campus: {campusKey}` on **login**. After login, campus comes from the JWT `Campus` claim. |
| Campus keys | Configured under `CampusSettings:Campuses` (examples: `main`, `mt`, `nc`, …). Invalid key → `400` `"Invalid Campus."` |
| JSON | camelCase property names |

### Token

Issued by family login. Typical lifetime: **1440 minutes** (`JwtSettings:DurationInMinutes`).

| Claim | Meaning |
|-------|---------|
| `FamilyDbId` | Internal PK of `tblStudentFamilyDetail` |
| `FamilyID` | Family code used at login |
| `Campus` | Campus slug (e.g. `main`) |

JWT audience is `School.ParentApp`.

### Envelope (`ApiResponse<T>`)

Most parent endpoints wrap payloads like this:

```json
{
  "success": true,
  "message": "Login successful.",
  "data": { }
}
```

Failure:

```json
{
  "success": false,
  "message": "Invalid credentials.",
  "data": null
}
```

**Exception:** exam routes below return the payload **directly** (no `success` / `message` / `data` wrapper).

---

## 1. Login

`POST /api/Auth/login`  
Auth: none  
Headers: `X-Campus: {campusKey}` (required unless server default campus is acceptable)

### Body

```json
{
  "familyID": 12345,
  "password": "secret"
}
```

| Field | Type | Required |
|-------|------|----------|
| `familyID` | int | yes |
| `password` | string | yes |

### Success `200` — `data` shape

```json
{
  "id": 1,
  "familyID": 12345,
  "fatherName": "…",
  "fatherContact": "…",
  "motherName": "…",
  "motherContact": "…",
  "fatherCNIC": "…",
  "motherCNIC": "…",
  "homeAddress": "…",
  "token": "eyJ…",
  "students": [
    {
      "regId": 1001,
      "fullName": "Ali Khan",
      "family_Code": 12345,
      "dateOfBirth": "2015-03-01T00:00:00",
      "classCompositeID": 12,
      "className": "Class 5-A",
      "gender": "M",
      "fee": 5000,
      "feeConcession": 0,
      "tutionFee": 5000,
      "isActive": true
    }
  ]
}
```

Use `students[].regId` as **`studentId`** on later calls.  
Children are already in the login payload — `GET /api/student/family/{familyId}` is optional.

After login (and on sibling switch), call `GET /api/parent/conduct/students/{studentId}/unread-count` for the selected child; if `unreadCount > 0`, show the conduct popup. Optional: `GET /api/parent/conduct/inbox` for all siblings at once.

### Errors

| Status | When |
|--------|------|
| `401` | Wrong Family ID / password (`success: false`) |
| `400` | Invalid / missing campus |

---

## 2. Children (optional refresh)

`GET /api/student/family/{familyId}`  
Auth: Bearer

| Param | In | Type |
|-------|----|------|
| `familyId` | path | int (same as login `familyID`) |

### Success `200` — `data` array

```json
[
  {
    "reg_Id": 1001,
    "studentName": "Ali Khan",
    "className": "Class 5-A",
    "fatherName": "…",
    "fatherContact": "…",
    "regDate": "2020-04-01T00:00:00",
    "fee": 5000,
    "concession": 0,
    "actualFee": 5000
  }
]
```

---

## 3. Dashboard (home)

`GET /api/Dashboard/{studentId}`  
Auth: Bearer  

| Param | In | Type | Notes |
|-------|----|------|--------|
| `studentId` | path | int | `regId` from login |

Summary for the selected child: profile snippet, current-month attendance, fee balance, home announcements, and (family JWT only) unread conduct count.

### Success `200` — `data`

```json
{
  "student": {
    "name": "Ali Khan",
    "admissionNo": "1001",
    "className": "Class 5-A"
  },
  "attendance": {
    "totalDays": 18,
    "presentDays": 16,
    "percentage": 88.89
  },
  "fee": {
    "balance": 2500
  },
  "announcements": [
    {
      "id": 1,
      "title": "…",
      "description": "…",
      "date": "2026-09-20T00:00:00"
    }
  ],
  "unreadConductCount": 2,
  "unreadConductNoteIds": [123, 456]
}
```

`unreadConductCount` / `unreadConductNoteIds` are included when the token is a family login (`FamilyDbId` + `FamilyID`, no campus staff `AuthSource`). Otherwise it is `0`. If `studentId` is not an active child of the family → `401`.

---

## 4. Attendance

`GET /api/attendance/student/{studentId}/summary`  
Auth: Bearer

| Param | In | Type | Notes |
|-------|----|------|--------|
| `studentId` | path | int | `regId` from login |
| `month` | query | int? | 1–12 |
| `year` | query | int? | e.g. 2026 |

### Success `200` — `data` array

```json
[
  {
    "id": 1,
    "date": "2026-09-14T00:00:00",
    "status": "P",
    "isPresent": true,
    "monthYear": "September 2026",
    "sectionName": "Class 5-A"
  }
]
```

### Attendance `status` values

| Code | Meaning |
|------|---------|
| `P` | Present |
| `A` | Absent |
| `Lt` | Late |
| `Lv` | Leave |
| `H` | Holiday |

---

## 5. Fee ledger

`GET /api/student/{studentId}/ledger`  
Auth: Bearer

### Success `200` — `data` array

```json
[
  {
    "id": 1,
    "date": "2026-09-01T00:00:00",
    "description": "…",
    "fundTypeName": "Tuition",
    "feeMonth": "September 2026",
    "receiptNo": "R-100",
    "debit": 5000,
    "credit": 0,
    "balance": 5000
  }
]
```

---

## 6. Fee balance

`GET /api/student/{studentId}/fee-balance`  
Auth: Bearer

| Param | In | Type | Notes |
|-------|----|------|--------|
| `studentId` | path | int | |
| `singleStudent` | query | bool | default `false` — when `false`, balance may include siblings under the same family |

### Success `200` — `data`

```json
{
  "studentId": 1001,
  "familyCode": 12345,
  "asOfDate": "2026-09-14T00:00:00",
  "totalGenerated": 15000,
  "totalReceived": 10000,
  "totalDue": 5000,
  "items": [
    {
      "studentId": 1001,
      "studentName": "Ali Khan",
      "className": "Class 5-A",
      "familyCode": 12345,
      "fundTypeId": 1,
      "fundTypeName": "Tuition",
      "month": 9,
      "year": 2026,
      "periodLabel": "Sep 2026",
      "generated": 5000,
      "received": 0,
      "due": 5000
    }
  ]
}
```

`404` if student not found.

---

## 7. Exam types

`GET /api/exam/types`  
Auth: Bearer (family login)

**Not wrapped** in `ApiResponse` — response body is the array itself.

Returns the **top 5 active** exam types, ordered by `priority` (lowest number first). Campus staff calls to the same URL still return the full active list.

```json
[
  {
    "id": 1,
    "name": "Mid Term",
    "priority": 1
  }
]
```

Use `id` as `examTypeId` for the result card.

---

## 8. Result card

`GET /api/exam/{studentId}/result/{examTypeId}`  
Auth: Bearer  

**Not wrapped** in `ApiResponse`.

| Param | In | Type | Notes |
|-------|----|------|--------|
| `studentId` | path | int | |
| `examTypeId` | path | int | from `/api/exam/types` |
| `includeDrawing` | query | bool | default `false` |
| `includeStemp` | query | bool | default `false` |

### Success `200`

```json
{
  "studentId": 1001,
  "examTypeId": 1,
  "studentName": "Ali Khan",
  "fatherName": "…",
  "className": "Class 5-A",
  "gender": "M",
  "address": "…",
  "examTypeName": "Mid Term",
  "attendanceRatio": "…",
  "longRemarks": "…",
  "totalMarks": 500,
  "totalObtained": 420,
  "percentage": 84,
  "grade": "A",
  "remarks": "…",
  "position": 3,
  "positionDisplay": "3rd",
  "subjects": [
    {
      "subjectId": 10,
      "subjectName": "Math",
      "totalMarks": 100,
      "passingMarks": 40,
      "obtainedMarks": 85,
      "percentage": 85,
      "usesGradeDisplay": false,
      "subjectGrade": null
    }
  ]
}
```

`404` if no result for that student + exam type.

---

## 9. Class diary

`GET /api/class-diary/student/{studentId}`  
Auth: Bearer

Diaries for the student’s class (via section).

### Success `200` — `data` array

```json
[
  {
    "classId": 12,
    "className": "Class 5-A",
    "date": "2026-09-14",
    "imgUrls": "https://…/a.jpg,https://…/b.jpg",
    "imageCount": 2
  }
]
```

`imgUrls` is a comma-separated list of one or two image URLs.

---

## 10. News & events

`GET /api/NewsAndEvents` — all active  
`GET /api/NewsAndEvents/home` — home-only (`showOnHome`)  
Auth: Bearer

### Success `200` — `data` array

```json
[
  {
    "id": 1,
    "date": "2026-09-01T00:00:00",
    "title": "Sports Day",
    "type": "Event",
    "description": "…",
    "imagePath": "/uploads/…",
    "showOnHome": true
  }
]
```

---

## 11. Student conduct (Family Portal)

Family-scoped. Requires family JWT (`FamilyID` + `FamilyDbId` claims; no `AuthSource`).

**Polarity** (server-computed from tag `isGood`):

| Value | Meaning |
|-------|---------|
| `good` | Only positive tags |
| `bad` | Only needs-work tags |
| `mixed` | Both good and needs-work tags |
| `none` | No tags |

### Unread count (selected student)

`GET /api/parent/conduct/students/{studentId}/unread-count`  
Auth: Bearer  

Student must be an active child of the signed-in family.

```json
{
  "studentId": 1001,
  "unreadCount": 2,
  "unreadNoteIds": [123, 456]
}
```

Use `unreadNoteIds` as `noteIds` on `POST /api/parent/conduct/acknowledge`.

### Inbox (all siblings)

`GET /api/parent/conduct/inbox`  
Auth: Bearer  

```json
{
  "totalUnread": 2,
  "shouldPrompt": true,
  "students": [
    {
      "studentId": 1001,
      "studentName": "Ali Khan",
      "unreadCount": 2,
      "latest": { "noteId": 123, "noteDate": "2026-09-14", "polarity": "bad", "conductTypeName": "Class Behaviour", "itemLabels": ["Disruptive"], "remarks": null }
    }
  ]
}
```

### Month report

`GET /api/parent/conduct/students/{studentId}?month=&year=`  
Auth: Bearer  

Defaults to current Pakistan month/year if omitted. Student must be an active child of the signed-in family.

### Success `200` — `data`

```json
{
  "studentId": 79,
  "studentName": "Hamdan Mohsin",
  "className": "Five-Blue",
  "familyId": 12345,
  "year": 2026,
  "month": 9,
  "summary": {
    "good": 0,
    "bad": 2,
    "mixed": 0,
    "total": 2,
    "unread": 2
  },
  "notes": [
    {
      "id": 123,
      "noteDate": "2026-09-14",
      "weekday": "Mon",
      "polarity": "bad",
      "conductTypeId": 1,
      "conductTypeName": "Class Behaviour",
      "tags": [
        { "id": 10, "name": "Disruptive", "isGood": false }
      ],
      "remarks": null,
      "recordedByName": "Teacher Name",
      "isAcknowledged": false,
      "createdAtPkt": "2026-09-14T10:00:00"
    }
  ],
  "calendarDays": [
    { "date": "2026-09-09", "polarity": "bad" },
    { "date": "2026-09-14", "polarity": "bad" }
  ]
}
```

### Acknowledge notes

Read state is stored on each conduct note (`ParentAcknowledgedAtPkt` on the server). Unread = not yet acknowledged by the family.

`POST /api/parent/conduct/acknowledge`  
Auth: Bearer  

```json
{
  "noteIds": [123, 456]
}
```

Marks the given notes as read. Safe to call repeatedly (idempotent).

### Acknowledge all for one student

`POST /api/parent/conduct/students/{studentId}/acknowledge-all`  
Auth: Bearer  
Body: none

Marks **every** unread conduct note for that child as read.

```json
{
  "acknowledgedCount": 4
}
```

---

## 12. Leave applications (Family Portal)

Parents submit leave for a selected child; campus staff approve or reject on the web portal. Attendance is updated when a decision is made (`Lv` approved, `A` rejected).

### Reason catalog

`GET /api/parent/leave/reasons`  
Auth: Bearer (family JWT only)

### Success `200` — `data` array

```json
[
  { "code": "sick", "label": "Sick" },
  { "code": "transport_issue", "label": "Transport issue" },
  { "code": "domestic_issue", "label": "Domestic issue" },
  { "code": "out_of_city", "label": "Out of city" },
  { "code": "family_function", "label": "Family function" },
  { "code": "weather_road", "label": "Weather / road condition" },
  { "code": "other", "label": "Other" }
]
```

| Code | Label |
|------|--------|
| `sick` | Sick |
| `transport_issue` | Transport issue |
| `domestic_issue` | Domestic issue |
| `out_of_city` | Out of city |
| `family_function` | Family function |
| `weather_road` | Weather / road condition |
| `other` | Other (details required) |

### List (readonly)

`GET /api/parent/leave/students/{studentId}`  
Auth: Bearer

Newest leave date first.

### Success `200` — `data`

```json
{
  "items": [
    {
      "id": 10,
      "leaveDate": "2026-09-12",
      "reasonCode": "sick",
      "reasonLabel": "Sick",
      "reasonDetails": "Fever since morning",
      "status": "pending",
      "statusLabel": "Pending",
      "submittedAtPkt": "2026-09-12T08:15:00",
      "reviewedAtPkt": null
    }
  ]
}
```

### Status values

| `status` | Meaning |
|----------|---------|
| `pending` | Awaiting campus decision |
| `approved` | Approved; attendance marked leave (`Lv`) |
| `rejected` | Rejected; attendance marked absent (`A`) |

### Submit

`POST /api/parent/leave/students/{studentId}`  
Auth: Bearer

```json
{
  "leaveDate": "2026-09-12",
  "reasonCode": "sick",
  "reasonDetails": "Optional; required when reason is other (max 500 chars)"
}
```

- `leaveDate` must be **today or a future date** (campus timezone / PKT on server).
- Only one **pending** request per student per date.

### Success `200` — `data`

```json
{
  "id": 10,
  "status": "pending"
}
```

---

## Suggested Android flow

1. User picks campus → `X-Campus`.
2. `POST /api/Auth/login` with Family ID + password.
3. Store `token` + `students`.
4. `GET /api/Dashboard/{regId}` for home summary (includes `unreadConductCount` for conduct badge/popup).
5. If `unreadConductCount > 0`, show conduct popup; acknowledge after parent dismisses/views.
6. Send `Authorization: Bearer {token}` on later calls.
7. On sibling switch: dashboard and/or `GET /api/parent/conduct/students/{id}/unread-count` / inbox / month report.
8. Per selected child (`regId`):
   - Conduct → `/api/parent/conduct/students/{id}?month=&year=`
   - Leave → `/api/parent/leave/reasons`, `POST /api/parent/leave/students/{id}`, `GET /api/parent/leave/students/{id}`
   - Attendance → `/api/attendance/student/{id}`
   - Fees → `/ledger` and/or `/fee-balance`
   - Results → `/api/exam/types` (top 5 by priority) then `/api/exam/{id}/result/{examTypeId}`
   - Diary → `/api/class-diary/student/{id}`
9. Optional home feed: `/api/NewsAndEvents/home`

---

## Notes / limits

- Prefer parent-scoped routes (`/api/parent/...`) for Family Portal features. Do **not** call campus admin / employee write APIs from the parent app.
- Prefer **POST** for any future mutations (hosting may block HTTP PUT).
- Exam endpoints omit the `ApiResponse` envelope — handle them separately in the client.
- Field naming is slightly inconsistent (`regId` vs `reg_Id`, `familyID` vs `family_Code`); use the examples above as the source of truth.
