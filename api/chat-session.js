import {
  clearChatSession,
  loadChatSession,
  saveChatSession
} from "./chat-session-store.js";

function sendJson(response, status, body) {
  response.status(status).json(body);
}

function getSessionId(request) {
  if (request.method === "GET") {
    const url = new URL(request.url || "/api/chat-session", "http://localhost");
    return url.searchParams.get("sessionId") || "";
  }

  return request.body?.sessionId || "";
}

export default async function handler(request, response) {
  try {
    const sessionId = getSessionId(request);

    if (!sessionId) {
      sendJson(response, 400, { error: "缺少会话 ID。" });
      return;
    }

    if (request.method === "GET") {
      const messages = await loadChatSession({ sessionId });
      sendJson(response, 200, { messages });
      return;
    }

    if (request.method === "PUT") {
      const messages = await saveChatSession({
        sessionId,
        messages: request.body?.messages
      });
      sendJson(response, 200, { ok: true, messages });
      return;
    }

    if (request.method === "DELETE") {
      await clearChatSession({ sessionId });
      sendJson(response, 200, { ok: true });
      return;
    }

    response.setHeader("Allow", "GET, PUT, DELETE");
    sendJson(response, 405, { error: "不支持当前请求方法。" });
  } catch (error) {
    if (error.message === "Invalid session id") {
      sendJson(response, 400, { error: "会话 ID 格式不正确。" });
      return;
    }

    console.error("Chat session API error", error);
    sendJson(response, 500, { error: "会话保存暂时不可用，请稍后再试。" });
  }
}
