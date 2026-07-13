-- CreateTable
CREATE TABLE "VpnConnectionLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "deviceName" TEXT,
    "serverName" TEXT NOT NULL,
    "serverCountry" TEXT,
    "serverLocation" TEXT,
    "exitIp" TEXT,
    "connectedSinceUnix" BIGINT NOT NULL,
    "bytesRead" BIGINT NOT NULL DEFAULT 0,
    "bytesWrite" BIGINT NOT NULL DEFAULT 0,
    "firstSeenAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" DATETIME,
    CONSTRAINT "VpnConnectionLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "VpnConnectionLog_userId_lastSeenAt_idx" ON "VpnConnectionLog"("userId", "lastSeenAt");

-- CreateIndex
CREATE UNIQUE INDEX "VpnConnectionLog_userId_serverName_connectedSinceUnix_deviceName_key" ON "VpnConnectionLog"("userId", "serverName", "connectedSinceUnix", "deviceName");
