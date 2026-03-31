import { MindLensSettings } from "../shared/runtime";

const SETTINGS_STORAGE_KEY = "mindlens.settings.v1";

const DEFAULT_SETTINGS: MindLensSettings = {
  analysisMode: "heuristic",
  generationMode: "local",
  interventionThreshold: 0.67,
  ollamaEnabled: false,
  ollamaEndpoint: "http://127.0.0.1:8787/generate",
  ollamaModel: "llama3.2:3b",
  remoteGenerationEnabled: false,
  remoteGenerationEndpoint: "",
  remoteGenerationApiKey: "",
  remoteGenerationModel: "gpt-4.1-mini"
};

export function getDefaultSettings(): MindLensSettings {
  return structuredClone(DEFAULT_SETTINGS);
}

function normalizeSettings(settings?: Partial<MindLensSettings>): MindLensSettings {
  const merged = {
    ...getDefaultSettings(),
    ...settings
  };

  if (merged.ollamaEndpoint === "http://127.0.0.1:11434/api/generate") {
    merged.ollamaEndpoint = getDefaultSettings().ollamaEndpoint;
  }

  return merged;
}

export class MindLensSettingsStore {
  async getSettings(): Promise<MindLensSettings> {
    if (!chrome.storage?.local) {
      return getDefaultSettings();
    }

    try {
      const stored = await chrome.storage.local.get(SETTINGS_STORAGE_KEY);
      const settings = stored[SETTINGS_STORAGE_KEY] as Partial<MindLensSettings> | undefined;
      return normalizeSettings(settings);
    } catch {
      return getDefaultSettings();
    }
  }

  async updateSettings(nextSettings: Partial<MindLensSettings>): Promise<MindLensSettings> {
    const merged = normalizeSettings({
      ...(await this.getSettings()),
      ...nextSettings
    });

    if (chrome.storage?.local) {
      try {
        await chrome.storage.local.set({
          [SETTINGS_STORAGE_KEY]: merged
        });
      } catch {
        return merged;
      }
    }

    return merged;
  }

  async resetSettings(): Promise<MindLensSettings> {
    const defaults = getDefaultSettings();

    if (chrome.storage?.local) {
      try {
        await chrome.storage.local.set({
          [SETTINGS_STORAGE_KEY]: defaults
        });
      } catch {
        return defaults;
      }
    }

    return defaults;
  }
}
