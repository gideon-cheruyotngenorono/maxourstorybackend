# Our Story API Documentation - Production Beta

**Base URL**: `https://ourstorybackend-fe24.vercel.app`  
**API Version**: `v1.2 (Enterprise)`  
**Auth Header**: `Authorization: Bearer <access_token>`

---

## 1. Authentication Flow
Endpoints for user onboarding and session management.

### [POST] `/api/auth/register`
Create a new account.
- **Body**: `{ "email": "user@example.com", "password": "securepassword", "displayName": "User Name" }`
- **Returns**: `201 Created` with `{ "message": "User registered", "user": { ... }, "accessToken": "..." }`

### [POST] `/api/auth/login`
Authenticate existing user.
- **Body**: `{ "email": "user@example.com", "password": "password" }`
- **Returns**: `200 OK` with `{ "message": "Login successful", "user": { ... }, "accessToken": "..." }`
- **Note**: Sets an `httpOnly` refresh token as a cookie.

### [POST] `/api/auth/google`
Google Single Sign-In.
- **Body**: `{ "idToken": "google_token_from_android", "displayName?": "Name", "avatarUrl?": "URL" }`
- **Returns**: `200 OK` or `201 Created` with tokens.

### [POST] `/api/auth/refresh`
Refresh access token using the cookie session.
- **Returns**: `200 OK` with new `{ "accessToken": "..." }`

### [POST] `/api/auth/forgot-password`
Initiate password reset.
- **Body**: `{ "email": "..." }`

### [POST] `/api/auth/reset-password`
Complete password reset.
- **Body**: `{ "token": "...", "newPassword": "..." }`

---

## 2. Couple Management
The core relationship logic. Users must be in a couple to access /api/ml-* endpoints.

### [POST] `/api/ml-couple/create`
Initiate a couple invite.
- **Body**: `None`
- **Returns**: `201 Created` with `inviteCode`. Provide this code to the partner.

### [POST] `/api/ml-couple/join`
Join a couple using an invite code.
- **Body**: `{ "inviteCode": "ABC-123" }`
- **Returns**: `200 OK` on successful pairing.

### [GET] `/api/ml-couple/profile`
Fetch couple details (anniversary, partner info, stats).

---

## 3. Real-Time Chat System
Secure, encrypted-at-rest messaging for the couple.

### [GET] `/api/ml-chat/history`
Fetch message history (reverse chronological).
- **Query Params**: `limit` (default 50), `cursor` (message ID for pagination).
- **Returns**: `{ "messages": [...] }`

### [POST] `/api/ml-chat/send`
Send a new message.
- **Body**: `{ "content": "Hello", "type": "TEXT"|"IMAGE"|"VIDEO"|"AUDIO"|"FILE", "mediaUrl?": "...", "replyToId?": "..." }`

### [POST] `/api/ml-chat/read`
Mark messages as read.
- **Body**: `{ "lastMessageId": "..." }`

### [POST] `/api/ml-chat/react`
Add emoji reaction to a message.
- **Body**: `{ "messageId": "...", "emoji": "❤️" }`

### [POST] `/api/ml-storage/upload`
Upload media BEFORE sending message.
- **Body**: `FormData` with `file` and `type` (IMAGE, VIDEO, etc.).
- **Returns**: `{ "url": "..." }`. Pass this URL to `/api/ml-chat/send`.

---

## 4. Shared Space Features
Collaborative tools for the couple.

### [GET/POST/PATCH/DELETE] `/api/ml-notes/*`
- **List**: `/api/ml-notes/list`
- **Create**: `/api/ml-notes/create` (`{ "title", "content", "isPinned" }`)
- **Action**: `/api/ml-notes/pin`, `/api/ml-notes/archive`

### [GET/POST/DELETE] `/api/ml-jar/*`
- **Get Random**: `/api/ml-jar/random` (The "What should we do?" feature).
- **Add**: `/api/ml-jar/add` (`{ "content", "category" }`)

### [GET/POST] `/api/ml-prayer/*`
- **List**: `/api/ml-prayer/list`
- **Mark Answered**: `/api/ml-prayer/answered` (`{ "prayerId": "..." }`)

### [NEW] Gratitude & Reflections
- **Gratitude**: `/api/ml-gratitude/create` (`{ "content", "isShared" }`)
- **Reflection**: `/api/ml-reflection/create` (`{ "content" }`)

### [NEW] Bedtime Ritual
Special end-of-day flow combining reflection, gratitude, and prayer.
- **Get Status**: `/api/ml-bedtime/status` (Check which parts are done for today).
- **Mark Complete**: `/api/ml-bedtime/complete` (Logs the ritual to the timeline).

---

## 5. Timeline & Milestones
A chronological journal of the couple's relationship.

### [GET] `/api/ml-timeline/list`
Fetch relationship events.
### [POST] `/api/ml-timeline/create`
Add a new event.
- **Body**: `{ "title", "description?", "date", "type": "Photo"|"Note"|"Prayer milestone"|..., "mediaUrl?" }`

---

## 6. AI & Faith Features
### [GET] `/api/ml-discussion/today`
Fetch the daily AI-generated discussion topic/question.
### [GET] `/api/ml-verse/today`
Fetch the daily Bible verse of the day.

---

## 6. Notification & Devices (FCM)
### [POST] `/api/ml-device/register`
Link an FCM token to the user's account for push notifications.
- **Body**: `{ "fcmToken": "...", "platform": "ANDROID", "deviceName": "..." }`

### [PATCH] `/api/ml-notification/settings`
Update notification preferences.
- **Body**: `{ "chatNotifications": true, "dailyReminder": true, ... }`

---

## 7. Error Handling
All errors follow this format:  
`{ "error": "Descriptive error message" }`

**Common Status Codes**:
- `400`: Validation error or business logic failure (e.g. invalid invite code).
- `401`: Unauthorized (missing or expired token). Use `/api/auth/refresh`.
- `403`: Forbidden (e.g. attempting to delete partner's private note).
- `429`: Too many requests (Rate limited).
- `500`: Server side error.

---

## Developer Roadmap for Android Integration
1. **Initialize**: Use Retrofit/Ktor with an `Authenticator` or `Interceptor` to handle the `Authorization: Bearer` header.
2. **Auth**: Implement `LoginActivity` and `RegisterActivity`. Store tokens securely in Hash-based storage.
3. **Onboarding**: Handle the "Create/Join Couple" flow before allowing access to main features.
4. **Chat**: Use the `history` endpoint and polling (or implement a WebSocket if real-time is updated).
5. **Media**: Upload to `/api/ml-storage/upload` first, then send the resulting URL in the chat body.
