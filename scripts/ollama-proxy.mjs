import http from "node:http";

const PORT = Number(process.env.OLLAMA_PROXY_PORT || 8787);
const OLLAMA_ENDPOINT =
  process.env.OLLAMA_ENDPOINT || "http://127.0.0.1:11434/api/generate";

function writeJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Content-Type": "application/json"
  });
  response.end(JSON.stringify(payload));
}

const server = http.createServer(async (request, response) => {
  if (!request.url) {
    writeJson(response, 400, { error: "Missing request URL." });
    return;
  }

  if (request.method === "OPTIONS") {
    response.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization"
    });
    response.end();
    return;
  }

  if (request.method === "GET" && request.url === "/health") {
    writeJson(response, 200, {
      ok: true,
      upstream: OLLAMA_ENDPOINT
    });
    return;
  }

  if (request.method !== "POST" || request.url !== "/generate") {
    writeJson(response, 404, { error: "Route not found." });
    return;
  }

  let body = "";
  request.on("data", (chunk) => {
    body += chunk;
  });

  request.on("end", async () => {
    try {
      const upstreamResponse = await fetch(OLLAMA_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body
      });

      const text = await upstreamResponse.text();
      response.writeHead(upstreamResponse.status, {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Content-Type": upstreamResponse.headers.get("content-type") || "application/json"
      });
      response.end(text);
    } catch (error) {
      writeJson(response, 502, {
        error: error instanceof Error ? error.message : "Failed to reach Ollama."
      });
    }
  });
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(
    `MindLens Ollama proxy listening on http://127.0.0.1:${PORT} and forwarding to ${OLLAMA_ENDPOINT}`
  );
});
