import { clamp, JSON_HEADERS, lerp, randomBetween } from "./helpers.ts";
import { setExternalLoadWatts } from "./p1.ts";

interface LightState {
  on: boolean;
  brightness: number;
  powerWatts: number;
}

interface PowerPoint {
  level: number;
  min: number;
  max: number;
}

const lights: Map<number, LightState> = new Map();

const BRIGHTNESS_POWER_POINTS: PowerPoint[] = [
  { level: 0, min: 0, max: 0 },
  { level: 6, min: 515, max: 565 },
  { level: 27, min: 551, max: 603 },
  { level: 28, min: 584, max: 625 },
  { level: 29, min: 614, max: 666 },
  { level: 30, min: 653, max: 696 },
  { level: 31, min: 727, max: 737 },
  { level: 32, min: 748, max: 769 },
  { level: 33, min: 775, max: 822 },
  { level: 34, min: 812, max: 868 },
  { level: 35, min: 855, max: 911 },
  { level: 36, min: 899, max: 957 },
  { level: 37, min: 950, max: 1003 },
  { level: 38, min: 991, max: 1023 },
  { level: 39, min: 1065, max: 1077 },
  { level: 40, min: 1071, max: 1131 },
  { level: 41, min: 1080, max: 1152 },
  { level: 42, min: 1143, max: 1164 },
  { level: 43, min: 1184, max: 1215 },
  { level: 44, min: 1212, max: 1252 },
  { level: 45, min: 1251, max: 1290 },
  { level: 46, min: 1275, max: 1312 },
  { level: 47, min: 1308, max: 1341 },
  { level: 48, min: 1330, max: 1381 },
  { level: 49, min: 1358, max: 1413 },
  { level: 50, min: 1393, max: 1438 },
  { level: 51, min: 1411, max: 1459 },
  { level: 52, min: 1433, max: 1473 },
  { level: 53, min: 1469, max: 1495 },
  { level: 54, min: 1481, max: 1512 },
  { level: 55, min: 1509, max: 1534 },
  { level: 56, min: 1529, max: 1555 },
  { level: 57, min: 1155, max: 1215 },
  { level: 58, min: 1180, max: 1251 },
  { level: 59, min: 1228, max: 1280 },
  { level: 60, min: 1270, max: 1321 },
  { level: 61, min: 1296, max: 1340 },
  { level: 62, min: 1320, max: 1372 },
  { level: 63, min: 1348, max: 1405 },
  { level: 64, min: 1386, max: 1432 },
  { level: 65, min: 1410, max: 1450 },
  { level: 66, min: 1430, max: 1477 },
  { level: 67, min: 1465, max: 1503 },
  { level: 68, min: 1508, max: 1532 },
  { level: 69, min: 1511, max: 1546 },
  { level: 70, min: 1543, max: 1566 },
  { level: 71, min: 1546, max: 1588 },
  { level: 72, min: 1584, max: 1605 },
  { level: 73, min: 1591, max: 1609 },
  { level: 74, min: 1596, max: 1614 },
  { level: 75, min: 1631, max: 1650 },
  { level: 80, min: 1644, max: 1658 },
  { level: 85, min: 1687, max: 1695 },
  { level: 90, min: 1705, max: 1711 },
  { level: 95, min: 1712, max: 1716 },
  { level: 100, min: 1719, max: 1727 },
];

const telemetryState = {
  temperatureC: 34,
  voltage: 230,
  energyTotalWh: 2423,
  lastEnergyTimestamp: Date.now(),
};

// Initialize default state for light id 0
lights.set(0, { on: false, brightness: 0, powerWatts: 0 });
syncExternalLoad();

function getLightState(id: number): LightState | undefined {
  return lights.get(id);
}

function setLightState(id: number, updates: Partial<LightState>): LightState | undefined {
  const current = lights.get(id);
  if (!current) {
    return undefined;
  }
  const updated = { ...current, ...updates };
  const onChanged = Object.prototype.hasOwnProperty.call(updates, "on") && updates.on !== current.on;
  const brightnessChanged =
    Object.prototype.hasOwnProperty.call(updates, "brightness") && updates.brightness !== current.brightness;

  if (onChanged || brightnessChanged) {
    if (brightnessChanged) {
      if ((updated.brightness ?? 0) > 0 && !updated.on) {
        updated.on = true;
      } else if ((updated.brightness ?? 0) === 0 && updated.on) {
        updated.on = false;
      }
    }
    updated.powerWatts = updated.on ? estimateBoilerConsumption(updated.brightness) : 0;
  }
  lights.set(id, updated);
  syncExternalLoad();
  return updated;
}

function estimateBoilerConsumption(brightness: number): number {
  if (brightness <= 0) {
    return 0;
  }

  const clampedLevel = clamp(brightness, 0, 100);
  let lower = BRIGHTNESS_POWER_POINTS[0];
  let upper = BRIGHTNESS_POWER_POINTS[BRIGHTNESS_POWER_POINTS.length - 1];

  for (let i = 0; i < BRIGHTNESS_POWER_POINTS.length; i += 1) {
    const point = BRIGHTNESS_POWER_POINTS[i];
    if (point.level === clampedLevel) {
      return Math.round(randomBetween(point.min, point.max));
    }
    if (point.level < clampedLevel) {
      lower = point;
    }
    if (point.level > clampedLevel) {
      upper = point;
      break;
    }
  }

  const ratio = upper.level === lower.level ? 0 : (clampedLevel - lower.level) / (upper.level - lower.level);
  const min = lerp(lower.min, upper.min, ratio);
  const max = lerp(lower.max, upper.max, ratio);
  return Math.round(randomBetween(min, max));
}

function syncExternalLoad(): void {
  let total = 0;
  for (const state of lights.values()) {
    total += state.powerWatts;
  }
  setExternalLoadWatts(total);
}

function driftTelemetry(loadWatts: number): void {
  const now = Date.now();
  const elapsedHours = (now - telemetryState.lastEnergyTimestamp) / 3_600_000;
  if (elapsedHours > 0) {
    telemetryState.energyTotalWh += loadWatts * elapsedHours;
    telemetryState.lastEnergyTimestamp = now;
  }

  const targetTemp = clamp(30 + loadWatts / 180, 30, 50);
  telemetryState.temperatureC = clamp(
    telemetryState.temperatureC + (targetTemp - telemetryState.temperatureC) * 0.15 + randomBetween(-0.2, 0.2),
    30,
    50,
  );

  telemetryState.voltage = clamp(telemetryState.voltage + randomBetween(-0.35, 0.35), 227, 235);
}

export function handleShellyRequest(pathname: string, params: URLSearchParams): Response | null {
  if (pathname === "/rpc/Light.Set") {
    return handleLightSet(params);
  }
  if (pathname === "/rpc/Light.GetStatus") {
    return handleLightGetStatus(params);
  }
  return null;
}

function handleLightSet(params: URLSearchParams): Response {
  const idParam = params.get("id");
  if (idParam === null) {
    return new Response(JSON.stringify({ error: "id parameter required" }), {
      status: 400,
      headers: JSON_HEADERS,
    });
  }

  const id = parseInt(idParam, 10);
  if (isNaN(id)) {
    return new Response(JSON.stringify({ error: "id must be a number" }), {
      status: 400,
      headers: JSON_HEADERS,
    });
  }

  const state = getLightState(id);
  if (!state) {
    return new Response(JSON.stringify({ error: "light not found" }), {
      status: 404,
      headers: JSON_HEADERS,
    });
  }

  const updates: Partial<LightState> = {};

  const onParam = params.get("on");
  if (onParam !== null) {
    const parsedOn = parseShellyOnState(onParam);
    if (parsedOn === null) {
      return new Response(JSON.stringify({ error: "on must be one of: true,false,1,0,on,off" }), {
        status: 400,
        headers: JSON_HEADERS,
      });
    }
    updates.on = parsedOn;
  }

  const brightnessParam = params.get("brightness");
  if (brightnessParam !== null) {
    const brightness = parseInt(brightnessParam, 10);
    if (isNaN(brightness)) {
      return new Response(JSON.stringify({ error: "brightness must be a number" }), {
        status: 400,
        headers: JSON_HEADERS,
      });
    }
    if (brightness < 0 || brightness > 100) {
      return new Response(JSON.stringify({ error: "brightness must be between 0 and 100" }), {
        status: 400,
        headers: JSON_HEADERS,
      });
    }
    updates.brightness = brightness;
  }

  const updated = setLightState(id, updates);
  return new Response(JSON.stringify(updated), {
    status: 200,
    headers: JSON_HEADERS,
  });
}

function parseShellyOnState(value: string): boolean | null {
  const normalized = value.trim().toLowerCase();
  if (["1", "true", "on"].includes(normalized)) {
    return true;
  }
  if (["0", "false", "off"].includes(normalized)) {
    return false;
  }
  return null;
}

function handleLightGetStatus(params: URLSearchParams): Response {
  const idParam = params.get("id");
  if (idParam === null) {
    return new Response(JSON.stringify({ error: "id parameter required" }), {
      status: 400,
      headers: JSON_HEADERS,
    });
  }

  const id = parseInt(idParam, 10);
  if (isNaN(id)) {
    return new Response(JSON.stringify({ error: "id must be a number" }), {
      status: 400,
      headers: JSON_HEADERS,
    });
  }

  const state = getLightState(id);
  if (!state) {
    return new Response(JSON.stringify({ error: "light not found" }), {
      status: 404,
      headers: JSON_HEADERS,
    });
  }

  driftTelemetry(state.powerWatts);

  const voltage = Number(telemetryState.voltage.toFixed(1));
  const apower = state.on ? Math.max(0, Math.round(state.powerWatts + randomBetween(-12, 12))) : 0;
  const current = Number((voltage === 0 ? 0 : apower / voltage).toFixed(3));
  const temperatureC = Number(telemetryState.temperatureC.toFixed(1));
  const temperatureF = Number(((temperatureC * 9) / 5 + 32).toFixed(1));

  const statusResponse = {
    id,
    source: "HTTP_in",
    output: state.on,
    brightness: state.brightness,
    temperature: {
      tC: temperatureC,
      tF: temperatureF,
    },
    aenergy: {
      total: 0,
      by_minute: [0, 0, 0],
      minute_ts: Math.floor(Date.now() / 1000),
    },
    apower,
    current,
    voltage,
  };

  return new Response(JSON.stringify(statusResponse), {
    status: 200,
    headers: JSON_HEADERS,
  });
}
