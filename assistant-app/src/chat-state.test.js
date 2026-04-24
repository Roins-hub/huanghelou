import { describe, expect, it } from "vitest";

import {
  appendAssistantPlaceholder,
  appendToMessage,
  appendAssistantMessage,
  appendUserMessage,
  API_HISTORY_LIMIT,
  buildApiHistory,
  createInitialMessages
} from "./chat-state.js";

describe("assistant chat state", () => {
  it("starts with a guide welcome message", () => {
    expect(createInitialMessages()).toEqual([
      {
        id: "welcome",
        direction: "incoming",
        sender: "assistant",
        message: "你好，我是黄鹤楼 AI 智能导览。可以问我楼层内容、手势玩法、展厅路线或常见问题。"
      }
    ]);
  });

  it("appends outgoing and incoming messages with stable roles", () => {
    const afterUser = appendUserMessage(createInitialMessages(), "怎么使用手势？");
    const afterAssistant = appendAssistantMessage(afterUser, "伸出 1 到 5 根手指可查看楼层介绍。");

    expect(afterAssistant.at(-2)).toMatchObject({
      direction: "outgoing",
      sender: "user",
      message: "怎么使用手势？"
    });
    expect(afterAssistant.at(-1)).toMatchObject({
      direction: "incoming",
      sender: "assistant",
      message: "伸出 1 到 5 根手指可查看楼层介绍。"
    });
  });

  it("converts UI messages into the compact API history", () => {
    const messages = appendAssistantMessage(
      appendUserMessage(createInitialMessages(), "介绍第一层"),
      "第一层是楼阁初识。"
    );

    expect(buildApiHistory(messages)).toEqual([
      { role: "assistant", content: "你好，我是黄鹤楼 AI 智能导览。可以问我楼层内容、手势玩法、展厅路线或常见问题。" },
      { role: "user", content: "介绍第一层" },
      { role: "assistant", content: "第一层是楼阁初识。" }
    ]);
  });

  it("limits API history to the configured recent context count", () => {
    let messages = createInitialMessages();

    for (let index = 0; index < API_HISTORY_LIMIT + 2; index += 1) {
      messages = appendAssistantMessage(
        appendUserMessage(messages, `user ${index}`),
        `assistant ${index}`
      );
    }

    const history = buildApiHistory(messages);

    expect(history).toHaveLength(API_HISTORY_LIMIT);
    expect(history[0]).toEqual({ role: "user", content: "user 6" });
    expect(history.at(-1)).toEqual({ role: "assistant", content: "assistant 9" });
  });

  it("creates one incoming assistant placeholder and appends streamed text to it", () => {
    const afterUser = appendUserMessage(createInitialMessages(), "介绍黄鹤楼");
    const { id, messages } = appendAssistantPlaceholder(afterUser);
    const afterFirstChunk = appendToMessage(messages, id, "黄鹤楼");
    const afterSecondChunk = appendToMessage(afterFirstChunk, id, "位于武汉。");

    expect(messages.at(-1)).toMatchObject({
      id,
      direction: "incoming",
      sender: "assistant",
      message: ""
    });
    expect(afterSecondChunk.at(-1)).toMatchObject({
      id,
      message: "黄鹤楼位于武汉。"
    });
  });
});
