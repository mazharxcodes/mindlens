import { GetLiveStateRequestMessage, GetLiveStateResponseMessage } from "../shared/runtime";
import { MindLensSettingsStore, getDefaultSettings } from "../content/settings-store";
import { MindLensStorage, createEmptyMetrics } from "../content/storage";
import { ProviderDiagnostics } from "../content/types";

const settingsStore = new MindLensSettingsStore();
const metricsStore = new MindLensStorage();

type PopupState = {
  isInstagramTab: boolean;
  tabId: number | null;
  liveState: GetLiveStateResponseMessage | null;
};

const state: PopupState = {
  isInstagramTab: false,
  tabId: null,
  liveState: null
};

async function getActiveTab(): Promise<chrome.tabs.Tab | undefined> {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs[0];
}

function formatDuration(durationMs: number): string {
  if (!durationMs) {
    return "0s";
  }

  if (durationMs < 1000) {
    return `${durationMs}ms`;
  }

  return `${(durationMs / 1000).toFixed(1)}s`;
}

function formatDateTime(value: string | null): string {
  if (!value) {
    return "--";
  }

  return new Date(value).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit"
  });
}

function formatCooldown(diagnostics: ProviderDiagnostics): string {
  if (!diagnostics.cooldownUntil) {
    return "--";
  }

  const remainingMs = new Date(diagnostics.cooldownUntil).getTime() - Date.now();
  return remainingMs > 0 ? formatDuration(remainingMs) : "ready";
}

async function loadLiveState(): Promise<void> {
  const tab = await getActiveTab();
  const isInstagramTab = Boolean(tab?.id && tab.url?.startsWith("https://www.instagram.com/"));
  state.isInstagramTab = isInstagramTab;
  state.tabId = tab?.id ?? null;

  if (!isInstagramTab || !tab?.id) {
    state.liveState = null;
    return;
  }

  try {
    const message: GetLiveStateRequestMessage = { type: "mindlens:get-live-state" };
    state.liveState = (await chrome.tabs.sendMessage(
      tab.id,
      message
    )) as GetLiveStateResponseMessage;
  } catch {
    state.liveState = null;
  }
}

async function applySettingsFromForm(form: HTMLFormElement): Promise<void> {
  const formData = new FormData(form);
  const generationMode = String(formData.get("generationMode") ?? "local") as
    | "local"
    | "ollama"
    | "remote";

  await settingsStore.updateSettings({
    generationMode,
    interventionThreshold: Number(formData.get("interventionThreshold") ?? 0.67),
    ollamaEnabled: generationMode === "ollama",
    ollamaModel: String(formData.get("ollamaModel") ?? "llama3.2:3b"),
    ollamaEndpoint: String(
      formData.get("ollamaEndpoint") ?? "http://127.0.0.1:11434/api/generate"
    )
  });

  if (state.tabId) {
    await chrome.tabs.reload(state.tabId);
  }
}

async function resetAll(): Promise<void> {
  await settingsStore.resetSettings();
  await metricsStore.resetMetrics();

  if (state.tabId) {
    await chrome.tabs.reload(state.tabId);
  }
}

function openHarness(): void {
  void chrome.tabs.create({
    url: chrome.runtime.getURL("harness.html")
  });
}

async function render(): Promise<void> {
  const settings = state.liveState?.settings ?? (await settingsStore.getSettings());
  const metrics = state.liveState?.metrics ?? (await metricsStore.getMetrics());
  const liveBias = state.liveState?.biasSnapshot;
  const currentIntervention = state.liveState?.currentIntervention;
  const providerDiagnostics = state.liveState?.providerDiagnostics;

  document.body.innerHTML = `
    <main class="popup-shell">
      <section class="hero">
        <div>
          <p class="eyebrow">MindLens</p>
          <h1>Control Room</h1>
        </div>
        <div class="pill ${state.isInstagramTab ? "pill-live" : "pill-idle"}">
          ${state.isInstagramTab ? "Instagram live" : "Open Instagram"}
        </div>
      </section>

      <section class="panel">
        <h2>Live Feed</h2>
        <div class="stat-grid">
          <div class="stat">
            <span class="stat-label">Bias Score</span>
            <strong>${liveBias ? liveBias.score.toFixed(2) : "--"}</strong>
          </div>
          <div class="stat">
            <span class="stat-label">Threshold</span>
            <strong>${settings.interventionThreshold.toFixed(2)}</strong>
          </div>
          <div class="stat">
            <span class="stat-label">Category</span>
            <strong>${liveBias?.dominantCategory ?? "--"}</strong>
          </div>
          <div class="stat">
            <span class="stat-label">Tone</span>
            <strong>${liveBias?.dominantTone ?? "--"}</strong>
          </div>
          <div class="stat">
            <span class="stat-label">Avg Confidence</span>
            <strong>${liveBias ? liveBias.averageConfidence.toFixed(2) : "--"}</strong>
          </div>
        </div>
        <p class="subtle">
          ${
            currentIntervention
              ? `Current intervention via ${currentIntervention.provider}`
              : "No active intervention right now."
          }
        </p>
      </section>

      <section class="panel">
        <h2>Generation</h2>
        <div class="provider-strip">
          <div class="provider-chip">Configured: ${providerDiagnostics?.configuredMode ?? settings.generationMode}</div>
          <div class="provider-chip">Active: ${providerDiagnostics?.activeProvider ?? "local"}</div>
          <div class="provider-chip provider-chip--${providerDiagnostics?.health ?? "idle"}">
            ${providerDiagnostics?.health ?? "idle"}
          </div>
        </div>
        <p class="subtle">
          ${
            providerDiagnostics?.usingFallback
              ? `Fallback active. Cooldown remaining: ${formatCooldown(providerDiagnostics)}`
              : `Last success: ${formatDateTime(providerDiagnostics?.lastSuccessAt ?? null)}`
          }
        </p>
        ${
          providerDiagnostics?.lastError
            ? `<p class="subtle subtle-error">Last provider error: ${providerDiagnostics.lastError}</p>`
            : ""
        }
        <form id="settings-form" class="form-stack">
          <label>
            <span>Mode</span>
            <select name="generationMode">
              <option value="local" ${settings.generationMode === "local" ? "selected" : ""}>Local</option>
              <option value="ollama" ${settings.generationMode === "ollama" ? "selected" : ""}>Ollama</option>
              <option value="remote" ${settings.generationMode === "remote" ? "selected" : ""}>Remote</option>
            </select>
          </label>
          <label>
            <span>Intervention Threshold</span>
            <input
              type="range"
              name="interventionThreshold"
              min="0.4"
              max="0.95"
              step="0.01"
              value="${settings.interventionThreshold}"
            />
            <small>${settings.interventionThreshold.toFixed(2)}</small>
          </label>
          <label>
            <span>Ollama Model</span>
            <input type="text" name="ollamaModel" value="${settings.ollamaModel}" />
          </label>
          <label>
            <span>Ollama Endpoint</span>
            <input type="text" name="ollamaEndpoint" value="${settings.ollamaEndpoint}" />
          </label>
          <button type="submit" class="primary">Save And Reload Tab</button>
        </form>
      </section>

      <section class="panel">
        <h2>Metrics</h2>
        <div class="stat-grid">
          <div class="stat">
            <span class="stat-label">Shown</span>
            <strong>${metrics.totals.interventionsShown}</strong>
          </div>
          <div class="stat">
            <span class="stat-label">Expanded</span>
            <strong>${metrics.totals.interventionsExpanded}</strong>
          </div>
          <div class="stat">
            <span class="stat-label">Dismissed</span>
            <strong>${metrics.totals.interventionsDismissed}</strong>
          </div>
          <div class="stat">
            <span class="stat-label">Ignored</span>
            <strong>${metrics.totals.interventionsIgnored}</strong>
          </div>
          <div class="stat">
            <span class="stat-label">Generation Failures</span>
            <strong>${metrics.totals.generationFailures}</strong>
          </div>
        </div>
        <p class="subtle">Average pause after intervention: ${formatDuration(metrics.averagePauseAfterShownMs)}</p>
        <p class="subtle">
          Provider usage: local ${metrics.totals.shownByProvider.local}, ollama ${metrics.totals.shownByProvider.ollama}, remote ${metrics.totals.shownByProvider.remote}
        </p>
      </section>

      <section class="panel">
        <h2>Recent</h2>
        <div class="recent-list">
          ${
            metrics.recentInterventions.length > 0
              ? metrics.recentInterventions
                  .slice(0, 5)
                  .map(
                    (item) => `
                      <article class="recent-item">
                        <div class="recent-row">
                          <strong>${item.status}</strong>
                          <span>${item.provider} · ${item.dominantCategory ?? "general"}</span>
                        </div>
                        <div class="recent-row subtle">
                          <span>Score ${item.scoreAtTrigger.toFixed(2)}</span>
                          <span>${formatDuration(item.pauseAfterShownMs ?? 0)}</span>
                        </div>
                      </article>
                    `
                  )
                  .join("")
              : `<p class="subtle">No intervention history yet.</p>`
          }
        </div>
      </section>

      <section class="panel actions">
        <button id="harness-button" type="button">Open Replay Lab</button>
        <button id="refresh-button" type="button">Refresh Snapshot</button>
        <button id="reset-button" type="button" class="danger">Reset Settings And Metrics</button>
      </section>
    </main>
  `;

  const form = document.getElementById("settings-form");
  if (form instanceof HTMLFormElement) {
    const thresholdInput = form.querySelector<HTMLInputElement>("input[name='interventionThreshold']");
    const thresholdLabel = form.querySelector("small");

    thresholdInput?.addEventListener("input", () => {
      if (thresholdInput && thresholdLabel) {
        thresholdLabel.textContent = Number(thresholdInput.value).toFixed(2);
      }
    });

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      await applySettingsFromForm(form);
      await loadLiveState();
      await render();
    });
  }

  document.getElementById("refresh-button")?.addEventListener("click", async () => {
    await loadLiveState();
    await render();
  });

  document.getElementById("harness-button")?.addEventListener("click", () => {
    openHarness();
  });

  document.getElementById("reset-button")?.addEventListener("click", async () => {
    await resetAll();
    state.liveState = {
      biasSnapshot: {
        score: 0,
        shouldIntervene: false,
        sampleSize: 0,
        averageConfidence: 0,
        dominantCategory: null,
        dominantCategoryRatio: 0,
        dominantSentiment: null,
        dominantSentimentRatio: 0,
        dominantTone: null,
        dominantToneRatio: 0,
        repeatedSignalRatio: 0,
        components: {
          categoryDominance: 0,
          sentimentSkew: 0,
          toneSkew: 0,
          repetition: 0
        }
      },
      currentIntervention: null,
      metrics: createEmptyMetrics(),
      settings: getDefaultSettings(),
      providerDiagnostics: {
        configuredMode: "local",
        activeProvider: "local",
        health: "idle",
        usingFallback: false,
        consecutiveFailures: 0,
        cooldownUntil: null,
        lastError: null,
        lastAttemptAt: null,
        lastSuccessAt: null
      }
    };
    await render();
  });
}

void loadLiveState().then(render);
