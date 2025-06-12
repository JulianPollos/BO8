#!/bin/bash

sleep 3
log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> bootlog.txt
}

# change dir
cd /c/Users/Techlab/Documents/SD2D/BO8/startuptests || exit

log "Killing any existing Chrome instances..."
taskkill //F //IM chrome.exe 2>/dev/null || true
sleep 2

log "Starting Python HTTP server..."
python -m http.server 8000 >> bootlog.txt 2>&1 &
PYTHON_SERVER_PID=$!
sleep 3

# Use proper temp location (like Script 1) and mkdir to create dir if missing
TEMP_DIR="$TEMP/chrome_temp_$(date +%s)"
mkdir -p "$TEMP_DIR"
log "Using temp directory: $TEMP_DIR"

log "Launching Chrome in kiosk mode..."
"/c/Program Files/Google/Chrome/Application/chrome.exe" \
  --kiosk \
  --new-window \
  --user-data-dir="$TEMP_DIR" \
  --app="http://localhost:8000/test5.html" \
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

# Wait for user to stop with Ctrl+C
wait $PYTHON_SERVER_PID

# delete reg
# reg delete HKCU\Software\Microsoft\Windows\CurrentVersion\Run /v StartMySite /f

# install reg (check dir)
# reg add HKCU\Software\Microsoft\Windows\CurrentVersion\Run /v StartMySite /t REG_SZ /d "\"C:\Program Files\Git\bin\bash.exe\" --login -c '/c/Users/Techlab/Documents/SD2D/BO8/startuptests/start-my-site.sh'" /f

# search for reg
# reg query HKCU\Software\Microsoft\Windows\CurrentVersion\Run
