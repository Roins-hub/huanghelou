import { describe, expect, it } from "vitest";

import {
  buildDeepSeekPayload,
  extractStreamContent,
  resolveProviderConfig,
  sanitizeHistory,
  validateMessage
} from "../api/chat-core.js";

describe("chat core", () => {
  it("trims and accepts a valid user message", () => {
    expect(validateMessage("  介绍黄鹤楼第一层  ")).toEqual({
      ok: true,
      message: "介绍黄鹤楼第一层"
    });
  });

  it("rejects empty and overlong messages", () => {
    expect(validateMessage("   ")).toEqual({
      ok: false,
      status: 400,
      error: "请输入想咨询的问题。"
    });

    expect(validateMessage("问".repeat(801))).toEqual({
      ok: false,
      status: 400,
      error: "问题太长了，请控制在 800 字以内。"
    });
  });

  it("keeps only recent user and assistant history messages", () => {
    const history = [
      { role: "system", content: "ignore" },
      { role: "user", content: "  一  " },
      { role: "assistant", content: "二" },
      { role: "tool", content: "ignore" },
      { role: "user", content: "" },
      { role: "assistant", content: "三" },
      { role: "user", content: "四" },
      { role: "assistant", content: "五" },
      { role: "user", content: "六" },
      { role: "assistant", content: "七" },
      { role: "user", content: "八" },
      { role: "assistant", content: "九" },
      { role: "user", content: "十" }
    ];

    expect(sanitizeHistory(history)).toEqual([
      { role: "assistant", content: "三" },
      { role: "user", content: "四" },
      { role: "assistant", content: "五" },
      { role: "user", content: "六" },
      { role: "assistant", content: "七" },
      { role: "user", content: "八" },
      { role: "assistant", content: "九" },
      { role: "user", content: "十" }
    ]);
  });

  it("builds a DeepSeek chat payload with system context and latest user message", () => {
    const payload = buildDeepSeekPayload({
      model: "deepseek-chat",
      knowledge: { identity: "黄鹤楼导览助手" },
      history: [{ role: "assistant", content: "你好，我可以帮你导览。" }],
      message: "怎么用手势？"
    });

    expect(payload.model).toBe("deepseek-chat");
    expect(payload.temperature).toBe(0.7);
    expect(payload.messages[0].role).toBe("system");
    expect(payload.messages[0].content).toContain("黄鹤楼沉浸式数字展厅");
    expect(payload.messages[0].content).toContain("黄鹤楼导览助手");
    expect(payload.messages.at(-1)).toEqual({
      role: "user",
      content: "怎么用手势？"
    });
  });

  it("formats supplemental markdown knowledge into the system prompt", () => {
    const payload = buildDeepSeekPayload({
      model: "deepseek-chat",
      knowledge: {
        base: { identity: "黄鹤楼导览助手" },
        documents: [
          {
            title: "黄鹤楼数字化转型路线图：从传统观光到智慧沉浸的战略跃迁",
            content: "智慧沉浸与文化共鸣"
          }
        ]
      },
      history: [],
      message: "数字化转型怎么做？"
    });

    expect(payload.messages[0].content).toContain("### 基础展厅知识");
    expect(payload.messages[0].content).toContain("### 补充知识库文档 1：黄鹤楼数字化转型路线图");
    expect(payload.messages[0].content).toContain("智慧沉浸与文化共鸣");
  });

  it("extracts assistant content from streamed DeepSeek SSE lines", () => {
    const chunk = [
      "data: {\"choices\":[{\"delta\":{\"role\":\"assistant\",\"content\":\"黄鹤楼\"}}]}",
      "",
      "data: {\"choices\":[{\"delta\":{\"content\":\"位于武汉。\"}}]}",
      "",
      "data: [DONE]",
      ""
    ].join("\n");

    expect(extractStreamContent(chunk)).toBe("黄鹤楼位于武汉。");
  });

  it("uses request provider settings before environment defaults", () => {
    expect(resolveProviderConfig({
      provider: {
        baseUrl: " https://api.openai.com/v1/ ",
        apiKey: " sk-request ",
        model: " gpt-4o-mini "
      },
      env: {
        DEEPSEEK_API_KEY: "env-key",
        DEEPSEEK_BASE_URL: "https://api.deepseek.com",
        DEEPSEEK_MODEL: "deepseek-chat"
      }
    })).toEqual({
      ok: true,
      baseUrl: "https://api.openai.com/v1",
      apiKey: "sk-request",
      model: "gpt-4o-mini"
    });
  });

  it("falls back to environment provider settings", () => {
    expect(resolveProviderConfig({
      provider: undefined,
      env: {
        DEEPSEEK_API_KEY: "env-key",
        DEEPSEEK_BASE_URL: "https://api.deepseek.com",
        DEEPSEEK_MODEL: "deepseek-chat"
      }
    })).toEqual({
      ok: true,
      baseUrl: "https://api.deepseek.com",
      apiKey: "env-key",
      model: "deepseek-chat"
    });
  });

  it("rejects incomplete provider settings", () => {
    expect(resolveProviderConfig({
      provider: {
        baseUrl: "https://api.openai.com/v1",
        apiKey: "",
        model: "gpt-4o-mini"
      },
      env: {}
    })).toEqual({
      ok: false,
      status: 400,
      error: "请完整填写 API Base URL、API Key 和模型名称。"
    });
  });
});
