import {
  GeneratePerspectiveRequestMessage,
  GeneratePerspectiveResponseMessage,
  MindLensRuntimeMessage
} from "../shared/runtime";

type RemotePerspectivePayload = {
  headline: string;
  body: string;
};

function createPrompt(message: GeneratePerspectiveRequestMessage): string {
  const { snapshot } = message.payload;

  return [
    "You write short, neutral perspective prompts for an Instagram feed intervention.",
    "Return strict JSON with keys headline and body.",
    "The tone must be non-judgmental, subtle, and thought-provoking.",
    "Avoid preachy or corrective language.",
    `Bias score: ${snapshot.score}`,
    `Dominant category: ${snapshot.dominantCategory ?? "general"}`,
    `Dominant sentiment: ${snapshot.dominantSentiment ?? "neutral"}`,
    `Dominant tone: ${snapshot.dominantTone ?? "balanced"}`,
    `Repeated signal ratio: ${snapshot.repeatedSignalRatio}`,
    "Keep headline under 12 words.",
    "Keep body to 1-2 short sentences."
  ].join("\n");
}

async function generatePerspectiveRemotely(
  message: GeneratePerspectiveRequestMessage
): Promise<GeneratePerspectiveResponseMessage> {
  const { settings, snapshot } = message.payload;

  if (!settings.remoteGenerationEnabled || !settings.remoteGenerationEndpoint) {
    return {
      ok: false,
      error: "Remote generation is disabled or missing an endpoint."
    };
  }

  const response = await fetch(settings.remoteGenerationEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(settings.remoteGenerationApiKey
        ? { Authorization: `Bearer ${settings.remoteGenerationApiKey}` }
        : {})
    },
    body: JSON.stringify({
      model: settings.remoteGenerationModel,
      prompt: createPrompt(message)
    })
  });

  if (!response.ok) {
    return {
      ok: false,
      error: `Remote generation failed with status ${response.status}.`
    };
  }

  const payload = (await response.json()) as Partial<RemotePerspectivePayload>;
  if (!payload.headline || !payload.body) {
    return {
      ok: false,
      error: "Remote generation response was missing headline or body."
    };
  }

  return {
    ok: true,
    provider: "remote",
    intervention: {
      id: `intervention:${new Date().toISOString()}`,
      headline: payload.headline,
      body: payload.body,
      createdAt: new Date().toISOString(),
      trigger: snapshot
    }
  };
}

async function generatePerspectiveWithOllama(
  message: GeneratePerspectiveRequestMessage
): Promise<GeneratePerspectiveResponseMessage> {
  const { settings, snapshot } = message.payload;

  if (!settings.ollamaEnabled || !settings.ollamaEndpoint) {
    return {
      ok: false,
      error: "Ollama generation is disabled or missing an endpoint."
    };
  }

  const response = await fetch(settings.ollamaEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: settings.ollamaModel,
      prompt: createPrompt(message),
      stream: false,
      format: "json"
    })
  });

  if (!response.ok) {
    return {
      ok: false,
      error: `Ollama generation failed with status ${response.status}.`
    };
  }

  const payload = (await response.json()) as { response?: string };
  if (!payload.response) {
    return {
      ok: false,
      error: "Ollama response was empty."
    };
  }

  const parsed = JSON.parse(payload.response) as Partial<RemotePerspectivePayload>;
  if (!parsed.headline || !parsed.body) {
    return {
      ok: false,
      error: "Ollama response was missing headline or body."
    };
  }

  return {
    ok: true,
    provider: "ollama",
    intervention: {
      id: `intervention:${new Date().toISOString()}`,
      headline: parsed.headline,
      body: parsed.body,
      createdAt: new Date().toISOString(),
      trigger: snapshot
    }
  };
}

chrome.runtime.onMessage.addListener((message: MindLensRuntimeMessage, _sender, sendResponse) => {
  if (message.type !== "mindlens:generate-perspective") {
    return false;
  }

  const task =
    message.payload.settings.generationMode === "ollama"
      ? generatePerspectiveWithOllama(message)
      : generatePerspectiveRemotely(message);

  void task
    .then(sendResponse)
    .catch((error: unknown) => {
      sendResponse({
        ok: false,
        error: error instanceof Error ? error.message : "Unknown background generation error."
      } satisfies GeneratePerspectiveResponseMessage);
    });

  return true;
});
