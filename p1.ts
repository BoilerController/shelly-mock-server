import { clamp, JSON_HEADERS, parseBoolean, toKilowatts } from "./helpers.ts";

type P1ScenarioKey = "sunny_export" | "mixed_clouds" | "swinging_grid";

interface P1ScenarioConfig {
  label: string;
  description: string;
  minWatts: number;
  maxWatts: number;
  volatility: number;
  surgeChance: number;
  surgeMagnitude: number;
}

interface P1ReadingPayload {
  scenario: P1ScenarioKey;
  label: string;
  description: string;
  timestamp: string;
  reading: {
    watts: number;
    kilowatts: number;
    direction: "consuming" | "exporting";
  };
  limits: {
    minWatts: number;
    maxWatts: number;
  };
  options: {
    negativeOverride: boolean;
  };
  components: {
    scenarioWatts: number;
    externalLoadWatts: number;
  };
}

const P1_SCENARIOS: Record<P1ScenarioKey, P1ScenarioConfig> = {
  sunny_export: {
    label: "Sunny day exporting",
    description: "Constante teruglevering van ~3kW op een volledig zonnige dag.",
    minWatts: -3200,
    maxWatts: -2800,
    volatility: 12,
    surgeChance: 0.02,
    surgeMagnitude: 40,
  },
  mixed_clouds: {
    label: "Sun / clouds",
    description: "Variaties tussen -1kW en -4kW door afwisselende zon en bewolking.",
    minWatts: -4000,
    maxWatts: -1000,
    volatility: 110,
    surgeChance: 0.28,
    surgeMagnitude: 850,
  },
  swinging_grid: {
    label: "Swinging grid",
    description: "Zelfde patroon als zon/bewolkt maar tussen -2kW en +0.5kW.",
    minWatts: -2000,
    maxWatts: 500,
    volatility: 150,
    surgeChance: 0.32,
    surgeMagnitude: 650,
  },
};

const scenarioRuntime: Record<P1ScenarioKey, { currentWatts: number }> = {
  sunny_export: { currentWatts: -3000 },
  mixed_clouds: { currentWatts: -2500 },
  swinging_grid: { currentWatts: -750 },
};

let activeScenario: P1ScenarioKey = "sunny_export";
let negativeOverride = false;
let externalLoadWatts = 0;
let lastReading: P1ReadingPayload | null = null;

function isScenarioKey(value: string | null): value is P1ScenarioKey {
  if (!value) {
    return false;
  }
  return Object.prototype.hasOwnProperty.call(P1_SCENARIOS, value);
}

function stepScenarioValue(key: P1ScenarioKey): number {
  const config = P1_SCENARIOS[key];
  const runtime = scenarioRuntime[key];
  const baseDelta = (Math.random() - 0.5) * 2 * config.volatility;
  const surgeDelta = Math.random() < config.surgeChance
    ? (Math.random() - 0.5) * 2 * config.surgeMagnitude
    : 0;
  const inertia = runtime.currentWatts * 0.65;
  const proposed = runtime.currentWatts + baseDelta + surgeDelta;
  let next = inertia + proposed * 0.35;

  if (next < config.minWatts || next > config.maxWatts) {
    next = clamp(next, config.minWatts, config.maxWatts);
    runtime.currentWatts = next;
    return next;
  }

  runtime.currentWatts = next;
  return runtime.currentWatts;
}

function generateSnapshot(): P1ReadingPayload {
  const scenario = P1_SCENARIOS[activeScenario];
  const scenarioWatts = stepScenarioValue(activeScenario);
  const processedScenario = negativeOverride ? -Math.abs(scenarioWatts) : scenarioWatts;
  const combinedWatts = processedScenario + externalLoadWatts;
  const watts = Math.round(combinedWatts);

  const payload: P1ReadingPayload = {
    scenario: activeScenario,
    label: scenario.label,
    description: scenario.description,
    timestamp: new Date().toISOString(),
    reading: {
      watts,
      kilowatts: toKilowatts(watts),
      direction: watts >= 0 ? "consuming" : "exporting",
    },
    limits: {
      minWatts: scenario.minWatts,
      maxWatts: scenario.maxWatts,
    },
    options: {
      negativeOverride,
    },
    components: {
      scenarioWatts: Math.round(processedScenario),
      externalLoadWatts: Math.round(externalLoadWatts),
    },
  };

  lastReading = payload;
  return payload;
}

export function handleP1ReadingRequest(): Response {
  return new Response(JSON.stringify(generateSnapshot()), {
    status: 200,
    headers: JSON_HEADERS,
  });
}

export function handleP1ChangeScenarioRequest(params: URLSearchParams): Response {
  const scenarioParam = params.get("scenario");
  if (!isScenarioKey(scenarioParam)) {
    return new Response(JSON.stringify({ error: "unknown scenario" }), {
      status: 400,
      headers: JSON_HEADERS,
    });
  }

  activeScenario = scenarioParam;
  scenarioRuntime[activeScenario].currentWatts = (P1_SCENARIOS[activeScenario].minWatts + P1_SCENARIOS[activeScenario].maxWatts) / 2;

  if (params.has("negative")) {
    negativeOverride = parseBoolean(params.get("negative"));
  }

  return new Response(
    JSON.stringify({
      message: "scenario updated",
      state: {
        scenario: activeScenario,
        negativeOverride,
      },
      nextReading: generateSnapshot(),
    }),
    {
      status: 200,
      headers: JSON_HEADERS,
    },
  );
}

export function setExternalLoadWatts(load: number): void {
  externalLoadWatts = load;
}

export function getLatestP1Snapshot(): P1ReadingPayload {
  if (!lastReading) {
    return generateSnapshot();
  }
  return lastReading;
}
