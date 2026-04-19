import {
  buildDeepSeekPayload,
  extractAssistantReply,
  extractStreamContent,
  resolveProviderConfig,
  sanitizeHistory,
  validateMessage
} from "./chat-core.js";
import { loadAssistantKnowledge } from "./knowledge.js";

function sendJson(response, status, body) {
  response.status(status).json(body);
}

function startTextStream(response) {
  response.status(200);
  response.setHeader("Content-Type", "text/plain; charset=utf-8");
  response.setHeader("Cache-Control", "no-cache, no-transform");
}

async function sendDeepSeekStream(deepSeekResponse, response) {
  if (!deepSeekResponse.body) {
    sendJson(response, 502, { error: "AI 流式回复格式异常，请稍后再试。" });
    return;
  }

  startTextStream(response);

  const reader = deepSeekResponse.body.getReader();
  const decoder = new TextDecoder();
  let pending = "";

  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    pending += decoder.decode(value, { stream: true });
    const events = pending.split(/\r?\n\r?\n/);
    pending = events.pop() || "";

    for (const event of events) {
      const content = extractStreamContent(event);

      if (content) {
        response.write(content);
      }
    }
  }

  pending += decoder.decode();

  if (pending) {
    const content = extractStreamContent(pending);

    if (content) {
      response.write(content);
    }
  }

  response.end();
}

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    sendJson(response, 405, { error: "只支持 POST 请求。" });
    return;
  }

  const validation = validateMessage(request.body?.message);
  if (!validation.ok) {
    sendJson(response, validation.status, { error: validation.error });
    return;
  }

  try {
    const providerConfig = resolveProviderConfig({
      provider: request.body?.provider,
      env: process.env
    });

    if (!providerConfig.ok) {
      sendJson(response, providerConfig.status, { error: providerConfig.error });
      return;
    }

    const knowledge = await loadAssistantKnowledge();
    const payload = buildDeepSeekPayload({
      model: providerConfig.model,
      knowledge,
      history: sanitizeHistory(request.body?.history),
      message: validation.message
    });
    const shouldStream = request.body?.stream === true;

    const deepSeekResponse = await fetch(`${providerConfig.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${providerConfig.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        ...payload,
        stream: shouldStream
      })
    });

    if (!deepSeekResponse.ok) {
      console.error("DeepSeek request failed", deepSeekResponse.status, await deepSeekResponse.text());
      sendJson(response, 502, { error: "AI 服务暂时没有回应，请稍后再试。" });
      return;
    }

    if (shouldStream) {
      await sendDeepSeekStream(deepSeekResponse, response);
      return;
    }

    const data = await deepSeekResponse.json();
    const reply = extractAssistantReply(data);

    if (!reply) {
      sendJson(response, 502, { error: "AI 回复格式异常，请稍后再试。" });
      return;
    }

    sendJson(response, 200, { reply });
  } catch (error) {
    console.error("Chat API error", error);
    sendJson(response, 500, { error: "小助手暂时没有回应，请稍后再试。" });
  }
}
