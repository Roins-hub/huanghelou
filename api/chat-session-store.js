import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const MAX_SESSION_MESSAGES = 50;
const MAX_MESSAGE_LENGTH = 8000;
const MAX_ID_LENGTH = 80;
const VALID_DIRECTIONS = new Set(["incoming", "outgoing"]);
const VALID_SENDERS = new Set(["assistant", "user"]);

export function getDefaultSessionStorageRoot() {
  return join(process.cwd(), "data", "chat-sessions");
}

export function getSessionFilePath(storageRoot, sessionId) {
  if (!/^[a-zA-Z0-9_-]{8,80}$/.test(sessionId || "")) {
    throw new Error("Invalid session id");
  }

  const root = resolve(storageRoot);
  const filePath = resolve(root, `${sessionId}.json`);

  if (!filePath.startsWith(`${root}/`) && !filePath.startsWith(`${root}\\`)) {
    throw new Error("Invalid session path");
  }

  return filePath;
}

export function sanitizeSessionMessages(messages) {
  if (!Array.isArray(messages)) {
    return [];
  }

  return messages
    .map((item) => ({
      id: String(item?.id || "").slice(0, MAX_ID_LENGTH),
      direction: item?.direction,
      sender: item?.sender,
      message: String(item?.message || "").trim().slice(0, MAX_MESSAGE_LENGTH)
    }))
    .filter((item) =>
      item.id &&
      item.message &&
      VALID_DIRECTIONS.has(item.direction) &&
      VALID_SENDERS.has(item.sender)
    )
    .slice(-MAX_SESSION_MESSAGES);
}

export async function loadChatSession({ storageRoot = getDefaultSessionStorageRoot(), sessionId }) {
  const filePath = getSessionFilePath(storageRoot, sessionId);

  try {
    const raw = await readFile(filePath, "utf8");
    const data = JSON.parse(raw);
    return sanitizeSessionMessages(data.messages);
  } catch (error) {
    if (error.code === "ENOENT") {
      return [];
    }

    throw error;
  }
}

export async function saveChatSession({ storageRoot = getDefaultSessionStorageRoot(), sessionId, messages }) {
  const filePath = getSessionFilePath(storageRoot, sessionId);
  const safeMessages = sanitizeSessionMessages(messages);

  await mkdir(storageRoot, { recursive: true });
  await writeFile(filePath, JSON.stringify({
    updatedAt: new Date().toISOString(),
    messages: safeMessages
  }, null, 2), "utf8");

  return safeMessages;
}

export async function clearChatSession({ storageRoot = getDefaultSessionStorageRoot(), sessionId }) {
  const filePath = getSessionFilePath(storageRoot, sessionId);
  await rm(filePath, { force: true });
}
