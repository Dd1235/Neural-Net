-- CreateTable
CREATE TABLE "GeneratedAudio" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "text" VARCHAR(200) NOT NULL,
    "description" TEXT NOT NULL,
    "voiceLabel" TEXT,
    "audioUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GeneratedAudio_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "GeneratedAudio"
ADD CONSTRAINT "GeneratedAudio_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
