export function normalizeTranscript(transcript) {
  return String(transcript || "").trim();
}

export function getSpeechInputHint({
  browserSupportsSpeechRecognition,
  isMicrophoneAvailable,
  listening,
  transcript
}) {
  if (!browserSupportsSpeechRecognition) {
    return "当前浏览器不支持语音识别";
  }

  if (isMicrophoneAvailable === false) {
    return "麦克风不可用，请检查浏览器权限";
  }

  if (listening) {
    return "正在听，请开始说话";
  }

  const normalizedTranscript = normalizeTranscript(transcript);

  if (normalizedTranscript) {
    return `已识别：${normalizedTranscript}`;
  }

  return "点击麦克风后说话，系统会自动转写";
}
