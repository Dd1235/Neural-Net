-- CreateTable
CREATE TABLE "BlogThread" (
    "threadID" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "url" TEXT,
    "createTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BlogThread_pkey" PRIMARY KEY ("threadID")
);

-- CreateIndex
CREATE UNIQUE INDEX "BlogThread_threadID_key" ON "BlogThread"("threadID");
