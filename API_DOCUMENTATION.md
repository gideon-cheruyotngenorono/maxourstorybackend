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

## 3. Media Upload (Chat & Others)

### Upload File
**`POST /api/ml-storage/upload`**
> [!IMPORTANT]
> This is a **multipart/form-data** request!

* **Headers:** `Authorization: Bearer <token>`
* **Body Fields:**
  * `file`: (File blob)
  * `type`: (String) one of `IMAGE`, `VIDEO`, `AUDIO`, `FILE`
* **Success (200) Response JSON:**
  ```json
  {
    "success": true,
    "url": "string (The public URL of the uploaded media)",
    "size": "number (Bytes)",
    "originalName": "string"
  }
  ```

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
  * **Response JSON:** `{ "message": "...", "inviteCode": "string", "couple": { ... } }`
* **Join Couple (`POST /api/ml-couple/join`)**
  * **Request JSON:** `{ "inviteCode": "string" }`
  * **Response JSON:** `{ "message": "...", "couple": { ... } }`
* **Get Couple Profile (`GET /api/ml-couple/profile`)**
  * **Response JSON:** `{ "partnerA": { ... }, "partnerB": { ... } | null, "daysTogether": number }`

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

### Get Messages (Paginated)
**`GET /api/messages?coupleId=string&limit=50&page=1`**
* **Headers:** `x-user-id`, `Authorization: Bearer <token>`
* **Success (200) Response JSON:**
  ```json
  {
    "messages": [
      {
        "id": "string",
        "coupleId": "string",
        "content": "string",
        "type": "TEXT | IMAGE | VIDEO ...",
        "sender": { "id": "string", "displayName": "string", "avatarUrl": "string" },
        "reactions": [],
        "replies": []
      }
    ],
    "pagination": { "page": 1, "limit": 50, "total": 100, "pages": 2 }
  }
  ```

### Send Text Message
**`POST /api/messages`**
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
* **Success (201) Response JSON:** `Message` object

### Send Media Message
**`POST /api/messages/media`**
> [!IMPORTANT]
> This is a **multipart/form-data** request.

* **Headers:** `x-user-id`, `Authorization: Bearer <token>`
* **Body Fields:**
  * `file`: (File blob)
  * `coupleId`: "string"
  * `caption`: "string (optional)"
  * `replyToId`: "string (optional)"
* **Success (201) Response JSON:** `Message` object containing populated `mediaUrl`.

---

## 7. Generic File Upload
**`POST /api/upload`**
> [!IMPORTANT]
> This is a **multipart/form-data** request for uploading avatars, timeline media, letters, or temp files.

* **Headers:** `x-user-id`, `Authorization: Bearer <token>`
* **Body Fields:**
  * `file`: (File blob)
  * `bucket`: "avatars | chat-media | timeline | letters | temp" (Default: "temp")
  * `folder`: "string" (Default: userId)
* **Success (200) Response JSON:**
  ```json
  {
    "url": "https://<supabase-url>/storage/v1/object/public/<bucket>/path/to/file",
    "path": "path/to/file",
    "bucket": "string"
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

