-- CreateTable
CREATE TABLE "WebAuthnChallenge" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "challenge" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
