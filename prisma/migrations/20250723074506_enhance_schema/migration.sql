-- AlterTable
ALTER TABLE "inbox_items" ADD COLUMN "authorId" TEXT;
ALTER TABLE "inbox_items" ADD COLUMN "permalink" TEXT;
ALTER TABLE "inbox_items" ADD COLUMN "threadTs" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_oauth_tokens" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "provider" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT,
    "expiresAt" DATETIME,
    "scope" TEXT NOT NULL DEFAULT '',
    "tokenType" TEXT NOT NULL DEFAULT 'Bearer',
    "lastRefresh" DATETIME,
    "isValid" BOOLEAN NOT NULL DEFAULT true,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "oauth_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_oauth_tokens" ("accessToken", "createdAt", "expiresAt", "id", "provider", "refreshToken", "scope", "updatedAt", "userId") SELECT "accessToken", "createdAt", "expiresAt", "id", "provider", "refreshToken", "scope", "updatedAt", "userId" FROM "oauth_tokens";
DROP TABLE "oauth_tokens";
ALTER TABLE "new_oauth_tokens" RENAME TO "oauth_tokens";
CREATE UNIQUE INDEX "oauth_tokens_userId_provider_key" ON "oauth_tokens"("userId", "provider");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
