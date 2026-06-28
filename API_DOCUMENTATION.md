# Our Story API Integration Guide (Exhaustive Contract)

Base URL: `https://maxourstorybackend.vercel.app` (or your local/deployment URL)

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
  id: string; coupleId: string; senderId: string;
  content: string | null;
  type: "TEXT" | "IMAGE" | "VIDEO" | "AUDIO" | "FILE" | "SYSTEM";
  status: "SENT" | "DELIVERED" | "READ";
  mediaUrl: string | null; thumbnailUrl: string | null;
  fileName: string | null; fileSize: number | null;
  duration: number | null; mimeType: string | null;
  isEdited: boolean; isDeleted: boolean; readAt: string | null;
  replyToId: string | null; createdAt: string; updatedAt: string;
}

// See more specific models mapped implicitly via the Zod validators for Note, Prayer, Letter, TimelineEvent, GratitudeEntry, JarReason, and more.
```

---

## 1. Authentication Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Body: `{ email, password, displayName }`. Returns tokens. |
| `POST` | `/api/auth/login` | Body: `{ email, password }`. Returns tokens. |
| `POST` | `/api/auth/google` | Body: `{ idToken, displayName?, avatarUrl? }`. Returns tokens. |
| `POST` | `/api/auth/logout` | Header: `x-user-id`. Body: `{ refreshToken }` |
| `POST` | `/api/auth/logout-all` | Header: `x-user-id`. Clears all device registrations. |
| `POST` | `/api/auth/refresh` | **No auth headers required**, just `RefreshToken` in request (if implemented that way) or body. |
| `POST` | `/api/auth/forgot-password` | Body: `{ email }`. Sends reset PIN via email. |
| `POST` | `/api/auth/reset-password` | Body: `{ token, newPassword }`. Uses the PIN from email. |

---

## 2. User & Profile Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET`  | `/api/user/profile` | Fetches the current user profile. |
| `PATCH`| `/api/user/profile` | Body: `{ displayName?, avatarUrl? }`. Updates profile. |
| `POST` | `/api/user/avatar` | **multipart/form-data** upload (key: `avatar`). Returns `avatarUrl`. |
| `DELETE`| `/api/user/account` | Deletes user account and cascade soft/hard deletes their data. |

---

## 3. Couple Lifecycle

> **Automatic resolution via `x-user-id`**

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/ml-couple/create` | Body: `{ partnerEmail? }`. Creates a couple, returns `inviteCode`. |
| `POST` | `/api/ml-couple/join` | Body: `{ inviteCode }`. Joins an existing couple. |
| `GET`  | `/api/ml-couple/profile`| Returns combined profile metrics (days together, etc). |
| `PATCH`| `/api/ml-couple/profile`| Body: `{ anniversaryDate }`. Update anniversary date. |
| `GET`  | `/api/ml-couple/partner-email` | Resolves both partners. Returns `me` and `partner`. |
| `POST` | `/api/ml-couple/invite/resend` | Re-sends the invite email to the partner if pending. |
| `POST` | `/api/ml-couple/block` | Blocks communication with the partner. |
| `POST` | `/api/ml-couple/unblock` | Unblocks communication (must be initiated by the blocker). |

---

## 4. Messaging & Chat Core

### Standard Unified Messages API (Recommended for New Implementations)
| Method | Endpoint | Description |
|---|---|---|
| `GET`  | `/api/messages` | Cursor paginated log. Params: `limit`, `cursor`. Optional: `coupleId`. |
| `POST` | `/api/messages` | Send message. Body: `{ content, type, replyToId? }`. |
| `POST` | `/api/upload` | Media/File upload (multipart/form-data). Body: `file`, `bucket`, etc. |

### Legacy ML-Chat Endpoints (Phase 3 format)
*Most features handle `x-user-id` implicitly.*

| Method | Endpoint | Description |
|---|---|---|
| `GET`  | `/api/ml-chat/history` | Similar to `/api/messages` log fetching. |
| `POST` | `/api/ml-chat/send` | Body: `{ content, type }`. (Fallback/legacy send). |
| `POST` | `/api/ml-chat/read` | Body: `{ messageIds: string[] }`. |
| `POST` | `/api/ml-chat/react` | Body: `{ messageId, emoji }`. |
| `POST` | `/api/ml-chat/reply` | Body: `{ messageId, content, type }`. |
| `PATCH`| `/api/ml-chat/edit` | Body: `{ id, content }`. Edits an existing sent message. |
| `POST` | `/api/ml-chat/delete` | Soft deletes message (typically body `{ id }`). |
| `POST` | `/api/ml-chat/star` | Toggles star on message. |
| `GET`  | `/api/ml-chat/starred` | List starred messages. |
| `POST` | `/api/ml-chat/settings`| Update chat specific settings (e.g., bg). |
| `GET`  | `/api/ml-chat/stats` | Gets message analytics! |
| `POST` | `/api/ml-chat/archive` | Archives the chat thread. |
| `POST` | `/api/ml-chat/unarchive`| Unarchives the chat thread. |
| `POST` | `/api/ml-chat/clear-mine`| Clears chat display local for user. |
| `GET`  | `/api/ml-chat/export` | Exports chat log to file (e.g. JSON/TXT). |
| `GET`  | `/api/ml-chat/search` | Search chat for term query params. |

---

## 5. Unified Media Uploads

**`POST /api/upload`** (Primary) or **`POST /api/ml-storage/upload`**
> [!IMPORTANT]
> **multipart/form-data** — Do NOT set `Content-Type` manually. Retrofit handles it.

* **Headers:** `x-user-id`, `Authorization: Bearer <token>`
* **Body Fields:**
  * `file` — File blob (Required)
  * `bucket` — `"chat-media" | "timeline" | "letters" | "temp"`
  * `generateThumbnail` — `"true"` | `"false"`
  * Metadata fields per type (e.g. `title` and `type` for timeline, `caption` for chat-media)

Status checks:
`GET /api/upload/status?id=<file_id>`

---

## 6. Couple Core Features

All routes automatically leverage `x-user-id` to identify the couple instance.

### Gratitude Journal (`ml-gratitude`)
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/ml-gratitude/create` | Body: `{ content, date: "ISO 8601", isShared? }` |
| `GET`  | `/api/ml-gratitude/list`   | List entries |
| `PATCH`| `/api/ml-gratitude/update` | Body: `{ id, content?, date?, isShared? }` |
| `DELETE`| `/api/ml-gratitude/delete`| Delete an entry |

### Jar of Reasons (`ml-jar`)
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/ml-jar/add`          | Body: `{ content, category? }` |
| `GET`  | `/api/ml-jar/all`          | Cursor-paginated log |
| `GET`  | `/api/ml-jar/random`       | Pull a random reason from the jar! |
| `DELETE`| `/api/ml-jar/delete`      | Delete a specific reason |
| `GET`  | `/api/ml-jar/search`       | Search terms inside jar |
| `GET`  | `/api/ml-jar/[id]`         | Get specific reason by ID |

### Timelines (`ml-timeline`)
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/ml-timeline/create` | Body: `{ title, description?, date, type, mediaUrl? }` |
| `GET`  | `/api/ml-timeline/list`   | List timeline events |
| `DELETE`| `/api/ml-timeline/delete`| Delete event |

### Letters (`ml-letter`)
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/ml-letter/create` | Body: `{ title, content, deliverAt, isDraft }` |
| `GET`  | `/api/ml-letter/list`   | List letters |
| `GET`  | `/api/ml-letter/draft`  | Retrieve specific offline draft |
| `POST` | `/api/ml-letter/read`   | Mark a letter as read (opened) |

### Notes & Prayers (`ml-notes`, `ml-prayer`)
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/ml-notes/create` | Body: `{ title?, content, isPinned?, isArchived? }` |
| `GET`  | `/api/ml-notes/list`   | List active notes |
| `PATCH`| `/api/ml-notes/update` | Update note |
| `POST` | `/api/ml-notes/pin`, `.../archive`, `.../delete` | Modify state |
| `POST` | `/api/ml-prayer/create` | Body: `{ content, category }` |
| `GET`  | `/api/ml-prayer/list`  | List active prayers |
| `POST` | `/api/ml-prayer/answered`, `.../archive` | Change prayer state |

### Reflection (`ml-reflection`)
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/ml-reflection/create` | Body: `{ content, date, isShared }` |
| `GET`  | `/api/ml-reflection/list` | All reflections |
| `GET`  | `/api/ml-reflection/partner` | List partner's shared reflections |

### Bedtime & Verse (`ml-bedtime`, `ml-verse`, `ml-discussion`)
| Method | Endpoint | Description |
|---|---|---|
| `GET`  | `/api/ml-bedtime/status`, `.../history` | Check routines status |
| `POST` | `/api/ml-bedtime/complete` | Complete routine checklist |
| `GET`  | `/api/ml-verse/today`, `.../history` | Specific verse of the day for couples |
| `POST` | `/api/ml-verse/favorite/[id]` | Toggle favorite on verse |
| `GET`  | `/api/ml-discussion/today`, `.../history` | Daily discussion topic for couples |

---

## 7. Device Registration & Push Notifications

> Connect APNs / FCM tokens so push notifications route correctly per user

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/ml-device/register` | Register FCM token. Body: `{ deviceId, pushToken, platform: "android"\|"ios" }` |
| `POST` | `/api/ml-notify/register` | Alias for device reg |
| `PATCH`| `/api/ml-notify/preferences` | Update push enablement settings: `{ notificationsEnabled: boolean, quietHours: {} }` |
| `GET`  | `/api/ml-notification/history` | In-app view: List recent notification items |
| `GET`  | `/api/ml-notification/settings`| In-app view: List current generic user settings |

---

## 8. Real-Time Presence & Status (Heartbeat)

These are usually driven entirely via Supabase Realtime Channels (`chat_{coupleId}`).
However, explicit Heartbeat and Presence REST API commands exist.

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/chat/presence` | Updates realtime activity. Body: `{ type: "typing|recording|online", isActive: true }` |
| `POST` | `/api/chat/heartbeat` | Marks your Last Seen time as NOW for the chat interface. (Hit every 30s) |
| `GET`  | `/api/chat/heartbeat?partnerId=...`| Checks if the partner has been active in the last 60s. |

---

## 9. Admin Operations

> [!WARNING]
> All admin routes require the user token (resolved via `x-user-id`) to have `{ role: 'admin' }` in the DB.

| Method | Endpoint | Description |
|---|---|---|
| `GET`  | `/api/admin/users` | List users |
| `POST` | `/api/admin/users/[id]` | Generic modifier on ID |
| `GET`  | `/api/admin/couples` | List couples (includes IDs/status) |
| `POST` | `/api/admin/couples/[id]` | Intervene/Manage Couple |
| `GET`  | `/api/admin/logs` | Fetch backend Audit Logs |
| `GET`  | `/api/admin/announcements` | Global broadcast alerts setup |
| `GET`  | `/api/admin/stats` | System summary KPIs |
| `GET`  | `/api/admin/reports` | Get user abuse/bug reports |
| `POST` | `/api/admin/reports/[id]/resolve` | Mark report resolved |
| `GET`  | `/api/admin/content/[type]/[id]` | Inspect specific content node |

---

## Frontend Integration Tips

### Optional CoupleId
Never worry about manually syncing `coupleId` via explicit Android intents between screens. Provide `x-user-id` everywhere, and the backend naturally infers what context to alter.

### Realtime
Maintain your subscriptions to the generic `chat_{coupleId}` topic inside Supabase when a user enters a coupled screen (or globally for toast notifications). Do this by decoding the JSON.

```kotlin
val channel = supabase.channel("chat_${coupleId}")
channel.broadcastFlow<JsonObject>("new_message").onEach { ... }
channel.broadcastFlow<JsonObject>("presence").onEach { ... }
channel.subscribe()
```
