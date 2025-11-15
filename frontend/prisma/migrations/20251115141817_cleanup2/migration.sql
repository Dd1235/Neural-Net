-- CreateTable
CREATE TABLE "XCredential" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "apiKeyEncrypted" TEXT NOT NULL,
    "apiSecretEncrypted" TEXT NOT NULL,
    "bearerToken" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "XCredential_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "XCredential_userId_key" ON "XCredential"("userId");

-- AddForeignKey
ALTER TABLE "XCredential" ADD CONSTRAINT "XCredential_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
