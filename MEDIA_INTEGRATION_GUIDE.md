# 📱 Media Integration — Complete Android/iOS Developer Guide

> **This guide is written for the Android team.** It covers every screen that involves media (images, video, audio, documents, avatars) — the exact API calls, multipart fields, JSON structures, authentication, error codes, and the correct upload-then-send flow.

---

## 🔐 Authentication — How Every Request is Authenticated

**There are no cookies. There is no Bearer token in the body.**

Every protected request must set **one header**:

```
x-user-id: <userId>
```

This `userId` is returned at login/register. Store it in secure storage and attach it to every API call.

```kotlin
// Retrofit example
@Headers("x-user-id: {userId}")

// Or via OkHttp Interceptor (recommended):
class AuthInterceptor(private val userId: String) : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        val request = chain.request().newBuilder()
            .addHeader("x-user-id", userId)
            .build()
        return chain.proceed(request)
    }
}
```

> ⚠️ **No x-user-id → HTTP 401 Unauthorized on every route.**

---

## 📐 Base URL & Global Rules

```
Base URL: https://your-backend-domain.com
```

- All endpoints return `application/json` unless noted
- All timestamps are ISO 8601: `"2025-01-15T14:30:00.000Z"`
- All IDs are UUIDs (strings)
- `coupleId` is **auto-detected** on all `ml-*` routes — you don't need to pass it
- Blocked couples get `403` on all communication endpoints

---

## 🗂️ Upload Architecture — Read This First

There are **two upload systems** in this backend. Use the right one for each screen:

| System | Endpoint | Used For |
|--------|----------|----------|
| **Unified Upload** | `POST /api/upload` | Chat media, timeline photos/videos, letter attachments |
| **Avatar Upload** | `POST /api/user/avatar` | Profile picture only |
| **Simple Storage** | `POST /api/ml-storage/upload` | Raw file storage (no DB record, no message created) |
| **Legacy Media** | `POST /api/messages/media` | Legacy chat — prefer `/api/upload` with `bucket=chat-media` |

### The Golden Rule for Chat Media

**Never send the file and the message in a single request.**
The correct flow is always:

```
1. POST /api/upload  (multipart — sends file, gets back URL + message record)
   ↳ Response includes { message } — already created for you
   ↳ Broadcast already fired to partner

2. Done. No second request needed.
```

---

## 📸 Screen 1: Profile / Avatar Upload

**Endpoint:** `POST /api/user/avatar`
**Content-Type:** `multipart/form-data`

### Request

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `avatar` | File | ✅ | Field name must be exactly `"avatar"` |

```kotlin
val requestBody = MultipartBody.Builder()
    .setType(MultipartBody.FORM)
    .addFormDataPart(
        "avatar",           // ← field name is "avatar", NOT "file"
        file.name,
        file.asRequestBody(mimeType.toMediaType())
    )
    .build()
```

### Allowed MIME Types
```
image/jpeg, image/png, image/gif, image/webp,
image/svg+xml, image/heic, image/heif, image/avif
```
Max size: **10MB**

### Success Response `200`
```json
{
  "success": true,
  "avatarUrl": "https://xyz.supabase.co/storage/v1/object/public/avatars/user123/1234567890.webp",
  "message": "Avatar uploaded successfully"
}
```

### Delete Avatar
`DELETE /api/user/avatar` — no body needed. Clears `avatarUrl` and removes from storage.

### Error Responses
| Code | Meaning |
|------|---------|
| `400` | No file provided / field name wrong |
| `415` | MIME type not allowed |
| `413` | File too large |
| `401` | Missing `x-user-id` header |

---

## 💬 Screen 2: Chat — Sending Media Messages

### Step 1 — Upload the file (creates message automatically)

**Endpoint:** `POST /api/upload`
**Content-Type:** `multipart/form-data`

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `file` | File | ✅ | The media file |
| `bucket` | string | ✅ | Must be `"chat-media"` |
| `caption` | string | ❌ | Optional text caption for the media |
| `generateThumbnail` | string | ❌ | `"true"` to generate a thumbnail |

> `coupleId` is **NOT needed** — auto-detected from your `x-user-id`

```kotlin
val body = MultipartBody.Builder()
    .setType(MultipartBody.FORM)
    .addFormDataPart("bucket", "chat-media")
    .addFormDataPart("caption", caption ?: "")
    .addFormDataPart("generateThumbnail", "true")
    .addFormDataPart(
        "file",
        file.name,
        file.asRequestBody(mimeType.toMediaType())
    )
    .build()
```

### Allowed MIME Types for `chat-media`
```
Images:    image/jpeg, image/png, image/gif, image/webp, image/svg+xml,
           image/heic, image/heif, image/avif, image/bmp, image/tiff

Videos:    video/mp4, video/quicktime, video/x-msvideo, video/webm,
           video/ogg, video/mpeg, video/3gpp, video/3gpp2, video/x-m4v,
           video/x-matroska, video/x-flv, video/x-ms-wmv

Audio:     audio/mpeg, audio/mp3, audio/wav, audio/ogg, audio/aac,
           audio/flac, audio/x-m4a, audio/amr, audio/opus, audio/x-wav,
           audio/x-flac, audio/x-aiff, audio/x-ms-wma, audio/midi

Documents: application/pdf, text/plain, application/msword,
           .docx, .xlsx, .pptx (full vnd types), application/rtf
```
Max size: **50MB**

### Success Response `200`
```json
{
  "success": true,
  "file": {
    "id": "uuid",
    "url": "https://supabase.../chat-media/userId/coupleId/filename.webp",
    "path": "userId/coupleId/filename.webp",
    "bucket": "chat-media",
    "size": 245760,
    "type": "image/webp",
    "name": "photo.jpg"
  },
  "thumbnail": {
    "url": "https://supabase.../chat-media/userId/coupleId/filename_thumb.webp",
    "path": "userId/coupleId/filename_thumb.webp"
  },
  "message": {
    "id": "uuid",
    "coupleId": "uuid",
    "senderId": "userId",
    "type": "IMAGE",
    "content": "caption text or null",
    "mediaUrl": "https://...",
    "thumbnailUrl": "https://...",
    "fileName": "photo.jpg",
    "fileSize": 245760,
    "mimeType": "image/jpeg",
    "status": "SENT",
    "createdAt": "2025-01-15T14:30:00.000Z",
    "sender": {
      "id": "userId",
      "displayName": "Grace",
      "avatarUrl": "https://..."
    }
  },
  "timelineEvent": null,
  "letter": null
}
```

> ✅ `message` is created for you. Do NOT call `/api/ml-chat/send` afterwards.

### Step 2 — Sending text-only messages (no upload)

**Endpoint:** `POST /api/ml-chat/send`
**Content-Type:** `application/json`

```json
{
  "type": "TEXT",
  "content": "Hello love 💕"
}
```

**For media messages where you already have a URL** (e.g., re-sharing an existing URL):
```json
{
  "type": "IMAGE",
  "mediaUrl": "https://supabase.co/storage/v1/object/public/chat-media/...",
  "content": "optional caption",
  "fileName": "photo.jpg",
  "fileSize": 245760,
  "duration": null
}
```

Response `200`:
```json
{
  "success": true,
  "message": { "id": "uuid", "type": "IMAGE", "mediaUrl": "...", ... }
}
```

### Deleting a Chat Message
`DELETE /api/messages?id=<messageId>`

> Soft-deletes (sets `isDeleted=true`, clears content). Only the sender can delete.
> Broadcasts `message_deleted` event to the couple's Supabase Realtime channel `chat_{coupleId}`.

Response `200`:
```json
{ "success": true, "message": { "id": "uuid", "isDeleted": true, ... } }
```

### Media Gallery (all shared media in one call)
`GET /api/ml-chat/media`

Response `200`:
```json
{
  "success": true,
  "gallery": {
    "images": [ { "id": "uuid", "mediaUrl": "...", "thumbnailUrl": "...", "createdAt": "...", "fileName": "..." } ],
    "videos": [ ... ],
    "audio":  [ ... ],
    "documents": [ ... ]
  }
}
```

---

## 🗓️ Screen 3: Timeline — Creating Events with Photos/Videos

### With Media

**Endpoint:** `POST /api/upload`
**Content-Type:** `multipart/form-data`

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `file` | File | ✅ | Photo or video |
| `bucket` | string | ✅ | `"timeline"` |
| `title` | string | ❌ | Event title (default: `"Timeline Event"`) |
| `description` | string | ❌ | Event description |
| `type` | string | ❌ | Event category (e.g., `"Anniversary"`, `"Travel"`) |

```kotlin
val body = MultipartBody.Builder()
    .setType(MultipartBody.FORM)
    .addFormDataPart("bucket", "timeline")
    .addFormDataPart("title", "Our Anniversary 🎉")
    .addFormDataPart("description", "3 years together")
    .addFormDataPart("type", "Anniversary")
    .addFormDataPart("file", file.name, file.asRequestBody(mime.toMediaType()))
    .build()
```

Allowed MIME types for `timeline`:
```
image/jpeg, image/png, image/gif, image/webp, image/heic, image/heif,
image/avif, image/svg+xml, video/mp4, video/quicktime, video/webm,
video/ogg, video/3gpp, video/3gpp2, video/x-m4v, video/mpeg
```
Max size: **50MB**

### Success Response `200`
```json
{
  "success": true,
  "file": { "id": "uuid", "url": "...", "path": "...", "bucket": "timeline" },
  "thumbnail": { "url": "...", "path": "..." },
  "message": null,
  "timelineEvent": {
    "id": "uuid",
    "coupleId": "uuid",
    "userId": "userId",
    "title": "Our Anniversary 🎉",
    "description": "3 years together",
    "date": "2025-01-15T14:30:00.000Z",
    "type": "Anniversary",
    "mediaUrl": "https://..."
  },
  "letter": null
}
```

### Without Media (text-only event)

**Endpoint:** `POST /api/ml-timeline/create`
**Content-Type:** `application/json`

```json
{
  "title": "First Kiss 💋",
  "description": "The day everything changed",
  "date": "2025-01-15T00:00:00.000Z",
  "type": "Milestone",
  "mediaUrl": null
}
```

Response `201`: `{ "event": { ... } }`

### Delete a Timeline Event
`DELETE /api/ml-timeline/delete?id=<eventId>`

Response `200`: `{ "success": true }`

---

## ✉️ Screen 4: Letters — Attaching Files

### With File Attachment

**Endpoint:** `POST /api/upload`
**Content-Type:** `multipart/form-data`

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `file` | File | ✅ | Document or image |
| `bucket` | string | ✅ | `"letters"` |
| `letterId` | string | ❌ | Existing letter ID to attach to |
| `content` | string | ❌ | Letter body text |

Allowed MIME types for `letters`:
```
application/pdf, application/msword, .docx, .xlsx, .pptx (full vnd types),
text/plain, text/rtf, application/rtf,
application/vnd.apple.pages, application/vnd.apple.numbers, application/vnd.apple.keynote,
application/vnd.oasis.opendocument.text/spreadsheet/presentation,
image/jpeg, image/png, image/gif, image/webp
```
Max size: **20MB**

### Create Letter (no attachment)

**Endpoint:** `POST /api/ml-letter/create`
**Content-Type:** `application/json`

```json
{
  "title": "A Letter For You 💌",
  "content": "My dearest love...",
  "deliverAt": "2025-02-14T08:00:00.000Z",
  "isDraft": false
}
```

> `isDraft: true` saves without scheduling delivery.

Response `201`:
```json
{
  "message": "Letter scheduled successfully",
  "letter": {
    "id": "uuid",
    "title": "A Letter For You 💌",
    "content": "...",
    "deliverAt": "2025-02-14T08:00:00.000Z",
    "isDraft": false,
    "isRead": false,
    "authorId": "userId",
    "coupleId": "uuid",
    "createdAt": "..."
  }
}
```

### Delete a Letter
`DELETE /api/ml-letter/delete?id=<letterId>` — author only.

---

## 🪣 Screen 5: Jar — (No media, text only)

No file upload needed. All jar entries are text.

`POST /api/ml-jar/add` — `application/json`:
```json
{ "content": "I love how you laugh 😊", "category": "personality" }
```

---

## 🙏 Screen 6: Prayer — (No media)

`POST /api/ml-prayer/create` — `application/json`:
```json
{ "content": "Lord, bless our relationship...", "category": "relationship" }
```

---

## 📓 Screen 7: Notes — (No media)

`POST /api/ml-notes/create` — `application/json`:
```json
{ "title": "Note title", "content": "Note body text..." }
```

---

## 🌟 Screen 8: Gratitude — (No media)

`POST /api/ml-gratitude/create` — `application/json`:
```json
{
  "content": "I am grateful for your patience today",
  "date": "2025-01-15",
  "isShared": true
}
```

---

## 💭 Screen 9: Reflections — (No media)

`POST /api/ml-reflection/create` — `application/json`:
```json
{
  "content": "Today I felt closer to you than ever...",
  "date": "2025-01-15",
  "isShared": false
}
```

---

## 🗑️ All Delete Endpoints (Quick Reference)

| Screen | Endpoint | Method | Query Param |
|--------|----------|--------|-------------|
| Messages (chat) | `/api/messages` | `DELETE` | `?id=<messageId>` |
| Timeline Event | `/api/ml-timeline/delete` | `DELETE` | `?id=<eventId>` |
| Letter | `/api/ml-letter/delete` | `DELETE` | `?id=<letterId>` |
| Reflection | `/api/ml-reflection/delete` | `DELETE` | `?id=<reflectionId>` |
| Prayer | `/api/ml-prayer/delete` | `DELETE` | `?id=<prayerId>` |
| Note | `/api/ml-notes/delete` | `DELETE` | `?id=<noteId>` |
| Gratitude | `/api/ml-gratitude/delete` | `DELETE` | `?id=<entryId>` |
| Jar Reason | `/api/ml-jar/delete` | `DELETE` | `?id=<reasonId>` |
| Avatar | `/api/user/avatar` | `DELETE` | none |
| Storage File | `/api/ml-storage/upload` | `DELETE` | `?path=<filePath>` |
| Bedtime Log | `/api/ml-bedtime/log` | `DELETE` | `?id=<eventId>` |
| Notification | `/api/ml-notification/history` | `DELETE` | `?id=<id>` or none (clears all) |
| Device Token | `/api/ml-device/register` | `DELETE` | `?fcmToken=X` or `?deviceId=X` |
| Push Token | `/api/ml-notify/register` | `DELETE` | none (call on logout) |
| Account | `/api/user/account` | `DELETE` | none |
| Couple | `/api/ml-couple` | `DELETE` | none (dissolves couple) |

---

## 📡 Realtime Events (Supabase Realtime)

Listen on channel: `chat_{coupleId}`

| Event | Payload | When |
|-------|---------|------|
| `new_message` | `{ message }` | Partner sends a text or media message |
| `message_deleted` | `{ messageId }` | Partner deletes a message |

```kotlin
// Subscribe example (pseudo-code)
supabase.realtime.channel("chat_$coupleId")
    .on("broadcast", filter = "event=new_message") { payload ->
        val message = payload["message"]
        // Add to local list
    }
    .on("broadcast", filter = "event=message_deleted") { payload ->
        val messageId = payload["messageId"]
        // Remove from local list / mark as deleted
    }
    .subscribe()
```

---

## 🚨 Common Error Codes

| HTTP | Meaning | Fix |
|------|---------|-----|
| `401` | Missing `x-user-id` header | Add the header |
| `400` | Missing required field / wrong field name | Check field names exactly |
| `403` | Couple is blocked / not your resource | Cannot act on blocked couple or others' content |
| `404` | Resource not found | Check the ID |
| `413` | File too large | Compress or reduce file size |
| `415` | MIME type not allowed | Check allowed types list above |
| `500` | Server error | Check logs / retry |

---

## 📋 Complete Upload Flow Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    MEDIA UPLOAD FLOW                     │
└─────────────────────────────────────────────────────────┘

User picks file
     │
     ▼
Determine bucket:
  - Profile pic     → avatars    → POST /api/user/avatar   (field: "avatar")
  - Chat file       → chat-media → POST /api/upload        (field: "file", bucket: "chat-media")
  - Timeline photo  → timeline   → POST /api/upload        (field: "file", bucket: "timeline")
  - Letter doc      → letters    → POST /api/upload        (field: "file", bucket: "letters")
     │
     ▼
POST multipart request with x-user-id header
     │
     ▼
Server validates:
  ✓ x-user-id header exists
  ✓ file not null
  ✓ bucket is valid
  ✓ MIME type allowed for bucket
  ✓ file size within limit
  ✓ couple is not blocked (for couple-scoped buckets)
     │
     ▼
Server uploads to Supabase Storage
     │
     ├─ chat-media → creates Message record automatically
     │               broadcasts new_message on realtime channel
     │
     ├─ timeline   → creates TimelineEvent record automatically
     │
     └─ letters    → optionally updates Letter record if letterId provided
     │
     ▼
Response: { success: true, file: {...}, message/timelineEvent/letter: {...} }
     │
     ▼
Client: show in UI, no second API call needed
```

---

## 🔧 Retrofit Interface (Android Reference)

```kotlin
interface UploadApi {

    // ── Unified Upload (chat, timeline, letters) ─────────────────
    @Multipart
    @POST("api/upload")
    suspend fun uploadMedia(
        @Header("x-user-id") userId: String,
        @Part file: MultipartBody.Part,
        @Part("bucket") bucket: RequestBody,
        @Part("caption") caption: RequestBody? = null,
        @Part("generateThumbnail") generateThumbnail: RequestBody? = null,
        @Part("title") title: RequestBody? = null,
        @Part("description") description: RequestBody? = null,
        @Part("type") type: RequestBody? = null,
        @Part("letterId") letterId: RequestBody? = null,
    ): Response<UploadResponse>

    // ── Avatar ───────────────────────────────────────────────────
    @Multipart
    @POST("api/user/avatar")
    suspend fun uploadAvatar(
        @Header("x-user-id") userId: String,
        @Part avatar: MultipartBody.Part,   // field name MUST be "avatar"
    ): Response<AvatarResponse>

    @DELETE("api/user/avatar")
    suspend fun deleteAvatar(
        @Header("x-user-id") userId: String,
    ): Response<SuccessResponse>

    // ── Delete storage file ──────────────────────────────────────
    @DELETE("api/ml-storage/upload")
    suspend fun deleteStorageFile(
        @Header("x-user-id") userId: String,
        @Query("path") path: String,
    ): Response<SuccessResponse>
}

// Helper to build MultipartBody.Part correctly:
fun File.toMultipartPart(fieldName: String, mimeType: String): MultipartBody.Part {
    return MultipartBody.Part.createFormData(
        fieldName, this.name, this.asRequestBody(mimeType.toMediaType())
    )
}

fun String.toRequestBody(): RequestBody =
    this.toRequestBody("text/plain".toMediaType())
```

---

## 🧪 Quick Test Checklist

Before releasing, verify these scenarios work:

- [ ] Upload JPEG photo to chat → message appears for both partners
- [ ] Upload HEIC photo (iPhone) → accepted and converted to WebP
- [ ] Upload 3GP video (Android) → accepted
- [ ] Upload M4A audio (iOS voice memo) → accepted
- [ ] Upload file with no MIME type → extension sniff kicks in
- [ ] Upload file > 50MB → returns `413`
- [ ] Upload disallowed type (e.g., `.exe`) → returns `415`
- [ ] Upload avatar with field name `"file"` → returns `400` (must be `"avatar"`)
- [ ] Delete message → partner sees it disappear via realtime
- [ ] Call `DELETE /api/ml-notify/register` on logout → push stops
