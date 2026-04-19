import { afterEach, describe, expect, it, vi } from "vitest";

import handler from "../api/chat.js";

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

function createResponseRecorder() {
  return {
    headers: {},
    statusCode: 200,
    body: "",
    ended: false,
    setHeader(name, value) {
      this.headers[name.toLowerCase()] = value;
    },
    status(statusCode) {
      this.statusCode = statusCode;
      return this;
    },
    json(body) {
      this.setHeader("Content-Type", "application/json; charset=utf-8");
      this.body = JSON.stringify(body);
      this.ended = true;
    },
    write(chunk) {
      this.body += chunk;
    },
    end(chunk = "") {
      this.body += chunk;
      this.ended = true;
    }
  };
}

describe("chat handler streaming", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.DEEPSEEK_API_KEY;
    delete process.env.DEEPSEEK_BASE_URL;
    delete process.env.DEEPSEEK_MODEL;
  });

  it("streams assistant deltas as plain text", async () => {
    process.env.DEEPSEEK_API_KEY = "test-key";
    vi.stubGlobal("fetch", vi.fn(async () => new Response(createTextStream([
      "data: {\"choices\":[{\"delta\":{\"content\":\"黄鹤楼\"}}]}\n\n",
      "data: {\"choices\":[{\"delta\":{\"content\":\"位于武汉。\"}}]}\n\n",
      "data: [DONE]\n\n"
    ]), {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream"
      }
    })));

    const response = createResponseRecorder();

    await handler({
      method: "POST",
      body: {
        message: "介绍黄鹤楼",
        history: [],
        stream: true
      }
    }, response);

    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toBe("text/plain; charset=utf-8");
    expect(response.body).toBe("黄鹤楼位于武汉。");
    expect(response.ended).toBe(true);
    expect(fetch).toHaveBeenCalledWith(
      "https://api.deepseek.com/chat/completions",
      expect.objectContaining({
        body: expect.stringContaining("\"stream\":true")
      })
    );
  });
});
