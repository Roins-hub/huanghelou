import { afterEach, describe, expect, it, vi } from "vitest";

import handler from "../api/test-model.js";

function createResponseRecorder() {
  return {
    headers: {},
    statusCode: 200,
    body: "",
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
    }
  };
}

describe("test model handler", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("tests a custom OpenAI-compatible provider", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({
      choices: [
        {
          message: {
            content: "连接成功"
          }
        }
      ]
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json"
      }
    })));

    const response = createResponseRecorder();

    await handler({
      method: "POST",
      body: {
        provider: {
          baseUrl: "https://api.openai.com/v1",
          apiKey: "sk-test",
          model: "gpt-4o-mini"
        }
      }
    }, response);

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual({
      ok: true,
      reply: "连接成功"
    });
    expect(fetch).toHaveBeenCalledWith(
      "https://api.openai.com/v1/chat/completions",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer sk-test"
        }),
        body: expect.stringContaining("\"model\":\"gpt-4o-mini\"")
      })
    );
  });
});
