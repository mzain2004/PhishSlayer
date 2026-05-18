#!/bin/bash
set -e

echo "=== PhishSlayer Security Baseline Check ==="

# 1. Check no containers running as root
echo "[*] Checking container user..."
docker inspect phish-slayer-phish-slayer-1 --format='{{.Config.User}}' | grep -v "^$\|^0\|^root" || echo "WARN: container may run as root"

# 2. Check no ports exposed beyond 80/443/3000
echo "[*] Checking exposed ports..."
docker ps --format "{{.Ports}}" | grep -E "0\.0\.0\.0:((?!80|443|3000|22)\d+)" && echo "WARN: unexpected ports exposed" || echo "OK: ports clean"

# 3. Check disk usage (warn if >80%)
DISK_USE=$(df -h / | awk 'NR==2{print $5}' | tr -d '%')
if [ "$DISK_USE" -gt 80 ]; then
  echo "WARN: Disk at ${DISK_USE}%. Run: docker system prune -af"
else
  echo "OK: Disk at ${DISK_USE}%"
fi

# 4. Check .env.production not readable by others
PERMS=$(stat -c "%a" /home/mzain2004/Phish-Slayer/.env.production)
if [ "$PERMS" != "600" ] && [ "$PERMS" != "640" ]; then
  echo "WARN: .env.production permissions too open: $PERMS"
  chmod 600 /home/mzain2004/Phish-Slayer/.env.production
  echo "FIXED: set to 600"
else
  echo "OK: .env.production permissions: $PERMS"
fi

# 5. Check docker-compose not exposing DB port publicly
docker ps --format "{{.Ports}}" | grep "0\.0\.0\.0:5432\|0\.0\.0\.0:6379\|0\.0\.0\.0:27017" && echo "CRITICAL: DB port exposed publicly!" || echo "OK: DB ports not publicly exposed"

echo "=== Check complete ==="
