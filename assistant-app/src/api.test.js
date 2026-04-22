import { afterEach, describe, expect, it, vi } from "vitest";

import {
  clearChatSession,
  loadChatSession,
  saveChatSession,
  streamChatMessage,
  testAssistantProvider
} from "./api.js";

function createTextStream(chunks) {
  const encoder = new TextEncoder();

  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk));
      }

      controller.close();
    }
  });
}

describe("assistant api streaming", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("reads streamed text chunks and reports each chunk", async () => {
    const onChunk = vi.fn();
    vi.stubGlobal("fetch", vi.fn(async () => new Response(createTextStream(["黄鹤楼", "位于武汉。"]), {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8"
      }
    })));

    const reply = await streamChatMessage({
      message: "介绍黄鹤楼",
      history: [],
      onChunk
    });

    expect(fetch).toHaveBeenCalledWith("/api/chat", expect.objectContaining({
      method: "POST",
      body: JSON.stringify({ message: "介绍黄鹤楼", history: [], stream: true })
    }));
    expect(onChunk).toHaveBeenNthCalledWith(1, "黄鹤楼");
    expect(onChunk).toHaveBeenNthCalledWith(2, "位于武汉。");
    expect(reply).toBe("黄鹤楼位于武汉。");
  });

  it("sends custom provider settings with the chat request", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({
      reply: "连接自定义模型。"
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8"
      }
    })));

    await streamChatMessage({
      message: "你好",
      history: [],
      provider: {
        baseUrl: "https://api.openai.com/v1",
        apiKey: "sk-test",
        model: "gpt-4o-mini",
        stream: false
      },
      onChunk: vi.fn()
    });

    expect(fetch).toHaveBeenCalledWith("/api/chat", expect.objectContaining({
      body: JSON.stringify({
        message: "你好",
        history: [],
        stream: false,
        provider: {
          baseUrl: "https://api.openai.com/v1",
          apiKey: "sk-test",
          model: "gpt-4o-mini"
        }
      })
    }));
  });

  it("tests custom provider settings through the test endpoint", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({
      ok: true,
      reply: "连接成功"
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8"
      }
    })));

    const data = await testAssistantProvider({
      baseUrl: "https://api.openai.com/v1",
      apiKey: "sk-test",
      model: "gpt-4o-mini"
    });

    expect(data.ok).toBe(true);
    expect(fetch).toHaveBeenCalledWith("/api/test-model", expect.objectContaining({
      method: "POST",
      body: JSON.stringify({
        provider: {
          baseUrl: "https://api.openai.com/v1",
          apiKey: "sk-test",
          model: "gpt-4o-mini"
        }
      })
    }));
  });

  it("falls back to the reply field when the server returns json", async () => {
    const onChunk = vi.fn();
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({
      reply: "欢迎来到第二层。"
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8"
      }
    })));

    const reply = await streamChatMessage({
      message: "介绍第二层",
      history: [],
      onChunk
    });

    expect(onChunk).toHaveBeenCalledWith("欢迎来到第二层。");
    expect(reply).toBe("欢迎来到第二层。");
  });

  it("loads, saves and clears chat sessions through the session endpoint", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url, options = {}) => {
      if (options.method === "PUT") {
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "Content-Type": "application/json; charset=utf-8" }
        });
      }

      if (options.method === "DELETE") {
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "Content-Type": "application/json; charset=utf-8" }
        });
      }

      return new Response(JSON.stringify({
        messages: [
          {
            id: "welcome",
            direction: "incoming",
            sender: "assistant",
            message: "你好"
          }
        ]
      }), {
        status: 200,
        headers: { "Content-Type": "application/json; charset=utf-8" }
      });
    }));

    await expect(loadChatSession("visitor_1")).resolves.toHaveLength(1);
    await saveChatSession("visitor_1", [
      {
        id: "welcome",
        direction: "incoming",
        sender: "assistant",
        message: "你好"
      }
    ]);
    await clearChatSession("visitor_1");

    expect(fetch).toHaveBeenNthCalledWith(1, "/api/chat-session?sessionId=visitor_1", expect.objectContaining({
      method: "GET"
    }));
    expect(fetch).toHaveBeenNthCalledWith(2, "/api/chat-session", expect.objectContaining({
      method: "PUT",
      body: JSON.stringify({
        sessionId: "visitor_1",
        messages: [
          {
            id: "welcome",
            direction: "incoming",
            sender: "assistant",
            message: "你好"
          }
        ]
      })
    }));
    expect(fetch).toHaveBeenNthCalledWith(3, "/api/chat-session", expect.objectContaining({
      method: "DELETE",
      body: JSON.stringify({ sessionId: "visitor_1" })
    }));
  });
});
