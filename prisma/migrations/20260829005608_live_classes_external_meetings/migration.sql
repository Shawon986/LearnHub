/*
  Warnings:

  - You are about to drop the `LiveClassRecording` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `chatLocked` on the `LiveClass` table. All the data in the column will be lost.
  - You are about to drop the column `materials` on the `LiveClass` table. All the data in the column will be lost.
  - You are about to drop the column `price` on the `LiveClass` table. All the data in the column will be lost.
  - You are about to drop the column `recordingEnabled` on the `LiveClass` table. All the data in the column will be lost.
  - You are about to drop the column `attendanceStatus` on the `LiveClassParticipant` table. All the data in the column will be lost.
  - You are about to drop the column `joinedAt` on the `LiveClassParticipant` table. All the data in the column will be lost.
  - You are about to drop the column `leftAt` on the `LiveClassParticipant` table. All the data in the column will be lost.
  - You are about to drop the column `muted` on the `LiveClassParticipant` table. All the data in the column will be lost.
  - You are about to drop the column `role` on the `LiveClassParticipant` table. All the data in the column will be lost.
  - You are about to drop the column `liveClassId` on the `Payment` table. All the data in the column will be lost.
  - You are about to drop the column `liveClassId` on the `Resource` table. All the data in the column will be lost.
  - Added the required column `meetingUrl` to the `LiveClass` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "LiveClassRecording_liveClassId_key";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "LiveClassRecording";
PRAGMA foreign_keys=on;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_LiveClass" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "courseId" TEXT,
    "teacherId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startsAt" DATETIME NOT NULL,
    "endsAt" DATETIME NOT NULL,
    "durationMinutes" INTEGER NOT NULL DEFAULT 60,
    "maxStudents" INTEGER NOT NULL DEFAULT 50,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "meetingUrl" TEXT NOT NULL,
    "remindedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "LiveClass_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "LiveClass_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_LiveClass" ("courseId", "createdAt", "description", "durationMinutes", "endsAt", "id", "maxStudents", "remindedAt", "startsAt", "status", "teacherId", "title", "updatedAt") SELECT "courseId", "createdAt", "description", "durationMinutes", "endsAt", "id", "maxStudents", "remindedAt", "startsAt", "status", "teacherId", "title", "updatedAt" FROM "LiveClass";
DROP TABLE "LiveClass";
ALTER TABLE "new_LiveClass" RENAME TO "LiveClass";
CREATE INDEX "LiveClass_startsAt_status_idx" ON "LiveClass"("startsAt", "status");
CREATE INDEX "LiveClass_teacherId_status_idx" ON "LiveClass"("teacherId", "status");
CREATE TABLE "new_LiveClassParticipant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "liveClassId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LiveClassParticipant_liveClassId_fkey" FOREIGN KEY ("liveClassId") REFERENCES "LiveClass" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "LiveClassParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_LiveClassParticipant" ("createdAt", "id", "liveClassId", "userId") SELECT "createdAt", "id", "liveClassId", "userId" FROM "LiveClassParticipant";
DROP TABLE "LiveClassParticipant";
ALTER TABLE "new_LiveClassParticipant" RENAME TO "LiveClassParticipant";
CREATE UNIQUE INDEX "LiveClassParticipant_liveClassId_userId_key" ON "LiveClassParticipant"("liveClassId", "userId");
CREATE TABLE "new_Payment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BDT',
    "method" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'DEV',
    "providerPaymentId" TEXT,
    "providerTrxId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "purpose" TEXT NOT NULL,
    "courseId" TEXT,
    "bookingId" TEXT,
    "metadata" JSONB,
    "paidAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Payment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Payment_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Payment_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Payment" ("amount", "bookingId", "courseId", "createdAt", "currency", "id", "metadata", "method", "paidAt", "provider", "providerPaymentId", "providerTrxId", "purpose", "status", "studentId", "updatedAt") SELECT "amount", "bookingId", "courseId", "createdAt", "currency", "id", "metadata", "method", "paidAt", "provider", "providerPaymentId", "providerTrxId", "purpose", "status", "studentId", "updatedAt" FROM "Payment";
DROP TABLE "Payment";
ALTER TABLE "new_Payment" RENAME TO "Payment";
CREATE UNIQUE INDEX "Payment_providerPaymentId_key" ON "Payment"("providerPaymentId");
CREATE UNIQUE INDEX "Payment_bookingId_key" ON "Payment"("bookingId");
CREATE INDEX "Payment_studentId_createdAt_idx" ON "Payment"("studentId", "createdAt");
CREATE INDEX "Payment_status_createdAt_idx" ON "Payment"("status", "createdAt");
CREATE TABLE "new_Resource" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "courseId" TEXT,
    "lessonId" TEXT,
    "recordedClassId" TEXT,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "sizeBytes" INTEGER,
    "uploadedById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Resource_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Resource_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Resource_recordedClassId_fkey" FOREIGN KEY ("recordedClassId") REFERENCES "RecordedClass" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Resource_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Resource" ("courseId", "createdAt", "id", "lessonId", "recordedClassId", "sizeBytes", "title", "type", "uploadedById", "url") SELECT "courseId", "createdAt", "id", "lessonId", "recordedClassId", "sizeBytes", "title", "type", "uploadedById", "url" FROM "Resource";
DROP TABLE "Resource";
ALTER TABLE "new_Resource" RENAME TO "Resource";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
