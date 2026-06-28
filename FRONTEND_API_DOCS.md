# Frontend API JSON Reference

This exhaustive table/reference explains the exact JSON body structures expected to be sent, and precisely what JSON structure will be returned on a Status `200/201` success based on the backend handler files.

> **Remember:** All protected endpoints require the `x-user-id` header. **Endpoints under `ml-*` auto-resolve `coupleId` from this header.**

### `POST/PATCH` `/api/admin/announcement`

**Request JSON expected:**
```json
{
  "title": "string",
  "message": "string",
  "priority": "string",
  "expiresAt": "string (ISO Date)",
}
```

**Success Response (2xx):**
```javascript
{ data: announcement }, { status: 201 }
```

---

### `GET/DELETE` `/api/admin/announcements`

**Request Body:** None required.

**Success Response (2xx):**
```javascript
{ data: announcements }, { status: 200 }
```

---

### `GET/DELETE` `/api/admin/content/[type]/[id]`

**Request Body:** None. Path parameter provides ID.

**Success Response (2xx):**
```javascript
{ message: `${type} content deleted successfully` }, { status: 200 }
```

---

### `GET/DELETE` `/api/admin/couples`

**Request Body:** None required.

**Success Response (2xx):**
```javascript
couples
```

---

### `GET/DELETE` `/api/admin/couples/[id]`

**Request Body:** None. Path parameter provides ID.

**Success Response (2xx):**
```javascript
{ message: 'Couple successfully dissolved and data redacted' }, { status: 200 }
```

---

### `GET/DELETE` `/api/admin/logs`

**Request Body:** None required.

**Success Response (2xx):**
```javascript
logs
```

---

### `GET/DELETE` `/api/admin/reports`

**Request Body:** None required.

**Success Response (2xx):**
```javascript
{ data: mappedReports, nextCursor }, { status: 200 }
```

---

### `POST/PATCH` `/api/admin/reports/[id]/resolve`

**Request JSON expected:**
```json
{
  "action": "string",
  "adminNotes": "string",
}
```

**Success Response (2xx):**
```javascript
{ data: updatedReport }, { status: 200 }
```

---

### `GET/DELETE` `/api/admin/stats`

**Request Body:** None required.

**Success Response (2xx):**
```javascript
{ data: { users: { total: totalUsers, active7d: activeUsers, new30d: newUsers }, couples: { total: totalCouples, active: activeCouples }
```

---

### `POST/PATCH` `/api/admin/users`

**Request JSON expected:**
```json
{
  "action": "string",
  "email": "string",
}
```

**Success Response (2xx):**
```javascript
users
```

---

### `POST/PATCH` `/api/admin/users/[id]`

**Request JSON expected:**
```json
{
  "role": "string",
  "isActive": "boolean",
}
```

**Success Response (2xx):**
```javascript
{ data: updatedUser }, { status: 200 }
```

---

### `POST/PATCH` `/api/auth/forgot-password`

**Request JSON expected:**
```json
{
  "email": "string",
}
```

**Success Response (2xx):**
```javascript
{ success: true, message: 'If an account exists, a reset link was sent.' }, { status: 200 }
```

---

### `POST/PATCH` `/api/auth/google`

**Request JSON expected:**
```json
{
  "idToken": "string",
}
```

**Success Response (2xx):**
```javascript
{ message: 'Google Login successful', user: { id: user.id, email: user.email, displayName: user.displayName, avatarUrl: user.avatarUrl }
```

---

### `POST/PATCH` `/api/auth/login`

**Request JSON expected:**
```json
{
  "email": "string",
  "password": "string",
}
```

**Success Response (2xx):**
```javascript
{ message: 'Login successful', user: { id: user.id, email: user.email, displayName: user.displayName }, accessToken, }
```

---

### `GET/DELETE` `/api/auth/logout`

**Request Body:** None required.

**Success Response (2xx):**
```javascript
{ message: 'Logged out successfully' }, { status: 200 }
```

---

### `GET/DELETE` `/api/auth/logout-all`

**Request Body:** None required.

**Success Response (2xx):**
```javascript
{ message: 'Successfully logged out from all devices' }, { status: 200 }
```

---

### `GET/DELETE` `/api/auth/refresh`

**Request Body:** None required.

**Success Response (2xx):**
```javascript
{ accessToken }, { status: 200 }
```

---

### `POST/PATCH` `/api/auth/register`

**Request JSON expected:**
```json
{
  "email": "string",
  "password": "string",
  "displayName": "string",
}
```

**Success Response (2xx):**
```javascript
{ message: 'Registration successful', user: { id: user.id, email: user.email, displayName: user.displayName }, accessToken, reqId, }
```

---

### `POST/PATCH` `/api/auth/reset-password`

**Request JSON expected:**
```json
{
  "email": "string",
  "token": "string",
  "newPassword": "string",
}
```

**Success Response (2xx):**
```javascript
{ success: true, message: 'Password has been reset successfully' }, { status: 200 }
```

---

### `GET/DELETE` `/api/chat/heartbeat`

**Request Body:** None required.

**Success Response (2xx):**
```javascript
{ success: true, lastSeen: user.updatedAt.toISOString(
```

---

### `POST/PATCH` `/api/chat/presence`

**Request JSON expected:**
```json
{
  "type": "string",
  "isActive": "boolean",
}
```

**Success Response (2xx):**
```javascript
{ success: true, broadcasted: type }
```

---

### `GET/DELETE` `/api/health/db`

**Request Body:** None required.

**Success Response (2xx):**
```javascript
{ ok: true, result }, { status: 200 }
```

---

### `GET/DELETE` `/api/messages/media`

**Request Body:** None required.

**Success Response (2xx):**
```javascript
message
```

---

### `POST/PATCH` `/api/messages`

**Request JSON expected:**
```json
{
  "content": "string",
  "type": "string",
  "replyToId": "string (UUID)",
}
```

**Success Response (2xx):**
```javascript
message
```

---

### `GET/DELETE` `/api/ml-bedtime/complete`

**Request Body:** None required.

**Success Response (2xx):**
```javascript
{ success: true, event }, { status: 200 }
```

---

### `GET/DELETE` `/api/ml-bedtime/status`

**Request Body:** None required.

**Success Response (2xx):**
```javascript
{ status: { reflectionCompleted: !!reflection, gratitudeCompleted: !!gratitude, prayerCompleted: !!prayer, ritualCompleted: !!completionEvent, } }
```

---

### `GET/DELETE` `/api/ml-chat/archive`

**Request Body:** None required.

**Success Response (2xx):**
```javascript
{ success: true, archive }, { status: 200 }
```

---

### `GET/DELETE` `/api/ml-chat/clear-mine`

**Request Body:** None required.

**Success Response (2xx):**
```javascript
{ success: true, message: 'Chat cleared for you' }, { status: 200 }
```

---

### `POST/PATCH` `/api/ml-chat/delete`

**Request JSON expected:**
```json
{
  "messageId": "string (UUID)",
  "type": "string",
}
```

**Success Response (2xx):**
```javascript
{ success: true }, { status: 200 }
```

---

### `POST/PATCH` `/api/ml-chat/edit`

**Request JSON expected:**
```json
{
  "id": "string",
  "content": "string",
}
```

**Success Response (2xx):**
```javascript
{ message: updatedMessage }, { status: 200 }
```

---

### `GET/DELETE` `/api/ml-chat/export`

**Request Body:** None required.

**Success Response (2xx):**
```javascript
{}
```

---

### `GET/DELETE` `/api/ml-chat/history`

**Request Body:** None required.

**Success Response (2xx):**
```javascript
{ messages: formattedMessages }, { status: 200 }
```

---

### `GET/DELETE` `/api/ml-chat/media`

**Request Body:** None required.

**Success Response (2xx):**
```javascript
{ success: true, gallery }, { status: 200 }
```

---

### `POST/PATCH` `/api/ml-chat/message/[id]`

**Request JSON expected:**
```json
{
  "content": "string",
}
```

**Success Response (2xx):**
```javascript
{ data: message }, { status: 200 }
```

---

### `POST/PATCH` `/api/ml-chat/react`

**Request JSON expected:**
```json
{
  "messageId": "string (UUID)",
  "emoji": "string",
}
```

**Success Response (2xx):**
```javascript
{ success: true, action: actionType }, { status: 200 }
```

---

### `POST/PATCH` `/api/ml-chat/read`

**Request JSON expected:**
```json
{
  "messageIds": "string (UUID)",
}
```

**Success Response (2xx):**
```javascript
{ success: true, updatedCount: 0 }, { status: 200 }
```

---

### `POST/PATCH` `/api/ml-chat/reply`

**Request JSON expected:**
```json
{
  "messageId": "string (UUID)",
  "content": "string",
  "type": "string",
  "mediaUrl": "string",
}
```

**Success Response (2xx):**
```javascript
{ success: true, message }, { status: 200 }
```

---

### `GET/DELETE` `/api/ml-chat/search`

**Request Body:** None required.

**Success Response (2xx):**
```javascript
{ success: true, data: messages, pagination: { total, page, limit } }, { status: 200 }
```

---

### `POST/PATCH` `/api/ml-chat/send`

**Request JSON expected:**
```json
{
  "type": "string",
  "content": "string",
  "mediaUrl": "string",
  "fileName": "string",
  "fileSize": "string",
  "duration": "string",
}
```

**Success Response (2xx):**
```javascript
{ success: true, message }, { status: 200 }
```

---

### `GET/DELETE` `/api/ml-chat/settings`

**Request Body:** None required.

**Success Response (2xx):**
```javascript
{ success: true, settings }, { status: 200 }
```

---

### `POST/PATCH` `/api/ml-chat/star`

**Request JSON expected:**
```json
{
  "messageId": "string (UUID)",
}
```

**Success Response (2xx):**
```javascript
{ success: true, star }, { status: 200 }
```

---

### `GET/DELETE` `/api/ml-chat/starred`

**Request Body:** None required.

**Success Response (2xx):**
```javascript
{ success: true, messages }, { status: 200 }
```

---

### `GET/DELETE` `/api/ml-chat/stats`

**Request Body:** None required.

**Success Response (2xx):**
```javascript
{ success: true, stats }, { status: 200 }
```

---

### `GET/DELETE` `/api/ml-chat/unarchive`

**Request Body:** None required.

**Success Response (2xx):**
```javascript
{ success: true }, { status: 200 }
```

---

### `GET/DELETE` `/api/ml-couple/block`

**Request Body:** None required.

**Success Response (2xx):**
```javascript
{ success: true, message: 'Partner has been blocked successfully', couple: updatedCouple }, { status: 200 }
```

---

### `POST/PATCH` `/api/ml-couple/create`

**Request Body:** None required.

**Success Response (2xx):**
```javascript
{ message: 'Pending couple created successfully!', inviteCode, couple }, { status: 201 }
```

---

### `POST/PATCH` `/api/ml-couple/invite/resend`

**Request JSON expected:**
```json
{
  "partnerEmail": "string",
}
```

**Success Response (2xx):**
```javascript
{ success: true, message: 'Invite resent successfully', inviteCode: newInviteCode }, { status: 200 }
```

---

### `POST/PATCH` `/api/ml-couple/join`

**Request JSON expected:**
```json
{
  "partnerEmail": "string",
  "anniversaryDate": "string (ISO Date)",
}
```

**Success Response (2xx):**
```javascript
{ message: 'Successfully joined via invite code!', couple }, { status: 200 }
```

---

### `GET/DELETE` `/api/ml-couple/partner-email`

**Request Body:** None required.

**Success Response (2xx):**
```javascript
{ coupleId: couple.id, inviteCode: couple.inviteCode, me, partner: null, message: 'No partner has joined yet. Share your invite code!', }
```

---

### `POST/PATCH` `/api/ml-couple/profile`

**Request JSON expected:**
```json
{
  "anniversaryDate": "string (ISO Date)",
}
```

**Success Response (2xx):**
```javascript
{ success: true, anniversaryDate: updatedCouple.anniversaryDate }, { status: 200 }
```

---

### `GET/DELETE` `/api/ml-couple`

**Request Body:** None required.

**Success Response (2xx):**
```javascript
{ success: true, message: 'Couple connection and all shared data deleted' }, { status: 200 }
```

---

### `GET/DELETE` `/api/ml-couple/unblock`

**Request Body:** None required.

**Success Response (2xx):**
```javascript
{ success: true, message: 'Partner has been unblocked', couple: updatedCouple }, { status: 200 }
```

---

### `POST/PATCH` `/api/ml-device/register`

**Request JSON expected:**
```json
{
  "platform": "string",
  "deviceName": "string",
  "fcmToken": "string",
}
```

**Success Response (2xx):**
```javascript
{ success: true, device }, { status: 200 }
```

---

### `GET/DELETE` `/api/ml-discussion/history`

**Request Body:** None required.

**Success Response (2xx):**
```javascript
{ data: items, nextCursor }, { status: 200 }
```

---

### `GET/DELETE` `/api/ml-discussion/today`

**Request Body:** None required.

**Success Response (2xx):**
```javascript
{ topic: { question, type, date: topic.date } }, { status: 200 }
```

---

### `POST/PATCH` `/api/ml-gratitude/create`

**Request JSON expected:**
```json
{
  "content": "string",
  "date": "string",
  "isShared": "boolean",
}
```

**Success Response (2xx):**
```javascript
{ entry }, { status: 201 }
```

---

### `POST/PATCH` `/api/ml-gratitude/delete`

**Request JSON expected:**
```json
{
  "id": "string",
}
```

**Success Response (2xx):**
```javascript
{ success: true }, { status: 200 }
```

---

### `GET/DELETE` `/api/ml-gratitude/list`

**Request Body:** None required.

**Success Response (2xx):**
```javascript
{ entries }, { status: 200 }
```

---

### `POST/PATCH` `/api/ml-gratitude/update`

**Request JSON expected:**
```json
{
  "id": "string",
  "content": "string",
  "date": "string",
  "isShared": "boolean",
}
```

**Success Response (2xx):**
```javascript
{ entry: updatedEntry }, { status: 200 }
```

---

### `POST/PATCH` `/api/ml-jar/add`

**Request JSON expected:**
```json
{
  "content": "string",
  "category": "string",
}
```

**Success Response (2xx):**
```javascript
{ reason }, { status: 201 }
```

---

### `GET/DELETE` `/api/ml-jar/all`

**Request Body:** None required.

**Success Response (2xx):**
```javascript
{ data: items, nextCursor }, { status: 200 }
```

---

### `POST/PATCH` `/api/ml-jar/delete`

**Request JSON expected:**
```json
{
  "id": "string",
}
```

**Success Response (2xx):**
```javascript
{ success: true }, { status: 200 }
```

---

### `GET/DELETE` `/api/ml-jar/random`

**Request Body:** None required.

**Success Response (2xx):**
```javascript
{ reason: randomReason }, { status: 200 }
```

---

### `GET/DELETE` `/api/ml-jar/search`

**Request Body:** None required.

**Success Response (2xx):**
```javascript
{ reasons }, { status: 200 }
```

---

### `GET/DELETE` `/api/ml-jar/[id]`

**Request Body:** None. Path parameter provides ID.

**Success Response (2xx):**
```javascript
null
```

---

### `POST/PATCH` `/api/ml-letter/create`

**Request JSON expected:**
```json
{
  "title": "string",
  "content": "string",
  "deliverAt": "string (ISO Date)",
  "isDraft": "boolean",
}
```

**Success Response (2xx):**
```javascript
{ message: 'Letter scheduled successfully', letter }, { status: 201 }
```

---

### `POST/PATCH` `/api/ml-letter/draft`

**Request JSON expected:**
```json
{
  "id": "string",
  "title": "string",
  "content": "string",
  "deliverAt": "string (ISO Date)",
  "isDraft": "boolean",
}
```

**Success Response (2xx):**
```javascript
{ letter: updatedLetter }, { status: 200 }
```

---

### `GET/DELETE` `/api/ml-letter/list`

**Request Body:** None required.

**Success Response (2xx):**
```javascript
{ letters: formattedLetters }, { status: 200 }
```

---

### `POST/PATCH` `/api/ml-letter/read`

**Request JSON expected:**
```json
{
  "id": "string",
}
```

**Success Response (2xx):**
```javascript
{ letter: updatedLetter }, { status: 200 }
```

---

### `POST/PATCH` `/api/ml-notes/archive`

**Request JSON expected:**
```json
{
  "id": "string",
}
```

**Success Response (2xx):**
```javascript
{ note: updatedNote }, { status: 200 }
```

---

### `POST/PATCH` `/api/ml-notes/create`

**Request Body:** None required.

**Success Response (2xx):**
```javascript
{ note }, { status: 201 }
```

---

### `POST/PATCH` `/api/ml-notes/delete`

**Request JSON expected:**
```json
{
  "id": "string",
}
```

**Success Response (2xx):**
```javascript
{ success: true }, { status: 200 }
```

---

### `GET/DELETE` `/api/ml-notes/list`

**Request Body:** None required.

**Success Response (2xx):**
```javascript
{ notes: formattedNotes }, { status: 200 }
```

---

### `POST/PATCH` `/api/ml-notes/pin`

**Request JSON expected:**
```json
{
  "id": "string",
}
```

**Success Response (2xx):**
```javascript
{ note: updatedNote }, { status: 200 }
```

---

### `POST/PATCH` `/api/ml-notes/update`

**Request JSON expected:**
```json
{
  "id": "string",
  "title": "string",
  "content": "string",
}
```

**Success Response (2xx):**
```javascript
{ note: updatedNote }, { status: 200 }
```

---

### `POST/PATCH` `/api/ml-notes/[id]`

**Request JSON expected:**
```json
{
  "title": "string",
  "content": "string",
}
```

**Success Response (2xx):**
```javascript
{ data: note }, { status: 200 }
```

---

### `POST/PATCH` `/api/ml-notification/history`

**Request JSON expected:**
```json
{
  "notificationId": "string (UUID)",
  "markAllRead": "string",
}
```

**Success Response (2xx):**
```javascript
{ success: true, data: notifications, unreadCount, pagination: { total, page, limit, pages: Math.ceil(total / limit
```

---

### `POST/PATCH` `/api/ml-notification/settings`

**Request JSON expected:**
```json
{
  "pushEnabled": "string",
  "dailyReminder": "string",
  "chatNotifications": "string",
  "partnerActivity": "string",
}
```

**Success Response (2xx):**
```javascript
{ success: true, data: settings }
```

---

### `POST/PATCH` `/api/ml-notify/preferences`

**Request JSON expected:**
```json
{
  "pushEnabled": "string",
  "dailyReminder": "string",
  "chatNotifications": "string",
  "partnerActivity": "string",
}
```

**Success Response (2xx):**
```javascript
{ data: settings }, { status: 200 }
```

---

### `POST/PATCH` `/api/ml-notify/register`

**Request JSON expected:**
```json
{
  "fcmToken": "string",
}
```

**Success Response (2xx):**
```javascript
{ success: true, user: { id: user.id } }, { status: 200 }
```

---

### `POST/PATCH` `/api/ml-prayer/answered`

**Request JSON expected:**
```json
{
  "id": "string",
}
```

**Success Response (2xx):**
```javascript
{ prayer: updatedPrayer }, { status: 200 }
```

---

### `POST/PATCH` `/api/ml-prayer/archive`

**Request JSON expected:**
```json
{
  "id": "string",
}
```

**Success Response (2xx):**
```javascript
{ prayer: updatedPrayer }, { status: 200 }
```

---

### `POST/PATCH` `/api/ml-prayer/create`

**Request JSON expected:**
```json
{
  "content": "string",
  "category": "string",
}
```

**Success Response (2xx):**
```javascript
{ prayer }, { status: 201 }
```

---

### `GET/DELETE` `/api/ml-prayer/list`

**Request Body:** None required.

**Success Response (2xx):**
```javascript
{ prayers: formattedPrayers }, { status: 200 }
```

---

### `POST/PATCH` `/api/ml-prayer/[id]`

**Request JSON expected:**
```json
{
  "content": "string",
  "category": "string",
}
```

**Success Response (2xx):**
```javascript
{ data: { ...prayer, answeredAt: prayer.isAnswered ? prayer.updatedAt : null } }, { status: 200 }
```

---

### `POST/PATCH` `/api/ml-reflection/create`

**Request JSON expected:**
```json
{
  "content": "string",
  "date": "string",
  "isShared": "boolean",
}
```

**Success Response (2xx):**
```javascript
{ reflection }, { status: 201 }
```

---

### `GET/DELETE` `/api/ml-reflection/list`

**Request Body:** None required.

**Success Response (2xx):**
```javascript
{ reflections: formattedReflections }, { status: 200 }
```

---

### `GET/DELETE` `/api/ml-reflection/partner`

**Request Body:** None required.

**Success Response (2xx):**
```javascript
{ reflections }, { status: 200 }
```

---

### `GET/DELETE` `/api/ml-storage/upload`

**Request Body:** None required.

**Success Response (2xx):**
```javascript
{ success: true, url: data.publicUrl, size: file.size, originalName: file.name }, { status: 200 }
```

---

### `POST/PATCH` `/api/ml-timeline/create`

**Request JSON expected:**
```json
{
  "title": "string",
  "description": "string",
  "date": "string",
  "type": "string",
  "mediaUrl": "string",
}
```

**Success Response (2xx):**
```javascript
{ event }, { status: 201 }
```

---

### `POST/PATCH` `/api/ml-timeline/delete`

**Request JSON expected:**
```json
{
  "id": "string",
}
```

**Success Response (2xx):**
```javascript
{ success: true }, { status: 200 }
```

---

### `GET/DELETE` `/api/ml-timeline/list`

**Request Body:** None required.

**Success Response (2xx):**
```javascript
{ events: formattedEvents }, { status: 200 }
```

---

### `GET/DELETE` `/api/ml-verse/favorite/[id]`

**Request Body:** None. Path parameter provides ID.

**Success Response (2xx):**
```javascript
{ message: 'Verse removed from favorites', isFavorite: false }, { status: 200 }
```

---

### `GET/DELETE` `/api/ml-verse/history`

**Request Body:** None required.

**Success Response (2xx):**
```javascript
{ data: items, nextCursor }, { status: 200 }
```

---

### `GET/DELETE` `/api/ml-verse/today`

**Request Body:** None required.

**Success Response (2xx):**
```javascript
{ verse: { reference: reference || '', text: text || cachedVerse.content, version: 'WEB' } }, { status: 200 }
```

---

### `GET/DELETE` `/api/upload`

**Request Body:** None required.

**Success Response (2xx):**
```javascript
{ signedUrl }
```

---

### `GET/DELETE` `/api/upload/status`

**Request Body:** None required.

**Success Response (2xx):**
```javascript
{ id: file.id, url: file.url, type: file.type, size: file.size, createdAt: file.createdAt, }
```

---

### `GET/DELETE` `/api/user/account`

**Request Body:** None required.

**Success Response (2xx):**
```javascript
{ success: true }, { status: 200 }
```

---

### `GET/DELETE` `/api/user/avatar`

**Request Body:** None required.

**Success Response (2xx):**
```javascript
{ success: true, avatarUrl: updatedUser.avatarUrl, message: 'Avatar uploaded successfully', }, { status: 200 }
```

---

### `POST/PATCH` `/api/user/profile`

**Request JSON expected:**
```json
{
  "displayName": "string",
  "avatarUrl": "string",
}
```

**Success Response (2xx):**
```javascript
formatUserWithAvatar(user
```

---

