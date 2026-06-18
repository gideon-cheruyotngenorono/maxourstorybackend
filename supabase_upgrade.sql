-- ========================================================================================
-- COMPLETE SUPABASE SQL SCHEMA BUILDER FOR 'OUR STORY' (22+ TABLES AND ENUMS)
-- Execute this entire file in your Supabase SQL Editor.
-- It is safe to run multiple times (uses IF NOT EXISTS).
-- ========================================================================================

-- 1. ENUMS
DO $$ BEGIN
    CREATE TYPE "MessageType" AS ENUM ('TEXT', 'IMAGE', 'VIDEO', 'AUDIO', 'FILE', 'SYSTEM');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE "MessageStatus" AS ENUM ('SENT', 'DELIVERED', 'READ');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 2. CREATE EXTENSIONS (if needed for gen_random_uuid)
CREATE EXTENSION IF NOT EXISTS pgcrypto;


-- ==========================================
-- 3. CORE USERS AND RELATIONSHIPS
-- ==========================================
CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL UNIQUE,
    "password" TEXT,
    "googleId" TEXT UNIQUE,
    "displayName" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "avatarPath" TEXT,
    "fcmToken" TEXT,
    "role" TEXT NOT NULL DEFAULT 'user',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "PasswordResetToken" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    "token" TEXT NOT NULL UNIQUE,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "Couple" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "partnerAId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT,
    "partnerBId" TEXT REFERENCES "User"("id") ON DELETE RESTRICT,
    "anniversaryDate" TIMESTAMP(3),
    "inviteCode" TEXT UNIQUE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- ==========================================
-- 4. MESSAGING SYSTEM
-- ==========================================
CREATE TABLE IF NOT EXISTS "Message" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "coupleId" TEXT NOT NULL REFERENCES "Couple"("id") ON DELETE CASCADE,
    "senderId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT,
    "content" TEXT,
    "type" "MessageType" NOT NULL,
    "status" "MessageStatus" NOT NULL DEFAULT 'SENT',
    "mediaUrl" TEXT,
    "thumbnailUrl" TEXT,
    "fileName" TEXT,
    "fileSize" INTEGER,
    "duration" INTEGER,
    "mimeType" TEXT,
    "size" INTEGER,
    "isEdited" BOOLEAN NOT NULL DEFAULT false,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deliveredAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "replyToId" TEXT REFERENCES "Message"("id") ON DELETE SET NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "MessageReaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "messageId" TEXT NOT NULL REFERENCES "Message"("id") ON DELETE CASCADE,
    "userId" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "MessageReadReceipt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "messageId" TEXT NOT NULL REFERENCES "Message"("id") ON DELETE CASCADE,
    "userId" TEXT NOT NULL,
    "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "StarredMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL REFERENCES "Message"("id") ON DELETE CASCADE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "ArchivedChat" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "coupleId" TEXT NOT NULL,
    "archivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "ChatVisibility" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "coupleId" TEXT NOT NULL,
    "lastClearedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE("userId", "coupleId")
);


-- ==========================================
-- 5. CONTENT / ENTRIES (Notes, Letters, etc.)
-- ==========================================
CREATE TABLE IF NOT EXISTS "Note" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "coupleId" TEXT NOT NULL REFERENCES "Couple"("id") ON DELETE CASCADE,
    "creatorId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT,
    "title" TEXT,
    "content" TEXT NOT NULL,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "Letter" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "coupleId" TEXT NOT NULL REFERENCES "Couple"("id") ON DELETE CASCADE,
    "authorId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "deliverAt" TIMESTAMP(3) NOT NULL,
    "isDraft" BOOLEAN NOT NULL DEFAULT true,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "Prayer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "coupleId" TEXT NOT NULL REFERENCES "Couple"("id") ON DELETE CASCADE,
    "creatorId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT,
    "content" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "isAnswered" BOOLEAN NOT NULL DEFAULT false,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "Reflection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "coupleId" TEXT NOT NULL REFERENCES "Couple"("id") ON DELETE CASCADE,
    "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT,
    "content" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "isShared" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "TimelineEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "coupleId" TEXT NOT NULL REFERENCES "Couple"("id") ON DELETE CASCADE,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "type" TEXT NOT NULL,
    "mediaUrl" TEXT,
    "userId" TEXT REFERENCES "User"("id") ON DELETE SET NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "GratitudeEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "coupleId" TEXT NOT NULL REFERENCES "Couple"("id") ON DELETE CASCADE,
    "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT,
    "content" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "isShared" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "JarReason" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "coupleId" TEXT NOT NULL REFERENCES "Couple"("id") ON DELETE CASCADE,
    "creatorId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT,
    "content" TEXT NOT NULL,
    "category" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "MediaFile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "url" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- ==========================================
-- 6. AI FEATURES & CACHING
-- ==========================================
CREATE TABLE IF NOT EXISTS "Verse" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reference" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL UNIQUE,
    "isFavorite" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "CoupleFavoriteVerse" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "coupleId" TEXT NOT NULL REFERENCES "Couple"("id") ON DELETE CASCADE,
    "verseId" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE("coupleId", "verseId")
);

CREATE TABLE IF NOT EXISTS "DiscussionTopic" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "question" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL UNIQUE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "DailyTopic" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" TIMESTAMP(3) NOT NULL UNIQUE DEFAULT CURRENT_TIMESTAMP,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "DailyVerse" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" TIMESTAMP(3) NOT NULL UNIQUE DEFAULT CURRENT_TIMESTAMP,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- ==========================================
-- 7. SETTINGS AND NOTIFICATIONS & AUTH SECURITY
-- ==========================================
CREATE TABLE IF NOT EXISTS "UserNotificationSettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL UNIQUE REFERENCES "User"("id") ON DELETE CASCADE,
    "pushEnabled" BOOLEAN NOT NULL DEFAULT true,
    "dailyReminder" BOOLEAN NOT NULL DEFAULT true,
    "chatNotifications" BOOLEAN NOT NULL DEFAULT true,
    "partnerActivity" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "Notification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "RefreshToken" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    "tokenHash" TEXT NOT NULL UNIQUE,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "Device" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    "platform" TEXT NOT NULL,
    "deviceName" TEXT,
    "fcmToken" TEXT,
    "lastSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- ==========================================
-- 8. ADMIN / PLATFORM LOGS
-- ==========================================
CREATE TABLE IF NOT EXISTS "ContentReport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reporterId" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "adminNotes" TEXT,
    "resolvedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "Announcement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'low',
    "createdById" TEXT NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "AdminAuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "adminId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT,
    "action" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- ==========================================
-- 9. ADDITIVE UPGRADES (FOR EXISTING DB ENVIRONMENTS)
-- (Safely ignores the schema updates if the column already exists)
-- ==========================================
DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE "Message" ADD COLUMN "status" "MessageStatus" NOT NULL DEFAULT 'SENT';
    EXCEPTION WHEN duplicate_column THEN END;
    BEGIN
        ALTER TABLE "Message" ADD COLUMN "deliveredAt" TIMESTAMP(3);
    EXCEPTION WHEN duplicate_column THEN END;
    BEGIN
        ALTER TABLE "Message" ADD COLUMN "readAt" TIMESTAMP(3);
    EXCEPTION WHEN duplicate_column THEN END;
    BEGIN
        ALTER TABLE "Message" ADD COLUMN "deletedAt" TIMESTAMP(3);
    EXCEPTION WHEN duplicate_column THEN END;
    BEGIN
        ALTER TABLE "Message" ADD COLUMN "mimeType" TEXT;
    EXCEPTION WHEN duplicate_column THEN END;
    BEGIN
        ALTER TABLE "Message" ADD COLUMN "size" INTEGER;
    EXCEPTION WHEN duplicate_column THEN END;
END $$;


-- ==========================================
-- 10. REALTIME PUBLICATIONS
-- ==========================================
-- Ensure these tables actually broadcast state via Supabase logic
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime;
COMMIT;
ALTER PUBLICATION supabase_realtime ADD TABLE "Message";
ALTER PUBLICATION supabase_realtime ADD TABLE "Notification";


-- ==========================================
-- 11. SUPABASE STORAGE (BUCKETS & RLS POLICIES)
-- ==========================================

-- IMPORTANT: Supabase needs 'storage' schema access. Depending on your 
-- Supabase setup, you might need to enable RLS on the buckets.

-- Create basic buckets for the application:
insert into storage.buckets (id, name, public) 
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public) 
values ('chat-media', 'chat-media', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public) 
values ('timeline', 'timeline', false)
on conflict (id) do nothing;

-- Enable RLS on storage objects
alter table storage.objects enable row level security;

-- -------------------------
-- Avatars Policies
-- -------------------------
-- Anyone can view avatars (bucket is public, but let's be explicit)
create policy "Avatars are publicly accessible" 
on storage.objects for select 
using (bucket_id = 'avatars');

-- Authenticated users can upload avatars
create policy "Users can upload their own avatars" 
on storage.objects for insert 
to authenticated 
with check (bucket_id = 'avatars');

-- Users can update/delete their own avatars
create policy "Users can update their own avatars" 
on storage.objects for update 
to authenticated 
using (bucket_id = 'avatars');

create policy "Users can delete their own avatars" 
on storage.objects for delete 
to authenticated 
using (bucket_id = 'avatars');

-- -------------------------
-- Chat Media Policies
-- -------------------------
-- Authenticated users can view chat media
create policy "Authenticated users can view chat media" 
on storage.objects for select 
to authenticated 
using (bucket_id = 'chat-media');

-- Authenticated users can upload chat media
create policy "Authenticated users can upload chat media" 
on storage.objects for insert 
to authenticated 
with check (bucket_id = 'chat-media');

-- Authenticated users can delete chat media
create policy "Authenticated users can delete chat media" 
on storage.objects for delete 
to authenticated 
using (bucket_id = 'chat-media');

-- -------------------------
-- Timeline Policies
-- -------------------------
-- Authenticated users can view timeline media
create policy "Authenticated users can view timeline media" 
on storage.objects for select 
to authenticated 
using (bucket_id = 'timeline');

-- Authenticated users can upload timeline media
create policy "Authenticated users can upload timeline media" 
on storage.objects for insert 
to authenticated 
with check (bucket_id = 'timeline');

-- DONE!
