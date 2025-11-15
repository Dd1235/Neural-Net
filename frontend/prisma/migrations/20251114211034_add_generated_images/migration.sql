-- CreateTable
CREATE TABLE "NewsArticle" (
    "threadID" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "url" TEXT,
    "createTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NewsArticle_pkey" PRIMARY KEY ("threadID")
);

-- CreateTable
CREATE TABLE "GeneratedImage" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "prompt" TEXT NOT NULL,
    "fileKey" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GeneratedImage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NewsArticle_threadID_key" ON "NewsArticle"("threadID");

-- AddForeignKey
ALTER TABLE "GeneratedImage" ADD CONSTRAINT "GeneratedImage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
