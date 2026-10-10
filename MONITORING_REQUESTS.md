# Monitoring endpoints the dashboard needs

The monitoring page already calls these URLs. Until each one exists, its card shows
"Coming soon"; as soon as the endpoint answers, the card fills in. No frontend change is needed.

Same conventions as `MONITORING_API.md`: support / staff / superuser only, standard app JWT,
`date_from` / `date_to` are inclusive `YYYY-MM-DD`, paginated lists use `{count, next, previous, results}`.

---

## 1. New users, buyers and platforms
`GET /api/monitoring/panel/metrics/users/?date_from=&date_to=`

The page always asks for the last 30 days. **Buyer** = a user whose scope is not the default scope.
**Platform** = where the user signed up (`android`, `ios`, `web`).

```json
{
  "daily": [
    { "date": "2026-09-11", "registered": 12, "buyers": 3 },
    { "date": "2026-09-12", "registered": 9,  "buyers": 1 }
  ],
  "totals": { "registered": 280, "buyers": 79 },
  "platforms_period": [
    { "platform": "android", "count": 154 }, { "platform": "ios", "count": 84 }, { "platform": "web", "count": 42 }
  ],
  "platforms_total": [
    { "platform": "android", "count": 1840 }, { "platform": "ios", "count": 1112 }, { "platform": "web", "count": 406 }
  ]
}
```
- `daily`: one row for **every** day in the range, zeros included.
- `platforms_period`: users who registered inside the range; `platforms_total`: all users, all time.

## 2. Students in chat
`GET /api/monitoring/panel/metrics/chat-students/?date_from=&date_to=&coach=`

Distinct students who sent or received at least one coach-chat message in the range (by message date).
```json
{ "count": 37 }
```

## 3. Chats between a coach and each student
`GET /api/monitoring/panel/metrics/coach-chats/?coach=<id>&date_from=&date_to=`  (paginated)

One row per student of that coach (the same students `coach-students` returns), zeros included.
```json
{ "count": 2, "next": null, "previous": null, "results": [
  { "student": { "id": 11, "name": "Ada", "email": "ada@x.com" }, "message_count": 52, "last_message_at": "2026-10-10T08:12:00Z" },
  { "student": { "id": 12, "name": "Ben", "email": "ben@x.com" }, "message_count": 0,  "last_message_at": null }
]}
```
- `message_count`: messages in the range. `last_message_at`: the latest message ever between them (ignores the range).

## 4. Workouts a coach sent to each student
`GET /api/monitoring/panel/metrics/coach-workouts/?coach=<id>&date_from=&date_to=`  (paginated)

Counts `WorkoutAssignment` rows created by that coach, per student (by `created_date`).
```json
{ "count": 1, "next": null, "previous": null, "results": [
  { "student": { "id": 11, "name": "Ada", "email": "ada@x.com" }, "assigned_count": 6, "last_assigned_at": "2026-10-02T15:40:00Z" }
]}
```

## 5. App comments per month
`GET /api/monitoring/panel/metrics/comments/?months=6`

Top-level course and week-video comments (not replies, not deleted), grouped by the month they were written.
**Answered** = the comment has at least one reply (`reply_count > 0`).
```json
{
  "monthly": [
    { "month": "2026-05", "total": 58, "answered": 46, "unanswered": 12 },
    { "month": "2026-06", "total": 31, "answered": 20, "unanswered": 11 }
  ],
  "totals": { "total": 237, "answered": 167, "unanswered": 70 }
}
```
- `monthly`: one row for **every** month, oldest first, ending with the current month.

---

## Already working with today's API
- Sessions per month for a coach: six `metrics/sessions/?coach=&date_from=&date_to=` calls, one per month.
- Sessions per student for a coach: `metrics/sessions/?coach=&student=`, one call per student.
- Chat message counts per student, used until endpoint 3 exists: `metrics/chat-messages/?coach=&student=`.

These run only when a coach is picked, four at a time. If you'd like fewer calls, a single
`metrics/coach-sessions/?coach=` returning `{monthly: [...], per_student: [...]}` would replace them all.

## Not yet in the app
Session scoring (`occurrences/<id>/score/`) and reporting (`occurrences/<id>/reports/`) exist on the
server, but the mobile app doesn't call them yet, so ratings and reports stay empty until it does.
