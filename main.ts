// Shelly Mock Server - A simple mock server for Shelly dimmer devices

// In-memory state for lights
interface LightState {
  on: boolean;
  brightness: number;
}

const lights: Map<number, LightState> = new Map();

// Initialize default state for light id 0
lights.set(0, { on: false, brightness: 0 });

function getLightState(id: number): LightState | undefined {
  return lights.get(id);
}

function setLightState(id: number, updates: Partial<LightState>): LightState | undefined {
  const current = lights.get(id);
  if (!current) {
    return undefined;
  }
  const updated = { ...current, ...updates };
  lights.set(id, updated);
  return updated;
}

function handleRequest(request: Request): Response {
  const url = new URL(request.url);
  const pathname = url.pathname;
  const params = url.searchParams;

  // Handle Light.Set endpoint
  if (pathname === "/rpc/Light.Set") {
    const idParam = params.get("id");
    if (idParam === null) {
      return new Response(JSON.stringify({ error: "id parameter required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const id = parseInt(idParam, 10);
    if (isNaN(id)) {
      return new Response(JSON.stringify({ error: "id must be a number" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const state = getLightState(id);
    if (!state) {
      return new Response(JSON.stringify({ error: "light not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const updates: Partial<LightState> = {};

    const onParam = params.get("on");
    if (onParam !== null) {
      updates.on = onParam === "true";
    }

    const brightnessParam = params.get("brightness");
    if (brightnessParam !== null) {
      const brightness = parseInt(brightnessParam, 10);
      if (isNaN(brightness)) {
        return new Response(JSON.stringify({ error: "brightness must be a number" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (brightness < 0 || brightness > 100) {
        return new Response(JSON.stringify({ error: "brightness must be between 0 and 100" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
      updates.brightness = brightness;
    }

    const updated = setLightState(id, updates);
    return new Response(JSON.stringify(updated), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Handle Light.GetStatus endpoint
  if (pathname === "/rpc/Light.GetStatus") {
    const idParam = params.get("id");
    if (idParam === null) {
      return new Response(JSON.stringify({ error: "id parameter required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const id = parseInt(idParam, 10);
    if (isNaN(id)) {
      return new Response(JSON.stringify({ error: "id must be a number" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const state = getLightState(id);
    if (!state) {
      return new Response(JSON.stringify({ error: "light not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const statusResponse = {
      id,
      source: "HTTP_in",
      output: state.on,
      brightness: state.brightness,
      temperature: {
        tC: 26.0,
        tF: 78.7,
      },
      aenergy: {
        total: 2423.0,
        by_minute: [0.0, 0.0, 0.0],
        minute_ts: 1764794280,
      },
      apower: 0.0,
      current: 0.0,
      voltage: 226.8,
    };

    return new Response(JSON.stringify(statusResponse), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Handle unknown endpoints
  return new Response(JSON.stringify({ error: "not found" }), {
    status: 404,
    headers: { "Content-Type": "application/json" },
  });
}

const PORT = 8080;

console.log(`Shelly Mock Server running on http://localhost:${PORT}`);

Deno.serve({ port: PORT }, handleRequest);
