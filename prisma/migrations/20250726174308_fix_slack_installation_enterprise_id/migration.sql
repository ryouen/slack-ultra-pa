/*
  Warnings:

  - Made the column `teamId` on table `slack_installations` required. This step will fail if there are existing NULL values in that column.
  - Made the column `enterpriseId` on table `slack_installations` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "slack_installations" ALTER COLUMN "teamId" SET NOT NULL,
ALTER COLUMN "enterpriseId" SET NOT NULL,
ALTER COLUMN "enterpriseId" SET DEFAULT '';
