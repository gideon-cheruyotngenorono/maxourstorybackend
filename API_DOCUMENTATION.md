# Our Story API Integration Guide

Base URL: `https://maxourstorybackend.vercel.app`

## Universal Authentication Rules
Almost all protected routes (except Auth and Webhooks) require the caller to provide identity headers.

**Required Headers for Protected Routes:**
- `x-user-id`: The User ID obtained during Login/Register.
- `Authorization`: Bearer token (Access Token).
- `Content-Type`: `application/json` (Crucial for `POST`, `PUT`, `PATCH` requests; omitting this will often cause a **400 Bad Request** error).

---

## 1. Authentication Endpoints

> [!WARNING]
> Ensure you send `Content-Type: application/json` for all these requests. The register route explicitly throws a 400 Bad Request if this header is missing or if the body is empty/malformed.

### Register
**`POST /api/auth/register`**
Creates a new user account.
- **Body:** `{ "email": "user@example.com", "password": "password123", "displayName": "John Doe" }`
- **Success (201):** `{ "message": "...", "user": { "id": "...", ... }, "accessToken": "..." }`
- Note: Refresh token is set as an HTTP-only cookie automatically.

### Login
**`POST /api/auth/login`**
Authenticates an existing user.
- **Body:** `{ "email": "user@example.com", "password": "password123" }`
- **Success (200):** `{ "message": "...", "user": { "id": "...", ... }, "accessToken": "..." }`

### Google Auth
**`POST /api/auth/google`**
Authenticates or registers a user via Google ID Token.
- **Body:** `{ "idToken": "google_id_token_here" }`
- **Success (200):** `{ "message": "...", "user": { ... }, "accessToken": "..." }`

### Refresh Token
**`POST /api/auth/refresh`**
Gets a new access token using the HTTP-only cookie.
- **Body:** None
- **Success (200):** `{ "accessToken": "new_token" }`

---

## 2. User & Profile Endpoints

### Get Profile
**`GET /api/user/profile`**
- **Headers:** `x-user-id`, `Authorization: Bearer <token>`
- **Success (200):** Returns user profile with `displayName`, `avatarUrl`, and `avatarInitials`.

### Update Profile (text fields only)
**`PATCH /api/user/profile`**
- **Headers:** `x-user-id`, `Authorization: Bearer <token>`, `Content-Type: application/json`
- **Body (Optional fields):** `{ "displayName": "New Name", "avatarUrl": "https://..." }`
- **Success (200):** Returns updated user profile.

### Upload Avatar (file from gallery)
**`POST /api/user/avatar`**

> [!IMPORTANT]
> This is a **multipart/form-data** request — do NOT set `Content-Type: application/json`. Let the HTTP client set it automatically with the boundary.

- **Headers:** `Authorization: Bearer <token>` *(x-user-id is injected by middleware from the token)*
- **Body:** `multipart/form-data` with field name **`avatar`**
- **Allowed types:** `image/jpeg`, `image/png`, `image/webp`
- **Max size:** 5 MB
- **Success (200):**
  ```json
  { "success": true, "avatarUrl": "https://...", "message": "Avatar uploaded successfully" }
  ```
- **415** — Wrong file type (not jpg/png/webp)
- **413** — File exceeds 5 MB

**Android Retrofit example:**
```kotlin
@Multipart
@POST("api/user/avatar")
suspend fun uploadAvatar(
    @Header("Authorization") token: String,
    @Part avatar: MultipartBody.Part
): Response<AvatarUploadResponse>

// Build the part:
val file = File(imagePath)
val requestFile = file.asRequestBody("image/jpeg".toMediaType())
val avatarPart = MultipartBody.Part.createFormData("avatar", file.name, requestFile)
```

### Delete Avatar
**`DELETE /api/user/avatar`**
- **Headers:** `Authorization: Bearer <token>`
- **Success (200):** `{ "success": true, "message": "Avatar deleted successfully" }`

### Delete Account
**`DELETE /api/user/account`**
- **Headers:** `x-user-id`, `Authorization: Bearer <token>`
- **Success (200):** `{ "success": true }`

---

## 3. Media Upload (Chat & Notes)

### Step 1 – Upload File
**`POST /api/ml-storage/upload`**

> [!IMPORTANT]
> Also **multipart/form-data** — do NOT set `Content-Type: application/json`.

- **Headers:** `Authorization: Bearer <token>`
- **Body fields:**
  - `file` — the file blob
  - `type` — one of `IMAGE`, `VIDEO`, `AUDIO`, `FILE`
- **Size limits:** IMAGE 10 MB · VIDEO 50 MB · AUDIO 20 MB · FILE 25 MB
- **Success (200):**
  ```json
  { "success": true, "url": "https://...", "size": 12345, "originalName": "pic.jpg" }
  ```

### Step 2 – Send Message with the URL
**`POST /api/ml-chat/send`** *(Content-Type: application/json)*
```json
{ "type": "IMAGE", "mediaUrl": "https://...", "fileName": "pic.jpg" }
```

---

## 3. Couple & Connection Endpoints

> [!IMPORTANT]
> A user can only be in one couple at a time. Trying to create or join a couple when already in one will result in a 400 Bad Request.

### Create/Invite
**`POST /api/ml-couple/create`**
Generates an invite code to form a couple.
- **Headers:** `x-user-id`
- **Body (Optional):** `{ "partnerEmail": "partner@example.com" }`
- **Success (201):** `{ "message": "...", "inviteCode": "A1B2C3", "couple": { ... } }`

### Join via Invite Code
**`POST /api/ml-couple/join`**
Links you to a partner using an invite code.
- **Headers:** `x-user-id`
- **Body:** `{ "inviteCode": "A1B2C3" }` *(Must be the exact string)*
- **Success (200):** `{ "message": "...", "couple": { ... } }`

### Get Couple Profile
**`GET /api/ml-couple/profile`**
- **Headers:** `x-user-id`
- **Success (200):** `{ "partnerA": { ... }, "partnerB": { ... }, "daysTogether": 15 }`

### Update Anniversary Date
**`PATCH /api/ml-couple/profile`**
- **Headers:** `x-user-id`
- **Body:** `{ "anniversaryDate": "2023-01-01T00:00:00.000Z" }`
- **Success (200):** `{ "success": true, "anniversaryDate": "..." }`

### Delete Couple
**`DELETE /api/ml-couple`**
Dissolves the couple and cascades deletions to shared data (messages, notes, etc).
- **Headers:** `x-user-id`
- **Success (200):** `{ "success": true, "message": "..." }`

---

## 4. Chat Endpoints

### Send Message
**`POST /api/ml-chat/send`**
- **Headers:** `x-user-id`
- **Body for Text:** `{ "type": "TEXT", "content": "Hello!" }`
- **Body for Media:** `{ "type": "IMAGE", "mediaUrl": "https://...", "fileName": "pic.jpg" }`
- **Valid Types:** `TEXT`, `IMAGE`, `VIDEO`, `AUDIO`, `FILE`, `SYSTEM`
- **Success (200):** `{ "success": true, "message": { ... } }`

### Get Chat History
**`GET /api/ml-chat/history?limit=50&cursor=msg_id`**
- **Headers:** `x-user-id`
- **Success (200):** `{ "messages": [ ... ] }`

---

## 5. Notes Endpoints

### Create Note
**`POST /api/ml-notes/create`**
- **Headers:** `x-user-id`
- **Body:** `{ "title": "Grocery List", "content": "Apples, Bananas", "mediaUrl": null, "isPinned": false, "color": "#FFFFFF" }`
- **Success (201):** `{ "note": { ... } }`

### List Notes
**`GET /api/ml-notes/list`**
- **Headers:** `x-user-id`
- **Success (200):** `{ "notes": [ ... ] }`

### Update Note
**`PUT /api/ml-notes/update`**
- **Headers:** `x-user-id`
- **Body:** `{ "id": "note_id", "title": "Updated Title", "content": "Updated Content" }`
- **Success (200):** `{ "note": { ... } }`

### Delete Note
**`DELETE /api/ml-notes/delete?id=note_id`**
- **Headers:** `x-user-id`
- **Success (200):** `{ "success": true }`

---

## 6. Gratitude Endpoints

### Create Gratitude Entry
**`POST /api/ml-gratitude/create`**
- **Headers:** `x-user-id`
- **Body:** `{ "content": "Thankful for you", "date": "2026-06-19T00:00:00.000Z", "isShared": true }`
- **Success (201):** `{ "entry": { ... } }`

### List Gratitude Entries
**`GET /api/ml-gratitude/list`**
- **Headers:** `x-user-id`
- **Success (200):** `{ "entries": [ ... ] }`

### Update & Delete Gratitude
- **PUT `/api/ml-gratitude/update`**: Body requires `{ "id": "...", "content": "...", "date": "...", "isShared": true }`
- **DELETE `/api/ml-gratitude/delete?id=entry_id`**: Passed via query parameters.

---

## 🛑 Common Causes for "400 Bad Request" 

1. **Missing `Content-Type: application/json` Header**  
   If your frontend agent is omitting this header, Next.js won't parse the body correctly, and Zod validator will throw an error.
   
2. **Invalid Data Formats (Zod Validation)**  
   Ensure dates are in standard ISO strings (`YYYY-MM-DDTHH:mm:ss.sssZ`), and boolean values (`isShared`, `isPinned`) are actual booleans (`true`/`false`), not strings (`"true"`).
   
3. **Empty Request Bodies**  
   Sending `null` or `{}` for endpoints that expect data (like Registration, Login, Create forms) will throw a validation error.

4. **Couple Logic Violations**  
   - Trying to join a couple when you are already in one throws `400`.
   - Trying to join with an invalid/expired invite code throws `404` or `400`.
   - You cannot use your own invite code.
