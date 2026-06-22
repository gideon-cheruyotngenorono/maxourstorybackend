# Our Story API Integration Guide (Exhaustive Contract)

Base URL: `https://maxourstorybackend.vercel.app`

## Global Rules & Headers
Almost all protected routes require the caller to provide identity headers.

**Required Headers for Protected Routes:**
- `x-user-id`: The User ID obtained during Login/Register.
- `Authorization`: Bearer token (Access Token).
- `Content-Type`: `application/json` (Crucial for `POST`, `PUT`, `PATCH` requests; omitting this will often cause a **400 Bad Request** error).

---

## Core Data Models
*Your frontend must expect exactly these JSON shapes.*

```typescript
interface User {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  avatarInitials?: string | null; // Injected by formatUserWithAvatar
  createdAt?: string; // ISO 8601 string
}

interface Couple {
  id: string;
  partnerAId: string;
  partnerBId: string | null;
  anniversaryDate: string | null; // ISO 8601 string
  inviteCode: string | null;
  createdAt: string; // ISO 8601 string
  partnerA?: User; // Populated in profile fetch
  partnerB?: User | null; // Populated in profile fetch
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
  deliveredAt: string | null;
  readAt: string | null;
  deletedAt: string | null;
  replyToId: string | null;
  createdAt: string; // ISO 8601 string
  updatedAt: string; // ISO 8601 string
  sender?: { 
    id: string; 
    displayName: string; 
    avatarUrl: string | null; 
    avatarInitials: string | null; 
  };
}

interface Note {
  id: string;
  coupleId: string;
  creatorId: string;
  title: string | null;
  content: string;
  isPinned: boolean;
  isArchived: boolean;
  createdAt: string; // ISO 8601 string
  updatedAt: string; // ISO 8601 string
}

interface Prayer {
  id: string;
  coupleId: string;
  creatorId: string;
  content: string;
  category: "Family" | "Relationship" | "Career" | "Health" | "Gratitude" | string;
  isAnswered: boolean;
  isArchived: boolean;
  createdAt: string; // ISO 8601 string
  updatedAt: string; // ISO 8601 string
}

interface Reflection {
  id: string;
  coupleId: string;
  userId: string;
  content: string;
  date: string; // ISO 8601 string
  isShared: boolean;
  createdAt: string; // ISO 8601 string
}

interface GratitudeEntry {
  id: string;
  coupleId: string;
  userId: string;
  content: string;
  date: string; // ISO 8601 string
  isShared: boolean;
  createdAt: string; // ISO 8601 string
}

interface JarReason {
  id: string;
  coupleId: string;
  creatorId: string;
  content: string;
  category: string | null;
  createdAt: string; // ISO 8601 string
}

interface TimelineEvent {
  id: string;
  coupleId: string;
  title: string;
  description: string | null;
  date: string; // ISO 8601 string
  type: "Photo" | "Note" | "Prayer milestone" | "Relationship milestone" | "Special event" | string;
  mediaUrl: string | null;
  userId: string | null;
  createdAt: string; // ISO 8601 string
}
```

---

## 1. Authentication Endpoints

### Register
**`POST /api/auth/register`**
* **Headers:** `Content-Type: application/json`
* **Request JSON:**
  ```json
  {
    "email": "string",
    "password": "string",
    "displayName": "string"
  }
  ```
* **Success (201) Response JSON:**
  ```json
  {
    "message": "Registration successful",
    "user": {
      "id": "string",
      "email": "string",
      "displayName": "string"
    },
    "accessToken": "string",
    "reqId": "string"
  }
  ```

### Login
**`POST /api/auth/login`**
* **Headers:** `Content-Type: application/json`
* **Request JSON:**
  ```json
  {
    "email": "string",
    "password": "string"
  }
  ```
* **Success (200) Response JSON:**
  ```json
  {
    "message": "Login successful",
    "user": {
      "id": "string",
      "email": "string",
      "displayName": "string",
      "avatarUrl": "string | null",
      "avatarInitials": "string | null"
    },
    "accessToken": "string"
  }
  ```

### Google Auth
**`POST /api/auth/google`**
* **Headers:** `Content-Type: application/json`
* **Request JSON:**
  ```json
  {
    "idToken": "string",
    "displayName": "string (optional)",
    "avatarUrl": "string (optional)"
  }
  ```
* **Success (200/201) Response JSON:**
  ```json
  {
    "message": "string",
    "user": {
      "id": "string",
      "email": "string",
      "displayName": "string",
      "avatarUrl": "string | null",
      "avatarInitials": "string | null"
    },
    "accessToken": "string",
    "isNewUser": "boolean"
  }
  ```

---

## 2. User & Profile Endpoints

### Get Profile
**`GET /api/user/profile`**
* **Headers:** `x-user-id`, `Authorization: Bearer <token>`
* **Success (200) Response JSON:**
  ```json
  {
    "id": "string",
    "displayName": "string",
    "email": "string",
    "avatarUrl": "string | null",
    "createdAt": "string",
    "avatarInitials": "string | null"
  }
  ```

### Update Profile (Text fields)
**`PATCH /api/user/profile`**
* **Headers:** `x-user-id`, `Authorization: Bearer <token>`, `Content-Type: application/json`
* **Request JSON:**
  ```json
  {
    "displayName": "string (optional)",
    "avatarUrl": "string (optional)"
  }
  ```
* **Success (200) Response JSON:** Same as Get Profile response.

### Upload Avatar (Media Upload)
**`POST /api/user/avatar`**
> [!IMPORTANT]
> This is a **multipart/form-data** request — do NOT set `Content-Type: application/json`. Let the HTTP client set it automatically with the boundary.

* **Headers:** `Authorization: Bearer <token>`
* **Body:** `multipart/form-data` with field name **`avatar`** (File)
* **Success (200) Response JSON:**
  ```json
  {
    "success": true,
    "avatarUrl": "string",
    "message": "Avatar uploaded successfully"
  }
  ```

### Delete Avatar
**`DELETE /api/user/avatar`**
* **Headers:** `Authorization: Bearer <token>`
* **Success (200) Response JSON:**
  ```json
  {
    "success": true,
    "message": "Avatar deleted successfully"
  }
  ```

---

## 3. Media Upload
> [!NOTE]
> The old `/api/ml-storage/upload` endpoint is deprecated. Please refer to **Section 7. Unified Media Uploads** (`/api/upload`) for all media capabilities (chat, timeline, temp).

---

## 4. Chat Endpoints

### Send Message
**`POST /api/ml-chat/send`**
* **Headers:** `x-user-id`, `Authorization: Bearer <token>`, `Content-Type: application/json`
* **Request JSON:**
  ```json
  {
    "type": "TEXT | IMAGE | VIDEO | AUDIO | FILE | SYSTEM",
    "content": "string (required for TEXT/SYSTEM, optional for media)",
    "mediaUrl": "string (required if type is media)",
    "fileName": "string (optional)",
    "fileSize": "number (optional)",
    "duration": "number (optional)"
  }
  ```
* **Success (200) Response JSON:**
  ```json
  {
    "success": true,
    "message": { 
      // Full Message Object with populated `sender`
    }
  }
  ```

### Get Chat History
**`GET /api/ml-chat/history?limit=50&cursor=msg_id`**
* **Headers:** `x-user-id`, `Authorization: Bearer <token>`
* **Success (200) Response JSON:**
  ```json
  {
    "messages": [
      {
        // Full Message Object with populated `sender`
      }
      // ...
    ]
  }
  ```

### Mark Messages As Read
**`POST /api/ml-chat/read`**
* **Headers:** `x-user-id`, `Authorization: Bearer <token>`, `Content-Type: application/json`
* **Request JSON:**
  ```json
  {
    "messageIds": ["string", "string"] 
  } // Must be an array of IDs, NOT `lastMessageId`!
  ```
* **Success (200) Response JSON:**
  ```json
  {
    "success": true,
    "updatedCount": "number"
  }
  ```

### React to Message
**`POST /api/ml-chat/react`**
* **Headers:** `x-user-id`, `Authorization: Bearer <token>`, `Content-Type: application/json`
* **Request JSON:**
  ```json
  {
    "messageId": "string",
    "emoji": "string"
  }
  ```
* **Success (200) Response JSON:**
  ```json
  {
    "success": true,
    "action": "add | remove"
  }
  ```

---

## 5. Shared Couple Space Features

### Couple Creation & Connection
* **Create Invite (`POST /api/ml-couple/create`)**
  * **Request JSON:** `{ "partnerEmail": "string (optional)" }`
  * **Response JSON:** `{ "message": "...", "inviteCode": "string", "couple": { "id": "...", ... } }`
* **Join Couple (`POST /api/ml-couple/join`)**
  * **Request JSON:** `{ "inviteCode": "string" }`
  * **Response JSON:** `{ "message": "...", "couple": { "id": "...", ... } }`
* **Get Couple Profile (`GET /api/ml-couple/profile`)**
  * **Response JSON:** `{ "coupleId": "string", "partnerA": { ... }, "partnerB": { ... } | null, "daysTogether": number }`

### Notes (`/api/ml-notes/create`)
* **Request JSON:**
  ```json
  {
    "title": "string (optional)",
    "content": "string",
    "isPinned": "boolean (default: false)",
    "isArchived": "boolean (default: false)"
  }
  ```
* **Response JSON:** `{ "note": { ... } }` (Returns Full Note object)

### Prayers (`/api/ml-prayer/create`)
* **Request JSON:**
  ```json
  {
    "content": "string",
    "category": "Family | Relationship | Career | Health | Gratitude | string (default: Relationship)"
  }
  ```

### Gratitude (`/api/ml-gratitude/create`)
* **Request JSON:**
  ```json
  {
    "content": "string",
    "date": "2026-06-19T00:00:00.000Z",
    "isShared": "boolean (default: true)"
  }
  ```

### Jar Reasons (`/api/ml-jar/add`)
* **Request JSON:**
  ```json
  {
    "content": "string",
    "category": "string (optional)"
  }
  ```

### Get Jar Reasons (`/api/ml-jar/all`)
**`GET /api/ml-jar/all?limit=20&cursor=last_id`**
* **Headers:** `x-user-id`, `Authorization: Bearer <token>`
* **Success (200) Response JSON:**
  ```json
  {
    "data": [
      {
        "id": "string",
        "coupleId": "string",
        "creatorId": "string",
        "content": "string",
        "category": "string | null",
        "createdAt": "string",
        "creator": {
          "displayName": "string"
        }
      }
    ],
    "nextCursor": "string | null"
  }
  ```

### Timeline Events (`/api/ml-timeline/create`)
* **Request JSON:**
  ```json
  {
    "title": "string",
    "description": "string (optional)",
    "date": "2026-06-19T00:00:00.000Z",
    "type": "Photo | Note | Prayer milestone | Relationship milestone | Special event",
    "mediaUrl": "string (optional)"
  }
  ```

---

## Developer Advice for AI Agents
1. **Always use exact keys mapped here**. Do NOT omit `Content-Type: application/json` unless making a `multipart/form-data` request.
2. Ensure you parse ISO strings in the exact format: `YYYY-MM-DDTHH:mm:ss.sssZ`
3. Never send an empty JSON `{}` to creation endpoints; read the interface for what's marked as required.
4. When marking messages read, use `"messageIds": ["id1"]`, NOT `"lastMessageId"`. 

---

## 6. Unified Messaging Endpoints

### Get Messages (Cursor-based Pagination)
**`GET /api/messages?coupleId=string&limit=50&cursor=last_msg_id`**
> [!TIP]
> Use cursor-based pagination for infinite scroll. Pass the `nextCursor` from each response as `cursor` in the next call to load older messages. Do NOT use `page` offset.

* **Headers:** `x-user-id`, `Authorization: Bearer <token>`
* **Query Params:**
  * `coupleId`: string (required)
  * `limit`: number (default: 50, max: 100)
  * `cursor`: string (message ID — pass to load older messages)
* **Success (200) Response JSON:**
  ```json
  {
    "messages": [
      {
        "id": "string",
        "coupleId": "string",
        "content": "string",
        "type": "TEXT | IMAGE | VIDEO | AUDIO | FILE | SYSTEM",
        "status": "SENT | DELIVERED | READ",
        "sender": { "id": "string", "displayName": "string", "avatarUrl": "string | null" },
        "reactions": [ { "id": "string", "userId": "string", "emoji": "string" } ],
        "replyTo": { "id": "string", "content": "string", "type": "string", "sender": { "id": "string", "displayName": "string" } }
      }
    ],
    "nextCursor": "string | null",
    "hasMore": true
  }
  ```

### Send Text Message
**`POST /api/messages`**
> [!NOTE]
> On success, the backend automatically broadcasts a `new_message` event to the partner via Supabase Realtime. The frontend should listen to `chat_{coupleId}` channel for this event.

* **Headers:** `x-user-id`, `Authorization: Bearer <token>`, `Content-Type: application/json`
* **Request JSON:**
  ```json
  {
    "coupleId": "string",
    "content": "string",
    "type": "TEXT",
    "replyToId": "string (optional)"
  }
  ```
* **Success (201) Response JSON:** Full `Message` object with populated `sender`.

### Send Media Message
**`POST /api/upload` (via bucket `chat-media`)**
> [!NOTE]
> Media messaging now flows through the Unified Media Upload endpoint.

* **Headers:** `x-user-id`, `Authorization: Bearer <token>`
* **Body Fields (multipart/form-data):**
  * `file`: (File blob)
  * `bucket`: `"chat-media"`
  * `coupleId`: "string"
  * `caption`: "string (optional)"
* **Success (200) Response JSON:** 
  ```json
  {
    "success": true,
    "file": { /* MediaFile info */ },
    "message": { /* Fully populated Message object */ }
  }
  ```

---

## 7. Unified Media Uploads
**`POST /api/upload`**
> [!IMPORTANT]
> This is a **multipart/form-data** request for handling all central uploads EXCEPT avatars (which continues to use `/api/user/avatar`).

* **Headers:** `x-user-id`, `Authorization: Bearer <token>`
* **Body Fields:**
  * `file`: (File blob, Required)
  * `bucket`: `"chat-media" | "timeline" | "letters" | "temp"` (Default: "temp")
  * `coupleId`: "string" (Required for `chat-media`, `timeline`, `letters`)
  * `generateThumbnail`: "true" | "false"
  * `caption`: "string" (Optional, for `chat-media`)
  * `title`: "string" (Optional, for `timeline`)
  * `description`: "string" (Optional, for `timeline`)
  * `type`: "string" (Optional, for `timeline` event types)
  * `letterId`: "string" (Optional, for `letters` attachments)
* **Success (200) Response JSON:**
  ```json
  {
    "success": true,
    "file": {
      "id": "string (MediaFile ID)",
      "url": "string",
      "path": "string",
      "bucket": "string",
      "size": 1048576,
      "type": "image/jpeg",
      "name": "filename.jpg"
    },
    "thumbnail": {
      "url": "string",
      "path": "string"
    } /* or null */,
    "message": { /* Populated Message object if bucket was chat-media */ } /* or null */,
    "timelineEvent": { /* Populated TimelineEvent if bucket was timeline */ } /* or null */,
    "letter": { /* Populated Letter if bucket was letters */ } /* or null */
  }
  ```

### Check Upload Status
**`GET /api/upload/status?id=file_id`**
* **Headers:** `x-user-id`, `Authorization: Bearer <token>`
* **Success (200) Response JSON:**
  ```json
  {
    "id": "string",
    "url": "string",
    "type": "string",
    "size": 1024,
    "createdAt": "string"
  }
  ```

---

## 8. Admin APIs

> [!WARNING]
> All Admin routes require the `x-user-id` making the request to have `role: 'admin'` in the database.

### List Users
**`GET /api/admin/users`**
* **Headers:** `x-user-id`, `Authorization: Bearer <token>`
* **Response:** Array of User objects with `role`, `isActive`, etc.

### Promote/Demote Users
**`POST /api/admin/users`**
* **Request JSON:** `{ "action": "promote | demote", "email": "user@example.com" }`
* **Response:** Updated User object.

### List Couples
**`GET /api/admin/couples`**
* **Response:** Array of Couple objects populated with `partnerA` and `partnerB` emails.

### List Audit Logs
**`GET /api/admin/logs`**
* **Response:** Array of `AdminAuditLog` tracking what changes admins have made.

---

## 9. Real-Time Presence (Typing / Recording / Online)

> [!IMPORTANT]
> These endpoints use **Supabase Realtime Broadcast**. The partner's device receives events INSTANTLY via WebSocket — nothing is written to the database. The frontend must subscribe to the `chat_{coupleId}` Supabase channel to receive these events.

### Broadcast Presence Event
**`POST /api/chat/presence`**
* **Headers:** `x-user-id`, `Authorization: Bearer <token>`, `Content-Type: application/json`
* **Request JSON:**
  ```json
  {
    "type": "typing | recording | online | offline",
    "isActive": true
  }
  ```
* **Success (200) Response JSON:**
  ```json
  { "success": true, "broadcasted": "typing" }
  ```
* **Realtime Event fired on `chat_{coupleId}` channel:**
  ```json
  {
    "event": "presence",
    "payload": {
      "userId": "string",
      "type": "typing | recording | online | offline",
      "isActive": true,
      "timestamp": "ISO 8601 string"
    }
  }
  ```

**Usage flow:**
1. User starts typing → `POST /api/chat/presence` with `{ "type": "typing", "isActive": true }`
2. User stops typing → `POST /api/chat/presence` with `{ "type": "typing", "isActive": false }`
3. User starts recording audio → `POST /api/chat/presence` with `{ "type": "recording", "isActive": true }`

---

## 10. Online Status (Heartbeat)

### Update And Broadcast Online Status
**`POST /api/chat/heartbeat`**
> Call this every 30 seconds while the chat screen is open to mark the user as "online".

* **Headers:** `x-user-id`, `Authorization: Bearer <token>`
* **Body:** Empty `{}` or no body needed
* **Success (200) Response JSON:**
  ```json
  { "success": true, "lastSeen": "2026-06-22T17:00:00.000Z" }
  ```

### Check If Partner Is Online
**`GET /api/chat/heartbeat?partnerId=string`**
* **Headers:** `x-user-id`, `Authorization: Bearer <token>`
* **Success (200) Response JSON:**
  ```json
  {
    "partnerId": "string",
    "displayName": "string",
    "isOnline": true,
    "lastSeen": "2026-06-22T17:00:00.000Z",
    "lastSeenSeconds": 12
  }
  ```
> `isOnline` is `true` if the partner was seen within the **last 60 seconds**.

---

## 11. Partner Auto-Detection

### Get Partner Email / Profile From Couple
**`GET /api/ml-couple/partner-email`**
> Auto-detects the other partner in the couple. Useful for invite flows; shows partner email without requiring the user to enter it manually.

* **Headers:** `x-user-id`, `Authorization: Bearer <token>`
* **Success (200) Response JSON:**
  ```json
  {
    "coupleId": "string",
    "me": { "id": "string", "email": "string", "displayName": "string", "avatarUrl": "string | null" },
    "partner": { "id": "string", "email": "string", "displayName": "string", "avatarUrl": "string | null" }
  }
  ```
  If partner has not joined yet:
  ```json
  {
    "coupleId": "string",
    "inviteCode": "string",
    "me": { "..." },
    "partner": null,
    "message": "No partner has joined yet."
  }
  ```

---

## Developer Tip: Frontend Supabase Real-Time Channel Setup

```javascript
// Subscribe to the couple's channel for all real-time events
const channel = supabase.channel(`chat_${coupleId}`)

// 1. New messages sent by partner (via /api/messages POST or /api/ml-chat/send)
channel.on('broadcast', { event: 'new_message' }, ({ payload }) => {
  // payload.message = full Message object
  addMessageToLocalDB(payload.message)
})

// 2. Read receipts
channel.on('broadcast', { event: 'read_receipt' }, ({ payload }) => {
  // payload.messageIds = array of marked-read message ids
  markMessagesRead(payload.messageIds)
})

// 3. Typing / Recording / Online presence 
channel.on('broadcast', { event: 'presence' }, ({ payload }) => {
  if (payload.type === 'typing') showTypingIndicator(payload.isActive)
  if (payload.type === 'recording') showRecordingIndicator(payload.isActive)
  if (payload.type === 'online') updatePartnerOnlineStatus(payload.isActive)
})

channel.subscribe()
```
