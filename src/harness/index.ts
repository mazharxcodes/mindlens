import { BiasDetector } from "../content/bias-detector";
import { MindLensEventBus } from "../content/event-bus";
import { LocalAnalysisEngine } from "../content/local-analysis-engine";
import { createProviders } from "../content/provider-registry";
import { MindLensSettingsStore } from "../content/settings-store";
import { HARNESS_SCENARIOS } from "./fixtures";
import { InstagramPost, MindLensEvent, PerspectiveIntervention } from "../content/types";

type HarnessRunSummary = {
  scenarioName: string;
  analyzedPosts: number;
  latestBiasScore: number;
  shouldIntervene: boolean;
  interventionPreview: PerspectiveIntervention | null;
  recentEvents: MindLensEvent[];
};

const settingsStore = new MindLensSettingsStore();

function createHarnessPost(text: string, index: number): InstagramPost {
  return {
    id: `harness-post-${index}`,
    text,
    textLength: text.length,
    visibleTextBlocks: [text],
    imageAltTexts: []
  };
}

async function runScenario(scenarioId: string): Promise<HarnessRunSummary> {
  const scenario = HARNESS_SCENARIOS.find((item) => item.id === scenarioId);
  if (!scenario) {
    throw new Error("Unknown harness scenario.");
  }

  const settings = await settingsStore.getSettings();
  const providers = createProviders(settings);
  const eventBus = new MindLensEventBus();
  const biasDetector = new BiasDetector(eventBus, undefined, settings.interventionThreshold);
  const analysisEngine = new LocalAnalysisEngine(eventBus, providers.analysisService);
  let interventionPreview: PerspectiveIntervention | null = null;
  const shownPatterns = new Set<string>();

  for (const [index, postText] of scenario.posts.entries()) {
    const post = createHarnessPost(postText, index + 1);
    await analysisEngine.analyze(post);
    const snapshot = biasDetector.getSnapshot();

    if (snapshot.shouldIntervene) {
      const pattern = [
        snapshot.dominantCategory ?? "general",
        snapshot.dominantSentiment ?? "neutral",
        snapshot.dominantTone ?? "balanced"
      ].join("|");

      if (!shownPatterns.has(pattern)) {
        shownPatterns.add(pattern);
        interventionPreview = await providers.perspectiveService.generate(snapshot);
      }
    }
  }

  const latestBias = biasDetector.getSnapshot();
  return {
    scenarioName: scenario.name,
    analyzedPosts: scenario.posts.length,
    latestBiasScore: latestBias.score,
    shouldIntervene: latestBias.shouldIntervene,
    interventionPreview,
    recentEvents: eventBus.getRecentEvents(30)
  };
}

function renderScenarioOptions(): string {
  return HARNESS_SCENARIOS.map(
    (scenario) => `
      <button class="scenario-button" data-scenario-id="${scenario.id}">
        <strong>${scenario.name}</strong>
        <span>${scenario.description}</span>
      </button>
    `
  ).join("");
}

function renderEventItem(event: MindLensEvent): string {
  return `<article class="event-item"><code>${event.type}</code><pre>${JSON.stringify(
    event,
    null,
    2
  )}</pre></article>`;
}

function downloadJson(filename: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

async function render(result?: HarnessRunSummary): Promise<void> {
  const settings = await settingsStore.getSettings();

  document.body.innerHTML = `
    <main class="harness-shell">
      <section class="hero">
        <div>
          <p class="eyebrow">MindLens Harness</p>
          <h1>Replay Lab</h1>
          <p class="subtitle">Run repeatable feed scenarios without relying on live Instagram.</p>
        </div>
        <div class="provider-pill">Mode: ${settings.generationMode}</div>
      </section>

      <section class="panel">
        <h2>Scenarios</h2>
        <div class="scenario-grid">${renderScenarioOptions()}</div>
      </section>

      <section class="panel">
        <h2>Run Summary</h2>
        ${
          result
            ? `
              <div class="summary-grid">
                <div class="summary-card"><span>Scenario</span><strong>${result.scenarioName}</strong></div>
                <div class="summary-card"><span>Posts</span><strong>${result.analyzedPosts}</strong></div>
                <div class="summary-card"><span>Bias Score</span><strong>${result.latestBiasScore.toFixed(2)}</strong></div>
                <div class="summary-card"><span>Intervene</span><strong>${result.shouldIntervene ? "Yes" : "No"}</strong></div>
              </div>
              ${
                result.interventionPreview
                  ? `
                    <article class="preview-card">
                      <p class="preview-eyebrow">Preview via ${result.interventionPreview.provider}</p>
                      <h3>${result.interventionPreview.headline}</h3>
                      <p>${result.interventionPreview.body}</p>
                    </article>
                  `
                  : `<p class="empty-state">No intervention preview generated for this scenario.</p>`
              }
            `
            : `<p class="empty-state">Choose a scenario to replay the current MindLens pipeline.</p>`
        }
      </section>

      <section class="panel">
        <div class="panel-header">
          <h2>Recent Events</h2>
          <button id="export-button" type="button" ${result ? "" : "disabled"}>Export JSON</button>
        </div>
        <div class="event-list">
          ${result ? result.recentEvents.map(renderEventItem).join("") : `<p class="empty-state">No replay yet.</p>`}
        </div>
      </section>
    </main>
  `;

  document.querySelectorAll<HTMLElement>("[data-scenario-id]").forEach((button) => {
    button.addEventListener("click", async () => {
      const scenarioId = button.dataset.scenarioId;
      if (!scenarioId) {
        return;
      }

      button.setAttribute("disabled", "true");
      try {
        const nextResult = await runScenario(scenarioId);
        await render(nextResult);
      } finally {
        button.removeAttribute("disabled");
      }
    });
  });

  document.getElementById("export-button")?.addEventListener("click", () => {
    if (result) {
      downloadJson(`mindlens-harness-${result.scenarioName.toLowerCase().replace(/\s+/g, "-")}.json`, result);
    }
  });
}

void render();
