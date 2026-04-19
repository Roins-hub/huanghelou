const MAX_MESSAGE_LENGTH = 800;
const MAX_HISTORY_MESSAGES = 8;
const MAX_HISTORY_CONTENT_LENGTH = 1200;
const DEFAULT_BASE_URL = "https://api.deepseek.com";
const DEFAULT_MODEL = "deepseek-chat";

const SYSTEM_PROMPT = `你是黄鹤楼沉浸式数字展厅的 AI 导览助手。

回答要求：
1. 使用简洁、亲切、适合展厅观众的中文。
2. 优先依据提供的展厅资料回答。
3. 不要编造资料中没有的具体年代、人物、文物细节。
4. 如果资料不足，请说明“目前展厅资料中没有明确说明”。
5. 操作类问题请使用步骤式回答。
6. 默认回答控制在 150 字以内；用户要求详细介绍时可以展开。
7. 用户问无关问题时，简短回应后引导回黄鹤楼展厅。`;

export function validateMessage(input) {
  const message = typeof input === "string" ? input.trim() : "";

  if (!message) {
    return {
      ok: false,
      status: 400,
      error: "请输入想咨询的问题。"
    };
  }

  if (message.length > MAX_MESSAGE_LENGTH) {
    return {
      ok: false,
      status: 400,
      error: "问题太长了，请控制在 800 字以内。"
    };
  }

  return {
    ok: true,
    message
  };
}

export function sanitizeHistory(history) {
  if (!Array.isArray(history)) {
    return [];
  }

  return history
    .filter((item) => item && (item.role === "user" || item.role === "assistant"))
    .map((item) => ({
      role: item.role,
      content: typeof item.content === "string" ? item.content.trim().slice(0, MAX_HISTORY_CONTENT_LENGTH) : ""
    }))
    .filter((item) => item.content.length > 0)
    .slice(-MAX_HISTORY_MESSAGES);
}

export function buildDeepSeekPayload({ model, knowledge, history = [], message }) {
  const knowledgeText = formatKnowledge(knowledge);

  return {
    model,
    temperature: 0.7,
    messages: [
      {
        role: "system",
        content: `${SYSTEM_PROMPT}\n\n以下是展厅资料：\n${knowledgeText}`
      },
      ...sanitizeHistory(history),
      {
        role: "user",
        content: message
      }
    ]
  };
}

function formatKnowledge(knowledge) {
  if (typeof knowledge === "string") {
    return knowledge;
  }

  const base = knowledge?.base ?? knowledge ?? {};
  const documents = Array.isArray(knowledge?.documents) ? knowledge.documents : [];
  const documentText = documents
    .map((document, index) => [
      `### 补充知识库文档 ${index + 1}：${document.title}`,
      document.content
    ].join("\n"))
    .join("\n\n");

  return [
    "### 基础展厅知识",
    JSON.stringify(base, null, 2),
    documentText
  ].filter(Boolean).join("\n\n");
}

function cleanProviderValue(value) {
  return typeof value === "string" ? value.trim() : "";
}

export function resolveProviderConfig({ provider, env = process.env } = {}) {
  const hasRequestProvider = provider && typeof provider === "object";
  const baseUrl = hasRequestProvider
    ? cleanProviderValue(provider.baseUrl).replace(/\/$/, "")
    : cleanProviderValue(env.DEEPSEEK_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, "");
  const apiKey = hasRequestProvider
    ? cleanProviderValue(provider.apiKey)
    : cleanProviderValue(env.DEEPSEEK_API_KEY);
  const model = hasRequestProvider
    ? cleanProviderValue(provider.model)
    : cleanProviderValue(env.DEEPSEEK_MODEL || DEFAULT_MODEL);

  if (!baseUrl || !apiKey || !model) {
    return {
      ok: false,
      status: hasRequestProvider ? 400 : 500,
      error: hasRequestProvider
        ? "请完整填写 API Base URL、API Key 和模型名称。"
        : "AI 服务尚未配置，请稍后再试。"
    };
  }

  return {
    ok: true,
    baseUrl,
    apiKey,
    model
  };
}

export function extractAssistantReply(data) {
  return data?.choices?.[0]?.message?.content?.trim() || "";
}

export function extractStreamContent(chunk) {
  return chunk
    .split(/\r?\n/)
    .filter((line) => line.startsWith("data: "))
    .map((line) => line.slice(6).trim())
    .filter((line) => line && line !== "[DONE]")
    .map((line) => {
      try {
        return JSON.parse(line)?.choices?.[0]?.delta?.content || "";
      } catch {
        return "";
      }
    })
    .join("");
}
