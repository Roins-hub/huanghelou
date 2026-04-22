export async function sendChatMessage({ message, history }) {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ message, history })
  });

  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json") ? await response.json().catch(() => ({})) : {};

  if (!response.ok) {
    if (response.status === 404 || response.status === 501) {
      throw new Error("当前是静态预览服务，无法运行 AI 接口。请使用 npm run dev 或部署到 Vercel 后访问。");
    }

    throw new Error(data.error || "AI 服务暂时不可用。");
  }

  return data;
}

async function readErrorMessage(response) {
  const contentType = response.headers.get("content-type") || "";

  if (!contentType.includes("application/json")) {
    return "";
  }

  const data = await response.json().catch(() => ({}));
  return data.error || "";
}

function createProviderPayload(provider) {
  if (!provider) {
    return undefined;
  }

  if (!provider.baseUrl && !provider.apiKey && !provider.model) {
    return undefined;
  }

  return {
    baseUrl: provider.baseUrl,
    apiKey: provider.apiKey,
    model: provider.model
  };
}

export async function streamChatMessage({ message, history, provider, onChunk }) {
  const shouldStream = provider?.stream !== false;
  const requestBody = {
    message,
    history,
    stream: shouldStream
  };
  const providerPayload = createProviderPayload(provider);

  if (providerPayload) {
    requestBody.provider = providerPayload;
  }

  const response = await fetch("/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    if (response.status === 404 || response.status === 501) {
      throw new Error("当前是静态预览服务，无法运行 AI 接口。请使用 npm run dev 或部署到 Vercel 后访问。");
    }

    throw new Error(await readErrorMessage(response) || "AI 服务暂时不可用。");
  }

  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    const data = await response.json().catch(() => ({}));
    const reply = data.reply || "";

    if (reply) {
      onChunk?.(reply);
    }

    return reply;
  }

  if (!response.body) {
    const data = await response.json().catch(() => ({}));
    const reply = data.reply || "";

    if (reply) {
      onChunk?.(reply);
    }

    return reply;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let reply = "";

  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    const chunk = decoder.decode(value, { stream: true });

    if (chunk) {
      reply += chunk;
      onChunk?.(chunk);
    }
  }

  const finalChunk = decoder.decode();

  if (finalChunk) {
    reply += finalChunk;
    onChunk?.(finalChunk);
  }

  return reply;
}

export async function testAssistantProvider(provider) {
  const response = await fetch("/api/test-model", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      provider: createProviderPayload(provider)
    })
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || "模型连接测试失败。");
  }

  return data;
}

async function readJsonResponse(response) {
  return response.json().catch(() => ({}));
}

export async function loadChatSession(sessionId) {
  const response = await fetch(`/api/chat-session?sessionId=${encodeURIComponent(sessionId)}`, {
    method: "GET"
  });
  const data = await readJsonResponse(response);

  if (!response.ok) {
    throw new Error(data.error || "无法读取历史对话。");
  }

  return Array.isArray(data.messages) ? data.messages : [];
}

export async function saveChatSession(sessionId, messages) {
  const response = await fetch("/api/chat-session", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ sessionId, messages })
  });
  const data = await readJsonResponse(response);

  if (!response.ok) {
    throw new Error(data.error || "无法保存历史对话。");
  }

  return data;
}

export async function clearChatSession(sessionId) {
  const response = await fetch("/api/chat-session", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ sessionId })
  });
  const data = await readJsonResponse(response);

  if (!response.ok) {
    throw new Error(data.error || "无法清空历史对话。");
  }

  return data;
}
