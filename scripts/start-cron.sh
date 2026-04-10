#!/bin/sh
# Phish-Slayer Cron Runner
# Triggers all agent endpoints on schedule

echo "Cron runner started"
echo "Base URL: $CRON_BASE_URL"

# Wait for main app to be ready
echo "Waiting for app to be ready..."
until wget -q --spider "$CRON_BASE_URL/api/metrics" 2>/dev/null; do
  echo "App not ready yet, retrying in 5s..."
  sleep 5
done
echo "App is ready"

# Run forever
while true; do
  CURRENT_MINUTE=$(date +%M)
  CURRENT_HOUR=$(date +%H)

  # L2 runs every 15 minutes
  if [ $((10#$CURRENT_MINUTE % 15)) -eq 0 ]; then
    echo "[$(date)] Running L2 Responder..."
    wget -q -O /dev/null \
      --header="Authorization: Bearer $CRON_SECRET" \
      "$CRON_BASE_URL/api/cron/l2-respond" || true
  fi

  # L1 runs every hour at minute 0
  if [ "$CURRENT_MINUTE" = "00" ]; then
    echo "[$(date)] Running L1 Triage..."
    wget -q -O /dev/null \
      --header="Authorization: Bearer $CRON_SECRET" \
      "$CRON_BASE_URL/api/cron/l1-triage" || true
  fi

  # L3 runs every 6 hours at minute 0
  if [ "$CURRENT_MINUTE" = "00" ] && \
     [ $((10#$CURRENT_HOUR % 6)) -eq 0 ]; then
    echo "[$(date)] Running L3 Hunter..."
    wget -q -O /dev/null \
      --header="Authorization: Bearer $CRON_SECRET" \
      "$CRON_BASE_URL/api/cron/l3-hunt" || true
  fi

  # Wazuh health every 30 minutes
  if [ $((10#$CURRENT_MINUTE % 30)) -eq 0 ]; then
    echo "[$(date)] Running Wazuh health check..."
    wget -q -O /dev/null \
      --header="Authorization: Bearer $CRON_SECRET" \
      "$CRON_BASE_URL/api/infrastructure/wazuh-health" || true
  fi

  sleep 60
done
