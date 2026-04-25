import { describe, expect, it } from "vitest";

import { getSpeechInputHint, normalizeTranscript } from "./speech-input.js";

describe("speech input helpers", () => {
  it("normalizes recognized transcript for the chat draft", () => {
    expect(normalizeTranscript("  问我黄鹤楼第一层  ")).toBe("问我黄鹤楼第一层");
    expect(normalizeTranscript(null)).toBe("");
  });

  it("explains when browser speech recognition is unavailable", () => {
    expect(getSpeechInputHint({
      browserSupportsSpeechRecognition: false,
      isMicrophoneAvailable: true,
      listening: false,
      transcript: ""
    })).toBe("当前浏览器不支持语音识别");
  });

  it("reports active listening and recognized text", () => {
    expect(getSpeechInputHint({
      browserSupportsSpeechRecognition: true,
      isMicrophoneAvailable: true,
      listening: true,
      transcript: ""
    })).toBe("正在听，请开始说话");

    expect(getSpeechInputHint({
      browserSupportsSpeechRecognition: true,
      isMicrophoneAvailable: true,
      listening: false,
      transcript: "介绍黄鹤楼"
    })).toBe("已识别：介绍黄鹤楼");
  });
});
