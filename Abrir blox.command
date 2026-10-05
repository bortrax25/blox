#!/bin/zsh
# Doble clic para abrir blox: arranca el servidor y abre Chrome.
# Cierra esta ventana de Terminal (o pulsa Ctrl+C) para apagarlo.

export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
cd "$(dirname "$0")/editor-a4" || exit 1

URL="http://localhost:5317"

open_browser() {
  open -a "Google Chrome" "$URL" 2>/dev/null || open "$URL"
}

# Si blox ya está corriendo, solo abre el navegador.
if curl -s "$URL" | grep -q "<title>blox</title>"; then
  open_browser
  exit 0
fi

[ -d node_modules ] || npm install

npm run dev &
SERVER_PID=$!
trap 'kill $SERVER_PID 2>/dev/null' EXIT INT TERM

until curl -s -o /dev/null "$URL"; do sleep 0.3; done
open_browser

wait $SERVER_PID
