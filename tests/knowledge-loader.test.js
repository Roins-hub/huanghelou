import { describe, expect, it } from "vitest";

import { loadAssistantKnowledge } from "../api/knowledge.js";

describe("assistant knowledge loader", () => {
  it("loads the original JSON knowledge and the two roadmap markdown documents", async () => {
    const knowledge = await loadAssistantKnowledge();

    expect(knowledge.base).toBeTruthy();
    expect(knowledge.documents).toHaveLength(2);
    expect(knowledge.documents.map((document) => document.title)).toEqual([
      "黄鹤楼数字化转型路线图：从传统观光到智慧沉浸的战略跃迁",
      "黄鹤楼历史遗址数字化转型战略路线图：从“景观游览”到“文化共鸣”"
    ]);
    expect(knowledge.documents[0].content).toContain("智慧沉浸");
    expect(knowledge.documents[1].content).toContain("文化共鸣");
  });
});
