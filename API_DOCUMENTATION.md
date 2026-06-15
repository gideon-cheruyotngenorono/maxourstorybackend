# Our Story API Documentation

## Authentication
All endpoints (except login/registration if applicable) require a Bearer token in the `Authorization` header.
`Authorization: Bearer <your_jwt_token>`

---

## User Profile Management
### 1. GET /api/user/profile
Fetch current user's profile.
**Returns**: `200 OK` with `{ displayName, email, avatarUrl, createdAt }`.

### 2. PATCH /api/user/profile
Update profile details.
**Body**: `{ displayName?, avatarUrl? }`
**Returns**: `200 OK` with updated profile.

### 3. DELETE /api/user/account
Delete user account.
**Body**: `{ password }` (Confirmation)
**Returns**: `200 OK` on success.

---

## Couple Management
### 4. PATCH /api/ml-couple/profile
Update anniversary or relationship start date.
**Body**: `{ anniversaryDate }`
**Returns**: `200 OK`.

### 5. DELETE /api/ml-couple
Dissolve couple relationship.
**Returns**: `200 OK`.

### 6. POST /api/ml-couple/invite/resend
Resend invite code to partner.
**Returns**: `200 OK`.

---

## Chat System
### 7. DELETE /api/ml-chat/message/:id
Soft delete a message.
**Returns**: `200 OK` with updated message.

### 8. PATCH /api/ml-chat/message/:id
Edit a message (within 5 minutes).
**Body**: `{ content }`
**Returns**: `200 OK`.

### 9. GET /api/ml-chat/message/:id
Fetch single message with reply chain and reactions.
**Returns**: `200 OK`.

---

## The Jar
### 10. DELETE /api/ml-jar/:id
Remove a jar entry.
**Returns**: `204 No Content`.

### 11. GET /api/ml-jar/all
Fetch all jar entries (paginated).
**Query Params**: `cursor`, `limit`
**Returns**: `200 OK` with `{ data: [...], nextCursor }`.

---

## Shared Notes
### 12. GET /api/ml-notes/:id
Fetch single note.
**Returns**: `200 OK`.

### 13. PATCH /api/ml-notes/:id
Edit note title or content.
**Body**: `{ title?, content? }`
**Returns**: `200 OK`.

### 14. DELETE /api/ml-notes/:id
Soft delete note.
**Returns**: `200 OK`.

---

## Prayer Room
### 15. GET /api/ml-prayer/:id
Fetch single prayer.
**Returns**: `200 OK`.

### 16. PATCH /api/ml-prayer/:id
Edit prayer or category.
**Body**: `{ content?, category? }`
**Returns**: `200 OK`.

### 17. DELETE /api/ml-prayer/:id
Soft delete prayer.
**Returns**: `200 OK`.

---

## AI Features & History
### 18. GET /api/ml-discussion/history
Past daily questions (paginated).
**Returns**: `200 OK`.

### 19. GET /api/ml-verse/history
Past daily verses (paginated).
**Returns**: `200 OK`.

### 20. POST /api/ml-verse/favorite/:verseId
Save a verse as favorite.
**Returns**: `200 OK`.

---

## Notifications
### 21. GET /api/ml-notify/preferences
Get notification settings.
**Returns**: `200 OK`.

### 22. PATCH /api/ml-notify/preferences
Update notification settings.
**Body**: `{ pushEnabled?, dailyReminder?, chatNotifications?, partnerActivity? }`
**Returns**: `200 OK`.

---

## Auth
### 23. POST /api/auth/logout
Invalidate session and clear cookies.
**Returns**: `200 OK`.

---

## Admin Panel (Role: admin required)
### 24. GET /api/admin/users
List all users (paginated).
**Query Params**: `search`, `cursor`, `limit`

### 25. GET /api/admin/users/:id
Fetch full user details.

### 26. PATCH /api/admin/users/:id
Update user role or active status.
**Body**: `{ role?, isActive? }`

### 27. DELETE /api/admin/users/:id
Permanently delete user. Requires admin password.

### 28. GET /api/admin/couples
List all couples.

### 29. GET /api/admin/couples/:id
Fetch couple details and stats.

### 30. DELETE /api/admin/couples/:id
Force dissolve a couple.

### 31. GET /api/admin/reports
List moderation reports.

### 32. POST /api/admin/reports/:id/resolve
Resolve a report with an action.
**Body**: `{ action: "warn"|"delete_content"|"ban_user"|"dismiss", adminNotes }`

### 33. DELETE /api/admin/content/:type/:id
Delete specific content (message, note, jar_entry, prayer).

### 34. GET /api/admin/stats
Platform-wide analytics and activity charts.

### 35. POST /api/admin/announcement
Create platform announcement.
**Body**: `{ title, message, priority, expiresAt }`

### 36. GET /api/admin/announcements
List announcements.
