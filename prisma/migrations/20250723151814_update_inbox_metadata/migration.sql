-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_inbox_items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slackTs" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "messageText" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "authorId" TEXT,
    "threadTs" TEXT,
    "permalink" TEXT,
    "channelName" TEXT,
    "expiresAt" DATETIME NOT NULL,
    "collectionType" TEXT NOT NULL DEFAULT 'MENTION',
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "inbox_items_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_inbox_items" ("authorId", "channelId", "createdAt", "expiresAt", "id", "messageText", "permalink", "slackTs", "status", "threadTs", "updatedAt", "userId") SELECT "authorId", "channelId", "createdAt", "expiresAt", "id", "messageText", "permalink", "slackTs", "status", "threadTs", "updatedAt", "userId" FROM "inbox_items";
DROP TABLE "inbox_items";
ALTER TABLE "new_inbox_items" RENAME TO "inbox_items";
CREATE UNIQUE INDEX "inbox_items_slackTs_key" ON "inbox_items"("slackTs");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
