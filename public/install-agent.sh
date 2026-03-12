#!/bin/bash
# Phish-Slayer EDR Agent Installer for Linux/macOS
# Usage: curl -sSL http://localhost:3000/install-agent.sh | bash -s -- --secret "AGENT_SECRET" --url "http://localhost:3000"

set -e

SECRET=""
URL=""

while [[ "$#" -gt 0 ]]; do
    case $1 in
        --secret) SECRET="$2"; shift ;;
        --url) URL="$2"; shift ;;
        *) echo "Unknown parameter passed: $1"; exit 1 ;;
    esac
    shift
done

if [ -z "$SECRET" ] || [ -z "$URL" ]; then
    echo "Usage: $0 --secret <AGENT_SECRET> --url <DASHBOARD_URL>"
    exit 1
fi

echo "[*] Installing Node.js dependencies..."
npm install -g pm2
npm install chokidar ps-list ws ts-node typescript

echo "[*] Downloading EDR Agent..."
mkdir -p /opt/phish-slayer/agent
curl -sSL "$URL/api/agent/download" -o /opt/phish-slayer/agent/endpointMonitor.ts || {
    echo "Failed to download endpointMonitor.ts. Ensure the server is reachable."
    exit 1
}

echo "[*] Configuring Environment..."
cat <<EOF > /opt/phish-slayer/agent/.env
AGENT_SECRET=$SECRET
NEXT_PUBLIC_SITE_URL=$URL
EOF

echo "[*] Starting EDR Agent Service via PM2..."
cd /opt/phish-slayer/agent
pm2 start "npx ts-node endpointMonitor.ts" --name phish-slayer-agent --env .env
pm2 save
pm2 startup

echo "[+] Phish-Slayer EDR Agent installed and running successfully."
