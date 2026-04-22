import { mkdtemp, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  clearChatSession,
  getSessionFilePath,
  loadChatSession,
  saveChatSession,
  sanitizeSessionMessages
} from "../api/chat-session-store.js";

let storageRoot;

beforeEach(async () => {
  storageRoot = await mkdtemp(join(tmpdir(), "huanghelou-chat-sessions-"));
});

afterEach(async () => {
  await rm(storageRoot, { recursive: true, force: true });
});

describe("chat session store", () => {
  it("saves and restores messages for a safe visitor session id", async () => {
    const messages = [
      {
        id: "welcome",
        direction: "incoming",
        sender: "assistant",
        message: "你好，我是黄鹤楼 AI 智能导览。"
      },
      {
        id: "user-1",
        direction: "outgoing",
        sender: "user",
        message: "黄鹤楼每层分别讲什么？"
      }
    ];

    await saveChatSession({
      storageRoot,
      sessionId: "visitor_abc-123",
      messages
    });

    await expect(loadChatSession({ storageRoot, sessionId: "visitor_abc-123" })).resolves.toEqual(messages);
  });

  it("keeps session files inside the configured storage directory", async () => {
    await expect(() => getSessionFilePath(storageRoot, "../bad")).toThrow("Invalid session id");
  });

  it("stores only compact valid chat messages", () => {
    const messages = sanitizeSessionMessages([
      {
        id: "x".repeat(120),
        direction: "incoming",
        sender: "assistant",
        message: "  内容  "
      },
      {
        id: "ignored",
        direction: "sideways",
        sender: "assistant",
        message: "bad"
      },
      {
        id: "also-ignored",
        direction: "outgoing",
        sender: "system",
        message: "bad"
      }
    ]);

    expect(messages).toEqual([
      {
        id: "x".repeat(80),
        direction: "incoming",
        sender: "assistant",
        message: "内容"
      }
    ]);
  });

  it("limits stored messages and can clear the session file", async () => {
    const messages = Array.from({ length: 80 }, (_, index) => ({
      id: `message-${index}`,
      direction: index % 2 ? "incoming" : "outgoing",
      sender: index % 2 ? "assistant" : "user",
      message: `message ${index}`
    }));

    await saveChatSession({
      storageRoot,
      sessionId: "visitor1",
      messages
    });

    const raw = JSON.parse(await readFile(join(storageRoot, "visitor1.json"), "utf8"));
    expect(raw.messages).toHaveLength(50);
    expect(raw.messages[0].message).toBe("message 30");

    await clearChatSession({ storageRoot, sessionId: "visitor1" });
    await expect(loadChatSession({ storageRoot, sessionId: "visitor1" })).resolves.toEqual([]);
  });
});
