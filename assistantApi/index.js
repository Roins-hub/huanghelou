const fs = require("node:fs/promises");
const path = require("node:path");

const DEFAULT_BASE_URL = "https://api.deepseek.com";
const DEFAULT_MODEL = "deepseek-chat";
const MAX_MESSAGE_LENGTH = 800;
const MAX_HISTORY_MESSAGES = 8;
const MAX_HISTORY_CONTENT_LENGTH = 1200;

function json(statusCode, body, extraHeaders = {}) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...extraHeaders,
    },
    body: JSON.stringify(body),
  };
}

function clean(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizePossibleBody(candidate, isBase64Encoded = false) {
  if (candidate == null) return undefined;

  if (Buffer.isBuffer(candidate)) {
    const text = candidate.toString("utf8");
    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  }

  if (typeof candidate === "object") {
    return candidate;
  }

  if (typeof candidate === "string") {
    const text = isBase64Encoded
      ? Buffer.from(candidate, "base64").toString("utf8")
      : candidate;

    if (!text.trim()) return {};

    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  }

  return undefined;
}

function parseBody(event, context) {
  const candidates = [
    { value: event?.body, isBase64: Boolean(event?.isBase64Encoded) },
    { value: event?.rawBody, isBase64: false },
    { value: event?.request?.body, isBase64: false },
    { value: event?.data, isBase64: false },
    { value: context?.request?.body, isBase64: false },
    { value: context?.req?.body, isBase64: false },
    { value: context?.body, isBase64: false },
  ];

  for (const item of candidates) {
    const parsed = normalizePossibleBody(item.value, item.isBase64);
    if (parsed !== undefined) {
      return parsed;
    }
  }

  if (
    event &&
    typeof event === "object" &&
    (
      Object.prototype.hasOwnProperty.call(event, "message") ||
      Object.prototype.hasOwnProperty.call(event, "history") ||
      Object.prototype.hasOwnProperty.call(event, "provider") ||
      Object.prototype.hasOwnProperty.call(event, "stream")
    )
  ) {
    return event;
  }

  return {};
}

function sanitizeHistory(history) {
  if (!Array.isArray(history)) return [];

  return history
    .filter((item) => item && (item.role === "user" || item.role === "assistant"))
    .map((item) => ({
      role: item.role,
      content:
        typeof item.content === "string"
          ? item.content.trim().slice(0, MAX_HISTORY_CONTENT_LENGTH)
          : "",
    }))
    .filter((item) => item.content.length > 0)
    .slice(-MAX_HISTORY_MESSAGES);
}

function resolveProviderConfig(provider) {
  const hasCustomProvider = provider && typeof provider === "object";

  const baseUrl = hasCustomProvider
    ? clean(provider.baseUrl).replace(/\/$/, "")
    : clean(process.env.DEEPSEEK_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, "");

  const apiKey = hasCustomProvider
    ? clean(provider.apiKey)
    : clean(process.env.DEEPSEEK_API_KEY);

  const model = hasCustomProvider
    ? clean(provider.model)
    : clean(process.env.DEEPSEEK_MODEL || DEFAULT_MODEL);

  if (!baseUrl || !apiKey || !model) {
    return {
      ok: false,
      error: hasCustomProvider
        ? "请完整填写 API Base URL、API Key 和模型名称。"
        : "AI 服务尚未配置，请稍后再试。",
      status: hasCustomProvider ? 400 : 500,
    };
  }

  return { ok: true, baseUrl, apiKey, model };
}

async function loadKnowledge() {
  const root = __dirname;

  const baseRaw = await fs.readFile(
    path.join(root, "data", "assistant-knowledge.json"),
    "utf8"
  );

  const doc1 = await fs.readFile(
    path.join(root, "黄鹤楼数字化转型路线图：从传统观光到智慧沉浸的战略跃迁.md"),
    "utf8"
  );

  const doc2 = await fs.readFile(
    path.join(root, "黄鹤楼历史遗址数字化转型战略路线图：从“景观游览”到“文化共鸣”.md"),
    "utf8"
  );

  return [
    "### 基础展厅知识",
    JSON.stringify(JSON.parse(baseRaw), null, 2),
    "### 补充知识库文档 1：黄鹤楼数字化转型路线图：从传统观光到智慧沉浸的战略跃迁",
    doc1,
    "### 补充知识库文档 2：黄鹤楼历史遗址数字化转型战略路线图：从“景观游览”到“文化共鸣”",
    doc2,
  ].join("\n\n");
}

function buildPayload({ model, knowledge, history, message, stream }) {
  return {
    model,
    stream,
    temperature: 0.7,
    messages: [
      {
        role: "system",
        content:
          "你是黄鹤楼沉浸式数字展厅 AI 导览助手，请优先依据提供资料回答。回答要简洁、亲切、适合展厅观众，不要编造资料中没有的内容。\n\n" +
          knowledge,
      },
      ...sanitizeHistory(history),
      { role: "user", content: message },
    ],
  };
}

function extractAssistantReply(data) {
  return data?.choices?.[0]?.message?.content?.trim() || "";
}

function resolvePathname(event, context) {
  const httpContext = context?.httpContext || {};
  const rawPath =
    httpContext.url ||
    event?.path ||
    event?.url ||
    context?.request?.url ||
    "";

  let pathname = rawPath;

  try {
    pathname = new URL(rawPath, "http://localhost").pathname;
  } catch {
    pathname = rawPath;
  }

  if (pathname.length > 1 && pathname.endsWith("/")) {
    pathname = pathname.slice(0, -1);
  }

  const method = (
    httpContext.httpMethod ||
    event?.httpMethod ||
    context?.request?.method ||
    context?.req?.method ||
    "GET"
  ).toUpperCase();

  return { rawPath, pathname, method };
}

async function readDeepSeekStream(response, onChunk) {
  if (!response.body || !response.body.getReader) {
    throw new Error("上游响应不支持流式读取");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;

      const payload = trimmed.slice(5).trim();
      if (!payload) continue;

      await onChunk(payload);

      if (payload === "[DONE]") {
        return;
      }
    }
  }
}

function extractStreamText(payload) {
  if (payload === "[DONE]") {
    return { done: true, text: "" };
  }

  try {
    const data = JSON.parse(payload);
    const text = data?.choices?.[0]?.delta?.content ?? "";
    return { done: false, text };
  } catch (err) {
    console.error("stream payload parse error:", err, payload);
    return { done: false, text: "" };
  }
}

function shouldFlush(buffer) {
  if (!buffer) return false;
  return /[。！？；：\n]$/.test(buffer) || buffer.length >= 20;
}

exports.main = async function (event, context) {
  const body = parseBody(event, context);

  if (body === null) {
    return json(400, { error: "请求体不是合法 JSON。" });
  }

  const { rawPath, pathname, method } = resolvePathname(event, context);

  console.log("rawPath:", rawPath);
  console.log("pathname:", pathname);
  console.log("method:", method);
  console.log(
    "body keys:",
    body && typeof body === "object" ? Object.keys(body) : body
  );
  console.log("message:", body?.message);

  if (pathname === "/api/test-model") {
    if (method !== "POST") {
      return json(405, { error: "只支持 POST 请求。" }, { Allow: "POST" });
    }

    const providerConfig = resolveProviderConfig(body.provider);
    if (!providerConfig.ok) {
      return json(providerConfig.status, { error: providerConfig.error });
    }

    try {
      const resp = await fetch(`${providerConfig.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${providerConfig.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: providerConfig.model,
          temperature: 0,
          messages: [{ role: "user", content: "请回复：连接成功" }],
        }),
      });

      if (!resp.ok) {
        const text = await resp.text();
        console.error("test-model upstream error:", resp.status, text);
        return json(502, {
          error: "模型连接失败，请检查 Base URL、API Key 和模型名称。",
        });
      }

      const data = await resp.json();
      const reply = extractAssistantReply(data);
      return json(200, { ok: true, reply: reply || "连接成功" });
    } catch (err) {
      console.error("test-model error:", err);
      return json(500, { error: "模型连接测试失败，请稍后再试。" });
    }
  }

  if (pathname === "/api/chat") {
    if (method !== "POST") {
      return json(405, { error: "只支持 POST 请求。" }, { Allow: "POST" });
    }

    const message = typeof body?.message === "string" ? body.message.trim() : "";
    if (!message) {
      return json(400, { error: "请输入想咨询的问题。" });
    }

    if (message.length > MAX_MESSAGE_LENGTH) {
      return json(400, { error: "问题太长了，请控制在 800 字以内。" });
    }

    const providerConfig = resolveProviderConfig(body.provider);
    if (!providerConfig.ok) {
      return json(providerConfig.status, { error: providerConfig.error });
    }

    const useStream = Boolean(body.stream);

    try {
      const knowledge = await loadKnowledge();

      const payload = buildPayload({
        model: providerConfig.model,
        knowledge,
        history: body.history,
        message,
        stream: useStream,
      });

      const resp = await fetch(`${providerConfig.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${providerConfig.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!resp.ok) {
        const text = await resp.text();
        console.error("chat upstream error:", resp.status, text);
        return json(502, { error: "上游模型请求失败。" });
      }

      if (!useStream) {
        const data = await resp.json();
        const reply = extractAssistantReply(data);

        if (!reply) {
          return json(502, { error: "AI 回复格式异常，请稍后再试。" });
        }

        return json(200, { reply });
      }

      const sse = context?.sse?.();
      if (!sse || sse.closed) {
        return json(500, { error: "无法建立 SSE 连接。" });
      }

      sse.on("close", () => {
        console.log("client closed");
      });

      let pendingText = "";

      await readDeepSeekStream(resp, async (payload) => {
        const parsed = extractStreamText(payload);

        if (parsed.done) {
          if (pendingText) {
            sse.send(pendingText);
            pendingText = "";
          }
          sse.send("[DONE]");
          sse.end();
          return;
        }

        if (!parsed.text) return;

        pendingText += parsed.text;

        if (shouldFlush(pendingText)) {
          sse.send(pendingText);
          pendingText = "";
        }
      });

      if (!sse.closed) {
        if (pendingText) {
          sse.send(pendingText);
        }
        sse.end();
      }

      return "";
    } catch (err) {
      console.error("chat error:", err);

      const sse = context?.sse?.();
      if (useStream && sse && !sse.closed) {
        sse.send(JSON.stringify({ error: err.message || "stream error" }));
        sse.send("[DONE]");
        sse.end();
        return "";
      }

      return json(500, { error: "小助手暂时没有回应，请稍后再试。" });
    }
  }

  return json(404, {
    error: "Not Found",
    debug: {
      rawPath,
      pathname,
      method,
    },
  });
};