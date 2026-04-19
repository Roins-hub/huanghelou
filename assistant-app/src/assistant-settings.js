export const DEFAULT_ASSISTANT_SETTINGS = {
  providerName: "DeepSeek",
  baseUrl: "",
  apiKey: "",
  model: "",
  stream: true
};

const STORAGE_KEY = "huanghelou-assistant-api-settings";

function cleanSettings(settings = {}) {
  return {
    providerName: (settings.providerName || DEFAULT_ASSISTANT_SETTINGS.providerName).trim() || DEFAULT_ASSISTANT_SETTINGS.providerName,
    baseUrl: (settings.baseUrl || "").trim().replace(/\/$/, ""),
    apiKey: (settings.apiKey || "").trim(),
    model: (settings.model || "").trim(),
    stream: settings.stream !== false
  };
}

export function loadAssistantSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return DEFAULT_ASSISTANT_SETTINGS;
    }

    return {
      ...DEFAULT_ASSISTANT_SETTINGS,
      ...cleanSettings(JSON.parse(raw))
    };
  } catch {
    return DEFAULT_ASSISTANT_SETTINGS;
  }
}

export function saveAssistantSettings(settings) {
  const cleaned = cleanSettings(settings);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
  return cleaned;
}

export function hasCustomProvider(settings) {
  const cleaned = cleanSettings(settings);
  return Boolean(cleaned.baseUrl || cleaned.apiKey || cleaned.model);
}

export function buildProviderPayload(settings) {
  const cleaned = cleanSettings(settings);

  if (!hasCustomProvider(cleaned)) {
    return undefined;
  }

  return {
    baseUrl: cleaned.baseUrl,
    apiKey: cleaned.apiKey,
    model: cleaned.model
  };
}
