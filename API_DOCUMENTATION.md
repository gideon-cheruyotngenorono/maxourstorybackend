# Our Story API Integration Guide (Exhaustive Contract)

Base URL: `https://maxourstorybackend.vercel.app`

## Global Rules & Headers

**Required Headers for Protected Routes:**
- `x-user-id`: The User ID (UUID) obtained during Login/Register. This is the **only** identity signal the backend needs — every couple-aware endpoint auto-detects the couple from this.
- `Authorization`: Bearer token (Access Token).
- `Content-Type: application/json` — Required for all `POST`, `PATCH`, `PUT` requests with a JSON body. **Do NOT set this for multipart/form-data uploads.**

> [!IMPORTANT]
> **You almost never need to send `coupleId` manually.** Every endpoint resolves it automatically from your `x-user-id`. Only messages (GET) may optionally accept it for admin overrides.

---

## Core Data Models

```typescript
interface User {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  avatarInitials?: string | null;
  createdAt?: string;
}

interface Couple {
  id: string;
  partnerAId: string;
  partnerBId: string | null;
  anniversaryDate: string | null;
  inviteCode: string | null;
  isBlocked: boolean;        // true = communication severed
  blockedById: string | null; // which partner initiated block
  createdAt: string;
  partnerA?: User;
  partnerB?: User | null;
}

interface Message {
  id: string;
  coupleId: string;
  senderId: string;
  content: string | null;
  type: "TEXT" | "IMAGE" | "VIDEO" | "AUDIO" | "FILE" | "SYSTEM";
  status: "SENT" | "DELIVERED" | "READ";
  mediaUrl: string | null;
  thumbnailUrl: string | null;
  fileName: string | null;
  fileSize: number | null;
  duration: number | null;
  mimeType: string | null;
  size: number | null;
  isEdited: boolean;
  isDeleted: boolean;
  readAt: string | null;
  replyToId: string | null;
  createdAt: string;
  updatedAt: string;
  sender?: { id: string; displayName: string; avatarUrl: string | null; };
  reactions?: { id: string; userId: string; emoji: string; }[];
  replyTo?: { id: string; content: string; type: string; sender: { id: string; displayName: string; } } | null;
}

interface Note {
  id: string; coupleId: string; creatorId: string;
  title: string | null; content: string;
  isPinned: boolean; isArchived: boolean;
  createdAt: string; updatedAt: string;
}

interface Prayer {
  id: string; coupleId: string; creatorId: string;
  content: string; category: string;
  isAnswered: boolean; isArchived: boolean;
  createdAt: string; updatedAt: string;
}

interface GratitudeEntry {
  id: string; coupleId: string; userId: string;
  content: string; date: string;
  isShared: boolean; createdAt: string;
}

interface JarReason {
  id: string; coupleId: string; creatorId: string;
  content: string; category: string | null; createdAt: string;
}

interface TimelineEvent {
  id: string; coupleId: string; title: string;
  description: string | null; date: string;
  type: string; mediaUrl: string | null;
  userId: string | null; createdAt: string;
}
```

---

## 1. Authentication Endpoints

### Register
**`POST /api/auth/register`**
* **Headers:** `Content-Type: application/json`
* **Request JSON:**
  ```json
  { "email": "string", "password": "string", "displayName": "string" }
  ```
* **Success (201) Response JSON:**
  ```json
  {
    "message": "Registration successful",
    "user": { "id": "string", "email": "string", "displayName": "string" },
    "accessToken": "string",
    "reqId": "string"
  }
  ```

### Login
**`POST /api/auth/login`**
* **Headers:** `Content-Type: application/json`
* **Request JSON:** `{ "email": "string", "password": "string" }`
* **Success (200) Response JSON:**
  ```json
  {
    "message": "Login successful",
    "user": { "id": "string", "email": "string", "displayName": "string", "avatarUrl": "string | null", "avatarInitials": "string | null" },
    "accessToken": "string"
  }
  ```

### Google Auth
**`POST /api/auth/google`**
* **Headers:** `Content-Type: application/json`
* **Request JSON:**
  ```json
  { "idToken": "string", "displayName": "string (optional)", "avatarUrl": "string (optional)" }
  ```
* **Success (200/201) Response JSON:**
  ```json
  {
    "message": "string",
    "user": { "id": "string", "email": "string", "displayName": "string", "avatarUrl": "string | null", "avatarInitials": "string | null" },
    "accessToken": "string",
    "isNewUser": true
  }
  ```

### Logout (Single Device)
**`POST /api/auth/logout`**
* **Headers:** `x-user-id`
* **Request JSON:** `{ "refreshToken": "string" }`
* **Success (200) Response JSON:** `{ "message": "Logged out successfully" }`

### Logout All Devices
**`POST /api/auth/logout-all`**
* **Headers:** `x-user-id`
* **No body required.**
* **Success (200) Response JSON:** `{ "message": "Successfully logged out from all devices" }`
> Also clears all device FCM tokens — push notifications stop immediately on all old devices.

### Forgot Password
**`POST /api/auth/forgot-password`**
* **No auth headers.** Body: `{ "email": "string" }`
* The 6-digit PIN is sent **strictly via email**. It is never in the API response.
* **Success (200) Response JSON:** `{ "success": true, "message": "If an account exists, a reset link was sent." }`

### Reset Password
**`POST /api/auth/reset-password`**
* **No auth headers.** Body: `{ "token": "string", "newPassword": "string" }`
* **Success (200) Response JSON:** `{ "message": "Password reset successfully" }`

---

## 2. User & Profile Endpoints

### Get Profile
**`GET /api/user/profile`**
* **Headers:** `x-user-id`, `Authorization: Bearer <token>`
* **Success (200) Response JSON:**
  ```json
  { "id": "string", "displayName": "string", "email": "string", "avatarUrl": "string | null", "createdAt": "string", "avatarInitials": "string | null" }
  ```

### Update Profile
**`PATCH /api/user/profile`**
* **Headers:** `x-user-id`, `Authorization: Bearer <token>`, `Content-Type: application/json`
* **Request JSON:** `{ "displayName": "string (optional)", "avatarUrl": "string (optional)" }`
* **Success (200) Response JSON:** Same as Get Profile.

### Upload Avatar
**`POST /api/user/avatar`**
> [!IMPORTANT]
> **multipart/form-data** — Do NOT set `Content-Type` manually.

* **Headers:** `Authorization: Bearer <token>`
* **Body:** `multipart/form-data`, field name: **`avatar`**
* **Success (200) Response JSON:**
  ```json
  { "success": true, "avatarUrl": "string", "message": "Avatar uploaded successfully" }
  ```

### Delete Avatar
**`DELETE /api/user/avatar`**
* **Headers:** `Authorization: Bearer <token>`
* **Success (200) Response JSON:** `{ "success": true, "message": "Avatar deleted successfully" }`

---

## 3. Couple Lifecycle

### Create Couple (generates invite code)
**`POST /api/ml-couple/create`**
* **Headers:** `x-user-id`, `Authorization: Bearer <token>`, `Content-Type: application/json`
* **Request JSON:** `{ "partnerEmail": "string (optional)" }`
  - If `partnerEmail` is provided, backend sends them an invite email automatically.
  - If not, the `inviteCode` in the response is all you need — display it to the user.
* **Success (201) Response JSON:**
  ```json
  {
    "message": "Pending couple created successfully!",
    "inviteCode": "8B5FA3",
    "couple": { "id": "string", "partnerAId": "string", "partnerBId": null, "inviteCode": "8B5FA3", "isBlocked": false, "blockedById": null, "createdAt": "string" }
  }
  ```

### Join Couple via Invite Code
**`POST /api/ml-couple/join`**
* **Headers:** `x-user-id`, `Authorization: Bearer <token>`, `Content-Type: application/json`
* **Request JSON:** `{ "inviteCode": "8B5FA3" }`
* **Success (200) Response JSON:**
  ```json
  {
    "message": "Successfully joined via invite code!",
    "couple": { "id": "string", "partnerAId": "string", "partnerBId": "string", "isBlocked": false, "blockedById": null, "createdAt": "string", "partnerA": { ... }, "partnerB": { ... } }
  }
  ```

### Get Couple Profile
**`GET /api/ml-couple/profile`**
* **Headers:** `x-user-id`, `Authorization: Bearer <token>`
* **Auto-detects couple from `x-user-id` — no coupleId needed.**
* **Success (200) Response JSON:**
  ```json
  {
    "coupleId": "string",
    "partnerA": { "id": "string", "displayName": "string", "avatarUrl": "string | null" },
    "partnerB": { "id": "string", "displayName": "string", "avatarUrl": "string | null" } ,
    "daysTogether": 365,
    "anniversaryDate": "string | null",
    "createdAt": "string",
    "isBlocked": false
  }
  ```

### Update Anniversary Date
**`PATCH /api/ml-couple/profile`**
* **Headers:** `x-user-id`, `Authorization: Bearer <token>`, `Content-Type: application/json`
* **Request JSON:** `{ "anniversaryDate": "2023-06-01T00:00:00.000Z" }`
* **Success (200) Response JSON:** `{ "success": true, "anniversaryDate": "string" }`

### Get Partner Info (Auto-Detection)
**`GET /api/ml-couple/partner-email`**
* **Headers:** `x-user-id`, `Authorization: Bearer <token>`
* **Auto-detects couple from `x-user-id`.**
* **Success (200) Response JSON (partner joined):**
  ```json
  {
    "coupleId": "string",
    "me": { "id": "string", "email": "string", "displayName": "string", "avatarUrl": "string | null" },
    "partner": { "id": "string", "email": "string", "displayName": "string", "avatarUrl": "string | null" }
  }
  ```
* **Response (waiting for partner):**
  ```json
  { "coupleId": "string", "inviteCode": "string", "me": { "..." }, "partner": null, "message": "No partner has joined yet." }
  ```

### Block Partner
**`POST /api/ml-couple/block`**
* **Headers:** `x-user-id`, `Authorization: Bearer <token>`
* **No body required.**
* **Success (200) Response JSON:**
  ```json
  { "success": true, "message": "Partner has been blocked successfully", "couple": { "isBlocked": true, "blockedById": "your-user-id" } }
  ```
> When blocked: all message sends (text + media), uploads, notes, prayers, and all other write operations return **403**.

### Unblock Partner
**`POST /api/ml-couple/unblock`**
* **Headers:** `x-user-id`, `Authorization: Bearer <token>`
* **Only the user who initiated the block can call this.**
* **Success (200) Response JSON:**
  ```json
  { "success": true, "message": "Partner has been unblocked", "couple": { "isBlocked": false, "blockedById": null } }
  ```
* **403** if you are not the one who initiated the block.

---

## 4. Messaging

> [!TIP]
> **`coupleId` is now fully optional.** The backend auto-detects your couple from `x-user-id`. You never need to hardcode or store and pass `coupleId` from the Android app.

### Get Messages (Cursor-based Pagination)
**`GET /api/messages`** ← No query params required!
* **Headers:** `x-user-id`, `Authorization: Bearer <token>`
* **Optional Query Params:**
  * `limit`: number (default: 50, max: 100)
  * `cursor`: message ID — pass to load older messages
  * `coupleId`: only needed for admin overrides
* **Success (200) Response JSON:**
  ```json
  {
    "messages": [ { /* Full Message object */ } ],
    "nextCursor": "string | null",
    "hasMore": true
  }
  ```
> Messages are returned **newest first**. Reverse the list before rendering.

### Send Text Message
**`POST /api/messages`**
* **Headers:** `x-user-id`, `Authorization: Bearer <token>`, `Content-Type: application/json`
* **Request JSON:**
  ```json
  { "content": "string", "type": "TEXT", "replyToId": "string (optional)" }
  ```
  > `coupleId` is **optional** — omit it. Backend finds it from `x-user-id`.
* **Success (201) Response JSON:** Full `Message` object.
* Also triggers Supabase Realtime `new_message` broadcast + FCM push to partner.
* **403** if couple is blocked.

### Mark Messages As Read
**`POST /api/ml-chat/read`**
* **Headers:** `x-user-id`, `Authorization: Bearer <token>`, `Content-Type: application/json`
* **Request JSON:** `{ "messageIds": ["id1", "id2"] }` ← Array, NOT `lastMessageId`
* **Success (200) Response JSON:** `{ "success": true, "updatedCount": 2 }`

### React to Message
**`POST /api/ml-chat/react`**
* **Headers:** `x-user-id`, `Authorization: Bearer <token>`, `Content-Type: application/json`
* **Request JSON:** `{ "messageId": "string", "emoji": "❤️" }`
* **Success (200) Response JSON:** `{ "success": true, "action": "add | remove" }`

---

## 5. Unified Media Uploads
**`POST /api/upload`**
> [!IMPORTANT]
> **multipart/form-data** — Do NOT set `Content-Type` manually. Retrofit handles it.

* **Headers:** `x-user-id`, `Authorization: Bearer <token>`
* **Body Fields:**
  * `file` — File blob (Required)
  * `bucket` — `"chat-media" | "timeline" | "letters" | "temp"` (Default: `"temp"`)
  * `coupleId` — **Optional. Omit it — backend auto-detects from `x-user-id`.**
  * `generateThumbnail` — `"true"` | `"false"`
  * `caption` — string (optional, for `chat-media`)
  * `title` — string (optional, for `timeline`)
  * `description` — string (optional, for `timeline`)
  * `type` — string (optional, for `timeline` event type)
  * `letterId` — string (optional, for `letters` attachments)
* **Success (200) Response JSON:**
  ```json
  {
    "success": true,
    "file": { "id": "string", "url": "string", "path": "string", "bucket": "string", "size": 1048576, "type": "image/jpeg", "name": "file.jpg" },
    "thumbnail": { "url": "string", "path": "string" },
    "message": { /* Full Message object — if bucket was chat-media */ },
    "timelineEvent": { /* TimelineEvent — if bucket was timeline */ }
  }
  ```
* **403** if couple is blocked.

### Check Upload Status
**`GET /api/upload/status?id=<file_id>`**
* **Headers:** `x-user-id`, `Authorization: Bearer <token>`
* **Success (200) Response JSON:** `{ "id": "string", "url": "string", "type": "string", "size": 1024, "createdAt": "string" }`

---

## 6. Couple Features (All Auto-Detect Couple from x-user-id)

### Notes
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/ml-notes/create` | Create note. Body: `{ title?, content, isPinned?, isArchived? }` |
| `GET`  | `/api/ml-notes/list`   | List all non-archived notes (sorted pinned first) |
| `PATCH`| `/api/ml-notes/update` | Update note. Body: `{ id, title?, content?, isPinned?, isArchived? }` |
| `POST` | `/api/ml-notes/pin`    | Toggle pin. Body: `{ id }` |
| `POST` | `/api/ml-notes/archive`| Archive note. Body: `{ id }` |
| `DELETE`| `/api/ml-notes/delete`| Delete note. Body: `{ id }` |

### Prayers
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/ml-prayer/create` | Body: `{ content, category }`. Category: `"Family \| Relationship \| Career \| Health \| Gratitude"` |
| `GET`  | `/api/ml-prayer/all`    | List all prayers |
| `PATCH`| `/api/ml-prayer/<id>`   | Update/mark answered or archived |
| `DELETE`| `/api/ml-prayer/<id>`  | Delete prayer |

### Gratitude Journal
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/ml-gratitude/create` | Body: `{ content, date: "ISO 8601", isShared? }` |
| `GET`  | `/api/ml-gratitude/all`    | List entries |

### Jar of Reasons
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/ml-jar/add`          | Body: `{ content, category? }` |
| `GET`  | `/api/ml-jar/all?limit=20&cursor=<id>` | Cursor-paginated list. Response: `{ data: [...], nextCursor }` |

### Timeline
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/ml-timeline/create` | Body: `{ title, description?, date: "ISO 8601", type, mediaUrl? }` |
| `GET`  | `/api/ml-timeline/all`    | List timeline events |

### Reflections
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/ml-reflection/create` | Body: `{ content, date: "ISO 8601", isShared? }` |
| `GET`  | `/api/ml-reflection/all`    | List reflections |

---

## 7. Real-Time Presence (Typing / Recording / Online)

> [!IMPORTANT]
> These use **Supabase Realtime Broadcast** — nothing is written to the DB. Subscribe to the `chat_{coupleId}` channel in the Supabase Kotlin SDK.

### Broadcast Presence Event
**`POST /api/chat/presence`**
* **Headers:** `x-user-id`, `Authorization: Bearer <token>`, `Content-Type: application/json`
* **Request JSON:** `{ "type": "typing | recording | online | offline", "isActive": true }`
* **Success (200):** `{ "success": true, "broadcasted": "typing" }`
* **Realtime payload on `chat_{coupleId}` channel:**
  ```json
  { "event": "presence", "payload": { "userId": "string", "type": "typing", "isActive": true, "timestamp": "ISO 8601" } }
  ```

---

## 8. Online Status (Heartbeat)

### Update Online Status
**`POST /api/chat/heartbeat`**
* Call every **30 seconds** while chat screen is open.
* **Headers:** `x-user-id`, `Authorization: Bearer <token>`
* **Success (200):** `{ "success": true, "lastSeen": "ISO 8601" }`

### Check Partner Online Status
**`GET /api/chat/heartbeat?partnerId=<partnerId>`**
* **Headers:** `x-user-id`, `Authorization: Bearer <token>`
* **Success (200):**
  ```json
  { "partnerId": "string", "displayName": "string", "isOnline": true, "lastSeen": "ISO 8601", "lastSeenSeconds": 12 }
  ```
> `isOnline` is `true` if partner was seen within the **last 60 seconds**.

---

## 9. Admin APIs

> [!WARNING]
> All admin routes require `x-user-id` to have `role: 'admin'` in the database.

| Method | Endpoint | Description |
|---|---|---|
| `GET`  | `/api/admin/users`    | List all users |
| `POST` | `/api/admin/users`    | Promote/demote: `{ action: "promote\|demote", email }` |
| `GET`  | `/api/admin/couples`  | List all couples with partner info |
| `GET`  | `/api/admin/logs`     | List audit logs |

---

## 10. Frontend Supabase Realtime Setup

```kotlin
// In ChatViewModel — subscribe when screen opens, unsubscribe on close
val channel = supabase.channel("chat_${coupleId}")

channel.broadcastFlow<JsonObject>("new_message").onEach { payload ->
    val msg = Json.decodeFromJsonElement<MessageDto>(payload["message"]!!)
    messageDao.insert(msg.toEntity())
}.launchIn(viewModelScope)

channel.broadcastFlow<JsonObject>("read_receipt").onEach { payload ->
    val ids = payload["messageIds"]!!.jsonArray.map { it.jsonPrimitive.content }
    messageDao.markRead(ids)
}.launchIn(viewModelScope)

channel.broadcastFlow<JsonObject>("presence").onEach { payload ->
    val type = payload["type"]?.jsonPrimitive?.content
    val isActive = payload["isActive"]?.jsonPrimitive?.boolean ?: false
    when (type) {
        "typing"    -> _isPartnerTyping.value = isActive
        "recording" -> _isPartnerRecording.value = isActive
        "online"    -> _isPartnerOnline.value = isActive
    }
}.launchIn(viewModelScope)

channel.subscribe()
```

---

## ⚠️ Common Mistakes

| Wrong ❌ | Correct ✅ |
|---|---|
| Passing `coupleId` in every request | Omit it — backend auto-detects from `x-user-id` |
| Setting `Content-Type: multipart/form-data` manually | Let OkHttp set it automatically via `@Multipart` |
| `"lastMessageId": "abc"` in mark-read | `"messageIds": ["abc"]` (array!) |
| Polling for new messages | Subscribe to Supabase Realtime `chat_{coupleId}` |
| Showing Unblock for wrong user | Only show if `blockedById == currentUserId` |
| Calling couple features before resolving couple | Call `GET /api/ml-couple/partner-email` first on startup |
| Sending the reset PIN from API response | The PIN is email-only, never in the response body |
