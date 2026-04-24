#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/conversation-archive}"
ARCHIVE_ROOT="${CONVERSATION_ARCHIVE_ROOT:-/data/conversations}"
TOKEN="${CONVERSATION_ARCHIVE_TOKEN:-}"

if [[ -z "$TOKEN" ]]; then
  echo "Set CONVERSATION_ARCHIVE_TOKEN before running this script."
  exit 1
fi

sudo mkdir -p "$APP_DIR" "$ARCHIVE_ROOT"
sudo chown -R "$USER:$USER" "$APP_DIR" "$ARCHIVE_ROOT"

rsync -a --exclude ".venv" --exclude "__pycache__" ./ "$APP_DIR"/

cd "$APP_DIR"
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

cat > .env <<EOF
CONVERSATION_ARCHIVE_ROOT=$ARCHIVE_ROOT
CONVERSATION_ARCHIVE_TOKEN=$TOKEN
EOF

sudo tee /etc/systemd/system/conversation-archive.service >/dev/null <<EOF
[Unit]
Description=Conversation Archive Server
After=network.target

[Service]
WorkingDirectory=$APP_DIR
EnvironmentFile=$APP_DIR/.env
ExecStart=$APP_DIR/.venv/bin/uvicorn conversation_archive.server:app --host 0.0.0.0 --port 8000
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now conversation-archive
sudo systemctl status conversation-archive --no-pager

