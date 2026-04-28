-- Initial schema for Postly. Generated from prisma/schema.prisma and kept in
-- source control so production can use prisma migrate deploy.
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "bio" TEXT,
    "defaultTone" TEXT NOT NULL DEFAULT 'professional',
    "defaultLanguage" TEXT NOT NULL DEFAULT 'en',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SocialAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "accessTokenEnc" TEXT NOT NULL,
    "refreshTokenEnc" TEXT,
    "handle" TEXT NOT NULL,
    "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SocialAccount_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AiKeys" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "openaiKeyEnc" TEXT,
    "anthropicKeyEnc" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiKeys_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Post" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "idea" TEXT NOT NULL,
    "postType" TEXT NOT NULL,
    "tone" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'en',
    "modelUsed" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publishAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'queued',

    CONSTRAINT "Post_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PlatformPost" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "publishedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PlatformPost_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "SocialAccount_userId_idx" ON "SocialAccount"("userId");
CREATE INDEX "SocialAccount_platform_idx" ON "SocialAccount"("platform");
CREATE UNIQUE INDEX "AiKeys_userId_key" ON "AiKeys"("userId");
CREATE INDEX "Post_userId_idx" ON "Post"("userId");
CREATE INDEX "Post_status_idx" ON "Post"("status");
CREATE INDEX "PlatformPost_postId_idx" ON "PlatformPost"("postId");
CREATE INDEX "PlatformPost_platform_idx" ON "PlatformPost"("platform");
CREATE INDEX "PlatformPost_status_idx" ON "PlatformPost"("status");
CREATE UNIQUE INDEX "RefreshToken_token_key" ON "RefreshToken"("token");
CREATE INDEX "RefreshToken_userId_idx" ON "RefreshToken"("userId");
CREATE INDEX "RefreshToken_expiresAt_idx" ON "RefreshToken"("expiresAt");

ALTER TABLE "SocialAccount" ADD CONSTRAINT "SocialAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AiKeys" ADD CONSTRAINT "AiKeys_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Post" ADD CONSTRAINT "Post_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlatformPost" ADD CONSTRAINT "PlatformPost_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;
