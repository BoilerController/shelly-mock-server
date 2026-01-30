import { JSON_HEADERS } from "./helpers.ts";
import { handleP1ChangeScenarioRequest, handleP1ReadingRequest } from "./p1.ts";
import { handleShellyRequest } from "./shelly.ts";

// Shelly Mock Server - A simple mock server for Shelly dimmer devices

async function handleRequest(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const pathname = url.pathname;
  const params = url.searchParams;

  if (pathname === "/p1/reading") {
    return handleP1ReadingRequest();
  }

  if (pathname === "/p1/change-scenario") {
    return handleP1ChangeScenarioRequest(params);
  }

  if (pathname.startsWith("/rpc/")) {
    const shellyResponse = await handleShellyRequest(request);
    if (shellyResponse) {
      return shellyResponse;
    }
  }

  return new Response(JSON.stringify({ error: "not found" }), {
    status: 404,
    headers: JSON_HEADERS,
  });
}

const PORT = 8080;

console.log(`Shelly Mock Server running on http://localhost:${PORT}`);

Deno.serve({ port: PORT }, handleRequest);
