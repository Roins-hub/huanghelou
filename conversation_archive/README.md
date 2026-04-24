# Conversation Archive

自动把本地历史对话文件同步到阿里云轻量应用服务器。

## 服务器端

```bash
sudo mkdir -p /opt/conversation-archive /data/conversations
sudo chown -R $USER:$USER /opt/conversation-archive /data/conversations
cd /opt/conversation-archive
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

创建环境变量文件：

```bash
cat > .env <<'EOF'
CONVERSATION_ARCHIVE_ROOT=/data/conversations
CONVERSATION_ARCHIVE_TOKEN=换成一串很长的随机密码
EOF
```

启动测试：

```bash
source .venv/bin/activate
export $(grep -v '^#' .env | xargs)
uvicorn conversation_archive.server:app --host 0.0.0.0 --port 8000
```

确认 `http://服务器IP:8000/health` 返回 `{"status":"ok"}`。

## systemd 后台运行

```bash
sudo tee /etc/systemd/system/conversation-archive.service >/dev/null <<'EOF'
[Unit]
Description=Conversation Archive Server
After=network.target

[Service]
WorkingDirectory=/opt/conversation-archive
EnvironmentFile=/opt/conversation-archive/.env
ExecStart=/opt/conversation-archive/.venv/bin/uvicorn conversation_archive.server:app --host 0.0.0.0 --port 8000
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now conversation-archive
sudo systemctl status conversation-archive
```

阿里云安全组需要放行 `8000`。正式使用时建议后续加 Nginx 和 HTTPS。

也可以把整个 `conversation_archive` 目录上传到服务器后，直接运行：

```bash
export CONVERSATION_ARCHIVE_TOKEN=换成一串很长的随机密码
bash deploy/install-server.sh
```

## 本地 Windows 自动上传

一次同步：

```powershell
$env:CONVERSATION_SERVER_URL="http://服务器IP:8000"
$env:CONVERSATION_ARCHIVE_TOKEN="服务器上的同一串密码"
python -m conversation_archive.client --source "D:\3Dmoxing\data\conversations"
```

持续监听：

```powershell
python -m conversation_archive.client --source "D:\3Dmoxing\data\conversations" --watch --interval 60
```

创建 Windows 计划任务，每 5 分钟自动同步一次：

```powershell
.\conversation_archive\deploy\install-windows-task.ps1 `
  -SourceDir "D:\3Dmoxing\data\conversations" `
  -ServerUrl "http://服务器IP:8000" `
  -Token "服务器上的同一串密码"
```

支持同步的文件：`.md`、`.markdown`、`.json`、`.txt`。

服务器保存结构：

```text
/data/conversations/
  2026-04/
    2026-04-24_example.md
  index.tsv
```
