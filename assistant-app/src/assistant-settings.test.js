import { afterEach, describe, expect, it, vi } from "vitest";

import {
  DEFAULT_ASSISTANT_SETTINGS,
  loadAssistantSettings,
  saveAssistantSettings
} from "./assistant-settings.js";

function createStorage() {
  const values = new Map();

  return {
    getItem: vi.fn((key) => values.get(key) ?? null),
    setItem: vi.fn((key, value) => {
      values.set(key, value);
    })
  };
}

describe("assistant settings storage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns defaults when storage is empty", () => {
    vi.stubGlobal("localStorage", createStorage());

    expect(loadAssistantSettings()).toEqual(DEFAULT_ASSISTANT_SETTINGS);
  });

  it("trims and saves custom OpenAI-compatible settings", () => {
    const storage = createStorage();
    vi.stubGlobal("localStorage", storage);

    saveAssistantSettings({
      providerName: "  SiliconFlow  ",
      baseUrl: " https://api.siliconflow.cn/v1/ ",
      apiKey: " sk-test ",
      model: " Qwen/Qwen2.5-72B-Instruct ",
      stream: false
    });

    expect(loadAssistantSettings()).toEqual({
      providerName: "SiliconFlow",
      baseUrl: "https://api.siliconflow.cn/v1",
      apiKey: "sk-test",
      model: "Qwen/Qwen2.5-72B-Instruct",
      stream: false
    });
  });
});
