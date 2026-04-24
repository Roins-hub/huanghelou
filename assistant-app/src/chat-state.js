export const WELCOME_MESSAGE =
  "你好，我是黄鹤楼 AI 智能导览。可以问我楼层内容、手势玩法、展厅路线或常见问题。";

export const API_HISTORY_LIMIT = 8;

function createMessage({ id, direction, sender, message }) {
  return {
    id,
    direction,
    sender,
    message
  };
}

function createId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function createInitialMessages() {
  return [
    createMessage({
      id: "welcome",
      direction: "incoming",
      sender: "assistant",
      message: WELCOME_MESSAGE
    })
  ];
}

export function appendUserMessage(messages, message) {
  return [
    ...messages,
    createMessage({
      id: createId("user"),
      direction: "outgoing",
      sender: "user",
      message: message.trim()
    })
  ];
}

export function appendAssistantMessage(messages, message) {
  return [
    ...messages,
    createMessage({
      id: createId("assistant"),
      direction: "incoming",
      sender: "assistant",
      message: message.trim()
    })
  ];
}

export function appendAssistantPlaceholder(messages) {
  const id = createId("assistant");

  return {
    id,
    messages: [
      ...messages,
      createMessage({
        id,
        direction: "incoming",
        sender: "assistant",
        message: ""
      })
    ]
  };
}

export function appendToMessage(messages, id, chunk) {
  return messages.map((item) => {
    if (item.id !== id) {
      return item;
    }

    return {
      ...item,
      message: `${item.message}${chunk}`
    };
  });
}

export function buildApiHistory(messages) {
  return messages
    .filter((item) => item.sender === "user" || item.sender === "assistant")
    .map((item) => ({
      role: item.sender === "user" ? "user" : "assistant",
      content: item.message
    }))
    .filter((item) => item.content)
    .slice(-API_HISTORY_LIMIT);
}
