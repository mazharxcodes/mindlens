import { MindLensSettings } from "../shared/runtime";

const SETTINGS_STORAGE_KEY = "mindlens.settings.v1";

const DEFAULT_SETTINGS: MindLensSettings = {
  analysisMode: "heuristic",
  generationMode: "local",
  interventionThreshold: 0.67,
  ollamaEnabled: false,
  ollamaEndpoint: "http://127.0.0.1:11434/api/generate",
  ollamaModel: "llama3.2:3b",
  remoteGenerationEnabled: false,
  remoteGenerationEndpoint: "",
  remoteGenerationApiKey: "",
  remoteGenerationModel: "gpt-4.1-mini"
};

export function getDefaultSettings(): MindLensSettings {
  return structuredClone(DEFAULT_SETTINGS);
}

export class MindLensSettingsStore {
  async getSettings(): Promise<MindLensSettings> {
    if (!chrome.storage?.local) {
      return getDefaultSettings();
    }

    const stored = await chrome.storage.local.get(SETTINGS_STORAGE_KEY);
    const settings = stored[SETTINGS_STORAGE_KEY] as Partial<MindLensSettings> | undefined;

    return {
      ...getDefaultSettings(),
      ...settings
    };
  }

  async updateSettings(nextSettings: Partial<MindLensSettings>): Promise<MindLensSettings> {
    const merged = {
      ...(await this.getSettings()),
      ...nextSettings
    };

    if (chrome.storage?.local) {
      await chrome.storage.local.set({
        [SETTINGS_STORAGE_KEY]: merged
      });
    }

    return merged;
  }

  async resetSettings(): Promise<MindLensSettings> {
    const defaults = getDefaultSettings();

    if (chrome.storage?.local) {
      await chrome.storage.local.set({
        [SETTINGS_STORAGE_KEY]: defaults
      });
    }

    return defaults;
  }
}
