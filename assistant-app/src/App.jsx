import { useEffect, useMemo, useRef, useState } from "react";
import { ChatContainer, MainContainer, Message, MessageInput, MessageList } from "@chatscope/chat-ui-kit-react";
import SpeechRecognition, { useSpeechRecognition } from "react-speech-recognition";

import {
  clearChatSession,
  loadChatSession,
  saveChatSession,
  streamChatMessage,
  testAssistantProvider
} from "./api.js";
import {
  buildProviderPayload,
  hasCustomProvider,
  loadAssistantSettings,
  saveAssistantSettings
} from "./assistant-settings.js";
import {
  API_HISTORY_LIMIT,
  appendAssistantPlaceholder,
  appendToMessage,
  appendUserMessage,
  buildApiHistory,
  createInitialMessages
} from "./chat-state.js";
import { getSpeechInputHint, normalizeTranscript } from "./speech-input.js";
import { quickQuestions } from "./quickQuestions.js";
import heroImage from "./assets/yellow-crane-ink-hero.png";

const floorGuideItems = [
  "一层：楼阁初识",
  "二层：建筑史话",
  "三层：诗赋留痕",
  "四层：江汉胜景",
  "五层：城市象征"
];

const isSettingsPath =
  window.location.pathname.replace(/\/$/, "").endsWith("/settings") ||
  new URLSearchParams(window.location.search).get("settings") === "1";

const CHAT_SESSION_STORAGE_KEY = "huanghelou-assistant-session-id";

function createSessionId() {
  if (window.crypto?.randomUUID) {
    return window.crypto.randomUUID().replace(/-/g, "");
  }

  return `visitor_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function getChatSessionId() {
  try {
    const existing = window.localStorage.getItem(CHAT_SESSION_STORAGE_KEY);

    if (existing) {
      return existing;
    }

    const next = createSessionId();
    window.localStorage.setItem(CHAT_SESSION_STORAGE_KEY, next);
    return next;
  } catch {
    return createSessionId();
  }
}

function FloorGuideCard() {
  return (
    <section className="floor-guide-card" aria-label="黄鹤楼层分布">
      <h2>黄鹤楼层分布</h2>
      <div className="floor-guide-card__body">
        <ul>
          {floorGuideItems.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <div className="floor-guide-card__image">
          <img src={heroImage} alt="" aria-hidden="true" />
        </div>
      </div>
    </section>
  );
}

function SettingsPage() {
  const [settings, setSettings] = useState(loadAssistantSettings);
  const [status, setStatus] = useState("");
  const [isTesting, setIsTesting] = useState(false);

  function updateSetting(name, value) {
    setSettings((current) => ({
      ...current,
      [name]: value
    }));
  }

  function returnToAssistant() {
    window.location.href = "./";
  }

  function handleSave() {
    const saved = saveAssistantSettings(settings);
    setSettings(saved);
    setStatus("设置已保存。返回聊天页后会使用新的模型配置。");
  }

  async function handleTest() {
    const saved = saveAssistantSettings(settings);
    setSettings(saved);
    setIsTesting(true);
    setStatus("正在测试模型连接...");

    try {
      const result = await testAssistantProvider(buildProviderPayload(saved));
      setStatus(result.reply ? `连接成功：${result.reply}` : "连接成功。");
    } catch (error) {
      setStatus(error.message || "模型连接测试失败。");
    } finally {
      setIsTesting(false);
    }
  }

  return (
    <main className="assistant-page">
      <section className="assistant-shell assistant-shell--settings" aria-label="AI API 设置">
        <img className="assistant-bg" src={heroImage} alt="" aria-hidden="true" />
        <div className="assistant-bg-wash" aria-hidden="true"></div>

        <form className="api-settings-panel" onSubmit={(event) => event.preventDefault()}>
          <button className="return-button" type="button" onClick={returnToAssistant}>
            返回 AI 导览
          </button>
          <p className="assistant-kicker">Model Settings</p>
          <h1>API 设置</h1>
          <p className="assistant-lede">
            填写 OpenAI-compatible 接口信息后，AI 小助手会优先使用这里保存的模型。
          </p>

          <label className="api-settings-field">
            <span>服务商名称</span>
            <input
              value={settings.providerName}
              onChange={(event) => updateSetting("providerName", event.target.value)}
              placeholder="DeepSeek / OpenAI / 自定义"
            />
          </label>

          <label className="api-settings-field">
            <span>API Base URL</span>
            <input
              value={settings.baseUrl}
              onChange={(event) => updateSetting("baseUrl", event.target.value)}
              placeholder="https://api.deepseek.com 或 https://api.openai.com/v1"
            />
          </label>

          <label className="api-settings-field">
            <span>API Key</span>
            <input
              type="password"
              value={settings.apiKey}
              onChange={(event) => updateSetting("apiKey", event.target.value)}
              placeholder="sk-..."
              autoComplete="off"
            />
          </label>

          <label className="api-settings-field">
            <span>模型名称</span>
            <input
              value={settings.model}
              onChange={(event) => updateSetting("model", event.target.value)}
              placeholder="deepseek-chat / gpt-4o-mini / qwen-plus"
            />
          </label>

          <label className="api-settings-toggle">
            <input
              type="checkbox"
              checked={settings.stream}
              onChange={(event) => updateSetting("stream", event.target.checked)}
            />
            <span>启用流式输出</span>
          </label>

          <div className="api-settings-actions">
            <button className="quick-question" type="button" onClick={handleSave}>
              保存设置
            </button>
            <button className="quick-question" type="button" disabled={isTesting} onClick={handleTest}>
              {isTesting ? "测试中..." : "测试连接"}
            </button>
          </div>

          <p className="api-settings-note">
            如果不填写自定义配置，将继续使用部署环境中的默认模型。公开部署时，请只填写你愿意在本机浏览器保存的 Key。
          </p>

          {status ? <div className="assistant-error api-settings-status" role="status">{status}</div> : null}
        </form>
      </section>
    </main>
  );
}

function ChatPage() {
  const [messages, setMessages] = useState(createInitialMessages);
  const [draftMessage, setDraftMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isSpeechActive, setIsSpeechActive] = useState(false);
  const [error, setError] = useState("");
  const [settings] = useState(loadAssistantSettings);
  const [isHistoryReady, setIsHistoryReady] = useState(false);
  const [sessionStatus, setSessionStatus] = useState("");
  const sessionId = useMemo(getChatSessionId, []);
  const saveTimerRef = useRef(null);
  const apiHistory = useMemo(() => buildApiHistory(messages), [messages]);
  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition,
    isMicrophoneAvailable
  } = useSpeechRecognition();
  const isVoiceListening = listening || isSpeechActive;
  const speechHint = getSpeechInputHint({
    browserSupportsSpeechRecognition,
    isMicrophoneAvailable,
    listening: isVoiceListening,
    transcript
  });
  const hasDraftMessage = normalizeTranscript(draftMessage).length > 0;

  useEffect(() => {
    let isMounted = true;

    loadChatSession(sessionId)
      .then((savedMessages) => {
        if (!isMounted) {
          return;
        }

        if (savedMessages.length) {
          setMessages(savedMessages);
          setSessionStatus("已恢复历史对话");
        }
      })
      .catch(() => {
        if (isMounted) {
          setSessionStatus("历史对话暂时无法读取");
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsHistoryReady(true);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [sessionId]);

  useEffect(() => {
    if (!isHistoryReady) {
      return undefined;
    }

    window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(() => {
      saveChatSession(sessionId, messages).catch(() => {
        setSessionStatus("历史对话暂时无法保存");
      });
    }, 500);

    return () => {
      window.clearTimeout(saveTimerRef.current);
    };
  }, [isHistoryReady, messages, sessionId]);

  useEffect(() => {
    const recognizedMessage = normalizeTranscript(transcript);

    if (recognizedMessage) {
      setDraftMessage(recognizedMessage);
    }
  }, [transcript]);

  async function submitMessage(rawMessage = "") {
    const message = normalizeTranscript(rawMessage);

    if (!message || isSending) {
      return;
    }

    stopSpeechInput();
    resetTranscript();
    setDraftMessage("");
    setError("");
    const nextMessages = appendUserMessage(messages, message);
    const assistantPlaceholder = appendAssistantPlaceholder(nextMessages);
    setMessages(assistantPlaceholder.messages);
    setIsSending(true);

    try {
      const providerPayload = buildProviderPayload(settings);
      const reply = await streamChatMessage({
        message,
        history: buildApiHistory(nextMessages),
        provider: providerPayload ? { ...providerPayload, stream: settings.stream } : { stream: settings.stream },
        onChunk: (chunk) => {
          setMessages((current) => appendToMessage(current, assistantPlaceholder.id, chunk));
        }
      });

      if (!reply.trim()) {
        setMessages((current) => appendToMessage(current, assistantPlaceholder.id, "小助手暂时没有生成回复。"));
      }
    } catch (requestError) {
      setError(requestError.message || "小助手暂时没有回应，请稍后再试。");
      setMessages((current) =>
        appendToMessage(
          current,
          assistantPlaceholder.id,
          "小助手暂时没有回应。你可以稍后再问，或先返回数字展厅继续体验。"
        )
      );
    } finally {
      setIsSending(false);
    }
  }

  async function stopSpeechInput() {
    setIsSpeechActive(false);

    try {
      await SpeechRecognition.stopListening();
      await SpeechRecognition.abortListening();
    } catch {
      SpeechRecognition.abortListening();
    }
  }

  async function toggleSpeechInput() {
    if (!browserSupportsSpeechRecognition || isSending) {
      return;
    }

    setError("");

    if (listening || isSpeechActive) {
      await stopSpeechInput();
      return;
    }

    resetTranscript();
    setDraftMessage("");
    setIsSpeechActive(true);

    try {
      await SpeechRecognition.startListening({
        continuous: true,
        language: "zh-CN"
      });
    } catch {
      setIsSpeechActive(false);
      setError("语音识别启动失败，请检查麦克风权限或浏览器设置。");
    }
  }

  function handleDraftChange(_innerHtml, textContent) {
    setDraftMessage(textContent || "");
  }

  function handleDraftSend(_innerHtml, textContent, innerText) {
    submitMessage(textContent || innerText || draftMessage);
  }

  function returnToGallery() {
    window.location.href = "../";
  }

  function openSettings() {
    window.location.href = "?settings=1";
  }

  async function handleClearHistory() {
    setError("");
    setMessages(createInitialMessages());
    setSessionStatus("对话已清空");

    try {
      await clearChatSession(sessionId);
    } catch {
      setSessionStatus("服务器历史暂时无法清空");
    }
  }

  return (
    <main className="assistant-page">
      <section className="assistant-shell" aria-label="黄鹤楼 AI 智能导览">
        <img className="assistant-bg" src={heroImage} alt="" aria-hidden="true" />
        <div className="assistant-bg-wash" aria-hidden="true"></div>

        <aside className="assistant-guide-panel">
          <button className="return-button" type="button" onClick={returnToGallery}>
            返回数字展厅
          </button>
          <button className="api-settings-button" type="button" onClick={openSettings}>
            API 设置
          </button>
          <button className="api-settings-button" type="button" onClick={handleClearHistory}>
            清空对话
          </button>
          <p className="assistant-kicker">Yellow Crane Tower</p>
          <h1>黄鹤楼 AI 智能导览</h1>
          <p className="assistant-lede">
            询问楼层、手势玩法、展厅路线和常见问题。
          </p>
          {hasCustomProvider(settings) ? (
            <p className="assistant-provider-pill">
              当前模型：{settings.providerName || "自定义"} / {settings.model || "未填写"}
            </p>
          ) : null}
          <div className="quick-question-list" aria-label="快捷问题">
            {quickQuestions.map((question) => (
              <button
                className="quick-question"
                type="button"
                key={question}
                disabled={isSending}
                onClick={() => submitMessage(question)}
              >
                {question}
              </button>
            ))}
          </div>
          <span className="assistant-seal" aria-hidden="true">导览</span>
        </aside>

        <div className="assistant-chat">
          <div className="assistant-chat__meta">
            <span>AI 智能导览</span>
            <small>黄鹤楼数字展厅小助手</small>
          </div>
          <span className="assistant-context-count">用于回复的上下文：{apiHistory.length}/{API_HISTORY_LIMIT} 条</span>
          {sessionStatus ? <span className="assistant-session-status">{sessionStatus}</span> : null}
          <FloorGuideCard />
          <MainContainer>
            <ChatContainer>
              <MessageList>
                {messages.map((item) => (
                  <Message
                    key={item.id}
                    model={{
                      message: item.message,
                      direction: item.direction,
                      sender: item.sender
                    }}
                  />
                ))}
              </MessageList>

              {error ? <div className="assistant-error" role="alert">{error}</div> : null}
              {isSending ? <div className="assistant-thinking" role="status">小助手正在思考</div> : null}

              <div className="assistant-input-row">
                <button
                  className={`assistant-voice-button${isVoiceListening ? " is-listening" : ""}`}
                  type="button"
                  aria-label={isVoiceListening ? "停止语音输入" : "开始语音输入"}
                  aria-pressed={isVoiceListening}
                  disabled={!browserSupportsSpeechRecognition || isSending}
                  title={speechHint}
                  onClick={toggleSpeechInput}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                    <path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Z" />
                    <path d="M19 11a7 7 0 0 1-14 0" />
                    <path d="M12 18v3" />
                    <path d="M8 21h8" />
                  </svg>
                </button>
                <MessageInput
                attachButton={false}
                disabled={isSending}
                placeholder="问我黄鹤楼、楼层、手势或展厅玩法..."
                sendButton
                sendDisabled={isSending || !hasDraftMessage}
                value={draftMessage}
                activateAfterChange
                onChange={handleDraftChange}
                onSend={handleDraftSend}
              />
              </div>
              <div className="assistant-speech-status" role="status" aria-live="polite">
                {speechHint}
              </div>
            </ChatContainer>
          </MainContainer>
        </div>

        <div className="assistant-input-panel">
            <div className="assistant-input-row">
              <button
                className={`assistant-voice-button${isVoiceListening ? " is-listening" : ""}`}
                type="button"
                aria-label={isVoiceListening ? "停止语音输入" : "开始语音输入"}
                aria-pressed={isVoiceListening}
                disabled={!browserSupportsSpeechRecognition || isSending}
                title={speechHint}
                onClick={toggleSpeechInput}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Z" />
                  <path d="M19 11a7 7 0 0 1-14 0" />
                  <path d="M12 18v3" />
                  <path d="M8 21h8" />
                </svg>
              </button>
              <MessageInput
                attachButton={false}
                disabled={isSending}
                placeholder="问我黄鹤楼、楼层、手势或展厅玩法..."
                sendButton
                sendDisabled={isSending || !hasDraftMessage}
                value={draftMessage}
                activateAfterChange
                onChange={handleDraftChange}
                onSend={handleDraftSend}
              />
            </div>
            <div className="assistant-speech-status" role="status" aria-live="polite">
              {speechHint}
            </div>
          </div>
      </section>
    </main>
  );
}

function App() {
  return isSettingsPath ? <SettingsPage /> : <ChatPage />;
}

export default App;
