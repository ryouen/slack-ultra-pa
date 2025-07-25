-- AlterTable
ALTER TABLE "inbox_items" ADD COLUMN     "hasReplied" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "importance" TEXT NOT NULL DEFAULT 'medium',
ADD COLUMN     "isTaskCreated" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastReplyTs" TEXT,
ADD COLUMN     "replyCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "taskId" TEXT;

-- CreateIndex
CREATE INDEX "inbox_items_userId_hasReplied_idx" ON "inbox_items"("userId", "hasReplied");
