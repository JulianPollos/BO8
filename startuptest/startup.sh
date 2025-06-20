#!/bin/bash

#"C:\Program Files\Git\git-bash.exe" --login -i "C:\Users\GA Mini 2\Documents\SD2D\BO8\startuptest\startup.sh"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> bootlog.txt
}

# Change to the directory where this script is located
cd "$(dirname "$0")" || exit

log "========== Script started =========="

log "Killing any existing Chrome instances..."
taskkill /F /IM chrome.exe 2>/dev/null || true
sleep 2

log "Starting Python HTTP server..."
python -m http.server 8000 >> bootlog.txt 2>&1 &
PYTHON_SERVER_PID=$!
sleep 3

# Create temporary Chrome user profile directory
TEMP_DIR="${TEMP:-/tmp}/chrome_temp_$(date +%s)"
mkdir -p "$TEMP_DIR"
log "Using temp directory: $TEMP_DIR"

log "Launching Chrome in kiosk mode..."
"/c/Program Files/Google/Chrome/Application/chrome.exe" \
  --kiosk \
  --new-window \
  --user-data-dir="$TEMP_DIR" \
  --app="http://localhost:8000/test7.html" \
  --use-fake-ui-for-media-stream \
  --disable-web-security \
  --disable-features=VizDisplayCompositor \
  --disable-background-timer-throttling \
  --disable-backgrounding-occluded-windows \
  --disable-renderer-backgrounding \
  --no-first-run \
  --no-default-browser-check

sleep 2
log "Chrome should now be running in fullscreen kiosk mode!"
log "Startup sequence complete. Waiting for user to stop..."

# Wait for Python HTTP server to end (Ctrl+C)
wait $PYTHON_SERVER_PID

log "========== Script ended =========="

# Optional: Keep window open for debug
read -p "Press Enter to close this window..."
