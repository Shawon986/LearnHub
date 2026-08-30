-- AlterTable
ALTER TABLE "Message" ADD COLUMN "clientId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Message_senderId_clientId_key" ON "Message"("senderId", "clientId");

