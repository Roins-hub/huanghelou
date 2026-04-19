import {
  extractAssistantReply,
  resolveProviderConfig
} from "./chat-core.js";

function sendJson(response, status, body) {
  response.status(status).json(body);
}

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    sendJson(response, 405, { error: "只支持 POST 请求。" });
    return;
  }

  const providerConfig = resolveProviderConfig({
    provider: request.body?.provider,
    env: process.env
  });

  if (!providerConfig.ok) {
    sendJson(response, providerConfig.status, { error: providerConfig.error });
    return;
  }

  try {
    const modelResponse = await fetch(`${providerConfig.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${providerConfig.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: providerConfig.model,
        temperature: 0,
        messages: [
          {
            role: "user",
            content: "请回复：连接成功"
          }
        ]
      })
    });

    if (!modelResponse.ok) {
      console.error("Model test failed", modelResponse.status, await modelResponse.text());
      sendJson(response, 502, { error: "模型连接失败，请检查 Base URL、API Key 和模型名称。" });
      return;
    }

    const data = await modelResponse.json();
    const reply = extractAssistantReply(data);

    sendJson(response, 200, {
      ok: true,
      reply: reply || "连接成功"
    });
  } catch (error) {
    console.error("Model test error", error);
    sendJson(response, 500, { error: "模型连接测试失败，请稍后再试。" });
  }
}
